const TABS_BASE = '/view/pages/declaraciones/tabs/';
const TABS = ['tab-declaraciones', 'tab-nueva', 'tab-generar'];
const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const STATUS_BADGES = {
    'Pendiente': { class: 'badge-yellow', icon: 'bi-clock' },
    'En Proceso': { class: 'badge-blue', icon: 'bi-gear' },
    'Para Pago': { class: 'badge-red', icon: 'bi-exclamation-triangle' },
    'Pagada': { class: 'badge-green', icon: 'bi-check-circle' },
    'Presentada_Cero': { class: 'badge-gray', icon: 'bi-dash-circle' },
};

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

    let allDecl = [];
    let allClients = [];
    let deleteId = null;
    let uploadDeclId = null;
    let uploadTipo = '';

    // empty state
    document.getElementById('decl-empty-cta')?.addEventListener('click', () => {
        document.querySelector('.tab-btn[data-tab="tab-nueva"]')?.click();
    });
    document.getElementById('decl-empty-clear')?.addEventListener('click', () => {
        ['filter-estatus', 'filter-mes', 'filter-anio', 'filter-cliente'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        loadDeclaraciones();
    });

    // selector de año
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    ['filter-anio', 'new-decl-anio', 'gen-anio'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        for (let y = currentYear; y >= 2020; y--) {
            const opt = document.createElement('option');
            opt.value = y; opt.textContent = y;
            sel.appendChild(opt);
        }
    });
    // preseleccionar mes actual
    const genMes = document.getElementById('gen-mes');
    if (genMes) genMes.value = currentMonth;

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
            TABS.forEach(t => document.getElementById(t)?.classList.add('hidden'));
            document.getElementById(target)?.classList.remove('hidden');
            if (target === 'tab-nueva') loadNewDeclForm();
        });
    });

    // cargar clientes
    async function loadClientsForSelectors() {
        try {
            const res = await Api.get('clientes');
            if (res?.success) allClients = res.data.clientes ?? [];
        } catch (e) { /* silent */ }

        ['filter-cliente', 'new-decl-cliente'].forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            // keep first option, clear rest
            const first = sel.options[0];
            sel.innerHTML = '';
            sel.appendChild(first);
            allClients.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.rfc} — ${c.razon_social}`;
                sel.appendChild(opt);
            });
        });
    }

    // cargar declaraciones
    async function loadDeclaraciones() {
        showDeclLoading(true);
        try {
            let query = 'declaraciones';
            const params = [];
            const est = document.getElementById('filter-estatus')?.value;
            const mes = document.getElementById('filter-mes')?.value;
            const anio = document.getElementById('filter-anio')?.value;
            const cid = document.getElementById('filter-cliente')?.value;
            if (est) params.push(`estatus=${est}`);
            if (mes) params.push(`mes=${mes}`);
            if (anio) params.push(`anio=${anio}`);
            if (cid) params.push(`cliente_id=${cid}`);
            if (params.length) query += '?' + params.join('&');

            const res = await Api.get(query);
            if (!res?.success) { Toast.error(res?.message || 'Error al cargar declaraciones.'); return; }
            allDecl = res.data.declaraciones ?? [];
            renderDeclaraciones(allDecl);
        } catch (e) {
            Toast.error('Error de conexión.');
        } finally {
            showDeclLoading(false);
        }
    }

    function showDeclLoading(loading) {
        document.getElementById('decl-loading').classList.toggle('hidden', !loading);
        document.getElementById('decl-table-wrap').classList.toggle('hidden', loading);
    }

    function hasActiveFilters() {
        return ['filter-estatus', 'filter-mes', 'filter-anio', 'filter-cliente'].some(id =>
            document.getElementById(id)?.value !== ''
        );
    }

    function renderDeclaraciones(list) {
        const tbody = document.getElementById('decl-tbody');
        const empty = document.getElementById('decl-empty');

        if (!list.length) {
            const filtering = hasActiveFilters();
            document.getElementById('decl-empty-title').textContent = filtering
                ? 'Sin resultados para este filtro'
                : 'Sin declaraciones registradas';
            document.getElementById('decl-empty-msg').textContent = filtering
                ? 'No se encontraron declaraciones con los filtros aplicados.'
                : 'Aún no hay declaraciones en el sistema. Crea la primera desde "Nueva Declaración".';
            document.getElementById('decl-empty-cta').classList.toggle('hidden', filtering);
            document.getElementById('decl-empty-clear').classList.toggle('hidden', !filtering);
            empty.classList.remove('hidden');
            document.getElementById('decl-table-wrap').classList.add('hidden');
            return;
        }
        empty.classList.add('hidden');
        document.getElementById('decl-table-wrap').classList.remove('hidden');

        tbody.innerHTML = list.map(d => {
            const st = STATUS_BADGES[d.estatus] || STATUS_BADGES['Pendiente'];
            const estatusLabel = d.estatus === 'Presentada_Cero' ? 'En Cero' : d.estatus;
            const importe = parseFloat(d.importe_a_pagar) > 0
                ? `$${parseFloat(d.importe_a_pagar).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                : (parseFloat(d.saldo_a_favor) > 0 ? `<span class="text-green-600">+$${parseFloat(d.saldo_a_favor).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>` : '$0.00');

            const hasAcuse = d.acuse_url ? `<a href="${d.acuse_url}" target="_blank" class="text-blue-600 text-xs hover:underline"><i class="bi bi-file-pdf"></i> Acuse</a>` : '';
            const hasLinea = d.linea_captura_url ? `<a href="${d.linea_captura_url}" target="_blank" class="text-blue-600 text-xs hover:underline"><i class="bi bi-file-pdf"></i> Línea</a>` : '';
            const hasComprob = d.comprobante_pago_url ? `<a href="${d.comprobante_pago_url}" target="_blank" class="text-green-600 text-xs hover:underline"><i class="bi bi-receipt"></i> Pago</a>` : '';

            return `
            <tr data-id="${d.id}">
                <td class="text-slate-400 text-xs">${d.id}</td>
                <td>
                    <p class="font-medium text-slate-800 text-sm">${escHtml(d.razon_social)}</p>
                    <p class="text-xs text-slate-400 font-mono">${escHtml(d.rfc)}</p>
                </td>
                <td>
                    <span class="badge badge-blue" style="font-size:.67rem">${escHtml(d.obligacion_clave)}</span>
                    <p class="text-xs text-slate-500 mt-1">${escHtml(d.obligacion_nombre)}</p>
                </td>
                <td class="text-sm text-slate-600">${MESES[d.periodo_mes]} ${d.periodo_anio}</td>
                <td>
                    <span class="badge ${st.class}">
                        <i class="bi ${st.icon} mr-1"></i>${estatusLabel}
                    </span>
                </td>
                <td class="text-sm font-medium">${importe}</td>
                <td>
                    <div class="flex flex-col gap-1">
                        ${hasAcuse}${hasLinea}${hasComprob}
                        ${!hasAcuse && !hasLinea && !hasComprob ? '<span class="text-slate-300 text-xs">—</span>' : ''}
                    </div>
                </td>
                <td>
                    <div class="flex gap-1 flex-wrap">
                        <button class="btn btn-outline btn-icon btn-sm btn-view-decl" data-id="${d.id}"
                                title="Ver / Editar" aria-label="Ver declaración #${d.id}">
                            <i class="bi bi-eye" aria-hidden="true"></i>
                        </button>
                        <button class="btn btn-outline btn-icon btn-sm btn-upload-acuse" data-id="${d.id}"
                                title="Subir Acuse" aria-label="Subir acuse para declaración #${d.id}">
                            <i class="bi bi-file-earmark-arrow-up" aria-hidden="true"></i>
                        </button>
                        <button class="btn btn-outline btn-icon btn-sm btn-upload-linea" data-id="${d.id}"
                                title="Subir Línea de Captura" aria-label="Subir línea de captura para declaración #${d.id}">
                            <i class="bi bi-credit-card" aria-hidden="true"></i>
                        </button>
                        <button class="btn btn-outline btn-icon btn-sm btn-upload-comprobante" data-id="${d.id}"
                                title="Subir Comprobante de Pago" aria-label="Subir comprobante de pago para declaración #${d.id}"
                                style="color:#16a34a">
                            <i class="bi bi-receipt" aria-hidden="true"></i>
                        </button>
                        <button class="btn btn-danger btn-icon btn-sm btn-delete-decl" data-id="${d.id}"
                                title="Eliminar" aria-label="Eliminar declaración #${d.id}">
                            <i class="bi bi-trash" aria-hidden="true"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        // binds
        tbody.querySelectorAll('.btn-view-decl').forEach(btn =>
            btn.addEventListener('click', () => openDeclDetail(parseInt(btn.dataset.id))));
        tbody.querySelectorAll('.btn-upload-acuse').forEach(btn =>
            btn.addEventListener('click', () => openUpload(parseInt(btn.dataset.id), 'acuse', 'Subir Acuse')));
        tbody.querySelectorAll('.btn-upload-linea').forEach(btn =>
            btn.addEventListener('click', () => openUpload(parseInt(btn.dataset.id), 'linea_captura', 'Subir Línea de Captura')));
        tbody.querySelectorAll('.btn-upload-comprobante').forEach(btn =>
            btn.addEventListener('click', () => openUpload(parseInt(btn.dataset.id), 'comprobante_pago', 'Subir Comprobante de Pago')));
        tbody.querySelectorAll('.btn-delete-decl').forEach(btn =>
            btn.addEventListener('click', () => { deleteId = parseInt(btn.dataset.id); Modal.open('modal-delete-decl'); }));
    }

    function escHtml(str) {
        return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // filtros
    document.getElementById('btn-filter-decl')?.addEventListener('click', loadDeclaraciones);
    document.getElementById('btn-refresh-decl')?.addEventListener('click', loadDeclaraciones);

    // detalle / editar
    async function openDeclDetail(id) {
        const res = await Api.get(`declaraciones?id=${id}`);
        if (!res?.success) { Toast.error('No se pudo cargar.'); return; }
        const d = res.data.declaracion;

        document.getElementById('modal-decl-title').textContent = `Declaración #${d.id}`;
        document.getElementById('decl-detail-content').innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-xs text-slate-400">Cliente</p>
                    <p class="font-medium text-slate-800">${escHtml(d.razon_social)}</p>
                    <p class="text-xs font-mono text-slate-400">${escHtml(d.rfc)}</p>
                </div>
                <div>
                    <p class="text-xs text-slate-400">Obligación</p>
                    <p class="font-medium text-slate-800">${escHtml(d.obligacion_nombre)}</p>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <p class="text-xs text-slate-400">Periodo</p>
                    <p class="font-medium">${MESES[d.periodo_mes]} ${d.periodo_anio}</p>
                </div>
                <div>
                    <p class="text-xs text-slate-400">Fecha Límite</p>
                    <p class="font-medium">${d.fecha_limite || '—'}</p>
                </div>
                <div>
                    <p class="text-xs text-slate-400">Fecha Pago</p>
                    <p class="font-medium">${d.fecha_pago || '—'}</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-xs text-slate-400">Importe a Pagar</p>
                    <p class="font-bold text-lg">$${parseFloat(d.importe_a_pagar || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                    <p class="text-xs text-slate-400">Saldo a Favor</p>
                    <p class="font-bold text-lg text-green-600">$${parseFloat(d.saldo_a_favor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>
            <div>
                <label class="form-label text-xs">Estatus</label>
                <select class="form-input" id="detail-estatus">
                    <option value="Pendiente"       ${d.estatus === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="En Proceso"      ${d.estatus === 'En Proceso' ? 'selected' : ''}>En Proceso</option>
                    <option value="Para Pago"       ${d.estatus === 'Para Pago' ? 'selected' : ''}>Para Pago</option>
                    <option value="Pagada"          ${d.estatus === 'Pagada' ? 'selected' : ''}>Pagada</option>
                    <option value="Presentada_Cero" ${d.estatus === 'Presentada_Cero' ? 'selected' : ''}>Presentada en Cero</option>
                </select>
            </div>
            <div>
                <label class="form-label text-xs">Observaciones</label>
                <textarea class="form-input" id="detail-obs" rows="2">${escHtml(d.observaciones || '')}</textarea>
            </div>
            <div class="flex gap-3 flex-wrap">
                ${d.acuse_url ? `<a href="${d.acuse_url}" target="_blank" class="btn btn-outline btn-sm"><i class="bi bi-file-pdf text-red-500"></i> Ver Acuse</a>` : ''}
                ${d.linea_captura_url ? `<a href="${d.linea_captura_url}" target="_blank" class="btn btn-outline btn-sm"><i class="bi bi-file-pdf text-blue-500"></i> Ver Línea de Captura</a>` : ''}
                ${d.comprobante_pago_url ? `<a href="${d.comprobante_pago_url}" target="_blank" class="btn btn-outline btn-sm"><i class="bi bi-receipt text-green-500"></i> Ver Comprobante</a>` : ''}
            </div>
        `;

        const saveBtn = document.getElementById('btn-save-decl-detail');
        saveBtn.classList.remove('hidden');
        saveBtn.onclick = async () => {
            setLoading(saveBtn, true);
            const body = {
                estatus: document.getElementById('detail-estatus').value,
                observaciones: document.getElementById('detail-obs').value,
            };
            const r = await Api.put(`declaraciones?id=${id}`, body);
            setLoading(saveBtn, false);
            if (r?.success) { Toast.success('Actualizada.'); Modal.close('modal-decl-detail'); loadDeclaraciones(); }
            else Toast.error(r?.message || 'Error.');
        };

        Modal.open('modal-decl-detail');
    }

    ['btn-close-modal-decl', 'btn-cancel-decl-detail'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => Modal.close('modal-decl-detail'));
    });

    // abrir modal de subir archivo
    function openUpload(declId, tipo, title) {
        uploadDeclId = declId;
        uploadTipo = tipo;
        document.getElementById('upload-title').textContent = title;
        document.getElementById('upload-file').value = '';
        document.getElementById('upload-error').classList.add('hidden');
        Modal.open('modal-upload');
    }

    ['btn-close-upload', 'btn-cancel-upload'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => Modal.close('modal-upload'));
    });

    document.getElementById('btn-confirm-upload')?.addEventListener('click', async () => {
        const fileInput = document.getElementById('upload-file');
        const file = fileInput.files?.[0];
        const errEl = document.getElementById('upload-error');
        const errMsg = document.getElementById('upload-error-msg');

        if (!file) {
            errMsg.textContent = 'Selecciona un archivo.';
            errEl.classList.remove('hidden');
            return;
        }

        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            errMsg.textContent = `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El máximo permitido es 10 MB.`;
            errEl.classList.remove('hidden');
            return;
        }

        const btn = document.getElementById('btn-confirm-upload');
        setLoading(btn, true);

        const formData = new FormData();
        formData.append('archivo', file);

        try {
            const token = Auth.getToken();
            const res = await fetch(`${API_BASE}/declaraciones?id=${uploadDeclId}&action=upload&tipo=${uploadTipo}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                Toast.success('Archivo subido correctamente.');
                Modal.close('modal-upload');
                loadDeclaraciones();
            } else {
                errMsg.textContent = data.message || 'Error al subir.';
                errEl.classList.remove('hidden');
            }
        } catch (e) {
            errMsg.textContent = 'Error de conexión.';
            errEl.classList.remove('hidden');
        } finally {
            setLoading(btn, false);
        }
    });

    // eliminar
    document.getElementById('btn-cancel-delete-decl')?.addEventListener('click', () => Modal.close('modal-delete-decl'));
    document.getElementById('btn-confirm-delete-decl')?.addEventListener('click', async () => {
        if (!deleteId) return;
        const btn = document.getElementById('btn-confirm-delete-decl');
        setLoading(btn, true);
        try {
            const res = await Api.delete(`declaraciones?id=${deleteId}`);
            if (res?.success) { Toast.success('Declaración eliminada.'); Modal.close('modal-delete-decl'); loadDeclaraciones(); }
            else Toast.error(res?.message || 'Error.');
        } catch (e) { Toast.error('Error de conexión.'); }
        finally { setLoading(btn, false); deleteId = null; }
    });

    // nueva declaración
    async function loadNewDeclForm() {
        if (!allClients.length) await loadClientsForSelectors();
    }

    // cuando cambia el cliente, cargar sus obligaciones
    document.getElementById('new-decl-cliente')?.addEventListener('change', async (e) => {
        const cid = e.target.value;
        const sel = document.getElementById('new-decl-obligacion');
        sel.innerHTML = '<option value="">— Selecciona la obligación —</option>';
        if (!cid) return;

        // obtener regimenes del cliente, luego las obligaciones de esos regimenes
        const regRes = await Api.get(`clientes?id=${cid}&action=regimenes`);
        if (!regRes?.success) return;
        const regIds = regRes.data.asignados || [];

        // obtener todas las obligaciones de todos los regimenes
        const oblSet = new Map();
        for (const rid of regIds) {
            const oblRes = await Api.get(`catalogos?action=regimen-obligaciones&id=${rid}`);
            if (oblRes?.success) {
                (oblRes.data.obligaciones || []).forEach(o => oblSet.set(o.id, o));
            }
        }

        oblSet.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.id;
            opt.textContent = `${o.clave} — ${o.nombre} (${o.periodicidad})`;
            sel.appendChild(opt);
        });

        if (!oblSet.size) {
            document.getElementById('new-decl-obl-hint').textContent =
                regIds.length
                    ? '⚠ Los regímenes de este cliente no tienen obligaciones fiscales configuradas en el catálogo.'
                    : '⚠ Este cliente no tiene regímenes asignados. Asígnale un régimen primero.';
        } else {
            document.getElementById('new-decl-obl-hint').textContent =
                `Se encontraron ${oblSet.size} obligaciones según los regímenes del cliente.`;
        }
    });

    document.getElementById('btn-create-decl')?.addEventListener('click', async () => {
        const errorEl = document.getElementById('form-new-decl-error');
        errorEl.classList.add('hidden');

        const cliente_id = document.getElementById('new-decl-cliente').value;
        const obligacion_id = document.getElementById('new-decl-obligacion').value;
        const periodo_mes = document.getElementById('new-decl-mes').value;
        const periodo_anio = document.getElementById('new-decl-anio').value;
        const fecha_limite = document.getElementById('new-decl-fecha-limite').value;
        const importe = document.getElementById('new-decl-importe').value;
        const observaciones = document.getElementById('new-decl-obs').value;

        if (!cliente_id || !obligacion_id || !periodo_mes || !periodo_anio) {
            document.getElementById('form-new-decl-error-msg').textContent = 'Completa todos los campos requeridos.';
            errorEl.classList.remove('hidden');
            return;
        }

        const btn = document.getElementById('btn-create-decl');
        setLoading(btn, true);

        try {
            const res = await Api.post('declaraciones', {
                cliente_id: parseInt(cliente_id),
                obligacion_id: parseInt(obligacion_id),
                periodo_mes: parseInt(periodo_mes),
                periodo_anio: parseInt(periodo_anio),
                fecha_limite,
                importe_a_pagar: parseFloat(importe) || 0,
                observaciones,
            });
            if (res?.success) {
                Toast.success('Declaración creada.');
                // cambiar a la pestaña de lista
                document.querySelectorAll('.tab-btn')[0].click();
                loadDeclaraciones();
            } else {
                document.getElementById('form-new-decl-error-msg').textContent = res?.message || 'Error al crear.';
                errorEl.classList.remove('hidden');
            }
        } catch (e) {
            document.getElementById('form-new-decl-error-msg').textContent = 'Error de conexión.';
            errorEl.classList.remove('hidden');
        } finally {
            setLoading(btn, false);
        }
    });

    // generar obligaciones
    document.getElementById('btn-gen-obligaciones')?.addEventListener('click', async () => {
        const mes = document.getElementById('gen-mes').value;
        const anio = document.getElementById('gen-anio').value;
        const btn = document.getElementById('btn-gen-obligaciones');
        setLoading(btn, true);
        document.getElementById('gen-result').classList.add('hidden');

        try {
            const res = await Api.post('declaraciones?action=generar', { mes: parseInt(mes), anio: parseInt(anio) });
            if (res?.success) {
                document.getElementById('gen-result-msg').textContent = res.message;
                document.getElementById('gen-result').classList.remove('hidden');
                Toast.success(res.message);
            } else {
                Toast.error(res?.message || 'Error al generar.');
            }
        } catch (e) { Toast.error('Error de conexión.'); }
        finally { setLoading(btn, false); }
    });

    // exportar CSV
    function exportToCSV() {
        if (!allDecl.length) { Toast.info('No hay declaraciones para exportar.'); return; }

        const headers = ['ID', 'RFC', 'Cliente', 'Obligacion', 'Clave',
                         'Periodo Mes', 'Periodo Año', 'Estatus',
                         'Importe a Pagar', 'Saldo a Favor',
                         'Fecha Limite', 'Fecha Pago', 'Observaciones', 'Creada'];

        const rows = allDecl.map(d => [
            d.id, d.rfc, d.razon_social, d.obligacion_nombre, d.obligacion_clave,
            MESES[d.periodo_mes] || d.periodo_mes, d.periodo_anio,
            d.estatus === 'Presentada_Cero' ? 'Presentada en Cero' : d.estatus,
            parseFloat(d.importe_a_pagar || 0).toFixed(2),
            parseFloat(d.saldo_a_favor   || 0).toFixed(2),
            d.fecha_limite || '', d.fecha_pago || '',
            d.observaciones || '', d.created_at || '',
        ]);

        const csv = [headers, ...rows]
            .map(r => r.map(c => { const s = String(c).replace(/"/g, '""'); return /[,"\n\r]/.test(s) ? `"${s}"` : s; }).join(','))
            .join('\r\n');

        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const a    = Object.assign(document.createElement('a'), {
            href:     URL.createObjectURL(blob),
            download: `declaraciones_${new Date().toISOString().slice(0, 10)}.csv`,
        });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        Toast.success(`${allDecl.length} declaraciones exportadas.`);
    }

    if (Auth.can('declaraciones', 'exportar')) {
        document.getElementById('btn-export-decl')?.classList.remove('hidden');
    }
    document.getElementById('btn-export-decl')?.addEventListener('click', exportToCSV);

    // init
    await loadClientsForSelectors();
    loadDeclaraciones();
});
