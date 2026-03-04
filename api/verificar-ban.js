// Array compartilhado
let bannedIPs = [];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const ip = req.query.ip;

  if (!ip) {
    return res.status(400).json({ error: 'IP é obrigatório' });
  }

  const banned = bannedIPs.some(item => item.ip === ip);
  
  return res.status(200).json({ 
    ip: ip,
    banned: banned,
    message: banned ? 'IP banido' : 'IP liberado'
  });
}