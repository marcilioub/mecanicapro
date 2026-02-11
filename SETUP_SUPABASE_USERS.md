## 🔐 Criando Usuários de Teste no Supabase

Para testar o login, você precisa criar usuários na autenticação do Supabase.

### Passos:

1. **Acesse seu projeto Supabase** em https://supabase.com/dashboard

2. **Vá para Authentication → Users**

3. **Clique em "Create a new user"** e crie os seguintes usuários:

#### Usuário 1: Mecânico
- **Email:** `mecanico@mpro.app.br`
- **Password:** `senha123` (ou qual senha desejar)
- Clique em **Create user**

#### Usuário 2: Admin
- **Email:** `admin@mpro.app.br`
- **Password:** `senha123` (ou qual senha desejar)
- Clique em **Create user**

### No Login da Aplicação:

Agora você pode usar:
- **Usuário:** `mecanico` (ou o email `mecanico@mpro.app.br`)
- **Senha:** `senha123`

Após o login bem-sucedido, você será redirecionado automaticamente para o **Dashboard**.

---

## 📊 Próximas Etapas (Opcionais)

Se quiser criar a tabela `profiles` com dados adicionais do usuário, execute o SQL em **SQL Editor**:

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  nickname TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'mecanico',
  avatar TEXT,
  status TEXT DEFAULT 'available',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
```

Então insira os dados dos usuários criados (substitua os UUIDs pelos IDs reais dos usuários):

```sql
INSERT INTO public.profiles (id, email, nickname, name, role)
VALUES 
  ('YOUR-USER-1-UUID', 'mecanico@mpro.app.br', 'mecanico', 'Mecânico Um', 'mecanico'),
  ('YOUR-USER-2-UUID', 'admin@mpro.app.br', 'admin', 'Administrador', 'admin');
```
