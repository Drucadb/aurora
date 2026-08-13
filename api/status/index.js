/**
 * Aurora Premium — Status API com Webhook do Discord
 * Rota da Vercel: /api/status
 *
 * Variáveis na Vercel:
 * STATUS_MODE=operational ou maintenance       (site inteiro)
 * STATUS_SITE_MODE=operational ou maintenance  (opcional, substitui STATUS_MODE para o site)
 * STATUS_SUPPORT_MODE=operational ou maintenance
 * STATUS_MESSAGE=Mensagem geral opcional
 * STATUS_SUPPORT_MESSAGE=Mensagem do suporte opcional
 * DISCORD_WEBHOOK_URL=URL do webhook do Discord
 * DISCORD_WEBHOOK_ENABLED=true|false
 */

function readMode(value, fallback = 'operational') {
  return value === 'maintenance' || value === 'operational' ? value : fallback;
}

// ============================================================
//  WEBHOOK DO DISCORD
// ============================================================

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1537268125496512583/8JPcsQ2ghVN5x5nGyMgSIlbYCYkRJAzKb36OyHCatfL8QA50fMQ2wvI6bC3jP_IInhq1';
const WEBHOOK_ENABLED = process.env.DISCORD_WEBHOOK_ENABLED !== 'false';

// Guarda o status anterior para não enviar notificações repetidas
let previousStatus = 'operational';

async function sendDiscordNotification(title, description, color) {
  if (!WEBHOOK_ENABLED) return false;
  
  try {
    const payload = {
      embeds: [{
        title: title,
        description: description,
        color: color,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Aurora Premium • Status Monitor'
        }
      }]
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('❌ Erro ao enviar webhook:', error);
    return false;
  }
}

// ============================================================
//  HANDLER PRINCIPAL
// ============================================================

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const siteMode = readMode(process.env.STATUS_SITE_MODE, readMode(process.env.STATUS_MODE));
    const supportMode = readMode(process.env.STATUS_SUPPORT_MODE, 'operational');
    const siteInMaintenance = siteMode === 'maintenance';
    const supportInMaintenance = supportMode === 'maintenance';
    const overall = siteInMaintenance ? 'maintenance' : supportInMaintenance ? 'degraded' : 'operational';

    // ===== VERIFICA SE HOUVE MUDANÇA DE STATUS =====
    if (WEBHOOK_ENABLED && overall !== previousStatus) {
      let title = '';
      let description = '';
      let color = 0x5865F2;

      if (overall === 'maintenance') {
        title = '🔧 Aurora em Manutenção!';
        description = 'A Aurora Premium entrou em modo de manutenção. Em breve voltaremos!';
        color = 0x5865F2; // Roxo
      } else if (overall === 'operational' && previousStatus === 'maintenance') {
        title = '✅ Serviços Restaurados!';
        description = 'A Aurora Premium voltou a funcionar normalmente. Todos os serviços estão online!';
        color = 0x57F287; // Verde
      }

      if (title) {
        await sendDiscordNotification(title, description, color);
      }

      previousStatus = overall;
    }

    // ===== MONTAR PAYLOAD (MANTIDO IGUAL AO SEU) =====
    const payload = {
      ok: true,
      service: 'Aurora Premium',
      overall,
      maintenance: siteInMaintenance,
      message: process.env.STATUS_MESSAGE || (
        siteInMaintenance
          ? 'A Aurora está temporariamente em manutenção.'
          : supportInMaintenance
            ? 'A Central de suporte está temporariamente em manutenção.'
            : 'Todos os serviços estão funcionando normalmente.'
      ),
      updatedAt: new Date().toISOString(),
      services: [
        {
          name: 'Site principal',
          status: siteMode,
          responseTimeMs: null,
          checked: true,
          detail: siteInMaintenance ? 'Site em manutenção programada.' : 'Site disponível.'
        },
        {
          name: 'Central de suporte',
          status: supportMode,
          responseTimeMs: null,
          checked: true,
          detail: supportInMaintenance
            ? (process.env.STATUS_SUPPORT_MESSAGE || 'Atendimento temporariamente indisponível.')
            : 'Central disponível.'
        },
        {
          name: 'API de status',
          status: 'operational',
          responseTimeMs: null,
          checked: true,
          detail: 'Endpoint respondendo normalmente.'
        }
      ]
    };

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json(payload);

  } catch (error) {
    console.error('Status API error:', error);
    return res.status(200).json({
      ok: false,
      service: 'Aurora Premium',
      overall: 'degraded',
      maintenance: false,
      message: 'A API está respondendo com limitações.',
      updatedAt: new Date().toISOString(),
      services: [{ name: 'API de status', status: 'degraded', responseTimeMs: null, checked: false, detail: 'Resposta de segurança ativada.' }]
    });
  }
}
