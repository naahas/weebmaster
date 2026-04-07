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
// 🎯 FILTRES SÉRIES CENTRALISÉS
// ============================================
const SERIES_FILTERS = {
    tout: {
        name: 'Tout',
        icon: '🌐',
        series: []
    },
    big3: {
        name: 'Big 3',
        icon: '👑',
        series: ['One Piece', 'Naruto', 'Bleach']
    },
    mainstream: {
        name: 'Mainstream',
        icon: '⭐',
        series: [
            'One Piece', 'Naruto', 'Bleach', 'Hunter x Hunter',
            'Shingeki no Kyojin', 'Fullmetal Alchemist', 'Death Note',
            'Dragon Ball', 'Demon Slayer', 'Jojo\'s Bizarre Adventure', 'My Hero Academia',
            'Fairy Tail', 'Tokyo Ghoul', 'Nanatsu no Taizai', 'Kuroko no Basket', 'Chainsaw Man' , 'Black Clover'
        ]
    },
    onepiece: {
        name: 'One Piece',
        icon: '🏴‍☠️',
        series: ['One Piece']
    },
    naruto: {
        name: 'Naruto',
        icon: '🍥',
        series: ['Naruto']
    },
    dragonball: {
        name: 'Dragon Ball',
        icon: '🐉',
        series: ['Dragon Ball', 'Dragon Ball Z', 'Dragon Ball Super']
    },
    bleach: {
        name: 'Bleach',
        icon: '⚔️',
        series: ['Bleach']
    }
};

// Helper pour obtenir les séries d'un filtre
const getFilterSeries = (filterId) => SERIES_FILTERS[filterId]?.series || [];

// ============================================
// Fonctions utilitaires pour la base de données
// ============================================

