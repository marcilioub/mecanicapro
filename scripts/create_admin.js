import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aenlcqywetfiivhjwymn.supabase.co';
const supabaseAnonKey = 'sb_publishable_E-K-2ima5OWXn2rjI4GO3w_G4JeFfKI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdmin() {
    console.log('Tentando criar usuário administrador...');

    const { data, error } = await supabase.auth.signUp({
        email: 'mecanicapro.app@gmail.com',
        password: '204587',
        options: {
            data: {
                name: 'Admin',
                full_name: 'Admin',
                role: 'admin'
            }
        }
    });

    if (error) {
        if (error.message === 'User already registered') {
            console.log('Usuário já existe. Você já pode fazer login com "Admin" e a senha "204587".');
        } else {
            console.error('Erro ao criar usuário:', error.message);
        }
        return;
    }

    console.log('Usuário Administrador criado com sucesso!');
    console.log('Email:', 'admin@example.com');
    console.log('Username para login:', 'Admin');
    console.log('Nota: Se o e-mail de confirmação estiver ativado no Supabase, você precisará confirmar o e-mail ou desativar a confirmação no Painel do Supabase para logar imediatamente.');
}

createAdmin();
