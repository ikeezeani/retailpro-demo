const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const router = express.Router();
const { User } = require('../models');
const { sign, requireAuth } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

router.post('/login',
  [
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidation,
  async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !user.active) return res.status(401).json({ error: 'Invalid email or password' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    const token = sign(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }
);

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

module.exports = router;
