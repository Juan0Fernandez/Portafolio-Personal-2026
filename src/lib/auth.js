import { supabase } from './supabase.js';

const ADMIN_EMAIL = 'fernandezj159@hotmail.com';

export async function checkAuth() {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (!session || sessionError || session.user.email !== ADMIN_EMAIL) {
        if (session) await supabase.auth.signOut();
        window.location.replace('/login');
        return false; 
    }

    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl && session.user.user_metadata) {
        greetingEl.innerText = session.user.user_metadata.nickname || 'Administrador';
    }
    return true;
}

export function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          await supabase.auth.signOut();
          window.location.replace('/'); 
        });
    }
}