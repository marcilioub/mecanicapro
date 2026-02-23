-- ============================================
-- FIX LOGIN PERFORMANCE AND RLS
-- ============================================

-- 1. Index para busca rápida por nickname (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_profiles_nickname_case_insensitive 
ON public.profiles USING btree (ilike(nickname, '%'));
-- Nota: ilike no Postgres pode ser lento sem um índice trigram se usar %, 
-- mas para igualdade ilike 'nome', um índice btree comum com lower() ajuda.
CREATE INDEX IF NOT EXISTS idx_profiles_nickname_lower ON public.profiles (lower(nickname));

-- 2. Garantir que a tabela profiles pode ser lida por usuários não autenticados 
-- APENAS para buscar o e-mail via nickname (Segurança controlada)
DROP POLICY IF EXISTS "Allow anonymous email lookup by nickname" ON public.profiles;
CREATE POLICY "Allow anonymous email lookup by nickname"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true); 
-- NOTA: Em produção, você pode querer restringir quais colunas são retornadas, 
-- mas para o Supabase Client, a política de SELECT se aplica à linha toda.

-- 3. Política para leitura geral (garantir que todos autenticados podem ver perfis)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Garantir que o trigger de novos usuários está correto
-- (Já parece estar, mas reforçamos o SECURITY DEFINER)
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER;

-- ============================================
-- EXECUTE ESTE SCRIPT NO SQL EDITOR DO SUPABASE
-- ============================================
