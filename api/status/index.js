/**
 * Aurora Premium — Status API
 * Rota da Vercel: /api/status
 *
 * Variáveis opcionais:
 * STATUS_MODE=operational ou maintenance
 * STATUS_MESSAGE=Mensagem personalizada
 */

module.exports = function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return res.status(405).json({
        ok: false,
        error: 'Method not allowed'
      });
    }

    const mode = process.env.STATUS_MODE === 'maintenance'
      ? 'maintenance'
      : 'operational';

    const message = process.env.STATUS_MESSAGE || (
      mode === 'maintenance'
        ? 'A Aurora está temporariamente em manutenção.'
        : 'Todos os serviços estão funcionando normalmente.'
    );

    const payload = {
      ok: true,
      service: 'Aurora Premium',
      overall: mode,
      maintenance: mode === 'maintenance',
      message,
      updatedAt: new Date().toISOString(),
      services: [
        {
          name: 'Site principal',
          status: mode,
          responseTimeMs: null,
          checked: true,
          detail: mode === 'maintenance'
            ? 'Site em manutenção programada.'
            : 'Site disponível.'
        },
        {
          name: 'Central de suporte',
          status: mode,
          responseTimeMs: null,
          checked: true,
          detail: mode === 'maintenance'
            ? 'Atendimento temporariamente indisponível.'
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
      services: [
        {
          name: 'API de status',
          status: 'degraded',
          responseTimeMs: null,
          checked: false,
          detail: 'Resposta de segurança ativada.'
        }
      ]
    });
  }
};
