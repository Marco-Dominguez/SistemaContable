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
        const track   = document.getElementById('carousel-track');
        const btnPrev = document.getElementById('carousel-prev');
        const btnNext = document.getElementById('carousel-next');
        if (!track) return;

        const CARD_W = 200 + 16; // card width + gap
        let offset = 0;

        const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const STATUS_MAP = {
            'Pendiente':       { badge: 'badge-yellow', bg: '#fefce8', icon: '#ca8a04' },
            'En Proceso':      { badge: 'badge-blue',   bg: '#eff6ff', icon: '#2563eb' },
            'Para Pago':       { badge: 'badge-red',    bg: '#fef2f2', icon: '#dc2626' },
            'Pagada':          { badge: 'badge-green',  bg: '#f0fdf4', icon: '#16a34a' },
            'Presentada_Cero': { badge: 'badge-gray',   bg: '#f8fafc', icon: '#64748b' },
        };

        if (!declaraciones.length) {
            track.innerHTML = '<p class="text-sm text-slate-400 text-center py-6 w-full">No hay declaraciones recientes.</p>';
            btnPrev.disabled = true;
            btnNext.disabled = true;
            return;
        }

        track.innerHTML = declaraciones.map(d => {
            const st     = STATUS_MAP[d.estatus] || STATUS_MAP['Pendiente'];
            const label  = d.estatus === 'Presentada_Cero' ? 'En Cero' : d.estatus;
            const period = `${MESES[d.periodo_mes] ?? ''} ${d.periodo_anio ?? ''}`.trim();
            const client = d.razon_social ? d.razon_social.substring(0, 18) : '—';
            const oblig  = d.obligacion_nombre || d.obligacion_clave || '—';
            return `
                <div class="decl-card" role="button" tabindex="0"
                     aria-label="Declaración ${oblig} — ${period}"
                     onclick="location.href='/view/pages/declaraciones/index.html'"
                     onkeydown="if(event.key==='Enter')location.href='/view/pages/declaraciones/index.html'">
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

        function update() {
            const outerW  = track.parentElement.offsetWidth;
            const visible = Math.max(1, Math.floor(outerW / CARD_W));
            const maxOff  = Math.max(0, declaraciones.length - visible);
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

    document.getElementById('modal-decl-close')?.addEventListener('click', () => Modal.close('modal-decl'));
    document.getElementById('modal-decl-close2')?.addEventListener('click', () => Modal.close('modal-decl'));
    document.getElementById('modal-decl')?.addEventListener('click', e => {
        if (e.target.id === 'modal-decl') Modal.close('modal-decl');
    });
});
