document.addEventListener('DOMContentLoaded', async () => {
    Auth.redirectIfNotLogged();

    const u = Auth.getUser();
    if (u) {
        document.getElementById('welcome-title').textContent = `Bienvenido, ${u.nombre} ${u.apellidos}`;
    }

    // cargar stats
    try {
        const [resUsers, resRoles] = await Promise.all([
            Api.get('usuarios'),
            Api.get('roles'),
        ]);
        if (resUsers?.success) document.getElementById('stat-users').textContent = resUsers.data.usuarios?.length ?? 0;
        if (resRoles?.success) document.getElementById('stat-roles').textContent = resRoles.data.roles?.length ?? 0;
    } catch (e) { /* na */ }

    // datos carrusel de declaraciones
    const DECL_PLACEHOLDER = [
        { titulo: 'ISR Mensual',     tipo: 'ISR',       periodo: 'Mar 2026', estado: 'Pendiente',  badgeClass: 'badge-yellow', thumbBg: '#fefce8', iconColor: '#ca8a04' },
        { titulo: 'IVA',             tipo: 'IVA',       periodo: 'Feb 2026', estado: 'Completada', badgeClass: 'badge-green',  thumbBg: '#f0fdf4', iconColor: '#16a34a' },
        { titulo: 'ISR Mensual',     tipo: 'ISR',       periodo: 'Feb 2026', estado: 'Completada', badgeClass: 'badge-green',  thumbBg: '#f0fdf4', iconColor: '#16a34a' },
        { titulo: 'Retenciones ISR', tipo: 'Retención', periodo: 'Feb 2026', estado: 'Revisión',   badgeClass: 'badge-blue',   thumbBg: '#eff6ff', iconColor: '#2563eb' },
        { titulo: 'IVA',             tipo: 'IVA',       periodo: 'Ene 2026', estado: 'Completada', badgeClass: 'badge-green',  thumbBg: '#f0fdf4', iconColor: '#16a34a' },
        { titulo: 'ISR Mensual',     tipo: 'ISR',       periodo: 'Ene 2026', estado: 'Completada', badgeClass: 'badge-green',  thumbBg: '#f0fdf4', iconColor: '#16a34a' },
        { titulo: 'Retenciones ISR', tipo: 'Retención', periodo: 'Ene 2026', estado: 'Completada', badgeClass: 'badge-green',  thumbBg: '#f0fdf4', iconColor: '#16a34a' },
    ];

    const track   = document.getElementById('carousel-track');
    const btnPrev = document.getElementById('carousel-prev');
    const btnNext = document.getElementById('carousel-next');
    const modal   = document.getElementById('modal-decl');
    const CARD_W  = 210 + 16;
    let offset = 0;

    DECL_PLACEHOLDER.forEach(d => {
        const card = document.createElement('div');
        card.className = 'decl-card';
        card.innerHTML = `
            <div class="decl-card-thumb" style="background:${d.thumbBg};">
                <i class="bi bi-file-earmark-text" style="color:${d.iconColor};"></i>
            </div>
            <div class="decl-card-body">
                <div class="decl-card-title">${d.titulo}</div>
                <div class="decl-card-badges">
                    <span class="decl-card-badge">${d.tipo}</span>
                    <span class="badge ${d.badgeClass}">${d.estado}</span>
                </div>
            </div>
            <div class="decl-card-footer">
                <span class="decl-card-period">
                    <i class="bi bi-calendar3" style="font-size:.65rem;"></i>${d.periodo}
                </span>
                <button class="decl-card-btn">Ver</button>
            </div>`;
        card.addEventListener('click', () => modal.classList.remove('hidden'));
        track.appendChild(card);
    });

    function updateCarousel() {
        const outerW  = track.parentElement.offsetWidth;
        const visible = Math.max(1, Math.floor(outerW / CARD_W));
        const maxOffset = Math.max(0, DECL_PLACEHOLDER.length - visible);
        btnPrev.disabled = offset === 0;
        btnNext.disabled = offset >= maxOffset;
        track.style.transform = `translateX(-${offset * CARD_W}px)`;
    }

    btnPrev.addEventListener('click', () => { offset = Math.max(0, offset - 1); updateCarousel(); });
    btnNext.addEventListener('click', () => { offset++; updateCarousel(); });
    window.addEventListener('resize', updateCarousel);
    updateCarousel();

    // cerrar modal
    document.getElementById('modal-decl-close').addEventListener('click',  () => modal.classList.add('hidden'));
    document.getElementById('modal-decl-close2').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
});