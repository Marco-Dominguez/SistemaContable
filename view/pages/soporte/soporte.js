// credenciales de emailjs
const EMAILJS_PUBLIC_KEY  = 'bued6nbXThDM67F-2';
const EMAILJS_SERVICE_ID  = 'service_glhlyz7';
const EMAILJS_TEMPLATE_ID = 'template_fjxe6q8';

// pre-llena nombre y correo con los datos de la sesion activa
function prefillContactForm() {
    const user = Auth.getUser();
    if (!user) return;
    const nameEl  = document.getElementById('contact-name');
    const emailEl = document.getElementById('contact-email');
    if (nameEl)  nameEl.value  = `${user.nombre} ${user.apellidos}`.trim();
    if (emailEl) emailEl.value = user.email || '';
}

// envia el formulario al contador via emailjs
async function sendContactForm(e) {
    e.preventDefault();

    const btn = document.getElementById('btn-send-contact');
    setLoading(btn, true);

    const params = {
        from_name:  document.getElementById('contact-name').value.trim(),
        from_email: document.getElementById('contact-email').value.trim(),
        subject:    document.getElementById('contact-subject').value.trim(),
        message:    document.getElementById('contact-message').value.trim(),
    };

    try {
        emailjs.init(EMAILJS_PUBLIC_KEY);
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
        Toast.success('Mensaje enviado correctamente');
        document.getElementById('form-contact').reset();
        prefillContactForm();
    } catch (err) {
        console.error('emailjs error:', err);
        Toast.error('Error al enviar el mensaje. Verifica las credenciales de EmailJS.');
    } finally {
        setLoading(btn, false);
    }
}

function initPage() {
    Auth.redirectIfNotLogged();
    prefillContactForm();

    document.getElementById('form-contact')
        ?.addEventListener('submit', sendContactForm);
}

document.addEventListener('DOMContentLoaded', initPage);
