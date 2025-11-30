
// test-users.js
const { db } = require('./dbs.js');

async function createTestUsers() {
    const testUsers = [
        { twitch_id: 'test_001', username: 'NarutoFan99' },
        { twitch_id: 'test_002', username: 'SasukeUchiha' },
        { twitch_id: 'test_003', username: 'LuffyD_Monkey' },
        { twitch_id: 'test_004', username: 'ZoroSantoryu' },
        { twitch_id: 'test_005', username: 'GokuSSJ3' },
        { twitch_id: 'test_006', username: 'VegetaPrince' },
        { twitch_id: 'test_007', username: 'IchigoKurosaki' },
        { twitch_id: 'test_008', username: 'KilluaZoldyck' },
        { twitch_id: 'test_009', username: 'GonFreecss' },
        { twitch_id: 'test_010', username: 'ErenYeager' }
    ];

    for (const user of testUsers) {
        try {
            await db.createOrUpdateUser(user.twitch_id, user.username);
            
            // Simuler des stats (3+ parties pour apparaître dans le leaderboard)
            const gamesPlayed = Math.floor(Math.random() * 20) + 3;
            const victories = Math.floor(Math.random() * gamesPlayed);
            
            // Mettre à jour directement via Supabase
            const { supabase } = require('./dbs.js');
            await supabase
                .from('users')
                .update({
                    total_games_played: gamesPlayed,
                    total_victories: victories
                })
                .eq('twitch_id', user.twitch_id);
            
            console.log(`✅ ${user.username} créé (${victories}/${gamesPlayed} victoires)`);
        } catch (err) {
            console.error(`❌ Erreur pour ${user.username}:`, err.message);
        }
    }
    
    console.log('\n🏆 Leaderboard actuel:');
    const leaderboard = await db.getLeaderboard(10);
    console.table(leaderboard.map(u => ({
        username: u.username,
        victoires: u.total_victories,
        parties: u.total_games_played,
        winrate: u.win_rate + '%'
    })));
}

createTestUsers();