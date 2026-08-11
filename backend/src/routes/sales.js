const express = require('express');
const router = express.Router();
const { sequelize, Sale, SaleItem, Product, StockMovement, Customer } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { postSaleEntry, postCogsEntry, postRefundEntry, postReturnCogsEntry } = require('../utils/accounting');

router.use(requireAuth);

async function nextInvoiceNo(t) {
  const count = await Sale.count({ transaction: t });
  return `INV-${String(count + 1).padStart(6, '0')}`;
}

// Create a sale (checkout). Body: { items:[{product_id, qty, mode, discount}], discount, payment_method, amount_paid, customer_id, split_cash_amount, split_electronic_amount }
// mode is 'each' (default) or 'pack' — qty is the cart quantity in that unit
// (e.g. qty=1, mode='pack' means "1 box"). Stock is always deducted in eaches.
router.post('/', async (req, res) => {
  const {
    items, discount = 0, payment_method = 'cash', amount_paid = 0, customer_id,
    split_cash_amount, split_electronic_amount,
  } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'Cart is empty' });

  const t = await sequelize.transaction();
  try {
    let subtotal = 0, tax_total = 0;
    const resolvedItems = [];
    let cogsAmount = 0;

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!product) throw new Error(`Product ${item.product_id} not found`);

      const mode = item.mode === 'pack' ? 'pack' : 'each';
      const cartQty = Number(item.qty); // number of packs or eaches the cashier added
      const packSize = Math.max(1, Number(product.pack_size) || 1);
      const eachesNeeded = mode === 'pack' ? cartQty * packSize : cartQty;
      const unitPrice = mode === 'pack' ? Number(product.pack_price) : Number(product.sale_price);

      if (mode === 'pack' && !(Number(product.pack_price) > 0)) {
        throw new Error(`"${product.name}" has no pack price set — it can't be sold by the pack`);
      }
      if (Number(product.stock_qty) < eachesNeeded) {
        throw new Error(`Insufficient stock for "${product.name}" (available: ${product.stock_qty} ${product.unit})`);
      }

      const lineDiscount = Number(item.discount || 0);
      const lineGross = unitPrice * cartQty - lineDiscount;
      const lineTax = (lineGross * Number(product.tax_rate || 0)) / 100;
      const line_total = lineGross + lineTax;

      subtotal += unitPrice * cartQty;
      tax_total += lineTax;
      cogsAmount += Number(product.cost_price) * eachesNeeded; // COGS is always costed per each

      resolvedItems.push({
        product_id: product.id, qty: eachesNeeded, mode, sold_qty: cartQty, unit_price: unitPrice,
        discount: lineDiscount, tax_rate: product.tax_rate, line_total,
      });

      await product.update({ stock_qty: Number(product.stock_qty) - eachesNeeded }, { transaction: t });
      await StockMovement.create(
        { product_id: product.id, type: 'sale', qty_change: -eachesNeeded, reference: '' },
        { transaction: t }
      );
    }

    const total = subtotal - discount + tax_total;

    let finalAmountPaid = amount_paid;
    let splitCash = null, splitElectronic = null;

    if (payment_method === 'split') {
      splitCash = Number(split_cash_amount || 0);
      splitElectronic = Number(split_electronic_amount || 0);
      if (splitCash < 0 || splitElectronic < 0) throw new Error('Split amounts cannot be negative');
      const splitTotal = splitCash + splitElectronic;
      if (Math.abs(splitTotal - total) > 0.01) {
        throw new Error(`Split amounts (${splitTotal.toFixed(2)}) don't add up to the total due (${total.toFixed(2)})`);
      }
      finalAmountPaid = total; // split payments are assumed exact — no change given
    } else if (payment_method !== 'credit' && Number(amount_paid) < total - 0.01) {
      throw new Error('Amount paid is less than the total due');
    }

    const invoice_no = await nextInvoiceNo(t);
    const sale = await Sale.create({
      invoice_no, subtotal, discount, tax_total, total,
      amount_paid: payment_method === 'credit' ? 0 : finalAmountPaid,
      change_due: (payment_method === 'credit' || payment_method === 'split') ? 0 : Math.max(0, amount_paid - total),
      payment_method, cashier_id: req.user.id, customer_id: customer_id || null, status: 'completed',
      split_cash_amount: splitCash, split_electronic_amount: splitElectronic,
    }, { transaction: t });

    for (const item of resolvedItems) {
      await SaleItem.create({ ...item, sale_id: sale.id }, { transaction: t });
    }
    // backfill stock movement references now that we have the invoice number
    await StockMovement.update(
      { reference: invoice_no },
      { where: { reference: '', type: 'sale' }, transaction: t }
    );

    if (payment_method === 'credit' && customer_id) {
      const customer = await Customer.findByPk(customer_id, { transaction: t });
      await customer.update({ balance: Number(customer.balance) + total }, { transaction: t });
    }

    await postSaleEntry(sale, t);
    await postCogsEntry({ invoice_no, cogsAmount, date: new Date() }, t);

    await t.commit();
    const full = await Sale.findByPk(sale.id, { include: [SaleItem, Customer] });
    res.status(201).json(full);
  } catch (e) {
    await t.rollback();
    res.status(400).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  const { from, to } = req.query;
  const where = {};
  if (from && to) {
    const { Op } = require('sequelize');
    where.createdAt = { [Op.between]: [new Date(from), new Date(to + 'T23:59:59')] };
  }
  const sales = await Sale.findAll({ where, include: [Customer], order: [['createdAt', 'DESC']], limit: 200 });
  res.json(sales);
});

router.get('/:id', async (req, res) => {
  const sale = await Sale.findByPk(req.params.id, { include: [SaleItem, Customer] });
  if (!sale) return res.status(404).json({ error: 'Sale not found' });
  res.json(sale);
});

