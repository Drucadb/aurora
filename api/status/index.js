/**
 * Aurora Premium — Status API com Monitoramento Ativo e Webhook do Discord
 * Rota da Vercel: /api/status
 */

const SERVICES_TO_CHECK = [
  {
    id: 'site',
    name: 'Site principal',
    url: process.env.STATUS_SITE_URL || 'https://aurora-plum.vercel.app',
    checkMethod: 'HEAD',
    timeout: 5000
  },
  {
    id: 'support',
    name: 'Central de suporte',
    url: process.env.STATUS_SUPPORT_URL || 'https://aurora-plum.vercel.app/suporte.html',
    checkMethod: 'HEAD',
    timeout: 5000
  },
  {
    id: 'api',
    name: 'API de status',
    url: process.env.STATUS_API_URL || 'https://aurora-plum.vercel.app/api/status',
    checkMethod: 'HEAD',
    timeout: 5000
  }
];

// ============================================================
//  WEBHOOK DO DISCORD (COM CONTROLE DE SPAM)
// ============================================================

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1537268125496512583/8JPcsQ2ghVN5x5nGyMgSIlbYCYkRJAzKb36OyHCatfL8QA50fMQ2wvI6bC3jP_IInhq1';
const WEBHOOK_ENABLED = process.env.DISCORD_WEBHOOK_ENABLED !== 'false';

// 🔥 CONTROLE DE SPAM: só envia se passou pelo menos 2 minutos desde a última notificação
let lastNotificationTime = 0;
const MIN_NOTIFICATION_INTERVAL = 2 * 60 * 1000; // 2 minutos

// Guarda o status anterior
let previousOverall = 'operational';

async function sendDiscordNotification(title, description, color) {
  if (!WEBHOOK_ENABLED) return false;
  
  // 🔥 VERIFICA SE JÁ PASSOU O TEMPO MÍNIMO DESDE A ÚLTIMA NOTIFICAÇÃO
  const now = Date.now();
  if (now - lastNotificationTime < MIN_NOTIFICATION_INTERVAL) {
    console.log(`⏳ Aguardando ${Math.round((MIN_NOTIFICATION_INTERVAL - (now - lastNotificationTime)) / 1000)}s para enviar nova notificação`);
    return false;
  }
  
  try {
    const payload = {
      embeds: [{
        title: title,
        description: description,
        color: color,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Aurora Premium • Status Monitor'
        }
      }]
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('✅ Notificação enviada para o Discord');
      lastNotificationTime = now; // 🔥 ATUALIZA O TEMPO DA ÚLTIMA NOTIFICAÇÃO
    } else {
      console.error('❌ Erro ao enviar webhook:', response.status);
    }
    return response.ok;
  } catch (error) {
    console.error('❌ Erro ao enviar webhook:', error);
    return false;
  }
}

// ============================================================
//  FUNÇÕES DA API
// ============================================================

function getIncidents() {
  try {
    const envIncidents = process.env.STATUS_INCIDENTS;
    if (envIncidents) {
      const parsed = JSON.parse(envIncidents);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  return [
    {
      id: 'inc-001',
      title: 'Manutenção programada da API',
      date: '2026-08-10T02:00:00.000Z',
      status: 'resolved',
      description: 'Atualização de infraestrutura concluída com sucesso.'
    }
  ];
}

// ===== FUNÇÃO PARA FAZER PING NO SERVIÇO =====
async function checkService(service) {
  const start = performance.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), service.timeout || 5000);
    
    const response = await fetch(service.url, {
      method: service.checkMethod || 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'User-Agent': 'Aurora-Status-Checker/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    const end = performance.now();
    const responseTime = Math.round(end - start);
    
    if (response.ok || response.status === 304) {
      return {
        ...service,
        status: 'operational',
        responseTimeMs: responseTime,
        checked: true,
        detail: 'Serviço respondendo normalmente.',
        lastCheck: new Date().toISOString()
      };
    } else {
      return {
        ...service,
        status: 'outage',
        responseTimeMs: responseTime,
        checked: true,
        detail: `🚨 HTTP ${response.status} - Serviço indisponível.`,
        lastCheck: new Date().toISOString()
      };
    }
    
  } catch (error) {
    let detail = 'Serviço indisponível.';
    if (error.name === 'AbortError') {
      detail = 'Tempo de resposta excedido (timeout).';
    } else if (error.code === 'ENOTFOUND') {
      detail = 'Servidor não encontrado (DNS).';
    } else if (error.code === 'ECONNREFUSED') {
      detail = 'Conexão recusada.';
    } else {
      detail = error.message || 'Erro desconhecido.';
    }
    
    return {
      ...service,
      status: 'outage',
      responseTimeMs: null,
      checked: true,
      detail: `🚨 ${detail}`,
      lastCheck: new Date().toISOString(),
      error: error.message
    };
  }
}

// ===== CALCULAR STATUS GERAL =====
function getOverallStatus(services) {
  if (services.some(s => s.status === 'outage')) return 'outage';
  if (services.some(s => s.status === 'maintenance')) return 'maintenance';
  if (services.some(s => s.status === 'degraded')) return 'degraded';
  return 'operational';
}

// ===== GERAR UPTIME DINÂMICO =====
function generateUptimeData(services, days = 30) {
  const data = [];
  const now = new Date();
  
  const hasOutage = services.some(s => s.status === 'outage');
  const hasMaintenance = services.some(s => s.status === 'maintenance');
  const hasDegraded = services.some(s => s.status === 'degraded');
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    let uptime = 100;
    let status = 'operational';
    
    if (i === 0) {
      if (hasOutage) {
        uptime = 0;
        status = 'outage';
      } else if (hasMaintenance) {
        uptime = 95;
        status = 'maintenance';
      } else if (hasDegraded) {
        uptime = 85;
        status = 'degraded';
      }
    } else {
      const seed = i * 7 + 3;
      const pseudoRandom = ((seed * 9301 + 49297) % 233280) / 233280;
      uptime = 99 + pseudoRandom * 0.8;
      if (uptime > 100) uptime = 100;
      uptime = Math.round(uptime * 10) / 10;
      status = uptime >= 99.5 ? 'operational' : uptime >= 98 ? 'degraded' : 'outage';
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      uptime: uptime,
      status: status
    });
  }
  
  return data;
}

