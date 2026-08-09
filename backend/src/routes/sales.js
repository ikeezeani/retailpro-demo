const express = require('express');
const router = express.Router();
const { sequelize, Sale, SaleItem, Product, StockMovement, Customer } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { postSaleEntry, postCogsEntry } = require('../utils/accounting');

router.use(requireAuth);

async function nextInvoiceNo(t) {
  const count = await Sale.count({ transaction: t });
  return `INV-${String(count + 1).padStart(6, '0')}`;
}

// Create a sale (checkout). Body: { items:[{product_id, qty, discount}], discount, payment_method, amount_paid, customer_id }
router.post('/', async (req, res) => {
  const { items, discount = 0, payment_method = 'cash', amount_paid = 0, customer_id } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'Cart is empty' });

  const t = await sequelize.transaction();
  try {
    let subtotal = 0, tax_total = 0;
    const resolvedItems = [];
    let cogsAmount = 0;

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!product) throw new Error(`Product ${item.product_id} not found`);
      if (Number(product.stock_qty) < Number(item.qty)) {
        throw new Error(`Insufficient stock for "${product.name}" (available: ${product.stock_qty})`);
      }
      const lineDiscount = Number(item.discount || 0);
      const lineGross = Number(product.sale_price) * Number(item.qty) - lineDiscount;
      const lineTax = (lineGross * Number(product.tax_rate || 0)) / 100;
      const line_total = lineGross + lineTax;

      subtotal += Number(product.sale_price) * Number(item.qty);
      tax_total += lineTax;
      cogsAmount += Number(product.cost_price) * Number(item.qty);

      resolvedItems.push({
        product_id: product.id, qty: item.qty, unit_price: product.sale_price,
        discount: lineDiscount, tax_rate: product.tax_rate, line_total,
      });

      await product.update({ stock_qty: Number(product.stock_qty) - Number(item.qty) }, { transaction: t });
      await StockMovement.create(
        { product_id: product.id, type: 'sale', qty_change: -Number(item.qty), reference: '' },
        { transaction: t }
      );
    }

    const total = subtotal - discount + tax_total;
    if (payment_method !== 'credit' && Number(amount_paid) < total - 0.01) {
      throw new Error('Amount paid is less than the total due');
    }

    const invoice_no = await nextInvoiceNo(t);
    const sale = await Sale.create({
      invoice_no, subtotal, discount, tax_total, total,
      amount_paid: payment_method === 'credit' ? 0 : amount_paid,
      change_due: payment_method === 'credit' ? 0 : Math.max(0, amount_paid - total),
      payment_method, cashier_id: req.user.id, customer_id: customer_id || null, status: 'completed',
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

module.exports = router;