/**
 * Shared refund/void logic. `items` (only used for a partial refund) is
 * [{ sale_item_id, qty }] where qty is in the SAME unit the line was sold in
 * (eaches for an 'each' line, boxes for a 'pack' line) — matching what a
 * cashier actually sees returned on the counter. When isVoid is true, every
 * remaining refundable unit on every line is reversed regardless of `items`.
 */
async function processReturn(sale, saleItems, { items, reason, isVoid, userId }, t) {
  if (sale.status === 'refunded' || sale.status === 'void') {
    throw new Error(`This sale is already ${sale.status} — nothing left to reverse`);
  }

  const targets = isVoid
    ? saleItems
    : saleItems.filter(si => items.some(i => Number(i.sale_item_id) === si.id));

  let refundSubtotal = 0, refundTax = 0, cogsAmount = 0;
  const lines = [];

  for (const si of targets) {
    const product = await Product.findByPk(si.product_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!product) continue;
    const packSize = Math.max(1, Number(product.pack_size) || 1);
    const soldUnits = Number(si.sold_qty ?? si.qty); // in the line's own mode (each or pack)
    const alreadyRefunded = Number(si.refunded_qty || 0);
    const maxRefundable = soldUnits - alreadyRefunded;

    const requestedQty = isVoid
      ? maxRefundable
      : Number((items.find(i => Number(i.sale_item_id) === si.id) || {}).qty || 0);

    if (requestedQty <= 0) continue;
    if (requestedQty > maxRefundable + 0.0001) {
      throw new Error(`Cannot refund ${requestedQty} of "${product.name}" — only ${maxRefundable} left refundable on this line`);
    }

    const eachesToRestore = si.mode === 'pack' ? requestedQty * packSize : requestedQty;
    // Proportional share of this line's discount and price, mirroring how the sale computed it.
    const perUnitDiscount = soldUnits > 0 ? Number(si.discount || 0) / soldUnits : 0;
    const gross = Number(si.unit_price) * requestedQty - perUnitDiscount * requestedQty;
    const tax = (gross * Number(si.tax_rate || 0)) / 100;

    refundSubtotal += gross;
    refundTax += tax;
    cogsAmount += Number(product.cost_price) * eachesToRestore;

    await product.update({ stock_qty: Number(product.stock_qty) + eachesToRestore }, { transaction: t });
    await StockMovement.create({
      product_id: product.id, type: 'return_in', qty_change: eachesToRestore,
      reference: sale.invoice_no, note: reason || (isVoid ? 'Sale voided' : 'Customer refund'),
    }, { transaction: t });

    await si.update({ refunded_qty: alreadyRefunded + requestedQty }, { transaction: t });
    lines.push({ product: product.name, requestedQty, mode: si.mode });
  }

  if (lines.length === 0) throw new Error('Nothing selected to refund');

  const refundTotal = refundSubtotal + refundTax;

  await postRefundEntry({
    date: new Date(), invoice_no: sale.invoice_no, isVoid, refundSubtotal, refundTax, refundTotal,
    payment_method: sale.payment_method, split_cash_amount: sale.split_cash_amount, split_electronic_amount: sale.split_electronic_amount,
  }, t);
  await postReturnCogsEntry({ invoice_no: sale.invoice_no, isVoid, cogsAmount, date: new Date() }, t);

  if (sale.payment_method === 'credit' && sale.customer_id) {
    const customer = await Customer.findByPk(sale.customer_id, { transaction: t });
    if (customer) await customer.update({ balance: Math.max(0, Number(customer.balance) - refundTotal) }, { transaction: t });
  }

  const newRefundedTotal = Number(sale.refunded_total || 0) + refundTotal;
  const status = isVoid
    ? 'void'
    : newRefundedTotal >= Number(sale.total) - 0.01
    ? 'refunded'
    : 'partially_refunded';
  await sale.update({ refunded_total: newRefundedTotal, status }, { transaction: t });

  return { refundTotal, status, lines };
}

// Partial or full refund of a completed sale — customer returns some or all
// items. items: [{ sale_item_id, qty }], qty in the line's own sold unit.
router.post('/:id/refund', requireRole('admin', 'manager'), async (req, res) => {
  const { items, reason } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'Select at least one item to refund' });

  const t = await sequelize.transaction();
  try {
    const sale = await Sale.findByPk(req.params.id, { include: [SaleItem], transaction: t });
    if (!sale) throw new Error('Sale not found');
    const result = await processReturn(sale, sale.SaleItems, { items, reason, isVoid: false, userId: req.user.id }, t);
    await t.commit();
    res.json({ ok: true, ...result, sale: await Sale.findByPk(sale.id, { include: [SaleItem, Customer] }) });
  } catch (e) {
    await t.rollback();
    res.status(400).json({ error: e.message });
  }
});

// Void an entire sale — for staff mistakes (wrong items, wrong customer,
// duplicate ring-up) rather than a genuine customer return. Reverses every
// remaining refundable unit on every line in one step. Manager/admin only.
router.post('/:id/void', requireRole('admin', 'manager'), async (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) return res.status(400).json({ error: 'A reason is required to void a sale' });

  const t = await sequelize.transaction();
  try {
    const sale = await Sale.findByPk(req.params.id, { include: [SaleItem], transaction: t });
    if (!sale) throw new Error('Sale not found');
    const result = await processReturn(sale, sale.SaleItems, { reason, isVoid: true, userId: req.user.id }, t);
    await t.commit();
    res.json({ ok: true, ...result, sale: await Sale.findByPk(sale.id, { include: [SaleItem, Customer] }) });
  } catch (e) {
    await t.rollback();
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
