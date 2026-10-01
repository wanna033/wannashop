// Ajustes de la interfaz para la versión web: bienvenida, entrar con Google, negocios, equipo y nube.
(() => {
  const W = window.WS, $ = W.$, esc = W.esc;
  const googleMark = '<svg class="google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.4 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
  const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
  let lastStatus = {};

  const legal = '<p class="auth-legal">Al entrar aceptas los <a href="terminos.html" target="_blank" rel="noopener">Términos de uso</a> y la <a href="privacidad.html" target="_blank" rel="noopener">Política de privacidad</a>.</p>';
  const card = (title, subtitle, body, wide = false) => `<div class="auth-card ${wide ? 'auth-wide' : ''}"><div class="auth-brand"><img src="assets/wannashop-logo.png" alt="Logo WannaShop"><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${body}</div>`;
  const show = html => { $('#shell').classList.add('hidden'); $('#authRoot').classList.remove('hidden'); $('#authRoot').innerHTML = html; W.hideBoot(); };
  const busy = (button, on) => { if (!button) return; button.disabled = on; button.classList.toggle('loading', on); };
  const fail = (message) => { const box = $('#authError'); if (!box) return; box.textContent = message; box.classList.toggle('hidden', !message); };

  // Bienvenida: qué es, entrar con Google o probar sin cuenta.
  function showWelcome(message = '') {
    const cloud = lastStatus.cloudAvailable !== false;
    show(card('WannaShop', 'Inventario, ventas y despachos para tiendas y bodegas de calzado', `
      <ul class="welcome-points">
        <li><b>Cada modelo con todas sus tallas</b> y su código de barras.</li>
        <li><b>Ventas, despachos a locales y cierre del día</b> con factura en PDF.</li>
        <li><b>Cobros, caja y gastos</b> claros, desde el celular o el computador.</li>
        <li><b>Tu equipo trabajando a la vez</b>, con fotos y copias diarias en la nube.</li>
        <li><b>Catálogo para tus clientes</b>, reportes de ventas e importación desde Excel.</li>
      </ul>
      <div id="authError" class="error-box ${message ? '' : 'hidden'}">${esc(message)}</div>
      ${cloud ? `<button type="button" class="primary button google-button" id="googleSignIn">${googleMark}<span>Entrar con Google</span></button>` : ''}
      ${cloud ? '' : '<button type="button" class="secondary button demo-button" id="startDemo">Probar sin cuenta (demostración)</button>'}
      ${legal}`));
    $('#googleSignIn')?.addEventListener('click', signIn);
    $('#startDemo')?.addEventListener('click', startDemo);
  }
  async function signIn() {
    const button = $('#googleSignIn'); busy(button, true);
    try { route(await window.api.googleLogin()); }
    catch (error) { showWelcome(/popup-closed|cancelled-popup/i.test(String(error?.code || error?.message)) ? '' : W.cleanError(error)); }
  }
  async function startDemo() {
    const button = $('#startDemo'); busy(button, true);
    try { await window.api.startDemo(); lastStatus.demo = true; W.savedDetail = 'Guardado en este navegador.'; await enter(); }
    catch (error) { busy(button, false); fail(W.cleanError(error)); }
  }
  function route(result) {
    if (result?.ok) return enter();
    if (result?.choose) return showChooser(result.choose, result.email);
    if (result?.create) return showCreate(result.email, result.name);
  }
  async function enter() {
    W.token = 'web';
    try { await W.enterShell(); }
    catch (error) { showWelcome(W.cleanError(error)); }
  }

  // Primer ingreso: crear el negocio en un solo paso.
  function showCreate(email, name = '', canCancel = false) {
    show(card('Crea tu negocio', `Entraste como ${email}. Serás el administrador y decides quién más entra.`, `
      <form id="createForm">
        <label class="field">Nombre del negocio<input name="name" required minlength="2" maxlength="80" placeholder="Ej. Calzado La Estrella" autocomplete="organization"></label>
        <div class="form-grid"><label class="field">Teléfono (opcional)<input name="phone" inputmode="tel" placeholder="300 000 0000"></label><label class="field">NIT (opcional)<input name="nit"></label></div>
        <div id="authError" class="error-box hidden"></div>
        <button class="primary button" id="createBusiness">Crear mi negocio</button>
      </form>
      <p class="auth-note">¿Te invitaron a un negocio? Pide que agreguen <b>${esc(email)}</b> y vuelve a entrar.</p>
      <button type="button" class="link-button auth-link" id="${canCancel ? 'backToChooser' : 'otherAccount'}">${canCancel ? 'Volver' : 'Usar otra cuenta'}</button>`));
    $('#createForm input[name="name"]').focus();
    $('#otherAccount')?.addEventListener('click', switchAccount);
    $('#backToChooser')?.addEventListener('click', async () => showChooser(await window.api.listBusinesses(), email));
    $('#createForm').onsubmit = async event => {
      event.preventDefault();
      const button = $('#createBusiness'); busy(button, true); fail('');
      try { await window.api.createBusiness(W.token, Object.fromEntries(new FormData(event.currentTarget))); W.ui.welcomeNew = true; await enter(); }
      catch (error) { busy(button, false); fail(W.cleanError(error)); }
    };
  }
  // Varios negocios: elegir con cuál trabajar.
  function showChooser(businesses, email) {
    show(card('Elige un negocio', `Entraste como ${email}.`, `
      <div class="business-pick">${businesses.map(item => `<button type="button" class="business-choice" data-business="${esc(item.id)}"><b>${esc(item.name)}</b><small>${item.role === 'admin' ? 'Administrador' : 'Operador'}</small><span>›</span></button>`).join('')}</div>
      <div id="authError" class="error-box hidden"></div>
      <button type="button" class="secondary button" id="newBusiness">＋ Crear otro negocio</button>
      <button type="button" class="link-button auth-link" id="otherAccount">Usar otra cuenta</button>`));
    W.$$('[data-business]').forEach(button => { button.onclick = async () => { busy(button, true); try { await window.api.selectBusiness(W.token, button.dataset.business); await enter(); } catch (error) { busy(button, false); fail(W.cleanError(error)); } }; });
    $('#newBusiness').onclick = () => showCreate(email, '', true);
    $('#otherAccount').onclick = switchAccount;
  }
  async function switchAccount() { try { await window.api.logout(W.token); } catch {} lastStatus.demo = false; showWelcome(); }

  W.webAuth = status => {
    lastStatus = status || {};
    W.savedDetail = status.demo ? 'Guardado en este navegador.' : 'Guardado en la nube.';
    if (status.ok) return enter();
    if (status.choose) return showChooser(status.choose, status.email);
    if (status.create) return showCreate(status.email, status.name);
    showWelcome();
  };

  W.actions.logout = async () => { try { await window.api.logout(W.token); } catch {} W.token = ''; W.data = null; W.closeModal(); lastStatus.demo = false; showWelcome(); };
  W.actions.switchBusiness = async () => {
    try { const email = W.data?.web?.email || '', businesses = await window.api.listBusinesses(); W.closeModal(); W.data = null; showChooser(businesses, email); }
    catch (error) { W.toast('No se pudieron cargar tus negocios', W.cleanError(error), 'error'); }
  };
  W.actions.createRealBusiness = async () => { W.closeModal(); try { await window.api.logout(W.token); } catch {} W.data = null; lastStatus = { cloudAvailable: true }; showWelcome(); setTimeout(() => $('#googleSignIn')?.click(), 50); };
  W.actions.userMenu = () => {
    const admin = W.admin(), web = W.data.web || {};
    W.modal(`<h2 id="modalTitle">${esc(W.data.session.name)}</h2><p class="modal-subtitle">${esc(web.email || '')} · ${admin ? 'Administrador' : 'Operador'}${web.business ? ` · ${esc(web.business.name)}` : ''}</p><div class="form-actions">${web.demo ? (web.cloudAvailable ? '<button class="primary" data-action="createRealBusiness">Crear mi negocio real</button>' : '') : '<button class="secondary" data-action="switchBusiness">Cambiar de negocio</button>'}${admin && !web.demo ? '<button class="secondary" data-action="staff">Equipo</button>' : ''}<button class="secondary" data-action="quickGuide">Guía rápida</button><button class="danger" data-action="logout">${web.demo ? 'Salir de la demostración' : 'Cerrar sesión'}</button></div>`);
  };

  // El negocio abierto se ve junto al nombre de la persona.
  const baseSync = W.syncChrome;
  W.syncChrome = () => { baseSync(); const business = W.data?.web?.business, role = $('#userRole'); if (business && role && !role.textContent.includes(business.name)) role.textContent = `${role.textContent} · ${business.name}`; };

  // Equipo: cada persona entra con su propio Gmail; el administrador decide quién y con qué rol.
  W.actions.staff = async () => {
    if (W.data.web?.demo) return W.toast('En la demostración no hay equipo', 'Crea tu negocio real para invitar personas.', 'warning');
    try {
      const users = await window.api.users(W.token);
      W.modal(`<h2 id="modalTitle">Equipo de ${esc(W.data.web?.business?.name || 'tu negocio')}</h2><p class="modal-subtitle">Cada persona entra con su cuenta de Google. Los operadores venden, despachan y cobran, pero no ven costos, compras ni proveedores en pantalla. Agrega solo a personas de confianza.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>${users.map(user => `<tr><td><b>${esc(user.name)}</b></td><td>${esc(user.email)}</td><td>${user.role === 'admin' ? 'Administrador' : 'Operador'}</td><td>${user.owner ? '<span class="badge">Dueño</span>' : user.active ? 'Activo' : 'Sin acceso'}</td><td>${user.owner || user.email === W.data.web?.email ? '' : `<button class="link-button" data-action="staffEdit" data-email="${esc(user.email)}" data-name="${esc(user.name)}" data-role="${esc(user.role)}" data-active="${user.active}">Editar</button>`}</td></tr>`).join('')}</tbody></table></div><div class="form-actions"><button class="secondary" data-action="closeModal">Cerrar</button><button class="primary" data-action="staffNew">＋ Invitar persona</button></div>`, { wide: true });
    } catch (error) { W.toast('No se pudo cargar el equipo', W.cleanError(error), 'error'); }
  };
  const inviteText = name => `Hola${name ? ` ${name}` : ''}, te agregué a ${W.data.web?.business?.name || 'mi negocio'} en WannaShop. Entra aquí con tu cuenta de Google: ${appUrl()}`;
  W.actions.shareInvite = (_, data) => window.api.openLink(W.token, `https://wa.me/?text=${encodeURIComponent(inviteText(data.name))}`).catch(error => W.toast('No se pudo abrir WhatsApp', W.cleanError(error), 'error'));
  const staffForm = user => W.modal(`<h2 id="modalTitle">${user ? 'Editar acceso' : 'Invitar persona'}</h2><p class="modal-subtitle">${user ? 'Cambia el rol o quita el acceso.' : 'Escribe el Gmail con el que esa persona entrará. Luego le envías el enlace por WhatsApp.'}</p><form id="staffForm"><div class="form-grid"><label class="field">Correo de Google<input name="email" type="email" required ${user ? 'readonly' : ''} value="${esc(user?.email || '')}" placeholder="nombre@gmail.com" autocomplete="off"></label><label class="field">Nombre<input name="name" required value="${esc(user?.name || '')}"></label><label class="field">Rol<select name="role"><option value="operator" ${user?.role !== 'admin' ? 'selected' : ''}>Operador (vende, despacha y cobra)</option><option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Administrador (todo, incluidos costos)</option></select></label><label class="check-row"><input type="checkbox" name="active" ${user?.active === 'false' ? '' : 'checked'}> Puede entrar</label></div><div class="form-actions"><button type="button" class="secondary" data-action="staff">Volver</button><button class="primary">${user ? 'Guardar' : 'Dar acceso'}</button></div></form>`, { onOpen: () => {
    $('#staffForm').onsubmit = async event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      try {
        await window.api.saveUser(W.token, { ...values, active: values.active === 'on' });
        if (user) { W.toast('Acceso actualizado'); return W.actions.staff(); }
        W.modal(`<h2 id="modalTitle">Listo: ${esc(values.name)} ya tiene acceso</h2><p class="modal-subtitle">Envíale el enlace. Debe entrar con <b>${esc(values.email)}</b>.</p><div class="invite-box">${esc(appUrl())}</div><div class="form-actions"><button class="secondary" data-action="copyText" data-text="${esc(inviteText(values.name))}">Copiar invitación</button><button class="primary" data-action="shareInvite" data-name="${esc(values.name)}">Enviar por WhatsApp</button></div><div class="form-actions"><button class="secondary" data-action="staff">Volver al equipo</button></div>`);
      } catch (error) { W.toast('No se pudo guardar', W.cleanError(error), 'error'); }
    };
  } });
  W.actions.staffNew = () => staffForm();
  W.actions.staffEdit = (_, data) => staffForm(data);

  // Guía rápida y primeros pasos para quien empieza.
  W.actions.quickGuide = () => W.modal(`<h2 id="modalTitle">Guía rápida</h2><p class="modal-subtitle">Lo esencial en 5 pasos.</p><ol class="guide-list">
    <li><b>Crea tus modelos</b> en Inventario → <i>Nuevo modelo</i>: un zapato con todas sus tallas y cuántos pares hay de cada una. Con <i>Registrar con foto</i> la IA lo llena por ti.</li>
    <li><b>Vende</b> en <i>Vender</i>: toca la talla (o escanea su código con 📷) y luego <i>Continuar y facturar</i>.</li>
    <li><b>Despacha a tus locales</b> en Negocios asociados → <i>Despachar</i>: toca cada talla que envías.</li>
    <li><b>Cierra el día</b> de cada local: escribe lo vendido; lo demás vuelve a bodega o se queda allá.</li>
    <li><b>Cobra y cuadra</b> en Cobros y saldos y en Caja del día.</li></ol>
    <p class="modal-subtitle">Consejo: invita a tu equipo desde tu nombre (abajo a la izquierda, o en <i>Más</i> en el celular) → <i>Equipo</i>.</p>
    <div class="form-actions"><button class="primary" data-action="closeModal">Entendido</button></div>`);
  function onboarding() {
    const data = W.data; if (!data || data.web?.demo) return '';
    let hidden = false; try { hidden = localStorage.getItem(`wannashop.onboarding.${data.web?.business?.id}`) === 'done'; } catch {}
    if (hidden || !W.admin()) return '';
    const steps = [
      ['Pon los datos de tu negocio', Boolean(data.settings?.storeName && (data.settings.phone || data.settings.nit || data.settings.address)), 'settings', ''],
      ['Crea tu primer modelo con sus tallas', (data.products || []).length > 0, '', 'newProduct'],
      ['Haz tu primera venta', (data.sales || []).length > 0, 'sale', ''],
      ['Agrega un negocio asociado (si despachas)', (data.locales || []).length > 0, 'businesses', ''],
      ['Invita a tu equipo', false, '', 'staff']
    ];
    const done = steps.filter(step => step[1]).length;
    return `<section class="panel onboarding"><div class="panel-head"><div><h2>Primeros pasos · ${done} de ${steps.length}</h2><p>Completa esto y tu negocio queda listo.</p></div><button class="ghost" data-action="hideOnboarding">Ocultar</button></div><div class="panel-body onboarding-steps">${steps.map(([label, ok, view, action]) => `<button type="button" class="onboarding-step ${ok ? 'done' : ''}" ${view ? `data-view="${view}"` : `data-action="${action}"`}><i>${ok ? '✓' : '○'}</i><span>${esc(label)}</span><b>›</b></button>`).join('')}</div></section>`;
  }
  W.actions.hideOnboarding = () => { try { localStorage.setItem(`wannashop.onboarding.${W.data.web?.business?.id}`, 'done'); } catch {} W.render('dashboard'); };
  const baseDashboard = W.routes.dashboard;
  W.routes.dashboard = () => {
    baseDashboard();
    const app = $('#app');
    if (W.data.web?.demo) app.insertAdjacentHTML('afterbegin', `<div class="demo-strip"><span><b>Estás en la demostración.</b> Los datos son de ejemplo y quedan solo en este navegador.</span>${W.data.web.cloudAvailable ? '<button class="primary" data-action="createRealBusiness">Crear mi negocio gratis</button>' : ''}</div>`);
    else app.insertAdjacentHTML('afterbegin', onboarding());
    if (W.ui.welcomeNew) { W.ui.welcomeNew = false; W.actions.quickGuide(); }
  };

  // Configuración: la protección de datos es la nube, no carpetas del equipo.
  const cloudPanel = () => { const demo = W.data.web?.demo; return `<div class="panel-head"><div><h2>Datos en la nube</h2><p>${demo ? 'Modo demostración' : 'Cada cambio se guarda en línea al instante'}</p></div></div><div class="panel-body protection-summary"><div class="protection-row"><span class="status-orb ${demo ? 'warn' : ''}"></span><span><b>${demo ? 'Solo en este navegador' : 'Guardado en Google Cloud'}</b><small>${demo ? 'Crea tu negocio real para usarla en varios equipos' : 'Entra desde cualquier equipo o celular'}</small></span></div><div class="protection-row"><span class="status-orb ${demo ? 'warn' : ''}"></span><span><b>Fotos en la nube</b><small>${demo ? 'Guardadas en este navegador' : 'Se ven en todos los equipos'}</small></span></div><div class="protection-row"><span class="status-orb ${demo ? 'warn' : ''}"></span><span><b>Copias diarias</b><small>${demo ? 'Solo en la nube' : 'Se guardan solas, 30 días'}</small></span></div><div class="settings-actions">${demo ? '' : '<button class="secondary" data-action="cloudBackups">Ver copias diarias</button>'}<button class="secondary" data-action="backupNow">Descargar una copia</button></div></div>`; };
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
