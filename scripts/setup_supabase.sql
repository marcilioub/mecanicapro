-- ============================================
-- SETUP INICIAL DO SUPABASE PARA MECÂNICAPRO
-- ============================================

-- 1. Tabela de Perfis de Usuários
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  nickname TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'mecanico', -- 'admin', 'mecanico', 'gerente', 'user'
  avatar TEXT,
  status TEXT DEFAULT 'available', -- 'available', 'busy', 'offline'
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: Usuários podem ler seus próprios dados
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 4. RLS Policy: Usuários podem atualizar seus próprios dados
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 5. RLS Policy: Admins podem ler todos os perfis
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para atualizar updated_at
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 8. Criar usuários de teste (OPCIONAL - remova se quiser criar manualmente)
-- Você pode comentar essas linhas se preferir criar os usuários via console do Supabase

-- Usuário teste: mecanico1@mpro.app.br / senha123
INSERT INTO public.profiles (id, email, nickname, name, role, status, active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'mecanico1@mpro.app.br',
  'mecanico1',
  'Mecânico Um',
  'mecanico',
  'available',
  true
) ON CONFLICT (id) DO NOTHING;

-- Usuário teste: admin@mpro.app.br / senha123
INSERT INTO public.profiles (id, email, nickname, name, role, status, active)
VALUES (
  '00000000-0000-0000-0000-000000000002'::UUID,
  'admin@mpro.app.br',
  'admin',
  'Administrador',
  'admin',
  'available',
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FIM DO SETUP
-- ============================================
