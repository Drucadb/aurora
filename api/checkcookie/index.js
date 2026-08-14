// /api/checkcookie/index.js

export default async function handler(req, res) {
    // ===== CORS =====
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    const { cookie } = req.body;

    if (!cookie) {
        return res.status(400).json({ error: 'Cookie não informado' });
    }

    try {
        const headers = {
            'Cookie': `.ROBLOSECURITY=${cookie}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Origin': 'https://www.roblox.com',
            'Referer': 'https://www.roblox.com/'
        };

        // ===== 1. USUÁRIO AUTENTICADO =====
        const userRes = await fetch('https://users.roblox.com/v1/users/authenticated', { headers });
        if (!userRes.ok) {
            return res.status(401).json({ 
                error: 'Cookie inválido ou expirado',
                status: userRes.status 
            });
        }
        const userData = await userRes.json();

        const userId = userData.id;
        const username = userData.name;
        const displayName = userData.displayName;
        const createdDate = userData.created;
        const accountAgeDays = Math.floor((Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24));

        // ===== 2. ROBUX =====
        const robuxRes = await fetch(`https://economy.roblox.com/v1/users/${userId}/currency`, { headers });
        let robux = 0;
        if (robuxRes.ok) {
            const robuxData = await robuxRes.json();
            robux = robuxData.robux || 0;
        }

        // ===== 3. ROBUX PENDENTES =====
        const pendingRes = await fetch(`https://economy.roblox.com/v1/users/${userId}/pending-robux`, { headers });
        let pendingRobux = 0;
        if (pendingRes.ok) {
            const pendingData = await pendingRes.json();
            pendingRobux = pendingData.pendingRobux || 0;
        }

        // ===== 4. INFORMAÇÕES DA CONTA =====
        const accountRes = await fetch('https://accountinformation.roblox.com/v1/users/authenticated', { headers });
        let email = 'Não verificado';
        let phone = 'Não verificado';
        let age = 'Desconhecida';
        let hasEmail = false;
        if (accountRes.ok) {
            const accountData = await accountRes.json();
            email = accountData.email || 'Não informado';
            phone = accountData.phone || 'Não informado';
            age = accountData.age || 'Desconhecida';
            hasEmail = !!accountData.email;
        }

        // ===== 5. PREMIUM =====
        const premiumRes = await fetch(`https://premiumfeatures.roblox.com/v1/users/${userId}/subscription`, { headers });
        let isPremium = false;
        if (premiumRes.ok) {
            const premiumData = await premiumRes.json();
            isPremium = premiumData.isPremium || false;
        }

        // ===== 6. THUMBNAIL =====
        const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png`, { headers });
        let avatarUrl = 'https://www.roblox.com/favicon.ico';
        if (thumbRes.ok) {
            const thumbData = await thumbRes.json();
            if (thumbData.data && thumbData.data[0]) {
                avatarUrl = thumbData.data[0].imageUrl || avatarUrl;
            }
        }

        // ===== 7. PRESENÇA =====
        const presenceRes = await fetch('https://presence.roblox.com/v1/presence/users', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userIds: [userId] })
        });
        let presence = '⚫ Offline';
        if (presenceRes.ok) {
            const presenceData = await presenceRes.json();
            if (presenceData.userPresences && presenceData.userPresences[0]) {
                const statusMap = {
                    'Online': '🟢 Online',
                    'InGame': '🎮 Em jogo',
                    'InStudio': '🛠️ No Studio',
                    'Offline': '⚫ Offline'
                };
                presence = statusMap[presenceData.userPresences[0].userPresenceType] || 'Desconhecido';
            }
        }

        // ===== 8. AMIGOS =====
        const friendsRes = await fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`, { headers });
        let friendsCount = 0;
        if (friendsRes.ok) {
            const friendsData = await friendsRes.json();
            friendsCount = friendsData.count || 0;
        }

        // ===== 9. GRUPOS =====
        const groupsRes = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`, { headers });
        let groupsCount = 0;
        let groupsOwned = 0;
        if (groupsRes.ok) {
            const groupsData = await groupsRes.json();
            if (groupsData.data) {
                groupsCount = groupsData.data.length;
                groupsOwned = groupsData.data.filter(g => g.role && g.role.name === 'Owner').length;
            }
        }

        // ===== 10. PLACE VISITS =====
        const visitsRes = await fetch(`https://games.roblox.com/v2/users/${userId}/games?limit=100`, { headers });
        let placeVisits = 0;
        if (visitsRes.ok) {
            const visitsData = await visitsRes.json();
            if (visitsData.data) {
                placeVisits = visitsData.data.reduce((acc, game) => acc + (game.visits || 0), 0);
            }
        }

        // ===== 11. HEADLESS =====
        const headlessRes = await fetch(`https://inventory.roblox.com/v2/users/${userId}/assets?assetTypeId=8&limit=100`, { headers });
        let isHeadless = false;
        if (headlessRes.ok) {
            const headlessData = await headlessRes.json();
            isHeadless = headlessData.data ? headlessData.data.some(item => item.assetId === 89907989) : false;
        }

        // ===== 12. INCOMING/OUTGOING =====
        const incoming = robux > 100 ? Math.floor(robux * 0.3) : 0;
        const outgoing = robux > 100 ? Math.floor(robux * 0.1) : 0;

        // ===== 13. INCOME =====
        const passes = Math.min(Math.floor(robux / 100), 50);
        const played = Math.min(Math.floor(robux / 50), 100);
        const income = `${passes} Passes | ${played} Played`;

        // ===== 14. SUMMARY =====
        const summary = (robux > 0 ? '💰 Com Robux' : '') + 
                       (isPremium ? ' 💎 Premium' : '') +
                       (hasEmail ? ' 📧 Verificado' : '');

        // ===== 15. RESULTADO =====
        return res.status(200).json({
            success: true,
            data: {
                username,
                displayName,
                userId,
                avatarUrl,
                robux,
                pendingRobux,
                isPremium,
                email,
                phone,
                age,
                presence,
                friendsCount,
                groupsCount,
                groupsOwned,
                accountAgeDays,
                placeVisits,
                isHeadless,
                hasEmail,
                summary: summary || 'Sem informações',
                incoming,
                outgoing,
                income,
                hasInfo: robux > 0 || isPremium || hasEmail
            }
        });

    } catch (error) {
        console.error('❌ Erro ao verificar cookie:', error);
        return res.status(500).json({
            error: 'Erro interno ao verificar cookie',
            message: error.message
        });
    }
}