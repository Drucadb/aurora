// Array compartilhado com o webhook.js
// NOTA: Ambos arquivos usam a mesma lista em memória
let bannedIPs = [];

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authToken = req.headers.authorization;
  const ADMIN_TOKEN = 'xvideo'; // MUDE ISSO!

  // GET - Listar todos os IPs banidos
  if (req.method === 'GET') {
    return res.status(200).json({ 
      ips: bannedIPs,
      total: bannedIPs.length
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
      if (bannedIPs.some(item => item.ip === ip)) {
        return res.status(400).json({ error: 'IP já está banido' });
      }

      // Adicionar ao array
      bannedIPs.push({
        ip,
        motivo: motivo || 'Spam detectado',
        data: new Date().toISOString()
      });

      return res.status(200).json({ 
        success: true, 
        message: 'IP banido com sucesso',
        total: bannedIPs.length
      });
      
    } catch (error) {
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

      const initialLength = bannedIPs.length;
      bannedIPs = bannedIPs.filter(item => item.ip !== ip);

      if (bannedIPs.length === initialLength) {
        return res.status(404).json({ error: 'IP não encontrado' });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'IP desbanido com sucesso',
        total: bannedIPs.length
      });
      
    } catch (error) {
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}