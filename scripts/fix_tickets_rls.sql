-- ============================================
-- FIX RLS POLICIES FOR TICKETS TABLE
-- ============================================

-- 1. Habilitar RLS na tabela de tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 2. Política de Leitura (Todos os usuários autenticados podem ver todos os chamados)
DROP POLICY IF EXISTS "Todos podem ver chamados" ON public.tickets;
CREATE POLICY "Todos podem ver chamados"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Política de Inserção (Qualquer usuário autenticado pode criar um chamado)
DROP POLICY IF EXISTS "Qualquer um pode criar chamado" ON public.tickets;
CREATE POLICY "Qualquer um pode criar chamado"
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Política de Atualização (Administradores ou o Criador do chamado)
-- Nota: 'created_by' deve conter o UUID do usuário que criou o ticket
DROP POLICY IF EXISTS "Admins ou Criador podem atualizar" ON public.tickets;
CREATE POLICY "Admins ou Criador podem atualizar"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND job_role_id = '4923fe2e-0eba-41b4-8c77-dd87ccc79c56'
    )
  );

-- 5. Política de Exclusão (Administradores ou o Criador do chamado)
DROP POLICY IF EXISTS "Admins ou Criador podem deletar" ON public.tickets;
CREATE POLICY "Admins ou Criador podem deletar"
  ON public.tickets
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND job_role_id = '4923fe2e-0eba-41b4-8c77-dd87ccc79c56'
    )
  );

-- ============================================
-- EXECUTE ESTE SCRIPT NO SQL EDITOR DO SUPABASE
-- ============================================
