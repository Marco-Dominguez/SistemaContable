document.addEventListener('DOMContentLoaded', async () => {
    Auth.redirectIfNotLogged();

    const u = Auth.getUser();
    if (u) {
        document.getElementById('welcome-title').textContent = `Bienvenido, ${u.nombre} ${u.apellidos}`;
    }

    const dateEl = document.getElementById('welcome-date');
    if (dateEl) {
        const fecha = new Intl.DateTimeFormat('es-MX', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }).format(new Date());
        dateEl.textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
    }

    const MESES_FULL = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const STATUS_LABELS = {
        'Pendiente': { class: 'badge-yellow', icon: 'bi-clock' },
        'En Proceso': { class: 'badge-blue', icon: 'bi-gear' },
        'Para Pago': { class: 'badge-red', icon: 'bi-exclamation-triangle' },
        'Pagada': { class: 'badge-green', icon: 'bi-check-circle' },
        'Presentada_Cero': { class: 'badge-gray', icon: 'bi-dash-circle' },
    };

    async function openDeclDetail(id) {
        const content = document.getElementById('dash-decl-content');
        document.getElementById('dash-decl-title').textContent = `Declaración #${id}`;
        content.innerHTML = `<div class="flex items-center gap-2 py-6 text-slate-400 justify-center"><div class="spinner"></div><span class="text-sm">Cargando...</span></div>`;
        Modal.open('modal-dash-decl');

        const res = await Api.get(`declaraciones?id=${id}`);
        if (!res?.success) {
            content.innerHTML = `<p class="text-sm text-red-500">No se pudo cargar la declaración.</p>`;
            return;
        }
        const d = res.data.declaracion;
        const st = STATUS_LABELS[d.estatus] || STATUS_LABELS['Pendiente'];
        const estatusLabel = d.estatus === 'Presentada_Cero' ? 'En Cero' : d.estatus;

        content.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-xs text-slate-400">Cliente</p>
                    <p class="font-medium text-slate-800">${escHtml(d.razon_social)}</p>
                    <p class="text-xs font-mono text-slate-400">${escHtml(d.rfc)}</p>
                </div>
                <div>
                    <p class="text-xs text-slate-400">Obligación</p>
                    <p class="font-medium text-slate-800">${escHtml(d.obligacion_nombre)}</p>
                    <span class="badge badge-blue text-xs">${escHtml(d.obligacion_clave)}</span>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <p class="text-xs text-slate-400">Periodo</p>
                    <p class="font-medium">${MESES_FULL[d.periodo_mes]} ${d.periodo_anio}</p>
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
            <div class="flex items-center gap-2">
                <p class="text-xs text-slate-400">Estatus</p>
                <span class="badge ${st.class}"><i class="bi ${st.icon} mr-1"></i>${estatusLabel}</span>
            </div>
            ${d.observaciones ? `<div><p class="text-xs text-slate-400">Observaciones</p><p class="text-sm text-slate-600">${escHtml(d.observaciones)}</p></div>` : ''}
            ${(d.acuse_url || d.linea_captura_url || d.comprobante_pago_url) ? `
            <div class="flex gap-3 flex-wrap">
                ${d.acuse_url ? `<a href="${sanitizeUrl(d.acuse_url)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><i class="bi bi-file-pdf text-red-500"></i> Acuse</a>` : ''}
                ${d.linea_captura_url ? `<a href="${sanitizeUrl(d.linea_captura_url)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><i class="bi bi-file-pdf text-blue-500"></i> Línea de Captura</a>` : ''}
                ${d.comprobante_pago_url ? `<a href="${sanitizeUrl(d.comprobante_pago_url)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><i class="bi bi-receipt text-green-500"></i> Comprobante</a>` : ''}
            </div>` : ''}
        `;
    }

    ['btn-close-dash-decl', 'btn-cancel-dash-decl'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => Modal.close('modal-dash-decl'));
    });

    try {
        const [resUsers, resRoles, resDecl] = await Promise.all([
            Api.get('usuarios'),
            Api.get('roles'),
            Api.get('declaraciones?action=stats'),
        ]);
        if (resUsers?.success) document.getElementById('stat-users').textContent = resUsers.data.usuarios?.length ?? 0;
        if (resRoles?.success) document.getElementById('stat-roles').textContent = resRoles.data.roles?.length ?? 0;
        if (resDecl?.success) {
            document.getElementById('stat-clients').textContent = resDecl.data.total_clientes ?? 0;
            document.getElementById('stat-decl').textContent = resDecl.data.total_declaraciones ?? 0;
            renderCarousel(resDecl.data.recientes ?? []);
        }
    } catch (e) {
        renderCarousel([]);
    }

    function renderCarousel(declaraciones) {
        const track = document.getElementById('carousel-track');
        const btnPrev = document.getElementById('carousel-prev');
        const btnNext = document.getElementById('carousel-next');
        if (!track) return;

        const CARD_W = 200 + 16; // card width + gap
        let offset = 0;

        const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const STATUS_MAP = {
            'Pendiente': { badge: 'badge-yellow', bg: '#fefce8', icon: '#ca8a04' },
            'En Proceso': { badge: 'badge-blue', bg: '#eff6ff', icon: '#2563eb' },
            'Para Pago': { badge: 'badge-red', bg: '#fef2f2', icon: '#dc2626' },
            'Pagada': { badge: 'badge-green', bg: '#f0fdf4', icon: '#16a34a' },
            'Presentada_Cero': { badge: 'badge-gray', bg: '#f8fafc', icon: '#64748b' },
        };

        if (!declaraciones.length) {
            track.innerHTML = '<p class="text-sm text-slate-400 text-center py-6 w-full">No hay declaraciones recientes.</p>';
            btnPrev.disabled = true;
            btnNext.disabled = true;
            return;
        }

        track.innerHTML = declaraciones.map(d => {
            const st = STATUS_MAP[d.estatus] || STATUS_MAP['Pendiente'];
            const label = d.estatus === 'Presentada_Cero' ? 'En Cero' : d.estatus;
            const period = `${MESES[d.periodo_mes] ?? ''} ${d.periodo_anio ?? ''}`.trim();
            const client = d.razon_social ? d.razon_social.substring(0, 18) : '—';
            const oblig = d.obligacion_nombre || d.obligacion_clave || '—';
            return `
                <div class="decl-card" role="button" tabindex="0" data-id="${d.id}"
                     aria-label="Declaración ${oblig} — ${period}">
                    <div class="decl-card-thumb" style="background:${st.bg};">
                        <i class="bi bi-file-earmark-text" style="color:${st.icon};" aria-hidden="true"></i>
                    </div>
                    <div class="decl-card-body">
                        <div class="decl-card-title">${oblig}</div>
                        <div class="decl-card-badges">
                            <span class="decl-card-badge">${d.obligacion_clave || ''}</span>
                            <span class="badge ${st.badge}">${label}</span>
                        </div>
                    </div>
                    <div class="decl-card-footer">
                        <span class="decl-card-period">
                            <i class="bi bi-calendar3" aria-hidden="true"></i>${period}
                        </span>
                        <span class="decl-card-client">${client}</span>
                    </div>
                </div>`;
        }).join('');

        track.querySelectorAll('.decl-card').forEach(card => {
            const id = parseInt(card.dataset.id);
            card.addEventListener('click', () => openDeclDetail(id));
            card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDeclDetail(id); } });
        });

        function update() {
            const outerW = track.parentElement.offsetWidth;
            const visible = Math.max(1, Math.floor(outerW / CARD_W));
            const maxOff = Math.max(0, declaraciones.length - visible);
            offset = Math.min(offset, maxOff);
            btnPrev.disabled = offset === 0;
            btnNext.disabled = offset >= maxOff;
            track.style.transform = `translateX(-${offset * CARD_W}px)`;
        }

        btnPrev.addEventListener('click', () => { offset = Math.max(0, offset - 1); update(); });
        btnNext.addEventListener('click', () => { offset++; update(); });
        window.addEventListener('resize', update);
        update();
    }

});
