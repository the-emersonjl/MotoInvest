
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from './services/supabaseClient';
import { FinancialMentorService } from './services/geminiService';
import { Role, Message, Bill, User, Expense, Profile } from './types';
import { 
  SendIcon, WalletIcon, GraphIcon, BotIcon, 
  TrashIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon,
  LogoutIcon, SupportIcon, BellIcon, CameraIcon, MicrophoneIcon,
  AppLogo
} from './components/Icons';
import MarkdownRenderer from './components/MarkdownRenderer';

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAYS_OF_WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-slate-800/50 rounded-2xl ${className}`} />
);

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
    reader.onerror = error => reject(error);
  });
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<'chat' | 'ledger' | 'stats' | 'calendar' | 'help'>('chat');
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDataSyncing, setIsDataSyncing] = useState(false);
  
  const [notifsEnabled, setNotifsEnabled] = useState(() => localStorage.getItem('moto_notifs_muted') !== 'true');
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingData, setOnboardingData] = useState<Profile>({
    age: '', gender: '', experience: '', tool: '', days_week: '', hours_day: '',
    platforms: [], accident: false, challenge: '',
    financial_goal: 5000, goal_name: 'Reserva de Emergência'
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [dailyEarnings, setDailyEarnings] = useState<any[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<Expense[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  
  const [inputText, setInputText] = useState('');
  const [tempEarning, setTempEarning] = useState('');
  const [tempExpense, setTempExpense] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [pendingMedia, setPendingMedia] = useState<{data: string, mimeType: string}[]>([]);

  const [isAddingManualBill, setIsAddingManualBill] = useState(false);
  const [manualBillName, setManualBillName] = useState('');
  const [manualBillAmount, setManualBillAmount] = useState('');

  const mentorService = useRef<FinancialMentorService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (activeTab === 'chat') setTimeout(scrollToBottom, 200);
  }, [messages, activeTab, scrollToBottom]);

  // Financial calculations
  const totals = useMemo(() => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const earnings = dailyEarnings.filter(e => {
      const d = new Date(e.date);
      return d.getUTCMonth() === month && d.getUTCFullYear() === year;
    });
    const expenses = dailyExpenses.filter(e => {
      const d = new Date(e.date);
      return d.getUTCMonth() === month && d.getUTCFullYear() === year;
    });
    const currentBills = bills.filter(b => {
      const [bYear, bMonth] = b.dueDate.split('-').map(Number);
      return bMonth === (month + 1) && bYear === year;
    }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const totalEarned = earnings.reduce((acc, curr) => acc + Number(curr.value), 0);
    const totalSpent = expenses.reduce((acc, curr) => acc + Number(curr.value), 0);
    const unpaidBillsTotal = currentBills.filter(b => !b.isPaid).reduce((acc, curr) => acc + curr.amount, 0);

    return { totalEarned, totalSpent, netProfit: totalEarned - totalSpent, currentBills, unpaidBillsTotal };
  }, [dailyEarnings, dailyExpenses, bills, viewDate]);

  // Line Chart Data Generation
  const chartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { month: d.getMonth(), year: d.getFullYear(), label: MONTHS[d.getMonth()].slice(0, 3) };
    });

    return last6Months.map(item => {
      const monthEarns = dailyEarnings.filter(e => {
        const d = new Date(e.date);
        return d.getUTCMonth() === item.month && d.getUTCFullYear() === item.year;
      }).reduce((acc, curr) => acc + Number(curr.value), 0);
      
      const monthExps = dailyExpenses.filter(e => {
        const d = new Date(e.date);
        return d.getUTCMonth() === item.month && d.getUTCFullYear() === item.year;
      }).reduce((acc, curr) => acc + Number(curr.value), 0);

      return { ...item, net: monthEarns - monthExps };
    });
  }, [dailyEarnings, dailyExpenses]);

  // Auth and Data Fetching
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setCurrentUser({ 
          email: session.user.email!, 
          name: session.user.user_metadata?.name || 'Comandante' 
        });
      }
      setTimeout(() => setIsInitialLoading(false), 1000);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setCurrentUser({ 
          email: session.user.email!, 
          name: session.user.user_metadata?.name || 'Comandante' 
        });
      } else { 
        setCurrentUser(null); 
        setMessages([]); 
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadAllData = async () => {
    if (!session?.user) return;
    setIsDataSyncing(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).single();
      if (!profile) setShowOnboarding(true);
      else setUserProfile(profile);

      const [msgsRes, earnsRes, expsRes, blsRes] = await Promise.all([
        supabase.from('chat_messages').select('*').eq('user_id', session.user.id).order('timestamp', { ascending: true }),
        supabase.from('earnings').select('*').eq('user_id', session.user.id).order('date', { ascending: false }),
        supabase.from('expenses').select('*').eq('user_id', session.user.id).order('date', { ascending: false }),
        supabase.from('bills').select('*').eq('user_id', session.user.id).order('dueDate', { ascending: true })
      ]);
      
      if (msgsRes.data && msgsRes.data.length > 0) {
        setMessages(msgsRes.data.map(m => ({ role: m.role, text: m.text, timestamp: m.timestamp })));
      } else {
        setMessages([{ 
          role: Role.MODEL, 
          text: `Salve, **${currentUser?.name || 'Comandante'}**! 🏍️\nPode mandar foto do seu fechamento, áudio contando como foi o corre, ou perguntar sobre suas metas. Tô na escuta!`, 
          timestamp: new Date().toISOString() 
        }]);
      }
      
      if (earnsRes.data) setDailyEarnings(earnsRes.data);
      if (expsRes.data) setDailyExpenses(expsRes.data);
      if (blsRes.data) setBills(blsRes.data);
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setIsDataSyncing(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadAllData();
      mentorService.current = new FinancialMentorService();
    }
  }, [session, currentUser]);

  // Media Handlers
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setPendingMedia(prev => [...prev, { data: base64, mimeType: file.type }]);
    if (e.target) e.target.value = '';
  };

  // Tool Call Handler
  const onToolCall = async (name: string, args: any) => {
    if (name === 'get_financial_summary') {
      const agenda = bills
        .filter(b => !b.isPaid)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .map(b => `${b.name} (Vence: ${b.dueDate}) - R$ ${b.amount.toFixed(2)}`);

      return {
        hoje: new Date().toLocaleDateString('pt-BR'),
        saldo_acumulado_total: dailyEarnings.reduce((acc, curr) => acc + Number(curr.value), 0) - dailyExpenses.reduce((acc, curr) => acc + Number(curr.value), 0),
        net_profit_periodo_atual: totals.netProfit,
        dividas_pendentes_valor: totals.unpaidBillsTotal,
        agenda_de_contas: agenda.length > 0 ? agenda : "Nenhuma conta pendente!",
        meta_financeira: {
          nome: userProfile?.goal_name || "Reserva",
          valor_alvo: userProfile?.financial_goal,
          acumulado_para_meta: totals.netProfit,
          progresso: ((totals.netProfit / (userProfile?.financial_goal || 1)) * 100).toFixed(1) + '%'
        }
      };
    }
    if (name === 'add_bill' && session?.user) {
      const { data, error } = await supabase.from('bills').insert([{
        user_id: session.user.id,
        name: args.name,
        amount: args.amount,
        dueDate: args.dueDate,
        isPaid: false
      }]).select();
      if (data && !error) setBills(prev => [...prev, data[0]]);
      return { status: 'success', message: 'Conta agendada!' };
    }
    return { status: 'error', message: 'Função não encontrada' };
  };

  const processAIPrompt = async (prompt: string) => {
    if (!mentorService.current || isAILoading || (!prompt.trim() && pendingMedia.length === 0)) return;
    
    const displayMsg = prompt.trim() || (pendingMedia.length > 0 ? "[Mídia enviada]" : "");
    const userMsg = { role: Role.USER, text: displayMsg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsAILoading(true);
    setInputText('');
    
    const mediaToSend = [...pendingMedia];
    setPendingMedia([]);

    if (session?.user) await supabase.from('chat_messages').insert([{ user_id: session.user.id, ...userMsg }]);
    
    try {
      const response = await mentorService.current.sendMessage(displayMsg, mediaToSend, onToolCall);
      const modelMsg = { role: Role.MODEL, text: response.text, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, modelMsg]);
      if (session?.user) await supabase.from('chat_messages').insert([{ user_id: session.user.id, ...modelMsg }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: Role.MODEL, text: "Visão, deu erro no sistema. Tenta de novo!", timestamp: new Date().toISOString() }]);
    } finally {
      setIsAILoading(false);
    }
  };

  const navigateMonth = (step: number) => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + step);
    setViewDate(d);
  };

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  }, [viewDate]);

  const getDayStatus = (day: number) => {
    const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayBills = bills.filter(b => b.dueDate === dateStr);
    if (dayBills.length === 0) return null;
    return dayBills.every(b => b.isPaid) ? 'paid' : 'due';
  };

  const updateMotoProfile = async (updates: Partial<Profile>) => {
    if (!session?.user || !userProfile) return;
    const newProfile = { ...userProfile, ...updates } as Profile;
    setUserProfile(newProfile);
    await supabase.from('profiles').update(updates).eq('user_id', session.user.id);
  };

  const toggleBillPaid = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('bills').update({ isPaid: !currentStatus }).eq('id', id);
    if (!error) {
      setBills(prev => prev.map(b => b.id === id ? { ...b, isPaid: !currentStatus } : b));
    }
  };

  const deleteBill = async (id: string) => {
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (!error) {
      setBills(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleManualAddBill = async () => {
    if (!manualBillName || !manualBillAmount || !selectedDay || !session?.user) return;
    setIsDataSyncing(true);
    const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const { data, error } = await supabase.from('bills').insert([{
      user_id: session.user.id,
      name: manualBillName,
      amount: parseFloat(manualBillAmount),
      dueDate: dateStr,
      isPaid: false
    }]).select();

    if (data && !error) {
      setBills(prev => [...prev, data[0]]);
      setManualBillName(''); setManualBillAmount(''); setIsAddingManualBill(false);
    }
    setIsDataSyncing(false);
  };

  const handleAuth = async () => {
    setIsAuthLoading(true); setGlobalError(null);
    try {
      if (authMode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        if (error) throw error;
        setAuthMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) { setGlobalError(err.message); }
    finally { setIsAuthLoading(false); }
  };

  // Visual Chart Component
  const RenderLineChart = () => {
    const maxVal = Math.max(...chartData.map(d => Math.abs(d.net)), 100);
    const height = 100;
    const width = 300;
    const points = chartData.map((d, i) => {
      const x = (i / (chartData.length - 1)) * width;
      const y = height - ((d.net + maxVal) / (maxVal * 2)) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="w-full h-32 relative mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <path d={`M 0,${height} L ${points} L ${width},${height} Z`} fill="url(#grad)" />
          <polyline fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          {chartData.map((d, i) => (
            <circle key={i} cx={(i / (chartData.length - 1)) * width} cy={height - ((d.net + maxVal) / (maxVal * 2)) * height} r="4" fill="#020617" stroke="#10b981" strokeWidth="2" />
          ))}
        </svg>
        <div className="flex justify-between mt-2 px-1">
          {chartData.map((d, i) => <span key={i} className="text-[8px] font-black uppercase text-slate-500">{d.label}</span>)}
        </div>
      </div>
    );
  };

  if (isInitialLoading) {
    return (
      <div className="h-screen bg-[#020617] flex flex-col items-center justify-center p-6 bg-animate">
        <AppLogo className="w-24 h-24 relative animate-bounce" />
        <h1 className="text-3xl font-black italic uppercase tracking-tighter mt-8 text-white">MotoInvest</h1>
        <div className="mt-4 flex gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-6 bg-animate text-white overflow-y-auto">
        <div className="w-full max-w-sm space-y-8 animate-in zoom-in duration-500">
          <div className="text-center">
            <AppLogo className="w-24 h-24 mx-auto mb-4" />
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">MotoInvest</h1>
            <p className="text-emerald-400 font-bold text-[10px] tracking-widest uppercase">O Mentor do Motoca</p>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-[40px] space-y-4">
            <div className="flex bg-white/5 p-1 rounded-2xl">
              <button onClick={() => setAuthMode('login')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${authMode === 'login' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>Entrar</button>
              <button onClick={() => setAuthMode('register')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${authMode === 'register' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>Criar</button>
            </div>
            {authMode === 'register' && (
              <input type="text" placeholder="Seu Nome" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm outline-none" />
            )}
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm outline-none" />
            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm outline-none" />
            {globalError && <p className="text-rose-500 text-[10px] font-bold text-center">{globalError}</p>}
            <button onClick={handleAuth} disabled={isAuthLoading} className="w-full bg-emerald-600 py-4 rounded-2xl font-black uppercase shadow-xl active-scale disabled:opacity-50 flex items-center justify-center">
              {isAuthLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'COMEÇAR O CORRE'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen text-slate-100 overflow-hidden relative">
      <header className="px-6 py-4 bg-slate-900/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <AppLogo className="w-8 h-8" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-black uppercase italic tracking-tighter">MotoInvest</h1>
              {isDataSyncing && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
            </div>
            <p className="text-[9px] text-emerald-400 font-bold uppercase truncate max-w-[120px]">{currentUser?.name || 'Comandante'}</p>
          </div>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="p-2.5 bg-white/5 border border-white/10 rounded-xl active-scale"><LogoutIcon className="w-4 h-4 text-slate-400" /></button>
      </header>

      <main className="flex-1 overflow-hidden relative z-10">
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[90%] p-4 rounded-2xl shadow-xl ${msg.role === Role.USER ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-slate-900/80 backdrop-blur-md border border-white/5 rounded-bl-none'}`}>
                    {msg.role === Role.MODEL && <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5"><BotIcon className="w-3 h-3 text-emerald-400" /><span className="text-[9px] font-black uppercase text-emerald-400">Mentor IA</span></div>}
                    <MarkdownRenderer content={msg.text} />
                  </div>
                </div>
              ))}
              {isAILoading && (
                <div className="flex items-center gap-2 text-emerald-500 font-black text-[9px] uppercase animate-pulse ml-4">
                  <BotIcon className="w-3 h-3" /> Mentor analisando sua rota...
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Multimedia Bar */}
            {pendingMedia.length > 0 && (
              <div className="px-6 py-2 flex gap-2 overflow-x-auto bg-slate-900/40 border-t border-white/5">
                {pendingMedia.map((m, i) => (
                  <div key={i} className="relative group flex-shrink-0">
                    {m.mimeType.startsWith('image') ? (
                      <img src={`data:${m.mimeType};base64,${m.data}`} className="w-16 h-16 rounded-xl object-cover border border-emerald-500/50" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/50 text-emerald-500"><MicrophoneIcon className="w-6 h-6" /></div>
                    )}
                    <button onClick={() => setPendingMedia(p => p.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-rose-600 rounded-full p-0.5"><TrashIcon className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 bg-slate-900/80 backdrop-blur-xl border-t border-white/5">
              <div className="flex items-center gap-2 max-w-2xl mx-auto">
                <button onClick={() => imageInputRef.current?.click()} className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-slate-400 active-scale" title="Enviar Foto"><CameraIcon className="w-6 h-6" /></button>
                <button onClick={() => audioInputRef.current?.click()} className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-slate-400 active-scale" title="Enviar Áudio"><MicrophoneIcon className="w-6 h-6" /></button>
                <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleMediaUpload} />
                <input type="file" accept="audio/*" className="hidden" ref={audioInputRef} onChange={handleMediaUpload} />
                
                <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyPress={e => e.key === 'Enter' && processAIPrompt(inputText)} placeholder="Falar com o Mentor..." className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none" />
                <button onClick={() => processAIPrompt(inputText)} disabled={isAILoading} className="bg-emerald-600 p-3.5 rounded-2xl active-scale disabled:opacity-50"><SendIcon className="w-6 h-6 text-white" /></button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="h-full overflow-y-auto p-8 space-y-8 pb-24 custom-scrollbar animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-4xl font-black italic uppercase">Meu Corre</h2>
            <div className="space-y-6">
              <div className="bg-emerald-600/90 p-8 rounded-[40px] shadow-2xl border border-white/10">
                 <label className="block text-[10px] font-black text-white/70 uppercase mb-2 tracking-widest">Ganhos Brutos de Hoje</label>
                 <div className="flex items-center gap-3">
                   <span className="text-2xl font-black text-white/50">R$</span>
                   <input type="number" placeholder="0,00" value={tempEarning} onChange={e => setTempEarning(e.target.value)} className="w-full bg-transparent text-5xl font-black text-white outline-none placeholder:text-white/20" />
                 </div>
              </div>
              <div className="bg-rose-600/90 p-8 rounded-[40px] shadow-2xl border border-white/10">
                 <label className="block text-[10px] font-black text-white/70 uppercase mb-2 tracking-widest">Gastos do Dia</label>
                 <div className="flex items-center gap-3">
                   <span className="text-2xl font-black text-white/50">R$</span>
                   <input type="number" placeholder="0,00" value={tempExpense} onChange={e => setTempExpense(e.target.value)} className="w-full bg-transparent text-5xl font-black text-white outline-none placeholder:text-white/20" />
                 </div>
              </div>
              <button onClick={() => {
                const earnVal = parseFloat(tempEarning) || 0;
                const expVal = parseFloat(tempExpense) || 0;
                if (!earnVal && !expVal) return;
                setIsDataSyncing(true);
                const dateStr = new Date().toLocaleDateString('en-CA');
                const addEarning = earnVal ? supabase.from('earnings').insert([{ user_id: session.user.id, value: earnVal, date: dateStr }]).select() : Promise.resolve({ data: [] });
                const addExpense = expVal ? supabase.from('expenses').insert([{ user_id: session.user.id, value: expVal, date: dateStr }]).select() : Promise.resolve({ data: [] });
                Promise.all([addEarning, addExpense]).then(([e, ex]) => {
                  if (e.data && e.data.length) setDailyEarnings(p => [e.data[0], ...p]);
                  if (ex.data && ex.data.length) setDailyExpenses(p => [ex.data[0], ...p]);
                  setTempEarning(''); setTempExpense(''); setActiveTab('chat');
                  processAIPrompt(`Fechei o dia! Ganhos: R$ ${earnVal} | Gastos: R$ ${expVal}. O que me sugere?`);
                }).finally(() => setIsDataSyncing(false));
              }} disabled={isDataSyncing} className="w-full bg-white text-slate-900 py-6 rounded-3xl font-black uppercase shadow-2xl active-scale flex items-center justify-center gap-3">
                <WalletIcon className="w-5 h-5" /> FECHAR DIA E CALCULAR
              </button>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="h-full overflow-y-auto p-8 space-y-8 pb-24 custom-scrollbar animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-4xl font-black italic uppercase">Visão & Metas</h2>
            
            <div className="bg-slate-900 border border-white/5 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5"><GraphIcon className="w-32 h-32" /></div>
              <p className="text-[10px] font-black uppercase text-emerald-500 mb-1 tracking-[0.2em]">Sonho Principal</p>
              <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-4 leading-tight">{userProfile?.goal_name || 'Minha Meta'}</h3>
              
              <div className="space-y-4">
                <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden border border-white/5">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.5)]" style={{ width: `${Math.min(100, (totals.netProfit / (userProfile?.financial_goal || 1)) * 100)}%` }} />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase">Acumulado</p>
                    <p className="text-xl font-black text-white">R$ {totals.netProfit.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-emerald-500">{((totals.netProfit / (userProfile?.financial_goal || 1)) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-white/5 p-8 rounded-[40px]">
              <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Desempenho (6 meses)</h4>
              <RenderLineChart />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-emerald-500/20 p-6 rounded-[32px]">
                <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">Ganhos do Mês</p>
                <p className="text-2xl font-black">R$ {totals.totalEarned.toFixed(2)}</p>
              </div>
              <div className="bg-slate-900 border border-rose-500/20 p-6 rounded-[32px]">
                <p className="text-[9px] font-black text-rose-400 uppercase mb-1">Dívidas</p>
                <p className="text-2xl font-black text-rose-500">R$ {totals.unpaidBillsTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="h-full p-8 overflow-y-auto relative custom-scrollbar animate-in fade-in slide-in-from-bottom-4">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-4xl font-black italic uppercase">Agenda</h2>
                <div className="text-right flex items-center gap-2">
                    <button onClick={() => navigateMonth(-1)} className="p-1 active-scale"><ChevronLeftIcon /></button>
                    <span className="text-[10px] font-black uppercase text-emerald-400 min-w-[100px] text-center">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                    <button onClick={() => navigateMonth(1)} className="p-1 active-scale"><ChevronRightIcon /></button>
                </div>
             </div>
             
             {/* Calendário */}
             <div className="bg-white/5 p-6 rounded-[40px] border border-white/5 mb-8">
                <div className="grid grid-cols-7 gap-2 mb-4">{DAYS_OF_WEEK.map(d => <span key={d} className="text-[10px] font-black text-slate-600 text-center">{d}</span>)}</div>
                <div className="grid grid-cols-7 gap-2">
                   {Array.from({ length: calendarDays.firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                   {Array.from({ length: calendarDays.daysInMonth }).map((_, i) => {
                     const day = i + 1;
                     const status = getDayStatus(day);
                     return (
                       <button key={day} onClick={() => setSelectedDay(day)} className={`aspect-square flex flex-col items-center justify-center rounded-2xl border transition-all active-scale relative ${selectedDay === day ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-white/5'}`}>
                         <span className="text-xs font-black">{day}</span>
                         {status === 'due' && <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500" />}
                         {status === 'paid' && <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500" />}
                       </button>
                     );
                   })}
                </div>
             </div>

             {/* Todas as contas do mês */}
             <div className="space-y-6 mb-24">
                <div className="flex justify-between items-end">
                   <h3 className="text-lg font-black uppercase italic text-slate-400">Contas de {MONTHS[viewDate.getMonth()]}</h3>
                   <p className="text-[10px] font-black text-rose-500 uppercase">Total: R$ {totals.unpaidBillsTotal.toFixed(2)}</p>
                </div>

                <div className="space-y-4">
                   {totals.currentBills.map(bill => (
                      <div key={bill.id} className="bg-slate-900/60 border border-white/5 p-6 rounded-[32px] flex justify-between items-center shadow-xl animate-in fade-in slide-in-from-right-4">
                         <div className="flex-1 mr-4">
                            <div className="flex items-center gap-2 mb-1">
                               <span className="text-[10px] font-black text-slate-600 bg-white/5 px-2 py-0.5 rounded-full">Dia {new Date(bill.dueDate).getUTCDate()}</span>
                               <p className={`font-black uppercase text-sm leading-tight ${bill.isPaid ? 'line-through text-slate-600' : 'text-white'}`}>{bill.name}</p>
                            </div>
                            <p className="text-base font-black text-emerald-500">R$ {bill.amount.toFixed(2)}</p>
                         </div>
                         <div className="flex items-center gap-2">
                            <button onClick={() => toggleBillPaid(bill.id, bill.isPaid)} className={`px-4 py-2 rounded-xl text-[9px] font-black transition-all active-scale ${bill.isPaid ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                               {bill.isPaid ? 'PAGO' : 'PAGAR'}
                            </button>
                            <button onClick={() => deleteBill(bill.id)} className="p-2.5 text-rose-500 bg-rose-500/10 border border-rose-500/10 rounded-xl active-scale transition-all">
                               <TrashIcon className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                   ))}
                   {totals.currentBills.length === 0 && (
                      <div className="py-10 text-center opacity-30 italic text-xs font-bold uppercase tracking-widest bg-white/5 rounded-[32px]">
                         Nenhum boleto neste mês! 🙌
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'help' && (
          <div className="h-full overflow-y-auto p-8 space-y-8 pb-24 custom-scrollbar animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-4xl font-black italic uppercase">Ajustes</h2>
            <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[40px] space-y-6">
               <h3 className="text-xs font-black uppercase text-emerald-500 tracking-[0.2em]">Mudar Objetivo</h3>
               <div className="space-y-4">
                 <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Nome do Sonho</label>
                   <input type="text" placeholder="Ex: Moto Nova, Viagem, Reserva" value={userProfile?.goal_name || ''} onChange={e => updateMotoProfile({ goal_name: e.target.value })} className="w-full bg-white/5 rounded-2xl p-4 text-sm font-black outline-none border border-white/5 focus:ring-2 ring-emerald-500/30 transition-all text-white" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Valor Alvo (R$)</label>
                   <div className="bg-white/5 p-4 rounded-2xl flex justify-between items-center border border-white/5">
                     <span className="text-[11px] font-black uppercase text-slate-400 mr-2">R$</span>
                     <input type="number" value={userProfile?.financial_goal || ''} onChange={e => updateMotoProfile({ financial_goal: parseFloat(e.target.value) || 0 })} className="flex-1 bg-transparent text-right font-black text-emerald-500 outline-none text-lg p-1" placeholder="0" />
                   </div>
                 </div>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Day Details */}
      {selectedDay && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="sticky top-0 p-6 pb-4 flex justify-between items-center border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
            <div>
              <h3 className="font-black uppercase italic text-emerald-500 text-2xl">Dia {selectedDay}</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</p>
            </div>
            <button onClick={() => { setSelectedDay(null); setIsAddingManualBill(false); }} className="px-6 py-3 bg-rose-600 text-white rounded-2xl font-black text-[11px] uppercase active-scale">FECHAR</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {!isAddingManualBill ? (
              <button onClick={() => setIsAddingManualBill(true)} className="w-full bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 py-4 rounded-3xl font-black uppercase text-xs">+ ADICIONAR CONTA</button>
            ) : (
              <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-[32px] space-y-4 shadow-2xl">
                <input type="text" placeholder="Ex: MEI, Gasolina" value={manualBillName} onChange={e => setManualBillName(e.target.value)} className="w-full bg-white/5 rounded-2xl p-4 text-sm font-black outline-none border border-white/5" />
                <div className="bg-white/5 p-4 rounded-2xl flex justify-between items-center border border-white/5">
                  <span className="text-xl font-black">R$</span>
                  <input type="number" placeholder="0,00" value={manualBillAmount} onChange={e => setManualBillAmount(e.target.value)} className="bg-transparent text-right font-black text-emerald-500 outline-none text-lg" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleManualAddBill} className="flex-1 bg-emerald-600 py-4 rounded-2xl font-black uppercase text-[10px]">SALVAR</button>
                  <button onClick={() => setIsAddingManualBill(false)} className="px-6 bg-white/5 py-4 rounded-2xl font-black uppercase text-[10px]">CANCELAR</button>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {bills.filter(b => b.dueDate === `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`).map(bill => (
                <div key={bill.id} className="bg-slate-900 border border-white/5 p-6 rounded-[32px] flex justify-between items-center shadow-2xl">
                  <div className="flex-1 mr-4">
                    <p className={`font-black uppercase text-base ${bill.isPaid ? 'line-through text-slate-600' : 'text-white'}`}>{bill.name}</p>
                    <p className="text-sm font-bold text-emerald-500">R$ {bill.amount.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleBillPaid(bill.id, bill.isPaid)} className={`px-5 py-3 rounded-2xl text-[10px] font-black ${bill.isPaid ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>{bill.isPaid ? 'PAGO' : 'PAGAR'}</button>
                    <button onClick={() => deleteBill(bill.id)} className="p-3 text-rose-500 bg-rose-500/10 rounded-2xl active-scale"><TrashIcon className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="bg-slate-950/80 backdrop-blur-3xl border-t border-white/5 px-2 py-6 flex justify-around items-center sticky bottom-0 z-50">
        {[
          { id: 'chat', icon: BotIcon, label: 'Mentor' },
          { id: 'ledger', icon: WalletIcon, label: 'Corre' },
          { id: 'calendar', icon: CalendarIcon, label: 'Agenda' },
          { id: 'stats', icon: GraphIcon, label: 'Metas' },
          { id: 'help', icon: SupportIcon, label: 'Ajustes' },
        ].map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-2 px-4 ${activeTab === item.id ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'}`}>
            <div className={`p-2 rounded-2xl transition-all active-scale ${activeTab === item.id ? 'bg-emerald-500/10 scale-110 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : ''}`}><item.icon className="w-6 h-6" /></div>
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
