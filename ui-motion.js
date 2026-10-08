// Movimiento de WannaShop: entrada suave de cada pantalla, números que cuentan, respuesta al tocar,
// indicador del menú, aviso discreto de «Guardado en la nube» y botón de tema claro u oscuro.
// Nada de esto cambia datos; si el equipo pide «reducir movimiento», se desactiva.
(() => {
  const W = window.WS, $ = W.$;
  const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Entrada en cascada al cambiar de pantalla ----------
  const STAGGER = '.hero, .demo-strip, .onboarding, .metric-card, .toolbar, .panel, .product-card, .business-card, .catalog-card, .onboarding-step, .alert-row, .rank-row, .quick-card';
  let lastView = '', lastAt = 0;
  function cascade(root) {
    if (calm()) return;
    [...root.querySelectorAll(STAGGER)].slice(0, 24).forEach((element, index) => {
      element.style.setProperty('--i', Math.min(index, 10));
      element.classList.remove('motion-in'); void element.offsetWidth; element.classList.add('motion-in');
      const done = event => { if (event.target !== element) return; element.classList.remove('motion-in'); element.removeEventListener('animationend', done); };
      element.addEventListener('animationend', done);
    });
  }

  // ---------- Números que cuentan hasta su valor ----------
  const lastValues = new Map();
  function countUp(root) {
    for (const element of root.querySelectorAll('.metric-card strong')) {
      const text = element.textContent, match = text.match(/^(\D*?)(-?\d{1,3}(?:\.\d{3})*|-?\d+)(\D*)$/);
      if (!match) continue;
      const [, prefix, digits, suffix] = match, target = Number(digits.replace(/\./g, ''));
      const key = `${W.view}|${element.parentElement?.querySelector('small')?.textContent || ''}`, from = lastValues.get(key) ?? 0;
      lastValues.set(key, target);
      if (calm() || from === target || !Number.isFinite(target)) continue;
      const start = performance.now(), duration = 650;
      const step = now => {
        const t = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - t, 3);
        element.textContent = `${prefix}${Math.round(from + (target - from) * eased).toLocaleString('es-CO')}${suffix}`;
        if (t < 1 && element.isConnected) requestAnimationFrame(step); else element.textContent = text;
      };
      requestAnimationFrame(step);
    }
  }

  const baseRender = W.render;
  W.render = (...args) => {
    baseRender(...args);
    const app = $('#app');
    if (!app) return;
    if (W.view !== lastView || Date.now() - lastAt > 4000) { cascade(app); app.scrollTop = 0; }
    lastView = W.view; lastAt = Date.now();
    countUp(app);
  };

  // ---------- Respuesta al tocar los botones principales ----------
  const RIPPLE = '.primary, .secondary, .danger, .quick-card, .business-choice, .more-item, .tab-bar button, .cart-fab';
  document.addEventListener('pointerdown', event => {
    const button = event.target.closest(RIPPLE);
    if (!button || button.disabled || calm()) return;
    const rect = button.getBoundingClientRect(), size = Math.max(rect.width, rect.height), ripple = document.createElement('span');
    ripple.className = 'ws-ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - rect.left - size / 2}px;top:${event.clientY - rect.top - size / 2}px`;
    const style = getComputedStyle(button);
    if (style.position === 'static') button.style.position = 'relative';
    if (style.overflow === 'visible') button.style.overflow = 'hidden';
    button.append(ripple);
    setTimeout(() => ripple.remove(), 550);
  }, { passive: true });

  // ---------- Menú lateral con indicador que se desliza ----------
  const nav = $('#mainNav');
  let glider = null;
  function glide() {
    if (!nav) return;
    if (!glider) { glider = document.createElement('span'); glider.className = 'nav-glider'; nav.prepend(glider); document.body.classList.add('has-glider'); }
    const active = nav.querySelector('button.active');
    if (!active || !active.offsetParent) { glider.style.opacity = '0'; return; }
    let top = 0, element = active;
    while (element && element !== nav) { top += element.offsetTop; element = element.offsetParent; }
    glider.style.transform = `translate(${active.offsetLeft}px, ${top}px)`;
    glider.style.width = `${active.offsetWidth}px`; glider.style.height = `${active.offsetHeight}px`; glider.style.opacity = '1';
  }
  const baseSync = W.syncChrome;
  W.syncChrome = () => { baseSync(); requestAnimationFrame(glide); };
  window.addEventListener('resize', () => requestAnimationFrame(glide));
  // Al cambiar de tema cambian los tamaños: se recalcula cuando cargan las hojas nuevas.
  document.querySelectorAll('link[data-light], link[data-light-only]').forEach(link => link.addEventListener('load', () => requestAnimationFrame(glide)));
  if (nav && 'ResizeObserver' in window) new ResizeObserver(() => requestAnimationFrame(glide)).observe(nav);

  // ---------- Guardado en la nube: barra fina arriba y aviso «Guardado» en el encabezado ----------
  const bar = document.createElement('div'); bar.className = 'save-bar'; bar.setAttribute('aria-hidden', 'true'); document.body.append(bar);
  const actions = $('.top-actions');
  const pill = document.createElement('span'); pill.className = 'save-pill'; pill.setAttribute('role', 'status'); pill.setAttribute('aria-live', 'polite');
  actions?.prepend(pill);
  let pillTimer = 0;
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';
  function saveState(state, detail = '') {
    clearTimeout(pillTimer);
    bar.classList.toggle('on', state === 'saving');
    pill.className = `save-pill show ${state}`;
    pill.innerHTML = state === 'saving' ? 'Guardando…' : state === 'error' ? 'No se guardó' : `${CHECK}${W.data?.web?.demo ? 'Guardado en este navegador' : 'Guardado en la nube'}`;
    if (detail) pill.title = detail;
    if (state !== 'saving') pillTimer = setTimeout(() => pill.classList.remove('show'), state === 'error' ? 6000 : 2600);
  }
  const baseCommand = W.command;
  W.command = async (...args) => {
    if (W.commandBusy) return baseCommand(...args);
    saveState('saving');
    const result = await baseCommand(...args);
    saveState(result == null ? 'error' : 'saved');
    return result;
  };
  W.saveState = saveState;

  // ---------- Tema claro u oscuro (se recuerda en este equipo) ----------
  const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>';
  const themeButton = document.createElement('button');
  themeButton.className = 'round-button theme-toggle'; themeButton.type = 'button'; themeButton.dataset.action = 'toggleTheme';
  const paintToggle = () => { const dark = window.wsTheme?.get() === 'dark'; themeButton.innerHTML = dark ? SUN : MOON; themeButton.setAttribute('aria-label', dark ? 'Usar tema claro' : 'Usar tema oscuro'); themeButton.title = dark ? 'Tema claro' : 'Tema oscuro'; };
  if (window.wsTheme) { paintToggle(); actions?.querySelector('.round-button')?.before(themeButton); }
  W.actions.toggleTheme = () => { window.wsTheme?.toggle(); paintToggle(); [60, 300, 900].forEach(delay => setTimeout(glide, delay)); };

  // ---------- Confirmación al registrar una venta, un cierre o un despacho ----------
  const CELEBRATE = /^(Venta registrada|Cierre registrado|Despacho registrado|Abono registrado|Compra registrada|Inventario importado)/;
  function confirmDone() {
    if (calm()) return;
    const check = document.createElement('div');
    check.className = 'ws-check';
    check.innerHTML = '<svg viewBox="0 0 52 52"><path d="M14 27l8 8 16-17"/></svg>';
    document.body.append(check);
    setTimeout(() => check.remove(), 1000);
  }
  const baseToast = W.toast;
  W.toast = (title, ...rest) => {
    const result = baseToast(title, ...rest);
    if ((rest[1] ?? 'success') === 'success' && CELEBRATE.test(String(title))) confirmDone();
    return result;
  };
})();
