const express = require('express');
const { body } = require('express-validator');
const { Supplier, Customer } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const partyValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Enter a valid email address'),
];

function makeCrud(Model) {
  const router = express.Router();
  router.use(requireAuth);
  router.get('/', async (req, res) => res.json(await Model.findAll({ order: [['name', 'ASC']] })));
  router.get('/:id', async (req, res) => {
    const item = await Model.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  });
  router.post('/', requireRole('admin', 'manager'), partyValidators, handleValidation, async (req, res) => {
    try {
      res.status(201).json(await Model.create(req.body));
    } catch (e) { res.status(400).json({ error: e.message }); }
  });
  router.put('/:id', requireRole('admin', 'manager'), partyValidators, handleValidation, async (req, res) => {
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
