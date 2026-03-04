// api/bannedIPs.js
let bannedIPs = [];

// Função para limpar IP
function cleanIP(ip) {
    return ip.replace(/\\/g, '').trim();
}

module.exports = {
    addBan(ip, motivo = 'Spam detectado') {
        const clean = cleanIP(ip);
        if (!bannedIPs.some(item => item.ip === clean)) {
            bannedIPs.push({ 
                ip: clean, 
                motivo, 
                data: new Date().toISOString() 
            });
            console.log(`✅ IP ${clean} banido com motivo: ${motivo}`);
            return true;
        }
        console.log(`⚠️ IP ${clean} já estava banido`);
        return false;
    },
    
    removeBan(ip) {
        const clean = cleanIP(ip);
        const initialLength = bannedIPs.length;
        bannedIPs = bannedIPs.filter(item => item.ip !== clean);
        if (bannedIPs.length !== initialLength) {
            console.log(`✅ IP ${clean} desbanido`);
            return true;
        }
        console.log(`⚠️ IP ${clean} não encontrado`);
        return false;
    },
    
    isBanned(ip) {
        const clean = cleanIP(ip);
        return bannedIPs.some(item => item.ip === clean);
    },
    
    getBanReason(ip) {
        const clean = cleanIP(ip);
        const ban = bannedIPs.find(item => item.ip === clean);
        return ban ? ban.motivo : null;
    },
    
    getBans() {
        return bannedIPs;
    },
    
    getTotalBans() {
        return bannedIPs.length;
    },
    
    // Função para debug
    listBans() {
        console.log('📋 Lista de IPs banidos:', bannedIPs);
        return bannedIPs;
    }
};
