document.addEventListener('DOMContentLoaded', async () => {
    Auth.redirectIfNotLogged();

    const u = Auth.getUser();
    if (u) {
        document.getElementById('welcome-title').textContent = `Bienvenido, ${u.nombre} ${u.apellidos}`;
    }

    // cargar stats
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
    } catch (e) { /* na */ }

    // render carousel con datos reales
    function renderCarousel(declaraciones) {
        const track   = document.getElementById('carousel-track');
        const btnPrev = document.getElementById('carousel-prev');
        const btnNext = document.getElementById('carousel-next');
        const modal   = document.getElementById('modal-decl');
        const CARD_W  = 210 + 16;
        let offset = 0;

        const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const STATUS_MAP = {
            'Pendiente':       { badgeClass: 'badge-yellow', thumbBg: '#fefce8', iconColor: '#ca8a04' },
            'En Proceso':      { badgeClass: 'badge-blue',   thumbBg: '#eff6ff', iconColor: '#2563eb' },
            'Para Pago':       { badgeClass: 'badge-red',    thumbBg: '#fef2f2', iconColor: '#dc2626' },
            'Pagada':          { badgeClass: 'badge-green',  thumbBg: '#f0fdf4', iconColor: '#16a34a' },
            'Presentada_Cero': { badgeClass: 'badge-gray',   thumbBg: '#f8fafc', iconColor: '#64748b' },
        };

        // fallback si no hay declaraciones reales
        if (!declaraciones.length) {
            track.innerHTML = '<div class="p-6 text-center text-slate-400 text-sm w-full">No hay declaraciones recientes.</div>';
            btnPrev.disabled = true;
            btnNext.disabled = true;
            return;
        }

        track.innerHTML = '';
        declaraciones.forEach(d => {
            const st = STATUS_MAP[d.estatus] || STATUS_MAP['Pendiente'];
            const estatusLabel = d.estatus === 'Presentada_Cero' ? 'En Cero' : d.estatus;
            const card = document.createElement('div');
            card.className = 'decl-card';
            card.innerHTML = `
                <div class="decl-card-thumb" style="background:${st.thumbBg};">
                    <i class="bi bi-file-earmark-text" style="color:${st.iconColor};"></i>
                </div>
                <div class="decl-card-body">
                    <div class="decl-card-title">${d.obligacion_nombre || d.obligacion_clave}</div>
                    <div class="decl-card-badges">
                        <span class="decl-card-badge">${d.obligacion_clave}</span>
                        <span class="badge ${st.badgeClass}">${estatusLabel}</span>
                    </div>
                </div>
                <div class="decl-card-footer">
                    <span class="decl-card-period">
                        <i class="bi bi-calendar3" style="font-size:.65rem;"></i>${MESES[d.periodo_mes]} ${d.periodo_anio}
                    </span>
                    <span class="text-xs text-slate-500 font-medium">${d.razon_social ? d.razon_social.substring(0, 15) : ''}</span>
                </div>`;
            card.addEventListener('click', () => {
                window.location.href = '/view/pages/declaraciones/index.html';
            });
            track.appendChild(card);
        });

        function updateCarousel() {
            const outerW  = track.parentElement.offsetWidth;
            const visible = Math.max(1, Math.floor(outerW / CARD_W));
            const maxOffset = Math.max(0, declaraciones.length - visible);
            btnPrev.disabled = offset === 0;
            btnNext.disabled = offset >= maxOffset;
            track.style.transform = `translateX(-${offset * CARD_W}px)`;
        }

        btnPrev.addEventListener('click', () => { offset = Math.max(0, offset - 1); updateCarousel(); });
        btnNext.addEventListener('click', () => { offset++; updateCarousel(); });
        window.addEventListener('resize', updateCarousel);
        updateCarousel();
    }

    // cerrar modal
    document.getElementById('modal-decl-close').addEventListener('click',  () => document.getElementById('modal-decl').classList.add('hidden'));
    document.getElementById('modal-decl-close2').addEventListener('click', () => document.getElementById('modal-decl').classList.add('hidden'));
    document.getElementById('modal-decl').addEventListener('click', e => { if (e.target.id === 'modal-decl') e.target.classList.add('hidden'); });
});