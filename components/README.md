
# MotoInvest 🏍️💰

![MotoInvest Banner](./assets/banner.png)

## O parceiro definitivo do motoboy comandate.
Acelere sua liberdade financeira com o **MotoInvest**, a plataforma de gestão inteligente feita por quem entende a correria das ruas. Organize seus ganhos diários, controle seus boletos e saia das dívidas com o apoio de um **Mentor IA exclusivo**.

---

## 🌟 Funcionalidades Principais

### 🧠 Mentoria com Inteligência Artificial (Gemini)
- **Visão Computacional**: Envie prints dos aplicativos (iFood, Uber, Rappi) e deixe a IA extrair seus ganhos automaticamente.
- **Análise Estratégica**: Receba conselhos personalizados sobre como dividir seu lucro e atingir seus sonhos.
- **Lembretes Inteligentes**: A IA monitora sua agenda e te avisa sobre o vencimento de contas.

### 📊 Painel de Controle (Dashboard)
- **Lucro Líquido Real**: Veja quanto sobrou de verdade após descontar combustível e manutenção.
- **Calendário de Boletos**: Nunca mais pague juros! Uma agenda visual para todos os seus compromissos financeiros.
- **Gestão de Metas**: Defina seu sonho (Trocar de moto, reserva, viagem) e acompanhe o progresso em tempo real.

### 💳 Integração Segura com Mercado Pago
- **Acesso Premium**: Assinatura recorrente facilitada via Mercado Pago.
- **Liberação Instantânea**: Pagou, tá dentro! Integração via Webhooks para acesso imediato.

---

## 🛠️ Stack Tecnológica

- **Frontend**: React 18 + Vite (Design Premium & Glassmorphism)
- **Backend**: Supabase (Database & Edge Functions)
- **IA**: Google Gemini 1.5 Flash (Multimodal)
- **Pagamentos**: Mercado Pago API SDK v2

---

## 🚀 Como Executar o Projeto

### 1. Clonar o Repositório
```bash
git clone https://github.com/seu-usuario/motoinvest.git
cd motoinvest
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
VITE_SUPABASE_URL=seu_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon
API_KEY=sua_chave_gemini_google
```

### 3. Instalar Dependências e Rodar
```bash
npm install
npm run dev
```

---

## 🛡️ Configuração do Banco de Dados (Supabase)

Para o funcionamento pleno, certifique-se de configurar as seguintes tabelas no seu projeto Supabase:
- `profiles`: Informações do motocumpanheiro.
- `earnings` & `expenses`: Registro do fluxo de caixa diário.
- `bills`: Gestão da agenda de contas.
- `authorized_users`: Controle de acesso via pagamento.

> [!TIP]
> Ative o **Row Level Security (RLS)** em todas as tabelas para garantir que cada motoboy veja apenas os seus próprios dados.

---

## 📱 Instalar como App (PWA)
1. Acesse o link do projeto pelo navegador do celular.
2. **iOS**: Tap em Compartilhar > **Adicionar à Tela de Início**.
3. **Android**: Tap nos 3 pontos > **Instalar Aplicativo**.

---
*Desenvolvido com foco na prosperidade de quem faz a economia girar sobre duas rodas. 🏍️💨*
