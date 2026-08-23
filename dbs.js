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
// ============================================
// Banque de questions en mémoire
// ============================================
// Chaque question tirée déclenchait une requête Supabase qui rapatriait toutes
// les questions de la difficulté. À quinze parties en parallèle, c'était une
// requête par seconde et une demi-seconde d'attente avant chaque question.
// Le corpus tient en mémoire : on le charge une fois, on le relit sur place.
let banque = null;
let banqueChargeeA = 0;
let chargementEnCours = null;
const BANQUE_TTL = 10 * 60 * 1000;

async function chargerBanque(supabase) {
    const { data, error } = await supabase.from('questions').select('*');
    if (error) throw error;
    banque = data || [];
    banqueChargeeA = Date.now();
    console.log(`📚 Banque de questions chargée : ${banque.length} questions`);
    return banque;
}

// Une seule requête même si dix parties la demandent en même temps
async function assurerBanque(supabase) {
    if (banque && Date.now() - banqueChargeeA < BANQUE_TTL) return banque;
    if (!chargementEnCours) {
        chargementEnCours = chargerBanque(supabase).finally(() => { chargementEnCours = null; });
    }
    return chargementEnCours;
}

// Le back-office vient de toucher au corpus : la copie en mémoire est périmée
function invaliderBanque() {
    banqueChargeeA = 0;
}

const SERIES_FILTERS = {
    overall: {
        name: 'Overall',
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

    async getAvailableQuestionsCount(serieFilter = 'overall', excludeIds = []) {
        const toutes = await assurerBanque(supabase);
        const series = getFilterSeries(serieFilter);
        const filtree = serieFilter !== 'overall' && series.length > 0 ? new Set(series) : null;

        const dansLeFiltre = toutes.filter(q => !filtree || filtree.has(q.serie));
        if (excludeIds.length === 0) return dansLeFiltre.length;

        const exclus = new Set(excludeIds);
        return dansLeFiltre.filter(q => !exclus.has(q.id)).length;
    },

    // 🆕 MODIFIÉ: Éviter les questions en double + Filtre série + Fallback
    async getRandomQuestions(difficulty, count = 1, excludeIds = [], serieFilter = 'overall', excludeSeries = [], noSpoil = false) {
        const toutes = await assurerBanque(supabase);
        const series = getFilterSeries(serieFilter);
        const filtree = serieFilter !== 'overall' && series.length > 0
            ? new Set(series) : null;

        // Le tri en place plus bas mordrait sur la banque : on travaille sur une copie
        const questions = toutes.filter(q =>
            q.difficulty === difficulty &&
            (!filtree || filtree.has(q.serie)) &&
            (!noSpoil || q.is_spoil === false));

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
        return assurerBanque(supabase);
    },

    // Le back-office a modifié le corpus : la copie en mémoire ne vaut plus rien
    invaliderBanque,

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

module.exports = { supabase, db, SERIES_FILTERS, getFilterSeries, invaliderBanque };
