// Tema de la página: claro (predeterminado) u oscuro, según lo que eligió cada persona en este equipo.
// Se carga en <head> antes de pintar, así no se ve un parpadeo de colores.
// La página no se deja mostrar dentro de otra (evita que la disfracen para robar clics o datos).
if (window.top !== window.self) {
  document.documentElement.style.display = 'none';
  try { window.top.location = window.location.href; } catch {}
}
(() => {
  const KEY = 'wannashop.theme';
  let theme = 'light';
  try { theme = localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; } catch {}
  const apply = name => {
    theme = name;
    document.documentElement.dataset.theme = name;
    document.querySelectorAll('link[data-light]').forEach(link => { const href = name === 'dark' ? link.dataset.dark : link.dataset.light; if (link.getAttribute('href') !== href) link.setAttribute('href', href); });
    document.querySelectorAll('link[data-light-only]').forEach(link => { link.disabled = name === 'dark'; });
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', name === 'dark' ? '#030817' : '#f4f6fb');
  };
  window.wsTheme = {
    get: () => theme,
    set(name) { apply(name === 'dark' ? 'dark' : 'light'); try { localStorage.setItem(KEY, theme); } catch {} },
    toggle() { this.set(theme === 'dark' ? 'light' : 'dark'); }
  };
  apply(theme);
})();
