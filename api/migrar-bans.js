import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: "redis://default:m7YQMxZGiyDZTUAdd2pSEKlf1m8sKoJJ@redis-13445.c244.us-east-1-2.ec2.cloud.redislabs.com:13445"
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const authToken = req.headers.authorization;
  const ADMIN_TOKEN = 'sua_senha_aqui'; // A MESMA DO ban.js
  
  if (authToken !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // SEUS IPS ATUAIS (copie do banned-ips.json)
  const ipsParaMigrar = [
    "189.126.42.11",
    "177.37.251.156",
    "167.250.155.119",
    "138.118.187.25",
    "192.145.212.153",
    "177.32.34.207",
    "191.246.251.165",
    "177.26.253.73",
    "45.70.101.195",
    "177.91.134.145",
    "170.81.211.216",
    "170.231.141.183",
    "206.0.10.254",
    "170.80.70.169",
    "187.86.8.34",
    "104.28.162.132",
    "177.37.186.137",
    "45.182.243.87",
    "186.212.212.53",
    "167.250.60.229",
    "177.190.191.59",
    "190.8.23.180",
    "168.227.174.200",
    "170.83.16.119",
    "148.227.83.237",
    "45.185.155.22",
    "191.242.109.8",
    "177.190.210.197",
    "177.5.106.38",
    "186.212.212.53"
  ];

  try {
    // Salvar no Redis
    await redis.set('banned_ips', ipsParaMigrar);
    
    return res.status(200).json({ 
      success: true, 
      message: `${ipsParaMigrar.length} IPs migrados com sucesso`,
      ips: ipsParaMigrar 
    });
    
  } catch (error) {
    console.error('Erro na migração:', error);
    return res.status(500).json({ error: 'Erro ao migrar IPs' });
  }
}