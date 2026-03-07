import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname equivalente em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho ABSOLUTO para o arquivo na RAIZ
const BANNED_IPS_FILE = path.join(process.cwd(), 'banned-ips.json');

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

  try {
    // 🔥 VERIFICAR SE O ARQUIVO EXISTE
    console.log('📁 Procurando arquivo em:', BANNED_IPS_FILE);
    
    if (!fs.existsSync(BANNED_IPS_FILE)) {
      console.error('❌ ARQUIVO NÃO ENCONTRADO!');
      return res.status(500).json({ 
        error: 'Arquivo de bans não encontrado',
        path: BANNED_IPS_FILE
      });
    }

    // Ler o arquivo
    const fileContent = fs.readFileSync(BANNED_IPS_FILE, 'utf8');
    console.log('📄 Conteúdo do arquivo:', fileContent.substring(0, 200) + '...');
    
    const bannedData = JSON.parse(fileContent);
    
    // Limpar o IP (remover barras invertidas, espaços)
    const cleanIp = ip.replace(/\\/g, '').trim();
    
    // Procurar o IP na lista
    const banInfo = bannedData.ips.find(item => item.ip === cleanIp);
    const banned = !!banInfo;
    
    console.log(`🔍 IP: ${cleanIp} - Banido: ${banned}`);
    
    return res.status(200).json({ 
      ip: cleanIp,
      banned: banned,
      message: banned ? `IP banido: ${banInfo.motivo}` : 'IP liberado',
      motivo: banInfo?.motivo || null
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao verificar IP',
      details: error.message 
    });
  }
}
