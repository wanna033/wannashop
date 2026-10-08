// Funciones profesionales de la versión en línea: reportes de ventas por período,
// importar el inventario desde Excel y catálogo público para compartir por WhatsApp.
(() => {
  const W = window.WS, $ = W.$, esc = W.esc, money = W.money, num = W.num;
  const day = value => window.Rules.localDay(value);
  const addDays = (iso, days) => { const date = new Date(`${iso}T12:00:00`); date.setDate(date.getDate() + days); return day(date); };
  const span = (from, to) => Math.round((new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 86400000) + 1;
  const metric = (label, value, note, tone = '') => `<article class="metric-card ${tone}"><small>${esc(label)}</small><strong>${value}</strong><span>${esc(note)}</span></article>`;

  // ---------- Reportes de ventas ----------
  W.titles.salesReport = ['ANÁLISIS DE VENTAS', 'Reportes de ventas'];
  const navReports = document.querySelector('#mainNav [data-view="reports"]');
  navReports?.insertAdjacentHTML('beforebegin', '<button data-view="salesReport"><span class="nav-icon">◔</span><span>Reportes de ventas</span></button>');

  W.ui.report = W.ui.report || { period: 'month', from: '', to: '' };
  function range() {
    const today = W.today(), r = W.ui.report;
    if (r.period === 'today') return [today, today];
    if (r.period === 'yesterday') { const y = addDays(today, -1); return [y, y]; }
    if (r.period === 'week') return [addDays(today, -6), today];
    if (r.period === 'lastMonth') { const first = `${today.slice(0, 7)}-01`, end = addDays(first, -1); return [`${end.slice(0, 7)}-01`, end]; }
    if (r.period === 'custom' && r.from && r.to) return r.from <= r.to ? [r.from, r.to] : [r.to, r.from];
    return [`${today.slice(0, 7)}-01`, today];
  }
  function sellers() {
    const map = new Map();
    for (const entry of [...(W.data.operations || []), ...(W.data.audit || [])]) if (entry?.id && entry.userName) map.set(entry.id, entry.userName);
    return map;
  }
  function collect(from, to) {
    const who = sellers(), lines = [], docs = [];
    for (const { type, invoice } of W.invoiceEntries()) {
      if (invoice.status === 'void') continue;
      const d = day(invoice.date); if (d < from || d > to) continue;
      const total = Number(W.account(type, invoice.id)?.total ?? invoice.total ?? 0), seller = who.get(invoice.operationId) || 'Sin dato';
      const place = type === 'closure' ? (invoice.localName || 'Local') : 'Venta directa';
      docs.push({ type, invoice, total, day: d, seller, place, payment: invoice.payment || 'Sin dato' });
      for (const item of invoice.items || []) lines.push({ day: d, number: invoice.number, type, place, customer: invoice.customer?.name || place, seller, payment: invoice.payment || '', name: item.name, size: item.size, sku: item.sku, quantity: Number(item.quantity || 0), price: Number(item.price || 0), cost: Number(item.costAtSale ?? item.cost ?? 0) });
    }
    const revenue = docs.reduce((sum, docItem) => sum + docItem.total, 0), pairs = lines.reduce((sum, line) => sum + line.quantity, 0);
    const cost = lines.reduce((sum, line) => sum + line.quantity * line.cost, 0);
    return { docs, lines, revenue, pairs, cost, profit: revenue - cost, ticket: docs.length ? revenue / docs.length : 0 };
  }
  const change = (now, before) => { if (!before) return now ? 'Sin datos del período anterior' : 'Igual que antes'; const pct = Math.round(((now - before) / before) * 100); return `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs período anterior`; };
  const groupBy = (items, key, value) => { const map = new Map(); for (const item of items) map.set(key(item), (map.get(key(item)) || 0) + value(item)); return [...map.entries()].sort((a, b) => b[1] - a[1]); };
  const rankTable = (title, subtitle, rows, format) => `<section class="panel"><div class="panel-head"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div></div><div class="panel-body">${rows.length ? `<div class="rank-list">${rows.slice(0, 10).map(([label, value], index) => `<div class="rank-row"><span class="rank-pos">${index + 1}</span><span class="rank-label">${esc(label)}</span><span class="rank-bar"><i style="width:${Math.max(4, Math.round(value / rows[0][1] * 100))}%"></i></span><b>${format(value)}</b></div>`).join('')}</div>` : W.empty('◔', 'Sin datos', 'No hay ventas en este período.')}</div></section>`;

  W.routes.salesReport = () => {
    if (!W.admin()) return W.navigate('dashboard');
    const [from, to] = range(), days = span(from, to), prevTo = addDays(from, -1), prevFrom = addDays(from, -days);
    const now = collect(from, to), before = collect(prevFrom, prevTo), r = W.ui.report;
    const series = []; for (let i = 0; i < Math.min(days, 62); i++) { const d = addDays(from, i); series.push([d, now.docs.filter(docItem => docItem.day === d).reduce((sum, docItem) => sum + docItem.total, 0)]); }
    const peak = Math.max(1, ...series.map(([, value]) => value));
    const periods = [['today', 'Hoy'], ['yesterday', 'Ayer'], ['week', '7 días'], ['month', 'Este mes'], ['lastMonth', 'Mes pasado'], ['custom', 'Elegir fechas']];
    $('#app').innerHTML = `<div class="toolbar report-toolbar"><div class="segmented">${periods.map(([key, label]) => `<button class="${r.period === key ? 'active' : ''}" data-action="reportPeriod" data-period="${key}">${label}</button>`).join('')}</div>${r.period === 'custom' ? `<label class="field inline">Desde<input type="date" id="reportFrom" value="${esc(from)}"></label><label class="field inline">Hasta<input type="date" id="reportTo" value="${esc(to)}"></label>` : ''}<span class="toolbar-spacer"></span><button class="secondary" data-action="reportExcel">⇩ Excel del período</button></div>
      <p class="report-range">${esc(from === to ? from : `${from} a ${to}`)} · ${days} día(s)</p>
      <div class="metric-grid">${metric('Ventas', money(now.revenue), change(now.revenue, before.revenue), 'good')}${metric('Documentos', num(now.docs.length), change(now.docs.length, before.docs.length))}${metric('Pares vendidos', num(now.pairs), change(now.pairs, before.pairs))}${metric('Ticket promedio', money(now.ticket), 'Por factura')}${metric('Ganancia bruta aprox.', money(now.profit), now.cost ? `Costo ${money(now.cost)}` : 'Registra costos para verla', now.profit >= 0 ? 'good' : 'warn')}</div>
      <section class="panel"><div class="panel-head"><div><h2>Ventas por día</h2><p>${days > 62 ? 'Primeros 62 días del rango' : 'Cada barra es un día'}</p></div></div><div class="panel-body"><div class="day-bars">${series.map(([d, value]) => `<div class="day-bar" title="${esc(d)} · ${esc(money(value))}"><i style="height:${value ? Math.max(4, Math.round(value / peak * 100)) : 0}%"></i><small>${esc(d.slice(8))}</small></div>`).join('')}</div></div></section>
      <div class="report-grid">
        ${rankTable('Modelos más vendidos', 'Pares en el período', groupBy(now.lines, line => line.name, line => line.quantity), value => `${num(value)} par(es)`)}
        ${rankTable('Tallas más vendidas', 'Pares por talla', groupBy(now.lines, line => `Talla ${line.size}`, line => line.quantity), value => `${num(value)}`)}
        ${rankTable('Por vendedor', 'Quién registró la venta', groupBy(now.docs, docItem => docItem.seller, docItem => docItem.total), money)}
        ${rankTable('Por forma de pago', 'Total facturado', groupBy(now.docs, docItem => docItem.payment, docItem => docItem.total), money)}
        ${rankTable('Por local o canal', 'Ventas directas y cierres de locales', groupBy(now.docs, docItem => docItem.place, docItem => docItem.total), money)}
      </div>`;
    const apply = () => { W.ui.report = { period: 'custom', from: $('#reportFrom').value, to: $('#reportTo').value }; W.render('salesReport'); };
    $('#reportFrom')?.addEventListener('change', apply); $('#reportTo')?.addEventListener('change', apply);
  };
  W.actions.reportPeriod = (_, data) => { W.ui.report = { ...W.ui.report, period: data.period }; W.render('salesReport'); };
  W.actions.reportExcel = async () => {
    const [from, to] = range(), { lines } = collect(from, to);
    if (!lines.length) return W.toast('No hay ventas en este período', '', 'warning');
    try {
      const result = await window.api.exportRows(W.token, { name: `WannaShop-ventas-${from}-a-${to}.xlsx`, sheet: 'Ventas', columns: [['Día', 'day', 12], ['Factura', 'number', 16], ['Tipo', 'kind', 12], ['Cliente / local', 'customer', 24], ['Vendedor', 'seller', 18], ['Pago', 'payment', 14], ['Modelo', 'name', 24], ['Talla', 'size', 8], ['Código', 'sku', 18], ['Pares', 'quantity', 8], ['Precio', 'price', 14, 'money'], ['Total', 'total', 14, 'money']], rows: lines.map(line => ({ ...line, kind: line.type === 'closure' ? 'Cierre' : 'Venta', total: line.quantity * line.price })) });
      if (result?.path) W.toast('Excel descargado', result.path);
    } catch (error) { W.toast('No se pudo exportar', W.cleanError(error), 'error'); }
  };

  // ---------- Importar inventario desde Excel ----------
  W.actions.importProducts = () => {
    if (!W.admin()) return;
    W.modal(`<h2 id="modalTitle">Importar inventario desde Excel</h2><p class="modal-subtitle">Carga muchos modelos de una vez. Cada fila es una talla de un modelo; las filas con el mismo modelo y color quedan como un solo producto con todas sus tallas.</p>
      <ol class="guide-list"><li><b>Descarga la plantilla</b> y llénala en Excel o Google Sheets (también sirve un archivo CSV).</li><li><b>Súbela aquí</b>: verás un resumen antes de guardar. No se guarda nada hasta que confirmes.</li></ol>
      <div class="form-actions"><button class="secondary" data-action="importTemplate">⇩ Descargar plantilla</button><button class="primary" data-action="importPick">⇪ Elegir archivo</button></div>`);
  };
  W.actions.importTemplate = async () => { try { const result = await window.api.importTemplate(W.token); if (result?.path) W.toast('Plantilla descargada', result.path); } catch (error) { W.toast('No se pudo descargar', W.cleanError(error), 'error'); } };
  const clean = value => String(value ?? '').trim();
  const amount = value => { const text = clean(value).replace(/[$\s]/g, ''); if (!text) return 0; const normalized = /,\d{1,2}$/.test(text) ? text.replace(/\./g, '').replace(',', '.') : text.replace(/[.,](?=\d{3}(\D|$))/g, ''); return Number(normalized); };
  function planImport(rows) {
    const products = W.data.products || [], models = new Map(), errors = [], warnings = [];
    rows.forEach((row, index) => {
      const line = index + 2, name = clean(row.modelo), size = clean(row.talla);
      if (!name && !size) return;
      if (!name) return errors.push(`Fila ${line}: falta el modelo.`);
      if (!size) return errors.push(`Fila ${line}: falta la talla de ${name}.`);
      const price = amount(row.precio), cost = amount(row.costo), localPrice = amount(row.preciolocales), pairs = amount(row.pares);
      if (!(price > 0)) return errors.push(`Fila ${line}: el precio de venta de ${name} no es válido.`);
      if ([cost, localPrice, pairs].some(value => Number.isNaN(value) || value < 0) || !Number.isInteger(pairs)) return errors.push(`Fila ${line}: revisa costo, precio para locales o pares de ${name}.`);
      const color = clean(row.color), key = `${name.toLowerCase()}|${color.toLowerCase()}`;
      if (!models.has(key)) models.set(key, { name, brand: clean(row.marca), color, category: clean(row.categoria) || 'Casual', cost, price, localPrice, sizes: new Map() });
      const model = models.get(key);
      if (model.sizes.has(size.toLowerCase())) return errors.push(`Fila ${line}: la talla ${size} de ${name} está repetida.`);
      model.sizes.set(size.toLowerCase(), { size, pairs, sku: clean(row.codigo) });
    });
    const commands = [];
    let newModels = 0, newSizes = 0, units = 0;
    for (const model of models.values()) {
      const existing = products.filter(p => p.name.toLowerCase() === model.name.toLowerCase() && String(p.color || '').toLowerCase() === model.color.toLowerCase());
      const pid = existing[0]?.pid, known = new Set(existing.map(p => String(p.size).toLowerCase()));
      const fresh = [...model.sizes.values()].filter(variant => !known.has(variant.size.toLowerCase()));
      const repeated = [...model.sizes.values()].filter(variant => known.has(variant.size.toLowerCase()));
      if (repeated.length) warnings.push(`${model.name}: las tallas ${repeated.map(v => v.size).join(', ')} ya existen y no se tocan (usa Compras para sumar pares).`);
      if (!fresh.length && pid) continue;
      if (!pid) newModels++;
      newSizes += fresh.length; units += fresh.reduce((sum, variant) => sum + variant.pairs, 0);
      const variants = [...existing.map(p => ({ sku: p.sku, size: p.size })), ...fresh.map(variant => ({ size: variant.size, openingStock: variant.pairs, ...(variant.sku ? { sku: variant.sku } : {}) }))];
      const base = existing[0];
      commands.push({ label: model.name, type: 'product.upsert', payload: { product: { pid, name: base?.name || model.name, brand: base?.brand ?? model.brand, color: base?.color ?? model.color, category: base?.category || model.category, cost: base?.cost ?? model.cost, price: base?.price ?? model.price, localPrice: base?.localPrice ?? model.localPrice, image: base?.image || '', variants } } });
    }
    return { commands, errors, warnings, newModels, newSizes, units, models: models.size };
  }
  W.actions.importPick = async () => {
    let parsed;
    try { parsed = await window.api.readSpreadsheet(W.token); } catch (error) { return W.toast('No se pudo leer el archivo', W.cleanError(error), 'error'); }
    if (!parsed) return;
    const plan = planImport(parsed.rows);
    W.ui.importPlan = plan;
    W.modal(`<h2 id="modalTitle">Revisa antes de importar</h2><p class="modal-subtitle">${esc(parsed.name)} · ${parsed.rows.length} fila(s) leídas.</p>
      <div class="metric-grid">${metric('Modelos nuevos', num(plan.newModels), `${plan.models} en el archivo`)}${metric('Tallas nuevas', num(plan.newSizes), 'Cada una con su código')}${metric('Pares', num(plan.units), 'Entran al inventario', 'good')}</div>
      ${plan.errors.length ? `<div class="error-box">${plan.errors.slice(0, 12).map(esc).join('<br>')}${plan.errors.length > 12 ? `<br>…y ${plan.errors.length - 12} más.` : ''}</div>` : ''}
      ${plan.warnings.length ? `<div class="import-warnings">${plan.warnings.slice(0, 8).map(esc).join('<br>')}</div>` : ''}
      <div class="form-actions"><button class="secondary" data-action="importProducts">Volver</button><button class="primary" data-action="importRun" ${plan.errors.length || !plan.commands.length ? 'disabled' : ''}>${plan.errors.length ? 'Corrige los errores' : plan.commands.length ? `Importar ${plan.commands.length} modelo(s)` : 'Nada nuevo para importar'}</button></div>`, { wide: true });
  };
  W.actions.importRun = async (button) => {
    const plan = W.ui.importPlan; if (!plan?.commands.length) return;
    button.disabled = true; button.classList.add('loading');
    try {
      const response = await window.api.bulkCommand(W.token, plan.commands.map(({ label, ...command }) => ({ ...command, label, operationId: W.id('IMP') })));
      W.data = response.data; W.syncChrome(); W.closeModal(); W.render('inventory');
      W.toast('Inventario importado', `${plan.commands.length} modelo(s) · ${num(plan.units)} par(es).`);
    } catch (error) { button.disabled = false; button.classList.remove('loading'); W.toast('No se importó nada', W.cleanError(error), 'error', true); }
  };

  // ---------- Catálogo público ----------
  const phoneDigits = value => { const digits = String(value || '').replace(/\D/g, ''); return digits.length === 10 && digits.startsWith('3') ? `57${digits}` : digits; };
  W.actions.catalog = async () => {
    if (!W.admin()) return;
    let status = {};
    try { status = await window.api.catalogStatus(W.token); } catch (error) { return W.toast('No se pudo consultar el catálogo', W.cleanError(error), 'error'); }
    const url = status.url, s = W.data.settings || {};
    W.modal(`<h2 id="modalTitle">Catálogo para tus clientes</h2><p class="modal-subtitle">Una página pública con tus modelos, fotos, precios y tallas disponibles. Tus clientes la abren desde el enlace (sin cuenta) y te escriben por WhatsApp. No muestra costos, cantidades ni datos internos.</p>
      <div class="catalog-state ${status.published ? 'on' : ''}"><b>${status.published ? 'Publicado' : 'Sin publicar'}</b><small>${status.published ? `${num(status.count || 0)} modelo(s) · actualizado ${esc(status.updated || '')}` : 'Publícalo para obtener el enlace.'}</small></div>
      ${status.published ? `<div class="invite-box">${esc(url)}</div>` : ''}
      <form id="catalogForm"><div class="form-grid"><label class="field">WhatsApp para pedidos<input name="phone" inputmode="tel" value="${esc(status.phone || s.phone || '')}" placeholder="300 000 0000"></label><label class="check-row"><input type="checkbox" name="showPrices" ${status.showPrices === false ? '' : 'checked'}> Mostrar precios</label></div>
      <div class="form-actions">${status.published ? '<button type="button" class="danger" data-action="catalogOff">Dejar de publicar</button><button type="button" class="secondary" data-action="catalogShare">Enviar por WhatsApp</button><button type="button" class="secondary" data-action="copyText" data-text="' + esc(url) + '">Copiar enlace</button>' : ''}<button class="primary">${status.published ? 'Actualizar catálogo' : 'Publicar catálogo'}</button></div></form>`, { wide: true, onOpen: () => {
      $('#catalogForm').onsubmit = async event => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget)), button = event.currentTarget.querySelector('.primary');
        button.disabled = true; button.classList.add('loading');
        try { const result = await window.api.publishCatalog(W.token, { phone: phoneDigits(values.phone), showPrices: values.showPrices === 'on' }); W.toast('Catálogo publicado', `${result.count} modelo(s) con stock.`); W.actions.catalog(); }
        catch (error) { button.disabled = false; button.classList.remove('loading'); W.toast('No se pudo publicar', W.cleanError(error), 'error'); }
      };
    } });
    W.ui.catalogUrl = url;
  };
  W.actions.catalogShare = () => window.api.openLink(W.token, `https://wa.me/?text=${encodeURIComponent(`Mira nuestro catálogo de ${W.data.settings?.storeName || 'calzado'}: ${W.ui.catalogUrl}`)}`).catch(error => W.toast('No se pudo abrir WhatsApp', W.cleanError(error), 'error'));
  W.actions.catalogOff = async () => {
    if (!await W.confirm({ title: 'Dejar de publicar el catálogo', message: 'El enlace dejará de mostrar tus productos. Puedes volver a publicarlo cuando quieras.', confirmText: 'Dejar de publicar', danger: true })) return;
    try { await window.api.unpublishCatalog(W.token); W.toast('Catálogo despublicado'); } catch (error) { W.toast('No se pudo despublicar', W.cleanError(error), 'error'); }
  };

  // Botones en Inventario (solo administrador).
  const baseInventory = W.routes.inventory;
  W.routes.inventory = () => {
    baseInventory();
    if (!W.admin()) return;
    const anchor = $('#app .toolbar [data-action="printLabels"]');
    anchor?.insertAdjacentHTML('afterend', '<button class="secondary" data-action="importProducts">⇪ Importar Excel</button><button class="secondary" data-action="catalog">🔗 Catálogo</button>');
  };
})();