const db = {
    // ========== USERS ==========
    async createOrUpdateUser(twitchId, username, avatarUrl = null) {
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await this.getUserByTwitchId(twitchId);

        const updateData = {
            twitch_id: twitchId,
            username: username,
            updated_at: new Date().toISOString()
        };

        // Si nouvel utilisateur, mettre avatar par défaut
        if (!existingUser) {
            updateData.avatar_url = avatarUrl || 'novice.png';
        } else if (avatarUrl) {
            // Si utilisateur existant ET avatar fourni, mettre à jour
            updateData.avatar_url = avatarUrl;
        }
        // Sinon on ne touche pas à l'avatar existant

        const { data, error } = await supabase
            .from('users')
            .upsert(updateData, { onConflict: 'twitch_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },


    async updateUserAvatar(twitchId, avatarUrl) {
        const { data, error } = await supabase
            .from('users')
            .update({
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            })
            .eq('twitch_id', twitchId)
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

        // Calculer les win streaks
        const currentStreak = isWinner ? (user.current_win_streak || 0) + 1 : 0;
        const bestStreak = Math.max(user.best_win_streak || 0, currentStreak);

        const { data, error } = await supabase
            .from('users')
            .update({
                total_victories: isWinner ? user.total_victories + 1 : user.total_victories,
                last_placement: placement,
                total_games_played: user.total_games_played + 1,
                current_win_streak: currentStreak,
                best_win_streak: bestStreak,
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

    // 🆕 Stats pour le mode Rivalité (équipe)
    async updateTeamStats(twitchId, isWinner) {
        const user = await this.getUserByTwitchId(twitchId);
        if (!user) return null;

        const { data, error } = await supabase
            .from('users')
            .update({
                team_victories: isWinner ? (user.team_victories || 0) + 1 : (user.team_victories || 0),
                team_games_played: (user.team_games_played || 0) + 1,
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
            .gte('total_games_played', 3)
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

    async getAvailableQuestionsCount(serieFilter = 'tout', excludeIds = []) {
        let query = supabase
            .from('questions')
            .select('id', { count: 'exact' });

        const series = getFilterSeries(serieFilter);

        if (serieFilter !== 'tout' && series.length > 0) {
            if (series.length === 1) {
                query = query.eq('serie', series[0]);
            } else {
                query = query.in('serie', series);
            }
        }

        const { data, error, count } = await query;

        if (error) throw error;

        if (excludeIds.length === 0) {
            return count || 0;
        }

        const excludedInThisFilter = data.filter(q => excludeIds.includes(q.id)).length;
        return (count || 0) - excludedInThisFilter;
    },

    // 🆕 MODIFIÉ: Éviter les questions en double + Filtre série + Fallback
    async getRandomQuestions(difficulty, count = 1, excludeIds = [], serieFilter = 'tout', excludeSeries = [], noSpoil = false, streamerId = 'default') {
        let query = supabase
            .from('questions')
            .select('*')
            .eq('difficulty', difficulty);

        console.log(`🔍 [DBS] Filtre série reçu: "${serieFilter}" [streamer: ${streamerId}]`);

        // 🔥 Utiliser SERIES_FILTERS centralisé
        const series = getFilterSeries(serieFilter);

        // Appliquer le filtre si ce n'est pas "tout"
        if (serieFilter !== 'tout' && series.length > 0) {
            if (series.length === 1) {
                query = query.eq('serie', series[0]);
            } else {
                query = query.in('serie', series);
            }
            console.log(`🔍 [DBS] Filtre ${serieFilter} appliqué`);
        } else {
            console.log('🔍 [DBS] Aucun filtre (tout)');
        }

        // 🚫 Filtre anti-spoil
        if (noSpoil) {
            query = query.eq('is_spoil', false);
            console.log('🚫 [DBS] Filtre anti-spoil activé');
        }

        const { data: questions, error } = await query;

        if (error) throw error;

        // Système de fallback (reste identique)
        if (!questions || questions.length === 0) {
            console.log(`⚠️ [DBS] Aucune question trouvée pour difficulté "${difficulty}" avec filtre "${serieFilter}"`);

            const fallbackOrder = getFallbackDifficulties(difficulty);
            console.log(`🔄 [DBS] Tentative fallback sur: ${fallbackOrder.join(' → ')}`);

            for (const fallbackDiff of fallbackOrder) {
                console.log(`🔄 [DBS] Essai difficulté: ${fallbackDiff}`);

                const fallbackQuestions = await this.getRandomQuestions(
                    fallbackDiff,
                    count,
                    excludeIds,
                    serieFilter,
                    excludeSeries,
                    noSpoil,
                    streamerId
                );

                if (fallbackQuestions.length > 0) {
                    console.log(`✅ [DBS] Fallback réussi ! ${fallbackQuestions.length} question(s) trouvée(s) en difficulté "${fallbackDiff}"`);
                    return fallbackQuestions;
                }
            }

            console.error(`❌ [DBS] AUCUNE question disponible pour le filtre "${serieFilter}" (toutes difficultés essayées)`);
            return [];
        }

        console.log(`✅ [DBS] ${questions.length} question(s) trouvée(s) pour difficulté "${difficulty}" avec filtre "${serieFilter}"`);

        let availableQuestions = questions.filter(q => !excludeIds.includes(q.id));

        if (excludeSeries && excludeSeries.length > 0) {
            const withoutRecentSeries = availableQuestions.filter(q => !excludeSeries.includes(q.serie));

            if (withoutRecentSeries.length > 0) {
                console.log(`🔄 ${excludeSeries.length} série(s) exclue(s), ${withoutRecentSeries.length} questions restantes`);
                availableQuestions = withoutRecentSeries;
            } else {
                console.log(`⚠️ Pas assez de questions hors séries récentes - on garde tout`);
            }
        }

        if (availableQuestions.length === 0) {
            console.log(`⚠️ Toutes les questions "${difficulty}" ont été utilisées, reset de cette difficulté...`);
            await this.resetUsedQuestions(difficulty, streamerId);
            
            // Retirer les IDs de cette difficulté du tableau excludeIds (mutation directe = met à jour gameState)
            const resetIds = new Set(questions.map(q => q.id));
            for (let i = excludeIds.length - 1; i >= 0; i--) {
                if (resetIds.has(excludeIds[i])) {
                    excludeIds.splice(i, 1);
                }
            }
            console.log(`✅ ${resetIds.size} questions "${difficulty}" réactivées, ${excludeIds.length} autres difficultés toujours exclues`);
            
            availableQuestions = questions;
        }

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
    async createGame(totalPlayers, mode = 'lives') {
        const { data, error } = await supabase
            .from('games')
            .insert({
                questions_count: 0,
                total_players: totalPlayers,
                mode: mode
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
            .gte('total_players', 15) // 🆕 Seulement les parties avec 15+ joueurs
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

    // ========== TITRES CUSTOM (PREFIX/SUFFIX) ==========
    async equipTitlePrefix(twitchId, prefix) {
        // Si prefix est null, on retire le préfixe
        if (prefix === null) {
            const { data, error } = await supabase
                .from('users')
                .update({ equipped_title_prefix: null, updated_at: new Date().toISOString() })
                .eq('twitch_id', twitchId)
                .select()
                .single();
            if (error) throw error;
            return data;
        }

        // Vérifier que le joueur possède ce préfixe
        const purchases = await this.getUserPurchases(twitchId);
        const shopItems = await this.getShopItems();
        const ownedPrefixes = shopItems.filter(item => 
            item.type === 'title_prefix' && purchases.some(p => p.item_id === item.id)
        );

        const hasPrefix = ownedPrefixes.some(p => p.value === prefix);
        if (!hasPrefix) throw new Error('Préfixe non possédé');

        const { data, error } = await supabase
            .from('users')
            .update({ equipped_title_prefix: prefix, updated_at: new Date().toISOString() })
            .eq('twitch_id', twitchId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async equipTitleSuffix(twitchId, suffix) {
        // Si suffix est null, on retire le suffixe
        if (suffix === null) {
            const { data, error } = await supabase
                .from('users')
                .update({ equipped_title_suffix: null, updated_at: new Date().toISOString() })
                .eq('twitch_id', twitchId)
                .select()
                .single();
            if (error) throw error;
            return data;
        }

        // Vérifier que le joueur possède ce suffixe
        const purchases = await this.getUserPurchases(twitchId);
        const shopItems = await this.getShopItems();
        const ownedSuffixes = shopItems.filter(item => 
            item.type === 'title_suffix' && purchases.some(p => p.item_id === item.id)
        );

        const hasSuffix = ownedSuffixes.some(s => s.value === suffix);
        if (!hasSuffix) throw new Error('Suffixe non possédé');

        const { data, error } = await supabase
            .from('users')
            .update({ equipped_title_suffix: suffix, updated_at: new Date().toISOString() })
            .eq('twitch_id', twitchId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Récupérer le titre complet d'un joueur (ancien système + custom)
    async getFullTitle(twitchId) {
        const user = await this.getUserByTwitchId(twitchId);
        if (!user) return 'Novice';

        const prefix = user.equipped_title_prefix;
        const suffix = user.equipped_title_suffix;

        // Si le joueur a un titre custom (prefix et/ou suffix)
        if (prefix || suffix) {
            return [prefix, suffix].filter(Boolean).join(' ');
        }

        // Sinon, retourner le titre classique (ancien système)
        if (user.current_title_id) {
            const title = await this.getTitleById(user.current_title_id);
            return title ? title.title_name : 'Novice';
        }

        return 'Novice';
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
                avatar_url,
                total_victories,
                total_games_played,
                current_title_id,
                equipped_title_prefix,
                equipped_title_suffix,
                last_placement,
                updated_at,
                best_win_streak,
                titles:current_title_id (
                    title_name
                )
            `)
            .gte('total_games_played', 3)
            .order('total_victories', { ascending: false })
            .order('total_games_played', { ascending: true })
            .limit(limit);

        if (error) throw error;

        // Récupérer tous les titres pour calculer titles_unlocked
        const allTitles = await this.getAllTitles();
        const totalTitlesCount = allTitles.length;

        // Calculer les stats pour chaque joueur
        return (data || []).map(user => {
            // Calculer les titres débloqués
            const unlockedCount = allTitles.filter(title => {
                if (title.title_type === 'games_played') {
                    return user.total_games_played >= title.requirement_value;
                }
                if (title.title_type === 'games_won') {
                    return user.total_victories >= title.requirement_value;
                }
                return false;
            }).length;

            return {
                ...user,
                win_rate: user.total_games_played > 0
                    ? ((user.total_victories / user.total_games_played) * 100).toFixed(1)
                    : '0.0',
                title_name: (user.equipped_title_prefix || user.equipped_title_suffix) 
                    ? [user.equipped_title_prefix, user.equipped_title_suffix].filter(Boolean).join(' ')
                    : (user.titles?.title_name || 'Novice'),
                titles_unlocked: unlockedCount,
                total_titles: totalTitlesCount,
                last_activity: user.updated_at,
                wins: user.total_victories,
                games_played: user.total_games_played
            };
        });
    },


    // ========== USED QUESTIONS (Historique persistant par difficulté) ==========
    async addUsedQuestion(questionId, difficulty = null, streamerId = 'default') {
        const { error } = await supabase
            .from('used_questions')
            .insert({ question_id: questionId, difficulty: difficulty, streamer_id: streamerId });

        if (error) throw error;
        console.log(`📌 Question ${questionId} (${difficulty || '?'}) ajoutée à l'historique [streamer: ${streamerId}]`);
    },

    async getUsedQuestionIds(streamerId = 'default') {
        let query = supabase
            .from('used_questions')
            .select('question_id')
            .eq('streamer_id', streamerId);

        const { data, error } = await query;

        if (error) throw error;
        return data ? data.map(row => row.question_id) : [];
    },

    async resetUsedQuestions(difficulty = null, streamerId = 'default') {
        let query = supabase
            .from('used_questions')
            .delete()
            .eq('streamer_id', streamerId);

        if (difficulty) {
            query = query.eq('difficulty', difficulty);
        } else {
            query = query.neq('id', 0); // Supprimer toutes les lignes de ce streamer
        }

        const { error } = await query;
        if (error) throw error;

        if (difficulty) {
            console.log(`🔄 Historique réinitialisé pour la difficulté "${difficulty}" [streamer: ${streamerId}]`);
        } else {
            console.log(`🔄 Historique des questions réinitialisé (toutes difficultés) [streamer: ${streamerId}]`);
        }
    },

    // 🆕 Compter le nombre de parties terminées
    async getCompletedGamesCount() {
        const { count, error } = await supabase
            .from('games')
            .select('*', { count: 'exact', head: true })
            .not('winner_twitch_id', 'is', null); // Seulement les parties terminées

        if (error) throw error;
        return count || 0;
    },


    async getTotalPlayers() {
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return count || 0;
    },

    // ========== BOMBANIME SUGGESTIONS ==========
    async createSuggestion({ type, anime, characterName, variantOf, details, submittedBy }) {
        const { data, error } = await supabase
            .from('bombanime_suggestions')
            .insert({
                type,
                anime,
                character_name: characterName,
                variant_of: variantOf || null,
                details: details || null,
                submitted_by: submittedBy,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;
        console.log(`📝 Suggestion BombAnime créée: ${type} - ${characterName} (${anime})`);
        return data;
    },

    async getSuggestions(status = null, limit = 50) {
        let query = supabase
            .from('bombanime_suggestions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async updateSuggestionStatus(id, status, adminNotes = null) {
        const updateData = {
            status,
            updated_at: new Date().toISOString()
        };
        
        if (adminNotes !== null) {
            updateData.admin_notes = adminNotes;
        }

        const { data, error } = await supabase
            .from('bombanime_suggestions')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        console.log(`✅ Suggestion ${id} mise à jour: ${status}`);
        return data;
    },

    async deleteSuggestion(id) {
        const { error } = await supabase
            .from('bombanime_suggestions')
            .delete()
            .eq('id', id);

        if (error) throw error;
        console.log(`🗑️ Suggestion ${id} supprimée`);
    },

    async getSuggestionsCount() {
        const { data, error } = await supabase
            .from('bombanime_suggestions')
            .select('status');

        if (error) throw error;

        const counts = {
            total: data.length,
            pending: data.filter(s => s.status === 'pending').length,
            approved: data.filter(s => s.status === 'approved').length,
            rejected: data.filter(s => s.status === 'rejected').length
        };

        return counts;
    }


};

// 🔥 HELPER: Définir l'ordre de fallback selon la difficulté
function getFallbackDifficulties(difficulty) {
    const difficultyLevels = ['veryeasy', 'easy', 'medium', 'hard', 'veryhard', 'extreme'];
    const currentIndex = difficultyLevels.indexOf(difficulty);

    if (currentIndex === -1) return difficultyLevels; // Si difficulté invalide, essayer toutes

    // 🔥 Stratégie: essayer les difficultés proches d'abord, puis s'éloigner
    const fallback = [];

    // Essayer la difficulté juste en dessous
    if (currentIndex > 0) {
        fallback.push(difficultyLevels[currentIndex - 1]);
    }

    // Essayer la difficulté juste au dessus
    if (currentIndex < difficultyLevels.length - 1) {
        fallback.push(difficultyLevels[currentIndex + 1]);
    }

    // Puis essayer toutes les autres par ordre décroissant de proximité
    let offset = 2;
    while (fallback.length < difficultyLevels.length - 1) {
        if (currentIndex - offset >= 0) {
            fallback.push(difficultyLevels[currentIndex - offset]);
        }
        if (currentIndex + offset < difficultyLevels.length) {
            fallback.push(difficultyLevels[currentIndex + offset]);
        }
        offset++;
    }

    return fallback;
};















// ============================================
// S-COINS - Système de monnaie
// ============================================

const COIN_REWARDS = {
    PARTICIPATE: 1000,
    TOP_3: 2000,
    TOP_2: 2000,
    WIN: 4000
};

// Fonctions coins
db.getUserCoins = async function(twitchId) {
    const { data, error } = await supabase
        .from('users')
        .select('coins')
        .eq('twitch_id', twitchId)
        .single();

    if (error) throw error;
    return data?.coins || 0;
};

db.addCoins = async function(twitchId, amount, reason = '') {
    const user = await this.getUserByTwitchId(twitchId);
    if (!user) return null;

    const currentCoins = user.coins || 0;
    const newCoins = currentCoins + amount;

    const { data, error } = await supabase
        .from('users')
        .update({ coins: newCoins, updated_at: new Date().toISOString() })
        .eq('twitch_id', twitchId)
        .select()
        .single();

    if (error) throw error;
    console.log(`💰 ${user.username}: +${amount} S-Coins (${reason}) → ${newCoins} total`);
    return data;
};

db.removeCoins = async function(twitchId, amount) {
    const user = await this.getUserByTwitchId(twitchId);
    if (!user) return { success: false, error: 'Utilisateur non trouvé' };

    const currentCoins = user.coins || 0;
    if (currentCoins < amount) {
        return { success: false, error: 'Solde insuffisant', balance: currentCoins };
    }

    const newCoins = currentCoins - amount;

    const { data, error } = await supabase
        .from('users')
        .update({ coins: newCoins, updated_at: new Date().toISOString() })
        .eq('twitch_id', twitchId)
        .select()
        .single();

    if (error) throw error;
    console.log(`💰 ${user.username}: -${amount} S-Coins → ${newCoins} total`);
    return { success: true, balance: newCoins, data };
};

db.distributeGameCoins = async function(sortedPlayers, initialPlayerCount, minPlayers = 1) {
    if (initialPlayerCount < minPlayers) {
        console.log(`⚠️ S-Coins NON distribués (${initialPlayerCount} joueurs)`);
        return {};
    }

    const rewards = {};

    for (let i = 0; i < sortedPlayers.length; i++) {
        const player = sortedPlayers[i];
        let amount = COIN_REWARDS.PARTICIPATE;
        let reason = 'participation';

        if (i === 0) {
            amount = COIN_REWARDS.WIN;
            reason = 'victoire';
        } else if (i === 1) {
            amount = COIN_REWARDS.TOP_2;
            reason = 'top 2';
        } else if (i === 2) {
            amount = COIN_REWARDS.TOP_3;
            reason = 'top 3';
        }

        try {
            await this.addCoins(player.twitchId, amount, reason);
            rewards[player.twitchId] = { amount, reason };
        } catch (err) {
            console.error(`❌ Erreur S-Coins pour ${player.username}:`, err);
        }
    }

    console.log(`💰 S-Coins distribués à ${Object.keys(rewards).length} joueurs`);
    return rewards;
};

// ============================================
// SHOP - Boutique
// ============================================

db.getShopItems = async function() {
    const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .eq('active', true)
        .order('price', { ascending: true });

    if (error) throw error;
    return data || [];
};

db.purchaseItem = async function(twitchId, itemId) {
    const { data: item, error: itemError } = await supabase
        .from('shop_items')
        .select('*')
        .eq('id', itemId)
        .eq('active', true)
        .single();

    if (itemError || !item) return { success: false, error: 'Article introuvable' };

    const { data: existing } = await supabase
        .from('user_purchases')
        .select('id')
        .eq('twitch_id', twitchId)
        .eq('item_id', itemId)
        .single();

    if (existing) return { success: false, error: 'Article déjà possédé' };

    const result = await this.removeCoins(twitchId, item.price);
    if (!result.success) return result;

    const { error: purchaseError } = await supabase
        .from('user_purchases')
        .insert({
            twitch_id: twitchId,
            item_id: itemId,
            price_paid: item.price,
            purchased_at: new Date().toISOString()
        });

    if (purchaseError) throw purchaseError;

    console.log(`🛒 ${twitchId} a acheté "${item.name}" pour ${item.price} S-Coins`);
    return { success: true, item, balance: result.balance };
};

db.getUserPurchases = async function(twitchId) {
    const { data, error } = await supabase
        .from('user_purchases')
        .select('item_id, price_paid, purchased_at')
        .eq('twitch_id', twitchId);

    if (error) throw error;
    return data || [];
};



module.exports = { supabase, db, SERIES_FILTERS, getFilterSeries, COIN_REWARDS };