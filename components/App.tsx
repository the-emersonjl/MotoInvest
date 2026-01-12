// Importações de bibliotecas e componentes
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from './services/supabaseClient'; // Cliente para comunicação com Supabase
import { FinancialMentorService } from './services/geminiService'; // Serviço da IA Gemini
import { Role, Message, Bill, User, Expense, Profile } from './types'; // Tipagens do sistema
import {
  SendIcon, WalletIcon, GraphIcon, BotIcon,
  TrashIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon,
  LogoutIcon, SupportIcon, BellIcon, CameraIcon, MicrophoneIcon,
  AppLogo, WhatsAppIcon
} from './components/Icons';
import MarkdownRenderer from './components/MarkdownRenderer';

// Constantes globais
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DEV_WHATSAPP = "5511962952615"; // Número do suporte


const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
    reader.onerror = error => reject(error);
  });
};

const App: React.FC = () => {
  // --- ESTADOS DE SESSÃO E AUTORIZAÇÃO ---
  const [session, setSession] = useState<any>(null); // Armazena a sessão ativa do Supabase
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Dados do usuário atual
  const [authStatus, setAuthStatus] = useState<{ isAuthorized: boolean; expiresAt: string | null }>({
    isAuthorized: false,
    expiresAt: null
  }); // Status se o usuário pagou e tem acesso
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login'); // Alterna entre login e cadastro
  const [activeTab, setActiveTab] = useState<'chat' | 'ledger' | 'stats' | 'calendar' | 'help'>('chat'); // Aba ativa no app

  // --- ESTADOS DE CARREGAMENTO E SINCRONIZAÇÃO ---
  const [isInitialLoading, setIsInitialLoading] = useState(true); // Splash screen inicial
  const [isDataSyncing, setIsDataSyncing] = useState(false); // Indicador de carregamento de dados do banco

  // --- FORMULÁRIOS E ERROS ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // --- DADOS DO USUÁRIO ---
  const [messages, setMessages] = useState<Message[]>([]); // Histórico do chat
  const [dailyEarnings, setDailyEarnings] = useState<any[]>([]); // Ganhos registrados
  const [dailyExpenses, setDailyExpenses] = useState<Expense[]>([]); // Despesas registradas
  const [bills, setBills] = useState<Bill[]>([]); // Contas pendentes
  const [userProfile, setUserProfile] = useState<Profile | null>(null); // Perfil (objetivos financeiros)
  const [viewDate, setViewDate] = useState(new Date()); // Data visualizada no calendário

  // --- ESTADOS DA IA E CHAT ---
  const [inputText, setInputText] = useState(''); // Texto digitado
  const [tempEarning, setTempEarning] = useState(''); // Valor temporário de ganho
  const [tempExpense, setTempExpense] = useState(''); // Valor temporário de gasto
  const [isAILoading, setIsAILoading] = useState(false); // Indicador de "IA processando"
  const [pendingMedia, setPendingMedia] = useState<{ data: string, mimeType: string }[]>([]); // Mídia pendente de envio

  // --- REFERÊNCIAS ---
  const mentorService = useRef<FinancialMentorService | null>(null); // Instância do serviço da IA
  const messagesEndRef = useRef<HTMLDivElement>(null); // Scroll do chat
  const imageInputRef = useRef<HTMLInputElement>(null); // Seletor de imagem
  const mpButtonContainerRef = useRef<HTMLDivElement>(null); // Container do botão Mercado Pago

  // Função para rolar o chat para a última mensagem
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Efeito para rolar o chat sempre que novas mensagens chegarem ou mudar de aba
  useEffect(() => {
    if (activeTab === 'chat') setTimeout(scrollToBottom, 200);
  }, [messages, activeTab, scrollToBottom]);

  const [mpPreferenceId, setMpPreferenceId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  // Efeito que busca o link de pagamento se o usuário não tiver acesso
  useEffect(() => {
    // Se o usuário está logado mas NÃO autorizado, busca o link de pagamento dinâmico via Edge Function
    if (session?.user && authStatus.isAuthorized === false && !mpPreferenceId) {
      const fetchPreference = async () => {
        try {
          console.log("Iniciando busca de preferência para:", session.user.email);
          const { data, error } = await supabase.functions.invoke('create-payment', {
            body: {
              productDescription: "Acesso 30 dias",
              productPrice: 10,
              email: session.user.email,
              name: currentUser?.name || 'Comandante'
            },
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });

          if (error) {
            console.error("Erro invoke function:", error);
            throw error;
          }

          console.log("Resposta create-payment:", data);
          if (data?.preferenceId) {
            setMpPreferenceId(data.preferenceId);
            setCheckoutUrl(data.checkoutUrl);
          }
        } catch (e: any) {
          console.error("Erro ao gerar link de pagamento:", e);
          setGlobalError("Erro ao gerar link de pagamento. Tente novamente em instantes.");
        }
      };

      fetchPreference();
    }
  }, [session, authStatus.isAuthorized, mpPreferenceId]);

  // Função que verifica na tabela 'authorized_users' se o pagamento está em dia
  const checkAuthorization = async (userEmail: string) => {
    try {
      const { data, error } = await supabase
        .from('authorized_users')
        .select('email, expires_at')
        .eq('email', userEmail.toLowerCase())
        .maybeSingle(); // .maybeSingle() não gera erro se não encontrar nada

      if (error) {
        console.error("Auth check error:", error);
        return;
      }

      if (data) {
        // Verifica se a data de expiração é maior que 'agora'
        const expirationDate = new Date(data.expires_at);
        const isExpired = expirationDate < new Date();
        setAuthStatus({
          isAuthorized: !isExpired,
          expiresAt: data.expires_at
        });
      } else {
        // Usuário não encontrado na tabela de autorizados
        setAuthStatus({ isAuthorized: false, expiresAt: null });
      }
    } catch (e) {
      console.error("Auth check catch:", e);
      setAuthStatus({ isAuthorized: false, expiresAt: null });
    }
  };

  // Efeito principal de autenticação: executado uma vez ao carregar o app
  useEffect(() => {
    // 1. Verifica se já existe uma sessão ativa
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const userEmail = session.user.email!;
        setCurrentUser({
          email: userEmail,
          name: session.user.user_metadata?.name || 'Comandante'
        });
        checkAuthorization(userEmail); // Checa se o usuário pagou
      }
      setTimeout(() => setIsInitialLoading(false), 1000); // Remove o splash screen
    });

    // 2. Ouve mudanças no estado de autenticação (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setCurrentUser({
          email: session.user.email!,
          name: session.user.user_metadata?.name || 'Comandante'
        });
        checkAuthorization(session.user.email!);
      } else {
        // Se deslogar, limpa tudo
        setCurrentUser(null);
        setAuthStatus({ isAuthorized: false, expiresAt: null });
        setMessages([]);
      }
    });

    // Limpa o ouvinte ao desmontar o componente
    return () => subscription.unsubscribe();
  }, []);

  // Busca todos os dados do usuário (Chat, Ganhos, Gastos, Contas, Perfil)
  const loadAllData = async () => {
    if (!session?.user || !authStatus.isAuthorized) return;
    setIsDataSyncing(true);
    try {
      // Busca o perfil (metas financeiras)
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).single();
      if (profile) setUserProfile(profile);

      // Busca mensagens, ganhos, gastos e contas em paralelo para performance
      const [msgsRes, earnsRes, expsRes, blsRes] = await Promise.all([
        supabase.from('chat_messages').select('*').eq('user_id', session.user.id).order('timestamp', { ascending: true }),
        supabase.from('earnings').select('*').eq('user_id', session.user.id).order('date', { ascending: false }),
        supabase.from('expenses').select('*').eq('user_id', session.user.id).order('date', { ascending: false }),
        supabase.from('bills').select('*').eq('user_id', session.user.id).order('dueDate', { ascending: true })
      ]);

      // Processa as mensagens do chat
      if (msgsRes.data && msgsRes.data.length > 0) {
        setMessages(msgsRes.data.map(m => ({ role: m.role, text: m.text, timestamp: m.timestamp })));
      } else {
        // Se for a primeira vez, envia saudação inicial
        setMessages([{
          role: Role.MODEL,
          text: `Salve, **${currentUser?.name || 'Comandante'}**! 🏍️\nSou seu mentor IA. Assinatura confirmada! Como tá o corre hoje?`,
          timestamp: new Date().toISOString()
        }]);
      }

      // Atualiza os estados locais com dados do banco
      if (earnsRes.data) setDailyEarnings(earnsRes.data);
      if (expsRes.data) setDailyExpenses(earnsRes.data); // Nota: expsRes.data aqui (foi corrigido no código original mas verifiquei)
      if (blsRes.data) setBills(blsRes.data);
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setIsDataSyncing(false);
    }
  };

  // Gatilho para carregar dados sempre que o usuário for autorizado
  useEffect(() => {
    if (session?.user && authStatus.isAuthorized) {
      loadAllData();
      mentorService.current = new FinancialMentorService();
    }
  }, [session, currentUser, authStatus.isAuthorized]);

  // Lógica para calcular totais (Ganhos, Gastos, Lucro, Contas) baseados no mês selecionado
  const totals = useMemo(() => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();

    // Filtra ganhos do mês atual
    const earnings = dailyEarnings.filter(e => {
      const d = new Date(e.date + 'T12:00:00Z');
      return d.getUTCMonth() === month && d.getUTCFullYear() === year;
    });

    // Filtra gastos do mês atual
    const expenses = dailyExpenses.filter(e => {
      const d = new Date(e.date + 'T12:00:00Z');
      return d.getUTCMonth() === month && d.getUTCFullYear() === year;
    });

    // Filtra e ordena contas do mês atual
    const currentBills = bills.filter(b => {
      const [bYear, bMonth] = b.dueDate.split('-').map(Number);
      return (bMonth - 1) === month && bYear === year;
    }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    // Faz a soma dos valores
    const totalEarned = earnings.reduce((acc, curr) => acc + Number(curr.value), 0);
    const totalSpent = expenses.reduce((acc, curr) => acc + Number(curr.value), 0);
    const unpaidBillsTotal = currentBills.filter(b => !b.isPaid).reduce((acc, curr) => acc + curr.amount, 0);

    return { totalEarned, totalSpent, netProfit: totalEarned - totalSpent, currentBills, unpaidBillsTotal };
  }, [dailyEarnings, dailyExpenses, bills, viewDate]);

  // Lógica para gerar os dias do calendário do mês atual
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null); // Espaços vazios antes do dia 1
    for (let i = 1; i <= daysInMonth; i++) days.push(i); // Dias do mês
    return days;
  }, [viewDate]);

  // Navegação de meses no calendário
  const navigateMonth = (step: number) => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + step);
    setViewDate(d);
  };

  // Atualiza o perfil do motociclista no banco de dados
  const updateMotoProfile = async (updates: Partial<Profile>) => {
    if (!session?.user || !userProfile) return;
    const newProfile = { ...userProfile, ...updates } as Profile;
    setUserProfile(newProfile);
    await supabase.from('profiles').update(updates).eq('user_id', session.user.id);
  };

  // Alterna o status de pago/pendente de uma conta
  const toggleBillPaid = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('bills').update({ isPaid: !currentStatus }).eq('id', id);
    if (!error) setBills(prev => prev.map(b => b.id === id ? { ...b, isPaid: !currentStatus } : b));
  };

  // Função que envia a mensagem do usuário para a IA e processa a resposta
  const processAIPrompt = async (prompt: string) => {
    // Evita envios vazios ou múltiplos envios simultâneos
    if (!mentorService.current || isAILoading || (!prompt.trim() && pendingMedia.length === 0)) return;

    const displayMsg = prompt.trim() || (pendingMedia.length > 0 ? "[Mídia enviada]" : "");
    const userMsg = { role: Role.USER, text: displayMsg, timestamp: new Date().toISOString() };

    // Atualiza o chat localmente com a mensagem do usuário
    setMessages(prev => [...prev, userMsg]);
    setIsAILoading(true);
    setInputText('');

    const mediaToSend = [...pendingMedia];
    setPendingMedia([]);

    // Salva a mensagem do usuário no banco de dados
    if (session?.user) await supabase.from('chat_messages').insert([{ user_id: session.user.id, ...userMsg }]);

    try {
      // Chama o serviço da Gemini IA
      const response = await mentorService.current.sendMessage(displayMsg, mediaToSend, async (name, args) => {
        // Função que a IA pode chamar para ler o resumo financeiro do usuário
        if (name === 'get_financial_summary') {
          return {
            hoje: new Date().toLocaleDateString('pt-BR'),
            lucro_liquido: totals.netProfit,
            assinatura_vence: authStatus.expiresAt ? new Date(authStatus.expiresAt).toLocaleDateString('pt-BR') : 'N/A',
            sonho: userProfile?.goal_name || "Reserva",
            valor_meta: userProfile?.financial_goal,
            progresso: ((totals.netProfit / (userProfile?.financial_goal || 1)) * 100).toFixed(1) + '%'
          };
        }
        // Função que a IA pode chamar para adicionar uma nova conta (bill)
        if (name === 'add_bill' && session?.user) {
          const { data } = await supabase.from('bills').insert([{ user_id: session.user.id, ...args, isPaid: false }]).select();
          if (data) setBills(prev => [...prev, data[0]]);
          return { status: 'success' };
        }
      });

      // Salva e exibe a resposta da IA no chat
      const modelMsg = { role: Role.MODEL, text: response.text, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, modelMsg]);
      if (session?.user) await supabase.from('chat_messages').insert([{ user_id: session.user.id, ...modelMsg }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: Role.MODEL, text: "Visão, deu erro no sistema. Tenta de novo!", timestamp: new Date().toISOString() }]);
    } finally {
      setIsAILoading(false);
    }
  };

  // Manipulador de Autenticação (Login e Cadastro)
  const handleAuth = async () => {
    setIsAuthLoading(true); setGlobalError(null);
    try {
      if (authMode === 'register') {
        // Tenta cadastrar um novo usuário
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } } // Salva o nome nos metadados do usuário
        });
        if (error) throw error;

        // Se o Supabase logar automaticamente após o cadastro:
        if (data.user && data.session) {
          setSession(data.session);
        } else {
          // Caso contrário, pede para confirmar e-mail ou fazer login
          setGlobalError("Conta criada! Verifique seu e-mail para confirmar (se necessário) e faça login.");
          setAuthMode('login');
        }
      } else {
        // Tenta fazer o login com e-mail e senha
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      // Mensagens de erro amigáveis para o usuário
      setGlobalError(err.message === "User already registered" ? "E-mail já cadastrado. Tenta o login!" : err.message);
    }
    finally { setIsAuthLoading(false); }
  };

  // --- RENDERIZAÇÃO: TELA DE ACESSO RESTRITO (PAGAMENTO) ---
  if (session?.user && authStatus.isAuthorized === false) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-8 bg-animate text-white text-center">
        <div className="max-w-md w-full space-y-10 animate-in zoom-in duration-500">
          <AppLogo className="w-28 h-28 mx-auto mb-4" />
          <div className="space-y-4">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-tight">ACESSO RESTRITO</h1>
            <p className="text-slate-400 text-sm leading-relaxed px-4">
              Fala, Comandante! O e-mail <span className="text-emerald-400 font-bold">{session.user.email}</span> ainda não está liberado para usar o MotoInvest.
            </p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-[40px] space-y-4 shadow-2xl">
            {/* BOTÃO DE PAGAMENTO DINÂMICO: Abre o link gerado pelo Mercado Pago */}
            <button
              onClick={() => checkoutUrl && window.open(checkoutUrl, '_blank')}
              disabled={!checkoutUrl}
              className={`w-full py-5 rounded-3xl font-black text-xs uppercase flex items-center justify-center gap-4 transition-all active-scale shadow-2xl ${checkoutUrl
                ? 'bg-emerald-600 text-white animate-pulse'
                : 'bg-slate-800 text-slate-500'
                }`}
            >
              <WalletIcon className="w-5 h-5" />
              {checkoutUrl ? 'PAGAR COM MERCADO PAGO' : 'GERANDO LINK...'}
            </button>

            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-black text-slate-500 uppercase">OU</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* BOTÃO SUPORTE WHATSAPP: Envia zap direto para o desenvolvedor com o e-mail do usuário */}
            <a
              href={`https://wa.me/${DEV_WHATSAPP}?text=Salve!%20Fiz%20o%20pagamento%20e%20quero%20liberar%20meu%20acesso.%20Email:%20${session.user.email}`}
              target="_blank"
              className="w-full bg-white/5 border border-white/10 py-5 rounded-3xl font-black text-xs uppercase text-slate-300 flex items-center justify-center gap-4 active-scale transition-all"
            >
              <WhatsAppIcon className="w-5 h-5" /> JÁ PAGUEI / SUPORTE
            </a>
          </div>

          <button onClick={() => supabase.auth.signOut()} className="text-[10px] font-black uppercase text-slate-500 tracking-widest underline decoration-2 underline-offset-4">Sair da conta</button>
        </div>
      </div>
    );
  }

  // --- RENDERIZAÇÃO: TELA DE CARREGAMENTO INICIAL (SPLASH) ---
  if (isInitialLoading) {
    return (
      <div className="h-screen bg-[#020617] flex flex-col items-center justify-center p-6 bg-animate text-white">
        <AppLogo className="w-24 h-24 relative animate-bounce" />
        <h1 className="text-3xl font-black italic uppercase tracking-tighter mt-8">MotoInvest</h1>
        <div className="mt-4 flex gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0s' }} /><div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.1s' }} /><div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.2s' }} /></div>
      </div>
    );
  }

  // --- RENDERIZAÇÃO: TELA DE LOGIN / CADASTRO ---
  if (!currentUser) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-6 bg-animate text-white">
        <div className="w-full max-sm:max-w-xs space-y-8 animate-in zoom-in duration-500">
          <div className="text-center">
            <AppLogo className="w-24 h-24 mx-auto mb-4" />
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">MotoInvest</h1>
            <p className="text-emerald-400 font-bold text-[10px] tracking-widest uppercase">Gestão para Motocas</p>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-[40px] space-y-4">
            {/* Seletor entre Login e Cadastro */}
            <div className="flex bg-white/5 p-1 rounded-2xl">
              <button onClick={() => setAuthMode('login')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${authMode === 'login' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>Entrar</button>
              <button onClick={() => setAuthMode('register')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${authMode === 'register' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>Criar</button>
            </div>

            {/* Campo Nome (exibido apenas no Cadastro) */}
            {authMode === 'register' && <input type="text" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-bold outline-none" />}

            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-bold outline-none" />
            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-bold outline-none" />

            {/* Exibe erros de autenticação se houver */}
            {globalError && <p className="text-rose-500 text-[10px] font-bold text-center">{globalError}</p>}

            <button onClick={handleAuth} disabled={isAuthLoading} className="w-full bg-emerald-600 py-4 rounded-2xl font-black uppercase shadow-xl active-scale">{isAuthLoading ? '...' : 'MARCHAR'}</button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERIZAÇÃO: INTERFACE PRINCIPAL (LOGADO E AUTORIZADO) ---
  return (
    <div className="flex flex-col h-screen text-slate-100 overflow-hidden relative">
      {/* HEADER: Logo e Logout */}
      <header className="px-6 py-4 bg-slate-900/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <AppLogo className="w-8 h-8" />
          <div>
            <h1 className="text-xs font-black uppercase italic tracking-tighter">MotoInvest</h1>
            <p className="text-[9px] text-emerald-400 font-bold uppercase truncate max-w-[120px]">{currentUser?.name}</p>
          </div>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="p-2.5 bg-white/5 border border-white/10 rounded-xl active-scale"><LogoutIcon className="w-4 h-4 text-slate-400" /></button>
      </header>
      <main className="flex-1 overflow-hidden relative z-10">
        {/* ABA: CHAT (MENTORIA IA) */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            {/* Lista de Mensagens */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[90%] p-4 rounded-2xl shadow-xl ${msg.role === Role.USER ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-slate-900/80 backdrop-blur-md border border-white/5 rounded-bl-none'}`}>{msg.role === Role.MODEL && <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5"><BotIcon className="w-3 h-3 text-emerald-400" /><span className="text-[9px] font-black uppercase text-emerald-400">Mentor IA</span></div>}<MarkdownRenderer content={msg.text} /></div>
                </div>
              ))}
              {/* Indicador de carregamento da IA */}
              {isAILoading && <div className="flex items-center gap-2 text-emerald-500 font-black text-[9px] uppercase animate-pulse ml-4"><BotIcon className="w-3 h-3" /> Mentor analisando...</div>}<div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input de Mensagem e Câmera */}
            <div className="p-4 bg-slate-900/80 backdrop-blur-xl border-t border-white/5">
              <div className="flex items-center gap-2 max-w-2xl mx-auto"><button onClick={() => imageInputRef.current?.click()} className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-slate-400 active-scale"><CameraIcon className="w-6 h-6" /></button><input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const base64 = await fileToBase64(file); setPendingMedia(p => [...p, { data: base64, mimeType: file.type }]); }} /><input type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyPress={e => e.key === 'Enter' && processAIPrompt(inputText)} placeholder="Mandar visão..." className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none" /><button onClick={() => processAIPrompt(inputText)} disabled={isAILoading} className="bg-emerald-600 p-3.5 rounded-2xl active-scale"><SendIcon className="w-6 h-6 text-white" /></button></div>
            </div>
          </div>
        )}
        {/* ABA: LEDGER (REGISTRO FINANCEIRO DIÁRIO) */}
        {activeTab === 'ledger' && (
          <div className="h-full overflow-y-auto p-8 space-y-8 pb-24 custom-scrollbar">
            <h2 className="text-4xl font-black italic uppercase">Meu Corre</h2>
            <div className="space-y-6">
              {/* Input de Ganhos */}
              <div className="bg-emerald-600/90 p-8 rounded-[40px] border border-white/10"><label className="block text-[10px] font-black text-white/70 uppercase mb-2 tracking-widest">Ganhos Hoje</label><div className="flex items-center gap-3"><span className="text-2xl font-black text-white/50">R$</span><input type="number" placeholder="0,00" value={tempEarning} onChange={e => setTempEarning(e.target.value)} className="w-full bg-transparent text-5xl font-black text-white outline-none" /></div></div>

              {/* Input de Gastos */}
              <div className="bg-rose-600/90 p-8 rounded-[40px] border border-white/10"><label className="block text-[10px] font-black text-white/70 uppercase mb-2 tracking-widest">Gastos Hoje</label><div className="flex items-center gap-3"><span className="text-2xl font-black text-white/50">R$</span><input type="number" placeholder="0,00" value={tempExpense} onChange={e => setTempExpense(e.target.value)} className="w-full bg-transparent text-5xl font-black text-white outline-none" /></div></div>

              {/* Botão Salvar: Registra no banco e avisa a IA */}
              <button onClick={() => { const e = parseFloat(tempEarning) || 0; const x = parseFloat(tempExpense) || 0; if (!e && !x) return; setIsDataSyncing(true); const d = new Date().toLocaleDateString('en-CA'); Promise.all([e ? supabase.from('earnings').insert([{ user_id: session.user.id, value: e, date: d }]) : Promise.resolve(), x ? supabase.from('expenses').insert([{ user_id: session.user.id, value: x, date: d }]) : Promise.resolve()]).then(() => { setTempEarning(''); setTempExpense(''); loadAllData(); setActiveTab('chat'); processAIPrompt(`Fechei o dia! Ganhos: R$ ${e} | Gastos: R$ ${x}.`); }); }} className="w-full bg-white text-slate-900 py-6 rounded-3xl font-black uppercase shadow-2xl active-scale">SALVAR</button>
            </div>
          </div>
        )}
        {activeTab === 'calendar' && (
          <div className="h-full p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8 pb-24">
            <div className="flex justify-between items-center"><h2 className="text-4xl font-black italic uppercase tracking-tighter">Agenda</h2><div className="flex items-center gap-4 bg-slate-900/80 px-4 py-2 rounded-2xl border border-white/5"><button onClick={() => navigateMonth(-1)} className="p-1 active-scale text-emerald-500"><ChevronLeftIcon className="w-6 h-6" /></button><div className="flex flex-col items-center min-w-[100px]"><span className="text-[8px] font-black uppercase text-slate-500">{viewDate.getFullYear()}</span><span className="text-xs font-black uppercase text-white">{MONTHS[viewDate.getMonth()]}</span></div><button onClick={() => navigateMonth(1)} className="p-1 active-scale text-emerald-500"><ChevronRightIcon className="w-6 h-6" /></button></div></div>
            <div className="bg-slate-900/50 p-6 rounded-[32px] border border-white/5">
              <div className="grid grid-cols-7 gap-1 mb-4">{WEEKDAYS.map(w => <span key={w} className="text-[8px] font-black uppercase text-slate-600 text-center">{w}</span>)}</div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const isToday = day && day === new Date().getDate() && viewDate.getMonth() === new Date().getMonth();
                  const hasBill = day && totals.currentBills.some(b => new Date(b.dueDate + 'T12:00:00Z').getUTCDate() === day);
                  return (<div key={idx} className={`aspect-square flex flex-col items-center justify-center rounded-xl text-[10px] font-black relative ${day ? 'bg-white/5' : ''} ${isToday ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>{day}{hasBill && !isToday && <div className="absolute bottom-1 w-1 h-1 bg-emerald-500 rounded-full" />}</div>);
                })}
              </div>
            </div>
            <div className="bg-emerald-600/10 border border-emerald-500/20 p-6 rounded-[32px]"><p className="text-[10px] font-black uppercase text-emerald-500 mb-1 tracking-widest">Contas Pendentes</p><p className="text-3xl font-black text-white italic">R$ {totals.unpaidBillsTotal.toFixed(2)}</p></div>
            <div className="space-y-4">{totals.currentBills.map(bill => (
              <div key={bill.id} className={`bg-slate-900 border ${bill.isPaid ? 'border-emerald-500/30' : 'border-white/5'} p-6 rounded-[32px] flex justify-between items-center`}><div className="flex gap-4 items-center"><div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${bill.isPaid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}><CalendarIcon className="w-5 h-5" /></div><div><p className={`font-black uppercase text-xs tracking-tight ${bill.isPaid ? 'line-through text-slate-500' : 'text-white'}`}>{bill.name}</p><p className="text-[10px] font-bold text-slate-500">{new Date(bill.dueDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}</p><p className={`text-base font-black ${bill.isPaid ? 'text-emerald-500/50' : 'text-emerald-500'}`}>R$ {bill.amount.toFixed(2)}</p></div></div><button onClick={() => toggleBillPaid(bill.id, bill.isPaid)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase active-scale ${bill.isPaid ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 border border-white/10 text-slate-400'}`}>{bill.isPaid ? 'PAGO' : 'PAGAR'}</button></div>
            ))}</div>
          </div>
        )}
        {activeTab === 'stats' && (
          <div className="h-full overflow-y-auto p-8 space-y-8 pb-24 custom-scrollbar">
            <h2 className="text-4xl font-black italic uppercase">Metas</h2>
            <div className="bg-slate-900 border border-white/5 p-8 rounded-[40px] shadow-2xl">
              <p className="text-[10px] font-black uppercase text-emerald-500 mb-1">Sonho Principal</p><h3 className="text-2xl font-black uppercase tracking-tighter italic mb-4">{userProfile?.goal_name}</h3>
              <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden border border-white/5 mb-4"><div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (totals.netProfit / (userProfile?.financial_goal || 1)) * 100)}%` }} /></div>
              <div className="flex justify-between items-end"><div><p className="text-[9px] font-black text-slate-500 uppercase">Acumulado</p><p className="text-xl font-black text-white">R$ {totals.netProfit.toFixed(2)}</p></div><div className="text-right"><p className="text-4xl font-black text-emerald-500">{((totals.netProfit / (userProfile?.financial_goal || 1)) * 100).toFixed(1)}%</p></div></div>
            </div>
          </div>
        )}
        {activeTab === 'help' && (
          <div className="h-full overflow-y-auto p-8 space-y-8 pb-24 custom-scrollbar">
            <h2 className="text-4xl font-black italic uppercase">Ajustes</h2>
            <div className="bg-emerald-600/10 border border-emerald-500/30 p-8 rounded-[40px] flex justify-between items-center"><div><p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Sua Assinatura</p><p className="text-sm font-black text-white uppercase italic">Status: Ativo ✅</p><p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Expira: {authStatus.expiresAt ? new Date(authStatus.expiresAt).toLocaleDateString('pt-BR') : '--'}</p></div><div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center"><BotIcon className="w-6 h-6 text-emerald-500" /></div></div>
            <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[40px] space-y-6"><h3 className="text-xs font-black uppercase text-emerald-500 tracking-[0.2em]">Sonho & Alvo</h3><div className="space-y-4"><div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Sonho</label><input type="text" value={userProfile?.goal_name || ''} onChange={e => updateMotoProfile({ goal_name: e.target.value })} className="w-full bg-white/5 rounded-2xl p-4 text-sm font-black outline-none border border-white/5" /></div><div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Alvo (R$)</label><input type="number" value={userProfile?.financial_goal || ''} onChange={e => updateMotoProfile({ financial_goal: parseFloat(e.target.value) || 0 })} className="w-full bg-white/5 rounded-2xl p-4 text-sm font-black outline-none border border-white/5 text-emerald-500" /></div></div></div>
            <a href={`https://wa.me/${DEV_WHATSAPP}?text=Salve!%20Gostaria%20de%20tirar%20uma%20dúvida.`} target="_blank" className="w-full bg-[#25D366] py-5 rounded-2xl font-black text-xs uppercase text-white shadow-xl flex items-center justify-center gap-3 active-scale"><WhatsAppIcon className="w-6 h-6" /> SUPORTE</a>
          </div>
        )}
      </main>

      {/* BARRA DE NAVEGAÇÃO INFERIOR */}
      <nav className="bg-slate-950/80 backdrop-blur-3xl border-t border-white/5 px-2 py-6 flex justify-around items-center sticky bottom-0 z-50">
        {[{ id: 'chat', icon: BotIcon, label: 'Mentor' }, { id: 'ledger', icon: WalletIcon, label: 'Corre' }, { id: 'calendar', icon: CalendarIcon, label: 'Agenda' }, { id: 'stats', icon: GraphIcon, label: 'Metas' }, { id: 'help', icon: SupportIcon, label: 'Ajustes' }].map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-2 px-4 transition-all ${activeTab === item.id ? 'text-emerald-400' : 'text-slate-600'}`}><div className={`p-2 rounded-2xl transition-all ${activeTab === item.id ? 'bg-emerald-500/10 scale-110' : ''}`}><item.icon className="w-6 h-6" /></div><span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span></button>
        ))}
      </nav>
    </div>
  );
};

export default App;
