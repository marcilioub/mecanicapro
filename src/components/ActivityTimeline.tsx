import React, { useEffect, useState } from 'react';
import { ActivityLog } from '../types';
import { supabase } from '../supabase';

interface Props {
  limit?: number;
}

const formatDateTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const date = d.toLocaleDateString('pt-BR');
  const time = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return `${date} ${time}`;
};

const ActivityTimeline: React.FC<Props> = ({ limit = 100 }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select(`
            id,
            timestamp,
            action,
            profiles (
              name
            )
          `)
          .order('timestamp', { ascending: false })
          .limit(limit);

        if (error) {
          console.error('ActivityTimeline: erro ao buscar logs', error);
          return;
        }

        if (!mounted) return;

        const mapped: ActivityLog[] = (data || []).map((l: any) => ({
          id: l.id,
          timestamp: l.timestamp,
          userId: '',
          userName: l.profiles?.name || 'Sistema',
          action: l.action
        }));

        setLogs(mapped);
      } catch (err) {
        console.error('ActivityTimeline: exceção ao buscar logs', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLogs();

    const channel = supabase
      .channel('activity_logs_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        async (payload) => {
          try {
            const row = (payload as any).new;
            if (!row) return;

            // Buscar nome do usuário após insert
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', row.user_id)
              .single();

            const incoming: ActivityLog = {
              id: row.id,
              timestamp: row.timestamp,
              userId: '',
              userName: profile?.name || 'Sistema',
              action: row.action
            };

            setLogs(prev => {
              if (prev.some(p => p.id === incoming.id)) return prev;
              return [incoming, ...prev].slice(0, limit);
            });

          } catch (err) {
            console.error('ActivityTimeline realtime handler error', err);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };

  }, [limit]);

  if (loading)
    return <div className="p-4">Carregando atividades...</div>;

  return (
    <div className="space-y-3">
      {logs.map(log => (
        <div
          key={log.id}
          className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-800">
            <span className="material-symbols-outlined">history</span>
          </div>

          <div className="min-w-0">
            <div className="text-[10px] font-black text-primary uppercase">
              {formatDateTime(log.timestamp)}
            </div>

            <div className="text-sm font-bold">
              <span className="text-slate-900 dark:text-white">
                {log.userName || 'Sistema'}
              </span>

              <span className="text-slate-500 font-medium ml-2">
                {log.action}
              </span>
            </div>
          </div>
        </div>
      ))}

      {logs.length === 0 && (
        <div className="p-4 text-slate-500">
          Nenhuma atividade encontrada.
        </div>
      )}
    </div>
  );
};

export default ActivityTimeline;
