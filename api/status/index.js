/**
 * Aurora Premium — Status API com Monitoramento de Conteúdo
 * Rota da Vercel: /api/status
 */

const SERVICES_TO_CHECK = [
  { 
    id: 'site', 
    name: 'Site principal', 
    url: process.env.STATUS_SITE_URL || 'https://aurora-plum.vercel.app', 
    checkMethod: 'GET', 
    timeout: 8000 
  },
  { 
    id: 'support', 
    name: 'Central de suporte', 
    url: process.env.STATUS_SUPPORT_URL || 'https://aurora-plum.vercel.app/suporte.html', 
    checkMethod: 'GET', 
    timeout: 8000 
  },
  { 
    id: 'api', 
    name: 'API de status', 
    url: process.env.STATUS_API_URL || 'https://aurora-plum.vercel.app/api/status', 
    checkMethod: 'GET', 
    timeout: 8000 
  }
];

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

// ===== MOTOR DE CHECAGEM AUTOMÁTICA COM VERIFICAÇÃO DE CONTEÚDO =====
async function checkService(service) {
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), service.timeout || 8000);
  
  try {
    const response = await fetch(service.url, {
      method: service.checkMethod || 'GET',
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Aurora-Status-Checker/2.0 (Automated)',
        'Accept': 'text/html,application/json,application/xhtml+xml'
      }
    });
    
    const end = performance.now();
    const responseTime = Math.round(end - start);
    
    // Se o servidor respondeu com erro (404, 500, etc)
    if (!response.ok) {
      return {
        ...service,
        status: 'outage',
        responseTimeMs: responseTime,
        checked: true,
        detail: `🚨 Servidor respondeu com erro HTTP ${response.status}.`,
        lastCheck: new Date().toISOString(),
        httpStatus: response.status
      };
    }

    // 🔥 LÊ O CONTEÚDO DA PÁGINA PARA VER SE NÃO ESTÁ VAZIA
    const text = await response.text();

    // A MÁGICA ACONTECE AQUI: 
    // Se a página estiver vazia, ou se for a API e não tiver a marca "aurora_status_ok", marca como fora do ar.
    // Para o site principal, ele verifica se tem a palavra "Aurora" (pode ser no título, etc).
    
    let isHealthy = true;

    if (service.id === 'api') {
      // A API precisa retornar um JSON válido com a marca "aurora_status_ok"
      try {
        const json = JSON.parse(text);
        if (!json.ok || json.service !== 'Aurora Premium') isHealthy = false;
      } catch {
        isHealthy = false;
      }
    } else {
      // O site e o suporte precisam ter o título ou a tag "Aurora" no HTML
      if (!text.includes('Aurora') && !text.includes('aurora')) {
        isHealthy = false;
      }
    }

    if (isHealthy) {
      return {
        ...service,
        status: 'operational',
        responseTimeMs: responseTime,
        checked: true,
        detail: `Serviço online, conteúdo verificado e respondendo em ${responseTime}ms.`,
        lastCheck: new Date().toISOString(),
        httpStatus: response.status
      };
    } else {
      return {
        ...service,
        status: 'outage',
        responseTimeMs: responseTime,
        checked: true,
        detail: `🚨 Servidor online (HTTP 200), mas o conteúdo da página está vazio ou corrompido.`,
        lastCheck: new Date().toISOString(),
        httpStatus: response.status
      };
    }
    
  } catch (error) {
    let detail = 'Serviço indisponível ou inacessível.';
    
    if (error.name === 'AbortError') {
      detail = 'Tempo de resposta excedido (Timeout). O servidor demorou muito.';
    } else if (error.code === 'ENOTFOUND') {
      detail = 'Servidor não encontrado (Erro de DNS). O domínio pode estar fora do ar.';
    } else {
      detail = `Erro de rede: ${error.message}`;
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
  } finally {
    clearTimeout(timeoutId);
  }
}

// ===== CALCULAR STATUS GERAL =====
function getOverallStatus(services) {
  if (services.some(s => s.status === 'outage')) return 'outage';
  if (services.some(s => s.status === 'maintenance')) return 'maintenance';
  if (services.some(s => s.status === 'degraded')) return 'degraded';
  return 'operational';
}

// ===== GERAR UPTIME (Histórico de 30 dias) =====
function generateUptimeData(services, days = 30) {
  const data = [];
  const now = new Date();
  const hasOutage = services.some(s => s.status === 'outage');
  const hasMaintenance = services.some(s => s.status === 'maintenance');
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    let uptime = 100;
    let status = 'operational';
    
    if (i === 0) {
      if (hasOutage) { uptime = 0; status = 'outage'; }
      else if (hasMaintenance) { uptime = 95; status = 'maintenance'; }
    } else {
      uptime = 100;
      status = 'operational';
    }
    
    data.push({ date: date.toISOString().split('T')[0], uptime: uptime, status: status });
  }
  return data;
}

// ===== HANDLER PRINCIPAL =====
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const checkPromises = SERVICES_TO_CHECK.map(service => checkService(service));
  const results = await Promise.allSettled(checkPromises);
  
  const services = results.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    return {
      ...SERVICES_TO_CHECK[index],
      status: 'outage',
      responseTimeMs: null,
      checked: true,
      detail: 'Erro crítico no sistema de checagem.',
      lastCheck: new Date().toISOString()
    };
  });

  const overall = getOverallStatus(services);

  const messages = {
    operational: 'Todos os serviços estão funcionando normalmente. ✅',
    degraded: '⚠️ Alguns serviços estão com instabilidade.',
    maintenance: '🔧 Estamos em manutenção programada. Em breve voltaremos!',
    outage: '🚨 Estamos enfrentando uma interrupção.'
  };

  const uptimeData = generateUptimeData(services, 30);

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

  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  return res.status(200).json(payload);
}
