// configuracion
const API_BASE = '/SistemaContable/service/api';

// auth helpers
const Auth = {
    getToken()   { return localStorage.getItem('sc_token'); },
    getUser()    {
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
    isLogged()   { return !!this.getToken(); },
    can(modulo, accion) {
        const u = this.getUser();
        return !!(u?.permisos?.[modulo]?.includes(accion));
    },
    redirectIfNotLogged() {
        if (!this.isLogged()) {
            window.location.href = '/SistemaContable/view/pages/auth/login.html';
        }
    },
    redirectIfLogged() {
        if (this.isLogged()) {
            window.location.href = '/SistemaContable/view/pages/dashboard/index.html';
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

        const res  = await fetch(`${API_BASE}/${endpoint}`, opts);
        const data = await res.json();

        // si es 401 limpiar sesion y redirigir
        if (res.status === 401) {
            Auth.clear();
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = '/SistemaContable/view/pages/auth/login.html';
                return;
            }
        }
        return data;
    },
    get(endpoint)          { return this.request('GET',    endpoint); },
    post(endpoint, body)   { return this.request('POST',   endpoint, body); },
    put(endpoint, body)    { return this.request('PUT',    endpoint, body); },
    delete(endpoint)       { return this.request('DELETE', endpoint); },
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
    error(m)   { this.show(m, 'error'); },
    info(m)    { this.show(m, 'info'); },
};

// modal helper
const Modal = {
    open(id)  { document.getElementById(id)?.classList.remove('hidden'); },
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
    $$('.nav-item').forEach(el => {
        if (el.getAttribute('href') && path.endsWith(el.getAttribute('href').split('/').pop())) {
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

// init topbar user info
function initTopbarUser() {
    const u = Auth.getUser();
    if (!u) return;
    const el = $('#topbar-user-name');
    if (el) el.textContent = `${u.nombre} ${u.apellidos}`;
    const roleEl = $('#topbar-user-role');
    if (roleEl) roleEl.textContent = u.roles?.join(', ') ?? '';
}

// logout
document.addEventListener('DOMContentLoaded', () => {
    initSidebarActive();
    initSidebarToggle();
    initTopbarUser();

    $('#btn-logout')?.addEventListener('click', async () => {
        await Api.post('auth?action=logout');
        Auth.clear();
        window.location.href = '/SistemaContable/view/pages/auth/login.html';
    });
});
