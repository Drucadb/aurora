import { Redis } from '@upstash/redis';

// Conexão com Redis usando a URL
const redis = new Redis({
  url: "redis://default:m7YQMxZGiyDZTUAdd2pSEKlf1m8sKoJJ@redis-13445.c244.us-east-1-2.ec2.cloud.redislabs.com:13445"
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authToken = req.headers.authorization;
  const ADMIN_TOKEN = 'pornhub'; // COLOQUE SUA SENHA

  // GET - Listar todos os IPs banidos
  if (req.method === 'GET') {
    try {
      const bannedIPs = await redis.get('banned_ips') || [];
      
      // Formatar para o formato antigo (compatibilidade)
      const ipsList = bannedIPs.map(ip => ({
        ip: ip,
        motivo: "Spam",
        data: new Date().toISOString()
      }));
      
      return res.status(200).json({ 
        ips: ipsList,
        total: bannedIPs.length
      });
    } catch (error) {
      console.error('Erro ao ler bans:', error);
      return res.status(500).json({ error: 'Erro ao ler bans' });
    }
  }

  // POST - Banir um IP
  if (req.method === 'POST') {
    if (authToken !== `Bearer ${ADMIN_TOKEN}`) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
      const { ip, motivo } = req.body;

      if (!ip) {
        return res.status(400).json({ error: 'IP é obrigatório' });
      }

      const cleanIp = ip.replace(/\\/g, '').trim();
      
      // Buscar lista atual
      let bannedIPs = await redis.get('banned_ips') || [];
      
      // Verificar se já existe
      if (bannedIPs.includes(cleanIp)) {
        return res.status(400).json({ error: 'IP já está banido' });
      }

      // Adicionar novo IP
      bannedIPs.push(cleanIp);
      await redis.set('banned_ips', bannedIPs);

      return res.status(200).json({ 
        success: true, 
        message: 'IP banido com sucesso',
        total: bannedIPs.length
      });
      
    } catch (error) {
      console.error('Erro:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  // DELETE - Desbanir um IP
  if (req.method === 'DELETE') {
    if (authToken !== `Bearer ${ADMIN_TOKEN}`) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
      const { ip } = req.body;

      if (!ip) {
        return res.status(400).json({ error: 'IP é obrigatório' });
      }

      const cleanIp = ip.replace(/\\/g, '').trim();
      
      // Buscar lista atual
      let bannedIPs = await redis.get('banned_ips') || [];
      
      // Filtrar (remover o IP)
      const newList = bannedIPs.filter(item => item !== cleanIp);
      
      if (newList.length === bannedIPs.length) {
        return res.status(404).json({ error: 'IP não encontrado' });
      }

      // Salvar nova lista
      await redis.set('banned_ips', newList);

      return res.status(200).json({ 
        success: true, 
        message: 'IP desbanido com sucesso',
        total: newList.length
      });
      
    } catch (error) {
      console.error('Erro:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });

}
