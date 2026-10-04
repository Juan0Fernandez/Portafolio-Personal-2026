// src/lib/usuarios.js
import { supabase } from './supabase.js';

export function initUsuariosManager() {
    const usersList = document.getElementById('users-list');
    
    // Elementos del Chat Admin
    const chatPlaceholder = document.getElementById('admin-chat-placeholder');
    const chatWindow = document.getElementById('admin-chat-window');
    const chatUserName = document.getElementById('admin-chat-user-name');
    const chatMessages = document.getElementById('admin-chat-messages');
    const chatClose = document.getElementById('admin-chat-close');
    const chatForm = document.getElementById('admin-chat-form');
    const chatInput = document.getElementById('admin-chat-input');
    const chatSubmit = document.getElementById('admin-chat-submit');

    let currentActiveUserId = null;
    let activeChatMsgCount = -1; // Para no redibujar el chat si no hay mensajes nuevos
    const adminEmail = import.meta.env.PUBLIC_ADMIN_EMAIL;

    const loadUsers = async () => {
        if (!usersList) return;

        const { data: perfiles, error } = await supabase
            .from('perfiles')
            .select('*')
            .order('ultimo_acceso', { ascending: false });

        if (error || !perfiles) {
            usersList.innerHTML = '<p class="text-red-500 text-xs text-center">Error al cargar usuarios.</p>';
            return;
        }

        usersList.innerHTML = '';
        const usuariosNormales = perfiles.filter(user => user.email !== adminEmail);

        if (usuariosNormales.length === 0) {
            usersList.innerHTML = '<p class="text-gray-500 text-xs text-center mt-10">No hay usuarios registrados aún.</p>';
            return;
        }

        const ahora = new Date();

        usuariosNormales.forEach(user => {
            const ultimoAcceso = new Date(user.ultimo_acceso);
            const diferenciaMilisegundos = ahora.getTime() - ultimoAcceso.getTime();
            const diasInactividad = Math.floor(diferenciaMilisegundos / (1000 * 60 * 60 * 24));
            
            let estadoInactividad = '';
            if (diasInactividad === 0) estadoInactividad = '<span class="text-ciber-green font-bold">Activo hoy</span>';
            else if (diasInactividad === 1) estadoInactividad = '<span class="text-yellow-500 font-bold">Inactivo: 1 día</span>';
            else estadoInactividad = `<span class="text-red-500 font-bold">Inactivo: ${diasInactividad} días</span>`;

            const uEl = document.createElement('div');
            uEl.className = 'flex flex-col sm:flex-row sm:items-center justify-between border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-black/30 p-3 rounded-lg gap-3 shadow-sm hover:border-ciber-purple transition-colors';
            
            // AÑADIDO: El <span id="notif-ID"> que es el puntito verde parpadeante, oculto por defecto.
            uEl.innerHTML = `
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-gray-900 dark:text-white truncate">👤 ${user.nickname || 'Sin Nombre'}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">${user.email}</p>
                    <p class="text-[10px] mt-1 uppercase tracking-widest">${estadoInactividad}</p>
                </div>
                <div class="flex gap-2 shrink-0 sm:flex-col md:flex-row">
                    <button data-action="chat" data-id="${user.id}" data-name="${user.nickname || user.email}" class="relative u-action-btn text-xs bg-ciber-purple hover:bg-purple-700 text-white font-bold py-1 px-3 rounded shadow-md transition-colors">
                        Abrir Chat
                        <span id="notif-${user.id}" class="hidden absolute -top-1 -right-1 w-3 h-3 bg-ciber-green rounded-full border border-gray-900 animate-pulse shadow-[0_0_8px_rgba(0,255,65,0.8)]"></span>
                    </button>
                    <button data-action="delete" data-id="${user.id}" class="u-action-btn text-xs border border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold py-1 px-3 rounded transition-colors">Eliminar</button>
                </div>
            `;
            usersList.appendChild(uEl);
        });

        document.querySelectorAll('.u-action-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const target = e.currentTarget;
                const action = target.getAttribute('data-action');
                const userId = target.getAttribute('data-id');

                if (action === 'delete') {
                    if (confirm("¿Borrar este usuario y todo su historial de chat?")) {
                        target.innerText = '...';
                        await supabase.from('chat_en_vivo').delete().eq('user_id', userId);
                        await supabase.from('perfiles').delete().eq('id', userId);
                        
                        if(currentActiveUserId === userId) closeAdminChat();
                        loadUsers(); 
                    }
                } 
                else if (action === 'chat') {
                    const userName = target.getAttribute('data-name');
                    openAdminChat(userId, userName);
                }
            });
        });

        // Lanzamos el radar una vez construida la lista
        checkAdminRadar();
    };

    // --- LÓGICA DE LA TERMINAL DE CHAT ---
    const closeAdminChat = () => {
        currentActiveUserId = null;
        if(chatPlaceholder) chatPlaceholder.classList.remove('hidden');
        if(chatWindow) chatWindow.classList.add('hidden');
    };

    if(chatClose) chatClose.addEventListener('click', closeAdminChat);

    const loadUserMessages = async (userId) => {
        if (!chatMessages) return;
        
        const { data, error } = await supabase
            .from('chat_en_vivo')
            .select('*')
            .eq('user_id', userId)
            .order('fecha_envio', { ascending: true });
        
        if (error) return;

        // Si la cantidad de mensajes es la misma, no redibujamos (evita tirones en la pantalla)
        if (data.length === activeChatMsgCount) return;
        activeChatMsgCount = data.length;

        chatMessages.innerHTML = '';
        if (data.length === 0) {
            chatMessages.innerHTML = '<p class="text-center text-gray-500 text-xs mt-auto mb-auto">Aún no hay mensajes en esta sala.</p>';
            return;
        }

        data.forEach(msg => {
            const isAdmin = msg.user_email === adminEmail;
            const div = document.createElement('div');
            
            div.className = isAdmin 
                ? 'bg-ciber-green/20 border border-ciber-green/30 text-gray-900 dark:text-gray-100 p-2.5 rounded-2xl rounded-tr-sm self-end max-w-[85%] text-sm shadow-sm'
                : 'bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-2.5 rounded-2xl rounded-tl-sm self-start max-w-[85%] text-sm shadow-sm';
            
            div.innerText = msg.mensaje;
            chatMessages.appendChild(div);
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const openAdminChat = (userId, userName) => {
        currentActiveUserId = userId;
        activeChatMsgCount = -1; // Forzamos a que dibuje los mensajes desde cero al abrir
        
        if(chatUserName) chatUserName.innerText = userName;
        if(chatPlaceholder) chatPlaceholder.classList.add('hidden');
        if(chatWindow) chatWindow.classList.remove('hidden');
        
        // Ocultamos el puntito rojo porque ya lo estamos leyendo
        document.getElementById(`notif-${userId}`)?.classList.add('hidden');
        
        loadUserMessages(userId);
    };

    chatForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!chatInput.value.trim() || !currentActiveUserId) return;
        
        chatSubmit.disabled = true;
        const texto = chatInput.value;
        chatInput.value = '';

        try {
            const { error } = await supabase.from('chat_en_vivo').insert([{ 
                user_id: currentActiveUserId, 
                user_email: adminEmail, 
                mensaje: texto 
            }]);

            if (error) throw error;
            await loadUserMessages(currentActiveUserId);
            
        } catch (err) {
            console.error('Error enviando mensaje:', err);
        } finally {
            chatSubmit.disabled = false;
            chatInput.focus();
        }
    });

    // === EL SÚPER RADAR DEL ADMIN ===
    const checkAdminRadar = async () => {
        // 1. Si tienes un chat abierto, trae mensajes nuevos en tiempo real
        if (currentActiveUserId) {
            await loadUserMessages(currentActiveUserId);
        }

        // 2. Revisamos TODAS las conversaciones de las últimas 48 horas
        const hace48Horas = new Date();
        hace48Horas.setHours(hace48Horas.getHours() - 48);

        const { data, error } = await supabase
            .from('chat_en_vivo')
            .select('user_id, user_email')
            .gt('fecha_envio', hace48Horas.toISOString())
            .order('fecha_envio', { ascending: true });

        if (error || !data) return;

        // Averiguamos quién fue la última persona en escribir en cada sala
        const ultimosEnEscribir = {};
        data.forEach(msg => {
            ultimosEnEscribir[msg.user_id] = msg.user_email;
        });

        // 3. Encendemos o apagamos las notificaciones
        Object.keys(ultimosEnEscribir).forEach(uid => {
            const notifDot = document.getElementById(`notif-${uid}`);
            if (notifDot) {
                // Si el último en escribir NO fuiste tú (el Admin) y NO tienes su chat abierto ahora mismo:
                if (ultimosEnEscribir[uid] !== adminEmail && currentActiveUserId !== uid) {
                    notifDot.classList.remove('hidden'); // Enciende la luz verde intermitente
                } else {
                    notifDot.classList.add('hidden'); // Apaga la luz
                }
            }
        });
    };

    // El radar escanea la base de datos cada 5 segundos buscando mensajes
    setInterval(checkAdminRadar, 5000);

    // Arrancamos todo
    loadUsers();
}