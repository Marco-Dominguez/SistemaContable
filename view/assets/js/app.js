// configuracion
const API_BASE = '/service/api';

// auth helpers
const Auth = {
    getToken() { return localStorage.getItem('sc_token'); },
    getUser() {
        try { return JSON.parse(localStorage.getItem('sc_user')); }
        catch { return null; }
    },
    setSession(token, usuario) {
        localStorage.setItem('sc_token', token);
        localStorage.setItem('sc_user', JSON.stringify(usuario));
    },
    clear() {
        localStorage.removeItem('sc_token');
        localStorage.removeItem('sc_user');
    },
    isLogged() { return !!this.getToken(); },
    can(modulo, accion) {
        const u = this.getUser();
        return !!(u?.permisos?.[modulo]?.includes(accion));
    },
    redirectIfNotLogged() {
        if (!this.isLogged()) {
            window.location.href = '/view/pages/auth/login.html';
        }
    },
    redirectIfLogged() {
        if (this.isLogged()) {
            window.location.href = '/view/pages/dashboard/index.html';
        }
    },
};

// api client helper
const Api = {
    async request(method, endpoint, body = null) {
        const token = Auth.getToken();
        const opts = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
        };
        if (body && method !== 'GET') opts.body = JSON.stringify(body);

        const res = await fetch(`${API_BASE}/${endpoint}`, {
            ...opts,
            signal: AbortSignal.timeout(15000),
        });

        let data;
        try {
            data = await res.json();
        } catch {
            throw new Error('Respuesta inválida del servidor.');
        }

        // si es 401 limpiar sesion y redirigir
        if (res.status === 401) {
            Auth.clear();
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = '/view/pages/auth/login.html';
                return;
            }
        }
        return data;
    },
    get(endpoint) { return this.request('GET', endpoint); },
    post(endpoint, body) { return this.request('POST', endpoint, body); },
    put(endpoint, body) { return this.request('PUT', endpoint, body); },
    delete(endpoint) { return this.request('DELETE', endpoint); },
};

