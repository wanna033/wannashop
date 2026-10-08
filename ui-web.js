// Ajustes de la interfaz para la versión web: bienvenida, entrar con Google, negocios, equipo y nube.
(() => {
  const W = window.WS, $ = W.$, esc = W.esc;
  const googleMark = '<svg class="google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.4 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
  const appleMark = '<svg class="apple-mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 4.9c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.1.1 2.3-.6 3-1.5z"/></svg>';
  const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
  let lastStatus = {};

  const legal = '<p class="auth-legal">Al entrar aceptas los <a href="terminos.html" target="_blank" rel="noopener">Términos de uso</a> y la <a href="privacidad.html" target="_blank" rel="noopener">Política de privacidad</a>.</p>';
  const card = (title, subtitle, body, wide = false) => `<div class="auth-card ${wide ? 'auth-wide' : ''}"><div class="auth-brand"><img src="assets/wannashop-logo.png" alt="Logo WannaShop"><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${body}</div>`;
  // Pantalla de entrada: el banner de WannaShop y al lado (abajo en el celular) la tarjeta.
  const show = html => {
    $('#shell').classList.add('hidden');
    const root = $('#authRoot'); root.classList.remove('hidden'); root.classList.add('auth-split');
    root.innerHTML = `<div class="auth-hero"><img src="assets/login-banner.webp" alt="WannaShop, sistema de inventario: gestiona tu inventario de forma fácil, rápida y organizada"></div><div class="auth-side">${html}</div>`;
    W.hideBoot();
  };
  const busy = (button, on) => { if (!button) return; button.disabled = on; button.classList.toggle('loading', on); };
  const fail = (message) => { const box = $('#authError'); if (!box) return; box.textContent = message; box.classList.toggle('hidden', !message); };

  // Bienvenida: qué es, entrar con Google o probar sin cuenta.
  function showWelcome(message = '', retryable = false) {
    const cloud = lastStatus.cloudAvailable !== false;
    show(card('Bienvenido', 'Sistema de inventario para tu negocio', `
      <p class="auth-lead">Inventario por tallas, ventas, despachos, cobros y reportes, desde el celular o el computador.</p>
      <div id="authError" class="error-box ${message ? '' : 'hidden'}">${esc(message)}</div>
      ${retryable ? '<button type="button" class="secondary button" id="retryStartup">Volver a cargar WannaShop</button>' : ''}
      ${cloud ? `<button type="button" class="primary button google-button" id="googleSignIn">${googleMark}<span>Entrar con Google</span></button>` : ''}
      ${cloud && window.api?.signInOptions?.apple ? `<button type="button" class="button apple-button" id="appleSignIn">${appleMark}<span>Entrar con Apple</span></button>` : ''}
      ${cloud ? '' : '<button type="button" class="secondary button demo-button" id="startDemo">Probar sin cuenta (demostración)</button>'}
      <p class="auth-legal"><a href="ayuda.html" target="_blank" rel="noopener">¿Cómo funciona? Lee la guía paso a paso</a></p>
      <p class="auth-legal"><a href="app/WannaShop-Setup.exe" download>⬇ Descargar la app para Windows (se actualiza sola)</a></p>
      ${legal}`));
    $('#googleSignIn')?.addEventListener('click', () => signIn('google'));
    $('#appleSignIn')?.addEventListener('click', () => signIn('apple'));
    $('#startDemo')?.addEventListener('click', startDemo);
    $('#retryStartup')?.addEventListener('click', () => location.reload());
  }
  W.showWelcome = message => { lastStatus.demo = false; showWelcome(message); };
  async function signIn(method = 'google') {
    const button = $(method === 'apple' ? '#appleSignIn' : '#googleSignIn'); busy(button, true);
    W.markActive?.(); W.freshSignIn = true; // entrada nueva: no aplica el cierre por inactividad
    try { route(await (method === 'apple' ? window.api.appleLogin() : window.api.googleLogin())); }
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
    if (status.error) return showWelcome(status.error, status.retryable);
    if (status.ok) return enter();
    if (status.choose) return showChooser(status.choose, status.email);
    if (status.create) return showCreate(status.email, status.name);
    showWelcome();
  };

  // Herramientas web de inventario: búsqueda, categoría, estado, resumen y exportación por modelo.
  W.inventoryTools = true; // la web ya trae sus propios filtros y orden: la pantalla base no repite los suyos
  const baseInventory = W.routes.inventory;
  W.routes.inventory = () => {
    baseInventory();
    const input = $('#inventorySearch'), results = $('#inventoryResults'), toolbar = $('#app .toolbar');
    if (!input || !results || !toolbar) return;
    const filters = [['all', 'Todos'], ['available', 'Con stock'], ['low', 'Por reponer'], ['out', 'Agotados']];
    const allowedFilters = filters.map(([key]) => key), allowedSorts = ['model', 'stock-desc', 'stock-asc'];
    let selectedFilter = allowedFilters.includes(W.ui.inventoryWebFilter) ? W.ui.inventoryWebFilter : 'all';
    let selectedSort = allowedSorts.includes(W.ui.inventoryWebSort) ? W.ui.inventoryWebSort : 'model';
    const categories = [...new Set(W.groups().map(group => String(group.category || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    let selectedCategory = categories.includes(W.ui.inventoryWebCategory) ? W.ui.inventoryWebCategory : 'all';
    const controls = document.createElement('section');
    controls.className = 'inventory-suite';
    controls.innerHTML = `<div class="inventory-summary" aria-label="Resumen de existencias">
      <article class="inventory-metric"><small>MODELOS</small><strong data-inventory-metric="models">0</strong><span>en esta selección</span></article>
      <article class="inventory-metric"><small>PARES EN BODEGA</small><strong data-inventory-metric="pairs">0</strong><span>disponibles ahora</span></article>
      <article class="inventory-metric warn"><small>TALLAS POR REPONER</small><strong data-inventory-metric="low">0</strong><span>con ${W.lowLimit()} par(es) o menos</span></article>
      <article class="inventory-metric danger"><small>TALLAS AGOTADAS</small><strong data-inventory-metric="out">0</strong><span>sin existencias</span></article>
      ${W.admin() ? '<article class="inventory-metric private"><small>CAPITAL EN BODEGA</small><strong data-inventory-metric="capital">$0</strong><span>estimado a costo</span></article>' : ''}
    </div>
    <div class="inventory-controls">
      <div class="inventory-filter-list" role="group" aria-label="Filtrar modelos por existencias">${filters.map(([key, label]) => `<button type="button" class="inventory-filter-button" data-inventory-filter="${key}" aria-pressed="false"><span>${label}</span><b class="inventory-filter-count">0</b></button>`).join('')}</div>
      <div class="inventory-tools">
        <label class="inventory-tool-field"><span>Categoría</span><select aria-label="Filtrar por categoría" data-inventory-category><option value="all">Todas</option>${categories.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join('')}</select></label>
        <label class="inventory-tool-field"><span>Ordenar</span><select aria-label="Ordenar modelos" data-inventory-sort><option value="model">Modelo A–Z</option><option value="stock-desc">Mayor existencia</option><option value="stock-asc">Menor existencia</option></select></label>
        <button type="button" class="secondary inventory-export" data-export-inventory>⇩ Descargar Excel</button>
      </div>
      <p class="inventory-results-summary" aria-live="polite"></p>
    </div>`;
    toolbar.insertAdjacentElement('afterend', controls);
    const sortSelect = controls.querySelector('[data-inventory-sort]');
    const categorySelect = controls.querySelector('[data-inventory-category]');
    const exportButton = controls.querySelector('[data-export-inventory]');
    sortSelect.value = selectedSort;
    categorySelect.value = selectedCategory;
    const stock = group => group.sizes.reduce((sum, size) => sum + Number(size.stock || 0), 0);
    const low = group => stock(group) > 0 && group.sizes.some(size => Number(size.stock || 0) <= W.lowLimit());
    const matchesFilter = group => selectedFilter === 'available' ? stock(group) > 0 : selectedFilter === 'low' ? low(group) : selectedFilter === 'out' ? stock(group) <= 0 : true;
    const matchingGroups = () => {
      const query = String(input.value || '').toLowerCase();
      return W.groups().filter(group => (selectedCategory === 'all' || String(group.category || '').trim() === selectedCategory) && `${group.name} ${group.brand} ${group.color} ${group.category} ${group.sizes.map(size => `${size.sku} ${size.size}`).join(' ')}`.toLowerCase().includes(query));
    };
    let visibleGroups = [];
    const refresh = () => {
      const groups = matchingGroups(), byId = new Map(groups.map(group => [String(group.pid), group]));
      const allCards = [...results.querySelectorAll('.product-card')];
      const cards = allCards.map(card => ({ card, group: byId.get(String(card.dataset.id)) })).filter(entry => entry.group);
      const nameOrder = (a, b) => String(a.group.name || '').localeCompare(String(b.group.name || ''), 'es', { numeric: true, sensitivity: 'base' });
      cards.sort((a, b) => selectedSort === 'stock-desc' ? stock(b.group) - stock(a.group) || nameOrder(a, b) : selectedSort === 'stock-asc' ? stock(a.group) - stock(b.group) || nameOrder(a, b) : nameOrder(a, b));
      const grid = results.querySelector('.product-grid');
      if (grid) cards.forEach(({ card }) => grid.append(card));
      const visible = cards.filter(({ group }) => matchesFilter(group));
      visibleGroups = visible.map(({ group }) => group);
      allCards.forEach(card => { const group = byId.get(String(card.dataset.id)); card.classList.toggle('inventory-filtered-out', !group || !matchesFilter(group)); });
      const counts = { all: groups.length, available: groups.filter(group => stock(group) > 0).length, low: groups.filter(low).length, out: groups.filter(group => stock(group) <= 0).length };
      for (const button of controls.querySelectorAll('[data-inventory-filter]')) {
        const key = button.dataset.inventoryFilter, label = filters.find(item => item[0] === key)?.[1] || 'Modelos';
        button.setAttribute('aria-pressed', String(selectedFilter === key));
        button.setAttribute('aria-label', `${label}: ${counts[key]} modelos`);
        button.querySelector('.inventory-filter-count').textContent = counts[key].toLocaleString('es-CO');
      }
      controls.querySelector('.inventory-results-summary').textContent = `${visible.length.toLocaleString('es-CO')} de ${groups.length.toLocaleString('es-CO')} modelos`;
      const units = groups.reduce((sum, group) => sum + stock(group), 0);
      const lowSizes = groups.reduce((sum, group) => sum + group.sizes.filter(size => Number(size.stock || 0) > 0 && Number(size.stock || 0) <= W.lowLimit()).length, 0);
      const outSizes = groups.reduce((sum, group) => sum + group.sizes.filter(size => Number(size.stock || 0) <= 0).length, 0);
      controls.querySelector('[data-inventory-metric="models"]').textContent = groups.length.toLocaleString('es-CO');
      controls.querySelector('[data-inventory-metric="pairs"]').textContent = units.toLocaleString('es-CO');
      controls.querySelector('[data-inventory-metric="low"]').textContent = lowSizes.toLocaleString('es-CO');
      controls.querySelector('[data-inventory-metric="out"]').textContent = outSizes.toLocaleString('es-CO');
      const capital = controls.querySelector('[data-inventory-metric="capital"]');
      if (capital) capital.textContent = W.money(groups.reduce((sum, group) => sum + group.sizes.reduce((sizeSum, size) => sizeSum + Number(size.stock || 0) * Number(group.cost || 0), 0), 0));
      exportButton.disabled = !visible.length;
      let empty = results.querySelector('.inventory-filter-empty');
      if (allCards.length && !visible.length) {
        if (!empty) {
          empty = document.createElement('div');
          empty.className = 'inventory-filter-empty';
          empty.innerHTML = `<span>No hay modelos ${selectedFilter === 'out' ? 'agotados' : selectedFilter === 'low' ? 'por reponer' : 'con existencias'} con estos criterios.</span><button type="button" class="secondary" data-clear-inventory-filter>Quitar filtros</button>`;
          results.append(empty);
          empty.querySelector('[data-clear-inventory-filter]').addEventListener('click', () => { selectedFilter = 'all'; selectedCategory = 'all'; W.ui.inventoryWebFilter = selectedFilter; W.ui.inventoryWebCategory = selectedCategory; categorySelect.value = selectedCategory; refresh(); });
        } else empty.querySelector('span').textContent = `No hay modelos ${selectedFilter === 'out' ? 'agotados' : selectedFilter === 'low' ? 'por reponer' : 'con existencias'} con estos criterios.`;
      } else empty?.remove();
    };
    for (const button of controls.querySelectorAll('[data-inventory-filter]')) button.addEventListener('click', () => { selectedFilter = button.dataset.inventoryFilter; W.ui.inventoryWebFilter = selectedFilter; refresh(); });
    sortSelect.addEventListener('change', () => { selectedSort = sortSelect.value; W.ui.inventoryWebSort = selectedSort; refresh(); });
    categorySelect.addEventListener('change', () => { selectedCategory = categorySelect.value; W.ui.inventoryWebCategory = selectedCategory; refresh(); });
    exportButton.addEventListener('click', async () => {
      if (!visibleGroups.length) return;
      exportButton.disabled = true;
      try {
        const admin = W.admin();
        const columns = [['Modelo', 'model', 28], ['Marca', 'brand', 18], ['Color', 'color', 16], ['Categoría', 'category', 18], ['Talla', 'size', 10], ['Código', 'sku', 22], ['Stock actual', 'stock', 14], ['Estado', 'status', 16], ['Precio de venta', 'price', 18, 'money'], ...(admin ? [['Costo unitario', 'cost', 18, 'money'], ['Valor en bodega', 'value', 20, 'money']] : []), ['Pares por pedir', 'reorder', 16]];
        const rows = visibleGroups.flatMap(group => group.sizes.map(size => {
          const quantity = Number(size.stock || 0);
          return { model: group.name, brand: group.brand || '', color: group.color || '', category: group.category || '', size: size.size, sku: size.sku, stock: quantity, status: quantity <= 0 ? 'Agotado' : quantity <= W.lowLimit() ? 'Por reponer' : 'Disponible', price: Number(group.price || 0), ...(admin ? { cost: Number(group.cost || 0), value: quantity * Number(group.cost || 0) } : {}), reorder: quantity <= W.lowLimit() ? Math.max(0, W.targetStock() - quantity) : 0 };
        }));
        const date = W.today();
        const result = await window.api.exportRows(W.token, { name: `WannaShop-inventario-${date}.xlsx`, sheet: 'Inventario', columns, rows });
        if (result?.ok) W.toast('Inventario descargado', `${rows.length} talla(s) · ${result.path || 'Excel listo'}`);
      } catch (error) { W.toast('No se pudo exportar', W.cleanError(error), 'error'); }
      finally { exportButton.disabled = !visibleGroups.length; }
    });
    const baseSearch = input.oninput;
    input.oninput = event => { baseSearch?.call(input, event); refresh(); };
    refresh();
  };

  W.actions.logout = async () => { try { await window.api.logout(W.token); } catch {} W.token = ''; W.data = null; W.closeModal(); lastStatus.demo = false; showWelcome(); };
  W.actions.switchBusiness = async () => {
    try { const email = W.data?.web?.email || '', businesses = await window.api.listBusinesses(); W.closeModal(); W.data = null; showChooser(businesses, email); }
    catch (error) { W.toast('No se pudieron cargar tus negocios', W.cleanError(error), 'error'); }
  };
  W.actions.createRealBusiness = async () => { W.closeModal(); try { await window.api.logout(W.token); } catch {} W.data = null; lastStatus = { cloudAvailable: true }; showWelcome(); setTimeout(() => $('#googleSignIn')?.click(), 50); };
  W.actions.userMenu = () => {
    const admin = W.admin(), web = W.data.web || {};
    W.modal(`<h2 id="modalTitle">${esc(W.data.session.name)}</h2><p class="modal-subtitle">${esc(web.email || '')} · ${admin ? 'Administrador' : 'Operador'}${web.business ? ` · ${esc(web.business.name)}` : ''}</p><div class="form-actions">${web.demo ? (web.cloudAvailable ? '<button class="primary" data-action="createRealBusiness">Crear mi negocio real</button>' : '') : '<button class="secondary" data-action="switchBusiness">Cambiar de negocio</button>'}${admin && !web.demo ? '<button class="secondary" data-action="staff">Equipo</button>' : ''}<button class="secondary" data-action="tutorials">Tutoriales</button><button class="danger" data-action="logout">${web.demo ? 'Salir de la demostración' : 'Cerrar sesión'}</button></div>`);
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
    <li><b>Crea tus modelos</b> en Inventario → <i>Nuevo modelo</i>: un zapato con todas sus tallas y cuántos pares hay de cada una.</li>
    <li><b>Vende</b> en <i>Vender</i>: toca la talla (o escanea su código con 📷) y luego <i>Continuar y facturar</i>. ¿El pedido sigue cambiando durante el día? Usa <i>Guardar como factura abierta</i> y factúralo al final.</li>
    <li><b>Despacha a tus locales</b> en Negocios asociados → <i>Despachar</i>: toca cada talla que envías.</li>
    <li><b>Cierra el día</b> de cada local: escribe lo vendido; lo demás vuelve a bodega o se queda allá.</li>
    <li><b>Cobra y cuadra</b> en Cobros y saldos y en Caja del día.</li></ol>
    <p class="modal-subtitle">Consejo: invita a tu equipo desde tu nombre (abajo a la izquierda, o en <i>Más</i> en el celular) → <i>Equipo</i>.</p>
    <div class="form-actions"><button class="primary" data-action="closeModal">Entendido</button></div>`);
  function onboarding() {
    const data = W.data; if (!data || data.web?.demo) return '';
    let hidden = false; try { hidden = localStorage.getItem(`wannashop.onboarding.${data.web?.business?.id}`) === 'done'; } catch {}
    if (hidden || !W.admin()) return '';
    let toured = false; try { toured = Boolean(JSON.parse(localStorage.getItem('wannashop.tutorial') || '{}').basics); } catch {}
    const steps = [
      ['Mira el tutorial (5 minutos)', toured, '', 'tutorials'],
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
    if (W.ui.welcomeNew) { W.ui.welcomeNew = false; (W.actions.tutorials || W.actions.quickGuide)(); }
  };

  // Configuración: la protección de datos es la nube, no carpetas del equipo.
  const cloudPanel = () => { const demo = W.data.web?.demo; return `<div class="panel-head"><div><h2>Datos en la nube</h2><p>${demo ? 'Modo demostración' : 'Cada cambio se guarda en línea al instante'}</p></div></div><div class="panel-body protection-summary"><div class="protection-row"><span class="status-orb ${demo ? 'warn' : ''}"></span><span><b>${demo ? 'Solo en este navegador' : 'Guardado en Google Cloud'}</b><small>${demo ? 'Crea tu negocio real para usarla en varios equipos' : 'Entra desde cualquier equipo o celular'}</small></span></div><div class="protection-row"><span class="status-orb ${demo ? 'warn' : ''}"></span><span><b>Fotos en la nube</b><small>${demo ? 'Guardadas en este navegador' : 'Se ven en todos los equipos'}</small></span></div><div class="protection-row"><span class="status-orb ${demo ? 'warn' : ''}"></span><span><b>Copias automáticas</b><small>${demo ? 'Solo en la nube' : 'Cada hora (24 puntos) y cada día (30 días)'}</small></span></div><div class="settings-actions">${demo ? '' : '<button class="secondary" data-action="cloudBackups">Ver copias automáticas</button>'}<button class="secondary" data-action="backupNow">Descargar una copia</button></div></div>`; };
  const baseSettings = W.routes.settings;
  W.routes.settings = () => {
    baseSettings();
    if (!W.admin()) return;
    const panels = W.$$('.settings-layout > aside .panel');
    if (panels[0]) panels[0].innerHTML = cloudPanel();
    $('[data-action="renewRecovery"]')?.remove();
    const restore = $('[data-action="restoreBackup"]'); if (restore) restore.textContent = 'Importar respaldo (también de la app de escritorio)';
    const backup = $('.settings-layout aside [data-action="backupNow"]:not(.protection-summary *)'); if (backup) backup.textContent = 'Descargar respaldo';
  };
  // Copias automáticas en la nube: un punto por hora (últimas 24) y uno por día (últimos 30).
  const backupLabel = item => item.hourly ? (() => { const date = new Date(`${item.day.slice(1)}:00`), today = new Date().toDateString() === date.toDateString(); return `${today ? 'Hoy' : date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}`; })() : `${new Date(`${item.day}T12:00`).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })} (inicio del día)`;
  W.actions.cloudBackups = async () => {
    try {
      const list = await window.api.cloudBackups(W.token);
      W.modal(`<h2 id="modalTitle">Copias automáticas en la nube</h2><p class="modal-subtitle">Se crean solas mientras trabajas: un punto de restauración cada hora (las últimas 24) y una copia por día (los últimos 30 días). Restaurar reemplaza los datos actuales por los de esa copia y queda registrado.</p>${list.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Cómo estaban los datos</th><th>Tipo</th><th>Modelos</th><th></th></tr></thead><tbody>${list.map(item => `<tr><td><b>${esc(backupLabel(item))}</b></td><td>${item.hourly ? '<span class="badge neutral">Por hora</span>' : '<span class="badge success">Diaria</span>'}</td><td>${item.products}</td><td><button class="secondary" data-action="restoreCloudBackup" data-day="${esc(item.day)}" data-label="${esc(backupLabel(item))}">Restaurar</button></td></tr>`).join('')}</tbody></table></div>` : W.empty('☁', 'Todavía no hay copias', 'El primer punto se crea en la próxima hora en que registres un movimiento.')}<div class="form-actions"><button class="secondary" data-action="closeModal">Cerrar</button><button class="primary" data-action="backupNow">Descargar copia ahora</button></div>`, { wide: true });
    } catch (error) { W.toast('No se pudieron ver las copias', W.cleanError(error), 'error'); }
  };
  W.actions.restoreCloudBackup = async (_, data) => {
    const ok = await W.confirm({ title: `Restaurar: ${data.label || data.day}`, message: 'Los datos actuales se reemplazarán por los de esa copia en todos los equipos. Antes, descarga una copia de hoy por si acaso.', confirmText: 'Restaurar', danger: true });
    if (!ok) return;
    try { const result = await window.api.restoreCloudBackup(W.token, data.day); W.data = result.data; W.closeModal(); W.render('dashboard'); W.toast('Copia restaurada', `Los datos quedaron como estaban: ${data.label || data.day}.`); }
    catch (error) { W.toast('No se pudo restaurar', W.cleanError(error), 'error'); }
  };
  W.actions.openProtection = () => W.modal(`<h2 id="modalTitle">Datos en la nube</h2><p class="modal-subtitle">${W.data.web?.demo ? 'En el modo demostración todo queda en este navegador.' : 'Cada cambio se guarda en Google Cloud y se ve al instante en los demás equipos. Puedes descargar una copia completa cuando quieras.'}</p><div class="form-actions"><button class="secondary" data-action="closeModal">Cerrar</button>${!W.data.web?.demo && W.admin() ? '<button class="secondary" data-action="cloudBackups">Copias automáticas</button>' : ''}<button class="primary" data-action="backupNow">Descargar copia</button></div>`);
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
