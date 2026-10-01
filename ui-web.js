// Ajustes de la interfaz para la versión web: entrar con Google, usuarios por correo y datos en la nube.
(() => {
  const W = window.WS, $ = W.$, esc = W.esc;
  const googleMark = '<svg class="google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.4 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
  let lastStatus = {};

  const card = (title, subtitle, body) => `<div class="auth-card"><div class="auth-brand"><img src="assets/wannashop-logo.png" alt="Logo WannaShop"><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${body}<p class="auth-foot">${lastStatus.demo ? 'Modo demostración · los datos quedan solo en este navegador' : 'WannaShop en la nube · acceso solo para cuentas autorizadas'}</p></div>`;
  const show = html => { $('#shell').classList.add('hidden'); $('#authRoot').classList.remove('hidden'); $('#authRoot').innerHTML = html; W.hideBoot(); };
  const busy = (button, on) => { if (!button) return; button.disabled = on; button.classList.toggle('loading', on); };

  function showSignIn(message = '') {
    show(card('Bienvenido a WannaShop', lastStatus.demo ? 'Prueba la aplicación completa. Para usarla con tu equipo hay que conectar la nube.' : 'Entra con tu cuenta de Google (Gmail).', `<div id="authError" class="error-box ${message ? '' : 'hidden'}">${esc(message)}</div><button type="button" class="primary button google-button" id="googleSignIn">${lastStatus.demo ? 'Entrar a la demostración' : `${googleMark}<span>Entrar con Google</span>`}</button>`));
    $('#googleSignIn').onclick = signIn;
  }
  async function signIn() {
    const button = $('#googleSignIn'); busy(button, true);
    try { route(await window.api.googleLogin()); }
    catch (error) { showSignIn(/popup-closed|cancelled-popup/i.test(String(error?.code || error?.message)) ? '' : W.cleanError(error)); }
  }
  function route(result) {
    if (result?.ok) return enter();
    if (result?.needsOwner) return showClaim(result.email);
    if (result?.denied) return showDenied(result);
  }
  async function enter() {
    W.token = 'web';
    try { await W.enterShell(); }
    catch (error) { showSignIn(W.cleanError(error)); }
  }
  function showClaim(email) {
    show(card('Crea tu bodega en la nube', `Entraste como ${email}. Serás el administrador y solo las cuentas que agregues podrán entrar.`, `<div id="authError" class="error-box hidden"></div><button type="button" class="primary button" id="claimOwner">Crear mi bodega</button><button type="button" class="link-button auth-link" id="otherAccount">Usar otra cuenta</button>`));
    $('#otherAccount').onclick = switchAccount;
    $('#claimOwner').onclick = async () => {
      const button = $('#claimOwner'); busy(button, true);
      try { await window.api.claimOwner(); await enter(); }
      catch (error) { const box = $('#authError'); box.textContent = W.cleanError(error); box.classList.remove('hidden'); busy(button, false); }
    };
  }
  function showDenied(result) {
    show(card('Sin acceso todavía', result.inactive ? `La cuenta ${result.email} fue desactivada.` : `La cuenta ${result.email} no está autorizada.`, `<p class="auth-note">Pídele al administrador que la agregue en <b>Configuración → Gestionar usuarios</b>.</p><button type="button" class="primary button" id="otherAccount">Usar otra cuenta</button>`));
    $('#otherAccount').onclick = switchAccount;
  }
  async function switchAccount() { try { await window.api.logout(W.token); } catch {} showSignIn(); }

  W.webAuth = status => {
    lastStatus = status || {};
    if (status.demo) W.savedDetail = 'Guardado en este navegador.';
    if (status.member?.active) return enter();
    if (status.user && !status.demo) return status.ownerExists ? showDenied({ email: status.user.email, inactive: Boolean(status.member) }) : showClaim(status.user.email);
    showSignIn();
  };

  W.actions.logout = async () => { try { await window.api.logout(W.token); } catch {} W.token = ''; W.data = null; W.closeModal(); showSignIn(); };
  W.actions.userMenu = () => {
    const admin = W.admin(), web = W.data.web || {};
    W.modal(`<h2 id="modalTitle">${esc(W.data.session.name)}</h2><p class="modal-subtitle">${esc(web.email || '')} · ${admin ? 'Administrador' : 'Operador'}${web.demo ? ' · Modo demostración' : ''}</p><div class="form-actions">${admin ? '<button class="secondary" data-action="staff">Usuarios</button>' : ''}<button class="danger" data-action="logout">Cerrar sesión</button></div>`);
  };

  // Usuarios: cada persona entra con su propio Gmail; el administrador decide quién y con qué rol.
  W.actions.staff = async () => {
    try {
      const users = await window.api.users(W.token);
      W.modal(`<h2 id="modalTitle">Usuarios de WannaShop</h2><p class="modal-subtitle">Cada persona entra con su cuenta de Google. Los operadores no ven costos, compras ni proveedores en pantalla; agrega solo a personas de confianza.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>${users.map(user => `<tr><td><b>${esc(user.name)}</b></td><td>${esc(user.email)}</td><td>${user.role === 'admin' ? 'Administrador' : 'Operador'}</td><td>${user.owner ? '<span class="badge">Dueño</span>' : user.active ? 'Activo' : 'Sin acceso'}</td><td>${user.owner || user.email === W.data.web?.email ? '' : `<button class="link-button" data-action="staffEdit" data-email="${esc(user.email)}" data-name="${esc(user.name)}" data-role="${esc(user.role)}" data-active="${user.active}">Editar</button>`}</td></tr>`).join('')}</tbody></table></div><div class="form-actions"><button class="secondary" data-action="closeModal">Cerrar</button><button class="primary" data-action="staffNew">＋ Agregar persona</button></div>`, { wide: true });
    } catch (error) { W.toast('No se pudieron cargar los usuarios', W.cleanError(error), 'error'); }
  };
  const staffForm = user => W.modal(`<h2 id="modalTitle">${user ? 'Editar acceso' : 'Agregar persona'}</h2><p class="modal-subtitle">${user ? 'Cambia el rol o quita el acceso.' : 'Escribe el Gmail con el que esa persona entrará.'}</p><form id="staffForm"><div class="form-grid"><label class="field">Correo de Google<input name="email" type="email" required ${user ? 'readonly' : ''} value="${esc(user?.email || '')}" placeholder="nombre@gmail.com"></label><label class="field">Nombre<input name="name" required value="${esc(user?.name || '')}"></label><label class="field">Rol<select name="role"><option value="operator" ${user?.role !== 'admin' ? 'selected' : ''}>Operador</option><option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Administrador</option></select></label><label class="check-row"><input type="checkbox" name="active" ${user?.active === 'false' ? '' : 'checked'}> Puede entrar</label></div><div class="form-actions"><button type="button" class="secondary" data-action="staff">Volver</button><button class="primary">${user ? 'Guardar' : 'Dar acceso'}</button></div></form>`, { onOpen: () => {
    $('#staffForm').onsubmit = async event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      try { await window.api.saveUser(W.token, { ...values, active: values.active === 'on' }); W.toast(user ? 'Acceso actualizado' : 'Persona agregada', user ? '' : `Ya puede entrar con ${values.email}.`); W.actions.staff(); }
      catch (error) { W.toast('No se pudo guardar', W.cleanError(error), 'error'); }
    };
  } });
  W.actions.staffNew = () => staffForm();
  W.actions.staffEdit = (_, data) => staffForm(data);

  // Configuración: la protección de datos es la nube, no carpetas del equipo.
  const cloudPanel = () => { const demo = W.data.web?.demo; return `<div class="panel-head"><div><h2>Datos en la nube</h2><p>${demo ? 'Modo demostración' : 'Cada cambio se guarda en línea al instante'}</p></div></div><div class="panel-body protection-summary"><div class="protection-row"><span class="status-orb ${demo ? 'warn' : ''}"></span><span><b>${demo ? 'Solo en este navegador' : 'Guardado en Google Cloud'}</b><small>${demo ? 'Conecta Firebase para usarla en varios equipos' : 'Entra desde cualquier equipo o celular'}</small></span></div><div class="protection-row"><span class="status-orb ${demo ? 'warn' : ''}"></span><span><b>Fotos en la nube</b><small>${demo ? 'Guardadas en este navegador' : 'Se ven en todos los equipos'}</small></span></div><div class="protection-row"><span class="status-orb ${demo ? 'warn' : ''}"></span><span><b>Copias diarias</b><small>${demo ? 'Solo en la nube' : 'Se guardan solas, 30 días'}</small></span></div><div class="settings-actions">${demo ? '' : '<button class="secondary" data-action="cloudBackups">Ver copias diarias</button>'}<button class="secondary" data-action="backupNow">Descargar una copia</button></div></div>`; };
  const baseSettings = W.routes.settings;
  W.routes.settings = () => {
    baseSettings();
    if (!W.admin()) return;
    const panels = W.$$('.settings-layout > aside .panel');
    if (panels[0]) panels[0].innerHTML = cloudPanel();
    $('[data-action="renewRecovery"]')?.remove();
    const restore = $('[data-action="restoreBackup"]'); if (restore) restore.textContent = 'Importar respaldo (también de la app de escritorio)';
    const backup = $('.settings-layout aside [data-action="backupNow"]:not(.protection-summary *)'); if (backup) backup.textContent = 'Descargar respaldo';
    $('input[name="aiKey"]')?.closest('.form-grid')?.insertAdjacentHTML('afterend', '<p class="field-hint">En la web, la clave se guarda solo en este navegador: en cada equipo se escribe una vez.</p>');
  };
  // Copias diarias automáticas en la nube (las últimas 30).
  W.actions.cloudBackups = async () => {
    try {
      const list = await window.api.cloudBackups(W.token);
      W.modal(`<h2 id="modalTitle">Copias diarias en la nube</h2><p class="modal-subtitle">Cada día, el primer guardado deja una copia completa del día anterior. Se conservan las últimas 30. Restaurar reemplaza los datos actuales por los de esa copia (queda registrado).</p>${list.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Copia del</th><th>Modelos</th><th>Revisión</th><th></th></tr></thead><tbody>${list.map(item => `<tr><td><b>${esc(item.day)}</b></td><td>${item.products}</td><td>#${item.revision}</td><td><button class="secondary" data-action="restoreCloudBackup" data-day="${esc(item.day)}">Restaurar</button></td></tr>`).join('')}</tbody></table></div>` : W.empty('☁', 'Todavía no hay copias', 'La primera se crea mañana, con el primer movimiento del día.')}<div class="form-actions"><button class="secondary" data-action="closeModal">Cerrar</button><button class="primary" data-action="backupNow">Descargar copia ahora</button></div>`, { wide: true });
    } catch (error) { W.toast('No se pudieron ver las copias', W.cleanError(error), 'error'); }
  };
  W.actions.restoreCloudBackup = async (_, data) => {
    const ok = await W.confirm({ title: `Restaurar la copia del ${data.day}`, message: 'Los datos actuales se reemplazarán por los de esa copia en todos los equipos. Antes, descarga una copia de hoy por si acaso.', confirmText: 'Restaurar', danger: true });
    if (!ok) return;
    try { const result = await window.api.restoreCloudBackup(W.token, data.day); W.data = result.data; W.closeModal(); W.render('dashboard'); W.toast('Copia restaurada', `Los datos quedaron como el ${data.day}.`); }
    catch (error) { W.toast('No se pudo restaurar', W.cleanError(error), 'error'); }
  };
  W.actions.openProtection = () => W.modal(`<h2 id="modalTitle">Datos en la nube</h2><p class="modal-subtitle">${W.data.web?.demo ? 'En el modo demostración todo queda en este navegador.' : 'Cada cambio se guarda en Google Cloud y se ve al instante en los demás equipos. Puedes descargar una copia completa cuando quieras.'}</p><div class="form-actions"><button class="secondary" data-action="closeModal">Cerrar</button>${!W.data.web?.demo && W.admin() ? '<button class="secondary" data-action="cloudBackups">Copias diarias</button>' : ''}<button class="primary" data-action="backupNow">Descargar copia</button></div>`);
  W.actions.chooseBackupFolder = W.actions.openProtection;

  // Avisos fijos arriba: sin internet y versión nueva disponible.
  document.body.insertAdjacentHTML('beforeend', '<div id="netBanner" class="web-banner warn hidden" role="status">Sin internet · puedes consultar, pero para guardar necesitas conexión.</div><div id="updateBanner" class="web-banner hidden" role="status"><span>Hay una versión nueva de WannaShop.</span><button type="button" id="updateNow">Actualizar</button></div>');
  const syncNet = () => $('#netBanner').classList.toggle('hidden', navigator.onLine !== false);
  window.addEventListener('online', () => { syncNet(); if (W.data) W.toast('Conexión recuperada', 'Ya puedes guardar de nuevo.'); });
  window.addEventListener('offline', syncNet);
  syncNet();
  const build = document.querySelector('meta[name="ws-build"]')?.content;
  async function checkUpdate() {
    if (!build || document.visibilityState === 'hidden') return;
    try { const latest = await (await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' })).json(); if (latest.build && latest.build !== build) $('#updateBanner').classList.remove('hidden'); } catch {}
  }
  $('#updateNow').onclick = () => location.reload();
  document.addEventListener('visibilitychange', checkUpdate);
  setInterval(checkUpdate, 10 * 60 * 1000);
  W.savedDetail = 'Guardado en la nube.';

  // Ningún error queda en silencio: se muestra en lenguaje claro.
  const report = error => { const message = W.cleanError(error); if (!message || /ResizeObserver|Script error/i.test(message)) return; W.toast('Algo no salió bien', message, 'error'); };
  window.addEventListener('unhandledrejection', event => report(event.reason));
  window.addEventListener('error', event => { if (event.error) report(event.error); });

  // Cambios hechos desde otro equipo: se recargan sin interrumpir lo que se está escribiendo.
  window.addEventListener('ws-remote-change', async () => {
    if (!W.data || W.commandBusy) return;
    try {
      await W.reload();
      const typing = document.activeElement?.matches?.('input,textarea,select'), modalOpen = !$('#modal').classList.contains('hidden');
      if (!typing && !modalOpen) W.render(W.view);
      W.toast('Datos actualizados', 'Otro equipo hizo un cambio.');
    } catch {}
  });
})();
