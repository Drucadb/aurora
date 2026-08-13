/**
 * Aurora Premium — Status API
 * Rota da Vercel: /api/status
 *
 * Variáveis na Vercel:
 * STATUS_MODE=operational|degraded|maintenance|outage       (site inteiro)
 * STATUS_SITE_MODE=operational|degraded|maintenance|outage
 * STATUS_SUPPORT_MODE=operational|degraded|maintenance|outage
 * STATUS_API_MODE=operational|degraded|maintenance|outage
 * STATUS_MESSAGE=Mensagem geral opcional
 * STATUS_SUPPORT_MESSAGE=Mensagem do suporte opcional
 * STATUS_API_MESSAGE=Mensagem da API opcional
 * STATUS_INCIDENTS=JSON com incidentes (opcional)
 */

const VALID_MODES = ['operational', 'degraded', 'maintenance', 'outage'];
const MODE_LABELS = {
  operational: 'Operacional',
  degraded: 'Instável',
  maintenance: 'Manutenção',
  outage: 'Fora do ar'
};

function readMode(value, fallback = 'operational') {
  return VALID_MODES.includes(value) ? value : fallback;
}

function getOverallStatus(services) {
  if (services.some(s => s.status === 'outage')) return 'outage';
  if (services.some(s => s.status === 'maintenance')) return 'maintenance';
  if (services.some(s => s.status === 'degraded')) return 'degraded';
  return 'operational';
}

// ===== SIMULAÇÃO DE TEMPO DE RESPOSTA =====
async function measureResponseTime(url, timeout = 3000) {
  try {
    const start = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, { 
      signal: controller.signal,
      method: 'HEAD',
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    const end = performance.now();
    return Math.round(end - start);
  } catch (error) {
    return null;
  }
}

// ===== INCIDENTES (exemplo, pode vir do env ou de um arquivo) =====
function getIncidents() {
  // Tenta ler do env (JSON)
  try {
    const envIncidents = process.env.STATUS_INCIDENTS;
    if (envIncidents) {
      const parsed = JSON.parse(envIncidents);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.log('⚠️ Erro ao parsear STATUS_INCIDENTS');
  }
  
  // Incidentes padrão (mock)
  return [
    {
      id: 'inc-001',
      title: 'Manutenção programada da API',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'resolved',
      description: 'Atualização de infraestrutura concluída com sucesso.'
    },
    {
      id: 'inc-002',
      title: 'Instabilidade temporária no site',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'resolved',
      description: 'Problema com CDN foi identificado e corrigido.'
    }
  ];
}

// ===== DADOS DE UPTIME (simulados) =====
function getUptimeData(days = 30) {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    // Simula uptime realista (99.5% - 100%)
    const baseUptime = 99 + Math.random() * 0.8;
    const uptime = Math.min(100, Math.round(baseUptime * 10) / 10);
    data.push({
      date: date.toISOString().split('T')[0],
      uptime: uptime,
      status: uptime >= 99.5 ? 'operational' : uptime >= 98 ? 'degraded' : 'outage'
    });
  }
  return data;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    // ===== LER CONFIGURAÇÕES =====
    const siteMode = readMode(process.env.STATUS_SITE_MODE, readMode(process.env.STATUS_MODE));
    const supportMode = readMode(process.env.STATUS_SUPPORT_MODE, 'operational');
    const apiMode = readMode(process.env.STATUS_API_MODE, 'operational');

    // ===== MEDIR TEMPO DE RESPOSTA (opcional) =====
    // Descomente para medir tempo real (pode aumentar o tempo de resposta da API)
    // const siteLatency = await measureResponseTime('https://aurora-plum.vercel.app');
    // const supportLatency = await measureResponseTime('https://aurora-plum.vercel.app/suporte.html');
    // const apiLatency = null; // já estamos na API

    // ===== MONTAR SERVIÇOS =====
    const services = [
      {
        id: 'site',
        name: 'Site principal',
        status: siteMode,
        responseTimeMs: null, // siteLatency || null,
        checked: true,
        detail: siteMode === 'outage' ? 'Site temporariamente indisponível. Estamos investigando.' :
                siteMode === 'maintenance' ? 'Site em manutenção programada.' :
                siteMode === 'degraded' ? 'Site com instabilidade momentânea.' :
                'Site disponível e funcionando normalmente.'
      },
      {
        id: 'support',
        name: 'Central de suporte',
        status: supportMode,
        responseTimeMs: null, // supportLatency || null,
        checked: true,
        detail: supportMode === 'outage' ? 'Suporte temporariamente indisponível.' :
                supportMode === 'maintenance' ? (process.env.STATUS_SUPPORT_MESSAGE || 'Atendimento em manutenção.') :
                supportMode === 'degraded' ? 'Suporte com alta demanda, tempo de resposta pode ser maior.' :
                'Central disponível e funcionando normalmente.'
      },
      {
        id: 'api',
        name: 'API de status',
        status: apiMode,
        responseTimeMs: null,
        checked: true,
        detail: apiMode === 'outage' ? 'API de status indisponível.' :
                apiMode === 'maintenance' ? (process.env.STATUS_API_MESSAGE || 'API em manutenção.') :
                apiMode === 'degraded' ? 'API com instabilidade momentânea.' :
                'Endpoint respondendo normalmente.'
      }
    ];

    // ===== CALCULAR STATUS GERAL =====
    const overall = getOverallStatus(services);

    // ===== MENSAGENS =====
    const messages = {
      operational: 'Todos os serviços estão funcionando normalmente. ✅',
      degraded: '⚠️ Alguns serviços estão com instabilidade. Estamos trabalhando para normalizar.',
      maintenance: '🔧 Estamos realizando manutenção programada. Em breve tudo estará de volta.',
      outage: '🚨 Estamos enfrentando uma interrupção. Já estamos trabalhando na solução.'
    };

    // ===== MONTAR PAYLOAD =====
    const payload = {
      ok: true,
      service: 'Aurora Premium',
      overall,
      maintenance: overall === 'maintenance',
      message: process.env.STATUS_MESSAGE || messages[overall] || 'Status atualizado.',
      updatedAt: new Date().toISOString(),
      services,
      
      // ===== NOVOS CAMPOS =====
      incidents: getIncidents(),
      uptime: getUptimeData(30),
      
      meta: {
        totalServices: services.length,
        operational: services.filter(s => s.status === 'operational').length,
        degraded: services.filter(s => s.status === 'degraded').length,
        maintenance: services.filter(s => s.status === 'maintenance').length,
        outage: services.filter(s => s.status === 'outage').length
      },
      
      // ===== TIMESTAMP EM UTC E LOCAL =====
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

  } catch (error) {
    console.error('Status API error:', error);
    return res.status(200).json({
      ok: false,
      service: 'Aurora Premium',
      overall: 'degraded',
      maintenance: false,
      message: 'A API está respondendo com limitações.',
      updatedAt: new Date().toISOString(),
      services: [
        { id: 'api', name: 'API de status', status: 'degraded', responseTimeMs: null, checked: false, detail: 'Resposta de segurança ativada.' }
      ],
      incidents: [],
      uptime: [],
      meta: { totalServices: 1, operational: 0, degraded: 1, maintenance: 0, outage: 0 },
      timestamps: { utc: new Date().toISOString(), local: new Date().toLocaleString('pt-BR') }
    });
  }
}
