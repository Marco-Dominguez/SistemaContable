document.addEventListener('DOMContentLoaded', async () => {
    Auth.redirectIfNotLogged();

    // cargar datos del servidor
    async function loadProfile() {
        try {
            const res = await Api.get('auth?action=me');
            if (!res?.success) { Toast.error('No se pudo cargar el perfil.'); return; }

            const u = res.data.usuario;
            document.getElementById('profile-nombre').value    = u.nombre    ?? '';
            document.getElementById('profile-apellidos').value = u.apellidos ?? '';
            document.getElementById('profile-email').value     = u.email     ?? '';

            document.getElementById('profile-loading').classList.add('hidden');
            document.getElementById('form-profile').classList.remove('hidden');
        } catch (e) {
            Toast.error('Error de conexión al cargar el perfil.');
        }
    }

    await loadProfile();

    // guardar información personal
    document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
        const nombre    = document.getElementById('profile-nombre').value.trim();
        const apellidos = document.getElementById('profile-apellidos').value.trim();
        const email     = document.getElementById('profile-email').value.trim();
        const errEl     = document.getElementById('profile-error');
        const errMsg    = document.getElementById('profile-error-msg');

        errEl.classList.add('hidden');

        if (!nombre || !apellidos) {
            errMsg.textContent = 'Nombre y apellidos son requeridos.';
            errEl.classList.remove('hidden');
            return;
        }
        if (email && !/\S+@\S+\.\S+/.test(email)) {
            errMsg.textContent = 'El correo no es válido.';
            errEl.classList.remove('hidden');
            return;
        }

        const btn = document.getElementById('btn-save-profile');
        setLoading(btn, true);

        try {
            const res = await Api.put('auth?action=update-profile', { nombre, apellidos, email });
            if (!res?.success) {
                errMsg.textContent = res?.message || 'Error al guardar.';
                errEl.classList.remove('hidden');
                return;
            }

            // actualizar localStorage para reflejar cambios en el topbar
            const current = Auth.getUser();
            if (current) {
                current.nombre    = res.data.nombre    || nombre;
                current.apellidos = res.data.apellidos || apellidos;
                if (email) current.email = res.data.email || email;
                localStorage.setItem('sc_user', JSON.stringify(current));
                initSidebarUser();
            }

            Toast.success('Perfil actualizado correctamente.');
        } catch (e) {
            errMsg.textContent = 'Error de conexión.';
            errEl.classList.remove('hidden');
        } finally {
            setLoading(btn, false);
        }
    });

    // cambiar contraseña
    document.getElementById('btn-save-password')?.addEventListener('click', async () => {
        const currentPass = document.getElementById('current-password').value;
        const newPass     = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('confirm-password').value;
        const errEl       = document.getElementById('pass-error');
        const errMsg      = document.getElementById('pass-error-msg');

        errEl.classList.add('hidden');

        if (!currentPass) {
            errMsg.textContent = 'Ingresa tu contraseña actual.';
            errEl.classList.remove('hidden');
            return;
        }
        if (newPass.length < 8) {
            errMsg.textContent = 'La nueva contraseña debe tener al menos 8 caracteres.';
            errEl.classList.remove('hidden');
            return;
        }
        if (newPass !== confirmPass) {
            errMsg.textContent = 'Las contraseñas no coinciden.';
            errEl.classList.remove('hidden');
            return;
        }

        const btn = document.getElementById('btn-save-password');
        setLoading(btn, true);

        try {
            const res = await Api.put('auth?action=change-password', {
                current_password: currentPass,
                new_password:     newPass,
            });
            if (!res?.success) {
                errMsg.textContent = res?.message || 'Error al cambiar contraseña.';
                errEl.classList.remove('hidden');
                return;
            }
            Toast.success('Contraseña actualizada correctamente.');
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value     = '';
            document.getElementById('confirm-password').value = '';
        } catch (e) {
            errMsg.textContent = 'Error de conexión.';
            errEl.classList.remove('hidden');
        } finally {
            setLoading(btn, false);
        }
    });
});
