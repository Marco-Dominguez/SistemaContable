document.addEventListener('DOMContentLoaded', () => {
    Auth.redirectIfNotLogged();

    let allRoles  = [];
    let editingId = null;
    let deleteId  = null;

    // tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tabs = ['tab-roles','tab-permisos','tab-rol-permisos'];
            tabs.forEach(t => document.getElementById(t)?.classList.add('hidden'));
            const target = btn.dataset.tab;
            document.getElementById(target)?.classList.remove('hidden');

            if (target === 'tab-permisos')     loadMatriz();
            if (target === 'tab-rol-permisos') loadRolSelector();
        });
    });

    // cargar roles
    async function loadRoles() {
        toggleLoading('roles-loading', 'roles-table-wrap', true);
        try {
            const res = await Api.get('roles');
            if (!res?.success) { Toast.error(res?.message || 'Error al cargar roles.'); return; }
            allRoles = res.data.roles ?? [];
            renderRoles(allRoles);
        } catch { Toast.error('Error de conexión.'); }
        finally { toggleLoading('roles-loading', 'roles-table-wrap', false); }
    }

    // mostrar u ocultar cargado
    function toggleLoading(loadId, wrapId, loading) {
        document.getElementById(loadId)?.classList.toggle('hidden', !loading);
        document.getElementById(wrapId)?.classList.toggle('hidden', loading);
    }

    // mostrar tabla de roles
    function renderRoles(roles) {
        const tbody = document.getElementById('roles-tbody');
        const empty = document.getElementById('roles-empty');
        const wrap  = document.getElementById('roles-table-wrap');

        if (!roles.length) {
            empty.classList.remove('hidden');
            wrap.classList.add('hidden');
            return;
        }
        empty.classList.add('hidden');
        wrap.classList.remove('hidden');

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
                <td>
                    <span class="badge badge-blue">${r.total_usuarios ?? 0} usuario${r.total_usuarios != 1 ? 's' : ''}</span>
                </td>
                <td>
                    <span class="badge ${r.activo ? 'badge-green' : 'badge-red'}">
                        ${r.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
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

    function escHtml(str) {
        return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // abrir modal de crear o editar rol
    document.getElementById('btn-new-role')?.addEventListener('click', () => {
        editingId = null;
        document.getElementById('modal-rol-title').textContent = 'Nuevo Rol';
        document.getElementById('rol-id').value = '';
        document.getElementById('rol-nombre').value = '';
        document.getElementById('rol-descripcion').value = '';
        document.getElementById('rol-activo-group').style.display = 'none';
        hideRolError();
        Modal.open('modal-rol');
    });

    // abrir modal de editar rol
    async function openEditRol(id) {
        editingId = id;
        const res = await Api.get(`roles?id=${id}`);
        if (!res?.success) { Toast.error('No se pudo cargar el rol.'); return; }
        const r = res.data.rol;
        document.getElementById('modal-rol-title').textContent = 'Editar Rol';
        document.getElementById('rol-id').value = r.id;
        document.getElementById('rol-nombre').value = r.nombre;
        document.getElementById('rol-descripcion').value = r.descripcion ?? '';
        document.getElementById('rol-activo').checked = !!r.activo;
        document.getElementById('rol-activo-group').style.display = '';
        hideRolError();
        Modal.open('modal-rol');
    }

    ['btn-close-modal-rol','btn-cancel-rol'].forEach(id =>
        document.getElementById(id)?.addEventListener('click', () => Modal.close('modal-rol')));

    document.getElementById('btn-save-rol')?.addEventListener('click', async () => {
        hideRolError();
        const nombre      = document.getElementById('rol-nombre').value.trim();
        const descripcion = document.getElementById('rol-descripcion').value.trim();
        const activo      = document.getElementById('rol-activo').checked;

        if (!nombre) return showRolError('El nombre es requerido.');

        const btn = document.getElementById('btn-save-rol');
        setLoading(btn, true);
        const body = { nombre, descripcion, activo };

        try {
            const res = editingId
                ? await Api.put(`roles?id=${editingId}`, body)
                : await Api.post('roles', body);
            if (!res?.success) return showRolError(res?.message || 'Error al guardar.');
            Toast.success(editingId ? 'Rol actualizado.' : 'Rol creado.');
            Modal.close('modal-rol');
            loadRoles();
            if (!document.getElementById('tab-rol-permisos').classList.contains('hidden')) loadRolSelector();
        } catch { showRolError('Error de conexión.'); }
        finally { setLoading(btn, false); }
    });

    function showRolError(msg) {
        document.getElementById('form-rol-error-msg').textContent = msg;
        document.getElementById('form-rol-error').classList.remove('hidden');
    }
    function hideRolError() {
        document.getElementById('form-rol-error').classList.add('hidden');
    }

    // abrir modal de confirmar eliminación de rol
    function openDeleteRol(id, name) {
        deleteId = id;
        document.getElementById('delete-rol-name').textContent = name;
        Modal.open('modal-delete-rol');
    }

    document.getElementById('btn-cancel-delete-rol')?.addEventListener('click', () => Modal.close('modal-delete-rol'));

    document.getElementById('btn-confirm-delete-rol')?.addEventListener('click', async () => {
        if (!deleteId) return;
        const btn = document.getElementById('btn-confirm-delete-rol');
        setLoading(btn, true);
        try {
            const res = await Api.delete(`roles?id=${deleteId}`);
            if (!res?.success) { Toast.error(res?.message || 'Error al eliminar.'); return; }
            Toast.success('Rol eliminado.');
            Modal.close('modal-delete-rol');
            loadRoles();
        } catch { Toast.error('Error de conexión.'); }
        finally { setLoading(btn, false); deleteId = null; }
    });

    // cargar matriz de modulos y acciones
    async function loadMatriz() {
        const loadEl = document.getElementById('matriz-loading');
        const wrapEl = document.getElementById('matriz-table-wrap');
        loadEl?.classList.remove('hidden');
        wrapEl?.classList.add('hidden');

        try {
            const res = await Api.get('modulos?action=matriz');
            if (!res?.success) return;
            const { modulos, acciones, modulo_acciones } = res.data;
            renderMatriz(modulos, acciones, modulo_acciones);
        } catch { Toast.error('Error al cargar módulos.'); }
        finally {
            loadEl?.classList.add('hidden');
            wrapEl?.classList.remove('hidden');
        }
    }

    // mostrar matriz de modulos y acciones
    function renderMatriz(modulos, acciones, ma) {
        const table = document.getElementById('matriz-table');
        const exists = {};
        ma.forEach(m => { exists[`${m.modulo_id}_${m.accion_id}`] = true; });

        const headers = `<thead><tr>
            <th class="text-left">Módulo</th>
            ${acciones.map(a => `<th>${escHtml(a.nombre)}</th>`).join('')}
        </tr></thead>`;

        const rows = modulos.map(m => `
            <tr>
                <td class="text-left font-medium text-slate-700">
                    <i class="bi bi-grid text-slate-400 mr-1"></i> ${escHtml(m.nombre)}
                </td>
                ${acciones.map(a => `
                    <td>
                        ${exists[`${m.id}_${a.id}`]
                            ? '<i class="bi bi-check2-circle text-green-500 text-base"></i>'
                            : '<i class="bi bi-dash text-slate-200 text-base"></i>'}
                    </td>
                `).join('')}
            </tr>
        `).join('');

        table.innerHTML = `${headers}<tbody>${rows}</tbody>`;
    }


    let permData = null;

    // cargar selector de roles para asignar permisos
    async function loadRolSelector() {
        if (!allRoles.length) await loadRoles();
        const sel = document.getElementById('sel-rol-permisos');
        sel.innerHTML = '<option value="">— Selecciona —</option>';
        allRoles.forEach(r => {
            const o = document.createElement('option');
            o.value = r.id;
            o.textContent = r.nombre;
            sel.appendChild(o);
        });
    }

    document.getElementById('sel-rol-permisos')?.addEventListener('change', async (e) => {
        const rid = e.target.value;
        const panel = document.getElementById('permisos-panel');
        if (!rid) { panel.classList.add('hidden'); return; }
        await loadPermisosRol(parseInt(rid));
        panel.classList.remove('hidden');
    });

    // cargar permisos
    async function loadPermisosRol(rolId) {
        const res = await Api.get(`roles?id=${rolId}&action=permisos`);
        if (!res?.success) { Toast.error('Error al cargar permisos.'); return; }
        permData = res.data;
        renderPermisosTable(permData);
    }

    // mostrar tabla de permisos para el rol seleccionado
    function renderPermisosTable({ modulos, acciones, modulo_acciones, asignados }) {
        const table = document.getElementById('permisos-table');

        const maMap   = {};
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

            const moduleChecks = acciones.map(a => maByKey[`${m.id}_${a.id}`]).filter(Boolean);
            const allChecked   = moduleChecks.every(id => asignados?.[m.id]);

            return `<tr>
                <td class="text-left font-medium text-slate-700 text-sm">${escHtml(m.nombre)}</td>
                ${cells}
                <td>
                    <input type="checkbox" class="row-all-check w-4 h-4 accent-purple-600"
                           data-module-id="${m.id}" title="Seleccionar todas las acciones de este módulo">
                </td>
            </tr>`;
        }).join('');

        table.innerHTML = `${headers}<tbody>${rows}</tbody>`;

        // comportamiento de checkbox para seleccionar todo en la fila
        table.querySelectorAll('.row-all-check').forEach(chk => {
            chk.addEventListener('change', () => {
                const mid = chk.dataset.moduleId;
                table.querySelectorAll(`.perm-check`).forEach(c => {
                    const maId = parseInt(c.dataset.maId);
                    if (maMap[maId]?.modulo_id == mid) c.checked = chk.checked;
                });
            });
        });

        table.querySelectorAll('.perm-check').forEach(c => {
            c.addEventListener('change', () => {
                const maId  = parseInt(c.dataset.maId);
                const mid   = maMap[maId]?.modulo_id;
                const allIn = [...table.querySelectorAll('.perm-check')].filter(x => maMap[parseInt(x.dataset.maId)]?.modulo_id == mid);
                const rowChk = table.querySelector(`.row-all-check[data-module-id="${mid}"]`);
                if (rowChk) rowChk.checked = allIn.every(x => x.checked);
            });
        });
    }

    // seleccionar o deseleccionar todos los permisos
    document.getElementById('btn-select-all')?.addEventListener('click', () => {
        document.querySelectorAll('.perm-check, .row-all-check').forEach(c => c.checked = true);
    });
    document.getElementById('btn-deselect-all')?.addEventListener('click', () => {
        document.querySelectorAll('.perm-check, .row-all-check').forEach(c => c.checked = false);
    });

    // gurdar permisos asignados al rol
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

    // init
    loadRoles();
});
