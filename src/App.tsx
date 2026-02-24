import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TicketStatus, TicketPriority, AppState, UserRole, User, Ticket, ChatMessage, UserStatus, SectorGroup, JobRole, ActivityLog } from './types';
import { supabase } from './supabase';
import { logActivity, buildChamadoLog } from './utils/logActivity';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { mapMachineToDb, mapMachineFromDb, mapSectorGroupToDb, mapSectorGroupFromDb } from './types';
// Componentes
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TicketList from './components/TicketList';
import ActiveTicket from './components/ActiveTicket';
import ActivityReport from './components/ActivityReport';
import Layout from './components/Layout';
import Profile from './components/Profile';
import Report from './components/Report';
import UserManagement from './components/UserManagement';
import ChatRoom from './components/ChatRoom';
import AdminPanel from './components/AdminPanel';
import NewTicketModal from './components/NewTicketModal';
import ConnectionMonitor from './components/ConnectionMonitor';
import { useAuth } from './components/AuthContext';
import defaultAvatar from './assets/default-avatar.svg';
import Avatar from './components/Avatar';
import { generateId } from './utils';
import { checkIsAdmin } from './types';
import PWAInstall from './components/PWAInstall';

const App: React.FC = () => {
  const { user, loading: authLoading, signOut, refreshSession } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<AppState & {
    ticketsInitialTab?: TicketStatus;
    standardProblems: any[]
  }>(() => ({
    currentUser: null,
    view: 'dashboard',
    tickets: [],
    users: [],
    machines: [],
    activityLogs: [],
    groups: [],
    warehouses: [],
    jobRoles: [],
    activeTicketId: null,
    ticketsInitialTab: TicketStatus.OPEN,
    standardProblems: [],
    messages: [],
    activeChatUserId: null,
    connectionStatus: 'online',
    lastSync: null,
    dataStats: {
      tickets: 0,
      users: 0,
      messages: 0,
      machines: 0
    }
  }));

  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [saveNotification, setSaveNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setSaveNotification({ message, type });
    setTimeout(() => setSaveNotification(null), 3000);
  };

  // --- REMOVED REDUNDANT AUTH LOGIC: AuthContext handles this ---
  const [loading, setLoading] = useState(false);
  const lastFetchedUserId = useRef<string | null>(null);


  // No topo do componente, para depuração
  console.log(`[App Render] user: ${user?.email || 'null'}, session: ${!!user}, loading: ${authLoading}`);

  // Realtime subscription for activity_logs to keep timeline in sync
  useEffect(() => {
    const chan = supabase.channel('public:activity_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, (payload) => {
        try {
          const row = (payload as any).new || (payload as any).old;
          if (!row) return;

          setState(prev => {
            // Resolve user display values using current state (users + jobRoles)
            const uid = row.user_id || row.userId || row.user || '';
            const userFromState = prev.users.find(u => u.id === uid);
            const roleFromUser = userFromState?.role;
            const roleFromJobRoles = userFromState?.jobRoleId ? prev.jobRoles.find(j => j.id === userFromState.jobRoleId)?.name : undefined;
            const resolvedRole = roleFromUser || roleFromJobRoles || 'Mecânico';

            const mapped: ActivityLog = {
              id: row.id,
              timestamp: row.timestamp || row.created_at || new Date().toISOString(),
              userId: uid,
              userName: userFromState?.name || row.user_name || row.userName || 'Sistema',
              userRole: resolvedRole,
              action: row.action
            };

            if ((payload as any).eventType === 'DELETE' || (payload as any).type === 'DELETE') {
              return { ...prev, activityLogs: prev.activityLogs.filter(l => l.id !== mapped.id) };
            }
            const filtered = prev.activityLogs.filter(l => l.id !== mapped.id);
            return { ...prev, activityLogs: [mapped, ...filtered].slice(0, 200) };
          });
        } catch (err) {
          console.error('Erro no realtime activity_logs handler:', err);
        }
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(chan);
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, connectionStatus: 'loading' }));
      console.log('🔄 Iniciando busca de dados no Supabase...');

      const [
        { data: tickets, error: ticketError },
        { data: users, error: userError },
        { data: messages, error: messageError },
        { data: machines, error: machineError },
        { data: logs, error: logError },
        { data: warehouses, error: warehouseError },
        { data: groups, error: groupError },
        { data: jobRolesData, error: jobRoleError }
      ] = await Promise.all([
        supabase.from('tickets').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('messages').select('*'),
        supabase.from('machines').select('*'),
        supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(200),
        supabase.from('warehouses').select('*'),
        supabase.from('sector_groups').select('*'),
        supabase.from('job_roles').select('*')
      ]);

      if (ticketError || userError || messageError || jobRoleError) {
        console.error('❌ Erro na busca:', { ticketError, userError, messageError, jobRoleError });
        showNotification('Erro ao carregar dados do servidor', 'error');
      }

      const mappedJobRoles: JobRole[] = (jobRolesData || []).map((r: any) => ({ id: r.id, name: r.name || r.role_name || r.title || '' }));

      // --- MAPEAMENTO DE USUÁRIOS (PROFILES) ---
      let mappedUsers: User[] = (users || []).map((u: any) => {
        const jobRoleId = u.job_role_id ?? u.jobroleid ?? null;

        const jobRole = mappedJobRoles.find(
          r => r.id === jobRoleId
        );

        const roleName = jobRole?.name || 'Mecânico';

        return {
          id: u.id,
          name: u.name || u.full_name || 'Usuário Sem Nome',
          email: u.email,
          role: roleName,
          active: u.active !== undefined ? u.active : true,
          avatar: u.avatar || u.avatar_url || defaultAvatar,
          nickname: u.nickname || u.username,
          status: (u.status as UserStatus) || UserStatus.AVAILABLE,
          jobRoleId: jobRoleId // ← string UUID
        };
      });


      // RLS diagnostic: ensure current user present in list
      if (user && mappedUsers.length <= 1 && !mappedUsers.some(u => u.id === user.id)) {
        const myJobRole = mappedJobRoles.find(r => r.id === user.jobRoleId)?.name;
        mappedUsers.push({
          ...(user as User),
          role: myJobRole === 'Administrador do Sistema' ? 'Administrador do Sistema' : (myJobRole || 'Mecânico'),
          name: user.name || 'Eu'
        } as User);
      }

      const mappedTickets: Ticket[] = (tickets || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        requester: t.requester,
        galpao: t.galpao,
        grupo: t.grupo,
        manuseadoPor: t.manuseado_por || t.manuseadoPor,
        sector: t.sector,
        machineId: t.machine_id || t.machineId,
        status: t.status as TicketStatus,
        priority: t.priority as TicketPriority,
        description: t.description,
        createdAt: t.created_at || t.createdAt,
        mecanicoId: t.mecanico_id || t.mecanicoId,
        totalTimeSpent: t.total_time_spent || t.totalTimeSpent,
        notes: t.notes,
        createdBy: t.created_by || t.createdBy
      }));

      const mappedLogs: ActivityLog[] = (logs || []).map((l: any) => {
        const logUser = mappedUsers.find(u => u.id === (l.user_id || l.userId));
        const roleFromUser = logUser?.role;
        const roleFromJob = logUser?.jobRoleId ? mappedJobRoles.find(j => j.id === logUser.jobRoleId)?.name : undefined;
        const roleName = roleFromUser || roleFromJob || 'Mecânico';
        return {
          id: l.id,
          timestamp: l.timestamp || l.created_at || '',
          userId: l.user_id || l.userId || '',
          userName: l.user_name || logUser?.name || 'Sistema',
          userRole: roleName,
          userAvatar: logUser?.avatar || defaultAvatar,
          action: l.action,
        };
      });

      const mappedMessages: ChatMessage[] = (messages || []).map((m: any) => ({
        id: m.id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        text: m.content || m.text,
        timestamp: m.created_at,
        read: m.read || false,
        messageType: 'text'
      }));

      const mappedGroups: SectorGroup[] = (groups || []).map((g: any) => mapSectorGroupFromDb(g));

      setState(prev => {
        const updatedCurrentUser = mappedUsers.find(u => u.id === user?.id) || prev.currentUser;

        return {
          ...prev,
          currentUser: updatedCurrentUser,
          tickets: mappedTickets,
          users: mappedUsers,
          messages: mappedMessages,
          machines: (machines as any[]) || [],
          activityLogs: mappedLogs || [],
          warehouses: (warehouses as any[]) || [],
          groups: mappedGroups || [],
          jobRoles: mappedJobRoles || [],
          connectionStatus: 'online',
          lastSync: new Date().toISOString(),
          dataStats: {
            tickets: mappedTickets.length,
            users: mappedUsers.length,
            messages: mappedMessages.length,
            machines: (machines as any[])?.length || 0
          }
        };
      });

      console.log('✅ Sincronização com Supabase concluída');
    } catch (error: any) {
      console.error('❌ Erro no fetchData:', error);
      // Erro de dados NÃO desloga o usuário
    }
  }, [user]);

  useEffect(() => {
    // Sincronização Simplificada: Só atualiza se o usuário mudar
    if (!authLoading && user) {
      if (lastFetchedUserId.current !== user.id) {
        lastFetchedUserId.current = user.id;
        setState(prev => ({ ...prev, currentUser: user }));
        fetchData();
      }
    } else if (!authLoading && !user && lastFetchedUserId.current) {
      // Logout limpo
      lastFetchedUserId.current = null;
      setState(prev => ({ ...prev, currentUser: null }));
    }
  }, [user, authLoading, fetchData]);

  const navigateTo = (view: AppState['view'], initialTab?: TicketStatus, ticketId?: string) => {
    setState(prev => ({
      ...prev,
      view: view,
      ticketsInitialTab: initialTab || TicketStatus.OPEN,
      activeTicketId: ticketId || prev.activeTicketId
    }));
  };

  const handleLogout = async () => {
    await signOut();
    setState(prev => ({ ...prev, currentUser: null, view: 'dashboard' }));
    navigate('/'); // Redireciona para a tela de login
  };

  const handleCreateTicket = async (ticketData: Partial<Ticket>) => {
    try {
      // Mapeia camelCase para snake_case conforme schema do Supabase
      const payload = {
        id: generateId(),
        title: ticketData.title,
        requester: ticketData.requester,
        galpao: ticketData.galpao,
        grupo: ticketData.grupo,
        manuseado_por: ticketData.manuseadoPor,
        sector: ticketData.sector,
        machine_id: ticketData.machineId,
        status: TicketStatus.OPEN,
        priority: ticketData.priority,
        description: ticketData.description,
        machine_category: ticketData.machineCategory,
        operator: ticketData.operator,
        created_at: new Date().toISOString(),
        created_by: state.currentUser?.id
      };

      console.log('📝 Criando chamado:', payload);

      const { data, error } = await supabase
        .from('tickets')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('❌ Erro do Supabase:', error);
        showNotification(`Erro ao criar chamado: ${error.message}`, 'error');
        throw error;
      }

      console.log('✅ Chamado criado:', data);
      showNotification('Chamado criado com sucesso!');
      // registra atividade (não bloqueante)
      await logActivity(buildChamadoLog({
        type: 'create',
        chamadoId: (data && data.id) || payload.id,
        clienteNome: payload.requester,
        usuarioNome: state.currentUser?.name
      }), payload.title || data?.title || '');
      await fetchData(); // Recarrega para manter sincronizado
      setIsNewTicketModalOpen(false);
    } catch (err: any) {
      console.error("Erro ao criar chamado:", err);
      alert(`Erro ao criar chamado: ${err?.message || 'Erro desconhecido'}`);
    }
  };

  // --- RENDERIZAÇÃO ---

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-6">
          <Avatar src={user?.avatar || null} name={user?.name || user?.email} className="bg-center bg-no-repeat aspect-square bg-cover rounded-2xl size-11 ring-2 ring-primary/20 shadow-sm" />
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-black tracking-tighter italic">Mecânica<span className="text-primary">Pro</span></h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mt-2">Sincronizando Sistemas</p>
          </div>
        </div>
      </div>
    );
  }

  // Se não houver usuário, renderiza APENAS o componente de Login.
  // O main.tsx já proveu o Router, então o useNavigate lá dentro vai funcionar.
  if (!user) {
    return <Login />;
  }

  // Se logado, renderiza o Layout do Sistema
  return (
    <Layout
      currentUser={state.currentUser as any}
      activeView={state.view}
      view={state.view}
      onNavigate={navigateTo}
      onLogout={handleLogout}
      openTicketsCount={state.tickets.filter(t => t.status === TicketStatus.OPEN).length}
      unreadMessagesCount={state.messages.filter(m => m.receiverId === state.currentUser?.id && !m.read).length}
      onNewTicket={() => setIsNewTicketModalOpen(true)}
    >
      {state.view === 'dashboard' && (
        <Dashboard
          state={state}
          navigateTo={navigateTo}
          onNewTicket={() => setIsNewTicketModalOpen(true)}
        />
      )}

      {state.view === 'tickets' && (
        <TicketList
          tickets={state.tickets}
          users={state.users}
          initialTab={state.ticketsInitialTab}
          onEdit={() => { }}
          onAccept={async (id) => {
            const { error } = await supabase.from('tickets').update({
              status: TicketStatus.IN_PROGRESS,
              mecanico_id: state.currentUser?.id,
              started_at: new Date().toISOString() // Adicionando started_at se não houver
            }).eq('id', id);
            if (error) {
              showNotification('Erro ao aceitar chamado', 'error');
            } else {
              await logActivity(buildChamadoLog({
                type: 'assign',
                chamadoId: id,
                clienteNome: state.tickets.find(t => t.id === id)?.requester,
                usuarioNome: state.currentUser?.name
              }), `Iniciou atendimento`);
              showNotification('Chamado aceito com sucesso!');
              setState(prev => ({ ...prev, activeTicketId: id, view: 'active_ticket' }));
              await fetchData();
            }
          }}
          onDelete={async (id: string) => {
            try {
              console.log(`[onDelete] Tentando excluir chamado ID: ${id}`);
              const { error, count } = await supabase
                .from('tickets')
                .delete({ count: 'exact' })
                .eq('id', id);

              if (error) {
                console.error('Erro ao deletar chamado:', error);
                showNotification(`Erro ao deletar chamado: ${error.message}`, 'error');
              } else if (count === 0) {
                console.warn('Nenhum chamado foi excluído. Verifique permissões RLS ou se o ID existe.');
                showNotification('Não foi possível excluir o chamado (permissão negada)', 'error');
              } else {
                console.log(`Chamado ${id} excluído com sucesso.`);
                showNotification('Chamado removido');
                // Pequeno delay para o usuário ver a notificação antes do reload
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }
            } catch (err: any) {
              console.error('Exceção ao deletar chamado:', err);
              showNotification(`Erro ao deletar chamado: ${err?.message || 'Erro desconhecido'}`, 'error');
            }
          }}

          onNewTicket={() => setIsNewTicketModalOpen(true)}
          currentUser={state.currentUser as any}
          navigateTo={navigateTo}
        />
      )}

      {state.view === 'users' && (
        <UserManagement
          currentUser={state.currentUser as User}
          users={state.users}
          tickets={state.tickets}
          onAddUser={async (userData) => {
            try {
              const profilePayload = {
                id: userData.id,
                name: userData.name,
                nickname: userData.nickname,
                email: userData.email,
                job_role_id: userData.jobRoleId,
                avatar: userData.avatar,
                active: userData.active,
                role: userData.role
              };
              const { error } = await supabase.from('profiles').upsert([profilePayload]);
              if (error) throw error;
              showNotification('Usuário adicionado com sucesso!');
              await fetchData();
            } catch (err: any) {
              console.error("Erro ao adicionar usuário:", err);
              showNotification(`Erro: ${err.message}`, 'error');
            }
          }}
          onOpenChat={(userId) => setState(prev => ({ ...prev, view: 'chat', activeChatUserId: userId }))}
        />
      )}

      {state.view === 'chat' && (
        <ChatRoom
          currentUser={state.currentUser as User}
          users={state.users}
          messages={state.messages}
          activeChatUserId={state.activeChatUserId}
          onSendMessage={async (receiverId, text, attachment) => {
            const newMessagePayload: any = {
              id: generateId(),
              sender_id: state.currentUser?.id,
              receiver_id: receiverId,
              text: text || '',
              read: false,
              timestamp: new Date().toISOString(),
              message_type: attachment ? attachment.type : 'text'
            };

            // Add attachment fields if present
            if (attachment) {
              newMessagePayload.attachment_url = attachment.url;
              newMessagePayload.attachment_name = attachment.name;
              newMessagePayload.attachment_size = attachment.size;
              newMessagePayload.attachment_mime_type = attachment.mimeType;
            }

            const { data, error } = await supabase
              .from('messages')
              .insert([newMessagePayload])
              .select()
              .single();

            if (error) {
              console.error("Erro ao enviar mensagem:", error);
              showNotification('Erro ao enviar mensagem', 'error');
              return;
            }

            if (data) {
              showNotification('Mensagem enviada');
              // Map snake_case from DB to camelCase for local state
              const messageData: ChatMessage = {
                id: data.id,
                senderId: data.sender_id || data.senderId || data.senderid,
                receiverId: data.receiver_id || data.receiverId || data.receiverid,
                text: data.text,
                timestamp: data.timestamp,
                read: data.read,
                messageType: data.message_type || data.messageType || 'text',
                attachmentUrl: data.attachment_url || data.attachmentUrl,
                attachmentName: data.attachment_name || data.attachmentName,
                attachmentSize: data.attachment_size || data.attachmentSize,
                attachmentMimeType: data.attachment_mime_type || data.attachmentMimeType,
                deliveredAt: data.delivered_at || data.deliveredAt
              };
              setState(prev => ({
                ...prev,
                messages: [...prev.messages, messageData]
              }));
            }
          }}
          onSelectUser={async (id) => {
            setState(prev => ({ ...prev, activeChatUserId: id }));
            // Marcar como lidas as mensagens desse user para mim
            if (id && state.currentUser?.id) {
              const { error } = await supabase
                .from('messages')
                .update({ read: true })
                .eq('sender_id', id)
                .eq('receiver_id', state.currentUser.id)
                .eq('read', false);

              if (error) {
                // Fallback para camelCase se snake_case se a primeira falhar
                await supabase
                  .from('messages')
                  .update({ read: true })
                  .eq('senderId', id)
                  .eq('receiverId', state.currentUser.id)
                  .eq('read', false);
              }
            }
          }}
          onBack={() => navigateTo('dashboard')}
        />
      )}

      {state.view === 'active_ticket' && state.activeTicketId && (() => {
        const ticket = state.tickets.find(t => t.id === state.activeTicketId);
        const machine = state.machines.find(m => m.id === ticket?.machineId);
        if (!ticket || !machine) return <div className="p-10 text-center text-white">Carregando dados do chamado...</div>;

        return (
          <ActiveTicket
            ticket={ticket}
            machine={machine}
            users={state.users}
            onBack={() => navigateTo('dashboard')}
            onComplete={async (notes, timeSpent) => {
              try {
                const totalTime = (ticket.totalTimeSpent || 0) + timeSpent;

                // Update ticket and request the updated row to ensure DB write succeeded
                const { data: updatedTicket, error: updateError } = await supabase
                  .from('tickets')
                  .update({
                    status: TicketStatus.COMPLETED,
                    completed_at: new Date().toISOString(),
                    total_time_spent: totalTime,
                    notes
                  })
                  .eq('id', ticket.id)
                  .select()
                  .single();

                if (updateError) throw updateError;

                // registra atividade (não bloqueante)
                await logActivity(buildChamadoLog({
                  type: 'finish',
                  chamadoId: ticket.id,
                  clienteNome: ticket.requester,
                  usuarioNome: state.currentUser?.name
                }), `Obs: ${notes} | Tempo total: ${totalTime}s`);

                // Optimistic local update: mark ticket as completed so counts update immediately
                setState(prev => ({
                  ...prev,
                  tickets: prev.tickets.map(t => t.id === ticket.id ? { ...t, status: TicketStatus.COMPLETED, completedAt: updatedTicket?.completed_at || new Date().toISOString(), totalTimeSpent: totalTime } : t)
                }));

                showNotification('Chamado finalizado com sucesso!');

                // Refresh data to ensure canonical state
                await fetchData();
                navigateTo('dashboard');

                // After refresh, if there's another active ticket, open it
                const activeTicket = (state.tickets || []).find(t =>
                  t.status === TicketStatus.IN_PROGRESS &&
                  (t.mecanicoId === state.currentUser?.id || t.mechanicIds?.includes(state.currentUser?.id))
                );
                if (activeTicket) {
                  navigateTo('active_ticket', undefined, activeTicket.id);
                }
              } catch (err: any) {
                showNotification(`Erro ao finalizar: ${err.message}`, 'error');
              }
            }}
            onPause={async (reason, timeSpent) => {
              try {
                const totalTime = (ticket.totalTimeSpent || 0) + timeSpent;
                const { error } = await supabase.from('tickets').update({
                  status: TicketStatus.PAUSED,
                  paused_by_user_id: state.currentUser?.id,
                  total_time_spent: totalTime,
                  notes: reason
                }).eq('id', ticket.id);

                if (error) throw error;

                await logActivity(buildChamadoLog({
                  type: 'pause',
                  chamadoId: ticket.id,
                  clienteNome: ticket.requester,
                  usuarioNome: state.currentUser?.name
                }), `Motivo: ${reason} | Tempo nesta sessão: ${timeSpent}s`);

                showNotification('Chamado pausado');
                await fetchData();
                navigateTo('dashboard');
              } catch (err: any) {
                showNotification(`Erro ao pausar: ${err.message}`, 'error');
              }
            }}
            onTransfer={async (reason) => {
              try {
                await logActivity(buildChamadoLog({
                  type: 'edit',
                  chamadoId: ticket.id,
                  clienteNome: ticket.requester,
                  usuarioNome: state.currentUser?.name
                }), reason);
                showNotification('Chamado setorizado');
                await fetchData();
              } catch (err: any) {
                showNotification(`Erro ao setorizar: ${err.message}`, 'error');
              }
            }}
          />
        );
      })()}

      {state.view === 'profile' && (
        <Profile
          user={state.currentUser as User}
          onBack={() => navigateTo('dashboard')}
          onLogout={handleLogout}
          onUpdateUser={async () => {
            await fetchData();
            await refreshSession(); // Garante que AuthContext pegue as mudanças
          }}
        />
      )}

      {state.view === 'report' && (
        <Report
          tickets={state.tickets}
          users={state.users}
          currentUser={state.currentUser as User}
          onBack={() => navigateTo('dashboard')}
        />
      )}

      {state.view === 'admin_panel' && (
        <AdminPanel
          machines={state.machines}
          groups={state.groups}
          warehouses={state.warehouses}
          jobRoles={state.jobRoles}
          users={state.users}
          onUpdateMachines={async (list) => {
            showNotification('Sincronizando máquinas...');
            try {
              // Detect deleted machines: items present in current state but missing from incoming list
              const incomingIds = new Set(list.map((it: any) => it.id));
              const toDelete = state.machines
                .filter(m => !incomingIds.has(m.id) && !m.id.startsWith('temp-'))
                .map(m => m.id);

              for (const id of toDelete) {
                try {
                  const { error } = await supabase.from('machines').delete().eq('id', id);
                  if (error) {
                    console.error('Erro ao deletar máquina:', error);
                    showNotification(`Erro ao deletar máquina: ${error.message}`, 'error');
                  }
                } catch (err: any) {
                  console.error('Exceção ao deletar máquina:', err);
                  showNotification(`Erro ao deletar máquina: ${err?.message || 'Erro desconhecido'}`, 'error');
                }
              }

              for (const item of list) {
                if (item.id.startsWith('temp-')) {
                  const { id: tempId, ...rest } = item;
                  const newItem = { ...rest, id: generateId() };
                  const { error } = await supabase
                    .from('machines')
                    .insert([mapMachineToDb(newItem)]);

                  if (error) {
                    console.error('Erro ao inserir máquina:', error);
                    showNotification(`Erro ao inserir máquina: ${error.message}`, 'error');
                  }
                } else {
                  const { error } = await supabase
                    .from('machines')
                    .upsert([mapMachineToDb(item)]);

                  if (error) {
                    console.error('Erro ao atualizar máquina:', error);
                    showNotification(`Erro ao atualizar máquina: ${error.message}`, 'error');
                  }
                }
              }

              showNotification('Máquinas atualizadas');
              await fetchData();
            } catch (err: any) {
              console.error('Erro ao sincronizar máquinas:', err);
              showNotification(`Erro ao sincronizar máquinas: ${err?.message || 'Erro desconhecido'}`, 'error');
            }
          }}
          onUpdateGroups={async (list) => {
            showNotification('Sincronizando grupos...');
            try {
              // Detect deletions: itens presentes no estado atual mas ausentes na lista recebida
              const incomingIds = new Set(list.map((it: any) => it.id));
              const toDelete = state.groups
                .filter(g => !incomingIds.has(g.id) && !g.id.startsWith('temp-'))
                .map(g => g.id);

              for (const id of toDelete) {
                try {
                  const { error } = await supabase.from('sector_groups').delete().eq('id', id);
                  if (error) {
                    console.error('Erro ao deletar grupo:', error);
                    showNotification(`Erro ao deletar grupo: ${error.message}`, 'error');
                  }
                } catch (err: any) {
                  console.error('Exceção ao deletar grupo:', err);
                  showNotification(`Erro ao deletar grupo: ${err?.message || 'Erro desconhecido'}`, 'error');
                }
              }

              for (const item of list) {
                if (item.id.startsWith('temp-')) {
                  const { id: tempId, ...rest } = item;
                  const newItem = { ...rest, id: generateId() };
                  const { error } = await supabase.from('sector_groups').insert([mapSectorGroupToDb(newItem)]);
                  if (error) {
                    console.error('Erro ao inserir grupo:', error);
                    showNotification(`Erro ao inserir grupo: ${error.message}`, 'error');
                  }
                } else {
                  const { error } = await supabase.from('sector_groups').upsert([mapSectorGroupToDb(item)]);
                  if (error) {
                    console.error('Erro ao atualizar grupo:', error);
                    showNotification(`Erro ao atualizar grupo: ${error.message}`, 'error');
                  }
                }
              }
              showNotification('Grupos atualizados');
              await fetchData();
            } catch (err: any) {
              console.error('Erro ao sincronizar grupos:', err);
              showNotification(`Erro ao sincronizar grupos: ${err?.message || 'Erro desconhecido'}`, 'error');
            }
          }}
          onUpdateWarehouses={async (list) => {
            showNotification('Sincronizando galpões...');
            try {
              const incomingIds = new Set(list.map((it: any) => it.id));
              const toDelete = state.warehouses
                .filter(w => !incomingIds.has(w.id) && !w.id.startsWith('temp-'))
                .map(w => w.id);

              for (const id of toDelete) {
                try {
                  const { error } = await supabase.from('warehouses').delete().eq('id', id);
                  if (error) {
                    console.error('Erro ao deletar galpão:', error);
                    showNotification(`Erro ao deletar galpão: ${error.message}`, 'error');
                  }
                } catch (err: any) {
                  console.error('Exceção ao deletar galpão:', err);
                  showNotification(`Erro ao deletar galpão: ${err?.message || 'Erro desconhecido'}`, 'error');
                }
              }

              for (const item of list) {
                if (item.id.startsWith('temp-')) {
                  const { id, ...rest } = item;
                  const { error } = await supabase.from('warehouses').insert([rest]);
                  if (error) {
                    console.error('Erro ao inserir galpão:', error);
                    showNotification(`Erro ao inserir galpão: ${error.message}`, 'error');
                  }
                } else {
                  const { error } = await supabase.from('warehouses').upsert([item]);
                  if (error) {
                    console.error('Erro ao atualizar galpão:', error);
                    showNotification(`Erro ao atualizar galpão: ${error.message}`, 'error');
                  }
                }
              }
              showNotification('Galpões atualizados');
              await fetchData();
            } catch (err: any) {
              console.error('Erro ao sincronizar galpões:', err);
              showNotification(`Erro ao sincronizar galpões: ${err?.message || 'Erro desconhecido'}`, 'error');
            }
          }}
          onUpdateJobRoles={async (list) => {
            showNotification('Sincronizando funções...');
            try {
              const incomingIds = new Set(list.map((it: any) => it.id));
              const toDelete = state.jobRoles
                .filter(j => !incomingIds.has(j.id) && !j.id.startsWith('temp-'))
                .map(j => j.id);

              for (const id of toDelete) {
                try {
                  const { error } = await supabase.from('job_roles').delete().eq('id', id);
                  if (error) {
                    console.error('Erro ao deletar função:', error);
                    showNotification(`Erro ao deletar função: ${error.message}`, 'error');
                  }
                } catch (err: any) {
                  console.error('Exceção ao deletar função:', err);
                  showNotification(`Erro ao deletar função: ${err?.message || 'Erro desconhecido'}`, 'error');
                }
              }

              for (const item of list) {
                if (item.id.startsWith('temp-')) {
                  const { id, ...rest } = item;
                  const { error } = await supabase.from('job_roles').insert([rest]);
                  if (error) {
                    console.error('Erro ao inserir função:', error);
                    showNotification(`Erro ao inserir função: ${error.message}`, 'error');
                  }
                } else {
                  const { error } = await supabase.from('job_roles').upsert([item]);
                  if (error) {
                    console.error('Erro ao atualizar função:', error);
                    showNotification(`Erro ao atualizar função: ${error.message}`, 'error');
                  }
                }
              }
              showNotification('Funções atualizadas');
              await fetchData();
            } catch (err: any) {
              console.error('Erro ao sincronizar funções:', err);
              showNotification(`Erro ao sincronizar funções: ${err?.message || 'Erro desconhecido'}`, 'error');
            }
          }}
          onAddUser={async (userData) => {
            try {
              const profilePayload = {
                id: userData.id,
                name: userData.name,
                nickname: userData.nickname,
                email: userData.email,
                job_role_id: userData.jobRoleId,
                avatar: userData.avatar,
                active: userData.active,
                role: userData.role
              };
              const { error } = await supabase.from('profiles').upsert([profilePayload]);
              if (error) {
                console.error('Erro ao adicionar usuário:', error);
                showNotification(`Erro ao adicionar usuário: ${error.message}`, 'error');
              } else {
                showNotification('Usuário adicionado com sucesso!');
                await fetchData();
              }
            } catch (err: any) {
              console.error('Erro ao adicionar usuário:', err);
              showNotification(`Erro ao adicionar usuário: ${err?.message || 'Erro desconhecido'}`, 'error');
            }
          }}
          onEditUser={async (userData) => {
            const profilePayload = {
              name: userData.name,
              nickname: userData.nickname,
              email: userData.email,
              job_role_id: userData.jobRoleId,
              avatar: userData.avatar,
              active: userData.active,
              role: userData.role
            };
            const { error } = await supabase.from('profiles').update(profilePayload).eq('id', userData.id);
            if (error) {
              showNotification('Erro ao atualizar usuário', 'error');
            } else {
              showNotification('Usuário atualizado com sucesso!');
              await fetchData();
            }
          }}
          onDeleteUser={async (id) => {
            const previousUsers = state.users;

            // Optimistic UI
            setState(prev => ({
              ...prev,
              users: prev.users.filter(u => u.id !== id)
            }));

            try {
              // 1️⃣ Desvincular tickets do usuário
              const { error: ticketError } = await supabase
                .from('tickets')
                .update({ mecanico_id: null })
                .eq('mecanico_id', id);

              if (ticketError) throw ticketError;

              // 2️⃣ Agora excluir o perfil
              const response = await supabase
                .from('profiles')
                .delete()
                .eq('id', id)
                .select();

              const { data, error, status } = response as any;
              console.log("STATUS:", status);
              console.log("ERROR:", error);
              console.log("DATA:", data);

              if (error) throw error;

              console.log('Usuário removido no Supabase:', data);
              showNotification('Usuário removido com sucesso');
              await fetchData();

            } catch (err: any) {
              // Reverter se algo der errado
              setState(prev => ({ ...prev, users: previousUsers }));

              console.error('Erro ao remover usuário:', err);
              showNotification(
                `Erro ao remover usuário: ${err?.message || 'Erro desconhecido'}`,
                'error'
              );
            }
          }}

          onBack={() => navigateTo('dashboard')}
        />
      )}

      {isNewTicketModalOpen && (
        <NewTicketModal
          onClose={() => setIsNewTicketModalOpen(false)}
          onSubmit={handleCreateTicket}
          machines={state.machines}
          warehouses={state.warehouses}
          groups={state.groups}
          currentUser={state.currentUser}
          standardProblems={state.standardProblems}
        />
      )}

      {/* Floating Connection Monitor */}
      <div className="fixed bottom-6 right-6 z-[60] group">
        <div className="absolute bottom-full right-0 mb-4 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all translate-y-2 group-hover:translate-y-0">
          <ConnectionMonitor
            status={state.connectionStatus}
            lastSync={state.lastSync}
            stats={state.dataStats}
            onRefresh={fetchData}
          />
        </div>
        <button className={`size-12 rounded-full shadow-2xl flex items-center justify-center text-white transition-all active:scale-90 ${state.connectionStatus === 'online' ? 'bg-primary' :
          state.connectionStatus === 'loading' ? 'bg-amber-500' : 'bg-red-500'
          }`}>
          <span className={`material-symbols-outlined ${state.connectionStatus === 'loading' ? 'animate-spin' : ''}`}>
            {state.connectionStatus === 'online' ? 'cloud_done' :
              state.connectionStatus === 'loading' ? 'sync' : 'cloud_off'}
          </span>
        </button>
      </div>

      {/* Success/Error Notification Toast */}
      {saveNotification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${saveNotification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
          <span className="material-symbols-outlined">
            {saveNotification.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="font-bold text-sm">{saveNotification.message}</span>
        </div>
      )}
      <PWAInstall />
    </Layout>
  );
};

export default App;