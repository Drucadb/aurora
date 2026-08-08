// ============================================================
// API DE BANIMENTO COM UPSTASH REDIS (Vercel KV)
// ============================================================

import { Redis } from '@upstash/redis';

// ============================================================
// CONECTAR AO REDIS
// ============================================================

const redis = Redis.fromEnv();

// ============================================================
// CONSTANTES
// ============================================================

const DEFAULT_GIF = 'https://media.tenor.com/2BpR9fW5HWQAAAAC/roblox-ban.gif';

const CONFIG = {
    maxBansPerIP: 3,
    autoUnbanAfter: 24, // horas
    rateLimit: {
        maxRequests: 10,
        windowMs: 60000
    }
};

// ============================================================
// RATE LIMIT (em memória)
// ============================================================

const rateLimitStore = new Map();

function checkRateLimit(ip) {
    const now = Date.now();
    const key = `rate_${ip}`;
    
    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, { count: 1, firstRequest: now });
        return true;
    }
    
    const data = rateLimitStore.get(key);
    
    if (now - data.firstRequest > CONFIG.rateLimit.windowMs) {
        rateLimitStore.set(key, { count: 1, firstRequest: now });
        return true;
    }
    
    data.count++;
    
    if (data.count > CONFIG.rateLimit.maxRequests) {
        return false;
    }
    
    return true;
}

// ============================================================
// FUNÇÕES DE ACESSO AO REDIS
// ============================================================

async function getBannedIPs() {
    try {
        const data = await redis.get('banned_ips');
        
        if (!data) {
            const defaultData = { 
                banned: [], 
                history: [], 
                metadata: { 
                    totalBans: 0, 
                    activeBans: 0, 
                    expiredBans: 0, 
                    permanentBans: 0 
                } 
            };
            await redis.set('banned_ips', JSON.stringify(defaultData));
            return defaultData;
        }
        
        return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
        console.error('❌ Erro no Redis, usando memória:', error);
        return {
            banned: [],
            history: [],
            metadata: { totalBans: 0, activeBans: 0, expiredBans: 0, permanentBans: 0 }
        };
    }
}

