const express = require('express');
const { Op } = require('sequelize');
const { body } = require('express-validator');
const router = express.Router();
const { sequelize, Product, Category, Supplier, StockMovement } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

router.use(requireAuth);

const productValidators = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('sale_price').optional().isFloat({ min: 0 }).withMessage('Sale price cannot be negative'),
  body('cost_price').optional().isFloat({ min: 0 }).withMessage('Cost price cannot be negative'),
  body('tax_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('pack_size').optional().isInt({ min: 1 }).withMessage('Pack size must be at least 1'),
  body('pack_price').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Pack price cannot be negative'),
];

// List / search products (used by POS product grid + inventory table)
router.get('/', async (req, res) => {
  try {
    const { q, category_id, low_stock } = req.query;
    const where = {};
    if (q) {
      // Explicit LOWER() makes this case-insensitive regardless of the
      // database's default collation — MySQL and TiDB don't always agree on
      // that default. Built as a raw, safely-escaped SQL fragment rather
      // than Sequelize's fn()/col()/where() helpers — those repeatedly
      // produced a form TiDB's parser rejected, even though the same code
      // worked fine locally against MySQL. Plain SQL text is far less
      // likely to hit a dialect-specific incompatibility like that.
      const needle = sequelize.escape(`%${q.toLowerCase()}%`);
      where[Op.and] = [
        sequelize.literal(`(LOWER(name) LIKE ${needle} OR LOWER(sku) LIKE ${needle} OR LOWER(barcode) LIKE ${needle})`),
      ];
    }
    if (category_id) where.category_id = category_id;
    const products = await Product.findAll({
      where, include: [Category, Supplier], order: [['name', 'ASC']],
    });
    const list = low_stock === 'true'
      ? products.filter(p => Number(p.stock_qty) <= Number(p.reorder_level))
      : products;
    res.json(list);
  } catch (e) {
    console.error('Product search failed:', e.message, e.original?.sqlMessage || e.parent?.sqlMessage || '');
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

// Exact barcode lookup — hit by the POS scanner on every scan for instant add-to-cart.
// Checks the each-level barcode first, then the pack/case barcode, so scanning
// either a single bottle or a full box both work from the same product record.
router.get('/barcode/:code', async (req, res) => {
  const code = req.params.code;
  let product = await Product.findOne({ where: { barcode: code } });
  if (product) return res.json({ ...product.toJSON(), matchedAs: 'each' });

  product = await Product.findOne({ where: { pack_barcode: code } });
  if (product) return res.json({ ...product.toJSON(), matchedAs: 'pack' });

  return res.status(404).json({ error: 'No product matches this barcode' });
});

router.get('/:id', async (req, res) => {
  const product = await Product.findByPk(req.params.id, { include: [Category, Supplier] });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

router.post('/', requireRole('admin', 'manager'), productValidators, handleValidation, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (e) {
    const friendly = e.name === 'SequelizeUniqueConstraintError' ? 'That SKU or barcode is already in use' : e.message;
    res.status(400).json({ error: friendly });
  }
});

router.put('/:id', requireRole('admin', 'manager'), productValidators, handleValidation, async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  try {
    await product.update(req.body);
    res.json(product);
  } catch (e) {
    const friendly = e.name === 'SequelizeUniqueConstraintError' ? 'That SKU or barcode is already in use' : e.message;
    res.status(400).json({ error: friendly });
  }
});

router.delete('/:id', requireRole('admin', 'manager'), async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  await product.update({ active: false });
  res.json({ ok: true });
});

// Manual stock adjustment (stock take / damage / correction)
router.post('/:id/adjust', requireRole('admin', 'manager'), async (req, res) => {
  const { qty_change, note } = req.body;
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  await product.update({ stock_qty: Number(product.stock_qty) + Number(qty_change) });
  await StockMovement.create({
    product_id: product.id, type: 'adjustment', qty_change, note, reference: `ADJ-${Date.now()}`,
  });
  res.json(product);
});

router.get('/:id/movements', async (req, res) => {
  const movements = await StockMovement.findAll({
    where: { product_id: req.params.id }, order: [['createdAt', 'DESC']], limit: 100,
  });
  res.json(movements);
});

// Categories
const catRouter = express.Router();
catRouter.use(requireAuth);
catRouter.get('/', async (req, res) => res.json(await Category.findAll({ order: [['name', 'ASC']] })));
catRouter.post('/', requireRole('admin', 'manager'), async (req, res) => res.status(201).json(await Category.create(req.body)));
catRouter.put('/:id', requireRole('admin', 'manager'), async (req, res) => {
  const c = await Category.findByPk(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  await c.update(req.body);
  res.json(c);
});
catRouter.delete('/:id', requireRole('admin', 'manager'), async (req, res) => {
  await Category.destroy({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = { productsRouter: router, categoriesRouter: catRouter };
