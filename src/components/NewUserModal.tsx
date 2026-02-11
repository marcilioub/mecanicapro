
import React, { useState } from 'react';
import { User, UserRole, UserStatus } from '../types';

interface NewUserModalProps {
  onClose: () => void;
  onSubmit: (user: User) => void;
  editData?: User;
}

const NewUserModal: React.FC<NewUserModalProps> = ({ onClose, onSubmit, editData }) => {
  const [formData, setFormData] = useState({
    name: editData?.name || '',
    nickname: editData?.nickname || '',
    email: editData?.email || '',
    role: editData?.role || UserRole.MECANICO,
    password: editData?.password || '1234',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.nickname.trim()) {
      alert('Preencha os campos obrigatórios!');
      return;
    }

    const newUser: User = {
      id: editData?.id || Math.random().toString(36).substr(2, 9),
      name: formData.name,
      nickname: formData.nickname.toLowerCase().replace(/\s/g, ''),
      email: formData.email,
      role: formData.role,
      active: editData ? editData.active : true,
      avatar: editData?.avatar || `https://picsum.photos/seed/${formData.nickname}/200`,
      password: formData.password,
      status: editData?.status || UserStatus.AVAILABLE
    };

    onSubmit(newUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-[#1c222d] rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="flex flex-col items-center pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700"></div>
        </div>

        <header className="flex items-center px-4 py-2 justify-between border-b border-slate-100 dark:border-slate-800">
          <button onClick={onClose} className="text-slate-800 dark:text-slate-100 flex size-10 items-center justify-center">
            <span className="material-symbols-outlined">close</span>
          </button>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold flex-1 text-center">
            {editData ? 'Editar Colaborador' : 'Cadastrar Novo Usuário'}
          </h2>
          <div className="flex w-10"></div>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-700 dark:text-slate-300 text-xs font-bold px-1 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">badge</span>
              Nome Completo *
            </label>
            <input
              required
              className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 h-14 px-4 shadow-sm"
              placeholder="Ex: Roberto Almeida"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-700 dark:text-slate-300 text-xs font-bold px-1 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">alternate_email</span>
              Nome de Usuário *
            </label>
            <input
              required
              className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 h-14 px-4 shadow-sm"
              placeholder="Ex: roberto.almeida"
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
              disabled={!!editData}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-700 dark:text-slate-300 text-xs font-bold px-1 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">mail</span>
              E-mail *
            </label>
            <input
              required
              className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 h-14 px-4 shadow-sm"
              placeholder="Ex: roberto@mecanicapro.com"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-700 dark:text-slate-300 text-xs font-bold px-1 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">lock</span>
              Senha de Acesso *
            </label>
            <input
              required
              className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 h-14 px-4 shadow-sm"
              placeholder="Digite a senha"
              type="text"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-700 dark:text-slate-300 text-xs font-bold px-1 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">work</span>
              Função *
            </label>
            <select
              required
              className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 h-14 px-4 shadow-sm appearance-none"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
            >
              <option value={UserRole.MECANICO}>Mecânico</option>
              <option value={UserRole.SUPERVISOR}>Supervisor</option>
              <option value={UserRole.ADMIN}>Administrador</option>
            </select>
          </div>

          <div className="pt-4 pb-4">
            <button
              type="submit"
              className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span className="material-symbols-outlined">{editData ? 'save' : 'person_add'}</span>
              {editData ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewUserModal;
