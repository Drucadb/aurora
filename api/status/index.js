/**
 * Aurora Premium — Status API com Monitoramento Ativo
 * Rota da Vercel: /api/status
 */

const VALID_MODES = ['operational', 'degraded', 'maintenance', 'outage'];

// ===== SERVIÇOS PARA MONITORAR =====
const SERVICES_TO_CHECK = [
  {
    id: 'site',
    name: 'Site principal',
    url: process.env.STATUS_SITE_URL || 'https://aurora-plum.vercel.app',
    checkMethod: 'HEAD',
    timeout: 5000,
    fallbackStatus: 'operational'
  },
  {
    id: 'support',
    name: 'Central de suporte',
    url: process.env.STATUS_SUPPORT_URL || 'https://aurora-plum.vercel.app/suporte.html',
    checkMethod: 'HEAD',
    timeout: 5000,
    fallbackStatus: 'operational'
  },
  {
    id: 'api',
    name: 'API de status',
    url: process.env.STATUS_API_URL || 'https://aurora-plum.vercel.app/api/status',
    checkMethod: 'GET',
    timeout: 5000,
    fallbackStatus: 'operational'
  }
];

// ===== INCIDENTES FIXOS =====
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

// ===== UPTIME FIXO =====
function getUptimeData() {
  const baseData = [
    { date: '2026-07-14', uptime: 99.8 }, { date: '2026-07-15', uptime: 100.0 },
    { date: '2026-07-16', uptime: 99.9 }, { date: '2026-07-17', uptime: 100.0 },
    { date: '2026-07-18', uptime: 99.7 }, { date: '2026-07-19', uptime: 100.0 },
    { date: '2026-07-20', uptime: 99.9 }, { date: '2026-07-21', uptime: 100.0 },
    { date: '2026-07-22', uptime: 99.8 }, { date: '2026-07-23', uptime: 100.0 },
    { date: '2026-07-24', uptime: 99.9 }, { date: '2026-07-25', uptime: 100.0 },
    { date: '2026-07-26', uptime: 99.5 }, { date: '2026-07-27', uptime: 100.0 },
    { date: '2026-07-28', uptime: 99.9 }, { date: '2026-07-29', uptime: 100.0 },
    { date: '2026-07-30', uptime: 99.8 }, { date: '2026-07-31', uptime: 100.0 },
    { date: '2026-08-01', uptime: 99.9 }, { date: '2026-08-02', uptime: 100.0 },
    { date: '2026-08-03', uptime: 99.7 }, { date: '2026-08-04', uptime: 100.0 },
    { date: '2026-08-05', uptime: 99.8 }, { date: '2026-08-06', uptime: 100.0 },
    { date: '2026-08-07', uptime: 99.9 }, { date: '2026-08-08', uptime: 100.0 },
    { date: '2026-08-09', uptime: 99.8 }, { date: '2026-08-10', uptime: 100.0 },
    { date: '2026-08-11', uptime: 99.9 }, { date: '2026-08-12', uptime: 100.0 }
  ];

  return baseData.map(item => ({
    date: item.date,
    uptime: item.uptime,
    status: item.uptime >= 99.5 ? 'operational' : item.uptime >= 98 ? 'degraded' : 'outage'
  }));
}

// ===== FUNÇÃO PARA FAZER PING NO SERVIÇO (CORRIGIDA) =====
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
    
    // 🔥 CORREÇÃO: Qualquer erro HTTP = OUTAGE
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
      // 🔥 ERRO HTTP = OUTAGE (vermelho)
      return {
        ...service,
        status: 'outage',
        responseTimeMs: responseTime,
        checked: true,
        detail: `🚨 HTTP ${response.status} - Página não encontrada ou erro no servidor.`,
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

// ===== HANDLER PRINCIPAL =====
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

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

  const overall = getOverallStatus(services);

  const messages = {
    operational: 'Todos os serviços estão funcionando normalmente. ✅',
    degraded: '⚠️ Alguns serviços estão com instabilidade.',
    maintenance: '🔧 Manutenção em andamento.',
    outage: '🚨 Estamos enfrentando uma interrupção.'
  };

  const payload = {
    ok: true,
    service: 'Aurora Premium',
    overall,
    maintenance: overall === 'maintenance',
    message: process.env.STATUS_MESSAGE || messages[overall] || 'Status atualizado.',
    updatedAt: new Date().toISOString(),
    services,
    incidents: getIncidents(),
    uptime: getUptimeData(),
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

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(200).json(payload);
}
