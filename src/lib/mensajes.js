// src/lib/mensajes.js
import { supabase } from './supabase.js';

export const loadMessages = async () => {
    const container = document.getElementById('messages-container');
    if (!container) return;

    // Traemos todos los mensajes ordenados por los más nuevos primero
    const { data, error } = await supabase
        .from('mensajes')
        .select('*')
        .order('fecha_envio', { ascending: false });

    if (error) {
        container.innerHTML = '<p class="text-red-500 text-xs text-center">Error al cargar la bandeja.</p>';
        return;
    }

    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm text-center mt-10">Tu bandeja está vacía. ✨</p>';
        return;
    }

    // Dibujamos cada mensaje de forma segura
    data.forEach(msg => {
        // Formateamos la fecha
        const dateObj = new Date(msg.fecha_envio);
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // 1. Creamos el contenedor principal del mensaje
        const div = document.createElement('div');
        div.className = 'bg-white/50 dark:bg-black/30 p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm relative group transition-all hover:border-ciber-green';
        
        // 2. Creamos y configuramos la estructura HTML básica (sin el mensaje del usuario)
        div.innerHTML = `
            <button data-id="${msg.id}" class="delete-msg-btn absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 p-1.5 rounded-md shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
            
            <p class="text-sm font-bold text-ciber-purple">${msg.nombre}</p>
            <p class="text-xs text-gray-500 font-mono mb-3">${msg.correo} • <span class="text-gray-400">${dateStr}</span></p>
            
            <p id="msg-body-${msg.id}" class="text-sm text-gray-800 dark:text-gray-200 bg-gray-100/80 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 break-words"></p>
        `;
        
        // 3. Obtenemos el contenedor del mensaje que acabamos de crear y usamos .innerText para poner su contenido
        // Esto es lo que parchaba el XSS: .innerText interpreta el código como simple texto, no como HTML.
        const msgBodyEl = div.querySelector(`#msg-body-${msg.id}`);
        if(msgBodyEl) {
            msgBodyEl.innerText = msg.mensaje;
        }

        // 4. Agregamos el mensaje completo al contenedor principal
        container.appendChild(div);
    });

    // Le damos vida a los botones de eliminar
    document.querySelectorAll('.delete-msg-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (confirm('¿Estás seguro de que quieres eliminar este mensaje permanentemente?')) {
                await supabase.from('mensajes').delete().eq('id', id);
                loadMessages(); 
            }
        });
    });
};