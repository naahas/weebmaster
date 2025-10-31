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
    }
};

module.exports = { supabase, db };