import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User, ActivityLog } from '../types';
import { isAdmin } from '../utils';

const formatDateTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const weekAgoISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
};

const ActivityReport: React.FC = () => {
  const { user } = useAuth();
  const [mechanics, setMechanics] = useState<User[]>([]);
  const [selected, setSelected] = useState<string>('all');
  const [start, setStart] = useState<string>(weekAgoISO());
  const [end, setEnd] = useState<string>(todayISO());
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  (async () => {
    const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      name,
      email,
      active,
      job_roles (
        name
      )
    `)
    .order('name', { ascending: true });


    if (error) {
      console.error('Erro ao buscar usuários', error);
      return;
    }

    setMechanics(
  (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.job_roles?.name ?? "",
    active: r.active
  })));
  })();
}, []);


  const fetchLogs = async () => {
    setLoading(true);
    try {
      const startIso = new Date(start + 'T00:00:00').toISOString();
      const endIso = new Date(end + 'T23:59:59').toISOString();
      console.debug('[ActivityReport] fetchLogs params', { selected, startIso, endIso });
      let q = supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).gte('timestamp', startIso).lte('timestamp', endIso).limit(1000);
      if (selected !== 'all') q = q.eq('user_id', selected);
      const { data, error } = await q;
      if (error) throw error;
      console.debug('[ActivityReport] fetchLogs result count', { count: (data || []).length });

      const rows: any[] = data || [];
      const userIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));

      // Buscar perfis para obter job_role_id e nome
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id,name,job_role_id').in('id', userIds);
        profilesMap = (profiles || []).reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {});
      }

      // Buscar job roles para mapear nome
      const jobRoleIds = Array.from(new Set(Object.values(profilesMap).map((p: any) => p.job_role_id).filter(Boolean)));
      let jobRolesMap: Record<string, any> = {};
      if (jobRoleIds.length > 0) {
        const { data: jrs } = await supabase.from('job_roles').select('id,name').in('id', jobRoleIds);
        jobRolesMap = (jrs || []).reduce((acc: any, j: any) => ({ ...acc, [j.id]: j }), {});
      }

      setLogs(rows.map((l: any) => {
        const pid = l.user_id;
        const profile = profilesMap[pid];
        const roleName = profile ? (jobRolesMap[profile.job_role_id]?.name || profile.role) : undefined;
        return {
          id: l.id,
          timestamp: l.timestamp || l.created_at,
          userId: pid || '',
          userName: l.user_name || profile?.name || 'Sistema',
          userRole: roleName || 'Mecânico',
          action: l.action,
          details: l.details
        } as ActivityLog;
      }));
    } catch (err) {
      console.error('Erro ao buscar logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [selected, start, end]);

  if (!user || !isAdmin(user)) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
          <p className="font-bold">Acesso negado</p>
          <p className="text-sm text-slate-500 mt-2">Apenas administradores podem gerar relatórios.</p>
        </div>
      </div>
    );
  }

  const exportPdf = async () => {
    console.debug('[ActivityReport] exportPdf start', { selected, logsCount: logs.length });
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const rowsFor = (items: ActivityLog[]) => items.map(it => [formatDateTime(it.timestamp), it.action, it.userName]);

    if (selected === 'all') {
      // group by mechanic
      const byUser: Record<string, ActivityLog[]> = {};
      logs.forEach(l => {
        const key = l.userName || 'Sistema';
        (byUser[key] ||= []).push(l);
      });
      const names = Object.keys(byUser);
      names.forEach((name, idx) => {
        if (idx > 0) doc.addPage();
        doc.setFontSize(12);
        doc.text(`Mecânico: ${name}`, 40, 50);
        autoTable(doc, { startY: 70, head: [['Data/Hora', 'Ação', 'Mecânico']], body: rowsFor(byUser[name]) });
      });
    } else {
      const mech = mechanics.find(m => m.id === selected);
      doc.setFontSize(12);
      doc.text(`Mecânico: ${mech?.name || 'Desconhecido'}`, 40, 50);
      autoTable(doc, { startY: 70, head: [['Data/Hora', 'Ação', 'Mecânico']], body: rowsFor(logs) });
    }

    doc.save(`relatorio-atividades-${selected === 'all' ? 'todos' : selected}.pdf`);
    console.debug('[ActivityReport] exportPdf saved', { filename: `relatorio-atividades-${selected === 'all' ? 'todos' : selected}.pdf` });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex gap-3 items-end">
          <div className="flex flex-col">
            <label className="text-xs font-black text-slate-400">Mecânico</label>
            <select value={selected} onChange={e => setSelected(e.target.value)} className="mt-1 p-2 rounded-md border">
              <option value="all">Todos</option>
              {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-black text-slate-400">Início</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} className="mt-1 p-2 rounded-md border" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-black text-slate-400">Fim</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="mt-1 p-2 rounded-md border" />
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={fetchLogs} className="px-4 py-2 bg-primary text-white rounded-2xl font-black">Filtrar</button>
            <button onClick={exportPdf} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-2xl">Exportar PDF</button>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-black mb-2">Preview da Timeline</h4>
          <div className="space-y-3 max-h-80 overflow-auto">
            {loading ? <div>Carregando...</div> : (
              logs.length === 0 ? <div className="text-slate-500">Nenhuma atividade encontrada.</div> : logs.map(l => (
                <div key={l.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-black text-primary">{formatDateTime(l.timestamp)}</div>
                  <div className="text-sm font-bold"><span className="text-slate-900 dark:text-white">{l.userName}</span><span className="text-slate-500 ml-2">{l.action}</span></div>
                  {l.details && <div className="text-xs text-slate-400 mt-1">{l.details}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityReport;
