// Kardex: historial de entradas y salidas de cada talla con el saldo después de cada movimiento.
// Sirve para auditar la bodega: de dónde salió o entró cada par y quién lo registró.
(() => {
  const W = window.WS, $ = W.$, esc = W.esc;
  const date = iso => { const value = new Date(iso); return Number.isNaN(value.getTime()) ? '' : value.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };

  // Movimientos de las tallas elegidas, del más reciente al más antiguo, con el saldo calculado hacia atrás
  // desde la existencia actual (así coincide siempre con lo que hay en bodega).
  function rows(sizes) {
    const skus = new Set(sizes.map(size => size.sku)), balance = new Map(sizes.map(size => [size.sku, Number(size.stock) || 0]));
    const sizeOf = new Map(sizes.map(size => [size.sku, size.size]));
    return (W.data.movements || []).filter(move => skus.has(move.sku)).slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).map(move => {
      const quantity = Number(move.quantity) || 0, after = balance.get(move.sku);
      balance.set(move.sku, after - quantity);
      return { date: move.date, type: move.type, note: move.note || '', size: sizeOf.get(move.sku), sku: move.sku, input: quantity > 0 ? quantity : 0, output: quantity < 0 ? -quantity : 0, balance: after };
    });
  }

  W.actions.kardex = (_, data) => {
    const group = W.group(data.id);
    if (!group) return;
    const filter = data.sku || 'all', sizes = filter === 'all' ? group.sizes : group.sizes.filter(size => size.sku === filter);
    const list = rows(sizes), totalIn = list.reduce((sum, row) => sum + row.input, 0), totalOut = list.reduce((sum, row) => sum + row.output, 0);
    W.ui.kardex = { group, list };
    W.closeDrawer?.();
    W.modal(`<h2 id="modalTitle">Kardex · ${esc(group.name)}</h2><p class="modal-subtitle">Cada entrada y salida de la bodega con el saldo que quedó. Se registra solo con cada venta, despacho, devolución, compra o ajuste.</p>
      <div class="kardex-sizes"><button class="${filter === 'all' ? 'primary' : 'secondary'}" data-action="kardex" data-id="${esc(group.pid)}" data-sku="all">Todas</button>${group.sizes.map(size => `<button class="${filter === size.sku ? 'primary' : 'secondary'}" data-action="kardex" data-id="${esc(group.pid)}" data-sku="${esc(size.sku)}">T ${esc(size.size)} · ${Number(size.stock) || 0}</button>`).join('')}</div>
      <div class="detail-grid kardex-totals"><div class="detail-item"><small>Entradas</small><b>${W.num(totalIn)} pares</b></div><div class="detail-item"><small>Salidas</small><b>${W.num(totalOut)} pares</b></div><div class="detail-item"><small>Saldo actual</small><b>${W.num(sizes.reduce((sum, size) => sum + (Number(size.stock) || 0), 0))} pares</b></div></div>
      ${list.length ? `<div class="table-wrap kardex-table"><table class="data-table"><thead><tr><th>Fecha</th><th>Movimiento</th>${filter === 'all' ? '<th>Talla</th>' : ''}<th>Detalle</th><th>Entra</th><th>Sale</th><th>Saldo</th></tr></thead><tbody>${list.slice(0, 400).map(row => `<tr><td>${esc(date(row.date))}</td><td><b>${esc(row.type)}</b></td>${filter === 'all' ? `<td>T ${esc(row.size)}</td>` : ''}<td>${esc(row.note)}</td><td class="kardex-in">${row.input ? `+${row.input}` : ''}</td><td class="kardex-out">${row.output ? `−${row.output}` : ''}</td><td><b>${row.balance}</b></td></tr>`).join('')}</tbody></table></div>${list.length > 400 ? '<p class="field-hint">Se muestran los 400 más recientes; descarga el Excel para verlos todos.</p>' : ''}` : W.empty('▤', 'Sin movimientos', 'Cuando entre o salga mercancía de este modelo aparecerá aquí.')}
      <div class="form-actions"><button class="secondary" data-action="closeModal">Cerrar</button>${list.length ? '<button class="primary" data-action="kardexExcel">Descargar Excel</button>' : ''}</div>`, { wide: true });
  };

  W.actions.kardexExcel = async () => {
    const { group, list } = W.ui.kardex || {};
    if (!group) return;
    try {
      const result = await window.api.exportRows(W.token, {
        name: `Kardex-${String(group.name).replace(/[^\w-]+/g, '-')}.xlsx`, sheet: 'Kardex',
        columns: [['Fecha', 'date', 20], ['Movimiento', 'type', 22], ['Talla', 'size', 8], ['Código', 'sku', 16], ['Detalle', 'note', 34], ['Entra', 'input', 9], ['Sale', 'output', 9], ['Saldo', 'balance', 9]],
        rows: list.map(row => ({ ...row, date: date(row.date) }))
      });
      if (result?.path) W.toast('Kardex descargado', result.path);
    } catch (error) { W.toast('No se pudo descargar', W.cleanError(error), 'error'); }
  };

  // Botón «Kardex» en la ficha de cada modelo.
  const baseDetail = W.actions.productDetail;
  W.actions.productDetail = (button, data) => {
    baseDetail(button, data);
    const group = W.group(data.id), actions = $('#drawerBody .form-actions');
    if (group && actions) actions.insertAdjacentHTML('afterbegin', `<button class="secondary" data-action="kardex" data-id="${esc(group.pid)}" data-sku="all">Kardex</button>`);
  };
})();
