// view/pages/security/usuarios/usuarios.js

document.addEventListener('DOMContentLoaded', () => {
    Auth.redirectIfNotLogged();

    // estados globales
    let allUsers   = [];
    let editingId  = null;
    let deleteId   = null;

    // tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.dataset.tab;
            document.querySelectorAll('#tab-users, #tab-user-roles').forEach(p => p.classList.add('hidden'));
            document.getElementById(target)?.classList.remove('hidden');
            if (target === 'tab-user-roles') loadUserSelector();
        });
    });

    // cargar usuarios
    async function loadUsers() {
        showUsersLoading(true);
        try {
            const res = await Api.get('usuarios');
            if (!res?.success) { Toast.error(res?.message || 'Error al cargar usuarios.'); return; }
            allUsers = res.data.usuarios ?? [];
            renderUsers(allUsers);
        } catch (e) {
            Toast.error('Error de conexión.');
        } finally {
            showUsersLoading(false);
        }
    }

    function showUsersLoading(loading) {
        document.getElementById('users-loading').classList.toggle('hidden', !loading);
        document.getElementById('users-table-wrap').classList.toggle('hidden', loading);
    }

    function renderUsers(users) {
        const tbody = document.getElementById('users-tbody');
        const empty = document.getElementById('users-empty');

        if (!users.length) {
            empty.classList.remove('hidden');
            document.getElementById('users-table-wrap').classList.add('hidden');
            return;
        }
        empty.classList.add('hidden');
        document.getElementById('users-table-wrap').classList.remove('hidden');

        tbody.innerHTML = users.map(u => `
            <tr data-id="${u.id}">
                <td class="text-slate-400 text-xs">${u.id}</td>
                <td>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                            ${(u.nombre[0] + u.apellidos[0]).toUpperCase()}
                        </div>
                        <div>
                            <p class="font-medium text-slate-800">${escHtml(u.nombre)} ${escHtml(u.apellidos)}</p>
                        </div>
                    </div>
                </td>
                <td class="text-slate-500">${escHtml(u.email)}</td>
                <td>${u.roles ? u.roles.split(', ').map(r =>
                    `<span class="badge badge-blue mr-1">${escHtml(r)}</span>`).join('') : '<span class="text-slate-300">—</span>'}</td>
                <td>
                    <span class="badge ${u.activo ? 'badge-green' : 'badge-red'}">
                        <i class="bi ${u.activo ? 'bi-check-circle' : 'bi-x-circle'} mr-1"></i>
                        ${u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="text-slate-400 text-xs">${formatDate(u.ultimo_login)}</td>
                <td>
                    <div class="flex gap-1">
                        <button class="btn btn-outline btn-icon btn-sm btn-edit-user" data-id="${u.id}" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger btn-icon btn-sm btn-delete-user"
                                data-id="${u.id}" data-name="${escHtml(u.nombre + ' ' + u.apellidos)}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Bind edit buttons
        tbody.querySelectorAll('.btn-edit-user').forEach(btn => {
            btn.addEventListener('click', () => openEditUser(parseInt(btn.dataset.id)));
        });
        tbody.querySelectorAll('.btn-delete-user').forEach(btn => {
            btn.addEventListener('click', () => openDeleteUser(parseInt(btn.dataset.id), btn.dataset.name));
        });
    }

    function escHtml(str) {
        return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // busqueda
    document.getElementById('search-users')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        renderUsers(allUsers.filter(u =>
            `${u.nombre} ${u.apellidos} ${u.email}`.toLowerCase().includes(q)
        ));
    });

    document.getElementById('btn-refresh-users')?.addEventListener('click', loadUsers);

    // abrir modal de crear usuario
    document.getElementById('btn-new-user')?.addEventListener('click', () => openCreateUser());

    function openCreateUser() {
        editingId = null;
        document.getElementById('modal-user-title').textContent = 'Nuevo Usuario';
        document.getElementById('user-id').value = '';
        document.getElementById('user-nombre').value = '';
        document.getElementById('user-apellidos').value = '';
        document.getElementById('user-email').value = '';
        document.getElementById('user-password').value = '';
        document.getElementById('user-activo-group').style.display = 'none';
        document.getElementById('pass-hint').textContent = '(requerida)';
        hideFormError();
        Modal.open('modal-user');
    }

    // abrir modal de editar usuario
    async function openEditUser(id) {
        editingId = id;
        const res = await Api.get(`usuarios?id=${id}`);
        if (!res?.success) { Toast.error('No se pudo cargar el usuario.'); return; }
        const u = res.data.usuario;

        document.getElementById('modal-user-title').textContent = 'Editar Usuario';
        document.getElementById('user-id').value = u.id;
        document.getElementById('user-nombre').value = u.nombre;
        document.getElementById('user-apellidos').value = u.apellidos;
        document.getElementById('user-email').value = u.email;
        document.getElementById('user-password').value = '';
        document.getElementById('user-activo').checked = !!u.activo;
        document.getElementById('user-activo-group').style.display = '';
        document.getElementById('pass-hint').textContent = '(dejar vacío para no cambiar)';
        hideFormError();
        Modal.open('modal-user');
    }

    ['btn-close-modal-user','btn-cancel-user'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => Modal.close('modal-user'));
    });

    // guardar usuario
    document.getElementById('btn-save-user')?.addEventListener('click', async () => {
        hideFormError();
        const nombre    = document.getElementById('user-nombre').value.trim();
        const apellidos = document.getElementById('user-apellidos').value.trim();
        const email     = document.getElementById('user-email').value.trim();
        const password  = document.getElementById('user-password').value;
        const activo    = document.getElementById('user-activo').checked;

        if (!nombre || !apellidos) return showFormError('Nombre y apellidos son requeridos.');
        if (!email || !/\S+@\S+\.\S+/.test(email)) return showFormError('Correo no válido.');
        if (!editingId && password.length < 8) return showFormError('La contraseña debe tener al menos 8 caracteres.');
        if (editingId && password && password.length < 8) return showFormError('La contraseña debe tener al menos 8 caracteres.');

        const btn = document.getElementById('btn-save-user');
        setLoading(btn, true);

        const body = { nombre, apellidos, email, activo };
        if (password) body.password = password;

        try {
            const res = editingId
                ? await Api.put(`usuarios?id=${editingId}`, body)
                : await Api.post('usuarios', body);

            if (!res?.success) return showFormError(res?.message || 'Error al guardar.');
            Toast.success(editingId ? 'Usuario actualizado.' : 'Usuario creado.');
            Modal.close('modal-user');
            loadUsers();
        } catch (e) {
            showFormError('Error de conexión.');
        } finally {
            setLoading(btn, false);
        }
    });

    function showFormError(msg) {
        document.getElementById('form-user-error-msg').textContent = msg;
        document.getElementById('form-user-error').classList.remove('hidden');
    }
    function hideFormError() {
        document.getElementById('form-user-error').classList.add('hidden');
    }

    // abrir modal de confirmar eliminacion de usuario
    function openDeleteUser(id, name) {
        deleteId = id;
        document.getElementById('delete-user-name').textContent = name;
        Modal.open('modal-delete');
    }

    document.getElementById('btn-cancel-delete')?.addEventListener('click', () => Modal.close('modal-delete'));

    document.getElementById('btn-confirm-delete')?.addEventListener('click', async () => {
        if (!deleteId) return;
        const btn = document.getElementById('btn-confirm-delete');
        setLoading(btn, true);
        try {
            const res = await Api.delete(`usuarios?id=${deleteId}`);
            if (!res?.success) { Toast.error(res?.message || 'Error al eliminar.'); return; }
            Toast.success('Usuario eliminado.');
            Modal.close('modal-delete');
            loadUsers();
        } catch (e) {
            Toast.error('Error de conexión.');
        } finally {
            setLoading(btn, false);
            deleteId = null;
        }
    });

    // cargar selector de usuarios para asignar roles
    let allRoles = [];

    async function loadUserSelector() {
        const sel = document.getElementById('sel-user-for-roles');
        sel.innerHTML = '<option value="">— Selecciona —</option>';
        if (!allUsers.length) await loadUsers();
        allUsers.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = `${u.nombre} ${u.apellidos} (${u.email})`;
            sel.appendChild(opt);
        });
    }

    document.getElementById('sel-user-for-roles')?.addEventListener('change', async (e) => {
        const uid = e.target.value;
        const panel = document.getElementById('user-roles-panel');
        if (!uid) { panel.classList.add('hidden'); return; }
        await loadRolesForUser(parseInt(uid));
        panel.classList.remove('hidden');
    });

    async function loadRolesForUser(uid) {
        const res = await Api.get(`usuarios?id=${uid}&action=roles`);
        if (!res?.success) { Toast.error('Error al cargar roles.'); return; }
        allRoles     = res.data.roles ?? [];
        const assigned = res.data.asignados ?? [];
        const container = document.getElementById('roles-checkboxes');
        container.innerHTML = allRoles.map(r => `
            <label class="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition ${assigned.includes(r.id) ? 'border-blue-300 bg-blue-50' : 'border-slate-200'}">
                <input type="checkbox" class="role-check w-4 h-4 accent-blue-600"
                       data-role-id="${r.id}" ${assigned.includes(r.id) ? 'checked' : ''}>
                <div>
                    <p class="text-sm font-medium text-slate-700">${escHtml(r.nombre)}</p>
                </div>
            </label>
        `).join('');
    }

    document.getElementById('btn-save-user-roles')?.addEventListener('click', async () => {
        const uid = document.getElementById('sel-user-for-roles').value;
        if (!uid) return;
        const checked = [...document.querySelectorAll('.role-check:checked')].map(c => parseInt(c.dataset.roleId));
        const btn = document.getElementById('btn-save-user-roles');
        setLoading(btn, true);
        try {
            const res = await Api.post(`usuarios?id=${uid}&action=roles`, { roles: checked });
            if (!res?.success) { Toast.error(res?.message || 'Error al guardar.'); return; }
            Toast.success('Roles actualizados.');
            loadUsers();
        } catch (e) { Toast.error('Error de conexión.'); }
        finally { setLoading(btn, false); }
    });
    // init
    loadUsers();
});
