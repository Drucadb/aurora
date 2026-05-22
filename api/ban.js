/**
 * Ban Management API
 * SEGURANÇA: Token de admin deve estar em variável de ambiente
 */

import fs from 'fs';
import path from 'path';

const BANNED_IPS_FILE = path.join(process.cwd(), 'banned-ips.json');

// ===== FUNÇÕES DE ARQUIVO =====

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

// ===== VALIDAÇÃO =====

/**
 * Valida token de autenticação
 */
function validateAuthToken(authHeader) {
  if (!authHeader) return false;

  const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
  if (!ADMIN_TOKEN) {
    console.error('ERRO: ADMIN_TOKEN não configurada');
    return false;
  }

  const token = authHeader.replace('Bearer ', '');
  return token === ADMIN_TOKEN;
}

/**
 * Valida IP
 */
function validateIP(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const cleanIp = ip.replace(/\\/g, '').trim();
  return ipPattern.test(cleanIp);
}

/**
 * Limpa IP
 */
function cleanIP(ip) {
  return ip.replace(/\\/g, '').trim();
}

// ===== HANDLER PRINCIPAL =====

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || 'https://aurora.example.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ===== GET - Listar todos os IPs banidos =====
  if (req.method === 'GET') {
    try {
      const bannedData = getBannedIPs();
      return res.status(200).json({
        total: bannedData.ips.length,
        ips: bannedData.ips
      });
    } catch (error) {
      console.error('Erro ao listar bans:', error);
      return res.status(500).json({ error: 'Erro ao listar bans' });
    }
  }

  // ===== POST - Banir um IP =====
  if (req.method === 'POST') {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!validateAuthToken(authHeader)) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
      const { ip, motivo } = req.body;

      // Validar IP
      if (!validateIP(ip)) {
        return res.status(400).json({ error: 'IP inválido' });
      }

      const cleanIp = cleanIP(ip);
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
          total: bannedData.ips.length
        });
      } else {
        return res.status(500).json({ error: 'Erro ao salvar' });
      }
    } catch (error) {
      console.error('Erro ao banir IP:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  // ===== DELETE - Desbanir um IP =====
  if (req.method === 'DELETE') {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!validateAuthToken(authHeader)) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
      const { ip } = req.body;

      // Validar IP
      if (!validateIP(ip)) {
        return res.status(400).json({ error: 'IP inválido' });
      }

      const cleanIp = cleanIP(ip);
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
      console.error('Erro ao desbanir IP:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
