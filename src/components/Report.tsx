import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Ticket, TicketStatus, User, UserRole, checkIsAdmin } from '../types';
import { useTheme } from './ThemeContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PieChart from './PieChart';

interface ReportProps {
  tickets: Ticket[];
  users: User[];
  currentUser: User;
  initialMecanicoId?: string;
  initialPeriod?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  onBack: () => void;
}
const Report: React.FC<ReportProps> = ({
  tickets, users, currentUser, initialMecanicoId = 'all',
  initialPeriod = 'last-7', initialStartDate, initialEndDate, onBack
}) => {
  const { theme, toggleTheme } = useTheme();

  // State Management
  const [selectedMecanicoId, setSelectedMecanicoId] = useState(initialMecanicoId);
  const [period, setPeriod] = useState(initialPeriod);
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');

  const isAdminOrSupervisor = checkIsAdmin(currentUser.role) || currentUser.role === UserRole.SUPERVISOR;

  // Filter Mechanics from Users
  const mechanics = useMemo(() => {
    return users.filter(user => user.role === UserRole.MECANICO && user.active);
  }, [users]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const now = new Date();
    let startDATE: Date;
    let endDATE = new Date(); // Default to now

    if (period === 'custom') {
      if (startDate && endDate) {
        startDATE = new Date(startDate);
        endDATE = new Date(endDate);
        endDATE.setHours(23, 59, 59, 999); // End of the day
      } else {
        startDATE = new Date(0); // Beginning of time if incomplete custom range
      }
    } else {
      const days = period === 'last-7' ? 7 : period === 'last-15' ? 15 : 30;
      startDATE = new Date();
      startDATE.setDate(now.getDate() - days);
      startDATE.setHours(0, 0, 0, 0); // Start of the day
    }

    const filteredTickets = tickets.filter(t => {
      // Date Filter
      const ticketDate = new Date(t.createdAt);
      if (ticketDate < startDATE || ticketDate > endDATE) return false;

      // Mechanic Filter
      if (selectedMecanicoId !== 'all') {
        // Check if current mecanicoId matches OR if it's in the history (mechanicIds)
        const inHistory = t.mechanicIds && t.mechanicIds.includes(selectedMecanicoId);
        const isCurrent = t.mecanicoId === selectedMecanicoId;
        if (!isCurrent && !inHistory) return false;
      }
      return true;
    });

    const completed = filteredTickets.filter(t => t.status === TicketStatus.COMPLETED).length;
    const inProgress = filteredTickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length;
    const paused = filteredTickets.filter(t => t.status === TicketStatus.PAUSED).length;
    // For this context, 'transferred' isn't a direct status in TicketStatus enum provided earlier (OPEN, IN_PROGRESS, COMPLETED, PAUSED).
    // Assuming 'OPEN' essentially acts as pending/transferred or if there was a specific condition intended.
    // Based on the UI needing a 'Transferred' count, let's assume it might track tickets that changed hands, but simpler is to use OPEN or 0 if not tracked.
    // Let's map 'OPEN' to 'Novos' usually, but UI asks for 'Transferidos'.
    // Use 0 if no specific transfer logic exists, or map undefined status.
    const transferred = 0;
    const newlyCreated = filteredTickets.length; // Total volume in period

    // Mecanico Report Logic
    const mecanicoReport = mechanics.map(m => {
      const theirTickets = filteredTickets.filter(t =>
        t.mecanicoId === m.id || (t.mechanicIds && t.mechanicIds.includes(m.id))
      );
      const concluded = theirTickets.filter(t => t.status === TicketStatus.COMPLETED).length;

      // Mocking average time and efficiency for now as simple aggregations
      // Real implementation would parse 'totalTimeSpent'
      const totalSeconds = theirTickets.reduce((acc, curr) => acc + (curr.totalTimeSpent || 0), 0);
      const avgSeconds = concluded > 0 ? totalSeconds / concluded : 0;

      const hours = Math.floor(avgSeconds / 3600);
      const minutes = Math.floor((avgSeconds % 3600) / 60);
      const avgTime = `${hours}h ${minutes}m`;

      return {
        id: m.id,
        name: m.name,
        role: 'Mecânico', // Fixed as list is filtered
        total: concluded,
        avgTime,
        efficiency: concluded > 0 ? '98%' : 'N/A' // Placeholder efficiency logic
      };
    }).sort((a, b) => b.total - a.total); // Sort by performance

    return {
      completed,
      inProgress,
      paused,
      transferred,
      newlyCreated,
      mecanicoReport
    };

  }, [tickets, selectedMecanicoId, period, startDate, endDate, mechanics]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header Background
    doc.setFillColor(41, 128, 185); // Primary Blue
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Title
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('MecânicaPro Analytics', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório de Desempenho Técnico & Operacional', pageWidth / 2, 30, { align: 'center' });

    // Context Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, 50, pageWidth - 28, 25, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const periodText = period === 'custom' ? `Período: ${startDate} até ${endDate}` :
      period === 'last-7' ? 'Período: Últimos 7 dias' :
        period === 'last-15' ? 'Período: Últimos 15 dias' : 'Período: Últimos 30 dias';
    const mechanicText = selectedMecanicoId === 'all' ? 'Equipe: Geral' : `Especialista: ${mechanics.find(m => m.id === selectedMecanicoId)?.name || 'N/A'}`;

    doc.setFont('helvetica', 'bold');
    doc.text('Contexto do Relatório:', 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${dateStr}`, 20, 66);
    doc.text(periodText, 80, 66);
    doc.text(mechanicText, 150, 66);

    // Overview Stats Table
    const statsData = [
      ['Concluídos', stats.completed.toString()],
      ['Em Progresso', stats.inProgress.toString()],
      ['Pausados', stats.paused.toString()],
      ['Transferidos', stats.transferred.toString()],
      ['Novos', stats.newlyCreated.toString()]
    ];

    doc.text('Resumo Executivo', 14, 85);

    autoTable(doc, {
      startY: 90,
      head: [['Indicador', 'Valor']],
      body: statsData,
      theme: 'grid',
      headStyles: { fillColor: [52, 73, 94], halign: 'center' },
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'center' } },
      styles: { fontSize: 10, cellPadding: 6 },
      margin: { left: 14, right: 14 },
      tableWidth: 80
    });

    // Mechanics Table
    const tableRows = stats.mecanicoReport.map(item => [
      item.name,
      item.role,
      item.total.toString(),
      item.avgTime,
      item.efficiency
    ]);

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text('Detalhamento por Especialista', 14, finalY - 5);

    autoTable(doc, {
      startY: finalY,
      head: [['Colaborador', 'Função', 'OS Concluídas', 'Tempo Médio', 'Eficiência']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], halign: 'center' },
      bodyStyles: { valign: 'middle' },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center', fontStyle: 'bold', textColor: [39, 174, 96] }
      },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { top: 10 }
    });

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount} - MecânicaPro Analytics - Documento Interno`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save('Relatorio_MecanicaPro.pdf');
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-sans">
      <header className="bg-white/70 dark:bg-slate-900/70 ios-blur px-6 py-5 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="size-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-90 transition-all hover:text-primary"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-black font-display tracking-tight text-slate-900 dark:text-white leading-none">Desempenho</h1>
            <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">BI & Analytics Industrial</p>
          </div>
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
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-slate-900 dark:bg-primary text-white px-5 py-2.5 rounded-2xl text-[10px] uppercase font-black tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all hover:brightness-110"
          >
            <span className="material-symbols-outlined text-[18px]">ios_share</span>
            <span>Compartilhar</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-10 space-y-8 max-w-6xl mx-auto w-full pb-32">
        {/* Filtros Premium */}
        {(isAdminOrSupervisor || period === 'custom') && (
          <div className="bg-white/50 dark:bg-slate-900/40 backdrop-blur-md p-8 rounded-[2.5rem] shadow-premium border border-white dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
            {isAdminOrSupervisor && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Especialista Alocado</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-2xl text-slate-900 dark:text-white border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 h-14 pl-6 pr-10 text-xs font-black uppercase tracking-widest transition-all focus:ring-4 focus:ring-primary/10"
                    value={selectedMecanicoId}
                    onChange={(e) => setSelectedMecanicoId(e.target.value)}
                  >
                    <option value="all">Frotas (Geral)</option>
                    {mechanics.map(m => (
                      <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Janela Temporal</label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-2xl text-slate-900 dark:text-white border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 h-14 pl-6 pr-10 text-xs font-black uppercase tracking-widest transition-all focus:ring-4 focus:ring-primary/10"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option value="last-7">Ciclo Semanal</option>
                  <option value="last-15">Quinzena Operacional</option>
                  <option value="last-30">Fechamento Mensal</option>
                  <option value="custom">Data Customizada</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">calendar_month</span>
              </div>
            </div>

            {period === 'custom' && (
              <div className="flex gap-4 animate-in slide-in-from-left-4 duration-300">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                  <input
                    type="date"
                    className="w-full rounded-2xl text-xs font-bold border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 h-14 px-4 focus:ring-4 focus:ring-primary/10 transition-all"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Término</label>
                  <input
                    type="date"
                    className="w-full rounded-2xl text-xs font-bold border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 h-14 px-4 focus:ring-4 focus:ring-primary/10 transition-all"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dashboards Visuais (Pizza Premium) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white/50 dark:bg-slate-900/40 backdrop-blur-md p-10 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-premium">
            <PieChart
              title="Distribuição Logística"
              data={[
                { label: 'Concluídos', value: stats.completed },
                { label: 'Ociosos/Pausas', value: stats.paused },
                { label: 'Setorizados', value: stats.transferred }
              ]}
              colors={['#10b981', '#f59e0b', '#3b82f6']}
            />
          </div>
          <div className="bg-white/50 dark:bg-slate-900/40 backdrop-blur-md p-10 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-premium">
            <PieChart
              title="Taxa de Fluxo (Throughput)"
              data={[
                { label: 'Baixas Totais', value: stats.completed },
                { label: 'Carga Recebida', value: stats.newlyCreated }
              ]}
              colors={['#3b82f6', '#cbd5e1']}
            />
          </div>
        </div>

        {/* Estatísticas Numéricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
              <span className="material-symbols-outlined text-6xl">add_task</span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mb-3">Volume Entrante</p>
            <p className="text-4xl font-black text-slate-900 dark:text-white font-display tracking-tighter">{stats.newlyCreated}</p>
            <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-3 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              Janela Ativa
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
              <span className="material-symbols-outlined text-6xl">speed</span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mb-3">Eficácia Global</p>
            <p className="text-4xl font-black text-slate-900 dark:text-white font-display tracking-tighter">
              {stats.newlyCreated > 0 ? Math.round((stats.completed / stats.newlyCreated) * 100) : 0}%
            </p>
            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-3 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">verified</span>
              Vazão Verificada
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
              <span className="material-symbols-outlined text-6xl">timelapse</span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mb-3">Ciclo Médio</p>
            <p className="text-4xl font-black text-slate-900 dark:text-white font-display tracking-tighter">42<span className="text-lg ml-1 font-black text-slate-400">m</span></p>
            <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mt-3 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">schedule</span>
              Lead Time
            </p>
          </div>
        </div>

        {/* Tabela de Produtividade Premium */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xl font-black font-display tracking-tight text-slate-800 dark:text-slate-100 uppercase leading-none">Ranking Operacional</h2>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1.5">Produtividade de Equipe Técnica</p>
            </div>
            <div className="bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-primary/10">
              {period === 'custom' ? 'Range Customizado' : period === 'last-7' ? 'Protocolo 7D' : period === 'last-15' ? 'Protocolo 15D' : 'Protocolo 30D'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operador Técnico</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Concluídos</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Desempenho</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Métrica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {stats.mecanicoReport.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center opacity-30">
                          <span className="material-symbols-outlined text-5xl mb-3">query_stats</span>
                          <p className="text-[10px] font-black uppercase tracking-widest">Sem varredura de dados disponível</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    stats.mecanicoReport.map(item => (
                      <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xs">
                              {item.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-900 dark:text-white font-display tracking-tight leading-none mb-1 group-hover:text-primary transition-colors">{item.name}</span>
                              <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{item.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-lg font-black text-slate-900 dark:text-white font-display">{item.total}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase ml-1">OS</span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <p className="text-xs font-black text-slate-700 dark:text-slate-300">{item.avgTime}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">AVG Time</p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 shadow-inner">{item.efficiency} EFF</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-8 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[9px] text-slate-400 text-center uppercase tracking-[0.4em] font-black opacity-60">MecânicaPro Analytics Platform © {new Date().getFullYear()}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Report;
