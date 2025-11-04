// ============================================
// WEEBMASTER - Database Connection (Supabase)
// ============================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ ERREUR: Variables Supabase manquantes dans .env');
    process.exit(1);
}

// Client Supabase avec service role (accès complet)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// Fonctions utilitaires pour la base de données
// ============================================

const db = {
    // ========== USERS ==========
    async createOrUpdateUser(twitchId, username) {
        const { data, error } = await supabase
            .from('users')
            .upsert({
                twitch_id: twitchId,
                username: username,
                updated_at: new Date().toISOString()
            }, { onConflict: 'twitch_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getUserByTwitchId(twitchId) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('twitch_id', twitchId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    async updateUserStats(twitchId, isWinner, placement) {
        const user = await this.getUserByTwitchId(twitchId);
        if (!user) return null;

        const { data, error } = await supabase
            .from('users')
            .update({
                total_victories: isWinner ? user.total_victories + 1 : user.total_victories,
                last_placement: placement,
                total_games_played: user.total_games_played + 1,
                updated_at: new Date().toISOString()
            })
            .eq('twitch_id', twitchId)
            .select()
            .single();

        if (error) throw error;

        // 🆕 Vérifier et débloquer les badges automatiquement
        await this.checkAndUnlockBadges(twitchId);

        return data;
    },

    async getTopPlayers(limit = 10) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('total_victories', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    },

    // ========== QUESTIONS ==========
    async getQuestionsByDifficulty(difficulty) {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('difficulty', difficulty);

        if (error) throw error;
        return data;
    },

    // 🆕 MODIFIÉ: Éviter les questions en double
    async getRandomQuestions(difficulty, count = 1, excludeIds = []) {
        const questions = await this.getQuestionsByDifficulty(difficulty);
        if (!questions || questions.length === 0) return [];

        // 🆕 Filtrer les questions déjà utilisées
        const availableQuestions = questions.filter(q => !excludeIds.includes(q.id));
        
        // Si toutes les questions ont été utilisées, réinitialiser
        if (availableQuestions.length === 0) {
            console.log('⚠️ Toutes les questions de difficulté "' + difficulty + '" ont été utilisées, réinitialisation...');
            return this.getRandomQuestions(difficulty, count, []);
        }

        // Shuffle et prendre 'count' questions
        const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    },

    async getAllQuestions() {
        const { data, error } = await supabase
            .from('questions')
            .select('*');

        if (error) throw error;
        return data;
    },

    // ========== GAMES ==========
    async createGame(totalPlayers) {
        const { data, error } = await supabase
            .from('games')
            .insert({
                questions_count: 0,
                total_players: totalPlayers
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateGame(gameId, updates) {
        const { data, error } = await supabase
            .from('games')
            .update(updates)
            .eq('id', gameId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async endGame(gameId, winnerTwitchId, questionsCount, duration) {
        const { data, error } = await supabase
            .from('games')
            .update({
                winner_twitch_id: winnerTwitchId,
                questions_count: questionsCount,
                duration: duration,
                ended_at: new Date().toISOString()
            })
            .eq('id', gameId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getTotalGames() {
        const { count, error } = await supabase
            .from('games')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return count || 0;
    },

    async getRecentGames(limit = 10) {
        const { data, error } = await supabase
            .from('games')
            .select(`
                *,
                winner:users!games_winner_twitch_id_fkey(username)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    },

    // ========== TITLES ==========
    async getAllTitles() {
        const { data, error } = await supabase
            .from('titles')
            .select('*')
            .order('requirement_value', { ascending: true });

        if (error) throw error;
        return data;
    },

    async getTitleById(titleId) {
        const { data, error } = await supabase
            .from('titles')
            .select('*')
            .eq('id', titleId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    async getUserUnlockedTitles(twitchId) {
        const user = await this.getUserByTwitchId(twitchId);
        if (!user) return [];

        const allTitles = await this.getAllTitles();
        
        // Filtrer les titres débloqués selon les stats du joueur
        const unlockedTitles = allTitles.filter(title => {
            if (title.title_type === 'games_played') {
                return user.total_games_played >= title.requirement_value;
            }
            if (title.title_type === 'games_won') {
                return user.total_victories >= title.requirement_value;
            }
            return false;
        });

        return unlockedTitles;
    },

    async updateUserTitle(twitchId, titleId) {
        // Vérifier que le titre existe
        const title = await this.getTitleById(titleId);
        if (!title) throw new Error('Titre inexistant');

        // Vérifier que l'utilisateur a débloqué ce titre
        const unlockedTitles = await this.getUserUnlockedTitles(twitchId);
        const hasTitle = unlockedTitles.some(t => t.id === titleId);
        
        if (!hasTitle) throw new Error('Titre non débloqué');

        // Mettre à jour le titre actuel
        const { data, error } = await supabase
            .from('users')
            .update({ current_title_id: titleId })
            .eq('twitch_id', twitchId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ========== BADGES ==========
    async getUserBadges(twitchId) {
        const { data, error } = await supabase
            .from('badges')
            .select('*')
            .eq('user_twitch_id', twitchId)
            .order('badge_tier', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async unlockBadge(twitchId, badgeType, badgeTier) {
        // Vérifier si le badge existe déjà
        const { data: existing } = await supabase
            .from('badges')
            .select('*')
            .eq('user_twitch_id', twitchId)
            .eq('badge_type', badgeType)
            .eq('badge_tier', badgeTier)
            .single();

        if (existing) return existing; // Déjà débloqué

        // Débloquer le badge
        const { data, error } = await supabase
            .from('badges')
            .insert({
                user_twitch_id: twitchId,
                badge_type: badgeType,
                badge_tier: badgeTier
            })
            .select()
            .single();

        if (error) throw error;
        console.log(`🏅 Badge débloqué: ${badgeType} tier ${badgeTier} pour ${twitchId}`);
        return data;
    },

    async checkAndUnlockBadges(twitchId) {
        const user = await this.getUserByTwitchId(twitchId);
        if (!user) return;

        const tiers = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        const newBadges = [];

        // Vérifier badges "games_played"
        for (const tier of tiers) {
            if (user.total_games_played >= tier) {
                try {
                    const badge = await this.unlockBadge(twitchId, 'games_played', tier);
                    if (badge) newBadges.push(badge);
                } catch (err) {
                    // Badge déjà débloqué, ignorer
                }
            }
        }

        // Vérifier badges "games_won"
        for (const tier of tiers) {
            if (user.total_victories >= tier) {
                try {
                    const badge = await this.unlockBadge(twitchId, 'games_won', tier);
                    if (badge) newBadges.push(badge);
                } catch (err) {
                    // Badge déjà débloqué, ignorer
                }
            }
        }

        return newBadges;
    },

    // ========== LEADERBOARD ==========
    async getLeaderboard(limit = 10) {
        const { data, error } = await supabase
            .from('users')
            .select(`
                twitch_id,
                username,
                total_victories,
                total_games_played,
                current_title_id,
                titles:current_title_id (
                    title_name
                )
            `)
            .gte('total_games_played', 5) // Minimum 5 parties
            .order('total_victories', { ascending: false })
            .order('total_games_played', { ascending: true }) // Départager par nombre de parties
            .limit(limit);

        if (error) throw error;

        // Calculer le win rate
        return (data || []).map(user => ({
            ...user,
            win_rate: user.total_games_played > 0 
                ? ((user.total_victories / user.total_games_played) * 100).toFixed(1)
                : '0.0',
            title_name: user.titles?.title_name || 'Novice'
        }));
    },


    // ========== USED QUESTIONS (Historique persistant) ==========
    async addUsedQuestion(questionId) {
        const { error } = await supabase
            .from('used_questions')
            .insert({ question_id: questionId });
        
        if (error) throw error;
        console.log(`📌 Question ${questionId} ajoutée à l'historique`);
    },

    async getUsedQuestionIds() {
        const { data, error } = await supabase
            .from('used_questions')
            .select('question_id');
        
        if (error) throw error;
        return data ? data.map(row => row.question_id) : [];
    },

    async resetUsedQuestions() {
        const { error } = await supabase
            .from('used_questions')
            .delete()
            .neq('id', 0); // Supprimer toutes les lignes
        
        if (error) throw error;
        console.log('🔄 Historique des questions réinitialisé');
    },

    // 🆕 Compter le nombre de parties terminées
    async getCompletedGamesCount() {
        const { count, error } = await supabase
            .from('games')
            .select('*', { count: 'exact', head: true })
            .not('winner_twitch_id', 'is', null); // Seulement les parties terminées

        if (error) throw error;
        return count || 0;
    }
};












module.exports = { supabase, db };