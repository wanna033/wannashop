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
    W.modal(`<h2 id="modalTitle">Más opciones</h2><p class="modal-subtitle">${esc(session.name || '')}${web.email ? ` · ${esc(web.email)}` : ''}</p>${sections.filter(section => section.items.length).map(section => `<p class="more-label">${esc(section.title)}</p><div class="more-grid">${section.items.join('')}</div>`).join('')}<div class="more-foot"><button type="button" class="secondary" data-action="openProtection">☁ ${esc(W.data?.protection?.cloud || 'Datos')}</button>${W.admin() ? '<button type="button" class="secondary" data-action="staff">Usuarios</button>' : ''}<button type="button" class="danger" data-action="logout">Cerrar sesión</button></div>`);
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
  new MutationObserver(() => { if (phone.matches) { decorate(); labelTables(); } }).observe(document.body, { childList: true, subtree: true });

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
