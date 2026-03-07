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

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Apenas GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const ip = req.query.ip;

  if (!ip) {
    return res.status(400).json({ error: 'IP é obrigatório' });
  }

  // Limpar o IP (remover barras invertidas, espaços, etc)
  const cleanIp = ip.replace(/\\/g, '').trim();
  
  // Buscar IPs banidos do arquivo
  const bannedData = getBannedIPs();
  
  // Verificar se o IP está na lista
  const banInfo = bannedData.ips.find(item => item.ip === cleanIp);
  const banned = !!banInfo;
  
  console.log(`🔍 Verificando IP: ${cleanIp} - Banido: ${banned} - Motivo: ${banInfo?.motivo || 'Nenhum'}`);
  
  return res.status(200).json({ 
    ip: cleanIp,
    banned: banned,
    message: banned ? `IP banido: ${banInfo.motivo}` : 'IP liberado',
    motivo: banInfo?.motivo || null
  });
}
