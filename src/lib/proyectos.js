import { supabase } from './supabase.js';

export function initProjectsManager() {
    let globalProjects = [];
    let currentEditId = null;
    let currentImageUrl = ''; 
    let existingImageWasRemoved = false; 

    const formTitle = document.getElementById('form-mode-title');
    const submitBtn = document.getElementById('p-submit');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const pForm = document.getElementById('project-form');
    const dropMsg = document.getElementById('drop-msg');
    const projectsList = document.getElementById('projects-list');

    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('p-file');
    const dropzoneText = document.getElementById('dropzone-text');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const clearImageBtn = document.getElementById('clear-image-btn');

    const loadProjects = async () => {
        const { data: proyectos } = await supabase.from('proyectos').select('*').order('fecha_creacion', { ascending: false });
        if (!projectsList || !proyectos) return;
        globalProjects = proyectos;
        projectsList.innerHTML = '';

        proyectos.forEach(p => {
            const btnColor = p.es_visible ? 'text-green-600 hover:text-green-800' : 'text-gray-500 hover:text-gray-700';
            const btnText = p.es_visible ? '👁️' : '🙈';
            
            const pEl = document.createElement('div');
            pEl.className = `flex flex-row items-center justify-between border ${!p.es_visible ? 'border-gray-200 dark:border-gray-800 bg-gray-200/50 dark:bg-black/30 opacity-70' : 'border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-transparent'} py-1.5 px-3 rounded-lg gap-2 shadow-inner`;
            pEl.innerHTML = `
                <p class="text-xs font-bold truncate pr-2 flex-1 text-gray-900 dark:text-white" title="${p.titulo_es}">${p.titulo_es}</p>
                <div class="flex gap-2 shrink-0">
                    <button data-action="toggle" data-id="${p.id}" data-visible="${p.es_visible}" class="action-btn text-xs ${btnColor}" title="Mostrar/Ocultar">${btnText}</button>
                    <button data-action="edit" data-id="${p.id}" class="action-btn text-xs text-ciber-purple hover:text-purple-700" title="Editar">✏️</button>
                    <button data-action="delete" data-id="${p.id}" class="action-btn text-xs text-red-500 hover:text-red-700" title="Eliminar">🗑️</button>
                </div>
            `;
            projectsList.appendChild(pEl);
        });

        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const target = e.currentTarget;
                const action = target.getAttribute('data-action');
                const id = target.getAttribute('data-id');

                if (action === 'toggle') {
                    const isVisible = target.getAttribute('data-visible') === 'true';
                    await supabase.from('proyectos').update({ es_visible: !isVisible }).eq('id', id);
                    loadProjects(); 
                } 
                else if (action === 'delete') {
                    if(confirm("¿Estás seguro de que deseas eliminar este proyecto para siempre?")) {
                        const proj = globalProjects.find(p => p.id === id);
                        if (proj && proj.imagen_url && proj.imagen_url.includes('proyectos/')) {
                            const imageName = proj.imagen_url.split('/').pop();
                            if (imageName) await supabase.storage.from('proyectos').remove([imageName]);
                        }
                        await supabase.from('proyectos').delete().eq('id', id);
                        loadProjects();
                    }
                }
                else if (action === 'edit') {
                    const projToEdit = globalProjects.find(p => p.id === id);
                    if(projToEdit) startEditing(projToEdit);
                }
            });
        });
    };

    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault(); dropzone.classList.add('border-ciber-green', 'bg-ciber-green/10');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('border-ciber-green', 'bg-ciber-green/10');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault(); dropzone.classList.remove('border-ciber-green', 'bg-ciber-green/10');
            if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                updateImagePreview();
            }
        });
        fileInput.addEventListener('change', updateImagePreview);
    }

    if (clearImageBtn) {
        clearImageBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            if(confirm("¿Estás seguro de que quieres eliminar esta imagen del proyecto?")){
                if(fileInput) fileInput.value = ''; 
                if (currentEditId) existingImageWasRemoved = true; 
                if(previewContainer) previewContainer.classList.add('hidden');
                if(dropzoneText) dropzoneText.classList.remove('hidden');
                if(dropMsg) dropMsg.innerText = currentEditId ? "(Opcional) Sube una nueva foto" : "Arrastra la imagen o haz clic para subir";
            }
        });
    }

    function updateImagePreview() {
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target && e.target.result) {
                    if(imagePreview) imagePreview.src = e.target.result;
                    if(previewContainer) previewContainer.classList.remove('hidden');
                    if(dropzoneText) dropzoneText.classList.add('hidden');
                }
            };
            reader.readAsDataURL(fileInput.files[0]);
        }
    }

    const startEditing = (project) => {
        cancelEditing(); 
        
        currentEditId = project.id;
        currentImageUrl = project.imagen_url || ''; 
        
        if(formTitle) {
            formTitle.innerText = `Editando: ${project.titulo_es}`;
            formTitle.classList.add('text-ciber-purple');
        }
        if(submitBtn) {
            submitBtn.innerText = 'Actualizar Proyecto';
            submitBtn.classList.remove('bg-ciber-green');
            submitBtn.classList.add('bg-ciber-purple');
        }
        if(cancelEditBtn) cancelEditBtn.classList.remove('hidden');
        if(pForm) pForm.classList.add('border-ciber-purple');

        const getValue = (id) => document.getElementById(id);
        if(getValue('p-slug')) getValue('p-slug').value = project.slug;
        if(getValue('p-title-es')) getValue('p-title-es').value = project.titulo_es;
        if(getValue('p-title-en')) getValue('p-title-en').value = project.titulo_en;
        if(getValue('p-repo')) getValue('p-repo').value = project.repo_url;
        if(getValue('p-demo')) getValue('p-demo').value = project.demo_url;
        if(getValue('p-desc-es')) getValue('p-desc-es').value = project.descripcion_es;
        if(getValue('p-desc-en')) getValue('p-desc-en').value = project.descripcion_en;

        if(project.imagen_url) {
            if(imagePreview) imagePreview.src = project.imagen_url;
            if(previewContainer) previewContainer.classList.remove('hidden');
            if(dropzoneText) dropzoneText.classList.add('hidden');
            if(dropMsg) dropMsg.innerText = "(Opcional) Sube una foto para reemplazar";
        } else {
            if(dropMsg) dropMsg.innerText = "(Sin imagen) Arrastra o haz clic para subir";
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    };

    const cancelEditing = () => {
        currentEditId = null;
        currentImageUrl = '';
        existingImageWasRemoved = false; 
        if(pForm) pForm.reset();
        
        if(formTitle) {
            formTitle.innerText = 'Añadir Nuevo Proyecto';
            formTitle.classList.remove('text-ciber-purple');
        }
        if(submitBtn) {
            submitBtn.innerText = 'Subir y Guardar Proyecto';
            submitBtn.classList.remove('bg-ciber-purple');
            submitBtn.classList.add('bg-ciber-green');
        }
        if(cancelEditBtn) cancelEditBtn.classList.add('hidden');
        if(pForm) pForm.classList.remove('border-ciber-purple');
        
        if(previewContainer) previewContainer.classList.add('hidden');
        if(dropzoneText) dropzoneText.classList.remove('hidden');
        if(dropMsg) dropMsg.innerText = "Arrastra la imagen o haz clic para subir";
        if(fileInput) fileInput.value = '';
    };

    if(cancelEditBtn) cancelEditBtn.addEventListener('click', cancelEditing);

    if(pForm) {
        pForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const status = document.getElementById('p-status');
            const file = fileInput && fileInput.files ? fileInput.files[0] : null;
            
            if (!currentEditId && !file) {
                if(status) {
                    status.className = 'text-xs text-center font-bold text-red-500 block mt-2';
                    status.innerText = 'Se requiere una imagen para un nuevo proyecto.';
                    setTimeout(() => status.className = 'hidden', 3000);
                }
                return;
            }

            if(submitBtn) {
                submitBtn.innerText = 'Procesando... ⏳';
                submitBtn.disabled = true;
            }

            try {
                let finalImageUrl = currentImageUrl; 

                if (file) {
                    if(submitBtn) submitBtn.innerText = 'Subiendo imagen... ⏳';
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
                    
                    const { error: uploadError } = await supabase.storage.from('proyectos').upload(fileName, file);
                    if (uploadError) throw uploadError;

                    const { data: publicUrlData } = supabase.storage.from('proyectos').getPublicUrl(fileName);
                    finalImageUrl = publicUrlData.publicUrl;
                } 
                else if (currentEditId && existingImageWasRemoved) {
                    finalImageUrl = ''; 
                }

                if(submitBtn) submitBtn.innerText = 'Guardando datos... 💾';

                const getValueStr = (id) => {
                    const el = document.getElementById(id);
                    return el ? el.value : '';
                };

                const projectData = {
                    slug: getValueStr('p-slug'),
                    titulo_es: getValueStr('p-title-es'),
                    titulo_en: getValueStr('p-title-en'),
                    imagen_url: finalImageUrl, 
                    repo_url: getValueStr('p-repo'),
                    demo_url: getValueStr('p-demo'),
                    descripcion_es: getValueStr('p-desc-es'),
                    descripcion_en: getValueStr('p-desc-en'),
                };

                if (currentEditId) {
                    const { error: updateError } = await supabase.from('proyectos').update(projectData).eq('id', currentEditId);
                    if (updateError) throw updateError;
                } else {
                    const { error: insertError } = await supabase.from('proyectos').insert([{ ...projectData, es_visible: true }]);
                    if (insertError) throw insertError;
                }

                if(status) {
                    status.className = 'text-xs text-center font-bold text-green-500 block mt-2';
                    status.innerText = currentEditId ? '¡Proyecto actualizado!' : '¡Proyecto en línea! 🚀';
                }
                cancelEditing();
                loadProjects();

            } catch (err) {
                console.error(err);
                if(status) {
                    status.className = 'text-xs text-center font-bold text-red-500 block mt-2';
                    status.innerText = `Error: ${err.message || 'Ocurrió un error'}`;
                }
            } finally {
                if(submitBtn) {
                    submitBtn.innerText = currentEditId ? 'Actualizar Proyecto' : 'Subir y Guardar Proyecto';
                    submitBtn.disabled = false;
                }
                if(status) setTimeout(() => status.className = 'hidden', 4000);
            }
        });
    }

    loadProjects();
}