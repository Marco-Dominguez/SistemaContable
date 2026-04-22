const TABS_BASE = '/view/pages/clientes/tabs/';
const TABS = ['tab-clientes', 'tab-regimenes'];

async function loadTabs() {
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
    await loadTabs();

    let allClients = [];
    let editingId = null;
    let deleteId = null;

    // empty state
    document.getElementById('btn-empty-new-client')?.addEventListener('click', () => {
        document.getElementById('btn-new-client')?.click();
    });
    document.getElementById('btn-clear-client-search')?.addEventListener('click', () => {
        const s = document.getElementById('search-clients');
        if (s) { s.value = ''; }
        renderClients(allClients);
    });

    // tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            const target = btn.dataset.tab;
            document.querySelectorAll('#tab-clientes, #tab-regimenes').forEach(p => p.classList.add('hidden'));
            document.getElementById(target)?.classList.remove('hidden');
            if (target === 'tab-regimenes') loadClientSelector();
        });
    });

    // cargar clientes
    async function loadClients() {
        showLoading(true);
        try {
            const res = await Api.get('clientes');
            if (!res?.success) { Toast.error(res?.message || 'Error al cargar clientes.'); return; }
            allClients = res.data.clientes ?? [];
            renderClients(allClients);
        } catch (e) {
            Toast.error('Error de conexión.');
        } finally {
            showLoading(false);
        }
    }

    function showLoading(loading) {
        document.getElementById('clients-loading').classList.toggle('hidden', !loading);
        document.getElementById('clients-table-wrap').classList.toggle('hidden', loading);
    }

    function renderClients(clients) {
        const tbody = document.getElementById('clients-tbody');
        const empty = document.getElementById('clients-empty');
        const noResults = document.getElementById('clients-no-results');
        const isSearching = (document.getElementById('search-clients')?.value.trim().length ?? 0) > 0;

        if (!clients.length) {
            document.getElementById('clients-table-wrap').classList.add('hidden');
            if (isSearching) {
                empty.classList.add('hidden');
                noResults.classList.remove('hidden');
            } else {
                empty.classList.remove('hidden');
                noResults.classList.add('hidden');
            }
            return;
        }
        empty.classList.add('hidden');
        noResults.classList.add('hidden');
        document.getElementById('clients-table-wrap').classList.remove('hidden');

        tbody.innerHTML = clients.map(c => `
            <tr data-id="${c.id}">
                <td class="text-slate-400 text-xs">${c.id}</td>
                <td><span class="font-mono text-sm font-semibold text-slate-700">${escHtml(c.rfc)}</span></td>
                <td>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-xs" aria-hidden="true">
                            ${(c.razon_social[0] || '?').toUpperCase()}
                        </div>
                        <p class="font-medium text-slate-800">${escHtml(c.razon_social)}</p>
                    </div>
                </td>
                <td class="text-slate-500">${escHtml(c.email || '—')}</td>
                <td>${c.regimenes ? c.regimenes.split(', ').map(r =>
            `<span class="badge badge-blue mr-1 mb-1" style="font-size:.65rem">${escHtml(r)}</span>`).join('') : '<span class="text-slate-300">—</span>'}</td>
                <td>
                    <span class="badge ${c.activo ? 'badge-green' : 'badge-red'}">
                        <i class="bi ${c.activo ? 'bi-check-circle' : 'bi-x-circle'} mr-1" aria-hidden="true"></i>
                        ${c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <div class="flex gap-1">
                        <button class="btn btn-outline btn-icon btn-sm btn-edit-client" data-id="${c.id}"
                                title="Editar" aria-label="Editar cliente ${escHtml(c.razon_social)}">
                            <i class="bi bi-pencil" aria-hidden="true"></i>
                        </button>
                        <button class="btn btn-danger btn-icon btn-sm btn-delete-client"
                                data-id="${c.id}" data-name="${escHtml(c.razon_social)}"
                                title="Eliminar" aria-label="Eliminar cliente ${escHtml(c.razon_social)}">
                            <i class="bi bi-trash" aria-hidden="true"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-edit-client').forEach(btn => {
            btn.addEventListener('click', () => openEditClient(parseInt(btn.dataset.id)));
        });
        tbody.querySelectorAll('.btn-delete-client').forEach(btn => {
            btn.addEventListener('click', () => openDeleteClient(parseInt(btn.dataset.id), btn.dataset.name));
        });
    }

    function escHtml(str) {
        return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // buscar
    document.getElementById('search-clients')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        renderClients(allClients.filter(c =>
            `${c.rfc} ${c.razon_social} ${c.email}`.toLowerCase().includes(q)
        ));
    });

    document.getElementById('btn-refresh-clients')?.addEventListener('click', loadClients);

    // crear usuario
    document.getElementById('client-crear-usuario')?.addEventListener('change', (e) => {
        document.getElementById('client-password-group').classList.toggle('hidden', !e.target.checked);
    });

    // modal crear
    document.getElementById('btn-new-client')?.addEventListener('click', () => {
        editingId = null;
        document.getElementById('modal-client-title').textContent = 'Nuevo Cliente';
        document.getElementById('client-id').value = '';
        document.getElementById('client-rfc').value = '';
        document.getElementById('client-razon').value = '';
        document.getElementById('client-email').value = '';
        document.getElementById('client-telefono').value = '';
        document.getElementById('client-direccion').value = '';
        document.getElementById('client-password').value = '';
        document.getElementById('client-crear-usuario').checked = false;
        document.getElementById('client-password-group').classList.add('hidden');
        document.getElementById('client-user-section').style.display = '';
        document.getElementById('client-activo-group').classList.add('hidden');
        hideFormError();
        Modal.open('modal-client');
    });

    // modal editar
    async function openEditClient(id) {
        editingId = id;
        const res = await Api.get(`clientes?id=${id}`);
        if (!res?.success) { Toast.error('No se pudo cargar el cliente.'); return; }
        const c = res.data.cliente;

        document.getElementById('modal-client-title').textContent = 'Editar Cliente';
        document.getElementById('client-id').value = c.id;
        document.getElementById('client-rfc').value = c.rfc;
        document.getElementById('client-razon').value = c.razon_social;
        document.getElementById('client-email').value = c.email || '';
        document.getElementById('client-telefono').value = c.telefono || '';
        document.getElementById('client-direccion').value = c.direccion || '';
        document.getElementById('client-activo').checked = !!c.activo;
        document.getElementById('client-activo-group').classList.remove('hidden');
        document.getElementById('client-user-section').style.display = 'none';
        hideFormError();
        Modal.open('modal-client');
    }

    ['btn-close-modal-client', 'btn-cancel-client'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => Modal.close('modal-client'));
    });

    // guardar
    document.getElementById('btn-save-client')?.addEventListener('click', async () => {
        hideFormError();
        const rfc = document.getElementById('client-rfc').value.trim().toUpperCase();
        const razon_social = document.getElementById('client-razon').value.trim();
        const email = document.getElementById('client-email').value.trim();
        const telefono = document.getElementById('client-telefono').value.trim();
        const direccion = document.getElementById('client-direccion').value.trim();
        const activo = document.getElementById('client-activo').checked;
        const crearUsuario = document.getElementById('client-crear-usuario')?.checked || false;
        const password = document.getElementById('client-password')?.value || '';

        if (!rfc) return showFormError('El RFC es requerido.');
        if (!razon_social) return showFormError('La razón social es requerida.');

        const btn = document.getElementById('btn-save-client');
        setLoading(btn, true);

        const body = { rfc, razon_social, email, telefono, direccion, activo };
        if (!editingId) {
            body.crear_usuario = crearUsuario;
            if (crearUsuario) body.password = password;
        }

        try {
            const res = editingId
                ? await Api.put(`clientes?id=${editingId}`, body)
                : await Api.post('clientes', body);

            if (!res?.success) return showFormError(res?.message || 'Error al guardar.');
            Toast.success(editingId ? 'Cliente actualizado.' : 'Cliente creado.');
            Modal.close('modal-client');
            loadClients();
        } catch (e) {
            showFormError('Error de conexión.');
        } finally {
            setLoading(btn, false);
        }
    });

    function showFormError(msg) {
        document.getElementById('form-client-error-msg').textContent = msg;
        document.getElementById('form-client-error').classList.remove('hidden');
    }
    function hideFormError() {
        document.getElementById('form-client-error').classList.add('hidden');
    }

    // eliminar
    function openDeleteClient(id, name) {
        deleteId = id;
        document.getElementById('delete-client-name').textContent = name;
        Modal.open('modal-delete-client');
    }

    document.getElementById('btn-cancel-delete-client')?.addEventListener('click', () => Modal.close('modal-delete-client'));

    document.getElementById('btn-confirm-delete-client')?.addEventListener('click', async () => {
        if (!deleteId) return;
        const btn = document.getElementById('btn-confirm-delete-client');
        setLoading(btn, true);
        try {
            const res = await Api.delete(`clientes?id=${deleteId}`);
            if (!res?.success) { Toast.error(res?.message || 'Error al eliminar.'); return; }
            Toast.success('Cliente eliminado.');
            Modal.close('modal-delete-client');
            loadClients();
        } catch (e) {
            Toast.error('Error de conexión.');
        } finally {
            setLoading(btn, false);
            deleteId = null;
        }
    });

    // regimenes
    async function loadClientSelector() {
        const sel = document.getElementById('sel-client-for-regimenes');
        sel.innerHTML = '<option value="">— Selecciona —</option>';
        if (!allClients.length) await loadClients();
        allClients.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.rfc} — ${c.razon_social}`;
            sel.appendChild(opt);
        });
    }

    document.getElementById('sel-client-for-regimenes')?.addEventListener('change', async (e) => {
        const cid = e.target.value;
        const panel = document.getElementById('client-regimenes-panel');
        if (!cid) { panel.classList.add('hidden'); return; }
        await loadRegimenesForClient(parseInt(cid));
        panel.classList.remove('hidden');
    });

    async function loadRegimenesForClient(cid) {
        const res = await Api.get(`clientes?id=${cid}&action=regimenes`);
        if (!res?.success) { Toast.error('Error al cargar regímenes.'); return; }
        const allRegs = res.data.regimenes ?? [];
        const assigned = res.data.asignados ?? [];
        const container = document.getElementById('regimenes-checkboxes');
        container.innerHTML = allRegs.map(r => `
            <label class="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition ${assigned.includes(r.id) ? 'border-blue-300 bg-blue-50' : 'border-slate-200'}">
                <input type="checkbox" class="reg-check w-4 h-4 accent-blue-600"
                       data-reg-id="${r.id}" ${assigned.includes(r.id) ? 'checked' : ''}>
                <div>
                    <p class="text-sm font-medium text-slate-700">${escHtml(r.nombre)}</p>
                    <p class="text-xs text-slate-400">${escHtml(r.clave)}</p>
                </div>
            </label>
        `).join('');
    }

    document.getElementById('btn-save-client-regimenes')?.addEventListener('click', async () => {
        const cid = document.getElementById('sel-client-for-regimenes').value;
        if (!cid) return;
        const checked = [...document.querySelectorAll('.reg-check:checked')].map(c => parseInt(c.dataset.regId));
        const btn = document.getElementById('btn-save-client-regimenes');
        setLoading(btn, true);
        try {
            const res = await Api.post(`clientes?id=${cid}&action=regimenes`, { regimenes: checked });
            if (!res?.success) { Toast.error(res?.message || 'Error al guardar.'); return; }
            Toast.success('Regímenes actualizados.');
            loadClients();
        } catch (e) { Toast.error('Error de conexión.'); }
        finally { setLoading(btn, false); }
    });

    // init
    loadClients();
});
