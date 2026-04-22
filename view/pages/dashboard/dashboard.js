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
            renderRecents(resDecl.data.recientes ?? []);
        }
    } catch (e) {
        renderRecents([]);
    }

    function renderRecents(declaraciones) {
        const container = document.getElementById('recents-container');
        const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const STATUS_BADGE = {
            'Pendiente':       'badge-yellow',
            'En Proceso':      'badge-blue',
            'Para Pago':       'badge-red',
            'Pagada':          'badge-green',
            'Presentada_Cero': 'badge-gray',
        };

        if (!declaraciones.length) {
            container.innerHTML = '<p class="text-sm text-slate-400 text-center py-6">No hay declaraciones recientes.</p>';
            return;
        }

        container.innerHTML = declaraciones.slice(0, 6).map(d => {
            const badge  = STATUS_BADGE[d.estatus] || 'badge-gray';
            const label  = d.estatus === 'Presentada_Cero' ? 'En Cero' : d.estatus;
            const period = `${MESES[d.periodo_mes]} ${d.periodo_anio}`;
            const client = d.razon_social ? d.razon_social.substring(0, 24) : '—';
            const oblig  = d.obligacion_nombre || d.obligacion_clave;
            return `<div class="recent-decl-item" role="button" tabindex="0"
                        onclick="location.href='/view/pages/declaraciones/index.html'"
                        onkeydown="if(event.key==='Enter')location.href='/view/pages/declaraciones/index.html'">
                <div class="recent-decl-info">
                    <span class="recent-decl-client">${client}</span>
                    <span class="recent-decl-obligation">${oblig}</span>
                </div>
                <span class="recent-decl-period">${period}</span>
                <span class="badge ${badge}">${label}</span>
                <i class="bi bi-chevron-right recent-decl-arrow"></i>
            </div>`;
        }).join('');
    }
});