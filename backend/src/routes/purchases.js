const express = require('express');
const router = express.Router();
const { sequelize, Purchase, PurchaseItem, Product, StockMovement, Supplier } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { postPurchaseEntry } = require('../utils/accounting');

router.use(requireAuth);

async function nextPoNo(t) {
  const count = await Purchase.count({ transaction: t });
  return `PO-${String(count + 1).padStart(6, '0')}`;
}

// Create a draft/ordered purchase order (does NOT touch stock yet)
router.post('/', requireRole('admin', 'manager'), async (req, res) => {
  const { supplier_id, items, payment_method = 'credit', status = 'ordered' } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'Add at least one line item' });
  const t = await sequelize.transaction();
  try {
    let subtotal = 0, tax_total = 0;
    const lines = items.map(i => {
      const gross = Number(i.unit_cost) * Number(i.qty);
      const tax = (gross * Number(i.tax_rate || 0)) / 100;
      subtotal += gross; tax_total += tax;
      return { ...i, line_total: gross + tax };
    });
    const total = subtotal + tax_total;
    const po_no = await nextPoNo(t);
    const purchase = await Purchase.create(
      { po_no, supplier_id, subtotal, tax_total, total, payment_method, status, created_by: req.user.id },
      { transaction: t }
    );
    for (const line of lines) await PurchaseItem.create({ ...line, purchase_id: purchase.id }, { transaction: t });
    await t.commit();
    res.status(201).json(await Purchase.findByPk(purchase.id, { include: [PurchaseItem, Supplier] }));
  } catch (e) {
    await t.rollback();
    res.status(400).json({ error: e.message });
  }
});

// Receive goods: the moment stock increases and accounting is posted
router.post('/:id/receive', requireRole('admin', 'manager'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const purchase = await Purchase.findByPk(req.params.id, { include: [PurchaseItem], transaction: t });
    if (!purchase) throw new Error('Purchase order not found');
    if (purchase.status === 'received') throw new Error('This purchase order was already received');

    for (const item of purchase.PurchaseItems) {
      const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!product) continue;
      await product.update({
        stock_qty: Number(product.stock_qty) + Number(item.qty),
        cost_price: item.unit_cost, // update to latest cost
      }, { transaction: t });
      await StockMovement.create({
        product_id: product.id, type: 'purchase', qty_change: Number(item.qty), reference: purchase.po_no,
      }, { transaction: t });
    }

    await purchase.update({ status: 'received', received_at: new Date() }, { transaction: t });

    if (purchase.payment_method === 'credit' && purchase.supplier_id) {
      const supplier = await Supplier.findByPk(purchase.supplier_id, { transaction: t });
      await supplier.update({ balance: Number(supplier.balance) + Number(purchase.total) }, { transaction: t });
    }

    await postPurchaseEntry(purchase, t);

    await t.commit();
    res.json(await Purchase.findByPk(purchase.id, { include: [PurchaseItem, Supplier] }));
  } catch (e) {
    await t.rollback();
    res.status(400).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  const purchases = await Purchase.findAll({ include: [Supplier], order: [['createdAt', 'DESC']], limit: 200 });
  res.json(purchases);
});

router.get('/:id', async (req, res) => {
  const purchase = await Purchase.findByPk(req.params.id, { include: [PurchaseItem, Supplier] });
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  res.json(purchase);
});

router.post('/:id/cancel', requireRole('admin', 'manager'), async (req, res) => {
  const purchase = await Purchase.findByPk(req.params.id);
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  if (purchase.status === 'received') return res.status(400).json({ error: 'Cannot cancel a received order' });
  await purchase.update({ status: 'cancelled' });
  res.json(purchase);
});

module.exports = router;
