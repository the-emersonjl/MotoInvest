# 🏍️ MotoInvest AI

> O parceiro financeiro inteligente do motoboy. Organize suas diárias, controle seus boletos e saia das dívidas com apoio de um **Mentor IA exclusivo**.

[![React](https://img.shields.io/badge/React-19.0-blue?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple?logo=vite)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-2.39-green?logo=supabase)](https://supabase.com)
[![Google Gemini](https://img.shields.io/badge/Gemini-1.5%20Flash-orange?logo=google)](https://ai.google.dev)
[![PWA](https://img.shields.io/badge/PWA-Enabled-blueviolet)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📋 Índice

- [✨ Funcionalidades](#-funcionalidades)
- [🛠️ Stack Tecnológica](#-stack-tecnológica)
- [📦 Pré-requisitos](#-pré-requisitos)
- [🚀 Instalação e Setup](#-instalação-e-setup)
- [⚙️ Configuração](#️-configuração)
- [📁 Estrutura do Projeto](#-estrutura-do-projeto)
- [💻 Executando Localmente](#-executando-localmente)
- [🌐 Deploy](#-deploy)
- [🔒 Segurança](#-segurança)
- [📚 Documentação](#-documentação)
- [🤝 Contribuindo](#-contribuindo)
- [📞 Suporte](#-suporte)

---

## ✨ Funcionalidades

### 🧠 Mentor com Inteligência Artificial (Gemini 1.5 Flash)
- **Visão Computacional**: Envie screenshots dos apps (iFood, Uber, Rappi, etc) e a IA extrai automaticamente seus ganhos
- **Análise Estratégica**: Receba conselhos personalizados sobre como dividir seus lucros e atingir seus objetivos
- **Lembretes Inteligentes**: A IA monitora sua agenda e avisa sobre vencimentos de contas

### 📊 Dashboard Completo
- **Lucro Líquido Real**: Visualize seus ganhos reais após descontar combustível e manutenção
- **Calendário de Boletos**: Nunca mais pague juros! Agenda visual de todos os compromissos financeiros
- **Gestão de Metas**: Defina seus sonhos (trocar de moto, reserva, viagem) e acompanhe o progresso em tempo real
- **Histórico de Ganhos e Despesas**: Controle detalhado de todas as transações

### 💳 Integração com Mercado Pago
- **Assinatura Premium**: Acesso via Mercado Pago com renovação automática
- **Liberação Instantânea**: Webhooks integrados para acesso imediato após pagamento

### 📱 Progressive Web App (PWA)
- Funciona offline (com Service Worker)
- Instalável como app nativo no celular
- Interface responsiva e otimizada

---

## 🛠️ Stack Tecnológica

| Tecnologia | Versão | Descrição |
|-----------|--------|-----------|
| **React** | 19.0 | Framework frontend |
| **TypeScript** | 5.7 | Tipagem estática |
| **Vite** | 6.0 | Build tool rápido |
| **Supabase** | 2.39 | Backend e Banco de Dados |
| **Google Gemini** | 1.5 Flash | IA Multimodal |
| **Mercado Pago SDK** | v2 | Pagamentos |

---

## 📦 Pré-requisitos

Antes de começar, certifique-se de que você tem instalado:

- **Node.js** ≥ 18.0.0 ([Download](https://nodejs.org))
- **npm** ≥ 9.0.0 (vem com Node.js)
- **Git** ([Download](https://git-scm.com))

Você também vai precisar de contas em:
- [Supabase](https://supabase.com) - Banco de dados
- [Google AI Studio](https://ai.google.dev) - Chave API do Gemini
- [Mercado Pago](https://www.mercadopago.com.br) (opcional) - Pagamentos

---

## 🚀 Instalação e Setup

### 1. Clone o Repositório

```bash
git clone https://github.com/the-emersonjl/MotoInvest.git
cd MotoInvest
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Configure as Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Supabase
VITE_SUPABASE_URL=seu_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase

# Google Gemini
VITE_API_KEY=sua_chave_api_do_gemini

# (Opcional) Mercado Pago
VITE_MERCADO_PAGO_KEY=sua_chave_publica_mercado_pago
```

> ⚠️ **Nunca commite o arquivo `.env` no Git!** Ele já está no `.gitignore`

---

## ⚙️ Configuração

### Supabase - Banco de Dados

1. Crie um novo projeto no [Supabase](https://supabase.com)
2. Vá em **Settings > API** e copie:
   - `URL do projeto` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`

3. **Crie as tabelas** (veja `docs/database-schema.md`):
   - `profiles` - Informações do motoboy
   - `earnings` - Ganhos diários
   - `expenses` - Despesas
   - `bills` - Boletos e contas
   - `chat_messages` - Histórico do chat com IA
   - `authorized_users` - Controle de acesso premium

4. **Ative Row Level Security (RLS)**:
   - Em cada tabela, ative RLS
   - Crie políticas para que cada usuário veja apenas seus dados:
     ```sql
auth.uid() = user_id
``` 

### Google Gemini - API de IA

1. Acesse [Google AI Studio](https://ai.google.dev)
2. Clique em "Create API Key"
3. Copie a chave para `VITE_API_KEY`

### Mercado Pago (Opcional)

Se deseja ativar pagamentos:

1. Crie uma conta em [Mercado Pago](https://www.mercadopago.com.br)
2. Vá em **Configurações > Tokens** e copie sua **Chave Pública**
3. Configure `VITE_MERCADO_PAGO_KEY`

---

## 📁 Estrutura do Projeto

```
MotoInvest/
├── src/                          # Código-fonte
│   ├── components/               # Componentes React reutilizáveis
│   │   ├── Icons.tsx            # Ícones do app
│   │   ├── MarkdownRenderer.tsx # Renderizador de markdown
│   │   └── ...
│   ├── services/                 # Serviços e APIs
│   │   ├── supabaseClient.ts    # Cliente Supabase
│   │   ├── geminiService.ts     # Serviço IA Gemini
│   │   └── ...
│   ├── App.tsx                   # Componente principal
│   ├── index.tsx                 # Entrada da aplicação
│   ├── types.ts                  # Tipagens TypeScript
│   └── ...
├── public/                       # Arquivos estáticos
│   ├── icon-192x192.png         # Ícone PWA
│   ├── icon-512x512.png         # Ícone PWA
│   └── ...
├── docs/                         # Documentação
│   ├── DATABASE.md              # Schema do banco
│   ├── API.md                   # Documentação de APIs
│   ├── CONTRIBUTING.md          # Guia de contribuição
│   └── ...
├── .env.example                  # Template de variáveis de ambiente
├── package.json                  # Dependências do projeto
├── tsconfig.json                 # Configuração TypeScript
├── vite.config.ts               # Configuração Vite
├── index.html                    # HTML principal
├── sw.js                         # Service Worker (PWA)
├── manifest.json                 # Manifest PWA
└── README.md                     # Este arquivo

```

---

## 💻 Executando Localmente

### Modo Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

### Build para Produção

```bash
npm run build
```

Gera a pasta `dist/` com os arquivos otimizados

### Preview do Build

```bash
npm run preview
```

Visualiza como ficará a versão de produção

---

## 🌐 Deploy

### Opção 1: Vercel (Recomendado ⭐)

1. Faça fork ou push do repositório para GitHub
2. Vá em [Vercel](https://vercel.com) e conecte seu repositório
3. Configure as variáveis de ambiente em **Settings > Environment Variables**
4. Clique em **Deploy**

```
VITE_SUPABASE_URL = ...
VITE_SUPABASE_ANON_KEY = ...
VITE_API_KEY = ...
```

**Documentação**: [Deploy no Vercel](https://vercel.com/docs)

### Opção 2: Netlify

1. Conecte seu repositório no [Netlify](https://netlify.com)
2. Defina o comando de build: `npm run build`
3. Defina o diretório de publicação: `dist`
4. Configure as variáveis de ambiente
5. Deploy automático a cada push

**Documentação**: [Deploy no Netlify](https://docs.netlify.com)

### Instalar como App no Celular

Após fazer deploy:

#### iPhone (iOS)
1. Abra o link da aplicação no Safari
2. Toque em **Compartilhar** (ícone de seta)
3. Selecione **Adicionar à Tela de Início**
4. Escolha um nome e toque em **Adicionar**

#### Android
1. Abra o link da aplicação no Chrome
2. Toque nos **3 pontos** (menu)
3. Selecione **Instalar aplicativo**
4. Confirme a instalação

---

## 🔒 Segurança

### ✅ Checklist de Segurança

- [ ] Ative **Row Level Security (RLS)** em todas as tabelas do Supabase
- [ ] Use políticas de RLS: `auth.uid() = user_id`
- [ ] **Nunca** commit arquivos `.env` (já está no `.gitignore`)
- [ ] Use variáveis de ambiente com prefixo `VITE_` apenas para valores públicos
- [ ] Mantenha chaves secretas apenas no backend/edge functions
- [ ] Valide e sanitize inputs do usuário
- [ ] Use HTTPS em produção (automaticamente em Vercel/Netlify)

### Variáveis de Ambiente Sensíveis

Se precisar de variáveis que não devem estar no frontend, use:
- **Supabase Edge Functions** para lógica sensível
- **Vercel Serverless Functions** (se usar Vercel)
- **Netlify Functions** (se usar Netlify)

---

## 📚 Documentação

Para mais informações, veja os arquivos em `/docs`:

- 📖 [**DATABASE.md**](docs/DATABASE.md) - Schema e modelos do banco de dados
- 🔌 [**API.md**](docs/API.md) - Documentação das APIs e serviços
- 🤝 [**CONTRIBUTING.md**](docs/CONTRIBUTING.md) - Guia para contribuidores
- 🔐 [**SECURITY.md**](docs/SECURITY.md) - Boas práticas de segurança
- 📱 [**PWA.md**](docs/PWA.md) - Configuração e testes PWA

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Siga os passos:

1. **Fork** o repositório
2. **Crie uma branch** para sua feature:
   ```bash
git checkout -b feature/minha-feature
   ```
3. **Commit** suas mudanças:
   ```bash
git commit -m "feat: descrição clara da mudança"
   ```
4. **Push** para seu fork:
   ```bash
git push origin feature/minha-feature
   ```
5. **Abra um Pull Request** descrevendo suas mudanças

Para mais detalhes, veja [CONTRIBUTING.md](docs/CONTRIBUTING.md)

---

## 📞 Suporte

### 💬 Dúvidas ou Bugs?

- **GitHub Issues**: [Abra uma issue](https://github.com/the-emersonjl/MotoInvest/issues/new)
- **WhatsApp**: Suporte direto via WhatsApp
- **Email**: emerson@motoinvest.com

### 🌐 Recursos Úteis

- [React Documentation](https://react.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Vite Guide](https://vitejs.dev/guide/)

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais detalhes.

---

## 🙏 Agradecimentos

Desenvolvido com ❤️ para facilitar a vida dos motoboys e motomoças que fazem a economia girar sobre duas rodas.

**Desenvolvido por**: [Emerson JL](https://github.com/the-emersonjl)

---

<div align="center">

### 🏍️ MotoInvest - A liberdade financeira em alta velocidade

⭐ Se este projeto te ajudou, deixe uma estrela no GitHub!

</div>
