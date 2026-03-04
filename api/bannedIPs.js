// api/bannedIPs.js
let bannedIPs = [];

module.exports = {
    addBan(ip, motivo = 'Spam detectado') {
        if (!bannedIPs.some(item => item.ip === ip)) {
            bannedIPs.push({ 
                ip, 
                motivo, 
                data: new Date().toISOString() 
            });
            console.log(`✅ IP ${ip} banido com motivo: ${motivo}`);
            return true;
        }
        console.log(`⚠️ IP ${ip} já estava banido`);
        return false;
    },
    
    removeBan(ip) {
        const initialLength = bannedIPs.length;
        bannedIPs = bannedIPs.filter(item => item.ip !== ip);
        if (bannedIPs.length !== initialLength) {
            console.log(`✅ IP ${ip} desbanido`);
            return true;
        }
        console.log(`⚠️ IP ${ip} não encontrado`);
        return false;
    },
    
    isBanned(ip) {
        return bannedIPs.some(item => item.ip === ip);
    },
    
    getBanReason(ip) {
        const ban = bannedIPs.find(item => item.ip === ip);
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
