document.addEventListener('DOMContentLoaded', () => {
    // redirigir si esta logueado
    Auth.redirectIfLogged();

    document.getElementById('year').textContent = new Date().getFullYear();

    const form     = document.getElementById('login-form');
    const btnLogin = document.getElementById('btn-login');
    const alert    = document.getElementById('login-alert');
    const alertMsg = document.getElementById('login-alert-msg');

    // alternar visibilidad de la contra
    document.getElementById('toggle-pass')?.addEventListener('click', () => {
        const inp  = document.getElementById('password');
        const icon = document.getElementById('pass-icon');
        if (inp.type === 'password') {
            inp.type = 'text';
            icon.className = 'bi bi-eye-slash';
        } else {
            inp.type = 'password';
            icon.className = 'bi bi-eye';
        }
    });

    // mostrar mensaje de alerta
    function showAlert(msg) {
        alertMsg.textContent = msg;
        alert.classList.remove('hidden');
    }

    // ocultar alerta
    function hideAlert() { alert.classList.add('hidden'); }

    // validar campos y mostrar errores
    function validateField(id, errId, condition, message) {
        const inp = document.getElementById(id);
        const err = document.getElementById(errId);
        if (condition) {
            inp.classList.add('border-red-400');
            err.textContent = message;
            err.classList.remove('hidden');
            return false;
        }
        inp.classList.remove('border-red-400');
        err.classList.add('hidden');
        return true;
    }

    //  guardado del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const v1 = validateField('email',    'email-err', !email || !/\S+@\S+\.\S+/.test(email), 'Ingresa un correo válido.');
        const v2 = validateField('password', 'pass-err',  password.length < 6, 'La contraseña es muy corta.');
        if (!v1 || !v2) return;

        setLoading(btnLogin, true);
        try {
            const res = await Api.post('auth?action=login', { email, password });
            if (!res) return;

            if (!res.success) {
                showAlert(res.message || 'Credenciales incorrectas.');
                return;
            }

            Auth.setSession(res.data.token, res.data.usuario);
            Toast.success('¡Bienvenido!');
            setTimeout(() => {
                window.location.href = '/SistemaContable/view/pages/dashboard/index.html';
            }, 600);

        } catch (err) {
            console.error(err);
            showAlert('Error de conexión. Verifica que el servidor esté activo.');
        } finally {
            setLoading(btnLogin, false);
        }
    });
});