// toast helper
const Toast = {
    container: null,
    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            document.body.appendChild(this.container);
        }
    },
    show(message, type = 'info', duration = 3500) {
        this.init();
        const icons = { success: 'bi-check-circle', error: 'bi-x-circle', info: 'bi-info-circle' };
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span>${message}</span>`;
        this.container.appendChild(t);
        setTimeout(() => t.remove(), duration);
    },
    success(m) { this.show(m, 'success'); },
    error(m) { this.show(m, 'error'); },
    info(m) { this.show(m, 'info'); },
};

// modal helper
const Modal = {
    open(id) { document.getElementById(id)?.classList.remove('hidden'); },
    close(id) { document.getElementById(id)?.classList.add('hidden'); },
};

// dom helpers
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn._originalHTML = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span>';
        btn.disabled = true;
    } else {
        btn.innerHTML = btn._originalHTML || btn.innerHTML;
        btn.disabled = false;
    }
}

function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// sidebar active link highlight
function initSidebarActive() {
    const path = window.location.pathname;
    $$('.nav-item').forEach(el => el.classList.remove('active'));
    $$('.nav-item').forEach(el => {
        const href = el.getAttribute('href');
        if (href && href !== '#' && path.includes(href)) {
            el.classList.add('active');
        }
    });
}

// sidebar toggle mobile
function initSidebarToggle() {
    const toggle = $('#sidebar-toggle');
    const sidebar = $('#sidebar');
    toggle?.addEventListener('click', () => sidebar?.classList.toggle('open'));
}

// load sidebar component from partial HTML
async function loadSidebar() {
    const sidebar = $('#sidebar');
    if (!sidebar) return;
    // solo cargar si el sidebar esta vacio
    if (sidebar.children.length > 0) {
        initSidebarActive();
        initSidebarToggle();
        return;
    }
    try {
        const res = await fetch('/view/components/sidebar.html');
        if (!res.ok) return;
        sidebar.innerHTML = await res.text();
        initSidebarActive();
        initSidebarToggle();
    } catch (e) {
        console.error('Error cargando sidebar:', e);
    }
}

// init topbar user info
function initTopbarUser() {
    const u = Auth.getUser();
    if (!u) return;
    const el = $('#topbar-user-name');
    if (el) el.textContent = `${u.nombre} ${u.apellidos}`;
    const roleEl = $('#topbar-user-role');
    if (roleEl) roleEl.textContent = u.roles?.join(', ') ?? '';
}

// init general
document.addEventListener('DOMContentLoaded', async () => {
    await loadSidebar();
    initTopbarUser();

    $('#btn-logout')?.addEventListener('click', async () => {
        await Api.post('auth?action=logout');
        Auth.clear();
        window.location.href = '/view/pages/auth/login.html';
    });

    // notificaciones
    initNotifications();
});

// notificaciones sistema
function initNotifications() {
    const btnNotif = $('#btn-notif');
    const dropdown = $('#notif-dropdown');
    const countBadge = $('#notif-count');
    if (!btnNotif || !dropdown) return;
    if (!Auth.isLogged()) return;

    let isOpen = false;

    btnNotif.addEventListener('click', async (e) => {
        e.stopPropagation();
        isOpen = !isOpen;
        if (isOpen) {
            await loadNotifications();
            dropdown.classList.remove('hidden');
        } else {
            dropdown.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (isOpen && !dropdown.contains(e.target) && !btnNotif.contains(e.target)) {
            dropdown.classList.add('hidden');
            isOpen = false;
        }
    });

    async function loadNotifCount() {
        try {
            const res = await Api.get('notificaciones?action=count');
            if (res?.success) {
                const cnt = res.data.count || 0;
                if (cnt > 0) {
                    countBadge.textContent = cnt > 99 ? '99+' : cnt;
                    countBadge.classList.remove('hidden');
                } else {
                    countBadge.classList.add('hidden');
                }
            }
        } catch (e) { /* silencio */ }
    }

    async function loadNotifications() {
        try {
            const res = await Api.get('notificaciones');
            if (!res?.success) return;
            const notifs = res.data.notificaciones ?? [];
            if (!notifs.length) {
                dropdown.innerHTML = `
                    <div class="notif-dropdown-header">
                        <span class="font-semibold text-sm">Notificaciones</span>
                    </div>
                    <div class="p-4 text-center text-slate-400 text-sm">
                        <i class="bi bi-bell-slash text-2xl block mb-1"></i>
                        Sin notificaciones
                    </div>`;
                return;
            }
            const tipoIcons = {
                info: 'bi-info-circle text-blue-500',
                success: 'bi-check-circle text-green-500',
                warning: 'bi-exclamation-triangle text-amber-500',
                error: 'bi-x-circle text-red-500',
            };
            dropdown.innerHTML = `
                <div class="notif-dropdown-header">
                    <span class="font-semibold text-sm">Notificaciones</span>
                    <button class="text-xs text-blue-600 hover:underline" id="btn-mark-all-read">Marcar todas como leídas</button>
                </div>
                <div class="notif-dropdown-list">
                    ${notifs.slice(0, 20).map(n => `
                        <div class="notif-item ${n.leido ? '' : 'notif-unread'}" data-id="${n.id}">
                            <i class="bi ${tipoIcons[n.tipo] || tipoIcons.info} text-lg"></i>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-slate-800 truncate">${n.titulo}</p>
                                <p class="text-xs text-slate-500 line-clamp-2">${n.mensaje}</p>
                                <p class="text-xs text-slate-300 mt-1">${timeAgo(n.created_at)}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>`;

            // marcar como leída
            dropdown.querySelectorAll('.notif-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const nid = item.dataset.id;
                    await Api.put(`notificaciones?id=${nid}`);
                    item.classList.remove('notif-unread');
                    loadNotifCount();
                });
            });

            // marcar todas como leídas
            $('#btn-mark-all-read')?.addEventListener('click', async () => {
                await Api.put('notificaciones?action=read-all');
                dropdown.querySelectorAll('.notif-unread').forEach(i => i.classList.remove('notif-unread'));
                countBadge.classList.add('hidden');
            });
        } catch (e) { /* silencio */ }
    }

    function timeAgo(dateStr) {
        const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60) return 'Justo ahora';
        if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
        return `Hace ${Math.floor(diff / 86400)} d`;
    }

    // carga inicial y cada 30 segundos
    loadNotifCount();
    setInterval(loadNotifCount, 30000);
}
