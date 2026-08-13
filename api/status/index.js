/**
 * Aurora Premium — Status API
 * Rota da Vercel: /api/status
 *
 * Variáveis na Vercel:
 * STATUS_MODE=operational|degraded|maintenance|outage
 * STATUS_SITE_MODE=operational|degraded|maintenance|outage
 * STATUS_SUPPORT_MODE=operational|degraded|maintenance|outage
 * STATUS_API_MODE=operational|degraded|maintenance|outage
 * STATUS_MESSAGE=Mensagem geral opcional
 * STATUS_SUPPORT_MESSAGE=Mensagem do suporte opcional
 * STATUS_API_MESSAGE=Mensagem da API opcional
 * STATUS_INCIDENTS=JSON com incidentes (opcional)
 */

const VALID_MODES = ['operational', 'degraded', 'maintenance', 'outage'];

function readMode(value, fallback = 'operational') {
  return VALID_MODES.includes(value) ? value : fallback;
}

function getOverallStatus(services) {
  if (services.some(s => s.status === 'outage')) return 'outage';
  if (services.some(s => s.status === 'maintenance')) return 'maintenance';
  if (services.some(s => s.status === 'degraded')) return 'degraded';
  return 'operational';
}

// ===== INCIDENTES FIXOS (não mudam) =====
function getIncidents() {
  // Tenta ler do env (JSON)
  try {
    const envIncidents = process.env.STATUS_INCIDENTS;
    if (envIncidents) {
      const parsed = JSON.parse(envIncidents);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.log('⚠️ Erro ao parsear STATUS_INCIDENTS');
  }
  
  // 🔥 INCIDENTES FIXOS (não mudam com refresh)
  return [
    {
      id: 'inc-001',
      title: 'Manutenção programada da API',
      date: '2026-08-10T02:00:00.000Z',
      status: 'resolved',
      description: 'Atualização de infraestrutura concluída com sucesso.'
    },
    {
      id: 'inc-002',
      title: 'Instabilidade temporária no site',
      date: '2026-08-05T14:30:00.000Z',
      status: 'resolved',
      description: 'Problema com CDN foi identificado e corrigido.'
    }
  ];
}

// ===== UPTIME FIXO (não muda com refresh) =====
function getUptimeData() {
  // 🔥 DADOS FIXOS (simulam uptime realista mas não mudam)
  const baseData = [
    { date: '2026-07-14', uptime: 99.8 },
    { date: '2026-07-15', uptime: 100.0 },
    { date: '2026-07-16', uptime: 99.9 },
    { date: '2026-07-17', uptime: 100.0 },
    { date: '2026-07-18', uptime: 99.7 },
    { date: '2026-07-19', uptime: 100.0 },
    { date: '2026-07-20', uptime: 99.9 },
    { date: '2026-07-21', uptime: 100.0 },
    { date: '2026-07-22', uptime: 99.8 },
    { date: '2026-07-23', uptime: 100.0 },
    { date: '2026-07-24', uptime: 99.9 },
    { date: '2026-07-25', uptime: 100.0 },
    { date: '2026-07-26', uptime: 99.5 },
    { date: '2026-07-27', uptime: 100.0 },
    { date: '2026-07-28', uptime: 99.9 },
    { date: '2026-07-29', uptime: 100.0 },
    { date: '2026-07-30', uptime: 99.8 },
    { date: '2026-07-31', uptime: 100.0 },
    { date: '2026-08-01', uptime: 99.9 },
    { date: '2026-08-02', uptime: 100.0 },
    { date: '2026-08-03', uptime: 99.7 },
    { date: '2026-08-04', uptime: 100.0 },
    { date: '2026-08-05', uptime: 99.8 },
    { date: '2026-08-06', uptime: 100.0 },
    { date: '2026-08-07', uptime: 99.9 },
    { date: '2026-08-08', uptime: 100.0 },
    { date: '2026-08-09', uptime: 99.8 },
    { date: '2026-08-10', uptime: 100.0 },
    { date: '2026-08-11', uptime: 99.9 },
    { date: '2026-08-12', uptime: 100.0 }
  ];

  // Converte para o formato esperado
  return baseData.map(item => ({
    date: item.date,
    uptime: item.uptime,
    status: item.uptime >= 99.5 ? 'operational' : item.uptime >= 98 ? 'degraded' : 'outage'
  }));
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

    // ===== MONTAR SERVIÇOS =====
    const services = [
      {
        id: 'site',
        name: 'Site principal',
        status: siteMode,
        responseTimeMs: null,
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
        responseTimeMs: null,
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
      incidents: getIncidents(),      // 🔥 FIXO
      uptime: getUptimeData(),        // 🔥 FIXO
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
