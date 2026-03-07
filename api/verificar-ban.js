import { Redis } from '@upstash/redis';

// Conexão com Redis
const redis = new Redis({
  url: "redis://default:m7YQMxZGiyDZTUAdd2pSEKlf1m8sKoJJ@redis-13445.c244.us-east-1-2.ec2.cloud.redislabs.com:13445"
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const ip = req.query.ip;

  if (!ip) {
    return res.status(400).json({ error: 'IP é obrigatório' });
  }

  try {
    const cleanIp = ip.replace(/\\/g, '').trim();
    const bannedIPs = await redis.get('banned_ips') || [];
    
    const banned = bannedIPs.includes(cleanIp);
    
    return res.status(200).json({ 
      ip: cleanIp,
      banned: banned,
      message: banned ? 'IP banido' : 'IP liberado',
      motivo: banned ? 'Spam' : null
    });
    
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao verificar IP'
    });
  }
}