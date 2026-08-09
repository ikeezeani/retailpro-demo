const express = require('express');
const router = express.Router();
const { Op, fn, col, literal } = require('sequelize');
const { sequelize, Sale, SaleItem, Product, Purchase } = require('../models');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/dashboard', async (req, res) => {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

  const todaySales = await Sale.findAll({ where: { createdAt: { [Op.gte]: startOfDay } } });
  const monthSales = await Sale.findAll({ where: { createdAt: { [Op.gte]: startOfMonth } } });

  const todayTotal = todaySales.reduce((s, x) => s + Number(x.total), 0);
  const monthTotal = monthSales.reduce((s, x) => s + Number(x.total), 0);

  const lowStockCount = await Product.count({ where: sequelize.where(col('stock_qty'), Op.lte, col('reorder_level')) });
  const productCount = await Product.count({ where: { active: true } });

  const topItems = await SaleItem.findAll({
    attributes: ['product_id', [fn('SUM', col('qty')), 'totalQty'], [fn('SUM', col('line_total')), 'totalRevenue']],
    group: ['product_id'],
    order: [[literal('totalQty'), 'DESC']],
    limit: 5,
    include: [{ model: Product, attributes: ['name', 'sku'] }],
  });

  // Last 7 days trend
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(); day.setDate(day.getDate() - i); day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
    const daySales = await Sale.findAll({ where: { createdAt: { [Op.gte]: day, [Op.lt]: nextDay } } });
    trend.push({ date: day.toISOString().slice(0, 10), total: daySales.reduce((s, x) => s + Number(x.total), 0) });
  }

  res.json({
    todayTotal, monthTotal, todayCount: todaySales.length, lowStockCount, productCount, topItems, trend,
  });
});

module.exports = router;
