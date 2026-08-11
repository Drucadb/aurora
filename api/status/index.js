/**
 * Aurora Premium — Status API
 * Rota da Vercel: /api/status
 *
 * Variáveis na Vercel:
 * STATUS_MODE=operational ou maintenance       (site inteiro)
 * STATUS_SITE_MODE=operational ou maintenance  (opcional, substitui STATUS_MODE para o site)
 * STATUS_SUPPORT_MODE=operational ou maintenance
 * STATUS_MESSAGE=Mensagem geral opcional
 * STATUS_SUPPORT_MESSAGE=Mensagem do suporte opcional
 */

function readMode(value, fallback = 'operational') {
  return value === 'maintenance' || value === 'operational' ? value : fallback;
}

export default function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const siteMode = readMode(process.env.STATUS_SITE_MODE, readMode(process.env.STATUS_MODE));
    const supportMode = readMode(process.env.STATUS_SUPPORT_MODE, 'operational');
    const siteInMaintenance = siteMode === 'maintenance';
    const supportInMaintenance = supportMode === 'maintenance';
    const overall = siteInMaintenance ? 'maintenance' : supportInMaintenance ? 'degraded' : 'operational';

    const payload = {
      ok: true,
      service: 'Aurora Premium',
      overall,
      maintenance: siteInMaintenance,
      message: process.env.STATUS_MESSAGE || (
        siteInMaintenance
          ? 'A Aurora está temporariamente em manutenção.'
          : supportInMaintenance
            ? 'A Central de suporte está temporariamente em manutenção.'
            : 'Todos os serviços estão funcionando normalmente.'
      ),
      updatedAt: new Date().toISOString(),
      services: [
        {
          name: 'Site principal',
          status: siteMode,
          responseTimeMs: null,
          checked: true,
          detail: siteInMaintenance ? 'Site em manutenção programada.' : 'Site disponível.'
        },
        {
          name: 'Central de suporte',
          status: supportMode,
          responseTimeMs: null,
          checked: true,
          detail: supportInMaintenance
            ? (process.env.STATUS_SUPPORT_MESSAGE || 'Atendimento temporariamente indisponível.')
            : 'Central disponível.'
        },
        {
          name: 'API de status',
          status: 'operational',
          responseTimeMs: null,
          checked: true,
          detail: 'Endpoint respondendo normalmente.'
        }
      ]
    };

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
      services: [{ name: 'API de status', status: 'degraded', responseTimeMs: null, checked: false, detail: 'Resposta de segurança ativada.' }]
    });
  }
}
