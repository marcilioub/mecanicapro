
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, Ticket, TicketStatus, UserStatus, UserRole, checkIsAdmin } from '../types';
import NewUserModal from './NewUserModal';
import Avatar from './Avatar';

interface UserManagementProps {
  currentUser: User;
  users: User[];
  tickets: Ticket[];
  onAddUser: (user: User) => void;
  onOpenChat: (userId: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, users, tickets, onAddUser, onOpenChat }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    const list = users.filter(u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.nickname && u.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Ordenar: o usuário atual sempre no topo
    return list.sort((a, b) => {
      if (a.id === currentUser.id) return -1;
      if (b.id === currentUser.id) return 1;
      return 0;
    });
  }, [users, searchTerm, currentUser.id]);

  const getUserStatus = (user: User) => {
    // Primeiro check: se o usuário tem um chamado em curso na lista global de chamados
    const hasActiveTicket = tickets.some(t => t.status === TicketStatus.IN_PROGRESS && (t.mecanicoId === user.id || t.mechanicIds?.includes(user.id)));

    if (hasActiveTicket) {
      return { label: 'Ocupado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    }

    if (user.status) {
      switch (user.status) {
        case UserStatus.INACTIVE:
          return { label: 'Inativo', color: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400' };
        case UserStatus.BUSY:
          return { label: 'Ocupado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
        case UserStatus.AVAILABLE:
          return { label: 'Livre', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
      }
    }

    if (!user.active) {
      return { label: 'Inativo', color: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400' };
    }

    return { label: 'Livre', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto">
          <div className="text-primary flex size-10 shrink-0 items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined">group</span>
          </div>
          <h2 className="text-[#0d131c] dark:text-white text-lg font-bold leading-tight flex-1 text-center">Gestão de Usuários</h2>
          <button
            onClick={() => setIsNewUserModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center gap-1 shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            <span>Novo</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto w-full pb-20">
        <div className="px-4 py-4">
          <label className="flex flex-col min-w-40 h-12 w-full">
            <div className="flex w-full flex-1 items-stretch rounded-xl h-full shadow-sm">
              <div className="text-[#49699c] dark:text-slate-400 flex bg-white dark:bg-slate-800 items-center justify-center pl-4 rounded-l-xl">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                className="form-input flex w-full flex-1 border-none bg-white dark:bg-slate-800 text-[#0d131c] dark:text-white h-full placeholder:text-[#49699c] px-4 rounded-r-xl focus:ring-0 text-base"
                placeholder="Pesquisar por nome ou usuário"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between px-4 pt-2 pb-2">
          <h3 className="text-[#0d131c] dark:text-white text-lg font-bold leading-tight">Lista de Colaboradores</h3>
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400">{filteredUsers.length} usuários</span>
        </div>

        <div className="flex flex-col gap-3 px-4 mt-2">
          {filteredUsers.map(user => {
            const status = getUserStatus(user);
            const isSelf = user.id === currentUser.id;

            return (
              <div key={user.id} className={`flex flex-col gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all ${user.status === UserStatus.INACTIVE || !user.active ? 'opacity-70' : ''} ${isSelf ? 'border-primary/40 ring-1 ring-primary/10' : ''}`}>
                <div className="flex items-start gap-4">
                  <Avatar
                    src={user.avatar || null}
                    name={user.name}
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14 ring-2 ring-primary/10 shadow-inner"
                  />
                  <div className="flex flex-1 flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <p className="text-[#0d131c] dark:text-white text-base font-bold leading-normal">{user.name} {isSelf && '(Eu)'}</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[#49699c] dark:text-slate-400">
                      <span className="material-symbols-outlined text-xs">alternate_email</span>
                      <p className="text-sm font-normal truncate">{user.nickname || 'sem usuário'}</p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter ${checkIsAdmin(user.role) ? 'bg-primary/10 text-primary border border-primary/20' :
                            user.role === UserRole.SUPERVISOR ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                              'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600'
                          }`}>
                          {user.role}
                        </span>
                      </div>

                      {!isSelf && (
                        <button
                          onClick={() => onOpenChat(user.id)}
                          className="flex items-center gap-1 bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow-sm shadow-primary/20"
                        >
                          <span className="material-symbols-outlined text-sm">chat_bubble</span>
                          CONVERSAR
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {isNewUserModalOpen && (
        <NewUserModal
          onClose={() => setIsNewUserModalOpen(false)}
          onSubmit={onAddUser}
        />
      )}
    </div>
  );
};

export default UserManagement;