async function saveBannedIPs(data) {
    try {
        await redis.set('banned_ips', JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar no Redis:', error);
        return false;
    }
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function isValidIP(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
}

function isValidGifUrl(url) {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function getBanDuration(expires) {
    if (!expires) return 'Permanente';
    const diff = new Date(expires) - new Date();
    if (diff <= 0) return 'Expirado';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function generateBanId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function isBanExpired(ban) {
    if (!ban.expires) return false;
    return new Date(ban.expires) <= new Date();
}

function cleanExpiredBans(data) {
    data.banned = data.banned.filter(ban => !isBanExpired(ban));
    return data;
}

function getBanSeverity(reason) {
    const severe = ['hack', 'attack', 'ddos', 'abuse', 'spam', 'fraud', 'scam', 'malware'];
    const moderate = ['misuse', 'policy', 'violation', 'warning'];
    
    const lower = reason?.toLowerCase() || '';
    
    if (severe.some(k => lower.includes(k))) return 'high';
    if (moderate.some(k => lower.includes(k))) return 'medium';
    return 'low';
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export default async function handler(req, res) {
    // ===== CORS =====
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ===== RATE LIMIT =====
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 
                     req.socket.remoteAddress || 
                     'unknown';
    
    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({
            success: false,
            error: 'Muitas requisições. Tente novamente mais tarde.',
            retryAfter: Math.ceil(CONFIG.rateLimit.windowMs / 1000)
        });
    }

    // ===== CARREGAR DADOS =====
    let data = await getBannedIPs();
    data = cleanExpiredBans(data);

    const { method } = req;

    // ============================================================
    // GET
    // ============================================================
    if (method === 'GET') {
        // === Verificar IP ===
        if (req.query.check) {
            const ip = req.query.check;
            
            if (!isValidIP(ip)) {
                return res.status(400).json({ 
                    success: false,
                    error: 'IP inválido' 
                });
            }

            const banned = data.banned.find(b => b.ip === ip);
            
            if (banned) {
                if (isBanExpired(banned)) {
                    data.banned = data.banned.filter(b => b.ip !== ip);
                    await saveBannedIPs(data);
                    return res.status(200).json({ 
                        banned: false,
                        message: 'Ban expirado e removido'
                    });
                }

                return res.status(200).json({
                    success: true,
                    banned: true,
                    ban: {
                        id: banned.id,
                        reason: banned.reason,
                        gif: banned.gif || DEFAULT_GIF,
                        expires: banned.expires,
                        date: banned.date,
                        severity: banned.severity || getBanSeverity(banned.reason),
                        duration: getBanDuration(banned.expires)
                    }
                });
            }
            
            return res.status(200).json({ 
                success: true,
                banned: false
            });
        }

        // === Estatísticas ===
        if (req.query.stats === 'true') {
            const active = data.banned.filter(b => !isBanExpired(b));
            const expired = data.banned.filter(b => isBanExpired(b));
            const permanent = data.banned.filter(b => !b.expires);
            
            return res.status(200).json({
                success: true,
                stats: {
                    total: data.banned.length,
                    active: active.length,
                    expired: expired.length,
                    permanent: permanent.length,
                    lastUpdated: new Date().toISOString()
                }
            });
        }

        // === Listar bans ===
        if (req.query.list === 'all' || !req.query.list) {
            return res.status(200).json({
                success: true,
                total: data.banned.length,
                banned: data.banned.map(b => ({
                    ...b,
                    duration: getBanDuration(b.expires),
                    expired: isBanExpired(b)
                }))
            });
        }

        // === Listar ativos ===
        if (req.query.list === 'active') {
            const active = data.banned.filter(b => !isBanExpired(b));
            return res.status(200).json({
                success: true,
                total: active.length,
                banned: active
            });
        }

        // === Buscar ===
        if (req.query.search) {
            const search = req.query.search.toLowerCase();
            const results = data.banned.filter(b => 
                b.reason?.toLowerCase().includes(search) ||
                b.ip.includes(search)
            );
            return res.status(200).json({
                success: true,
                total: results.length,
                banned: results
            });
        }

        return res.status(200).json({
            success: true,
            total: data.banned.length,
            banned: data.banned
        });
    }

    // ============================================================
    // POST - Adicionar ban
    // ============================================================
    if (method === 'POST') {
        const { ip, reason, expires, gif } = req.body;

        if (!ip || !isValidIP(ip)) {
            return res.status(400).json({ 
                success: false,
                error: 'IP inválido ou não informado' 
            });
        }

        if (gif && !isValidGifUrl(gif)) {
            return res.status(400).json({
                success: false,
                error: 'URL do GIF inválida'
            });
        }

        // Verificar se já está banido
        const existing = data.banned.find(b => b.ip === ip);
        if (existing && !isBanExpired(existing)) {
            return res.status(400).json({ 
                success: false,
                error: 'IP já está banido',
                ban: existing
            });
        }

        // Verificar bans consecutivos
        const previousBans = data.banned.filter(b => b.ip === ip).length;
        if (previousBans >= CONFIG.maxBansPerIP) {
            const permanentBan = {
                id: generateBanId(),
                ip,
                reason: `${reason || 'Múltiplos bans'} (ban permanente automático)`,
                gif: gif || DEFAULT_GIF,
                date: new Date().toISOString(),
                expires: null,
                severity: 'high',
                autoBan: true
            };
            
            data.banned.push(permanentBan);
            await saveBannedIPs(data);
            
            return res.status(201).json({
                success: true,
                message: 'Ban permanente aplicado (múltiplos bans consecutivos)',
                ban: permanentBan
            });
        }

        // Criar ban
        const expiresDate = expires || new Date(Date.now() + (CONFIG.autoUnbanAfter * 60 * 60 * 1000)).toISOString();

        const newBan = {
            id: generateBanId(),
            ip,
            reason: reason || 'Uso indevido do sistema',
            gif: gif || DEFAULT_GIF,
            date: new Date().toISOString(),
            expires: expiresDate,
            severity: getBanSeverity(reason),
            banCount: previousBans + 1
        };

        data.banned.push(newBan);
        
        // Adicionar ao histórico
        data.history = data.history || [];
        data.history.push({
            type: 'ban',
            ip: ip,
            banId: newBan.id,
            reason: newBan.reason,
            timestamp: new Date().toISOString()
        });

        await saveBannedIPs(data);

        return res.status(201).json({
            success: true,
            message: 'IP banido com sucesso',
            ban: {
                ...newBan,
                duration: getBanDuration(newBan.expires)
            }
        });
    }

    // ============================================================
    // DELETE - Remover ban
    // ============================================================
    if (method === 'DELETE') {
        const { ip } = req.body || req.query;

        if (!ip || !isValidIP(ip)) {
            return res.status(400).json({ 
                success: false,
                error: 'IP inválido ou não informado' 
            });
        }

        const index = data.banned.findIndex(b => b.ip === ip);

        if (index === -1) {
            return res.status(404).json({ 
                success: false,
                error: 'IP não encontrado' 
            });
        }

        const removed = data.banned[index];
        data.banned.splice(index, 1);
        
        // Adicionar ao histórico
        data.history = data.history || [];
        data.history.push({
            type: 'unban',
            ip: ip,
            banId: removed.id,
            reason: removed.reason,
            timestamp: new Date().toISOString()
        });
        
        await saveBannedIPs(data);

        return res.status(200).json({
            success: true,
            message: 'Ban removido com sucesso',
            removed
        });
    }

    // ============================================================
    // PUT - Atualizar ban
    // ============================================================
    if (method === 'PUT') {
        const { ip, reason, expires, gif } = req.body;

        if (!ip || !isValidIP(ip)) {
            return res.status(400).json({ 
                success: false,
                error: 'IP inválido ou não informado' 
            });
        }

        const index = data.banned.findIndex(b => b.ip === ip);

        if (index === -1) {
            return res.status(404).json({ 
                success: false,
                error: 'IP não encontrado' 
            });
        }

        if (reason) data.banned[index].reason = reason;
        if (expires !== undefined) data.banned[index].expires = expires;
        if (gif && isValidGifUrl(gif)) data.banned[index].gif = gif;
        
        data.banned[index].updatedAt = new Date().toISOString();
        await saveBannedIPs(data);

        return res.status(200).json({
            success: true,
            message: 'Ban atualizado com sucesso',
            ban: data.banned[index]
        });
    }

    // ============================================================
    // Método não permitido
    // ============================================================
    return res.status(405).json({ 
        success: false,
        error: 'Método não permitido' 
    });
}