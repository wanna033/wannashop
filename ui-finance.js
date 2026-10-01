(() => {
  const W = window.WS, $ = W.$, esc = W.esc, money = W.money, R = window.Rules;
  const METHODS = ['Efectivo', 'Transferencia', 'Tarjeta', 'Crédito', 'Otro'];
  const metric = (label, value, note, tone = '') => `<article class="metric-card ${tone}"><small>${esc(label)}</small><strong>${value}</strong><span>${esc(note)}</span></article>`;
  const diffBadge = diff => diff === 0 ? W.statusBadge('Cuadra', 'success') : diff > 0 ? W.statusBadge(`Sobra ${money(diff)}`, 'warning') : W.statusBadge(`Falta ${money(-diff)}`, 'danger');
  const dayLabel = day => W.shortDate(`${day}T12:00:00`);

  // ---------- Caja del día ----------
  W.routes.cash = () => {
    const day = W.ui.cashDate || W.today(), summary = R.cashSummary(W.data, day);
    const closes = (W.data.cashCloses || []).filter(close => close.date === day), last = closes[closes.length - 1];
    const methods = Object.entries(summary.byMethod).filter(([, value]) => value !== 0);
    const others = methods.filter(([method]) => method !== 'Efectivo').reduce((sum, [, value]) => sum + value, 0);
    const opening = last ? last.opening : 0;
    const methodTable = methods.length
      ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Forma de pago</th><th>Valor</th></tr></thead><tbody>${methods.map(([method, value]) => `<tr><td><b>${esc(method)}</b></td><td>${money(value)}</td></tr>`).join('')}</tbody></table></div>`
      : W.empty('◎', 'Sin cobros este día', 'Las ventas, cierres y abonos con pago aparecerán aquí.');
    const history = closes.length
      ? `<section class="panel"><div class="panel-head"><div><h2>Cuadres guardados</h2><p>${esc(dayLabel(day))}</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Hora</th><th>Contado</th><th>Resultado</th><th>Por</th></tr></thead><tbody>${closes.slice().reverse().map(close => `<tr><td>${W.date(close.closedAt)}</td><td>${money(close.counted)}</td><td>${diffBadge(close.difference)}</td><td>${esc(close.userName || '')}</td></tr>`).join('')}</tbody></table></div></section>`
      : '';
    $('#app').innerHTML = `<div class="toolbar"><label class="field compact-field">Día<input id="cashDate" type="date" value="${esc(day)}"></label></div>
      <div class="metric-grid" style="grid-template-columns:repeat(4,1fr)">${metric('Efectivo recibido', money(summary.cashIn), 'Ventas, cierres y abonos', 'good')}${metric('Gastos en efectivo', money(summary.cashExpenses), 'Pagados de la caja', summary.cashExpenses ? 'warn' : '')}${metric('Otros medios', money(others), 'Transferencia, tarjeta y demás')}${metric('Debe haber en caja', money(opening + summary.expectedCash), opening ? `Incluye base de ${money(opening)}` : 'Sin contar la base')}</div>
      <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Dinero del día por forma de pago</h2><p>Lo cobrado menos reembolsos</p></div></div>${methodTable}</section>
      <aside><section class="panel"><div class="panel-head"><div><h2>Cuadrar caja</h2><p>Cuenta el efectivo y compáralo</p></div></div><form id="cashForm" class="panel-body"><div class="form-grid"><label class="field">Base con la que abrió<input name="opening" id="cashOpening" type="number" min="0" value="${opening}"></label><label class="field">Efectivo contado<input name="counted" id="cashCounted" type="number" min="0" required placeholder="Cuenta los billetes"></label><label class="field span-2">Nota<input name="note" placeholder="Opcional"></label></div><div class="summary-line"><span>Debe haber</span><b id="cashExpected">${money(opening + summary.expectedCash)}</b></div><div class="summary-line total"><span>Diferencia</span><span id="cashDiff">—</span></div><div class="form-actions"><button class="primary">Guardar cuadre</button></div></form></section>${history}</aside></div>`;
    $('#cashDate').onchange = event => { W.ui.cashDate = event.target.value; W.routes.cash(); };
    const expected = () => (Number($('#cashOpening').value) || 0) + summary.expectedCash;
    const update = () => {
      $('#cashExpected').textContent = money(expected());
      const counted = $('#cashCounted').value;
      $('#cashDiff').innerHTML = counted === '' ? '—' : diffBadge(Number(counted) - expected());
    };
    $('#cashOpening').oninput = update;
    $('#cashCounted').oninput = update;
    $('#cashForm').onsubmit = async event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const result = await W.command('cash.close', { date: day, opening: values.opening || 0, counted: values.counted, note: values.note }, { success: 'Cuadre de caja guardado' });
      if (!result) return;
      W.render('cash');
      if (result.difference) W.toast(result.difference > 0 ? 'Sobra dinero en caja' : 'Falta dinero en caja', money(Math.abs(result.difference)), 'warning', true);
    };
  };

  // ---------- Gastos (solo administrador) ----------
  W.routes.expenses = () => {
    if (!W.admin()) return W.navigate('dashboard');
    const month = W.ui.expenseMonth || W.today().slice(0, 7);
    const rows = (W.data.expenses || []).filter(expense => String(expense.date).slice(0, 7) === month).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const active = rows.filter(expense => expense.status !== 'void');
    const total = active.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const byCategory = {};
    for (const expense of active) byCategory[expense.category] = (byCategory[expense.category] || 0) + Number(expense.amount || 0);
    const entries = W.invoiceEntries().filter(entry => entry.invoice.status !== 'void' && R.localDay(entry.invoice.date).slice(0, 7) === month);
    const revenue = entries.reduce((sum, entry) => sum + Number(W.account(entry.type, entry.invoice.id)?.total ?? entry.invoice.total ?? 0), 0);
    const cost = entries.reduce((sum, entry) => sum + (entry.invoice.items || []).reduce((part, item) => part + Number(item.quantity) * Number(item.costAtSale ?? item.cost ?? 0), 0), 0);
    const profit = revenue - cost - total;
    const list = rows.length
      ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Fecha</th><th>Categoría</th><th>Detalle</th><th>Pago</th><th>Valor</th><th></th></tr></thead><tbody>${rows.map(expense => `<tr class="${expense.status === 'void' ? 'muted-row' : ''}"><td>${esc(dayLabel(expense.date))}</td><td>${esc(expense.category)}</td><td class="wrap">${esc(expense.description)}${expense.status === 'void' ? `<br><small>Anulado: ${esc(expense.voided?.reason || '')}</small>` : ''}</td><td>${esc(expense.method)}</td><td><b>${money(expense.amount)}</b></td><td>${expense.status === 'void' ? W.statusBadge('Anulado', 'neutral') : `<button class="icon-button" data-action="voidExpense" data-id="${esc(expense.id)}" aria-label="Anular gasto">×</button>`}</td></tr>`).join('')}</tbody></table></div>`
      : W.empty('⇡', 'Sin gastos este mes', 'Registra arriendo, transporte, nómina y demás para ver tu ganancia real.', '<button class="primary" data-action="newExpense">Registrar gasto</button>');
    const categories = Object.keys(byCategory).length
      ? `<div class="panel-body">${Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([category, value]) => `<div class="summary-line"><span>${esc(category)}</span><b>${money(value)}</b></div>`).join('')}</div>`
      : W.empty('Σ', 'Nada que resumir', 'Aparecerá al registrar gastos.');
    $('#app').innerHTML = `<div class="toolbar"><label class="field compact-field">Mes<input id="expenseMonth" type="month" value="${esc(month)}"></label><span class="toolbar-spacer"></span><button class="primary" data-action="newExpense">＋ Registrar gasto</button></div>
      <div class="metric-grid" style="grid-template-columns:repeat(4,1fr)">${metric('Facturado del mes', money(revenue), `${entries.length} documento(s)`)}${metric('Costo de lo vendido', money(cost), 'Según cada factura')}${metric('Gastos del mes', money(total), `${active.length} registro(s)`, total ? 'warn' : '')}${metric('Ganancia real', money(profit), 'Facturado − costo − gastos', profit >= 0 ? 'good' : 'bad')}</div>
      <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Gastos registrados</h2><p>Los anulados quedan en el historial</p></div></div>${list}</section><aside><section class="panel"><div class="panel-head"><div><h2>Por categoría</h2><p>${esc(month)}</p></div></div>${categories}</section></aside></div>`;
    $('#expenseMonth').onchange = event => { W.ui.expenseMonth = event.target.value; W.routes.expenses(); };
  };
  W.actions.newExpense = () => W.modal(`<h2 id="modalTitle">Registrar gasto</h2><p class="modal-subtitle">Los gastos solo los ve el administrador. Si lo pagas de la caja, elige Efectivo para que el cuadre lo descuente.</p><form id="expenseForm"><div class="form-grid"><label class="field">Fecha<input name="date" type="date" value="${W.today()}" required></label><label class="field">Categoría<select name="category">${R.EXPENSE_CATEGORIES.map(category => `<option>${esc(category)}</option>`).join('')}</select></label><label class="field span-2">Detalle<input name="description" required placeholder="Ej. Transporte de mercancía a locales"></label><label class="field">Valor<input name="amount" type="number" min="1" required></label><label class="field">Cómo se pagó<select name="method">${METHODS.map(method => `<option>${esc(method)}</option>`).join('')}</select></label></div><div class="form-actions"><button type="button" class="secondary" data-action="closeModal">Cancelar</button><button class="primary">Guardar gasto</button></div></form>`, { onOpen: () => {
    $('#expenseForm').onsubmit = async event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const result = await W.command('expense.create', values, { success: 'Gasto registrado' });
      if (result) { W.ui.expenseMonth = String(values.date).slice(0, 7); W.closeModal(); W.render('expenses'); }
    };
  } });
  W.actions.voidExpense = async (_, data) => {
    const reason = await W.confirm({ title: 'Anular gasto', message: 'El gasto queda en el historial marcado como anulado.', confirmText: 'Anular', danger: true, requireText: 'Motivo de la anulación' });
    if (!reason) return;
    const result = await W.command('expense.void', { id: data.id, reason }, { success: 'Gasto anulado' });
    if (result) W.render('expenses');
  };

  // ---------- Conteo físico ----------
  function paintCount() {
    const list = $('#countList'); if (!list) return;
    const entries = Object.entries(W.ui.count || {}).map(([sku, counted]) => ({ product: W.data.products.find(p => p.sku === sku), counted })).filter(entry => entry.product);
    const differences = entries.filter(entry => entry.counted !== Number(entry.product.stock)).length;
    list.innerHTML = entries.length
      ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Modelo</th><th>Talla</th><th>En sistema</th><th>Contado</th><th>Diferencia</th></tr></thead><tbody>${entries.map(({ product, counted }) => {
          const diff = counted - Number(product.stock);
          const badge = diff === 0 ? W.statusBadge('Coincide', 'success') : W.statusBadge(`${diff > 0 ? '+' : ''}${diff}`, diff > 0 ? 'warning' : 'danger');
          return `<tr><td><b>${esc(product.name)}</b><br><small>${esc(product.sku)}</small></td><td>${esc(product.size)}</td><td>${product.stock}</td><td><span class="stepper"><button type="button" class="icon-button" data-action="countStep" data-sku="${esc(product.sku)}" data-step="-1" aria-label="Restar">−</button><input type="number" min="0" value="${counted}" data-count-sku="${esc(product.sku)}" class="count-input"><button type="button" class="icon-button" data-action="countStep" data-sku="${esc(product.sku)}" data-step="1" aria-label="Sumar">+</button></span></td><td>${badge}</td></tr>`;
        }).join('')}</tbody></table></div>`
      : W.empty('☰', 'Empieza a contar', 'Escanea un código o elige un modelo para cargar todas sus tallas.');
    W.$$('[data-count-sku]').forEach(input => { input.onchange = () => { W.ui.count[input.dataset.countSku] = Math.max(0, Math.floor(Number(input.value) || 0)); paintCount(); }; });
    const summary = $('#countSummary');
    if (summary) summary.textContent = entries.length ? `${entries.length} código(s) contados · ${differences} con diferencia` : '';
  }
  W.actions.stockCount = () => {
    W.ui.count = {};
    W.modal(`<h2 id="modalTitle">Conteo físico</h2><p class="modal-subtitle">Escanea cada par (cada lectura suma 1) o carga un modelo y escribe las cantidades. Solo se ajustan los códigos que cuentes.</p><div class="count-bar"><input id="countScan" class="search-field" placeholder="Escanea o escribe el código y Enter" autocomplete="off"><select id="countModel"><option value="">Cargar todas las tallas de un modelo…</option>${W.groups().map(group => `<option value="${esc(group.pid)}">${esc(group.name)}</option>`).join('')}</select></div><div id="countList" class="pick-scroll"></div><div class="form-actions"><span class="toolbar-spacer mini-note" id="countSummary"></span><button type="button" class="secondary" data-action="closeModal">Cancelar</button><button type="button" class="primary" data-action="applyCount">Aplicar conteo</button></div>`, { wide: true, onOpen: () => {
      paintCount();
      const scan = $('#countScan');
      scan.onkeydown = event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const code = scan.value.trim().toLowerCase(); if (!code) return;
        const product = W.data.products.find(p => p.active !== false && String(p.sku).toLowerCase() === code);
        if (!product) { W.toast('Código no encontrado', scan.value.trim(), 'warning'); scan.select(); return; }
        W.ui.count[product.sku] = (W.ui.count[product.sku] || 0) + 1;
        scan.value = ''; paintCount(); scan.focus();
      };
      $('#countModel').onchange = event => {
        const group = W.group(event.target.value);
        if (group) group.sizes.forEach(size => { if (!(size.sku in W.ui.count)) W.ui.count[size.sku] = 0; });
        event.target.value = ''; paintCount(); scan.focus();
      };
    } });
  };
  W.actions.countStep = (_, data) => { W.ui.count[data.sku] = Math.max(0, (W.ui.count[data.sku] || 0) + Number(data.step)); paintCount(); };
  W.actions.applyCount = async () => {
    const lines = Object.entries(W.ui.count || {}).map(([sku, counted]) => ({ sku, counted }));
    if (!lines.length) return W.toast('Aún no has contado nada', 'Escanea un código o carga un modelo.', 'warning');
    const result = await W.command('stock.count', { lines, reason: 'Conteo físico' }, { success: 'Conteo aplicado' });
    if (!result) return;
    W.ui.count = {}; W.closeModal(); W.render('inventory');
    W.toast(result.adjusted ? `${result.adjusted} código(s) ajustados` : 'Todo coincidía', `${result.checked} código(s) revisados`);
  };

  // ---------- Recordatorio de cobro por WhatsApp ----------
  W.actions.remindWhatsApp = async (_, data) => {
    const entry = W.invoiceEntries().find(item => item.type === data.type && item.invoice.id === data.id); if (!entry) return;
    const account = W.account(data.type, data.id) || {}, digits = String(entry.invoice.customer?.phone || '').replace(/\D/g, '');
    if (!digits) return W.toast('Sin teléfono', 'Este cliente o local no tiene teléfono guardado.', 'warning');
    const number = digits.length === 10 ? '57' + digits : digits, store = W.data.settings.storeName || 'WannaShop';
    const due = account.dueDate ? ` ${account.dueDate < W.today() ? 'Venció' : 'Vence'} el ${dayLabel(account.dueDate)}.` : '';
    const text = `Hola ${entry.invoice.customer?.name || ''}, te saluda ${store}. Te recordamos el saldo pendiente de ${money(account.balance)} de la factura ${entry.invoice.number}.${due} ¡Gracias!`;
    try { await window.api.openLink(W.token, `https://wa.me/${number}?text=${encodeURIComponent(text)}`); W.toast('Abriendo WhatsApp', 'Revisa el mensaje y envíalo.'); }
    catch (error) { W.toast('No se pudo abrir WhatsApp', W.cleanError(error), 'error'); }
  };
})();
