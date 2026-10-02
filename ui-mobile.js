// WannaShop en el celular: barra inferior, menú «Más», carrito flotante y escáner con la cámara.
(() => {
  const W = window.WS, $ = W.$, esc = W.esc;
  const phone = window.matchMedia('(max-width: 760px)');
  const TABS = [['dashboard', '⌂', 'Inicio'], ['inventory', '▦', 'Inventario'], ['sale', '◇', 'Vender'], ['businesses', '▤', 'Negocios']];

  $('#shell').insertAdjacentHTML('beforeend', `<nav id="tabBar" class="tab-bar" aria-label="Navegación principal">${TABS.map(([view, icon, label]) => `<button type="button" data-view="${view}" class="${view === 'sale' ? 'tab-main' : ''}"><i>${icon}</i><span>${label}</span></button>`).join('')}<button type="button" data-action="mobileMore" data-tab="more"><i>☰</i><span>Más</span></button></nav><button type="button" id="cartFab" class="cart-fab" data-action="mobileCart"></button>`);

  const money = value => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
  function syncMobile() {
    const inBar = TABS.some(([view]) => view === W.view);
    W.$$('#tabBar [data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === W.view));
    $('#tabBar [data-tab="more"]')?.classList.toggle('active', Boolean(W.data) && !inBar);
    const cart = W.ui.cart || [], pairs = cart.reduce((sum, item) => sum + Number(item.quantity), 0), fab = $('#cartFab');
    fab.classList.toggle('show', W.view === 'sale' && pairs > 0);
    document.body.classList.toggle('with-fab', W.view === 'sale' && pairs > 0);
    fab.innerHTML = `<span>🛒 ${pairs} par(es)</span><span>${money(cart.reduce((sum, item) => sum + item.price * item.quantity, 0))} · Cobrar ›</span>`;
  }
  const baseSync = W.syncChrome;
  W.syncChrome = () => { baseSync(); syncMobile(); };
  const basePaint = W.paintSaleCart;
  if (basePaint) W.paintSaleCart = () => { basePaint(); syncMobile(); };
  W.actions.mobileCart = () => $('#saleCart')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // «Más»: el resto del menú lateral, con la sesión y la protección de datos.
  W.actions.mobileMore = () => {
    const sections = [];
    let current = null;
    for (const node of W.$$('#mainNav > *')) {
      if (node.matches('[data-admin-block]')) { if (node.classList.contains('hidden')) continue; for (const child of node.children) collect(child); }
      else collect(node);
    }
    function collect(node) {
      if (node.matches('.nav-label')) { current = { title: node.textContent, items: [] }; sections.push(current); return; }
      const view = node.dataset?.view;
      if (!view || TABS.some(([tab]) => tab === view) || !current) return;
      current.items.push(`<button type="button" class="more-item ${view === W.view ? 'active' : ''}" data-view="${esc(view)}"><i>${node.querySelector('.nav-icon')?.textContent || '•'}</i><span>${esc(node.querySelector('span:not(.nav-icon):not(.nav-badge):not(.nav-count)')?.textContent || view)}</span>${node.querySelector('.nav-count:not(.hidden)') ? `<em>${esc(node.querySelector('.nav-count').textContent)}</em>` : ''}</button>`);
    }
    const session = W.data?.session || {}, web = W.data?.web || {};
    W.modal(`<h2 id="modalTitle">Más opciones</h2><p class="modal-subtitle">${esc(session.name || '')}${web.business ? ` · ${esc(web.business.name)}` : ''}${web.email ? ` · ${esc(web.email)}` : ''}</p>${sections.filter(section => section.items.length).map(section => `<p class="more-label">${esc(section.title)}</p><div class="more-grid">${section.items.join('')}</div>`).join('')}${web.demo ? '' : '<p class="sync-note">☁ Sincronizado con tu PC: entra con el mismo Gmail y ves lo mismo al instante.</p>'}<div class="more-foot">${W.canInstall?.() ? '<button type="button" class="primary" data-action="installApp">📲 Instalar en este celular</button>' : ''}${web.demo && web.cloudAvailable ? '<button type="button" class="primary" data-action="createRealBusiness">Crear mi negocio gratis</button>' : ''}${W.admin() && !web.demo ? '<button type="button" class="secondary" data-action="staff">👥 Equipo</button>' : ''}${!web.demo ? '<button type="button" class="secondary" data-action="switchBusiness">⇄ Cambiar de negocio</button>' : ''}<button type="button" class="secondary" data-action="tutorials">🎓 Tutoriales</button><button type="button" class="secondary" data-action="openProtection">☁ ${esc(W.data?.protection?.cloud || 'Datos')}</button><button type="button" class="danger" data-action="logout">${web.demo ? 'Salir de la demostración' : 'Cerrar sesión'}</button></div>`);
  };

  // Escáner con la cámara: Android, iPhone y cualquier navegador con cámara.
  const SCAN_INPUTS = ['#inventorySearch', '#saleSearch', '#countScan', '#dispatchSearch'];
  const canScan = () => Boolean(navigator.mediaDevices?.getUserMedia && window.api?.loadBarcodeDetector);
  function decorate() {
    if (!canScan()) return;
    for (const selector of SCAN_INPUTS) {
      const input = $(selector);
      if (!input || input.dataset.scanReady) continue;
      input.dataset.scanReady = '1';
      const wrap = document.createElement('span');
      wrap.className = 'scan-wrap';
      input.replaceWith(wrap);
      wrap.append(input);
      wrap.insertAdjacentHTML('beforeend', `<button type="button" class="scan-button" aria-label="Escanear con la cámara" title="Escanear con la cámara">📷</button>`);
      wrap.querySelector('.scan-button').onclick = () => openScanner(input, selector !== '#inventorySearch');
    }
  }
  // Cada celda de una tabla recibe el título de su columna (en el celular se ve como tarjeta).
  function labelTables() {
    for (const table of W.$$('.data-table:not([data-labeled])')) {
      table.dataset.labeled = '1';
      const titles = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
      for (const row of table.querySelectorAll('tbody tr')) [...row.children].forEach((cell, index) => { if (titles[index]) cell.dataset.label = titles[index]; });
    }
  }
  // Inventario en el celular: a la vista solo buscar y «Nuevo modelo»; lo demás se pliega en «Herramientas».
  function foldTools() {
    const toolbar = W.view === 'inventory' && $('#app .toolbar');
    if (!toolbar || toolbar.dataset.folded) return;
    const extras = [...toolbar.querySelectorAll(':scope > button')].filter(button => button.dataset.action !== 'newProduct');
    if (extras.length < 2) return;
    toolbar.dataset.folded = '1';
    extras.forEach(button => { button.dataset.mobileSecondary = '1'; });
    toolbar.classList.add('tools-collapsed');
    const toggle = document.createElement('button');
    toggle.type = 'button'; toggle.className = 'secondary mobile-tools-toggle'; toggle.textContent = '⋯ Herramientas';
    toggle.onclick = () => { const open = toolbar.classList.toggle('tools-collapsed'); toggle.textContent = open ? '⋯ Herramientas' : '✕ Cerrar herramientas'; };
    toolbar.querySelector('[data-action="newProduct"]')?.before(toggle) ?? toolbar.append(toggle);
  }
  new MutationObserver(() => { if (phone.matches) { decorate(); labelTables(); foldTools(); } }).observe(document.body, { childList: true, subtree: true });

  // Instalar WannaShop como app en el celular (icono en la pantalla de inicio, se abre a pantalla completa).
  const installed = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
  window.addEventListener('appinstalled', () => { installPrompt = null; W.toast('WannaShop instalada', 'Ábrela desde el ícono de tu pantalla de inicio.'); });
  W.canInstall = () => !installed() && (Boolean(installPrompt) || iphone);
  W.actions.installApp = async () => {
    if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice.catch(() => null); installPrompt = null; W.closeModal(); return; }
    W.modal(`<h2 id="modalTitle">Instalar WannaShop</h2><p class="modal-subtitle">Queda con su ícono en tu pantalla de inicio y se abre como una app, con tu misma cuenta y tus datos del PC.</p><ol class="guide-list">${iphone ? '<li>Abre esta página en <b>Safari</b>.</li><li>Toca el botón <b>Compartir</b> (cuadro con flecha hacia arriba).</li><li>Elige <b>Agregar a pantalla de inicio</b> y luego <b>Agregar</b>.</li>' : '<li>Abre el menú del navegador (<b>⋮</b> arriba a la derecha).</li><li>Toca <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>.</li>'}</ol><div class="form-actions"><button class="primary" data-action="closeModal">Entendido</button></div>`);
  };
  // Aviso una sola vez en el inicio del celular.
  const baseDashboard = W.routes.dashboard;
  W.routes.dashboard = () => {
    baseDashboard();
    let dismissed = false; try { dismissed = localStorage.getItem('wannashop.installTip') === 'no'; } catch {}
    if (!phone.matches || dismissed || !W.canInstall()) return;
    $('#app').insertAdjacentHTML('afterbegin', '<div class="install-strip"><span class="install-icon">📲</span><span><b>Instala WannaShop en tu celular</b><small>Ícono en tu pantalla de inicio · misma cuenta que en el PC</small></span><button class="primary" data-action="installApp">Instalar</button><button class="ghost" data-action="hideInstallTip" aria-label="Ocultar">✕</button></div>');
  };
  W.actions.hideInstallTip = () => { try { localStorage.setItem('wannashop.installTip', 'no'); } catch {} $('.install-strip')?.remove(); };

  async function openScanner(input, continuous) {
    let stream, Detector;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }); }
    catch { return W.toast('No se pudo abrir la cámara', 'Permite el acceso a la cámara en el navegador.', 'error'); }
    try { Detector = await window.api.loadBarcodeDetector(); }
    catch { stream.getTracks().forEach(track => track.stop()); return W.toast('No se pudo iniciar el lector', 'Revisa tu conexión e intenta de nuevo.', 'error'); }
    const formats = await Detector.getSupportedFormats().catch(() => []);
    const detector = new Detector({ formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'qr_code'].filter(format => !formats.length || formats.includes(format)) });
    const overlay = document.createElement('div');
    overlay.className = 'scanner';
    overlay.innerHTML = `<video playsinline muted></video><div class="scanner-frame"></div><div class="scanner-bar"><b id="scanStatus">Apunta al código de barras</b><small>${continuous ? 'Cada lectura se agrega. Pulsa Listo al terminar.' : 'Se buscará apenas lo lea.'}</small><button type="button">Listo</button></div>`;
    document.body.append(overlay);
    const video = overlay.querySelector('video');
    video.srcObject = stream;
    await video.play().catch(() => {});
    let open = true, last = '', lastAt = 0, count = 0;
    const close = () => { open = false; stream.getTracks().forEach(track => track.stop()); overlay.remove(); document.activeElement?.blur?.(); };
    overlay.querySelector('button').onclick = close;
    const tick = async () => {
      if (!open) return;
      try {
        const [code] = await detector.detect(video);
        const value = code?.rawValue?.trim();
        if (value && (value !== last || Date.now() - lastAt > 1500)) {
          last = value; lastAt = Date.now(); count++;
          navigator.vibrate?.(60);
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
          if (!continuous) return close();
          overlay.querySelector('#scanStatus').textContent = `Leído: ${value} · ${count} lectura(s)`;
        }
      } catch {}
      setTimeout(tick, 180);
    };
    tick();
  }

  phone.addEventListener?.('change', syncMobile);
})();
