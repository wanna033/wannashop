// Tutorial interactivo: recorre la pantalla real paso a paso, resaltando cada parte.
// No guarda nada: solo muestra y explica. Cada capítulo se marca como visto en este navegador.
(() => {
  const W = window.WS, $ = W.$, esc = W.esc;
  const phone = () => window.matchMedia('(max-width: 760px)').matches;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const seen = {
    all() { try { return JSON.parse(localStorage.getItem('wannashop.tutorial') || '{}'); } catch { return {}; } },
    has(id) { return Boolean(this.all()[id]); },
    add(id) { try { localStorage.setItem('wannashop.tutorial', JSON.stringify({ ...this.all(), [id]: true })); } catch {} }
  };
  const visible = element => element && element.getClientRects().length > 0;
  const find = selectors => { for (const selector of [].concat(selectors || [])) { const element = typeof selector === 'function' ? selector() : document.querySelector(selector); if (visible(element)) return element; } return null; };
  const more = '#tabBar [data-tab="more"]';
  const navOrMore = view => (phone() ? more : `#mainNav [data-view="${view}"]`);

  // Capítulos. target: lo que se resalta (computador); mobile: alternativa en el celular.
  // Sin target (o si no existe en pantalla) la explicación aparece en el centro.
  // optional: si el elemento no está, el paso se salta. admin: solo para administradores.
  const CHAPTERS = [
    { id: 'basics', icon: '⌂', title: 'Conoce la pantalla', summary: 'Dónde está cada cosa: menú, buscador, crear rápido y tu cuenta.', minutes: 2, steps: [
      { title: 'Bienvenido a WannaShop', text: 'Te mostramos dónde está cada cosa. Avanza con «Siguiente»; puedes salir cuando quieras y volver desde el botón «?» de arriba. En este recorrido no se guarda nada.' },
      { view: 'dashboard', target: '#mainNav', mobile: '#tabBar', title: 'El menú', text: 'Desde aquí vas a cada parte: Inventario, Vender, Negocios asociados, Cobros, Caja, Facturas y más. En el celular el menú está abajo; lo que no cabe está en «Más».' },
      { target: '.command-button', title: 'Buscar cualquier cosa', text: 'Escribe el nombre de un modelo, un negocio o el número de una factura y llegas directo. En el computador también abre con Ctrl + K.' },
      { target: '.round-button[data-action="quickCreate"]', title: 'Crear rápido', text: 'Atajo para lo que más se hace: una venta, un despacho, un abono o un modelo nuevo.' },
      { target: '#app .metric-grid', title: 'Tu día en números', text: 'Modelos activos, pares en bodega, pares en tus locales, lo facturado hoy y lo que te deben. Toca las alertas del «Centro de atención» para ir directo a lo urgente.' },
      { target: '#app .onboarding', optional: true, title: 'Primeros pasos', text: 'Esta lista te dice qué falta para dejar tu negocio listo. Se marca sola a medida que avanzas.' },
      { target: '.user-card', mobile: more, title: 'Tu cuenta y tu negocio', text: 'Aquí ves con qué negocio estás trabajando, cambias de negocio, invitas a tu equipo y cierras sesión.' },
      { target: '.tour-help', title: 'Ayuda siempre a mano', text: 'Con este botón vuelves a los tutoriales cuando quieras. ¡Sigue con «Tu inventario»!' }
    ] },
    { id: 'inventory', icon: '▦', title: 'Tu inventario', summary: 'Crear modelos con sus tallas, fotos, códigos, etiquetas e importar desde Excel.', minutes: 3, steps: [
      { view: 'inventory', target: '#inventorySearch', title: 'Inventario por modelos', text: 'Un zapato es un solo modelo con todas sus tallas. Busca por nombre, marca, talla o código; en el celular también con la cámara 📷.' },
      { target: '#app .product-card', optional: true, title: 'Cada tarjeta es un modelo', text: 'Muestra los pares de cada talla y avisa cuando hay que reponer. Tócala para ver el detalle, las ventas por talla y editarla.' },
      { admin: true, target: '#app [data-action="newProduct"]', title: 'Crear un modelo', text: 'Con este botón registras un modelo nuevo. Vamos a ver el formulario (no se guardará nada).' },
      { admin: true, before: () => W.actions.newProduct(), target: '#modal input[name="name"]', title: 'Nombre y datos', text: 'Escribe el nombre del modelo, la marca, el color y la categoría.' },
      { admin: true, target: '#variantRows', title: 'Tallas y pares', text: 'Agrega cada talla con cuántos pares tienes hoy. Cada talla recibe su propio código de barras de forma automática.' },
      { admin: true, target: '#modal input[name="price"]', title: 'Precios', text: 'El precio de venta. El costo solo lo ve el administrador. El «precio para locales» es opcional, para los negocios a los que cobras un precio especial.' },
      { admin: true, target: () => document.querySelector('#productPhoto')?.closest('label, .field, .photo-field') || document.querySelector('#productPhotoPreview'), title: 'Foto', text: 'Agrega una foto del zapato: se ve en el inventario, al vender, al despachar y en tu catálogo.' },
      { admin: true, target: '#modal .form-actions .primary', title: 'Guardar', text: 'Al guardar, el modelo queda listo para vender y despachar.' },
      { admin: true, before: () => W.closeModal(), target: '#app [data-action="importProducts"]', title: '¿Tienes muchos modelos?', text: 'Importa todo tu inventario desde Excel: descargas la plantilla, la llenas y la subes. Antes de guardar te muestra un resumen.' },
      { admin: true, target: '#app [data-action="aiProduct"]', title: 'Registrar con foto (IA)', text: 'Tomas una foto, escribes por ejemplo «20 pares talla 34 y 6 talla 37» y la inteligencia artificial llena el modelo. Requiere una clave de IA en Configuración.' },
      { target: '#app [data-action="printLabels"]', title: 'Etiquetas', text: 'Imprime etiquetas con el código de barras, la talla y el precio de cada par.' },
      { target: '#app [data-action="stockCount"]', title: 'Conteo físico', text: 'Para revisar la bodega: escaneas o cuentas los pares y WannaShop corrige solo las diferencias, dejando registro.' }
    ] },
    { id: 'sell', icon: '◇', title: 'Vender', summary: 'Hacer una venta, cobrar y entregar la factura en PDF.', minutes: 2, steps: [
      { view: 'sale', target: '#saleSearch', title: 'Busca o escanea', text: 'Escribe el modelo o escanea el código. Con un lector de códigos o con la cámara 📷, cada lectura agrega un par.' },
      { target: '#saleCatalog .catalog-card', mobile: '#saleCatalog', title: 'Toca la talla', text: 'Cada botón es una talla con los pares disponibles. Tócala para agregar un par; tócala otra vez para sumar más.' },
      { target: '#saleCart', title: 'El carrito', text: 'Aquí cambias cantidades, quitas productos y ves el total. En el celular, el botón flotante te trae aquí.' },
      { target: '#saleCart [data-action="checkout"]', optional: true, title: 'Continuar y facturar', text: 'Eliges el cliente (o consumidor final), la forma de pago y cuánto te pagaron. Si queda saldo, pasa a Cobros. La factura sale en PDF para imprimir o enviar.' },
      { target: () => find(navOrMore('invoices')), title: 'Facturas', text: 'Todas tus facturas: ver, descargar en PDF o Excel, registrar devoluciones y cambios, o anular con un motivo.' }
    ] },
    { id: 'locals', icon: '▤', title: 'Negocios y despachos', summary: 'Entregar mercancía a tus locales y cerrar el día de cada uno.', minutes: 2, steps: [
      { view: 'businesses', target: '#app [data-action="newBusiness"]', title: 'Tus negocios asociados', text: 'Registra los locales a los que entregas mercancía en consignación. Para cada uno eliges cómo le cobras: precio completo, una comisión (%) o un precio especial.' },
      { target: '#app [data-action="dispatch"]', title: 'Despachar', text: 'Abre el catálogo con fotos: toca cada talla que envías y confirma. Los pares salen de la bodega y quedan a cargo del local.' },
      { target: '#app [data-action="closeDay"]', title: 'Cerrar el día', text: 'Al final del día escribes lo que vendió el local. Lo que no vendió vuelve a bodega o se queda allá, como elijas. Se crea su factura con el cobro según su acuerdo.' },
      { target: () => find(navOrMore('consolidated')), title: 'Consolidado', text: 'Un resumen de los cierres de todos los locales por fecha, en PDF o Excel.' }
    ] },
    { id: 'money', icon: '◎', title: 'Cobros, caja y gastos', summary: 'Abonos, recordatorios por WhatsApp, cuadre de caja y reportes.', minutes: 2, steps: [
      { view: 'accounts', target: '#app .segmented', title: 'Cobros y saldos', text: 'Las facturas que te deben, las pagadas y los saldos a favor. Filtra con estos botones.' },
      { target: '#app [data-action="payment"]', title: 'Registrar un abono', text: 'Cuando te pagan una parte o el total, regístralo aquí; el saldo se actualiza solo.' },
      { target: '#app [data-action="remindWhatsApp"]', title: 'Recordar por WhatsApp', text: 'Envía un recordatorio con el saldo y la fecha de vencimiento, ya escrito.' },
      { view: 'cash', target: '#cashForm', title: 'Caja del día', text: 'Escribe la base y lo que contaste en efectivo. WannaShop calcula lo que debía haber y te dice si cuadra, sobra o falta.' },
      { admin: true, view: 'expenses', target: '#app [data-action="newExpense"]', title: 'Gastos', text: 'Arriendo, transporte, nómina… Con los gastos ves la ganancia real del mes.' },
      { admin: true, view: 'salesReport', target: '#app .report-toolbar', title: 'Reportes de ventas', text: 'Ventas por período comparadas con el anterior, modelos y tallas más vendidos, por vendedor y por forma de pago. Descárgalo en Excel.' }
    ] },
    { id: 'team', icon: '👥', title: 'Equipo, catálogo y ajustes', summary: 'Invitar personas, publicar tu catálogo y configurar tu negocio.', minutes: 2, admin: true, steps: [
      { view: 'settings', target: '#settingsForm', title: 'Configuración', text: 'Los datos de tu negocio (salen en las facturas), el IVA si lo cobras, el horario de trabajo y el asistente de IA.' },
      { target: '.settings-layout aside .panel', title: 'Tus datos protegidos', text: 'Todo se guarda en la nube al instante y cada día queda una copia automática. También puedes descargar una copia completa.' },
      { before: () => W.actions.staff(), target: '#modal [data-action="staffNew"]', title: 'Invita a tu equipo', text: 'Escribe el Gmail de la persona y elige su rol: operador (vende, despacha y cobra, sin ver costos) o administrador. Luego le envías el enlace por WhatsApp.' },
      { before: () => W.closeModal(), view: 'inventory', target: '#app [data-action="catalog"]', title: 'Tu catálogo en línea', text: 'Publica una página con tus modelos, fotos, precios y tallas disponibles. Tus clientes la abren desde un enlace y te piden por WhatsApp.' },
      { title: '¡Listo!', text: 'Ya conoces WannaShop. Si tienes dudas, abre «?» y repite cualquier capítulo, o lee la guía completa.' }
    ] }
  ];

  // ---------- Motor del recorrido ----------
  document.body.insertAdjacentHTML('beforeend', '<div id="tour" class="tour hidden" aria-live="polite"><div class="tour-spot"></div><div class="tour-card" role="dialog" aria-label="Tutorial"></div></div>');
  const tour = $('#tour'), spot = tour.querySelector('.tour-spot'), card = tour.querySelector('.tour-card');
  let active = null;

  const stepsOf = chapter => chapter.steps.filter(step => !step.admin || W.admin());
  async function go(index) {
    const steps = active.steps;
    if (index < 0 || index >= steps.length) return index >= steps.length ? finish() : null;
    const step = steps[index], token = Symbol('step'); active.token = token; active.index = index;
    card.classList.add('busy');
    try {
      if (step.view && W.view !== step.view) { W.closeModal(); W.navigate(step.view); await wait(140); }
      if (step.before) { await step.before(); await wait(260); }
    } catch {}
    if (active?.token !== token) return;
    let target = find(phone() && step.mobile ? step.mobile : step.target);
    if (!target && step.optional) return go(index + (active.direction || 1));
    target?.scrollIntoView({ block: 'center', inline: 'nearest' });
    await wait(80);
    if (active?.token !== token) return;
    active.target = target;
    card.innerHTML = `<div class="tour-meta"><span>${esc(active.chapter.icon)} ${esc(active.chapter.title)}</span><span>${index + 1} / ${steps.length}</span></div><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p><div class="tour-dots">${steps.map((_, i) => `<i class="${i === index ? 'on' : i < index ? 'done' : ''}"></i>`).join('')}</div><div class="tour-actions"><button type="button" class="ghost" data-tour="exit">Salir</button><span></span>${index ? '<button type="button" class="secondary" data-tour="back">Atrás</button>' : ''}<button type="button" class="primary" data-tour="next">${index === steps.length - 1 ? 'Terminar' : 'Siguiente'}</button></div>`;
    card.classList.remove('busy');
    place();
    card.querySelector('[data-tour="next"]').focus({ preventScroll: true });
  }
  function place() {
    if (!active) return;
    const target = active.target && visible(active.target) ? active.target : null;
    tour.classList.toggle('no-target', !target);
    const width = Math.min(380, innerWidth - 24);
    card.style.width = `${width}px`;
    if (!target) { spot.style.cssText = 'display:none'; card.style.left = `${(innerWidth - width) / 2}px`; card.style.top = `${Math.max(16, (innerHeight - card.offsetHeight) / 2)}px`; return; }
    const rect = target.getBoundingClientRect(), pad = 6;
    const box = { left: Math.max(4, rect.left - pad), top: Math.max(4, rect.top - pad), right: Math.min(innerWidth - 4, rect.right + pad), bottom: Math.min(innerHeight - 4, rect.bottom + pad) };
    spot.style.cssText = `display:block;left:${box.left}px;top:${box.top}px;width:${box.right - box.left}px;height:${box.bottom - box.top}px`;
    const height = card.offsetHeight, below = innerHeight - box.bottom, above = box.top;
    let top;
    // En el celular la explicación va arriba o abajo, donde no tape lo resaltado.
    if (phone()) top = box.top + (box.bottom - box.top) / 2 > innerHeight * 0.5 ? 12 : innerHeight - height - 84;
    else top = below > height + 16 ? box.bottom + 12 : above > height + 16 ? box.top - height - 12 : Math.max(12, innerHeight - height - 12);
    const left = phone() ? (innerWidth - width) / 2 : Math.min(Math.max(12, box.left), innerWidth - width - 12);
    card.style.left = `${left}px`; card.style.top = `${Math.max(12, top)}px`;
  }
  function stop() {
    if (!active) return;
    active.token = null; active = null;
    tour.classList.add('hidden');
    W.closeModal();
  }
  function finish() {
    const chapter = active.chapter;
    seen.add(chapter.id); stop();
    const next = CHAPTERS.find(item => (!item.admin || W.admin()) && !seen.has(item.id));
    W.toast(`Terminaste «${chapter.title}»`, next ? `Siguiente: ${next.title}.` : 'Completaste todos los tutoriales.');
    W.actions.tutorials();
  }
  tour.addEventListener('click', event => {
    const action = event.target.closest('[data-tour]')?.dataset.tour;
    if (!active || !action) return;
    if (action === 'exit') return stop();
    active.direction = action === 'back' ? -1 : 1;
    go(active.index + active.direction);
  });
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') { event.stopImmediatePropagation(); stop(); }
    if (event.key === 'ArrowRight') { active.direction = 1; go(active.index + 1); }
    if (event.key === 'ArrowLeft' && active.index) { active.direction = -1; go(active.index - 1); }
  }, true);
  window.addEventListener('resize', () => place());
  // Las ventanas se abren con animación y el contenido puede moverse: el resaltado sigue al elemento.
  setInterval(() => { if (active) place(); }, 250);
  document.addEventListener('scroll', () => place(), true);

  W.actions.startTour = (_, data) => {
    const chapter = CHAPTERS.find(item => item.id === data.id);
    if (!chapter) return;
    W.closeModal(); W.closeDrawer?.();
    active = { chapter, steps: stepsOf(chapter), index: 0, direction: 1 };
    tour.classList.remove('hidden');
    go(0);
  };

  // ---------- Centro de tutoriales ----------
  W.actions.tutorials = () => {
    const chapters = CHAPTERS.filter(item => !item.admin || W.admin()), done = chapters.filter(item => seen.has(item.id)).length;
    W.modal(`<h2 id="modalTitle">Aprende a usar WannaShop</h2><p class="modal-subtitle">Recorridos cortos sobre tu pantalla real. No se guarda nada mientras aprendes. ${done ? `Llevas ${done} de ${chapters.length}.` : 'Empieza por el primero.'}</p>
      <div class="tour-progress"><i style="width:${Math.round(done / chapters.length * 100)}%"></i></div>
      <div class="tour-list">${chapters.map((item, index) => `<button type="button" class="tour-chapter ${seen.has(item.id) ? 'done' : ''}" data-action="startTour" data-id="${item.id}"><span class="tour-chapter-icon">${seen.has(item.id) ? '✓' : esc(item.icon)}</span><span><b>${index + 1}. ${esc(item.title)}</b><small>${esc(item.summary)}</small></span><em>${item.minutes} min</em></button>`).join('')}</div>
      <div class="form-actions"><a class="secondary button" href="ayuda.html" target="_blank" rel="noopener">Leer la guía completa</a><button class="secondary" data-action="quickGuide">Resumen en 5 pasos</button><button class="primary" data-action="startTour" data-id="${chapters.find(item => !seen.has(item.id))?.id || chapters[0].id}">${done && done < chapters.length ? 'Continuar' : done ? 'Repetir desde el inicio' : 'Empezar'}</button></div>`, { wide: true });
  };

  // Botón «?» siempre visible arriba.
  $('.top-actions')?.insertAdjacentHTML('beforeend', '<button class="round-button tour-help" data-action="tutorials" aria-label="Tutoriales y ayuda" title="Tutoriales y ayuda">?</button>');
})();
