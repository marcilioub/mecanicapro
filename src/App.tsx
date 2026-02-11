import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TicketStatus, AppState, UserRole, User, Ticket, ChatMessage, UserStatus } from './types';
import { supabase } from './supabase';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// Componentes
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TicketList from './components/TicketList';
import ActiveTicket from './components/ActiveTicket';
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
import { generateId } from './utils';

const App: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<AppState & { ticketsInitialTab?: TicketStatus }>(() => ({
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

  // --- REALTIME SUBSCRIPTION (MESSAGES) ---
  useEffect(() => {
    const channel = supabase
      .channel('messages_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const rawMsg = payload.new as any;
            // Robust Mapping: Handle snake_case, camelCase and lowercase versions
            const newMsg: ChatMessage = {
              id: rawMsg.id,
              senderId: rawMsg.sender_id || rawMsg.senderId || rawMsg.senderid,
              receiverId: rawMsg.receiver_id || rawMsg.receiverId || rawMsg.receiverid,
              text: rawMsg.text,
              timestamp: rawMsg.timestamp,
              read: rawMsg.read,
              messageType: rawMsg.message_type || rawMsg.messageType || 'text',
              attachmentUrl: rawMsg.attachment_url || rawMsg.attachmentUrl,
              attachmentName: rawMsg.attachment_name || rawMsg.attachmentName,
              attachmentSize: rawMsg.attachment_size || rawMsg.attachmentSize,
              attachmentMimeType: rawMsg.attachment_mime_type || rawMsg.attachmentMimeType,
              deliveredAt: rawMsg.delivered_at || rawMsg.deliveredAt
            };
            setState(prev => {
              if (prev.messages.some(m => m.id === newMsg.id)) return prev;
              return {
                ...prev,
                messages: [...prev.messages, newMsg]
              };
            });
          } else if (payload.eventType === 'UPDATE') {
            const rawMsg = payload.new as any;
            const updatedMsg: ChatMessage = {
              id: rawMsg.id,
              senderId: rawMsg.sender_id || rawMsg.senderId || rawMsg.senderid,
              receiverId: rawMsg.receiver_id || rawMsg.receiverId || rawMsg.receiverid,
              text: rawMsg.text,
              timestamp: rawMsg.timestamp,
              read: rawMsg.read,
              messageType: rawMsg.message_type || rawMsg.messageType || 'text',
              attachmentUrl: rawMsg.attachment_url || rawMsg.attachmentUrl,
              attachmentName: rawMsg.attachment_name || rawMsg.attachmentName,
              attachmentSize: rawMsg.attachment_size || rawMsg.attachmentSize,
              attachmentMimeType: rawMsg.attachment_mime_type || rawMsg.attachmentMimeType,
              deliveredAt: rawMsg.delivered_at || rawMsg.deliveredAt
            };
            setState(prev => ({
              ...prev,
              messages: prev.messages.map(m => m.id === updatedMsg.id ? updatedMsg : m)
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- SINCRONIZAÇÃO COM AUTH CONTEXT ---
  const lastFetchedUserId = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, connectionStatus: 'loading' }));
      console.log('🔄 Iniciando busca de dados no Supabase...');

      // 1. Critical Data - Loads immediately for Dashboard interactions
      const [
        { data: tickets, error: ticketError },
        { data: users, error: userError },
        { data: messages, error: messageError }
      ] = await Promise.all([
        supabase.from('tickets').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('messages').select('*')
      ]);

      if (ticketError) console.error('❌ Erro ao buscar tickets:', ticketError);
      if (userError) console.error('❌ Erro ao buscar perfis:', userError);
      if (messageError) console.error('❌ Erro ao buscar mensagens:', messageError);

      console.log(`📊 Dados Principais: ${tickets?.length || 0} tickets, ${users?.length || 0} usuários, ${messages?.length || 0} mensagens`);

      if (ticketError || userError || messageError) {
        const errorMsg = [ticketError, userError, messageError].filter(Boolean).map(e => e!.message).join(', ');
        showNotification(`Erro ao carregar dados: ${errorMsg}`, 'error');
      }

      // map messages with robust field selection
      const mappedMessages: ChatMessage[] = (messages || []).map((m: any) => ({
        id: m.id,
        senderId: m.sender_id || m.senderId || m.senderid,
        receiverId: m.receiver_id || m.receiverId || m.receiverid,
        text: m.text,
        timestamp: m.timestamp,
        read: m.read,
        messageType: m.message_type || m.messageType || 'text',
        attachmentUrl: m.attachment_url || m.attachmentUrl,
        attachmentName: m.attachment_name || m.attachmentName,
        attachmentSize: m.attachment_size || m.attachmentSize,
        attachmentMimeType: m.attachment_mime_type || m.attachmentMimeType,
        deliveredAt: m.delivered_at || m.deliveredAt
      }));

      // Map tickets from snake_case (DB) to camelCase (TS)
      const mappedTickets: Ticket[] = (tickets || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        requester: t.requester,
        galpao: t.galpao,
        grupo: t.grupo,
        manuseadoPor: t.manuseado_por || t.manuseadoPor,
        sector: t.sector,
        machineId: t.machine_id || t.machineId,
        status: t.status,
        priority: t.priority,
        description: t.description,
        selectedProblems: t.selected_problems || t.selectedProblems,
        customDescription: t.custom_description || t.customDescription,
        machineCategory: t.machine_category || t.machineCategory,
        operator: t.operator,
        createdAt: t.created_at || t.createdAt,
        startedAt: t.started_at || t.startedAt,
        completedAt: t.completed_at || t.completedAt,
        mecanicoId: t.mecanico_id || t.mecanicoId,
        mechanicIds: t.mechanic_ids || t.mechanicIds,
        totalTimeSpent: t.total_time_spent || t.totalTimeSpent,
        pausedByUserId: t.paused_by_user_id || t.pausedByUserId,
        notes: t.notes,
        createdBy: t.created_by || t.createdBy
      }));

      // Map users (profiles) with robust field selection
      let mappedUsers: User[] = (users || []).map((u: any) => ({
        id: u.id,
        name: u.name || u.full_name || 'Usuário Sem Nome',
        email: u.email,
        role: (u.role as UserRole) || UserRole.MECANICO,
        active: u.active !== undefined ? u.active : true,
        avatar: u.avatar || u.avatar_url || defaultAvatar,
        nickname: u.nickname || u.username,
        status: (u.status as UserStatus) || UserStatus.AVAILABLE,
        jobRoleId: u.job_role_id || u.jobRoleId || u.jobroleid
      }));

      // --- SEGURANÇA E DIAGNÓSTICO ---
      // Se houver um usuário logado mas a lista de perfis estiver vazia ou contiver apenas ele mesmo
      // isso é um forte indício de que o RLS está bloqueando a leitura de outros perfis.
      if (user && mappedUsers.length <= 1) {
        console.warn('⚠️ Atenção: Apenas um perfil carregado. Isso pode ser restrição de RLS no Supabase.');

        // Garante que o usuário logado esteja pelo menos na lista se não foi retornado pelo profiles
        if (!mappedUsers.some(u => u.id === user.id)) {
          mappedUsers.push({
            ...user,
            role: user.role || UserRole.MECANICO,
            name: user.name || 'Eu'
          } as User);
        }
      }

      // 2. Secondary Data - Loads in background
      const [
        { data: machines, error: machineError },
        { data: logs, error: logError },
        { data: warehouses, error: warehouseError },
        { data: groups, error: groupError }
      ] = await Promise.all([
        supabase.from('machines').select('*'),
        supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(20),
        supabase.from('warehouses').select('*'),
        supabase.from('sector_groups').select('*')
      ]);

      if (machineError) console.error('❌ Erro ao buscar máquinas:', machineError);
      if (logError) console.error('❌ Erro ao buscar logs:', logError);
      if (warehouseError) console.error('❌ Erro ao buscar galpões:', warehouseError);
      if (groupError) console.error('❌ Erro ao buscar grupos:', groupError);

      console.log(`📊 Dados Secundários: ${machines?.length || 0} máquinas, ${warehouses?.length || 0} galpões, ${groups?.length || 0} grupos`);

      if (machineError || warehouseError || groupError) {
        showNotification('Erro ao carregar configurações (máquinas/galpões/grupos).', 'error');
      }

      setState(prev => ({
        ...prev,
        tickets: mappedTickets,
        users: mappedUsers,
        messages: mappedMessages,
        machines: (machines as any[]) || [],
        activityLogs: (logs as any[]) || [],
        warehouses: (warehouses as any[]) || [],
        groups: (groups as any[]) || [],
        connectionStatus: 'online',
        lastSync: new Date().toISOString(),
        dataStats: {
          tickets: mappedTickets.length,
          users: mappedUsers.length,
          messages: mappedMessages.length,
          machines: (machines as any[])?.length || 0
        }
      }));

      console.log('✅ Sincronização com Supabase concluída');

    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.message?.includes('abort')) {
        console.log('fetchData abortado (previsto)');
        return;
      }
      console.error("❌ Erro fatal no fetchData:", error);
      setState(prev => ({ ...prev, connectionStatus: 'error' }));
      showNotification(`Erro crítico de conexão: ${error?.message || 'Erro desconhecido'}`, 'error');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      // Sincroniza usuário e busca dados apenas se o ID do usuário mudou
      if (lastFetchedUserId.current !== user.id) {
        console.log(`🔑 Login detectado: ${user.name} (${user.id})`);
        lastFetchedUserId.current = user.id;

        setState(prev => ({
          ...prev,
          currentUser: {
            ...user,
            role: user.role || UserRole.MECANICO,
            name: user.name || user.email?.split('@')[0] || 'Usuário'
          } as User
        }));

        fetchData();
      }
    } else if (!authLoading && !user) {
      lastFetchedUserId.current = null;
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
      fetchData(); // Recarrega para manter sincronizado
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
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-2xl size-11 ring-2 ring-primary/20 shadow-sm" style={{ backgroundImage: `url(${user?.avatar || defaultAvatar})` }}></div>
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
              showNotification('Chamado aceito com sucesso!');
              setState(prev => ({ ...prev, activeTicketId: id, view: 'active_ticket' }));
              fetchData();
            }
          }}
          onDelete={async (id) => {
            const { error } = await supabase.from('tickets').delete().eq('id', id);
            if (error) {
              showNotification('Erro ao excluir chamado', 'error');
            } else {
              showNotification('Chamado excluído');
              fetchData();
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
              const { error } = await supabase.from('profiles').insert([userData]);
              if (error) throw error;
              showNotification('Usuário adicionado com sucesso!');
              fetchData();
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
                const { error } = await supabase.from('tickets').update({
                  status: TicketStatus.COMPLETED,
                  completed_at: new Date().toISOString(),
                  total_time_spent: totalTime,
                  notes
                }).eq('id', ticket.id);

                if (error) throw error;

                await supabase.from('activity_logs').insert([{
                  user_id: state.currentUser?.id,
                  user_name: state.currentUser?.name,
                  user_role: state.currentUser?.role,
                  action: `Finalizou o chamado #${ticket.id}`,
                  details: `Obs: ${notes} | Tempo total: ${totalTime}s`,
                  timestamp: new Date().toISOString()
                }]);

                showNotification('Chamado finalizado com sucesso!');
                fetchData();
                navigateTo('dashboard');

                // Check for another active ticket for the current user
                const activeTicket = state.tickets.find(t =>
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

                await supabase.from('activity_logs').insert([{
                  user_id: state.currentUser?.id,
                  user_name: state.currentUser?.name,
                  user_role: state.currentUser?.role,
                  action: `Pausou o chamado #${ticket.id}`,
                  details: `Motivo: ${reason} | Tempo nesta sessão: ${timeSpent}s`,
                  timestamp: new Date().toISOString()
                }]);

                showNotification('Chamado pausado');
                fetchData();
                navigateTo('dashboard');
              } catch (err: any) {
                showNotification(`Erro ao pausar: ${err.message}`, 'error');
              }
            }}
            onTransfer={async (reason) => {
              try {
                await supabase.from('activity_logs').insert([{
                  user_id: state.currentUser?.id,
                  user_name: state.currentUser?.name,
                  user_role: state.currentUser?.role,
                  action: `Setorizou o chamado #${ticket.id}`,
                  details: reason,
                  timestamp: new Date().toISOString()
                }]);
                showNotification('Chamado setorizado');
                fetchData();
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
          onUpdateUser={() => fetchData()}
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
            for (const item of list) {
              if (item.id.startsWith('temp-')) {
                const { id, ...rest } = item;
                await supabase.from('machines').insert([rest]);
              } else {
                await supabase.from('machines').upsert([item]);
              }
            }
            showNotification('Máquinas atualizadas');
            fetchData();
          }}
          onUpdateGroups={async (list) => {
            showNotification('Sincronizando grupos...');
            for (const item of list) {
              if (item.id.startsWith('temp-')) {
                const { id, ...rest } = item;
                await supabase.from('sector_groups').insert([rest]);
              } else {
                await supabase.from('sector_groups').upsert([item]);
              }
            }
            showNotification('Grupos atualizados');
            fetchData();
          }}
          onUpdateWarehouses={async (list) => {
            showNotification('Sincronizando galpões...');
            for (const item of list) {
              if (item.id.startsWith('temp-')) {
                const { id, ...rest } = item;
                await supabase.from('warehouses').insert([rest]);
              } else {
                await supabase.from('warehouses').upsert([item]);
              }
            }
            showNotification('Galpões atualizados');
            fetchData();
          }}
          onUpdateJobRoles={async (list) => {
            showNotification('Sincronizando funções...');
            for (const item of list) {
              if (item.id.startsWith('temp-')) {
                const { id, ...rest } = item;
                await supabase.from('job_roles').insert([rest]);
              } else {
                await supabase.from('job_roles').upsert([item]);
              }
            }
            showNotification('Funções atualizadas');
            fetchData();
          }}
          onAddUser={async (userData) => {
            await supabase.from('profiles').insert([userData]);
            fetchData();
          }}
          onEditUser={async (userData) => {
            const { error } = await supabase.from('profiles').update(userData).eq('id', userData.id);
            if (error) {
              showNotification('Erro ao atualizar usuário', 'error');
            } else {
              showNotification('Usuário atualizado com sucesso!');
              fetchData();
            }
          }}
          onDeleteUser={async (id) => {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (error) {
              showNotification('Erro ao remover usuário', 'error');
            } else {
              showNotification('Usuário removido');
              fetchData();
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
    </Layout>
  );
};

export default App;