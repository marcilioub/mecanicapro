import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { User, UserRole, UserStatus } from '../types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Ref para controlar cancelamento de requisições assíncronas
    const abortControllerRef = useRef<AbortController | null>(null);

    // Ref para evitar dupla inicialização em React.StrictMode
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        // Inicialização
        const initializeAuth = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                setSession(initialSession);

                if (initialSession) {
                    await fetchUserProfile(initialSession);
                } else {
                    setLoading(false);
                }
            } catch (error: any) {
                if (error?.name === 'AbortError') return;
                console.error('Erro na inicialização do Auth:', error);
                setLoading(false);
            }
        };

        initializeAuth();

        // Ouvinte de mudanças na autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log(`🔔 Evento Auth: ${event}`);
            setSession(currentSession);

            if (currentSession) {
                // Se o evento for SIGNED_IN ou INITIAL_SESSION, buscamos o perfil
                await fetchUserProfile(currentSession);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        // Fail-safe para não travar a UI infinitamente
        const timeout = setTimeout(() => setLoading(false), 8000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, []);

    const fetchUserProfile = async (currentSession: Session) => {
        // Cancelar requisição anterior se houver uma em curso
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const userId = currentSession.user.id;

        // --- OPTIMISTIC UI: Libera o acesso imediatamente com dados básicos ---
        // Isso remove a sensação de "lentidão" no login
        setUser({
            id: userId,
            name: currentSession.user.email?.split('@')[0] || 'Usuário',
            email: currentSession.user.email || '',
            role: UserRole.MECANICO, // Role padrão temporária
            nickname: currentSession.user.email?.split('@')[0] || '', // Fallback para nickname inicial
            active: true,
            status: UserStatus.AVAILABLE,
            jobRoleId: null
        });
        setLoading(false); // <--- A MÁGICA: A tela carrega instantaneamente aqui

        try {
            console.log('📥 Buscando perfil do usuário (background):', userId);

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .abortSignal(abortControllerRef.current.signal)
                .single();

            if (error) {
                if (error.message?.includes('aborter') || error.code === 'PGRST_ERROR') {
                    // Ignora erros de abortagem
                    return;
                }
                console.warn('⚠️ Perfil não encontrado no banco, mantendo fallback.', error);
                return;
            }

            if (!data) return;

            // Buscar o nome do cargo a partir de job_role_id (preferível ao campo role direto)
            let resolvedRoleName: string | undefined = undefined;
            const jobRoleId = data.job_role_id || data.jobroleid;
            if (jobRoleId) {
                try {
                    const { data: jr } = await supabase.from('job_roles').select('id,name').eq('id', jobRoleId).single();
                    if (jr && jr.name) resolvedRoleName = jr.name;
                } catch (e) {
                    // ignore and fallback
                }
            }

            // Atualiza com os dados reais do banco
            setUser({
                id: data.id,
                name: data.name || currentSession.user.email?.split('@')[0] || '',
                email: data.email || currentSession.user.email || '',
                role: resolvedRoleName || (data.role as UserRole) || UserRole.MECANICO,
                active: !!data.active,
                avatar: data.avatar || '',
                nickname: data.nickname || data.name || '',
                status: (data.status as UserStatus) || UserStatus.AVAILABLE,
                jobRoleId: jobRoleId
            });

            console.log('✅ Perfil atualizado em segundo plano');
        } catch (err: any) {
            if (err.name === 'AbortError' || err.message?.includes('abort')) {
                console.log('Fetch de perfil abortado: Requisição duplicada ou cancelada.');
            } else {
                console.error('❌ Erro inesperado no perfil:', err);
            }
        }
    };

    const signOut = async () => {
        // Limpa o estado local imediatamente para logout instantâneo
        if (abortControllerRef.current) abortControllerRef.current.abort();
        setUser(null);
        setSession(null);

        // Faz o signOut do Supabase em background (não bloqueia a UI)
        supabase.auth.signOut().catch(error => {
            console.error('Erro ao sair do Supabase:', error);
        });
    };

    const refreshSession = async () => {
        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setSession(currentSession);

            if (currentSession) {
                await fetchUserProfile(currentSession);
            } else {
                setUser(null);
                setLoading(false);
            }
        } catch (err: any) {
            console.error('Erro ao atualizar sessão:', err);
        }
    };

    const contextValue = React.useMemo(() => ({
        user,
        session,
        loading,
        signOut,
        refreshSession
    }), [user, session, loading]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};