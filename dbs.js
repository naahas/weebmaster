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
    async getRandomQuestions(difficulty, count = 1, excludeIds = [], serieFilter = 'tout', excludeSeries = [], noSpoil = false) {
        let query = supabase
            .from('questions')
            .select('*')
            .eq('difficulty', difficulty);

        console.log(`🔍 [DBS] Filtre série reçu: "${serieFilter}"`);

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
                    noSpoil
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

module.exports = { supabase, db, SERIES_FILTERS, getFilterSeries };
