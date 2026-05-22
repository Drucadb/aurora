# Aurora - Sistema de Recuperação

Um dashboard moderno para recuperação de contas.

## 🚀 Características
- ✅ **Interface Moderna**: Design glassmorphism
- 📱 **Responsivo**: Funciona em qualquer dispositivo
- ⚡ **Rápido**: Otimizado para performance

## 🔧 Configuração

### 1. Configurar Variáveis de Ambiente
Crie um arquivo `.env` com:
```env
DISCORD_WEBHOOK_URL=sua_url_aqui
```

### 2. Deploy (Vercel)
```bash
vercel --prod
```

## 📁 Estrutura
- `index.html`: Página principal
- `script.js`: Lógica do site
- `api/webhook.js`: Envio para o Discord
