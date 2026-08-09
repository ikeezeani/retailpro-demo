const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { Setting, User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const rows = await Setting.findAll();
  const obj = {};
  rows.forEach(r => { obj[r.key] = r.value; });
  res.json(obj);
});

router.put('/', requireAuth, requireRole('admin'), async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    await Setting.upsert({ key, value: String(value) });
  }
  res.json({ ok: true });
});

// ---- Users ----
const usersRouter = express.Router();
usersRouter.use(requireAuth, requireRole('admin'));

usersRouter.get('/', async (req, res) => {
  const users = await User.findAll({ attributes: { exclude: ['password_hash'] }, order: [['name', 'ASC']] });
  res.json(users);
});

usersRouter.post('/', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password_hash, role });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

usersRouter.put('/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const updates = { ...req.body };
  if (updates.password) {
    updates.password_hash = await bcrypt.hash(updates.password, 10);
    delete updates.password;
  }
  await user.update(updates);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active });
});

usersRouter.delete('/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  await user.update({ active: false });
  res.json({ ok: true });
});

module.exports = { settingsRouter: router, usersRouter };
