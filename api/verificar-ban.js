// Importar a MESMA lista compartilhada
const bannedList = require('./bannedIPs.js');

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Apenas GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    let ip = req.query.ip;

    if (!ip) {
        return res.status(400).json({ error: 'IP é obrigatório' });
    }

    // 🔥 LIMPAR O IP (remover barras invertidas, espaços, etc)
    ip = ip.replace(/\\/g, '').trim();
    
    console.log(`🔍 Verificando IP limpo: ${ip}`);

    // Verificar se está banido usando a MESMA lista
    const banned = bannedList.isBanned(ip);
    const motivo = bannedList.getBanReason(ip);
    
    // Log para debug
    console.log(`📊 Resultado - IP: ${ip} - Banido: ${banned} - Motivo: ${motivo}`);
    
    return res.status(200).json({ 
        ip: ip,
        banned: banned,
        message: banned ? `IP banido: ${motivo}` : 'IP liberado',
        motivo: motivo
    });
}
