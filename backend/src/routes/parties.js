const express = require('express');
const { Supplier, Customer } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

function makeCrud(Model) {
  const router = express.Router();
  router.use(requireAuth);
  router.get('/', async (req, res) => res.json(await Model.findAll({ order: [['name', 'ASC']] })));
  router.get('/:id', async (req, res) => {
    const item = await Model.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  });
  router.post('/', requireRole('admin', 'manager'), async (req, res) => {
    try {
      res.status(201).json(await Model.create(req.body));
    } catch (e) { res.status(400).json({ error: e.message }); }
  });
  router.put('/:id', requireRole('admin', 'manager'), async (req, res) => {
    const item = await Model.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.update(req.body);
    res.json(item);
  });
  router.delete('/:id', requireRole('admin'), async (req, res) => {
    await Model.destroy({ where: { id: req.params.id } });
    res.json({ ok: true });
  });
  return router;
}

module.exports = { suppliersRouter: makeCrud(Supplier), customersRouter: makeCrud(Customer) };
