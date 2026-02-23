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

    useEffect(() => {
        // Inicialização e Ouvinte de mudanças na autenticação
        const initializeAndListen = async () => {
            try {
                // Tenta pegar a sessão inicial
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                setSession(initialSession);

                if (initialSession) {
                    await fetchUserProfile(initialSession);
                } else {
                    setLoading(false);
                }
            } catch (error: any) {
                if (error?.name !== 'AbortError') {
                    console.error('Erro na inicialização do Auth:', error);
                    setLoading(false);
                }
            }
        };

        initializeAndListen();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log(`🔔 Evento Auth: ${event}`, { hasSession: !!currentSession, userId: currentSession?.user?.id });

            setSession(currentSession);

            if (currentSession) {
                // Se temos sessão, buscamos o perfil em segundo plano
                // Liberamos o loading imediatamente para não travar a UI
                setLoading(false);
                fetchUserProfile(currentSession);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setLoading(false);
                console.log('👋 Usuário desconectado via SIGNED_OUT');
            } else {
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

    const fetchUserProfile = React.useCallback(async (currentSession: Session) => {
        // Cancelar requisição anterior se houver uma em curso
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const userId = currentSession.user.id;

        // --- OPTIMISTIC UI: Dados básicos para redundância ---
        const fallbackUser: User = {
            id: userId,
            name: currentSession.user.email?.split('@')[0] || 'Usuário',
            email: currentSession.user.email || '',
            role: UserRole.MECANICO,
            nickname: currentSession.user.email?.split('@')[0] || '',
            active: true,
            status: UserStatus.AVAILABLE,
            jobRoleId: null
        };

        try {
            console.log(`📥 Inherent Profile Fetch - User: ${userId}`);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            console.log(`📡 Profile Fetch Response:`, { data: !!data, error });

            if (error) {
                if (error.code !== 'PGRST_ERROR') {
                    console.warn('⚠️ Perfil não encontrado no banco, mantendo fallback.');
                }
                return;
            }

            if (!data) {
                setUser(fallbackUser);
                setLoading(false);
                return;
            }

            let resolvedRoleName: string | undefined = undefined;
            const jobRoleId = data.job_role_id || data.jobroleid;
            if (jobRoleId) {
                try {
                    const { data: jr } = await supabase.from('job_roles').select('id,name').eq('id', jobRoleId).single();
                    if (jr && jr.name) resolvedRoleName = jr.name;
                } catch (e) { }
            }

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
        } catch (err: any) {
            if (err.name !== 'AbortError' && !err.message?.includes('abort')) {
                console.error('❌ Erro inesperado no perfil:', err);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const signOut = React.useCallback(async () => {
        setUser(null);
        setSession(null);
        supabase.auth.signOut().catch(error => {
            console.error('Erro ao sair do Supabase:', error);
        });
    }, []);

    const refreshSession = React.useCallback(async () => {
        try {
            console.log('🔄 refreshSession solicitado');
            const { data: { session: currentSession } } = await supabase.auth.getSession();

            if (currentSession) {
                setSession(currentSession);
                await fetchUserProfile(currentSession);
            } else {
                // Não limpamos o usuário agressivamente aqui, deixamos o listener cuidar do SIGNED_OUT
                setLoading(false);
            }
        } catch (err: any) {
            console.error('Erro ao atualizar sessão:', err);
            setLoading(false);
        }
    }, [fetchUserProfile]);

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