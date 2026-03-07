// Lista de IPs banidos (em memória)
let bannedIPs = [
  "189.126.42.11",
  "177.37.251.156",
  "167.250.155.119",
  "138.118.187.25",
  "192.145.212.153",
  "177.32.34.207",
  "191.246.251.165",
  "177.26.253.73",
  "45.70.101.195",
  "177.91.134.145",
  "170.81.211.216",
  "170.231.141.183",
  "206.0.10.254",
  "170.80.70.169",
  "187.86.8.34",
  "104.28.162.132",
  "177.37.186.137",
  "45.182.243.87",
  "186.212.212.53",
  "167.250.60.229",
  "177.190.191.59",
  "190.8.23.180",
  "168.227.174.200",
  "170.83.16.119",
  "148.227.83.237",
  "45.185.155.22",
  "191.242.109.8",
  "177.190.210.197",
  "177.5.106.38",
  "186.212.212.53"
];

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
    const ipsList = bannedIPs.map(ip => ({
      ip: ip,
      motivo: "Spam",
      data: new Date().toISOString()
    }));
    
    return res.status(200).json({ 
      ips: ipsList,
      total: bannedIPs.length
    });
  }

  // POST - Banir um IP (requer token)
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
      
      if (bannedIPs.includes(cleanIp)) {
        return res.status(400).json({ error: 'IP já está banido' });
      }

      bannedIPs.push(cleanIp);

      return res.status(200).json({ 
        success: true, 
        message: 'IP banido com sucesso',
        total: bannedIPs.length
      });
      
    } catch (error) {
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  // DELETE - Desbanir um IP (requer token)
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
      const index = bannedIPs.indexOf(cleanIp);
      
      if (index === -1) {
        return res.status(404).json({ error: 'IP não encontrado' });
      }

      bannedIPs.splice(index, 1);

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
