import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    console.log('🔐 Iniciando processo de login...');

    try {
      let emailToAuth = username.trim();

      if (!emailToAuth.includes('@')) {
        console.log('🔍 Nickname detectado, buscando e-mail correspondente:', emailToAuth);

        // Timeout de 10 segundos para o nickname
        const nicknameSearchPromise = supabase
          .from('profiles')
          .select('email')
          .ilike('nickname', emailToAuth)
          .single();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Busca expirou. Use seu e-mail.')), 10000)
        );

        const { data: profileData, error: profileError } = await Promise.race([
          nicknameSearchPromise,
          timeoutPromise
        ]) as any;

        console.log('📡 Resposta da busca de nickname:', { profileData, profileError });

        if (profileError || !profileData?.email) throw new Error('Usuário não encontrado.');

        emailToAuth = profileData.email;
        console.log('📧 E-mail resolvido para o nickname:', emailToAuth);
      }

      console.log('📧 Autenticando com:', emailToAuth);

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password: password,
      });

      if (authError) throw authError;

      if (data.user) {
        console.log('✅ Login OK, forçando redirecionamento...');
        navigate('/');
      }
    } catch (err: any) {
      console.error('❌ Falha no login:', err.message);
      setError(err.message === 'Invalid login credentials' ? 'Dados inválidos.' : err.message);
    } finally {
      // Bloqueio de Loop de Carregamento Infinito
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 max-w-[480px] mx-auto w-full pt-16 pb-10 font-sans">
      <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="size-20 bg-primary/10 backdrop-blur-md border border-primary/20 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-primary/20">
          <span className={`material-symbols-outlined text-primary text-5xl ${loading ? 'animate-spin-ccw' : ''}`}>
            {loading ? 'sync' : 'settings_suggest'}
          </span>
        </div>
        <h2 className="text-slate-900 dark:text-white text-4xl font-black font-display tracking-tighter">
          Mecânica<span className="text-primary italic">Pro</span>
        </h2>
      </div>

      <div className="bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-premium border border-white dark:border-slate-800 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-slate-900 dark:text-white text-2xl font-black font-display tracking-tight uppercase leading-none">Autenticação</h1>
          <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-2 opacity-60">
            {loading ? 'Verificando Credenciais...' : 'Entre com seu e-mail ou nickname'}
          </p>
        </div>

        {error && (
          <div className="mb-8 p-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/50 rounded-2xl flex items-center gap-4 text-red-700 dark:text-red-400 animate-in shake">
            <p className="text-xs font-bold leading-tight">{error}</p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail ou Nickname</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors text-2xl">mail</span>
              <input
                disabled={loading}
                className="w-full rounded-2xl text-slate-900 dark:text-white focus:outline-0 focus:ring-4 focus:ring-primary/10 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 h-16 pl-14 pr-6 text-sm font-bold transition-all disabled:opacity-50"
                placeholder="email@exemplo.com ou nickname"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chave de Segurança</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors text-2xl">shield_person</span>
              <input
                disabled={loading}
                className="w-full rounded-2xl text-slate-900 dark:text-white focus:outline-0 focus:ring-4 focus:ring-primary/10 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 h-16 pl-14 pr-6 text-sm font-bold transition-all disabled:opacity-50"
                placeholder="••••••••"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center rounded-2xl h-16 text-white text-xs font-black uppercase tracking-[0.2em] shadow-2xl transition-all ${loading ? 'bg-slate-400 cursor-wait' : 'bg-slate-900 dark:bg-primary hover:brightness-110 active:scale-[0.98]'
                }`}
            >
              {loading ? 'Processando...' : 'Iniciar Operação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;