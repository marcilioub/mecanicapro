import React from 'react';

interface ConnectionMonitorProps {
    status: 'online' | 'offline' | 'loading' | 'error';
    lastSync: string | null;
    stats: {
        tickets: number;
        users: number;
        messages: number;
        machines: number;
    };
    onRefresh: () => void;
}

const ConnectionMonitor: React.FC<ConnectionMonitorProps> = ({ status, lastSync, stats, onRefresh }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'offline': return 'bg-slate-400';
            case 'loading': return 'bg-amber-500 animate-pulse';
            case 'error': return 'bg-red-500';
            default: return 'bg-slate-400';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'online': return 'Conectado';
            case 'offline': return 'Offline';
            case 'loading': return 'Sincronizando...';
            case 'error': return 'Erro de Conexão';
            default: return 'Desconhecido';
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden min-w-[280px]">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-3">
                    <div className={`size-2.5 rounded-full ${getStatusColor()} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                            {getStatusText()}
                        </h3>
                        {lastSync && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                Sincronizado às {new Date(lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={status === 'loading'}
                    className="size-8 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-primary hover:shadow-md active:scale-95 transition-all disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined text-sm ${status === 'loading' ? 'animate-spin' : ''}`}>
                        sync
                    </span>
                </button>
            </div>

            <div className="px-5 py-4 grid grid-cols-2 gap-4 bg-white dark:bg-slate-900">
                <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Chamados</p>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500 text-sm">confirmation_number</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{stats.tickets}</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Usuários</p>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500 text-sm">group</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{stats.users}</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Mensagens</p>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-500 text-sm">forum</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{stats.messages}</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Máquinas</p>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500 text-sm">precision_manufacturing</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{stats.machines}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConnectionMonitor;
