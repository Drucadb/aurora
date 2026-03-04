// Importar o mesmo arquivo compartilhado
const bannedList = require('./bannedIPs.js');

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const ip = req.query.ip;

    if (!ip) {
        return res.status(400).json({ error: 'IP é obrigatório' });
    }

    const banned = bannedList.isBanned(ip);
    const motivo = bannedList.getBanReason(ip);
    
    return res.status(200).json({ 
        ip: ip,
        banned: banned,
        message: banned ? `IP banido: ${motivo}` : 'IP liberado',
        motivo: motivo || null
    });
}