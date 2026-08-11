/**
 * Aurora Premium — Service Status API
 * Vercel route: /api/status
 *
 * Variáveis opcionais na Vercel:
 * STATUS_MODE=operational | maintenance
 * STATUS_MESSAGE=Mensagem exibida na página de status
 * STATUS_CHECK_SITE_URL=https://aurora-plum.vercel.app
 * STATUS_CHECK_SUPPORT_URL=https://aurora-plum.vercel.app/suporte.html
 * STATUS_CHECK_TIMEOUT_MS=4000
 */

const DEFAULT_TIMEOUT_MS = 4000;
const VALID_MODES = ['operational', 'maintenance'];

function safeText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function getMode() {
  const mode = safeText(process.env.STATUS_MODE, 'operational').toLowerCase();
  return VALID_MODES.includes(mode) ? mode : 'operational';
}

function getTimeout() {
  const value = Number(process.env.STATUS_CHECK_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1000), 10000) : DEFAULT_TIMEOUT_MS;
}

function getUrl(value) {
  const raw = safeText(value);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function classify(responseOk, responseTimeMs) {
  if (!responseOk) return 'degraded';
  return responseTimeMs >= 2500 ? 'degraded' : 'operational';
}

async function checkUrl(name, configuredUrl, timeoutMs) {
  const url = getUrl(configuredUrl);

  if (!configuredUrl) {
    return { name, status: 'operational', responseTimeMs: null, checked: false, detail: 'Monitoramento externo não configurado.' };
  }

  if (!url) {
    return { name, status: 'degraded', responseTimeMs: null, checked: false, detail: 'URL de monitoramento inválida.' };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (typeof fetch !== 'function') {
      return { name, status: 'degraded', responseTimeMs: null, checked: false, detail: 'Fetch não disponível no runtime.' };
    }

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'AuroraStatusMonitor/1.0' }
    });
    const responseTimeMs = Date.now() - startedAt;

    return {
      name,
      status: classify(response.ok, responseTimeMs),
      responseTimeMs,
      checked: true,
      httpStatus: response.status,
      detail: response.ok ? 'Serviço respondendo normalmente.' : `Resposta HTTP ${response.status}.`
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startedAt;
    const detail = error && error.name === 'AbortError' ? 'Tempo limite excedido.' : 'Não foi possível conectar ao serviço.';
    return { name, status: 'outage', responseTimeMs, checked: true, detail };
  } finally {
    clearTimeout(timeout);
  }
}

function overallStatus(mode, services) {
  if (mode === 'maintenance') return 'maintenance';
  if (services.some((service) => service.status === 'outage')) return 'outage';
  if (services.some((service) => service.status === 'degraded')) return 'degraded';
  return 'operational';
}

function sendJson(res, statusCode, payload) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(statusCode).json(payload);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      return sendJson(res, 204, {});
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD, OPTIONS');
      return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const mode = getMode();
    const timeoutMs = getTimeout();
    const services = await Promise.all([
      checkUrl('Site principal', process.env.STATUS_CHECK_SITE_URL, timeoutMs),
      checkUrl('Central de suporte', process.env.STATUS_CHECK_SUPPORT_URL, timeoutMs),
      Promise.resolve({ name: 'API de status', status: 'operational', responseTimeMs: null, checked: true, detail: 'Endpoint respondendo normalmente.' })
    ]);

    const overall = overallStatus(mode, services);
    const payload = {
      ok: overall !== 'outage',
      service: 'Aurora Premium',
      overall,
      maintenance: mode === 'maintenance',
      message: safeText(process.env.STATUS_MESSAGE) || (mode === 'maintenance' ? 'A Aurora está temporariamente em manutenção.' : 'Todos os serviços estão sendo monitorados.'),
      updatedAt: new Date().toISOString(),
      responseTimeThresholds: { operationalBelowMs: 2500, timeoutMs },
      services
    };

    return sendJson(res, overall === 'outage' ? 503 : 200, payload);
  } catch (error) {
    console.error('Aurora status API error:', error);
    return sendJson(res, 200, {
      ok: false,
      service: 'Aurora Premium',
      overall: 'degraded',
      maintenance: false,
      message: 'A API de status está temporariamente instável.',
      updatedAt: new Date().toISOString(),
      services: [{ name: 'API de status', status: 'degraded', responseTimeMs: null, checked: false, detail: 'Erro interno tratado pela função.' }]
    });
  }
};
