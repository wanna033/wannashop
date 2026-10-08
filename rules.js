// Reglas de negocio compartidas por el servidor (operations.js) y la pantalla,
// para que lo que se ve en la vista previa sea exactamente lo que se factura.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Rules = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const round = value => Math.round(Number(value) || 0);
  const BILLING_MODES = ['full', 'commission', 'special'];
  const EXPENSE_CATEGORIES = ['Arriendo', 'Transporte', 'Nómina', 'Servicios', 'Publicidad', 'Mantenimiento', 'Impuestos', 'Otros'];

  function billingOf(local) {
    const mode = BILLING_MODES.includes(local && local.billing) ? local.billing : 'full';
    const commission = Math.min(100, Math.max(0, Number(local && local.commission) || 0));
    return { mode, commission };
  }

  // Precio que se le cobra al local por un par, según su acuerdo.
  function billUnit(local, retailPrice, localPrice) {
    const { mode, commission } = billingOf(local), retail = Number(retailPrice) || 0;
    if (mode === 'commission') return round(retail * (1 - commission / 100));
    if (mode === 'special' && Number(localPrice) > 0) return round(localPrice);
    return round(retail);
  }

  function billingLabel(local) {
    const { mode, commission } = billingOf(local);
    if (mode === 'commission') return `El local se queda con el ${commission}%`;
    if (mode === 'special') return 'Precio especial para locales';
    return 'Precio de venta completo';
  }

  // IVA. Si los precios ya lo incluyen se desglosa sin cambiar el total; si no, se suma.
  function taxFor(amount, rate, included = true) {
    const value = round(amount), pct = Math.min(100, Math.max(0, Number(rate) || 0));
    if (!pct) return { rate: 0, included: true, base: value, amount: 0, total: value };
    if (included) { const base = round(value / (1 + pct / 100)); return { rate: pct, included: true, base, amount: value - base, total: value }; }
    const tax = round(value * pct / 100);
    return { rate: pct, included: false, base: value, amount: tax, total: value + tax };
  }

  // Día calendario en la hora local del equipo (las fechas se guardan en UTC).
  function localDay(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  // Dinero recibido en un día por forma de pago, menos reembolsos y gastos en efectivo.
  function cashSummary(state, day) {
    const byMethod = {};
    for (const payment of (state && state.payments) || []) {
      if (payment.status === 'void' || localDay(payment.date) !== day) continue;
      const sign = payment.kind === 'refund' ? -1 : 1;
      byMethod[payment.method] = (byMethod[payment.method] || 0) + sign * (Number(payment.amount) || 0);
    }
    const expenses = ((state && state.expenses) || []).filter(expense => expense.status !== 'void' && expense.date === day);
    const cashExpenses = expenses.filter(expense => expense.method === 'Efectivo').reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const cashIn = byMethod.Efectivo || 0;
    return { byMethod, cashIn, cashExpenses, expectedCash: cashIn - cashExpenses, expensesTotal: expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0) };
  }

  // Pares vendidos por talla de un modelo en los últimos `days` días (ventas y cierres no anulados).
  function sizeSales(state, pid, days = 90, now = new Date()) {
    const since = new Date(now).getTime() - days * 86400000, units = {};
    for (const invoice of [...((state && state.sales) || []), ...((state && state.closures) || [])]) {
      if (invoice.status === 'void' || new Date(invoice.date).getTime() < since) continue;
      for (const item of invoice.items || []) if (item.pid === pid) units[item.size] = (units[item.size] || 0) + Number(item.quantity || 0);
    }
    return units;
  }

  return { BILLING_MODES, EXPENSE_CATEGORIES, billingOf, billUnit, billingLabel, taxFor, localDay, cashSummary, sizeSales };
});
