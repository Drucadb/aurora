# 🔐 Guia de Segurança - Aurora

## ⚠️ Avisos Críticos

### 1. NUNCA Commitar Credenciais

```bash
# ❌ NUNCA faça isso
git add .env
git commit -m "Add credentials"

# ✅ CORRETO - Use .gitignore
echo ".env" >> .gitignore
git add .gitignore
```

### 2. NUNCA Compartilhar Tokens

- Não compartilhe `ADMIN_TOKEN` em chats, emails ou repositórios públicos
- Se um token foi exposto, regenere imediatamente
- Use tokens diferentes para cada ambiente (dev, staging, prod)

### 3. NUNCA Usar Webhooks Públicos

- Webhooks Discord são URLs públicas
- Qualquer pessoa com a URL pode enviar mensagens
- Considere usar um bot Discord privado em vez de webhooks

## 🛡️ Checklist de Segurança

Antes de fazer deploy em produção:

- [ ] Arquivo `.env` está em `.gitignore`
- [ ] `DISCORD_WEBHOOK_URL` está configurada em variáveis de ambiente
- [ ] `ADMIN_TOKEN` é uma string aleatória com 32+ caracteres
- [ ] `ALLOWED_ORIGINS` está restrito aos seus domínios
- [ ] Testou validação de input com dados malformados
- [ ] Verificou headers de segurança (CORS, X-Frame-Options)
- [ ] Rotou credenciais antigas
- [ ] Habilitou HTTPS em produção
- [ ] Configurou rate limiting no servidor
- [ ] Fez backup do `banned-ips.json`

## 🔍 Vulnerabilidades Conhecidas Corrigidas

### v1.0 (Inseguro)
- ❌ Webhook exposto no código JavaScript
- ❌ Token admin hardcoded como "pornhub"
- ❌ Sem validação de input
- ❌ CORS aberto para qualquer origem
- ❌ Sem sanitização XSS
- ❌ Sem headers de segurança

### v2.0 (Seguro) ✅
- ✅ Webhook em variáveis de ambiente
- ✅ Token admin aleatório e seguro
- ✅ Validação rigorosa de input
- ✅ CORS restritivo
- ✅ Sanitização XSS implementada
- ✅ Headers de segurança adicionados
- ✅ Autenticação de API melhorada

## 🔑 Gerenciamento de Tokens

### Gerar Novo Token

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString())) | Select-Object -First 32

# Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Rotacionar Token

1. Gere um novo token
2. Configure em variáveis de ambiente
3. Aguarde 24h para garantir que clientes antigos se desconectaram
4. Remova o token antigo

## 🚨 Resposta a Incidentes

### Se um Token foi Exposto

1. **Imediato**: Regenere o token
2. **Dentro de 1 hora**: Atualize em produção
3. **Dentro de 24h**: Revise logs de acesso
4. **Dentro de 48h**: Notifique usuários afetados

### Se um Webhook foi Comprometido

1. **Imediato**: Desabilite o webhook no Discord
2. **Dentro de 1 hora**: Crie um novo webhook
3. **Dentro de 24h**: Revise mensagens suspeitas
4. **Dentro de 48h**: Atualize em produção

## 📊 Monitoramento

### Logs para Monitorar

```javascript
// Verifique estes eventos em seus logs
console.error('Erro ao validar cookie'); // Tentativa de submissão inválida
console.error('IP banido'); // Tentativa de IP banido
console.error('Erro de autenticação'); // Tentativa de acesso não autorizado
```

### Alertas Recomendados

- Múltiplas submissões do mesmo IP em 1 hora
- Múltiplas tentativas de API com token inválido
- Webhooks não entregues por mais de 1 hora
- Taxa de erro > 5% em 10 minutos

## 🔐 Boas Práticas

### 1. Usar HTTPS em Produção

```javascript
// ✅ CORRETO
const url = 'https://api.aurora.example.com/webhook';

// ❌ ERRADO
const url = 'http://api.aurora.example.com/webhook';
```

### 2. Validar Sempre

```javascript
// ✅ CORRETO
if (!validateCookie(cookie)) {
  return { valid: false, error: 'Cookie inválido' };
}

// ❌ ERRADO
fetch('/api/webhook', { body: JSON.stringify({ cookie }) });
```

### 3. Usar Secrets Manager

```bash
# ✅ CORRETO - Vercel Secrets
vercel env add DISCORD_WEBHOOK_URL
vercel env add ADMIN_TOKEN

# ❌ ERRADO - Arquivo .env commitado
git add .env
```

### 4. Implementar Rate Limiting

```javascript
// ✅ CORRETO
const cooldown = 19 * 24 * 60 * 60 * 1000; // 19 dias
if (lastSubmission && Date.now() - lastSubmission < cooldown) {
  return { error: 'Aguarde antes de tentar novamente' };
}

// ❌ ERRADO
// Sem limite de tentativas
```

### 5. Logs Seguros

```javascript
// ✅ CORRETO - Não log de dados sensíveis
console.log('Cookie recebido de IP:', ip);

// ❌ ERRADO - Log de dados sensíveis
console.log('Cookie:', cookie);
console.log('Token:', token);
```

## 📚 Recursos Adicionais

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Vercel Security](https://vercel.com/docs/concepts/security)
- [Discord Webhook Security](https://discord.com/developers/docs/resources/webhook)

## 📞 Reportar Vulnerabilidades

Se encontrar uma vulnerabilidade de segurança:

1. **NÃO** abra uma issue pública
2. Envie um email para: `security@aurora.example.com`
3. Inclua: descrição, passos para reproduzir, impacto
4. Aguarde resposta em até 48h

---

**Última atualização:** 22 de Maio de 2026

**Versão:** 2.0.0
