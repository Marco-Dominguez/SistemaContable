const TABS_BASE = '/view/pages/security/roles/tabs/';
const TABS = ['tab-roles', 'tab-modulos', 'tab-acciones', 'tab-permisos', 'tab-rol-permisos'];

async function loadTABS() {
    const container = document.getElementById('page-content');
    try {
        for (const name of TABS) {
            const res = await fetch(`${TABS_BASE}${name}.html`);
            if (!res.ok) throw new Error(`${name}: ${res.status}`);
            const html = await res.text();
            container.insertAdjacentHTML('beforeend', html);
        }
    } catch (e) {
        Toast.error('Error al cargar la página. Recarga el navegador.');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    Auth.redirectIfNotLogged();
    await loadTABS();

    let allRoles = [];
    let editingRolId = null;
    let deleteRolId = null;
    let editingModuloId = null;
    let deleteModuloId = null;
    let editingAccionId = null;
    let deleteAccionId = null;

    const ALL_TABS = ['tab-roles', 'tab-modulos', 'tab-acciones', 'tab-permisos', 'tab-rol-permisos'];

    // pestañas
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            ALL_TABS.forEach(t => document.getElementById(t)?.classList.add('hidden'));
            const target = btn.dataset.tab;
            document.getElementById(target)?.classList.remove('hidden');

            if (target === 'tab-modulos') loadModulos();
            if (target === 'tab-acciones') loadAcciones();
            if (target === 'tab-permisos') loadMatriz();
            if (target === 'tab-rol-permisos') loadRolSelector();
        });
    });


    function toSlug(text) {
        return text.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    // roles
    async function loadRoles() {
        show('roles-loading'); hide('roles-table-wrap'); hide('roles-empty');
        try {
            const res = await Api.get('roles');
            if (!res?.success) { Toast.error(res?.message || 'Error al cargar roles.'); return; }
            allRoles = res.data.roles ?? [];
            renderRoles(allRoles);
        } catch { Toast.error('Error de conexión.'); }
        finally { hide('roles-loading'); }
    }

    function renderRoles(roles) {
        const tbody = document.getElementById('roles-tbody');
        if (!roles.length) { show('roles-empty'); hide('roles-table-wrap'); return; }
        hide('roles-empty'); show('roles-table-wrap');

        tbody.innerHTML = roles.map(r => `
            <tr>
                <td class="text-slate-400 text-xs">${r.id}</td>
                <td>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                            <i class="bi bi-shield text-purple-600 text-sm"></i>
                        </div>
                        <span class="font-medium text-slate-800">${escHtml(r.nombre)}</span>
                    </div>
                </td>
                <td class="text-slate-500 text-sm max-w-xs truncate">${escHtml(r.descripcion || '—')}</td>
                <td><span class="badge badge-blue">${r.total_usuarios ?? 0} usuario${r.total_usuarios != 1 ? 's' : ''}</span></td>
                <td><span class="badge ${r.activo ? 'badge-green' : 'badge-red'}">${r.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td class="text-slate-400 text-xs">${formatDate(r.created_at)}</td>
                <td>
                    <div class="flex gap-1">
                        <button class="btn btn-outline btn-icon btn-sm btn-edit-rol" data-id="${r.id}" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        ${r.nombre !== 'Administrador' ? `
                        <button class="btn btn-danger btn-icon btn-sm btn-delete-rol"
                                data-id="${r.id}" data-name="${escHtml(r.nombre)}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>` : `
                        <button class="btn btn-outline btn-icon btn-sm opacity-30 cursor-not-allowed" disabled title="No se puede eliminar">
                            <i class="bi bi-lock"></i>
                        </button>`}
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-edit-rol').forEach(b =>
            b.addEventListener('click', () => openEditRol(parseInt(b.dataset.id))));
        tbody.querySelectorAll('.btn-delete-rol').forEach(b =>
            b.addEventListener('click', () => openDeleteRol(parseInt(b.dataset.id), b.dataset.name)));
    }

    document.getElementById('btn-new-role')?.addEventListener('click', () => {
        editingRolId = null;
        document.getElementById('modal-rol-title').textContent = 'Nuevo Rol';
        document.getElementById('rol-id').value = '';
        document.getElementById('rol-nombre').value = '';
        document.getElementById('rol-descripcion').value = '';
        document.getElementById('rol-activo-group').style.display = 'none';
        hideError('form-rol-error');
        Modal.open('modal-rol');
    });

    async function openEditRol(id) {
        editingRolId = id;
        const res = await Api.get(`roles?id=${id}`);
        if (!res?.success) { Toast.error('No se pudo cargar el rol.'); return; }
        const r = res.data.rol;
        document.getElementById('modal-rol-title').textContent = 'Editar Rol';
        document.getElementById('rol-id').value = r.id;
        document.getElementById('rol-nombre').value = r.nombre;
        document.getElementById('rol-descripcion').value = r.descripcion ?? '';
        document.getElementById('rol-activo').checked = !!r.activo;
        document.getElementById('rol-activo-group').style.display = '';
        hideError('form-rol-error');
        Modal.open('modal-rol');
    }

    ['btn-close-modal-rol', 'btn-cancel-rol'].forEach(id =>
        document.getElementById(id)?.addEventListener('click', () => Modal.close('modal-rol')));

    document.getElementById('btn-save-rol')?.addEventListener('click', async () => {
        hideError('form-rol-error');
        const nombre = document.getElementById('rol-nombre').value.trim();
        const descripcion = document.getElementById('rol-descripcion').value.trim();
        const activo = document.getElementById('rol-activo').checked;
        if (!nombre) return showError('form-rol-error', 'El nombre es requerido.');

        const btn = document.getElementById('btn-save-rol');
        setLoading(btn, true);
        try {
            const res = editingRolId
                ? await Api.put(`roles?id=${editingRolId}`, { nombre, descripcion, activo })
                : await Api.post('roles', { nombre, descripcion, activo });
            if (!res?.success) return showError('form-rol-error', res?.message || 'Error al guardar.');
            Toast.success(editingRolId ? 'Rol actualizado.' : 'Rol creado.');
            Modal.close('modal-rol');
            loadRoles();
        } catch { showError('form-rol-error', 'Error de conexión.'); }
        finally { setLoading(btn, false); }
    });

    function openDeleteRol(id, name) {
        deleteRolId = id;
        document.getElementById('delete-rol-name').textContent = name;
        Modal.open('modal-delete-rol');
    }

    document.getElementById('btn-cancel-delete-rol')?.addEventListener('click', () => Modal.close('modal-delete-rol'));

    document.getElementById('btn-confirm-delete-rol')?.addEventListener('click', async () => {
        if (!deleteRolId) return;
        const btn = document.getElementById('btn-confirm-delete-rol');
        setLoading(btn, true);
        try {
            const res = await Api.delete(`roles?id=${deleteRolId}`);
            if (!res?.success) { Toast.error(res?.message || 'Error al eliminar.'); return; }
            Toast.success('Rol eliminado.');
            Modal.close('modal-delete-rol');
            loadRoles();
        } catch { Toast.error('Error de conexión.'); }
        finally { setLoading(btn, false); deleteRolId = null; }
    });

    // módulos
    async function loadModulos() {
        show('modulos-loading'); hide('modulos-table-wrap'); hide('modulos-empty');
        try {
            const res = await Api.get('modulos?action=modulos');
            if (!res?.success) { Toast.error(res?.message || 'Error al cargar módulos.'); return; }
            renderModulos(res.data.modulos ?? []);
        } catch { Toast.error('Error de conexión.'); }
        finally { hide('modulos-loading'); }
    }

    function renderModulos(modulos) {
        const tbody = document.getElementById('modulos-tbody');
        if (!modulos.length) { show('modulos-empty'); hide('modulos-table-wrap'); return; }
        hide('modulos-empty'); show('modulos-table-wrap');

        tbody.innerHTML = modulos.map(m => `
            <tr>
                <td class="text-slate-400 text-xs">${m.id}</td>
                <td>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <i class="bi ${escHtml(m.icono || 'bi-grid')} text-blue-500 text-sm"></i>
                        </div>
                        <span class="font-medium text-slate-800">${escHtml(m.nombre)}</span>
                    </div>
                </td>
                <td><code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${escHtml(m.slug)}</code></td>
                <td class="text-slate-500 text-sm max-w-xs truncate">${escHtml(m.descripcion || '—')}</td>
                <td class="text-center text-slate-500 text-sm">${m.orden}</td>
                <td><span class="badge ${m.activo ? 'badge-green' : 'badge-red'}">${m.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                    <div class="flex gap-1">
                        <button class="btn btn-outline btn-icon btn-sm btn-edit-modulo" data-id="${m.id}" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger btn-icon btn-sm btn-delete-modulo"
                                data-id="${m.id}" data-name="${escHtml(m.nombre)}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-edit-modulo').forEach(b =>
            b.addEventListener('click', () => openEditModulo(parseInt(b.dataset.id))));
        tbody.querySelectorAll('.btn-delete-modulo').forEach(b =>
            b.addEventListener('click', () => openDeleteModulo(parseInt(b.dataset.id), b.dataset.name)));
    }

    document.getElementById('btn-new-modulo')?.addEventListener('click', () => {
        editingModuloId = null;
        document.getElementById('modal-modulo-title').textContent = 'Nuevo Módulo';
        document.getElementById('modulo-id').value = '';
        document.getElementById('modulo-nombre').value = '';
        document.getElementById('modulo-slug').value = '';
        document.getElementById('modulo-icono').value = 'bi-grid';
        document.getElementById('modulo-icono-preview').className = 'bi bi-grid text-slate-600 text-lg';
        document.getElementById('modulo-descripcion').value = '';
        document.getElementById('modulo-orden').value = '0';
        document.getElementById('modulo-activo-group').style.display = 'none';
        hideError('form-modulo-error');
        Modal.open('modal-modulo');
    });

    // slug automatico desde nombre
    document.getElementById('modulo-nombre')?.addEventListener('input', e => {
        if (!editingModuloId) {
            document.getElementById('modulo-slug').value = toSlug(e.target.value);
        }
    });

    // vista previa de icono
    document.getElementById('modulo-icono')?.addEventListener('change', e => {
        const cls = e.target.value || 'bi-grid';
        document.getElementById('modulo-icono-preview').className = `bi ${cls} text-slate-600 text-lg`;
    });

    async function openEditModulo(id) {
        editingModuloId = id;
        const res = await Api.get(`modulos?action=modulos&id=${id}`);
        if (!res?.success) { Toast.error('No se pudo cargar el módulo.'); return; }
        const m = res.data.modulo;
        document.getElementById('modal-modulo-title').textContent = 'Editar Módulo';
        document.getElementById('modulo-id').value = m.id;
        document.getElementById('modulo-nombre').value = m.nombre;
        document.getElementById('modulo-slug').value = m.slug;
        document.getElementById('modulo-icono').value = m.icono ?? 'bi-grid';
        document.getElementById('modulo-icono-preview').className = `bi ${m.icono ?? 'bi-grid'} text-slate-600 text-lg`;
        document.getElementById('modulo-descripcion').value = m.descripcion ?? '';
        document.getElementById('modulo-orden').value = m.orden ?? 0;
        document.getElementById('modulo-activo').checked = !!m.activo;
        document.getElementById('modulo-activo-group').style.display = '';
        hideError('form-modulo-error');
        Modal.open('modal-modulo');
    }

    ['btn-close-modal-modulo', 'btn-cancel-modulo'].forEach(id =>
        document.getElementById(id)?.addEventListener('click', () => Modal.close('modal-modulo')));

    document.getElementById('btn-save-modulo')?.addEventListener('click', async () => {
        hideError('form-modulo-error');
        const nombre = document.getElementById('modulo-nombre').value.trim();
        const slug = document.getElementById('modulo-slug').value.trim();
        const icono = document.getElementById('modulo-icono').value.trim() || 'bi-grid';
        const descripcion = document.getElementById('modulo-descripcion').value.trim();
        const orden = parseInt(document.getElementById('modulo-orden').value) || 0;
        const activo = document.getElementById('modulo-activo').checked;

        if (!nombre) return showError('form-modulo-error', 'El nombre es requerido.');
        if (!slug) return showError('form-modulo-error', 'El slug es requerido.');
        if (!/^[a-z0-9\-]+$/.test(slug))
            return showError('form-modulo-error', 'El slug solo puede tener minúsculas, números y guiones.');

        const btn = document.getElementById('btn-save-modulo');
        setLoading(btn, true);
        const body = { nombre, slug, icono, descripcion, orden, activo };
        try {
            const res = editingModuloId
                ? await Api.put(`modulos?action=modulos&id=${editingModuloId}`, body)
                : await Api.post('modulos?action=modulos', body);
            if (!res?.success) return showError('form-modulo-error', res?.message || 'Error al guardar.');
            Toast.success(editingModuloId ? 'Módulo actualizado.' : 'Módulo creado.');
            Modal.close('modal-modulo');
            loadModulos();
        } catch { showError('form-modulo-error', 'Error de conexión.'); }
        finally { setLoading(btn, false); }
    });

    function openDeleteModulo(id, name) {
        deleteModuloId = id;
        document.getElementById('delete-modulo-name').textContent = name;
        Modal.open('modal-delete-modulo');
    }

    document.getElementById('btn-cancel-delete-modulo')?.addEventListener('click', () => Modal.close('modal-delete-modulo'));

    document.getElementById('btn-confirm-delete-modulo')?.addEventListener('click', async () => {
        if (!deleteModuloId) return;
        const btn = document.getElementById('btn-confirm-delete-modulo');
        setLoading(btn, true);
        try {
            const res = await Api.delete(`modulos?action=modulos&id=${deleteModuloId}`);
            if (!res?.success) { Toast.error(res?.message || 'Error al eliminar.'); return; }
            Toast.success('Módulo eliminado.');
            Modal.close('modal-delete-modulo');
            loadModulos();
        } catch { Toast.error('Error de conexión.'); }
        finally { setLoading(btn, false); deleteModuloId = null; }
    });

    // acciones
    async function loadAcciones() {
        show('acciones-loading'); hide('acciones-table-wrap'); hide('acciones-empty');
        try {
            const res = await Api.get('modulos?action=acciones');
            if (!res?.success) { Toast.error(res?.message || 'Error al cargar acciones.'); return; }
            renderAcciones(res.data.acciones ?? []);
        } catch { Toast.error('Error de conexión.'); }
        finally { hide('acciones-loading'); }
    }

    function renderAcciones(acciones) {
        const tbody = document.getElementById('acciones-tbody');
        if (!acciones.length) { show('acciones-empty'); hide('acciones-table-wrap'); return; }
        hide('acciones-empty'); show('acciones-table-wrap');

        tbody.innerHTML = acciones.map(a => `
            <tr>
                <td class="text-slate-400 text-xs">${a.id}</td>
                <td>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                            <i class="bi bi-lightning text-green-500 text-sm"></i>
                        </div>
                        <span class="font-medium text-slate-800">${escHtml(a.nombre)}</span>
                    </div>
                </td>
                <td><code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${escHtml(a.slug)}</code></td>
                <td class="text-slate-500 text-sm max-w-xs truncate">${escHtml(a.descripcion || '—')}</td>
                <td class="text-center">
                    ${parseInt(a.total_modulos) > 0
                ? `<span class="badge badge-blue">${a.total_modulos} módulo${a.total_modulos != 1 ? 's' : ''}</span>`
                : `<span class="badge badge-gray">Sin asignar</span>`}
                </td>
                <td>
                    <div class="flex gap-1">
                        <button class="btn btn-outline btn-icon btn-sm btn-edit-accion" data-id="${a.id}" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger btn-icon btn-sm btn-delete-accion"
                                data-id="${a.id}" data-name="${escHtml(a.nombre)}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-edit-accion').forEach(b =>
            b.addEventListener('click', () => openEditAccion(parseInt(b.dataset.id))));
        tbody.querySelectorAll('.btn-delete-accion').forEach(b =>
            b.addEventListener('click', () => openDeleteAccion(parseInt(b.dataset.id), b.dataset.name)));
    }

    document.getElementById('btn-new-accion')?.addEventListener('click', () => {
        editingAccionId = null;
        document.getElementById('modal-accion-title').textContent = 'Nueva Acción';
        document.getElementById('accion-id').value = '';
        document.getElementById('accion-nombre').value = '';
        document.getElementById('accion-slug').value = '';
        document.getElementById('accion-descripcion').value = '';
        hideError('form-accion-error');
        Modal.open('modal-accion');
    });

    // slug automatico desde nombre
    document.getElementById('accion-nombre')?.addEventListener('input', e => {
        if (!editingAccionId) {
            document.getElementById('accion-slug').value = toSlug(e.target.value);
        }
    });

    async function openEditAccion(id) {
        editingAccionId = id;
        const res = await Api.get(`modulos?action=acciones&id=${id}`);
        if (!res?.success) { Toast.error('No se pudo cargar la acción.'); return; }
        const a = res.data.accion;
        document.getElementById('modal-accion-title').textContent = 'Editar Acción';
        document.getElementById('accion-id').value = a.id;
        document.getElementById('accion-nombre').value = a.nombre;
        document.getElementById('accion-slug').value = a.slug;
        document.getElementById('accion-descripcion').value = a.descripcion ?? '';
        hideError('form-accion-error');
        Modal.open('modal-accion');
    }

    ['btn-close-modal-accion', 'btn-cancel-accion'].forEach(id =>
        document.getElementById(id)?.addEventListener('click', () => Modal.close('modal-accion')));

    document.getElementById('btn-save-accion')?.addEventListener('click', async () => {
        hideError('form-accion-error');
        const nombre = document.getElementById('accion-nombre').value.trim();
        const slug = document.getElementById('accion-slug').value.trim();
        const descripcion = document.getElementById('accion-descripcion').value.trim();

        if (!nombre) return showError('form-accion-error', 'El nombre es requerido.');
        if (!slug) return showError('form-accion-error', 'El slug es requerido.');
        if (!/^[a-z0-9\-]+$/.test(slug))
            return showError('form-accion-error', 'El slug solo puede tener minúsculas, números y guiones.');

        const btn = document.getElementById('btn-save-accion');
        setLoading(btn, true);
        try {
            const res = editingAccionId
                ? await Api.put(`modulos?action=acciones&id=${editingAccionId}`, { nombre, slug, descripcion })
                : await Api.post('modulos?action=acciones', { nombre, slug, descripcion });
            if (!res?.success) return showError('form-accion-error', res?.message || 'Error al guardar.');
            Toast.success(editingAccionId ? 'Acción actualizada.' : 'Acción creada.');
            Modal.close('modal-accion');
            loadAcciones();
        } catch { showError('form-accion-error', 'Error de conexión.'); }
        finally { setLoading(btn, false); }
    });

    function openDeleteAccion(id, name) {
        deleteAccionId = id;
        document.getElementById('delete-accion-name').textContent = name;
        Modal.open('modal-delete-accion');
    }

    document.getElementById('btn-cancel-delete-accion')?.addEventListener('click', () => Modal.close('modal-delete-accion'));

    document.getElementById('btn-confirm-delete-accion')?.addEventListener('click', async () => {
        if (!deleteAccionId) return;
        const btn = document.getElementById('btn-confirm-delete-accion');
        setLoading(btn, true);
        try {
            const res = await Api.delete(`modulos?action=acciones&id=${deleteAccionId}`);
            if (!res?.success) { Toast.error(res?.message || 'Error al eliminar.'); return; }
            Toast.success('Acción eliminada.');
            Modal.close('modal-delete-accion');
            loadAcciones();
        } catch { Toast.error('Error de conexión.'); }
        finally { setLoading(btn, false); deleteAccionId = null; }
    });

    // matriz módulos y acciones (editable)
    async function loadMatriz() {
        show('matriz-loading'); hide('matriz-table-wrap');
        try {
            const res = await Api.get('modulos?action=matriz');
            if (!res?.success) { Toast.error('Error al cargar la matriz.'); return; }
            renderMatriz(res.data.modulos, res.data.acciones, res.data.modulo_acciones);
        } catch { Toast.error('Error de conexión.'); }
        finally { hide('matriz-loading'); show('matriz-table-wrap'); }
    }

    function renderMatriz(modulos, acciones, ma) {
        const table = document.getElementById('matriz-table');

        // construir busqueda: modulo_id a conjunto de accion_id
        const assigned = {};
        modulos.forEach(m => assigned[m.id] = new Set());
        ma.forEach(x => assigned[x.modulo_id]?.add(parseInt(x.accion_id)));

        const headers = `<thead><tr>
            <th class="text-left min-w-36">Módulo</th>
            ${acciones.map(a => `<th class="min-w-16 text-center">${escHtml(a.nombre)}</th>`).join('')}
            <th class="min-w-20 text-center">Guardar</th>
        </tr></thead>`;

        const rows = modulos.map(m => {
            const cells = acciones.map(a => `
                <td class="text-center">
                    <input type="checkbox" class="ma-check w-4 h-4 accent-blue-600"
                           data-modulo="${m.id}" data-accion="${a.id}"
                           ${assigned[m.id]?.has(parseInt(a.id)) ? 'checked' : ''}>
                </td>
            `).join('');

            return `<tr data-modulo-id="${m.id}">
                <td class="text-left">
                    <div class="flex items-center gap-2">
                        <i class="bi ${escHtml(m.icono || 'bi-grid')} text-slate-400 text-sm"></i>
                        <span class="font-medium text-slate-700 text-sm">${escHtml(m.nombre)}</span>
                    </div>
                </td>
                ${cells}
                <td class="text-center">
                    <button class="btn btn-primary btn-sm btn-save-row" data-modulo-id="${m.id}" data-modulo-name="${escHtml(m.nombre)}">
                        <i class="bi bi-save"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');

        table.innerHTML = `${headers}<tbody>${rows}</tbody>`;

        table.querySelectorAll('.btn-save-row').forEach(btn => {
            btn.addEventListener('click', async () => {
                const mid = parseInt(btn.dataset.moduloId);
                const name = btn.dataset.moduloName;
                const accionIds = [...table.querySelectorAll(`.ma-check[data-modulo="${mid}"]:checked`)]
                    .map(c => parseInt(c.dataset.accion));

                setLoading(btn, true);
                try {
                    const res = await Api.post('modulos?action=matriz', { modulo_id: mid, accion_ids: accionIds });
                    if (!res?.success) { Toast.error(res?.message || 'Error al guardar.'); return; }
                    Toast.success(`Acciones de "${name}" guardadas.`);
                } catch { Toast.error('Error de conexión.'); }
                finally { setLoading(btn, false); }
            });
        });
    }

    // asignar permisos a rol
    let permData = null;

    async function loadRolSelector() {
        if (!allRoles.length) await loadRoles();
        const sel = document.getElementById('sel-rol-permisos');
        const current = sel.value;
        sel.innerHTML = '<option value="">— Selecciona —</option>';
        allRoles.forEach(r => {
            const o = document.createElement('option');
            o.value = r.id;
            o.textContent = r.nombre;
            if (r.id == current) o.selected = true;
            sel.appendChild(o);
        });
    }

    document.getElementById('sel-rol-permisos')?.addEventListener('change', async e => {
        const rid = e.target.value;
        const panel = document.getElementById('permisos-panel');
        if (!rid) { panel.classList.add('hidden'); return; }
        await loadPermisosRol(parseInt(rid));
        panel.classList.remove('hidden');
    });

    async function loadPermisosRol(rolId) {
        const res = await Api.get(`roles?id=${rolId}&action=permisos`);
        if (!res?.success) { Toast.error('Error al cargar permisos.'); return; }
        permData = res.data;
        renderPermisosTable(permData);
    }

    function renderPermisosTable({ modulos, acciones, modulo_acciones, asignados }) {
        const table = document.getElementById('permisos-table');

        const maMap = {};
        const maByKey = {};
        modulo_acciones.forEach(ma => {
            maMap[ma.id] = ma;
            maByKey[`${ma.modulo_id}_${ma.accion_id}`] = ma.id;
        });

        const headers = `<thead><tr>
            <th class="text-left min-w-36">Módulo</th>
            ${acciones.map(a => `<th class="min-w-20">${escHtml(a.nombre)}</th>`).join('')}
            <th>Todo</th>
        </tr></thead>`;

        const rows = modulos.map(m => {
            const cells = acciones.map(a => {
                const maId = maByKey[`${m.id}_${a.id}`];
                if (!maId) return `<td><span class="text-slate-200">—</span></td>`;
                const checked = asignados?.[m.id]?.[a.id] ? 'checked' : '';
                return `<td>
                    <input type="checkbox" class="perm-check w-4 h-4 accent-blue-600"
                           data-ma-id="${maId}" ${checked}>
                </td>`;
            }).join('');

            return `<tr>
                <td class="text-left font-medium text-slate-700 text-sm">${escHtml(m.nombre)}</td>
                ${cells}
                <td>
                    <input type="checkbox" class="row-all-check w-4 h-4 accent-purple-600"
                           data-module-id="${m.id}" title="Seleccionar todas">
                </td>
            </tr>`;
        }).join('');

        table.innerHTML = `${headers}<tbody>${rows}</tbody>`;

        table.querySelectorAll('.row-all-check').forEach(chk => {
            chk.addEventListener('change', () => {
                const mid = chk.dataset.moduleId;
                table.querySelectorAll('.perm-check').forEach(c => {
                    if (maMap[parseInt(c.dataset.maId)]?.modulo_id == mid) c.checked = chk.checked;
                });
            });
        });

        table.querySelectorAll('.perm-check').forEach(c => {
            c.addEventListener('change', () => {
                const maId = parseInt(c.dataset.maId);
                const mid = maMap[maId]?.modulo_id;
                const allIn = [...table.querySelectorAll('.perm-check')]
                    .filter(x => maMap[parseInt(x.dataset.maId)]?.modulo_id == mid);
                const rowChk = table.querySelector(`.row-all-check[data-module-id="${mid}"]`);
                if (rowChk) rowChk.checked = allIn.every(x => x.checked);
            });
        });
    }

    document.getElementById('btn-select-all')?.addEventListener('click', () => {
        document.querySelectorAll('.perm-check, .row-all-check').forEach(c => c.checked = true);
    });
    document.getElementById('btn-deselect-all')?.addEventListener('click', () => {
        document.querySelectorAll('.perm-check, .row-all-check').forEach(c => c.checked = false);
    });

    document.getElementById('btn-save-permisos')?.addEventListener('click', async () => {
        const rid = document.getElementById('sel-rol-permisos').value;
        if (!rid) return;
        const checked = [...document.querySelectorAll('.perm-check:checked')]
            .map(c => parseInt(c.dataset.maId));
        const btn = document.getElementById('btn-save-permisos');
        setLoading(btn, true);
        try {
            const res = await Api.post(`roles?id=${rid}&action=permisos`, { permisos: checked });
            if (!res?.success) { Toast.error(res?.message || 'Error al guardar.'); return; }
            Toast.success('Permisos guardados correctamente.');
        } catch { Toast.error('Error de conexión.'); }
        finally { setLoading(btn, false); }
    });

    // utilidades
    function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
    function hide(id) { document.getElementById(id)?.classList.add('hidden'); }

    function showError(formErrId, msg) {
        const el = document.getElementById(formErrId);
        const span = el?.querySelector('span');
        if (span) span.textContent = msg;
        el?.classList.remove('hidden');
    }
    function hideError(formErrId) {
        document.getElementById(formErrId)?.classList.add('hidden');
    }

    // inicializar
    loadRoles();
});
