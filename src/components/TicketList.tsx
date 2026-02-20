
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Ticket, TicketStatus, User, UserRole, TicketPriority } from '../types';
import { useTheme } from './ThemeContext';
import { formatDuration } from '../utils';

interface TicketListProps {
  currentUser: User;
  tickets: Ticket[];
  users: User[];
  onAccept: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (ticket: Ticket) => void;
  onNewTicket: () => void;
  initialTab?: TicketStatus;
  navigateTo: (view: any, initialTab?: TicketStatus, ticketId?: string) => void;
}

const TicketList: React.FC<TicketListProps> = ({ currentUser, tickets, users, onAccept, onDelete, onEdit, onNewTicket, initialTab, navigateTo }) => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TicketStatus>(initialTab || TicketStatus.OPEN);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);

  const handleDeleteConfirm = () => {
    if (ticketToDelete) {
      onDelete(ticketToDelete.id);
      setTicketToDelete(null);
      setSelectedTicket(null);
    }
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const filteredTickets = tickets.filter(t => t.status === activeTab);

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.HIGH: return 'bg-red-500 text-white';
      case TicketPriority.NORMAL: return 'bg-primary text-white';
      case TicketPriority.LOW: return 'bg-slate-400 text-white';
      default: return 'bg-slate-200 text-slate-600';
    }
  };

  const getStatusColorClasses = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800';
      case TicketStatus.IN_PROGRESS:
        return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-800';
      case TicketStatus.COMPLETED:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-800';
      case TicketStatus.PAUSED:
        return 'bg-amber-100/50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700';
      default:
        return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-100 dark:border-gray-700';
    }
  };


  const isCreator = (ticket: Ticket) => {
    return ticket.requester.toLowerCase() === currentUser.name.toLowerCase();
  };

  const canAccept = (ticket: Ticket) => {
    return currentUser.role === UserRole.MECANICO && (ticket.status === TicketStatus.OPEN || ticket.status === TicketStatus.PAUSED);
  };

  const canEdit = (ticket: Ticket) => {
    return isCreator(ticket) && ticket.status === TicketStatus.OPEN;
  };

  const canDelete = (ticket: Ticket) => {
    return isCreator(ticket);
  };

  const getMechanicNames = (ticket: Ticket) => {
    const ids = ticket.mechanicIds || (ticket.mecanicoId ? [ticket.mecanicoId] : []);
    return ids.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ');
  };

  const getAssignedMechanic = (mecanicoId?: string) => {
    if (!mecanicoId) return null;
    return users.find(u => u.id === mecanicoId);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-sans">
      <header className="sticky top-0 z-20 flex items-center bg-white/70 dark:bg-slate-900/70 ios-blur px-6 py-5 justify-between border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-slate-900 dark:text-white text-xl font-black leading-tight tracking-tight font-display">Central de Ordens</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestão de Manutenções Industriais</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex md:hidden size-10 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-90 transition-all hover:text-primary"
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            <span className="material-symbols-outlined text-[22px]">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onNewTicket}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all hover:brightness-110"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              <span className="hidden sm:inline">Nova Ordem</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white/50 dark:bg-slate-900/50 ios-blur sticky top-[72px] lg:top-[76px] z-20 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex px-6 min-w-max gap-4">
          {[TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.PAUSED, TicketStatus.COMPLETED].map(status => (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`relative py-4 px-2 transition-all duration-300 group ${activeTab === status ? 'text-primary' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
              <p className="text-xs font-black uppercase tracking-widest">
                {status === TicketStatus.PAUSED ? 'Em pausa' : status === TicketStatus.OPEN ? 'Abertos' : status === TicketStatus.IN_PROGRESS ? 'Em Curso' : 'Finalizados'}
              </p>
              {activeTab === status && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_6px_rgba(59,130,246,0.5)]"></div>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex flex-col gap-5 p-6 pb-32 max-w-5xl mx-auto w-full">
        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-300 dark:text-slate-700">
            <div className="size-24 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-6xl opacity-40">inventory_2</span>
            </div>
            <p className="font-display font-bold text-lg">Nenhuma ordem encontrada</p>
            <p className="text-sm font-medium opacity-60">Todas as ordens desta categoria foram processadas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredTickets.map(ticket => {
              const assignedMechanic = getAssignedMechanic(ticket.mecanicoId);
              const allMechanics = getMechanicNames(ticket);

              return (
                <div
                  key={ticket.id}
                  onClick={() => {
                    if (ticket.status === TicketStatus.IN_PROGRESS) {
                      if (currentUser.id === ticket.mecanicoId || ticket.mechanicIds?.includes(currentUser.id)) {
                        navigateTo('active_ticket', undefined, ticket.id);
                        return;
                      }
                    }
                    setSelectedTicket(ticket);
                  }}
                  className="group bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 cursor-pointer active:scale-[0.98] flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-md">ID: {ticket.id}</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <h3 className="text-slate-900 dark:text-white text-base font-extrabold leading-tight font-display tracking-tight group-hover:text-primary transition-colors">{ticket.title}</h3>
                      </div>
                      <div className={`size-3 rounded-full ${activeTab === TicketStatus.OPEN ? 'bg-success animate-pulse' : activeTab === TicketStatus.IN_PROGRESS ? 'bg-primary animate-spin-slow' : activeTab === TicketStatus.PAUSED ? 'bg-warning' : 'bg-slate-300'}`}></div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span className="material-symbols-outlined text-[18px]">person</span>
                        <p className="text-xs font-bold">Solicitado por: <span className="text-slate-900 dark:text-slate-200">{ticket.requester}</span></p>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                          <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                            {ticket.galpao} <span className="text-slate-300 px-1">•</span> {ticket.grupo}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-primary">precision_manufacturing</span>
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            Setor: <span className="text-slate-900 dark:text-white">{ticket.sector}</span>
                          </p>
                        </div>
                      </div>

                      {(assignedMechanic || (ticket.mechanicIds && ticket.mechanicIds.length > 0)) && (
                        <div className="flex items-start gap-3 p-3 bg-primary/5 dark:bg-primary/20 rounded-2xl border border-primary/10">
                          <div className="size-8 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[18px]">engineering</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Responsáveis</p>
                            <p className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 truncate">
                              {allMechanics}
                            </p>
                            {ticket.status === TicketStatus.COMPLETED && ticket.totalTimeSpent && (
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mt-1.5">
                                <span className="material-symbols-outlined text-[14px]">timer</span>
                                <p className="text-[10px] font-black uppercase tracking-tighter">
                                  Duração: {formatDuration(ticket.totalTimeSpent)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Toque para detalhes</p>
                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-1">arrow_forward</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
        }
      </main >

      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-white/20">
            <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
              <div>
                <h2 className="font-black text-lg font-display tracking-tight text-slate-900 dark:text-white">Ficha Técnica da Ordem</h2>
                <p className="text-[10px] text-primary font-black uppercase tracking-widest">Referência: #{selectedTicket.id}</p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="size-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-90 transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>
            <div className="p-8 overflow-y-auto space-y-6 no-scrollbar">
              <div className="flex justify-between items-start gap-4">
                <h3 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">{selectedTicket.title}</h3>
                <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm ${getPriorityColor(selectedTicket.priority)}`}>
                  {selectedTicket.priority}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Localização</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedTicket.galpao} <span className="text-slate-300 mx-1">/</span> {selectedTicket.grupo}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Departamento</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedTicket.sector}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="size-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-500 text-sm">person</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Requerente Industrial</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedTicket.requester}</p>
                  </div>
                </div>

                {((selectedTicket.mechanicIds && selectedTicket.mechanicIds.length > 0) || selectedTicket.mecanicoId) && (
                  <div className="p-5 bg-primary/5 dark:bg-primary/20 rounded-3xl border border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-primary text-xl">engineering</span>
                      <p className="font-black text-[10px] text-primary uppercase tracking-widest">Colaboradores Alocados</p>
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{getMechanicNames(selectedTicket)}</p>
                    {selectedTicket.totalTimeSpent !== undefined && selectedTicket.totalTimeSpent > 0 && (
                      <div className="mt-4 flex items-center justify-between p-3 bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Esforço Acumulado</p>
                        <p className="text-sm font-black text-primary font-display">{formatDuration(selectedTicket.totalTimeSpent)}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Escopo da Ordem</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-5 rounded-3xl border border-slate-50 dark:border-slate-800 italic">
                    {selectedTicket.description || 'Nenhuma descrição técnica fornecida.'}
                  </p>
                </div>

                {selectedTicket.notes && (
                  <div className="p-5 bg-amber-50 dark:bg-amber-900/20 rounded-3xl border border-amber-100 dark:border-amber-900/50">
                    <p className="font-black text-[10px] uppercase text-amber-600 dark:text-amber-400 mb-2 tracking-widest">Nota Fiscal / Observações Técnicas:</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">"{selectedTicket.notes}"</p>
                  </div>
                )}
              </div>
            </div>
            <footer className="p-8 bg-slate-50/80 dark:bg-slate-800/40 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
              {canAccept(selectedTicket) && (
                <button
                  onClick={() => { onAccept(selectedTicket.id); setSelectedTicket(null); }}
                  className="flex-1 bg-success text-white font-black py-4 rounded-2xl shadow-xl shadow-success/20 active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">handyman</span> Iniciar Atendimento
                </button>
              )}
              {canEdit(selectedTicket) && (
                <button
                  onClick={() => { onEdit(selectedTicket); setSelectedTicket(null); }}
                  className="flex-1 bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">edit</span> Alterar Ordem
                </button>
              )}
              {canDelete(selectedTicket) && (
                <button
                  onClick={() => setTicketToDelete(selectedTicket)}
                  className="flex-1 bg-danger/10 text-danger font-black py-4 rounded-2xl active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">delete_forever</span> Cancelar
                </button>
              )}
              {!canAccept(selectedTicket) && !canEdit(selectedTicket) && !canDelete(selectedTicket) && (
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold py-4 rounded-2xl active:scale-95 transition-all text-xs uppercase tracking-widest"
                >
                  Fechar Visualização
                </button>
              )}
            </footer>
          </div>
        </div>
      )}
      {
        ticketToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl p-8 border border-white/10 animate-in zoom-in-95 duration-200">
              <div className="size-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-inner border border-red-500/20">
                <span className="material-symbols-outlined text-5xl">warning</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-3 font-display uppercase tracking-tight">Confirmar Exclusão</h3>
              <p className="text-sm font-bold text-slate-500 text-center mb-8 px-2 leading-relaxed">
                Você tem certeza que deseja cancelar a ordem <span className="text-red-500">#{ticketToDelete.id}</span>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDeleteConfirm}
                  className="w-full bg-red-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-500/20 active:scale-95 transition-all text-xs uppercase tracking-widest"
                >
                  Confirmar e Excluir
                </button>
                <button
                  onClick={() => setTicketToDelete(null)}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black py-4 rounded-2xl active:scale-95 transition-all text-xs uppercase tracking-widest"
                >
                  Retornar
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default TicketList;
