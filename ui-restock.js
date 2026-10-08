// Reposición: qué tallas pedir al proveedor y cuántos pares, según el stock mínimo y el stock ideal
// que fija el administrador (Configuración → Reposición). Se descarga en Excel o se envía por WhatsApp.
(() => {
  const W = window.WS, $ = W.$, esc = W.esc;

  // Tallas activas con el stock mínimo o menos; la cantidad sugerida completa el stock ideal.
  function lines() {
    const min = W.lowLimit(), target = W.targetStock();
    return W.groups().flatMap(group => group.sizes.filter(size => Number(size.stock || 0) <= min).map(size => ({
      pid: group.pid, sku: size.sku, model: group.name, brand: group.brand || '', color: group.color || '', size: size.size,
      stock: Number(size.stock || 0), quantity: Math.max(0, target - Number(size.stock || 0))
    }))).filter(line => line.quantity > 0).sort((a, b) => a.model.localeCompare(b.model, 'es', { sensitivity: 'base' }) || String(a.size).localeCompare(String(b.size), 'es', { numeric: true }));
  }
  // Cantidades que el usuario cambió en la ventana (0 = no pedir esa talla).
  const chosen = () => (W.ui.restock || []).map((line, index) => ({ ...line, quantity: Math.max(0, Math.floor(Number($(`[data-restock-qty="${index}"]`)?.value ?? line.quantity) || 0)) })).filter(line => line.quantity > 0);

  W.actions.restockOrder = () => {
    const list = lines();
    W.ui.restock = list;
    const pairs = list.reduce((sum, line) => sum + line.quantity, 0);
    W.modal(`<h2 id="modalTitle">Pedido de reposición</h2><p class="modal-subtitle">Tallas con ${W.lowLimit()} par(es) o menos. La cantidad sugerida completa ${W.targetStock()} pares por talla; cámbiala si quieres (0 = no pedir).</p>
      ${list.length ? `<div class="detail-grid restock-totals"><div class="detail-item"><small>Tallas por pedir</small><b>${W.num(list.length)}</b></div><div class="detail-item"><small>Pares sugeridos</small><b id="restockPairs">${W.num(pairs)}</b></div></div>
      <div class="table-wrap restock-table"><table class="data-table"><thead><tr><th>Modelo</th><th>Talla</th><th>Hay</th><th>Pedir</th></tr></thead><tbody>${list.map((line, index) => `<tr><td><b>${esc(line.model)}</b><small class="restock-sub">${esc([line.brand, line.color].filter(Boolean).join(' · '))}</small></td><td>T ${esc(line.size)}</td><td class="${line.stock <= 0 ? 'kardex-out' : ''}">${line.stock}</td><td><input class="restock-qty" type="number" inputmode="numeric" min="0" max="999" value="${line.quantity}" data-restock-qty="${index}" aria-label="Pares a pedir de ${esc(line.model)} talla ${esc(line.size)}"></td></tr>`).join('')}</tbody></table></div>`
      : W.empty('✓', 'No hay nada por reponer', `Todas las tallas tienen más de ${W.lowLimit()} par(es). Puedes cambiar el mínimo en Configuración → Reposición.`)}
      <div class="form-actions"><button class="secondary" data-action="closeModal">Cerrar</button>${list.length ? '<button class="secondary" data-action="restockExcel">Descargar Excel</button><button class="primary" data-action="restockWhatsapp">Enviar por WhatsApp</button>' : ''}</div>`, { wide: true, onOpen: () => {
        $('#modalBody').addEventListener('input', event => { if (!event.target.matches('[data-restock-qty]')) return; const total = chosen().reduce((sum, line) => sum + line.quantity, 0); const box = $('#restockPairs'); if (box) box.textContent = W.num(total); });
      } });
  };

  W.actions.restockExcel = async () => {
    const list = chosen();
    if (!list.length) return W.toast('No hay cantidades para pedir', 'Escribe al menos una cantidad mayor que 0.', 'warning');
    try {
      const result = await window.api.exportRows(W.token, {
        name: `Pedido-reposicion-${W.today()}.xlsx`, sheet: 'Pedido',
        columns: [['Modelo', 'model', 28], ['Marca', 'brand', 16], ['Color', 'color', 14], ['Talla', 'size', 8], ['Código', 'sku', 18], ['Hay en bodega', 'stock', 14], ['Pares a pedir', 'quantity', 14]],
        rows: list
      });
      if (result?.ok || result?.path) W.toast('Pedido descargado', `${list.length} talla(s) · ${list.reduce((sum, line) => sum + line.quantity, 0)} pares`);
    } catch (error) { W.toast('No se pudo descargar', W.cleanError(error), 'error'); }
  };

  W.actions.restockWhatsapp = async () => {
    const list = chosen();
    if (!list.length) return W.toast('No hay cantidades para pedir', 'Escribe al menos una cantidad mayor que 0.', 'warning');
    const byModel = new Map();
    for (const line of list) { const key = `${line.model}${line.color ? ` ${line.color}` : ''}`; if (!byModel.has(key)) byModel.set(key, []); byModel.get(key).push(`T${line.size}: ${line.quantity}`); }
    const text = `Pedido de reposición · ${W.data.settings.storeName || 'WannaShop'} · ${new Date().toLocaleDateString('es-CO')}\n\n${[...byModel].map(([model, sizes]) => `• ${model} → ${sizes.join(', ')}`).join('\n')}\n\nTotal: ${list.reduce((sum, line) => sum + line.quantity, 0)} pares`;
    try { await window.api.openLink(W.token, `https://wa.me/?text=${encodeURIComponent(text)}`); }
    catch (error) { W.toast('No se pudo abrir WhatsApp', W.cleanError(error), 'error'); }
  };

  // Botón en Inventario y, si hay tallas por reponer, aviso en el inicio.
  const baseInventory = W.routes.inventory;
  W.routes.inventory = () => {
    baseInventory();
    $('#app .toolbar [data-action="newProduct"]')?.insertAdjacentHTML('beforebegin', '<button class="secondary" data-action="restockOrder">Pedido de reposición</button>');
  };
  const baseDashboard = W.routes.dashboard;
  W.routes.dashboard = () => {
    baseDashboard();
    const count = lines().length;
    if (!count) return;
    $('#app .hero')?.insertAdjacentHTML('afterend', `<button type="button" class="restock-strip" data-action="restockOrder"><span class="restock-icon" aria-hidden="true">▤</span><span><b>${W.num(count)} talla(s) por reponer</b><small>Toca para ver el pedido sugerido</small></span><span aria-hidden="true">›</span></button>`);
  };

  // Configuración → Reposición (solo el administrador).
  const baseSettings = W.routes.settings;
  W.routes.settings = () => {
    baseSettings();
    if (!W.admin()) return;
    $('.settings-layout aside')?.insertAdjacentHTML('beforeend', `<section class="panel"><div class="panel-head"><div><h2>Reposición</h2><p>Cuándo una talla queda «por reponer» y cuánto pedir</p></div></div><form id="restockForm" class="panel-body"><div class="form-grid"><label class="field">Stock mínimo por talla<input name="minStock" type="number" min="0" max="999" required value="${W.lowLimit()}"><small>Con esta cantidad o menos, avisa.</small></label><label class="field">Stock ideal por talla<input name="targetStock" type="number" min="1" max="999" required value="${W.targetStock()}"><small>El pedido completa esta cantidad.</small></label></div><div class="settings-actions"><button class="primary">Guardar</button><button type="button" class="secondary" data-action="restockOrder">Ver pedido</button></div></form></section>`);
    $('#restockForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const result = await W.command('settings.update', { settings: { minStock: Number(values.minStock), targetStock: Number(values.targetStock) } }, { success: 'Reposición actualizada', detail: `Mínimo ${values.minStock} · ideal ${values.targetStock} pares por talla.` });
      if (result) W.render('settings');
    });
  };
})();