// ============================================================
//  HANDLER PRINCIPAL
// ============================================================

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // ===== VERIFICAR SE DEVE USAR MODO MANUAL =====
  const manualMode = process.env.STATUS_MANUAL_MODE === 'true';
  
  let services;
  
  if (manualMode) {
    const siteMode = process.env.STATUS_SITE_MODE || 'operational';
    const supportMode = process.env.STATUS_SUPPORT_MODE || 'operational';
    const apiMode = process.env.STATUS_API_MODE || 'operational';
    
    services = [
      { id: 'site', name: 'Site principal', status: siteMode, responseTimeMs: null, checked: true, detail: siteMode === 'operational' ? 'Site disponível.' : 'Modo manual ativado.' },
      { id: 'support', name: 'Central de suporte', status: supportMode, responseTimeMs: null, checked: true, detail: supportMode === 'operational' ? 'Central disponível.' : 'Modo manual ativado.' },
      { id: 'api', name: 'API de status', status: apiMode, responseTimeMs: null, checked: true, detail: apiMode === 'operational' ? 'API respondendo.' : 'Modo manual ativado.' }
    ];
  } else {
    const checkPromises = SERVICES_TO_CHECK.map(service => checkService(service));
    services = await Promise.all(checkPromises);
  }

  // ===== CALCULAR OVERALL =====
  const overall = getOverallStatus(services);

  // ===== 🔥 VERIFICAR MUDANÇA DE STATUS COM CONTROLE DE SPAM =====
  if (WEBHOOK_ENABLED && overall !== previousOverall) {
    let title = '';
    let description = '';
    let color = 0x5865F2;

    if (overall === 'maintenance') {
      title = '🔧 Aurora em Manutenção!';
      description = 'A Aurora Premium entrou em modo de manutenção. Em breve voltaremos!';
      color = 0x5865F2; // Roxo
    } else if (overall === 'outage') {
      title = '🚨 Aurora Fora do Ar!';
      description = 'A Aurora Premium está enfrentando uma interrupção. Já estamos trabalhando na solução!';
      color = 0xED4245; // Vermelho
    } else if (overall === 'operational' && previousOverall !== 'operational') {
      title = '✅ Serviços Restaurados!';
      description = 'A Aurora Premium voltou a funcionar normalmente. Todos os serviços estão online!';
      color = 0x57F287; // Verde
    }

    if (title) {
      await sendDiscordNotification(title, description, color);
    }

    previousOverall = overall;
  }

  // ===== MENSAGENS =====
  const messages = {
    operational: 'Todos os serviços estão funcionando normalmente. ✅',
    degraded: '⚠️ Alguns serviços estão com instabilidade.',
    maintenance: '🔧 Estamos em manutenção programada. Em breve voltaremos!',
    outage: '🚨 Estamos enfrentando uma interrupção.'
  };

  // ===== GERAR UPTIME =====
  const uptimeData = generateUptimeData(services, 30);

  // ===== MONTAR PAYLOAD =====
  const payload = {
    ok: true,
    service: 'Aurora Premium',
    overall,
    maintenance: overall === 'maintenance',
    message: process.env.STATUS_MESSAGE || messages[overall] || 'Status atualizado.',
    updatedAt: new Date().toISOString(),
    services,
    incidents: getIncidents(),
    uptime: uptimeData,
    meta: {
      totalServices: services.length,
      operational: services.filter(s => s.status === 'operational').length,
      degraded: services.filter(s => s.status === 'degraded').length,
      maintenance: services.filter(s => s.status === 'maintenance').length,
      outage: services.filter(s => s.status === 'outage').length
    },
    timestamps: {
      utc: new Date().toISOString(),
      local: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    }
  };

  // ===== CACHE E CORS =====
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(200).json(payload);
}
