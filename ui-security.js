// Seguridad de la sesión en la web:
// - Cierre de sesión por inactividad (lo fija el administrador para todos los equipos del negocio; 60 min por defecto).
// - Si alguien vuelve a abrir la página después de ese tiempo, debe entrar otra vez.
// - Al cambiar de cuenta o de negocio en otra pestaña, esta se recarga para no mezclar datos.
(() => {
  const W = window.WS, $ = W.$, esc = W.esc;
  const KEY = 'wannashop.lastActive', DEFAULT_MINUTES = 60;
  const minutes = () => { const value = Number(W.data?.settings?.idleMinutes ?? stored()); return Number.isFinite(value) ? value : DEFAULT_MINUTES; };
  // El tiempo elegido se recuerda en el equipo para poder revisarlo antes de cargar los datos.
  const stored = () => { try { const value = localStorage.getItem('wannashop.idleMinutes'); return value === null ? DEFAULT_MINUTES : Number(value); } catch { return DEFAULT_MINUTES; } };
  const lastActive = () => { try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; } };
  let last = Date.now();
  W.markActive = () => { last = Date.now(); try { localStorage.setItem(KEY, String(last)); } catch {} };
  const inSession = () => Boolean(W.data) && !W.data.web?.demo;
  const message = () => `Por seguridad se cerró la sesión después de ${minutes()} minutos sin uso. Vuelve a entrar.`;

  async function lock() {
    try { await window.api.logout(W.token); } catch {}
    W.token = ''; W.data = null; W.closeModal?.();
    W.showWelcome ? W.showWelcome(message()) : location.reload();
  }

  // Actividad: tocar, escribir o desplazarse. Se guarda como mucho una vez cada 20 segundos.
  let saved = 0;
  const activity = () => { last = Date.now(); if (last - saved > 20000) { saved = last; try { localStorage.setItem(KEY, String(last)); } catch {} } };
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) document.addEventListener(type, activity, { passive: true, capture: true });
  setInterval(() => {
    const limit = minutes();
    if (!limit || !inSession()) return;
    // Otra pestaña del mismo equipo pudo estar en uso: cuenta la actividad más reciente de todas.
    const recent = Math.max(last, lastActive());
    if (Date.now() - recent > limit * 60000) lock();
  }, 30000);

  // Al volver a abrir la página: si pasó más tiempo del permitido, se pide entrar de nuevo.
  const baseEnter = W.enterShell;
  W.enterShell = async (...args) => {
    const limit = stored(), previous = lastActive(), resumed = !W.freshSignIn;
    W.freshSignIn = false;
    if (resumed && limit && previous && Date.now() - previous > limit * 60000 && !window.api?.demo) {
      W.markActive();
      try { await window.api.logout(W.token); } catch {}
      W.token = ''; W.data = null;
      return W.showWelcome?.(`Por seguridad se cerró la sesión después de ${limit} minutos sin uso. Vuelve a entrar.`);
    }
    W.markActive();
    const result = await baseEnter(...args);
    try { localStorage.setItem('wannashop.idleMinutes', String(minutes())); } catch {}
    return result;
  };

  // Otra pestaña cerró la sesión o cambió de negocio: esta no sigue mostrando datos viejos.
  window.addEventListener('storage', event => {
    if (event.key === 'wannashop.business' && inSession() && event.newValue && event.newValue !== W.data?.web?.business?.id) location.reload();
  });

  // Sin internet: aviso fijo arriba para que nadie crea que guardó algo; al volver la señal se actualizan los datos.
  const offline = document.createElement('div');
  offline.className = 'offline-bar hidden'; offline.setAttribute('role', 'status');
  offline.innerHTML = '<b>Sin conexión a internet.</b> <span>Puedes consultar; los cambios no se guardan hasta que vuelva la señal.</span>';
  document.body.append(offline);
  const syncOnline = () => { const down = navigator.onLine === false; offline.classList.toggle('hidden', !down); document.documentElement.classList.toggle('is-offline', down); };
  window.addEventListener('offline', syncOnline);
  window.addEventListener('online', () => { syncOnline(); if (inSession()) { W.toast('Conexión recuperada', 'Ya puedes seguir registrando.'); W.reload?.(); } });
  syncOnline();

  // Configuración → Seguridad (solo el administrador).
  const baseSettings = W.routes.settings;
  W.routes.settings = () => {
    baseSettings();
    if (!W.admin() || W.data.web?.demo) return;
    const current = minutes(), options = [[15, '15 minutos'], [30, '30 minutos'], [60, '1 hora'], [120, '2 horas'], [240, '4 horas'], [0, 'Nunca (no recomendado)']];
    $('.settings-layout aside')?.insertAdjacentHTML('beforeend', `<section class="panel"><div class="panel-head"><div><h2>Seguridad</h2><p>Protege la información si un equipo queda solo</p></div></div><div class="panel-body"><label class="field">Cerrar la sesión tras inactividad<select id="idleMinutes">${options.map(([value, label]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select><small>Aplica en todos los equipos y celulares del negocio.</small></label><ul class="security-list"><li>Entrada solo con cuentas verificadas de Google${window.api?.signInOptions?.apple ? ' o Apple' : ''}.</li><li>Cada negocio está aislado: nadie más ve sus datos.</li><li>Copias automáticas cada hora y cada día.</li><li>Historial de quién hizo cada movimiento.</li></ul></div></section>`);
    $('#idleMinutes')?.addEventListener('change', async event => {
      const value = Number(event.target.value);
      const result = await W.command('settings.update', { settings: { idleMinutes: value } }, { success: 'Seguridad actualizada', detail: value ? `La sesión se cerrará tras ${value} minutos sin uso.` : 'La sesión no se cerrará sola.' });
      if (result) { try { localStorage.setItem('wannashop.idleMinutes', String(value)); } catch {} }
    });
  };
})();
