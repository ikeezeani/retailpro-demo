const { Account, JournalEntry, JournalLine, sequelize } = require('../models');

/**
 * Standard Chart of Accounts codes used by the auto-posting engine.
 * Seeded on install (see seed/seed.js). Do not rename codes without
 * migrating existing journal lines.
 */
const SYSTEM_ACCOUNTS = {
  CASH: '1000',
  BANK: '1010',
  ACCOUNTS_RECEIVABLE: '1100',
  INVENTORY: '1200',
  ACCOUNTS_PAYABLE: '2000',
  SALES_TAX_PAYABLE: '2100',
  OWNERS_EQUITY: '3000',
  SALES_REVENUE: '4000',
  COST_OF_GOODS_SOLD: '5000',
  PURCHASE_TAX_INPUT: '1300',
  INVENTORY_ADJUSTMENT: '5100',
};

async function nextEntryNo(t) {
  const count = await JournalEntry.count({ transaction: t });
  return `JE-${String(count + 1).padStart(6, '0')}`;
}

async function getAccountId(code, t) {
  const acc = await Account.findOne({ where: { code }, transaction: t });
  if (!acc) throw new Error(`Chart of Accounts missing required account ${code}. Re-run seed.`);
  return acc.id;
}

/**
 * Post a balanced double-entry journal entry.
 * lines: [{ code, debit, credit }]  -- must sum debit === sum credit
 */
async function postEntry({ date, memo, source, reference, lines }, t) {
  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Unbalanced journal entry: debit ${totalDebit} != credit ${totalCredit}`);
  }
  const entry_no = await nextEntryNo(t);
  const entry = await JournalEntry.create({ entry_no, date, memo, source, reference }, { transaction: t });
  for (const line of lines) {
    if (!line.debit && !line.credit) continue;
    const account_id = await getAccountId(line.code, t);
    await JournalLine.create(
      { entry_id: entry.id, account_id, debit: line.debit || 0, credit: line.credit || 0 },
      { transaction: t }
    );
  }
  return entry;
}

/** Post the accounting impact of a completed POS sale. */
async function postSaleEntry(sale, t) {
  const isCredit = sale.payment_method === 'credit';
  const receiptCode = isCredit
    ? SYSTEM_ACCOUNTS.ACCOUNTS_RECEIVABLE
    : sale.payment_method === 'bank_transfer' || sale.payment_method === 'card'
    ? SYSTEM_ACCOUNTS.BANK
    : SYSTEM_ACCOUNTS.CASH;

  const lines = [
    { code: receiptCode, debit: sale.total, credit: 0 },
    { code: SYSTEM_ACCOUNTS.SALES_REVENUE, debit: 0, credit: sale.subtotal - sale.discount },
    { code: SYSTEM_ACCOUNTS.SALES_TAX_PAYABLE, debit: 0, credit: sale.tax_total },
  ];
  await postEntry(
    { date: sale.createdAt || new Date(), memo: `POS Sale ${sale.invoice_no}`, source: 'sale', reference: sale.invoice_no, lines },
    t
  );
}

/** Post COGS + inventory reduction impact of a sale (separate entry keeps sale revenue vs COGS auditable). */
async function postCogsEntry({ invoice_no, cogsAmount, date }, t) {
  if (cogsAmount <= 0) return;
  const lines = [
    { code: SYSTEM_ACCOUNTS.COST_OF_GOODS_SOLD, debit: cogsAmount, credit: 0 },
    { code: SYSTEM_ACCOUNTS.INVENTORY, debit: 0, credit: cogsAmount },
  ];
  await postEntry({ date, memo: `COGS for ${invoice_no}`, source: 'sale', reference: invoice_no, lines }, t);
}

/** Post the accounting impact of goods received on a purchase order. */
async function postPurchaseEntry(purchase, t) {
  const isCredit = purchase.payment_method === 'credit';
  const payCode = isCredit
    ? SYSTEM_ACCOUNTS.ACCOUNTS_PAYABLE
    : purchase.payment_method === 'bank_transfer' || purchase.payment_method === 'card'
    ? SYSTEM_ACCOUNTS.BANK
    : SYSTEM_ACCOUNTS.CASH;

  const lines = [
    { code: SYSTEM_ACCOUNTS.INVENTORY, debit: purchase.subtotal, credit: 0 },
    { code: SYSTEM_ACCOUNTS.PURCHASE_TAX_INPUT, debit: purchase.tax_total, credit: 0 },
    { code: payCode, debit: 0, credit: purchase.total },
  ];
  await postEntry(
    { date: purchase.received_at || new Date(), memo: `Purchase ${purchase.po_no} received`, source: 'purchase', reference: purchase.po_no, lines },
    t
  );
}

module.exports = { SYSTEM_ACCOUNTS, postEntry, postSaleEntry, postCogsEntry, postPurchaseEntry, sequelize };
