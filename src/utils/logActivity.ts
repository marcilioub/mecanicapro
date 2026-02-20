import { supabase } from '../supabase';

export type ChamadoLogParams = {
  type: 'create' | 'assign' | 'pause' | 'finish' | 'status_change' | 'edit';
  chamadoId: string;
  clienteNome?: string;
  usuarioNome?: string;
  oldStatus?: string;
  newStatus?: string;
};

export function buildChamadoLog(p: ChamadoLogParams): string {
  const user = p.usuarioNome || 'Usuário';
  const id = p.chamadoId;

  switch (p.type) {
    case 'create':
      return `${user} criou o chamado #${id}${p.clienteNome ? ` para o cliente ${p.clienteNome}` : ''}`;

    case 'assign':
      return `${user} assumiu o chamado #${id}`;

    case 'pause':
      return `${user} pausou o chamado #${id}`;

    case 'finish':
      return `${user} finalizou o chamado #${id}`;

    case 'status_change':
      return `${user} alterou o status do chamado #${id} de '${p.oldStatus || 'desconhecido'}' para '${p.newStatus || 'desconhecido'}'`;

    case 'edit':
      return `${user} editou as informações do chamado #${id}`;

    default:
      return `${user} realizou uma ação no chamado #${id}`;
  }
}

/**
 * Registra atividade na tabela activity_logs
 * Compatível com sua tabela atual:
 * id | timestamp | user_id | action
 */
export async function logActivity(action: string, p0: string) {
  try {
    if (!action) return;

    console.debug('[logActivity] action received', { action });

    const { data } = await supabase.auth.getUser();

    if (!data?.user) {
      console.warn('logActivity: usuário não autenticado — abortando log', { action });
      return;
    }

    const payload = { user_id: data.user.id, action };
    console.debug('[logActivity] inserting', { payload });

    const { error } = await supabase.from('activity_logs').insert(payload);

    if (error) {
      console.error('logActivity: erro ao inserir activity_logs', error, { payload });
    } else {
      console.debug('[logActivity] inserted', { user_id: data.user.id, action });
    }

  } catch (err) {
    console.error('logActivity: exceção inesperada', err);
  }
}
