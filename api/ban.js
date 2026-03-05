import fs from 'fs';
import path from 'path';

const BANNED_IPS_FILE = path.join(process.cwd(), 'banned-ips.json');

function getBannedIPs() {
  try {
    if (fs.existsSync(BANNED_IPS_FILE)) {
      const data = fs.readFileSync(BANNED_IPS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Erro ao ler banned-ips.json:', error);
  }
  return { ips: [] };
}

function saveBannedIPs(data) {
  try {
    fs.writeFileSync(BANNED_IPS_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Erro ao salvar banned-ips.json:', error);
    return false;
  }
}

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authToken = req.headers.authorization;
  const ADMIN_TOKEN = 'sua_senha_secreta_aqui'; // MUDE ISSO

  // GET - Listar todos os IPs banidos
  if (req.method === 'GET') {
    const bannedData = getBannedIPs();
    return res.status(200).json(bannedData);
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

      const cleanIp = ip.replace(/\\/g, '').trim();
      const bannedData = getBannedIPs();
      
      // Verificar se já existe
      if (bannedData.ips.some(item => item.ip === cleanIp)) {
        return res.status(400).json({ error: 'IP já está banido' });
      }

      // Adicionar ban
      bannedData.ips.push({
        ip: cleanIp,
        motivo: motivo || 'Spam detectado',
        data: new Date().toISOString()
      });

      if (saveBannedIPs(bannedData)) {
        return res.status(200).json({ 
          success: true, 
          message: 'IP banido com sucesso',
          ip: cleanIp,
          motivo: motivo || 'Spam detectado',
          total: bannedData.ips.length
        });
      } else {
        return res.status(500).json({ error: 'Erro ao salvar' });
      }
      
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

      const cleanIp = ip.replace(/\\/g, '').trim();
      const bannedData = getBannedIPs();
      
      const initialLength = bannedData.ips.length;
      bannedData.ips = bannedData.ips.filter(item => item.ip !== cleanIp);

      if (bannedData.ips.length === initialLength) {
        return res.status(404).json({ error: 'IP não encontrado' });
      }

      if (saveBannedIPs(bannedData)) {
        return res.status(200).json({ 
          success: true, 
          message: 'IP desbanido com sucesso',
          ip: cleanIp,
          total: bannedData.ips.length
        });
      } else {
        return res.status(500).json({ error: 'Erro ao salvar' });
      }
      
    } catch (error) {
      console.error('Erro:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
