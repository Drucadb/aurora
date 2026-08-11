/**
 * Aurora Premium — Service Status API
 * Vercel route: /api/status
 *
 * Optional environment variables:
 * STATUS_MODE=operational | maintenance
 * STATUS_MESSAGE=Mensagem exibida durante a manutenção
 * STATUS_CHECK_SITE_URL=https://aurora-plum.vercel.app/
 * STATUS_CHECK_SUPPORT_URL=https://aurora-plum.vercel.app/suporte.html
 * STATUS_CHECK_TIMEOUT_MS=4000
 */

const DEFAULT_TIMEOUT_MS = 4000;
const VALID_MODES = new Set(['operational', 'maintenance']);

function getMode() {
  const configuredMode = String(process.env.STATUS_MODE || 'operational').toLowerCase();
  return VALID_MODES.has(configuredMode) ? configuredMode : 'operational';
}

function getTimeout() {
  const parsed = Number(process.env.STATUS_CHECK_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(parsed, 1000), 10000);
}

function classifyResponse(response, responseTime) {
  if (!response.ok) return 'degraded';
  if (responseTime >= 2500) return 'degraded';
  return 'operational';
}

async function checkUrl(name, url, timeoutMs) {
  if (!url) {
    return {
      name,
      status: 'operational',
      responseTimeMs: null,
      checked: false,
      detail: 'Monitoramento externo não configurado.'
    };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'AuroraStatusMonitor/1.0' }
    });
    const responseTimeMs = Date.now() - startedAt;

    return {
      name,
      status: classifyResponse(response, responseTimeMs),
      responseTimeMs,
      checked: true,
      httpStatus: response.status,
      detail: response.ok ? 'Serviço respondendo normalmente.' : `Resposta HTTP ${response.status}.`
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startedAt;
    const timedOut = error && error.name === 'AbortError';

    return {
      name,
      status: 'outage',
      responseTimeMs,
      checked: true,
      detail: timedOut ? 'Tempo limite excedido.' : 'Não foi possível conectar ao serviço.'
    };
  } finally {
    clearTimeout(timeout);
  }
}

function calculateOverall(mode, services) {
  if (mode === 'maintenance') return 'maintenance';
  if (services.some((service) => service.status === 'outage')) return 'outage';
  if (services.some((service) => service.status === 'degraded')) return 'degraded';
  return 'operational';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
      message: 'Use GET para consultar o status dos serviços.'
    });
  }

  const mode = getMode();
  const timeoutMs = getTimeout();
  const services = await Promise.all([
    checkUrl('Site principal', process.env.STATUS_CHECK_SITE_URL, timeoutMs),
    checkUrl('Central de suporte', process.env.STATUS_CHECK_SUPPORT_URL, timeoutMs),
    Promise.resolve({
      name: 'API de status',
      status: 'operational',
      responseTimeMs: null,
      checked: true,
      detail: 'Endpoint respondendo normalmente.'
    })
  ]);

  const overall = calculateOverall(mode, services);
  const payload = {
    ok: overall !== 'outage',
    service: 'Aurora Premium',
    overall,
    maintenance: mode === 'maintenance',
    message: process.env.STATUS_MESSAGE || (
      mode === 'maintenance'
        ? 'A Aurora está temporariamente em manutenção.'
        : 'Todos os serviços estão sendo monitorados.'
    ),
    updatedAt: new Date().toISOString(),
    responseTimeThresholds: {
      operationalBelowMs: 2500,
      timeoutMs
    },
    services
  };

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  return res.status(overall === 'outage' ? 503 : 200).json(payload);
};
