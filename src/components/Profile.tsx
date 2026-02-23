
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { useTheme } from './ThemeContext';
import defaultAvatar from '../assets/default-avatar.svg';
import Avatar from './Avatar';
import { supabase } from '../supabase';

interface ProfileProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
  onUpdateUser: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onBack, onLogout, onUpdateUser }) => {
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState(user.name || '');
  const [nickname, setNickname] = useState(user.nickname || '');
  const [email, setEmail] = useState(user.email || '');
  const [avatar, setAvatar] = useState<string | null>(user.avatar || null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estado interno se o prop user mudar (após salvamento)
  useEffect(() => {
    setName(user.name || '');
    setNickname(user.nickname || '');
    setEmail(user.email || '');
    setAvatar(user.avatar || null);
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("A imagem deve ter no máximo 2MB.");
        return;
      }

      try {
        setUploading(true);
        setError(null);

        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        console.log('📤 Tentando upload:', { bucket: 'mecanicapro', filePath, type: file.type });

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('mecanicapro')
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type
          });

        if (uploadError) {
          console.error('❌ Erro Supabase Storage:', uploadError);
          throw new Error(uploadError.message || 'Erro no upload');
        }

        console.log('✅ Upload concluído:', uploadData);

        const { data: { publicUrl } } = supabase.storage
          .from('mecanicapro')
          .getPublicUrl(filePath);

        setAvatar(publicUrl);

        // Update profile immediately for the photo
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar: publicUrl })
          .eq('id', user.id);

        if (updateError) throw updateError;

        onUpdateUser();
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: any) {
        setError(`Erro no upload: ${err.message}`);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    // Validação de senha
    if (newPassword && newPassword !== confirmPassword) {
      setError("O campo 'Repetir Nova Senha' está divergente da 'Nova Senha'. Por favor, corrija.");
      setLoading(false);
      return;
    }

    try {
      // 1. Atualizar Supabase Auth (Metadata e Credenciais)
      // Sincronizar os metadados do Auth com a tabela profiles para consistência
      const authUpdates: any = {
        data: {
          full_name: name.trim(),
          nickname: nickname.trim(),
          avatar_url: avatar
        }
      };

      if (email !== user.email && email.trim() !== '') {
        authUpdates.email = email.trim();
      }
      if (newPassword) {
        authUpdates.password = newPassword;
      }

      console.log('🔄 Sincronizando metadados do Auth...');
      const { error: authError } = await supabase.auth.updateUser(authUpdates);
      if (authError) throw authError;

      if (authUpdates.email) {
        setError("Atenção: Um e-mail de confirmação foi enviado para o novo endereço. O e-mail só será alterado após a confirmação.");
      }

      // 2. Atualizar perfil na tabela 'profiles'
      const updates: any = {
        name: name.trim(),
        nickname: nickname.trim(),
        email: email.trim() // Sincroniza o e-mail na tabela também
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      onUpdateUser();
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(`Erro ao salvar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-sans">
      <header className="sticky top-0 z-50 flex items-center bg-white/70 dark:bg-slate-900/70 ios-blur px-6 py-5 border-b border-slate-200 dark:border-slate-800 justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="size-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-90 transition-all hover:text-primary"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-black font-display tracking-tight text-slate-900 dark:text-white leading-none">Minha Conta</h1>
            <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">Configurações de Identidade</p>
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
          <div className="size-10"></div>
        </div>
      </header>

      <main className="p-6 lg:p-10 max-w-2xl mx-auto w-full pb-32">
        <form onSubmit={handleSave} className="space-y-8">
          <div className="flex flex-col items-center py-8 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-white dark:border-slate-800 shadow-premium relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-primary/10 to-transparent"></div>
            <div className="relative group z-10">
              <div
                className="size-40 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-500"
              >
                <Avatar src={avatar || null} name={user.nickname || user.name} className="w-full h-full size-full bg-cover bg-center" />
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-3xl animate-spin">sync</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-3 -right-3 size-12 bg-primary text-white rounded-2xl shadow-xl shadow-primary/30 cursor-pointer hover:scale-110 active:scale-90 transition-all flex items-center justify-center z-20 border-4 border-white dark:border-slate-900 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-xl">edit_square</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div className="mt-8 text-center px-6">
              <h3 className="text-xl font-black font-display text-slate-900 dark:text-white">{user.nickname || user.name}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">{user.role}</p>
            </div>
            <p className="mt-6 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">Selecione uma imagem de até 2MB</p>
          </div>

          {success && (
            <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-3xl flex items-center gap-4 text-emerald-800 dark:text-emerald-400 animate-in slide-in-from-top-4 shadow-xl shadow-emerald-500/5">
              <div className="bg-success size-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-success/20">
                <span className="material-symbols-outlined text-white text-xl">verified</span>
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tight leading-tight">Perfil Atualizado</p>
                <p className="text-[11px] font-bold opacity-70">Suas novas configurações já estão em vigor no sistema.</p>
              </div>
            </div>
          )}

          {error && (
            <div className={`p-5 ${error.includes('confirmação') ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/50' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800/50'} rounded-3xl flex items-center gap-4 text-slate-800 dark:text-slate-200 animate-in shake duration-300 shadow-xl shadow-black/5`}>
              <div className={`${error.includes('confirmação') ? 'bg-amber-500' : 'bg-danger'} size-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg`}>
                <span className="material-symbols-outlined text-white text-xl">{error.includes('confirmação') ? 'info' : 'error_outline'}</span>
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tight leading-tight">{error.includes('confirmação') ? 'Aviso Importante' : 'Falha na Validação'}</p>
                <p className="text-[11px] font-bold opacity-70">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-3 pl-1 mb-2">
                <span className="material-symbols-outlined text-primary text-xl">badge</span>
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Credenciais de Operação</h2>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-xl">person</span>
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo..."
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all font-bold h-14 pl-14 pr-6"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nickname (Usuário de Sistema)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-xl">alternate_email</span>
                  </div>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Nome de usuário para acesso..."
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all font-bold h-14 pl-14 pr-6"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Contato</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-xl">mail</span>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Seu e-mail corporativo..."
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all font-bold h-14 pl-14 pr-6"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-3 pl-1 mb-2">
                <span className="material-symbols-outlined text-danger text-xl">security</span>
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Criptografia de Acesso</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Chave de Acesso</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova senha..."
                    autoComplete="new-password"
                    className={`w-full bg-slate-50 dark:bg-slate-800/50 border rounded-2xl text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all font-bold h-14 px-6 ${error && error.includes('Senha') ? 'border-danger ring-4 ring-danger/10' : 'border-slate-100 dark:border-slate-800'}`}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmação de Chave</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha..."
                    autoComplete="new-password"
                    className={`w-full bg-slate-50 dark:bg-slate-800/50 border rounded-2xl text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all font-bold h-14 px-6 ${error && error.includes('divergente') ? 'border-danger ring-4 ring-danger/10' : 'border-slate-100 dark:border-slate-800'}`}
                    disabled={loading}
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-bold ml-1 italic opacity-60">Deixe os campos em branco para manter a senha atual.</p>
            </div>
          </div>

          <div className="max-w-xs mx-auto w-full pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 dark:bg-primary text-white font-black py-5 rounded-2xl shadow-2xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="material-symbols-outlined text-xl animate-spin">sync</span>
              ) : (
                <span className="material-symbols-outlined text-xl">shield_check</span>
              )}
              {loading ? 'Sincronizando...' : 'Sincronizar Dados'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Profile;
