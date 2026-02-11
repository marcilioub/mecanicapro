
import React, { useState, useEffect } from 'react';
import { Ticket, Machine, User } from '../types';
import { getMaintenanceAdvice } from '../geminiService';
import { formatSeconds } from '../utils';

interface ActiveTicketProps {
  ticket: Ticket;
  machine: Machine;
  onComplete: (notes: string, timeSpent: number) => void;
  onPause: (reason: string, timeSpent: number) => void;
  onTransfer: (reason: string) => void;
  onBack: () => void;
  users: User[];
}

const ActiveTicket: React.FC<ActiveTicketProps> = ({ ticket, machine, onComplete, onPause, onTransfer, onBack, users }) => {
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [notes, setNotes] = useState('');
  const [aiAdvice, setAiAdvice] = useState<{ possibleCause: string, steps: string[] } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Estados para os novos fluxos
  const [actionType, setActionType] = useState<'pause' | 'transfer' | 'finish' | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const start = ticket.startedAt ? new Date(ticket.startedAt).getTime() : Date.now();
    const interval = setInterval(() => {
      setSessionSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [ticket.startedAt]);


  const handleAiAdvice = async () => {
    setIsAiLoading(true);
    const advice = await getMaintenanceAdvice(ticket.description, machine.name);
    setAiAdvice(advice);
    setIsAiLoading(false);
  };

  const handleConfirmAction = () => {
    if (!reason.trim()) {
      alert("Por favor, informe a observação. Este campo é obrigatório.");
      return;
    }
    if (actionType === 'pause') {
      onPause(reason, sessionSeconds);
    } else if (actionType === 'transfer') {
      onTransfer(reason);
    } else if (actionType === 'finish') {
      onComplete(reason, sessionSeconds);
    }
    setActionType(null);
    setReason('');
  };

  const getMechanicNames = () => {
    const ids = ticket.mechanicIds || (ticket.mecanicoId ? [ticket.mecanicoId] : []);
    return ids.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ');
  };

  return (
    <div className="flex flex-col min-h-screen relative bg-background-light dark:bg-background-dark font-sans">
      <header className="bg-white/70 dark:bg-slate-900/70 ios-blur border-b border-slate-200 dark:border-slate-800 p-5 lg:px-8 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="size-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-90 transition-all hover:text-primary"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-black font-display tracking-tight text-slate-900 dark:text-white leading-none">Ordem Ativa</h1>
            <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">Ref: #{ticket.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
          <span className="flex h-2 w-2 rounded-full bg-success animate-pulse"></span>
          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Em Execução</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 no-scrollbar pb-32">
        <div className="bg-white/50 dark:bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 lg:p-10 border border-white dark:border-slate-800 shadow-premium flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12">
            <span className="material-symbols-outlined text-[12rem]">timer</span>
          </div>
          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black mb-3 uppercase tracking-[0.2em] leading-none">Cronômetro de Atendimento</span>
          <div className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 dark:text-white font-display">
            {formatSeconds(sessionSeconds)}
          </div>
          {(ticket.totalTimeSpent || 0) > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/50 w-full max-w-xs">
              <span className="text-slate-400 text-[9px] uppercase font-black tracking-widest leading-none block mb-2">Esforço Total Consolidado</span>
              <p className="text-lg font-black text-primary font-display">{formatSeconds((ticket.totalTimeSpent || 0) + sessionSeconds)}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="group bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl">precision_manufacturing</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ativo Industrial</span>
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-white font-display tracking-tight">{machine.name}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-block">S/N: {machine.serial}</p>
          </div>

          <div className="group bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 bg-danger/10 rounded-2xl flex items-center justify-center text-danger">
                <span className="material-symbols-outlined text-2xl">report_problem</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Falha Reportada</span>
            </div>

            <div className="space-y-3">
              {ticket.selectedProblems && ticket.selectedProblems.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ticket.selectedProblems.map((p, idx) => (
                    <span key={idx} className="px-2 py-1 rounded-lg bg-danger/5 text-danger text-[10px] font-black uppercase tracking-tighter border border-danger/10">
                      {p}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed italic">
                "{ticket.customDescription || ticket.description}"
              </p>
            </div>
          </div>

          <div className="group bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                <span className="material-symbols-outlined text-2xl">location_on</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ponto de Serviço</span>
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-white font-display tracking-tight">{machine.location}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 block">Grupo: {ticket.grupo || 'N/A'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 bg-primary/5 dark:bg-primary/20 rounded-3xl border border-primary/20 shadow-inner">
          <div className="size-12 bg-primary rounded-2xl shrink-0 flex items-center justify-center text-white shadow-lg shadow-primary/25">
            <span className="material-symbols-outlined text-2xl">engineering</span>
          </div>
          <div>
            <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-1">Equipe Técnica / Operador</p>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">
              {getMechanicNames()}
              {ticket.operator && (
                <span className="text-slate-400 font-bold ml-2">
                  <span className="text-[10px] uppercase mr-1">Op:</span> {ticket.operator}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={handleAiAdvice}
            disabled={isAiLoading}
            className="w-full flex items-center justify-center gap-4 p-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-[2rem] shadow-2xl hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="material-symbols-outlined text-2xl relative z-10">{isAiLoading ? 'sync' : 'psychology'}</span>
            <span className="font-black text-sm uppercase tracking-widest relative z-10">{isAiLoading ? 'Consultando IA...' : 'Análise Preditiva Gemini AI'}</span>
          </button>
        </div>

        {aiAdvice && (
          <div className="bg-white/80 dark:bg-indigo-900/10 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800/50 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-indigo-700 dark:text-indigo-400 mb-6">
              <div className="size-12 bg-indigo-100 dark:bg-indigo-800/40 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">auto_awesome</span>
              </div>
              <div>
                <h3 className="font-black text-base font-display uppercase tracking-tight">Insights de Manutenção</h3>
                <p className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest">IA Generativa de Diagnóstico</p>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-50 dark:border-indigo-900/30 mb-6 shadow-sm">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Causa Provável Detectada</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{aiAdvice.possibleCause}</p>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] pl-1">Protocolo de Resolução:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {aiAdvice.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900 border border-indigo-50 dark:border-indigo-900/20 rounded-2xl shadow-sm group hover:border-indigo-200 transition-all">
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center text-xs font-black font-display shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      {idx + 1}
                    </div>
                    <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
          <button
            onClick={() => setActionType('finish')}
            className="w-full bg-slate-900 dark:bg-success text-white font-black py-6 rounded-[1.75rem] shadow-2xl shadow-success/10 transition-all flex items-center justify-center gap-3 active:scale-95 hover:brightness-110 text-sm uppercase tracking-[0.2em]"
          >
            <span className="material-symbols-outlined text-2xl">verified</span>
            <span>Finalizar Chamado</span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setActionType('pause')}
              className="bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-500 font-black py-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 shadow-sm transition-all flex items-center justify-center gap-3 active:scale-[0.98] text-xs uppercase tracking-widest"
            >
              <span className="material-symbols-outlined">pause_circle</span>
              <span>Pausar Chamado</span>
            </button>
            <button
              onClick={() => setActionType('transfer')}
              className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black py-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 shadow-sm transition-all flex items-center justify-center gap-3 active:scale-[0.98] text-xs uppercase tracking-widest"
            >
              <span className="material-symbols-outlined">move_down</span>
              <span>Setorizar</span>
            </button>
          </div>
        </div>
      </div>

      {actionType && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 animate-in slide-in-from-bottom-6 duration-400 border border-white/10">
            <div className={`size-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${actionType === 'pause' ? 'bg-amber-100 text-amber-600 shadow-amber-500/10' : actionType === 'finish' ? 'bg-emerald-100 text-emerald-600 shadow-emerald-500/10' : 'bg-primary/10 text-primary shadow-primary/10'}`}>
              <span className="material-symbols-outlined text-4xl">{actionType === 'pause' ? 'pause_circle' : actionType === 'finish' ? 'verified' : 'move_down'}</span>
            </div>
            <h3 className="text-xl font-black font-display tracking-tight text-slate-900 dark:text-white mb-2 uppercase">
              {actionType === 'pause' ? 'Confirmar Pausa' : actionType === 'finish' ? 'Finalizar Chamado' : 'Setorizar Manutenção'}
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-bold uppercase tracking-widest leading-relaxed">
              {actionType === 'pause' ? 'Descreva o que foi feito e o que ainda falta:' : actionType === 'finish' ? 'Descreva o que foi realizado para conclusão:' : 'Informe o departamento de destino e motivo:'}
            </p>
            <textarea
              autoFocus
              required
              className="w-full rounded-[1.5rem] border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 p-5 mb-8 text-sm font-medium min-h-[120px]"
              placeholder="Digite aqui as observações obrigatórias..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            ></textarea>
            <div className="flex gap-4">
              <button
                onClick={() => { setActionType(null); setReason(''); }}
                className="flex-1 py-4 text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-all active:scale-95 text-[10px]"
              >
                Retornar
              </button>
              <button
                onClick={handleConfirmAction}
                className={`flex-2 px-8 py-4 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs ${actionType === 'pause' ? 'bg-amber-500 shadow-amber-500/20' : actionType === 'finish' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-primary shadow-primary/20'}`}
              >
                Processar Operação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveTicket;
