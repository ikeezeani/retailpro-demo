const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize, Account, JournalEntry, JournalLine } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { postEntry } = require('../utils/accounting');

router.use(requireAuth);

// ---- Chart of Accounts ----
router.get('/accounts', async (req, res) => res.json(await Account.findAll({ order: [['code', 'ASC']] })));

router.post('/accounts', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    res.status(201).json(await Account.create({ ...req.body, is_system: false }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/accounts/:id', requireRole('admin'), async (req, res) => {
  const acc = await Account.findByPk(req.params.id);
  if (!acc) return res.status(404).json({ error: 'Not found' });
  if (acc.is_system) return res.status(400).json({ error: 'System accounts cannot be deleted' });
  await acc.destroy();
  res.json({ ok: true });
});

// ---- Manual Journal Entry ----
router.post('/journal', requireRole('admin', 'accountant'), async (req, res) => {
  const { date, memo, lines } = req.body; // lines: [{code, debit, credit}]
  const t = await sequelize.transaction();
  try {
    const entry = await postEntry({ date, memo, source: 'manual', reference: memo, lines }, t);
    await t.commit();
    res.status(201).json(entry);
  } catch (e) {
    await t.rollback();
    res.status(400).json({ error: e.message });
  }
});

router.get('/journal', async (req, res) => {
  const entries = await JournalEntry.findAll({
    include: [{ model: JournalLine, include: [Account] }],
    order: [['date', 'DESC'], ['id', 'DESC']], limit: 200,
  });
  res.json(entries);
});

// ---- Ledger for a single account ----
router.get('/ledger/:accountId', async (req, res) => {
  const lines = await JournalLine.findAll({
    where: { account_id: req.params.accountId },
    include: [{ model: JournalEntry }],
    order: [[JournalEntry, 'date', 'ASC']],
  });
  res.json(lines);
});

// ---- Trial Balance ----
router.get('/trial-balance', async (req, res) => {
  const accounts = await Account.findAll({ order: [['code', 'ASC']] });
  const results = [];
  for (const acc of accounts) {
    const lines = await JournalLine.findAll({ where: { account_id: acc.id } });
    const debit = lines.reduce((s, l) => s + Number(l.debit), 0);
    const credit = lines.reduce((s, l) => s + Number(l.credit), 0);
    if (debit === 0 && credit === 0) continue;
    results.push({ code: acc.code, name: acc.name, type: acc.type, debit, credit, balance: debit - credit });
  }
  res.json(results);
});

// ---- Profit & Loss (Income Statement) ----
router.get('/profit-loss', async (req, res) => {
  const { from, to } = req.query;
  const dateWhere = from && to ? { date: { [Op.between]: [from, to] } } : {};
  const accounts = await Account.findAll({ where: { type: ['income', 'expense'] } });
  const rows = [];
  let totalIncome = 0, totalExpense = 0;
  for (const acc of accounts) {
    const lines = await JournalLine.findAll({
      where: { account_id: acc.id },
      include: [{ model: JournalEntry, where: dateWhere, attributes: [] }],
    });
    const debit = lines.reduce((s, l) => s + Number(l.debit), 0);
    const credit = lines.reduce((s, l) => s + Number(l.credit), 0);
    const amount = acc.type === 'income' ? credit - debit : debit - credit;
    if (amount === 0) continue;
    if (acc.type === 'income') totalIncome += amount; else totalExpense += amount;
    rows.push({ code: acc.code, name: acc.name, type: acc.type, amount });
  }
  res.json({ rows, totalIncome, totalExpense, netProfit: totalIncome - totalExpense });
});

// ---- Balance Sheet ----
router.get('/balance-sheet', async (req, res) => {
  const accounts = await Account.findAll({ where: { type: ['asset', 'liability', 'equity'] }, order: [['code', 'ASC']] });
  const rows = [];
  let assets = 0, liabilities = 0, equity = 0;
  for (const acc of accounts) {
    const lines = await JournalLine.findAll({ where: { account_id: acc.id } });
    const debit = lines.reduce((s, l) => s + Number(l.debit), 0);
    const credit = lines.reduce((s, l) => s + Number(l.credit), 0);
    const balance = acc.type === 'asset' ? debit - credit : credit - debit;
    if (balance === 0) continue;
    if (acc.type === 'asset') assets += balance;
    if (acc.type === 'liability') liabilities += balance;
    if (acc.type === 'equity') equity += balance;
    rows.push({ code: acc.code, name: acc.name, type: acc.type, balance });
  }
  // Retained earnings plug = net profit not yet closed to equity
  const pl = await (async () => {
    const incomeAccs = await Account.findAll({ where: { type: ['income', 'expense'] } });
    let net = 0;
    for (const acc of incomeAccs) {
      const lines = await JournalLine.findAll({ where: { account_id: acc.id } });
      const debit = lines.reduce((s, l) => s + Number(l.debit), 0);
      const credit = lines.reduce((s, l) => s + Number(l.credit), 0);
      net += acc.type === 'income' ? credit - debit : -(debit - credit);
    }
    return net;
  })();
  rows.push({ code: '3900', name: 'Retained Earnings (Current Period)', type: 'equity', balance: pl });
  equity += pl;
  res.json({ rows, totals: { assets, liabilities, equity, checksOut: Math.abs(assets - (liabilities + equity)) < 0.5 } });
});

module.exports = router;
