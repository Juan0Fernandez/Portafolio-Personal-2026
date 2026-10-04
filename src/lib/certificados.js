// src/lib/certificados.js
import { supabase } from './supabase.js';

export function initCertificadosManager() {
    let globalCerts = [];
    let currentEditId = null;
    let currentFileUrl = '';
    let existingFileWasRemoved = false; // <-- Nuevo: Para saber si borraste el PDF al editar

    const formTitle = document.getElementById('cert-form-title');
    const submitBtn = document.getElementById('c-submit');
    const cancelEditBtn = document.getElementById('cert-cancel-btn');
    const cForm = document.getElementById('cert-form');
    const certsList = document.getElementById('certs-list');

    const dropzone = document.getElementById('cert-dropzone');
    const fileInput = document.getElementById('c-file');
    const dropzoneText = document.getElementById('cert-dropzone-text');
    const previewContainer = document.getElementById('cert-preview-container'); // <-- Nuevo
    const fileNameDisplay = document.getElementById('cert-file-name');
    const clearFileBtn = document.getElementById('cert-clear-file-btn'); // <-- Nuevo
    const dropMsg = document.getElementById('cert-drop-msg');

    const loadCerts = async () => {
        const { data: certificados } = await supabase.from('certificados').select('*').order('fecha_creacion', { ascending: false });
        if (!certsList || !certificados) return;
        globalCerts = certificados;
        certsList.innerHTML = '';

        certificados.forEach(c => {
            const btnColor = c.es_visible ? 'text-green-600 hover:text-green-800' : 'text-gray-500 hover:text-gray-700';
            const btnText = c.es_visible ? '👁️' : '🙈';
            
            const cEl = document.createElement('div');
            cEl.className = `flex flex-row items-center justify-between border ${!c.es_visible ? 'border-gray-200 dark:border-gray-800 bg-gray-200/50 dark:bg-black/30 opacity-70' : 'border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-transparent'} py-1.5 px-3 rounded-lg gap-2 shadow-inner`;
            cEl.innerHTML = `
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold truncate text-gray-900 dark:text-white" title="${c.titulo_es}">${c.titulo_es}</p>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 font-mono">${c.entidad}</p>
                </div>
                <div class="flex gap-2 shrink-0 items-center">
                    <a href="${c.url_archivo}" target="_blank" class="action-btn text-xs text-blue-500 hover:text-blue-700 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded" title="Ver Archivo">Ver PDF</a>
                    <button data-action="toggle" data-id="${c.id}" data-visible="${c.es_visible}" class="c-action-btn text-xs ${btnColor}" title="Mostrar/Ocultar">${btnText}</button>
                    <button data-action="edit" data-id="${c.id}" class="c-action-btn text-xs text-ciber-purple hover:text-purple-700" title="Editar">✏️</button>
                    <button data-action="delete" data-id="${c.id}" class="c-action-btn text-xs text-red-500 hover:text-red-700" title="Eliminar">🗑️</button>
                </div>
            `;
            certsList.appendChild(cEl);
        });

        document.querySelectorAll('.c-action-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const target = e.currentTarget;
                const action = target.getAttribute('data-action');
                const id = target.getAttribute('data-id');

                if (action === 'toggle') {
                    const isVisible = target.getAttribute('data-visible') === 'true';
                    await supabase.from('certificados').update({ es_visible: !isVisible }).eq('id', id);
                    loadCerts(); 
                } 
                else if (action === 'delete') {
                    if(confirm("¿Eliminar este certificado para siempre?")) {
                        const cert = globalCerts.find(c => c.id === id);
                        if (cert && cert.url_archivo && cert.url_archivo.includes('certificados/')) {
                            const fileName = cert.url_archivo.split('/').pop();
                            if (fileName) await supabase.storage.from('certificados').remove([fileName]);
                        }
                        await supabase.from('certificados').delete().eq('id', id);
                        loadCerts();
                    }
                }
                else if (action === 'edit') {
                    const certToEdit = globalCerts.find(c => c.id === id);
                    if(certToEdit) startEditing(certToEdit);
                }
            });
        });
    };

    if (dropzone && fileInput) {
        dropzone.addEventListener('click', (e) => {
            // Evitar que el click en el botón de borrar abra la ventana de archivos
            if(e.target.closest('#cert-clear-file-btn')) return; 
            fileInput.click();
        });
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault(); dropzone.classList.add('border-blue-500', 'bg-blue-500/10');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('border-blue-500', 'bg-blue-500/10');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault(); dropzone.classList.remove('border-blue-500', 'bg-blue-500/10');
            if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                updateFilePreview();
            }
        });
        fileInput.addEventListener('change', updateFilePreview);
    }

    if (clearFileBtn) {
        clearFileBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            if(fileInput) fileInput.value = ''; 
            if (currentEditId) existingFileWasRemoved = true; 
            if(previewContainer) previewContainer.classList.add('hidden');
            if(dropzoneText) dropzoneText.classList.remove('hidden');
            if(dropMsg) dropMsg.innerText = currentEditId ? "(Opcional) Sube un nuevo PDF" : "Arrastra el PDF/Imagen o haz clic para subir";
        });
    }

    function updateFilePreview() {
        if (fileInput && fileInput.files && fileInput.files[0]) {
            if(dropzoneText) dropzoneText.classList.add('hidden');
            if(previewContainer) previewContainer.classList.remove('hidden');
            if(fileNameDisplay) {
                fileNameDisplay.innerText = fileInput.files[0].name;
            }
        }
    }

    const startEditing = (cert) => {
        cancelEditing(); 
        
        currentEditId = cert.id;
        currentFileUrl = cert.url_archivo || ''; 
        
        if(formTitle) {
            formTitle.innerText = `Editando: ${cert.titulo_es}`;
            formTitle.classList.add('text-ciber-purple');
        }
        if(submitBtn) {
            submitBtn.innerText = 'Actualizar Certificado';
            submitBtn.classList.replace('bg-blue-500', 'bg-ciber-purple');
        }
        if(cancelEditBtn) cancelEditBtn.classList.remove('hidden');

        const getValue = (id) => document.getElementById(id);
        if(getValue('c-entidad')) getValue('c-entidad').value = cert.entidad;
        if(getValue('c-title-es')) getValue('c-title-es').value = cert.titulo_es;
        if(getValue('c-title-en')) getValue('c-title-en').value = cert.titulo_en;

        if(cert.url_archivo) {
            if(dropzoneText) dropzoneText.classList.add('hidden');
            if(previewContainer) previewContainer.classList.remove('hidden');
            if(fileNameDisplay) fileNameDisplay.innerText = "Archivo actual (PDF guardado)";
        } else {
            if(dropMsg) dropMsg.innerText = "(Sin archivo) Arrastra o haz clic para subir";
        }
    };

    const cancelEditing = () => {
        currentEditId = null;
        currentFileUrl = '';
        existingFileWasRemoved = false;
        if(cForm) cForm.reset();
        
        if(formTitle) {
            formTitle.innerText = 'Añadir Nuevo Certificado';
            formTitle.classList.remove('text-ciber-purple');
        }
        if(submitBtn) {
            submitBtn.innerText = 'Subir y Guardar Certificado';
            submitBtn.classList.replace('bg-ciber-purple', 'bg-blue-500');
        }
        if(cancelEditBtn) cancelEditBtn.classList.add('hidden');
        
        if(previewContainer) previewContainer.classList.add('hidden');
        if(dropzoneText) dropzoneText.classList.remove('hidden');
        if(dropMsg) dropMsg.innerText = "Arrastra el PDF/Imagen o haz clic para subir";
        if(fileInput) fileInput.value = '';
    };

    if(cancelEditBtn) cancelEditBtn.addEventListener('click', cancelEditing);

    if(cForm) {
        cForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const status = document.getElementById('c-status');
            const file = fileInput && fileInput.files ? fileInput.files[0] : null;
            
            if (!currentEditId && !file) {
                if(status) {
                    status.className = 'text-xs text-center font-bold text-red-500 block mt-2';
                    status.innerText = 'Debes subir un PDF o Imagen del certificado.';
                    setTimeout(() => status.className = 'hidden', 3000);
                }
                return;
            }

            if(submitBtn) {
                submitBtn.innerText = 'Procesando... ⏳';
                submitBtn.disabled = true;
            }

            try {
                let finalFileUrl = currentFileUrl; 

                if (file) {
                    if(submitBtn) submitBtn.innerText = 'Subiendo archivo... ⏳';
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
                    
                    const { error: uploadError } = await supabase.storage.from('certificados').upload(fileName, file);
                    if (uploadError) throw uploadError;

                    const { data: publicUrlData } = supabase.storage.from('certificados').getPublicUrl(fileName);
                    finalFileUrl = publicUrlData.publicUrl;
                } else if (currentEditId && existingFileWasRemoved) {
                    finalFileUrl = ''; 
                }

                if(submitBtn) submitBtn.innerText = 'Guardando datos... 💾';

                const getValueStr = (id) => document.getElementById(id) ? document.getElementById(id).value : '';

                const certData = {
                    entidad: getValueStr('c-entidad'),
                    titulo_es: getValueStr('c-title-es'),
                    titulo_en: getValueStr('c-title-en'),
                    url_archivo: finalFileUrl
                };

                if (currentEditId) {
                    const { error } = await supabase.from('certificados').update(certData).eq('id', currentEditId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('certificados').insert([{ ...certData, es_visible: true }]);
                    if (error) throw error;
                }

                if(status) {
                    status.className = 'text-xs text-center font-bold text-green-500 block mt-2';
                    status.innerText = currentEditId ? '¡Certificado actualizado!' : '¡Certificado subido! 🚀';
                }
                cancelEditing();
                loadCerts();

            } catch (err) {
                console.error(err);
                if(status) {
                    status.className = 'text-xs text-center font-bold text-red-500 block mt-2';
                    status.innerText = `Error: ${err.message}`;
                }
            } finally {
                if(submitBtn) {
                    submitBtn.innerText = currentEditId ? 'Actualizar Certificado' : 'Subir y Guardar Certificado';
                    submitBtn.disabled = false;
                }
                if(status) setTimeout(() => status.className = 'hidden', 4000);
            }
        });
    }

    loadCerts();
}