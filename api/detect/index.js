import net from 'node:net';

const CACHE_TTL_MS = 10 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 30;
const cache = new Map();
const rateLimit = new Map();

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Private-Browser');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const ip = getClientIp(req);

  if (!ip) {
    return res.status(400).json({
      success: false,
      error: 'Não foi possível identificar um IP válido.'
    });
  }

  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      error: 'Muitas requisições. Tente novamente em instantes.'
    });
  }

  const isPrivate = detectPrivateBrowsing(req);
  const vpnInfo = await detectVPN(ip);
  const blocked = isPrivate || vpnInfo.isVPN;

  return res.status(200).json({
    success: true,
    data: {
      ip,
      isPrivate,
      vpn: vpnInfo,
      blocked,
      message: blocked ? '🚫 Acesso bloqueado!' : '✅ Acesso permitido!',
      timestamp: new Date().toISOString()
    }
  });
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const candidates = [
    typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '',
    typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'].trim() : '',
    req.socket?.remoteAddress || ''
  ];

  for (const candidate of candidates) {
    const normalized = normalizeIp(candidate);
    if (normalized && net.isIP(normalized)) return normalized;
  }

  return null;
}

function normalizeIp(value) {
  if (!value) return '';
  let ip = String(value).trim();

  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1') return '127.0.0.1';

  return ip;
}

// ===== MELHORADO: DETECÇÃO DE NAVEGADOR ANÔNIMO =====
function detectPrivateBrowsing(req) {
  const headers = req.headers || {};
  const ua = headers['user-agent'] || '';

  // Headers específicos (enviados pelo frontend)
  if (headers['x-private-browser'] === 'true' ||
      headers['x-chrome-incognito'] === 'true' ||
      headers['x-incognito'] === 'true') {
    return true;
  }

  // Verificar User-Agent suspeito
  const privateKeywords = ['incognito', 'private', 'anonymous', 'tor', 'brave'];
  const uaLower = ua.toLowerCase();
  for (const keyword of privateKeywords) {
    if (uaLower.includes(keyword)) return true;
  }

  return false;
}

// ===== MELHORADO: LISTA DE PROVEDORES =====
async function detectVPN(ip) {
  const cached = cache.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) cache.delete(ip);

  const providers = [
    // VPNs conhecidas
    'nordvpn', 'expressvpn', 'surfshark', 'cyberghost',
    'private internet access', 'windscribe', 'protonvpn',
    'tunnelbear', 'hotspot shield', 'vyprvpn', 'ipvanish',
    'purevpn', 'zenmate', 'hidemyass', 'mullvad', 'ivpn',
    'azirevpn', 'ovpn', 'airvpn', 'perfect privacy', 'proxy.sh',
    // Provedores de nuvem (datacenters)
    'digitalocean', 'amazon', 'aws', 'azure', 'google cloud', 'gcp',
    'linode', 'vultr', 'hetzner', 'ovh', 'scaleway', 'oracle cloud',
    'cloudflare', 'fastly', 'akamai', 'edgecast', 'cloudfront',
    'heroku', 'netlify', 'vercel', 'fly.io', 'railway',
    'aws', 'ec2', 's3', 'lambda', 'rds',
    // Provedores de proxy
    'proxy', 'vpn', 'datacenter', 'hosting', 'cloud',
    'socks', 'http proxy', 'residential proxy'
  ];

  // 🔥 NOVA: Tenta ip-api.com primeiro (mais confiável e rápido)
  const result = await fromIpApi(ip, providers)
    || await fromIpApiCo(ip, providers)
    || await fromIpInfo(ip, providers)
    || unavailableResult();

  cache.set(ip, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });

  if (cache.size > 1000) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }

  return result;
}

// ===== NOVA: ip-api.com (mais confiável) =====
async function fromIpApi(ip, providers) {
  try {
    const data = await fetchJson(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,isp,org,proxy,hosting,as`, 4000);
    if (!data || data.status !== 'success') return null;

    const text = `${data.isp || ''} ${data.org || ''} ${data.as || ''}`.toLowerCase();
    const isProxy = data.proxy === true;
    const isHosting = data.hosting === true;
    const isVPNProvider = providers.some((provider) => text.includes(provider));
    const isDatacenter = isHosting || isVPNProvider;

    return makeResult({
      isVPN: isProxy || isDatacenter,
      country: data.country,
      region: data.regionName,
      city: data.city,
      isp: data.isp,
      org: data.org,
      isProxy,
      isDatacenter,
      isVPNProvider,
      provider: data.isp
    });
  } catch (error) {
    console.error('Erro no ip-api.com:', error.message);
    return null;
  }
}

async function fromIpApiCo(ip, providers) {
  try {
    const data = await fetchJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, 4000);
    if (!data || data.error) return null;

    const text = `${data.org || ''} ${data.asn || ''}`.toLowerCase();
    const isProxy = data.proxy === true;
    const isHosting = data.hosting === true;
    const isVPNProvider = providers.some((provider) => text.includes(provider));
    const isDatacenter = isHosting || isVPNProvider;

    return makeResult({
      isVPN: isProxy || isDatacenter,
      country: data.country_name,
      region: data.region,
      city: data.city,
      isp: data.org,
      org: data.org,
      isProxy,
      isDatacenter,
      isVPNProvider,
      provider: data.org
    });
  } catch (error) {
    console.error('Erro no ipapi.co:', error.message);
    return null;
  }
}

async function fromIpInfo(ip, providers) {
  try {
    const data = await fetchJson(`https://ipinfo.io/${encodeURIComponent(ip)}/json`, 4000);
    if (!data || data.error) return null;

    const text = `${data.org || ''} ${data.hostname || ''}`.toLowerCase();
    const isVPNProvider = providers.some((provider) => text.includes(provider));
    const isDatacenter = isVPNProvider;

    return makeResult({
      isVPN: isDatacenter,
      country: data.country,
      region: data.region,
      city: data.city,
      isp: data.org,
      org: data.org,
      isProxy: false,
      isDatacenter,
      isVPNProvider,
      provider: data.org
    });
  } catch (error) {
    console.error('Erro no ipinfo.io:', error.message);
    return null;
  }
}

function makeResult(values) {
  return {
    isVPN: Boolean(values.isVPN),
    details: {
      country: values.country || 'Desconhecido',
      region: values.region || 'Desconhecido',
      city: values.city || 'Desconhecido',
      isp: values.isp || 'Desconhecido',
      org: values.org || 'Desconhecido',
      isProxy: Boolean(values.isProxy),
      isDatacenter: Boolean(values.isDatacenter),
      isVPNProvider: Boolean(values.isVPNProvider),
      provider: values.provider || 'Desconhecido'
    }
  };
}

function unavailableResult() {
  return {
    isVPN: false,
    details: {
      country: 'Desconhecido',
      region: 'Desconhecido',
      city: 'Desconhecido',
      isp: 'Desconhecido',
      org: 'Desconhecido',
      isProxy: false,
      isDatacenter: false,
      isVPNProvider: false,
      provider: 'Desconhecido'
    },
    error: 'Não foi possível verificar VPN'
  };
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Aurora-Security/2.0' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function checkRateLimit(ip) {
  const now = Date.now();
  const current = rateLimit.get(ip);

  if (!current || current.resetAt <= now) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (current.count >= RATE_LIMIT) return false;
  current.count += 1;
  return true;
}
