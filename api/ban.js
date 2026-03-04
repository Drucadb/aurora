// Importar a MESMA lista compartilhada
const bannedList = require('./bannedIPs.js');

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const authToken = req.headers.authorization;
    const ADMIN_TOKEN = 'pornhub'; // MUDE ISSO

    // GET - Listar todos os IPs banidos
    if (req.method === 'GET') {
        const bans = bannedList.getBans();
        return res.status(200).json({ 
            ips: bans,
            total: bannedList.getTotalBans()
        });
    }

    // POST - Banir um IP
    if (req.method === 'POST') {
        // Verificar token
        if (authToken !== `Bearer ${ADMIN_TOKEN}`) {
            return res.status(401).json({ error: 'Não autorizado' });
        }

        try {
            const { ip, motivo } = req.body;

            if (!ip) {
                return res.status(400).json({ error: 'IP é obrigatório' });
            }

            // Verificar se já existe
            if (bannedList.isBanned(ip)) {
                return res.status(400).json({ error: 'IP já está banido' });
            }

            // Adicionar ban
            bannedList.addBan(ip, motivo);

            return res.status(200).json({ 
                success: true, 
                message: 'IP banido com sucesso',
                ip: ip,
                motivo: motivo || 'Spam detectado',
                total: bannedList.getTotalBans()
            });
            
        } catch (error) {
            console.error('Erro:', error);
            return res.status(500).json({ error: 'Erro interno' });
        }
    }

    // DELETE - Desbanir um IP
    if (req.method === 'DELETE') {
        // Verificar token
        if (authToken !== `Bearer ${ADMIN_TOKEN}`) {
            return res.status(401).json({ error: 'Não autorizado' });
        }

        try {
            const { ip } = req.body;

            if (!ip) {
                return res.status(400).json({ error: 'IP é obrigatório' });
            }

            // Verificar se existe
            if (!bannedList.isBanned(ip)) {
                return res.status(404).json({ error: 'IP não encontrado' });
            }

            // Remover ban
            bannedList.removeBan(ip);

            return res.status(200).json({ 
                success: true, 
                message: 'IP desbanido com sucesso',
                ip: ip,
                total: bannedList.getTotalBans()
            });
            
        } catch (error) {
            console.error('Erro:', error);
            return res.status(500).json({ error: 'Erro interno' });
        }
    }

    return res.status(405).json({ error: 'Método não permitido' });
}
