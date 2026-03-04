// bannedIPs.js - Arquivo compartilhado para armazenar os IPs banidos
let bannedIPs = [];

module.exports = {
    // Adicionar IP banido
    addBan(ip, motivo = 'Spam detectado') {
        // Verificar se já existe
        if (!bannedIPs.some(item => item.ip === ip)) {
            bannedIPs.push({
                ip,
                motivo,
                data: new Date().toISOString()
            });
            return true;
        }
        return false;
    },

    // Remover IP banido
    removeBan(ip) {
        const initialLength = bannedIPs.length;
        bannedIPs = bannedIPs.filter(item => item.ip !== ip);
        return bannedIPs.length !== initialLength;
    },

    // Verificar se IP está banido
    isBanned(ip) {
        return bannedIPs.some(item => item.ip === ip);
    },

    // Listar todos os bans
    getBans() {
        return bannedIPs;
    },

    // Buscar motivo do ban
    getBanReason(ip) {
        const ban = bannedIPs.find(item => item.ip === ip);
        return ban ? ban.motivo : null;
    },

    // Limpar todos os bans (cuidado!)
    clearBans() {
        bannedIPs = [];
    },

    // Total de bans
    getTotalBans() {
        return bannedIPs.length;
    }
};