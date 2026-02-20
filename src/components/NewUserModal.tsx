
import React, { useState, useEffect } from 'react';
import { User, UserStatus } from '../types';
import { supabase } from '@/supabase';


interface NewUserModalProps {
  onClose: () => void;
  onSubmit: (user: User) => void;
  editData?: User;
}

const NewUserModal: React.FC<NewUserModalProps> = ({
  onClose,
  onSubmit,
  editData
}) => {

  const [formData, setFormData] = useState({
    name: editData?.name || '',
    nickname: editData?.nickname || '',
    email: editData?.email || '',
    jobRoleId: editData?.jobRoleId || '',
    password: ''
  });

  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from('job_roles')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Erro ao buscar funções:', error);
        return;
      }

      if (data) {
        setRoles(data);
      }
    };

    fetchRoles();
  }, []);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.nickname.trim() || !formData.email.trim()) {
      alert('Preencha os campos obrigatórios!');
      return;
    }

    try {
      // CREATE flow
      if (!editData) {
        // Use Supabase Auth to create user (stores password correctly)
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
              nickname: formData.nickname,
              job_role_id: formData.jobRoleId
            }
          }
        });

        if (error) {
          console.error('Erro ao criar usuário via Auth:', error);
          alert('Erro ao criar usuário: ' + error.message);
          return;
        }

        const userId = (data as any)?.user?.id;
    
        // Notifica pai com dados mínimos (sem senha)
        onSubmit({
          id: userId || '',
          name: formData.name,
          nickname: formData.nickname,
          email: formData.email,
          jobRoleId: formData.jobRoleId,
          avatar: `https://picsum.photos/seed/${formData.nickname}/200`,
          active: true,
          role: (editData as any)?.role || undefined,
        } as User);

        onClose();
        return;
      }

      // EDIT flow — update profiles table (never send password here)
      const profilePayload: any = {
        name: formData.name,
        nickname: formData.nickname.toLowerCase().replace(/\s/g, ''),
        email: formData.email,
        job_role_id: formData.jobRoleId || null,
        avatar: editData?.avatar || `https://picsum.photos/seed/${formData.nickname}/200`,
        active: editData?.active ?? true
      };

      const { error: updateErr } = await supabase.from('profiles').update(profilePayload).eq('id', editData.id);
      if (updateErr) {
        console.error('Erro ao atualizar profile:', updateErr);
        alert('Erro ao atualizar usuário: ' + updateErr.message);
        return;
      }

      // If password provided, only allow changing if current auth user is the same user
      if (formData.password) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const currentUserId = (authData as any)?.user?.id;
          if (currentUserId && currentUserId === editData.id) {
            if (formData.password && formData.password.trim().length >= 6) {
              const { error } = await supabase.auth.updateUser({
                password: formData.password
              });

              if (error) {
                console.error("Erro ao atualizar senha:", error);
                alert("Senha não pôde ser atualizada: " + error.message);
              }
            }
          } else {
            // Admin changing another user's password requires Service Role — cannot be done client-side
            alert('Para alterar a senha de outro usuário é necessário usar a API server-side com Service Role Key.');
          }
        } catch (e) {
          console.error('Erro ao tentar atualizar senha:', e);
        }
      }

      // return sanitized updated user to parent
      onSubmit({
        id: editData.id,
        name: profilePayload.name,
        nickname: profilePayload.nickname,
        email: profilePayload.email,
        jobRoleId: profilePayload.job_role_id,
        avatar: profilePayload.avatar,
        active: profilePayload.active,
        role: editData.role
      } as User);

      onClose();

    } catch (err) {
      console.error('Erro no handleSubmit NewUserModal:', err);
      alert('Erro inesperado ao salvar usuário. Veja console para detalhes.');
    }
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
              required={!editData}
              className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 h-14 px-4 shadow-sm"
              placeholder={editData ? 'Deixe em branco para manter a senha atual' : 'Digite a senha'}
              type="password"
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
              value={formData.jobRoleId}
              onChange={(e) =>
                setFormData(prev => ({
                  ...prev,
                  jobRoleId: e.target.value
                }))
              }
            >
              <option value="">Selecione a função</option>

              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
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
