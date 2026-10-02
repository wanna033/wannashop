// Suscripción de WannaShop: $1.500 al mes. Al iniciar sesión se verifica el pago;
// si el negocio no ha pagado, en lugar del programa aparece la pantalla de suscripción.
// Dos formas de cobro (web/config.js → billing.mode):
// - manual: el cliente paga con el link de Wompi y envía el comprobante con el código de su negocio;
//   el administrador de WannaShop lo activa aquí mismo y el programa se abre solo.
// - automatic: el servidor (functions/) confirma el pago con el aviso de Wompi.
(() => {
  const W = window.WS, $ = W.$, esc = W.esc;
  const PRICE = 1500; // Mismo valor que functions/wompi.js (PLANS.mensual).
  const date = iso => iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const info = () => window.api?.billingInfo?.() || { mode: 'off' };
  const manual = () => info().mode === 'manual';
  // Sin cobro (billing.mode 'off'): no se verifica nada ni se muestran botones de suscripción.
  const off = () => info().mode === 'off';
  let current = null, owner = false, stopWatch = null;
  async function check() {
    try { current = await window.api.subscription(W.token); } catch (error) { current = { status: 'error', message: W.cleanError(error) }; }
    try { owner = await window.api.isPlatformOwner(); } catch { owner = false; }
    return current;
  }
  const label = sub => !sub ? '' : sub.status === 'active' ? `Activa hasta el ${date(sub.until)}` : sub.status === 'demo' ? 'Demostración' : 'Pendiente de pago';
  const business = () => W.data?.web?.business?.name || 'tu negocio';
  const proofText = () => `Hola, pagué la suscripción de WannaShop (${W.money(PRICE)}).\nNegocio: ${business()}\nCódigo: ${current?.code || ''}\nAdjunto el comprobante de Wompi.`;
  const whatsappUrl = () => `https://wa.me/${info().whatsapp}?text=${encodeURIComponent(proofText())}`;
  // Pasos del cobro manual: pagar, enviar el comprobante con el código y esperar la activación.
  const manualSteps = () => `<ol class="paywall-steps"><li>Paga <b>${W.money(PRICE)}</b> con Wompi (tarjeta, PSE, Nequi o Bancolombia).</li><li>Envía el comprobante por WhatsApp con el código de tu negocio.</li><li>Al activarse, el programa se abre solo en esta pantalla.</li></ol>
    <div class="paywall-code"><span>Código de tu negocio</span><b>${esc(current?.code || '')}</b><button type="button" class="secondary" data-copy-code>Copiar</button></div>
    ${info().paymentLink ? `<a class="primary button" href="${esc(info().paymentLink)}" target="_blank" rel="noopener">Pagar ${W.money(PRICE)} con Wompi</a>` : '<div class="error-box">Falta el link de pago de Wompi (web/config.js).</div>'}
    <a class="secondary button" href="${esc(whatsappUrl())}" target="_blank" rel="noopener">Enviar comprobante por WhatsApp</a>`;
  const copyCode = async button => {
    try { await navigator.clipboard.writeText(current?.code || ''); W.toast('Código copiado', current?.code || ''); }
    catch { W.toast('Tu código', current?.code || ''); }
    if (button) button.textContent = 'Copiado';
  };

  // Mientras la pantalla de pago está a la vista, el programa se desbloquea en cuanto se registra el pago.
  async function watch() {
    if (stopWatch) return;
    try {
      stopWatch = await window.api.watchSubscription(async paidUntil => {
        if (!paidUntil || paidUntil < new Date()) return;
        stopWatch?.(); stopWatch = null;
        await check();
        if (open()) W.toast('Suscripción activa', `Gracias por tu pago. Vence el ${date(current.until)}.`);
      });
    } catch {}
  }

  // Pantalla de suscripción (bloquea el programa hasta que el pago quede registrado).
  function paywall(message = '') {
    const admin = W.admin(), expired = Boolean(current?.until);
    $('#shell').classList.add('hidden');
    const root = $('#authRoot'); root.classList.remove('hidden'); root.classList.add('auth-split');
    root.innerHTML = `<div class="auth-hero"><img src="assets/login-banner.webp" alt="WannaShop, sistema de inventario"></div><div class="auth-side"><div class="auth-card paywall-card">
      <div class="auth-brand"><img src="assets/wannashop-logo.png" alt="Logo WannaShop"><h1>Suscripción WannaShop</h1><p>${esc(business())}</p></div>
      <div class="paywall-price"><strong>${W.money(PRICE)}</strong><span>al mes</span></div>
      <p class="auth-lead">${expired ? `Tu suscripción venció el ${esc(date(current.until))}.` : 'Para usar el programa activa tu suscripción.'}</p>
      <div id="authError" class="error-box ${message ? '' : 'hidden'}">${esc(message)}</div>
      ${manual() ? manualSteps() : `<ul class="paywall-list"><li>Inventario por tallas, ventas, despachos y cierres</li><li>Cobros, caja, reportes y catálogo en línea</li><li>Tu equipo en el celular y el PC, con copias diarias</li></ul>
      ${admin ? `<button type="button" class="primary button" data-pay>Pagar ${W.money(PRICE)} con Wompi</button>` : '<p class="auth-lead">El administrador del negocio debe pagarla.</p>'}`}
      <button type="button" class="secondary button" data-recheck>Ya pagué, verificar de nuevo</button>
      ${owner ? '<button type="button" class="secondary button" data-action="platformActivate">Activar suscripciones (administrador WannaShop)</button>' : ''}
      ${(W.data?.web?.businesses || 1) > 1 ? '<button type="button" class="link-button auth-link" data-switch>Cambiar de negocio</button>' : ''}
      <button type="button" class="link-button auth-link" data-logout>Cerrar sesión</button>
    </div></div>`;
    W.hideBoot();
    root.querySelector('[data-copy-code]')?.addEventListener('click', event => copyCode(event.currentTarget));
    root.querySelector('[data-pay]')?.addEventListener('click', async event => {
      const button = event.currentTarget; button.disabled = true; button.classList.add('loading');
      try { await window.api.startPayment(W.token, 'mensual'); }
      catch (error) { button.disabled = false; button.classList.remove('loading'); paywall(W.cleanError(error)); }
    });
    root.querySelector('[data-recheck]').addEventListener('click', async event => {
      const button = event.currentTarget; button.disabled = true; button.classList.add('loading');
      await check();
      if (open()) W.toast('Suscripción activa', 'Gracias por tu pago.');
      else paywall(current?.status === 'error' ? current.message : manual() ? 'Todavía no está activada. Cuando WannaShop reciba tu comprobante, el programa se abrirá solo.' : 'Todavía no vemos el pago aprobado. Si acabas de pagar, espera unos segundos y vuelve a intentar.');
    });
    root.querySelector('[data-switch]')?.addEventListener('click', () => W.actions.switchBusiness());
    root.querySelector('[data-logout]').addEventListener('click', () => { stopWatch?.(); stopWatch = null; W.actions.logout(); });
    watch();
  }
  // Abre el programa si la suscripción está al día.
  function open() {
    if (!['active', 'exempt', 'demo'].includes(current?.status)) return false;
    stopWatch?.(); stopWatch = null;
    $('#authRoot').classList.add('hidden'); $('#shell').classList.remove('hidden');
    W.render(W.view || 'dashboard');
    return true;
  }

  // Cobro automático: al volver de Wompi se espera la confirmación del servidor (llega en segundos).
  async function afterPayment() {
    if (!new URLSearchParams(location.search).has('pago')) return;
    history.replaceState(null, '', location.pathname);
    W.toast('Verificando tu pago…', 'Wompi nos confirmará en unos segundos.');
    let stop = null;
    const timer = setTimeout(() => { stop?.(); if (!open()) paywall('Aún no recibimos la confirmación de Wompi. Si el pago fue aprobado, toca «Ya pagué, verificar de nuevo» en un momento.'); }, 90000);
    stop = await window.api.watchSubscription(async paidUntil => {
      if (!paidUntil || paidUntil < new Date()) return;
      clearTimeout(timer); stop?.();
      await check();
      if (open()) W.toast('Pago aprobado', `Suscripción activa hasta el ${date(current.until)}.`);
    });
  }

  // Verificación cada vez que se entra al programa.
  const baseEnter = W.enterShell;
  W.enterShell = async (...args) => {
    const result = await baseEnter(...args);
    document.documentElement.classList.toggle('billing-on', !off());
    if (off()) return result;
    await check();
    if (current?.status === 'expired') paywall();
    else if (current?.status === 'error') paywall(current.message);
    afterPayment();
    return result;
  };

  // Estado y renovación desde el programa (Configuración, «Más» y aviso antes de vencer).
  W.actions.subscription = async () => {
    await check();
    W.modal(`<h2 id="modalTitle">Suscripción WannaShop</h2><div class="sub-state ${current?.status || ''}"><b>${esc(label(current))}</b><small>${W.money(PRICE)} al mes · se paga con Wompi. Si aún te quedan días, el nuevo mes se suma.</small></div>
      ${manual() && current?.code ? `<div class="paywall-code"><span>Código de tu negocio</span><b>${esc(current.code)}</b><button type="button" class="secondary" data-action="copySubscriptionCode">Copiar</button></div>` : ''}
      <div class="form-actions"><button class="secondary" data-action="closeModal">Cerrar</button>${owner ? '<button class="secondary" data-action="platformActivate">Activar un negocio</button>' : ''}${(manual() || W.admin()) && current?.status === 'active' ? '<button class="primary" data-action="renewSubscription">Pagar un mes más</button>' : ''}</div>`);
  };
  W.actions.copySubscriptionCode = button => copyCode(button);
  W.actions.renewSubscription = async button => {
    if (manual()) {
      if (info().paymentLink) window.open(info().paymentLink, '_blank', 'noopener');
      W.modal(`<h2 id="modalTitle">Pagar un mes más</h2><p class="modal-subtitle">Se abrió Wompi en otra pestaña. Cuando pagues, envía el comprobante con el código de tu negocio; el mes nuevo se suma a los días que te quedan.</p>
        <div class="paywall-code"><span>Código de tu negocio</span><b>${esc(current?.code || '')}</b><button type="button" class="secondary" data-action="copySubscriptionCode">Copiar</button></div>
        <div class="form-actions"><button class="secondary" data-action="closeModal">Cerrar</button><a class="primary button" href="${esc(whatsappUrl())}" target="_blank" rel="noopener">Enviar comprobante por WhatsApp</a></div>`);
      return;
    }
    button.disabled = true; button.classList.add('loading');
    try { await window.api.startPayment(W.token, 'mensual'); } catch (error) { button.disabled = false; button.classList.remove('loading'); W.toast('No se pudo abrir el pago', W.cleanError(error), 'error', true); }
  };

  // Panel del administrador de WannaShop: activa meses a un negocio con el código que le envía el cliente.
  // Solo lo ve esa cuenta, y las reglas de la nube rechazan a cualquier otra.
  W.actions.platformActivate = () => {
    if (!owner) return;
    W.modal(`<h2 id="modalTitle">Activar suscripción</h2><p class="modal-subtitle">Revisa el pago en tu panel de Wompi y escribe el código que te envió el cliente.</p>
      <form id="platformActivateForm"><div class="form-grid">
        <label class="field">Código del negocio<input name="code" required autocomplete="off" spellcheck="false" value="${esc(current?.status === 'expired' ? current.code || '' : '')}"></label>
        <label class="field">Meses pagados<select name="months"><option value="1">1 mes (${W.money(PRICE)})</option><option value="3">3 meses (${W.money(PRICE * 3)})</option><option value="6">6 meses (${W.money(PRICE * 6)})</option><option value="12">12 meses (${W.money(PRICE * 12)})</option></select></label></div>
        <div id="platformActivateState" class="sub-state"><small>Escribe el código y toca «Consultar» para ver su vencimiento actual.</small></div>
        <div class="form-actions"><button type="button" class="secondary" data-lookup>Consultar</button><button type="submit" class="primary">Activar</button></div>
      </form>`);
    const form = $('#platformActivateForm'), state = $('#platformActivateState');
    const show = (html, kind = '') => { state.className = `sub-state ${kind}`; state.innerHTML = html; };
    form.querySelector('[data-lookup]').addEventListener('click', async () => {
      try { const result = await window.api.lookupSubscription(W.token, form.code.value); show(result.until && new Date(result.until) > new Date() ? `<b>Activa hasta el ${esc(date(result.until))}</b><small>Los meses nuevos se suman a esa fecha.</small>` : `<b>Sin suscripción vigente</b><small>${result.until ? `Venció el ${esc(date(result.until))}.` : 'Nunca ha pagado.'} Los meses empiezan a contar hoy.</small>`, result.until && new Date(result.until) > new Date() ? 'active' : 'expired'); }
      catch (error) { show(`<b>${esc(W.cleanError(error))}</b>`, 'expired'); }
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('[type=submit]'); button.disabled = true; button.classList.add('loading');
      try {
        const result = await window.api.activateSubscription(W.token, form.code.value, form.months.value);
        show(`<b>Activada hasta el ${esc(date(result.until))}</b><small>El cliente ya puede usar el programa.</small>`, 'active');
        W.toast('Suscripción activada', `Vence el ${date(result.until)}.`);
        if (result.code === current?.code) { await check(); if ($('#shell').classList.contains('hidden')) { W.closeModal(); open(); } }
      } catch (error) {
        show(`<b>No se pudo activar</b><small>${esc(/permis|guardar/i.test(W.cleanError(error)) ? 'El código no corresponde a ningún negocio, o esta cuenta no tiene permiso.' : W.cleanError(error))}</small>`, 'expired');
      } finally { button.disabled = false; button.classList.remove('loading'); }
    });
  };

  const baseDashboard = W.routes.dashboard;
  W.routes.dashboard = () => {
    baseDashboard();
    if (current?.status !== 'active' || current.daysLeft > 5) return;
    $('#app').insertAdjacentHTML('afterbegin', `<div class="sub-strip"><span><b>Tu suscripción vence en ${current.daysLeft} día(s)</b><small>Renueva para no interrumpir tu operación.</small></span><button class="primary" data-action="subscription">Renovar</button></div>`);
  };
  const baseSettings = W.routes.settings;
  W.routes.settings = () => {
    baseSettings();
    if (off() || W.data.web?.demo || !(W.admin() || owner)) return;
    $('.settings-layout aside')?.insertAdjacentHTML('afterbegin', `<section class="panel"><div class="panel-head"><div><h2>Suscripción</h2><p>${esc(label(current) || 'Consultando…')}</p></div></div><div class="panel-body settings-actions"><button class="primary" data-action="subscription">Ver suscripción</button>${owner ? '<button class="secondary" data-action="platformActivate">Activar un negocio</button>' : ''}</div></section>`);
  };
})();
