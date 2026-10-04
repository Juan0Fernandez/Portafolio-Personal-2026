// src/lib/cv.js
import { supabase } from './supabase.js';

export function initCVManager() {
    // --- 1. GESTIÓN DE FOTO DE PERFIL ---
    const perfilImg = document.getElementById('perfil-preview');
    const perfilForm = document.getElementById('perfil-form');
    const perfilFile = document.getElementById('perfil-file');
    const perfilSubmit = document.getElementById('perfil-submit');

    const loadPerfil = async () => {
        const { data } = await supabase.from('cv_perfil').select('imagen_url').eq('id', 1).single();
        if (data && data.imagen_url && perfilImg) perfilImg.src = data.imagen_url;
    };

    perfilForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!perfilFile.files || !perfilFile.files[0]) return alert("Selecciona una foto.");
        
        perfilSubmit.innerText = '⏳';
        perfilSubmit.disabled = true;
        const file = perfilFile.files[0];
        const fileName = `foto_${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;

        try {
            const { error: uploadError } = await supabase.storage.from('perfil').upload(fileName, file);
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('perfil').getPublicUrl(fileName);
            
            await supabase.from('cv_perfil').update({ imagen_url: urlData.publicUrl }).eq('id', 1);
            perfilImg.src = urlData.publicUrl;
            perfilFile.value = '';
            alert("Foto actualizada!");
        } catch (error) {
            alert("Error al subir foto.");
        } finally {
            perfilSubmit.innerText = 'Subir';
            perfilSubmit.disabled = false;
        }
    });

    // --- 2. GESTIÓN DE HABILIDADES ---
    const habsList = document.getElementById('habs-list');
    const habForm = document.getElementById('hab-form');
    const hNombre = document.getElementById('h-nombre');
    const hColor = document.getElementById('h-color');

    const loadHabilidades = async () => {
        const { data } = await supabase.from('habilidades').select('*').order('id', { ascending: false });
        if(!habsList || !data) return;
        
        habsList.innerHTML = '';
        data.forEach(h => {
            const span = document.createElement('span');
            // Clases base según color guardado
            let bgClass = h.clase_color === 'ciber-green' ? 'bg-ciber-green/20 text-ciber-green border-ciber-green/50' :
                          h.clase_color === 'ciber-purple' ? 'bg-ciber-purple/20 text-ciber-purple border-ciber-purple/50' :
                          'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700';

            span.className = `${bgClass} px-2 py-1 rounded-full text-xs font-bold border flex items-center gap-1`;
            span.innerHTML = `${h.nombre} <button data-id="${h.id}" class="del-hab text-red-500 hover:text-red-700 ml-1 font-bold">×</button>`;
            habsList.appendChild(span);
        });

        document.querySelectorAll('.del-hab').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                await supabase.from('habilidades').delete().eq('id', id);
                loadHabilidades();
            });
        });
    };

    habForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await supabase.from('habilidades').insert([{ nombre: hNombre.value, clase_color: hColor.value }]);
        hNombre.value = '';
        loadHabilidades();
    });

    // --- 3. GESTIÓN DE EXPERIENCIA PRÁCTICA ---
    const expList = document.getElementById('exp-list');
    const expForm = document.getElementById('exp-form');
    const expCancel = document.getElementById('exp-cancel-btn');
    const eEmpresa = document.getElementById('e-empresa');
    const eCargoEs = document.getElementById('e-cargo-es');
    const eCargoEn = document.getElementById('e-cargo-en');
    const eDescEs = document.getElementById('e-desc-es');
    const eDescEn = document.getElementById('e-desc-en');
    const eSubmit = document.getElementById('e-submit');

    let currentExpId = null;

    const loadExperiencia = async () => {
        const { data } = await supabase.from('experiencia').select('*').order('fecha_creacion', { ascending: false });
        if(!expList || !data) return;

        expList.innerHTML = '';
        data.forEach(e => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center p-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg";
            div.innerHTML = `
                <div class="flex-1 min-w-0 pr-2">
                    <p class="text-xs font-bold text-gray-900 dark:text-white truncate">${e.cargo_es}</p>
                    <p class="text-[10px] text-gray-500 font-mono">${e.empresa}</p>
                </div>
                <div class="flex gap-2">
                    <button data-id="${e.id}" class="edit-exp text-xs text-orange-500 hover:text-orange-700">✏️</button>
                    <button data-id="${e.id}" class="del-exp text-xs text-red-500 hover:text-red-700">🗑️</button>
                </div>
            `;
            expList.appendChild(div);
        });

        document.querySelectorAll('.del-exp').forEach(b => b.addEventListener('click', async (ev) => {
            if(confirm("¿Borrar experiencia?")) {
                await supabase.from('experiencia').delete().eq('id', ev.target.getAttribute('data-id'));
                loadExperiencia();
            }
        }));

        document.querySelectorAll('.edit-exp').forEach(b => b.addEventListener('click', (ev) => {
            const id = ev.target.getAttribute('data-id');
            const exp = data.find(x => x.id === id);
            currentExpId = exp.id;
            eEmpresa.value = exp.empresa;
            eCargoEs.value = exp.cargo_es;
            eCargoEn.value = exp.cargo_en;
            eDescEs.value = exp.descripcion_es;
            eDescEn.value = exp.descripcion_en;
            eSubmit.innerText = 'Actualizar Experiencia';
            expCancel.classList.remove('hidden');
        }));
    };

    expCancel?.addEventListener('click', () => {
        currentExpId = null;
        expForm.reset();
        eSubmit.innerText = 'Guardar Experiencia';
        expCancel.classList.add('hidden');
    });

    expForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        eSubmit.disabled = true;
        const payload = {
            empresa: eEmpresa.value, cargo_es: eCargoEs.value, cargo_en: eCargoEn.value,
            descripcion_es: eDescEs.value, descripcion_en: eDescEn.value
        };

        if(currentExpId) {
            await supabase.from('experiencia').update(payload).eq('id', currentExpId);
        } else {
            await supabase.from('experiencia').insert([payload]);
        }
        
        expCancel.click();
        loadExperiencia();
        eSubmit.disabled = false;
    });

    // Arrancamos
    loadPerfil();
    loadHabilidades();
    loadExperiencia();
}