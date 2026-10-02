// WannaShop 2030: movimiento. Entrada en cascada, números que cuentan, tarjetas que siguen
// al mouse, onda al tocar, menú con indicador deslizante y celebración en ventas y cierres.
// Nada de esto cambia datos; si el equipo pide «reducir movimiento», se desactiva.
(() => {
  const W = window.WS, $ = W.$;
  const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = () => window.matchMedia('(pointer: fine)').matches;

  // ---------- Entrada en cascada al cambiar de pantalla ----------
  const STAGGER = '.hero, .demo-strip, .onboarding, .metric-card, .toolbar, .panel, .product-card, .business-card, .catalog-card, .onboarding-step, .alert-row, .rank-row, .quick-card';
  let lastView = '', lastAt = 0;
  function cascade(root) {
    if (calm()) return;
    [...root.querySelectorAll(STAGGER)].slice(0, 48).forEach((element, index) => {
      element.style.setProperty('--i', Math.min(index, 16));
      element.classList.remove('motion-in'); void element.offsetWidth; element.classList.add('motion-in');
      // Al terminar se quita la clase para que la inclinación 3D vuelva a funcionar (solo su propia animación, no la de sus hijos).
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
      const start = performance.now(), duration = Math.min(1200, 500 + Math.abs(target - from) / 400);
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
    if (W.view !== lastView || Date.now() - lastAt > 4000) cascade(app);
    lastView = W.view; lastAt = Date.now();
    countUp(app);
  };

  // ---------- Onda al tocar botones ----------
  const RIPPLE = '.primary, .secondary, .danger, .ghost, .round-button, .size-chip, .quick-card, .business-choice, .tour-chapter, .onboarding-step, .more-item, .tab-bar button, .cart-fab';
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
    setTimeout(() => ripple.remove(), 700);
  }, { passive: true });

  // ---------- Tarjetas que siguen al mouse (solo con mouse) y luz de fondo ----------
  const TILT = '.product-card, .business-card, .catalog-card, .quick-card, .metric-card';
  const SPOT = `${TILT}, .panel, .hero`;
  let tilted = null, frame = 0, pointer = null;
  const ambient = $('#ambient');
  document.addEventListener('pointermove', event => {
    if (!fine() || calm()) return;
    pointer = event;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const { clientX: x, clientY: y, target } = pointer;
      ambient?.style.setProperty('--cx', `${x}px`); ambient?.style.setProperty('--cy', `${y}px`); ambient?.style.setProperty('--glow-on', '1');
      const spot = target.closest?.(SPOT);
      if (spot) { const rect = spot.getBoundingClientRect(); spot.style.setProperty('--mx', `${x - rect.left}px`); spot.style.setProperty('--my', `${y - rect.top}px`); }
      const card = target.closest?.(TILT);
      if (tilted && tilted !== card) { tilted.style.removeProperty('--rx'); tilted.style.removeProperty('--ry'); tilted = null; }
      if (card && !card.closest('.modal, #tour')) {
        const rect = card.getBoundingClientRect(), px = (x - rect.left) / rect.width - .5, py = (y - rect.top) / rect.height - .5;
        card.style.setProperty('--rx', `${(-py * 6).toFixed(2)}deg`); card.style.setProperty('--ry', `${(px * 7).toFixed(2)}deg`);
        tilted = card;
      }
    });
  }, { passive: true });
  document.addEventListener('pointerleave', () => { ambient?.style.setProperty('--glow-on', '0'); if (tilted) { tilted.style.removeProperty('--rx'); tilted.style.removeProperty('--ry'); tilted = null; } });

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

  // ---------- Celebración: venta, cierre, despacho, abono, compra e importación ----------
  const CELEBRATE = /^(Venta registrada|Cierre registrado|Despacho registrado|Abono registrado|Compra registrada|Inventario importado|Catálogo publicado|Persona agregada|Modelo creado desde la foto)/;
  const COLORS = ['#3aa0ff', '#0d5bff', '#7cc4ff', '#ffffff', '#00d1ff', '#6fe0a5'];
  function celebrate() {
    if (calm()) return;
    const check = document.createElement('div');
    check.className = 'ws-check';
    check.innerHTML = '<svg viewBox="0 0 52 52"><path d="M14 27l8 8 16-17"/></svg>';
    document.body.append(check);
    const burst = document.createElement('div');
    burst.className = 'ws-burst';
    burst.style.left = '50%'; burst.style.top = '42%';
    burst.innerHTML = Array.from({ length: 26 }, (_, index) => {
      const angle = (index / 26) * Math.PI * 2 + Math.random() * .4, distance = 90 + Math.random() * 110;
      return `<i style="--c:${COLORS[index % COLORS.length]};--dx:${Math.cos(angle) * distance}px;--dy:${Math.sin(angle) * distance}px;--rot:${Math.round(Math.random() * 540)}deg;animation-delay:${Math.random() * 80}ms"></i>`;
    }).join('');
    document.body.append(burst);
    setTimeout(() => { check.remove(); burst.remove(); }, 1300);
  }
  const baseToast = W.toast;
  W.toast = (title, ...rest) => {
    const result = baseToast(title, ...rest);
    if ((rest[1] ?? 'success') === 'success' && CELEBRATE.test(String(title))) celebrate();
    return result;
  };
})();
