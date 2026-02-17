import React, { useState, useMemo } from 'react';
import {
  User,
  Ticket,
  Machine,
  TicketStatus,
  UserStatus,
  UserRole,
  ActivityLog,
  AppState
} from '../types';
import { useTheme } from './ThemeContext';
import { formatDate, formatSeconds } from '../utils';
import defaultAvatar from '../assets/default-avatar.svg';
import Avatar from './Avatar';
import ActivityTimeline from './ActivityTimeline';

interface DashboardProps {
  state: AppState; // Recebe o estado global conforme definido no App.tsx
  onGenerateReport?: (mecanicoId: string, period: string, start?: string, end?: string) => void;
  onViewActiveTicket?: () => void;
  onViewOpenTickets?: () => void;
  onViewPausedTickets?: () => void;
  onViewProfile?: () => void;
  onAcceptTicket?: (id: string) => void;
  onDeleteTicket?: (id: string) => void;
  onOpenAdminPanel?: () => void;
  onNewTicket?: () => void;
  navigateTo: (view: AppState['view'], initialTab?: TicketStatus) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  state, onGenerateReport, onViewActiveTicket, onViewOpenTickets, onViewPausedTickets, onViewProfile,
  onAcceptTicket, onDeleteTicket, onOpenAdminPanel, onNewTicket, navigateTo
}) => {
  const { theme, toggleTheme } = useTheme();

  // Extração segura dos dados do estado
  const user = state?.currentUser || { name: 'Usuário', role: UserRole.MECANICO, avatar: '' } as any;
  const tickets = state?.tickets || [];
  const users = state?.users || [];
  const activityLogs = state?.activityLogs || [];

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [selectedMecanicoId, setSelectedMecanicoId] = useState<string>('all');
  const [reportPeriod, setReportPeriod] = useState<string>('last-7');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Filtros com segurança (Optional Chaining)
  const openTicketsList = tickets.filter(t => t?.status === TicketStatus.OPEN);
  const openCount = openTicketsList.length;
  const inProgressCount = tickets.filter(t => t?.status === TicketStatus.IN_PROGRESS).length;

  const personalStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const solvedToday = tickets.filter(t =>
      (t?.mecanicoId === user?.id || t?.mechanicIds?.includes(user?.id)) &&
      t?.status === TicketStatus.COMPLETED &&
      t?.completedAt?.startsWith(today)
    ).length;

    const pausedByUser = tickets.filter(t =>
      t?.status === TicketStatus.PAUSED &&
      t?.pausedByUserId === user?.id
    ).length;

    return { solvedToday, pausedByUser };
  }, [tickets, user?.id]);

  const hasActiveTicket = tickets.some(t =>
    t?.status === TicketStatus.IN_PROGRESS &&
    (t?.mecanicoId === user?.id || t?.mechanicIds?.includes(user?.id))
  );

  const displayName = user?.nickname || user?.name?.split(' ')[0] || 'Técnico';

  const getStatusConfig = (status: UserStatus) => {
    switch (status) {
      case UserStatus.AVAILABLE: return { color: 'bg-emerald-500', text: 'Livre', icon: 'check_circle' };
      case UserStatus.BUSY: return { color: 'bg-amber-500', text: 'Ocupado', icon: 'error' };
      default: return { color: 'bg-slate-400', text: 'Inativo', icon: 'do_not_disturb_on' };
    }
  };

  const currentStatus = hasActiveTicket ? UserStatus.BUSY : (user?.status || UserStatus.AVAILABLE);
  const statusConfig = getStatusConfig(currentStatus);
  const mechanics = users.filter(u => u?.role === UserRole.MECANICO);


  const getLogIcon = (action: string) => {
    const act = action?.toLowerCase() || '';
    if (act.includes('criou')) return { icon: 'add_circle', color: 'text-primary bg-primary/10' };
    if (act.includes('finalizou')) return { icon: 'check_circle', color: 'text-success bg-success/10' };
    if (act.includes('excluiu')) return { icon: 'delete', color: 'text-red-500 bg-red-500/10' };
    return { icon: 'history', color: 'text-slate-400 bg-slate-50' };
  };

  return (
    <div className="flex flex-col h-auto min-h-screen w-full relative bg-background-light dark:bg-background-dark font-sans animate-in fade-in duration-500">

      {/* HEADER INTEGRADO */}
      <header className="sticky top-0 z-50 flex items-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4 lg:px-8 justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar src={user?.avatar || null} name={user?.name} className="bg-center bg-no-repeat aspect-square bg-cover rounded-2xl size-11 ring-2 ring-primary/20 shadow-sm" />
            <div className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-white dark:border-slate-800 ${statusConfig.color}`}></div>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">{user?.name}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user?.role}</p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <h2 className="text-slate-900 dark:text-white text-xl font-black tracking-tight">Mecânica<span className="text-primary italic">Pro</span></h2>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 mt-0.5">
            <span className="flex h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Sistema Online</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigateTo('tickets')} className="flex size-10 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 relative">
            <span className="material-symbols-outlined text-[24px]">notifications</span>
            {openCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white bg-red-500 animate-bounce">{openCount}</span>}
          </button>
        </div>
      </header>

      {/* BOAS VINDAS */}
      <div className="px-5 pt-8 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black text-primary uppercase tracking-widest mb-1.5">Gestão Técnica em Tempo Real</p>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {(() => {
                const hour = new Date().getHours();
                if (hour < 12) return 'Bom dia';
                if (hour < 18) return 'Boa tarde';
                return 'Boa noite';
              })()}, {displayName} 🛠️
            </h1>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-white text-[11px] font-black uppercase tracking-wider shadow-lg ${statusConfig.color}`}>
            <span className="material-symbols-outlined text-[18px]">{statusConfig.icon}</span>
            <span>{statusConfig.text}</span>
          </div>
        </div>
      </div>

      {/* MÉTRICAS */}
      <div className="px-5 mt-8 lg:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <MetricCard
            label="Resolvidos Hoje"
            value={personalStats.solvedToday}
            icon="check_circle"
            color="text-success"
            sub="Finalizados"
          />

          <MetricCard
            label="Em Pausa"
            value={personalStats.pausedByUser}
            icon="pause_circle"
            color="text-amber-500"
            sub="Aguardando"
            onClick={() => navigateTo('tickets', TicketStatus.PAUSED)}
          />

          <MetricCard
            label="Fila Global"
            value={openCount}
            icon="assignment"
            color="text-primary"
            sub="Pendentes"
            onClick={() => navigateTo('tickets', TicketStatus.OPEN)}
          />

          <MetricCard
            label="Execução Atual"
            value={inProgressCount}
            icon="engineering"
            color="text-red-500"
            sub="Ativos"
            onClick={() => navigateTo('tickets', TicketStatus.IN_PROGRESS)}
          />

        </div>
      </div>

      {/* LINHA DO TEMPO */}
      <div className="px-5 mt-8 lg:px-10 grid grid-cols-1 lg:grid-cols-3 gap-8 pb-32">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Linha do Tempo</h3>
          <div className="space-y-3">
            <ActivityTimeline limit={6} />
          </div>
        </div>

        {/* RELATÓRIOS */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Ações Rápidas</h3>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4">
            <button
              onClick={() => navigateTo('tickets')}
              className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
            >
              Ver Todos os Chamados
            </button>
            <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">
              MecânicaPro v2.0 - Advanced Analytics
            </p>
            {hasActiveTicket && (
              <button
                onClick={() => {
                  const activeTicket = tickets.find(t => t.status === TicketStatus.IN_PROGRESS && (t.mecanicoId === user.id || t.mechanicIds?.includes(user.id)));
                  if (activeTicket) {
                    navigateTo('active_ticket', undefined, activeTicket.id);
                  }
                }}
                className="w-full h-14 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">engineering</span>
                Retomar Chamado Ativo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente Interno para os Cards de Métrica
const MetricCard: React.FC<{ label: string, value: number, icon: string, color: string, sub: string, onClick?: () => void }> = ({ label, value, icon, color, sub, onClick }) => (
  <div
    onClick={onClick}
    className={`group p-5 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
  >
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <div className="flex items-end justify-between mt-2">
      <span className="text-3xl font-black text-slate-900 dark:text-white font-display">{value}</span>
      <div className={`flex items-center gap-1 ${color} bg-current/10 px-2 py-0.5 rounded-full font-black text-[9px] uppercase`}>
        <span className="material-symbols-outlined text-[12px]">{icon}</span> {sub}
      </div>
    </div>
  </div>
);

export default Dashboard;