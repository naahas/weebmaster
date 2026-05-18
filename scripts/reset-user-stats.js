/**
 * 🧹 Reset des stats d'un joueur (parties / victoires / XP / niveau).
 *   Conserve : coins, badges, avatars achetés, titres équipés.
 *
 * Usage :
 *   node scripts/reset-user-stats.js <username>
 *   node scripts/reset-user-stats.js arabeBG__
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL / SUPABASE_KEY manquants dans .env');
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const usernameArg = process.argv[2] || 'arabeBG__';

(async () => {
    console.log(`🔎 Recherche de l'utilisateur "${usernameArg}"…`);

    // Recherche insensible à la casse
    const { data: users, error: findErr } = await supabase
        .from('users')
        .select('twitch_id, username, total_victories, total_games_played, xp, level, coins')
        .ilike('username', usernameArg);

    if (findErr) { console.error('❌ Erreur recherche:', findErr.message); process.exit(1); }
    if (!users || users.length === 0) {
        console.error(`❌ Aucun utilisateur "${usernameArg}" trouvé.`);
        process.exit(1);
    }
    if (users.length > 1) {
        console.error(`❌ Plusieurs utilisateurs trouvés (${users.length}) :`, users.map(u => u.username));
        process.exit(1);
    }

    const user = users[0];
    console.log('✅ Trouvé :', {
        twitch_id: user.twitch_id,
        username: user.username,
        avant: {
            victoires: user.total_victories,
            parties:   user.total_games_played,
            xp:        user.xp,
            niveau:    user.level,
            coins:     user.coins,
        },
    });

    // 1) Reset des champs stats dans `users` (sans toucher aux coins ni cosmétiques)
    const { error: updateErr } = await supabase
        .from('users')
        .update({
            total_victories:     0,
            total_games_played:  0,
            current_win_streak:  0,
            best_win_streak:     0,
            last_placement:      null,
            team_victories:      0,
            team_games_played:   0,
            xp:                  0,
            level:               1,
            updated_at:          new Date().toISOString(),
        })
        .eq('twitch_id', user.twitch_id);

    if (updateErr) { console.error('❌ Erreur update users:', updateErr.message); process.exit(1); }
    console.log('✅ Stats du users mis à zéro');

    // 2) Suppression des lignes player_games (utilisées par getPlayerModeStats)
    const { error: delErr, count } = await supabase
        .from('player_games')
        .delete({ count: 'exact' })
        .eq('twitch_id', user.twitch_id);

    if (delErr) { console.error('❌ Erreur delete player_games:', delErr.message); process.exit(1); }
    console.log(`✅ ${count || 0} ligne(s) player_games supprimée(s)`);

    console.log('\n🎉 Reset terminé pour', user.username);
    console.log('   (coins, badges, avatars achetés et titres équipés conservés)');
})();
