import React, { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import defaultAvatar from '../assets/default-avatar.svg';
import { TicketStatus, UserRole } from '../types';

interface LayoutProps {
    children: ReactNode;
    activeView: string;
    onNavigate: (view: any, initialTab?: TicketStatus) => void;
    openTicketsCount: number;
    unreadMessagesCount: number;
    onLogout: () => void;
    onNewTicket: () => void;
}

const Layout: React.FC<LayoutProps> = ({
    children,
    activeView,
    onNavigate,
    openTicketsCount,
    unreadMessagesCount,
    onLogout,
    onNewTicket
}) => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();

    if (!user) return <>{children}</>;

    return (
        <div className="min-h-screen flex flex-col md:flex-row relative overflow-x-hidden bg-background-light dark:bg-background-dark">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-white/80 dark:bg-slate-900/80 ios-blur border-r border-slate-200 dark:border-slate-800 sticky top-0 h-screen z-50">
                <div className="p-8 flex items-center gap-4">
                    <div className="size-11 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25 transform rotate-3">
                        <span className="material-symbols-outlined text-white text-2xl">settings_suggest</span>
                    </div>
                    <div>
                        <h2 className="text-slate-900 dark:text-white text-xl font-extrabold tracking-tight font-display">Mecânica<span className="text-primary italic">Pro</span></h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Industrial Management</p>
                    </div>
                </div>

                <div className="px-4 mb-2">
                    <button
                        onClick={onNewTicket}
                        className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all group"
                    >
                        <div className="size-8 rounded-xl bg-white/20 dark:bg-slate-900/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-xl group-hover:rotate-90 transition-transform">add</span>
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest">Nova Ordem</span>
                    </button>
                </div>

                <nav className="flex-1 px-4 py-4 flex flex-col gap-3">
                    <button
                        onClick={() => onNavigate('dashboard')}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeView === 'dashboard' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                    >
                        <span className={`material-symbols-outlined transition-transform group-hover:scale-110 ${activeView === 'dashboard' ? 'filled' : ''}`}>dashboard</span>
                        <span className="font-semibold text-sm">Painel Principal</span>
                    </button>

                    <button
                        onClick={() => onNavigate('tickets', TicketStatus.OPEN)}
                        className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeView === 'tickets' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`material-symbols-outlined transition-transform group-hover:scale-110 ${activeView === 'tickets' ? 'filled' : ''}`}>assignment</span>
                            <span className="font-semibold text-sm">Ordens de Serviço</span>
                        </div>
                        {openTicketsCount > 0 && (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ring-2 ${activeView === 'tickets' ? 'bg-white text-primary ring-white/20' : 'bg-primary text-white ring-primary/20'}`}>
                                {openTicketsCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => onNavigate('users')}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeView === 'users' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                    >
                        <span className={`material-symbols-outlined transition-transform group-hover:scale-110 ${activeView === 'users' ? 'filled' : ''}`}>group</span>
                        <span className="font-semibold text-sm">Equipe Técnica</span>
                    </button>

                    <button
                        onClick={() => onNavigate('chat')}
                        className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeView === 'chat' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`material-symbols-outlined transition-transform group-hover:scale-110 ${activeView === 'chat' ? 'filled' : ''}`}>forum</span>
                            <span className="font-semibold text-sm">Chat</span>
                        </div>
                        {unreadMessagesCount > 0 && (
                            <span className="bg-danger text-white text-[11px] font-bold px-2 py-0.5 rounded-full ring-2 ring-danger/20 animate-pulse">
                                {unreadMessagesCount}
                            </span>
                        )}
                    </button>

                    {user.role === UserRole.ADMIN && (
                        <button
                            onClick={() => onNavigate('admin_panel')}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeView === 'admin_panel' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                        >
                            <span className={`material-symbols-outlined transition-transform group-hover:scale-110 ${activeView === 'admin_panel' ? 'filled' : ''}`}>settings</span>
                            <span className="font-semibold text-sm">Configurações</span>
                        </button>
                    )}
                </nav>

                <div className="p-4 mx-4 mb-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-3 p-1 mb-3">
                            <div className="relative">
                                <div className="size-11 rounded-xl bg-cover bg-center ring-2 ring-white dark:ring-slate-700 shadow-sm" style={{ backgroundImage: `url(${user.avatar || defaultAvatar})` }}></div>
                            <div className="absolute -bottom-1 -right-1 size-3.5 bg-success border-2 border-white dark:border-slate-800 rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none mt-0.5">{user.role}</p>
                        </div>
                        {/* Toggle Theme Mini Button */}
                        <button
                            onClick={toggleTheme}
                            className="size-8 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-primary shadow-sm active:scale-95 transition-all"
                            title="Alternar Tema"
                        >
                            <span className="material-symbols-outlined text-[18px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                        </button>
                    </div>
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-danger hover:bg-danger/10 rounded-xl transition-all duration-300 group"
                    >
                        <span className="material-symbols-outlined text-xl transition-transform group-hover:-translate-x-1">logout</span>
                        <span className="font-bold text-xs">Finalizar Sessão</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col md:h-screen md:overflow-y-auto no-scrollbar">
                {children}
            </main>

            {/* Mobile Actions FAB */}
            <button
                onClick={onNewTicket}
                className="md:hidden fixed bottom-24 right-6 size-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-all border border-white/20"
            >
                <span className="material-symbols-outlined text-2xl">add</span>
            </button>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-6 left-6 right-6 h-18 bg-white/80 dark:bg-slate-900/80 ios-blur border border-white/20 dark:border-slate-700/30 rounded-3xl flex items-center justify-around px-2 shadow-premium z-40">
                <button onClick={() => onNavigate('dashboard')} className={`flex flex-col items-center justify-center size-14 rounded-2xl transition-all ${activeView === 'dashboard' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-400'}`}>
                    <span className={`material-symbols-outlined ${activeView === 'dashboard' ? 'filled' : ''}`}>dashboard</span>
                    <span className="text-[9px] font-bold mt-0.5">Painel</span>
                </button>
                <button onClick={() => onNavigate('tickets', TicketStatus.OPEN)} className={`flex flex-col items-center justify-center size-14 rounded-2xl relative transition-all ${activeView === 'tickets' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-400'}`}>
                    <span className={`material-symbols-outlined ${activeView === 'tickets' ? 'filled' : ''}`}>assignment</span>
                    {openTicketsCount > 0 && <div className="absolute top-1.5 right-1.5 bg-danger text-white text-[9px] font-bold size-4.5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">{openTicketsCount}</div>}
                    <span className="text-[9px] font-bold mt-0.5">Ordens</span>
                </button>
                <button onClick={() => onNavigate('users')} className={`flex flex-col items-center justify-center size-14 rounded-2xl transition-all ${activeView === 'users' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-400'}`}>
                    <span className={`material-symbols-outlined ${activeView === 'users' ? 'filled' : ''}`}>group</span>
                    <span className="text-[9px] font-bold mt-0.5">Equipe</span>
                </button>
                <button onClick={() => onNavigate('chat')} className={`flex flex-col items-center justify-center size-14 rounded-2xl relative transition-all ${activeView === 'chat' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-400'}`}>
                    <span className={`material-symbols-outlined ${activeView === 'chat' ? 'filled' : ''}`}>forum</span>
                    {unreadMessagesCount > 0 && <div className="absolute top-1.5 right-1.5 bg-danger text-white text-[9px] font-bold size-4.5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">{unreadMessagesCount}</div>}
                    <span className="text-[9px] font-bold mt-0.5">Chat</span>
                </button>
                {user.role === UserRole.ADMIN && (
                    <button onClick={() => onNavigate('admin_panel')} className={`flex flex-col items-center justify-center size-14 rounded-2xl transition-all ${activeView === 'admin_panel' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-400'}`}>
                        <span className={`material-symbols-outlined ${activeView === 'admin_panel' ? 'filled' : ''}`}>settings</span>
                        <span className="text-[9px] font-bold mt-0.5">Config</span>
                    </button>
                )}
                <button onClick={onLogout} className="flex flex-col items-center justify-center size-14 rounded-2xl text-slate-400">
                    <span className="material-symbols-outlined">logout</span>
                    <span className="text-[9px] font-bold mt-0.5">Sair</span>
                </button>
            </nav>
        </div>
    );
};

export default Layout;
