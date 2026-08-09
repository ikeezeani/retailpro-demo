const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// ---------- SETTINGS (single-row install config: currency, company, tax) ----------
const Setting = sequelize.define('Setting', {
  key: { type: DataTypes.STRING, primaryKey: true },
  value: { type: DataTypes.TEXT },
});

// ---------- USERS ----------
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'manager', 'cashier', 'accountant'), defaultValue: 'cashier' },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
});

// ---------- CATEGORIES ----------
const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
});

// ---------- SUPPLIERS ----------
const Supplier = sequelize.define('Supplier', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  address: DataTypes.STRING,
  balance: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 }, // payable balance
});

// ---------- CUSTOMERS ----------
const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Walk-in Customer' },
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  balance: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 }, // receivable balance (credit sales)
});

// ---------- PRODUCTS ----------
const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sku: { type: DataTypes.STRING, allowNull: false, unique: true },
  barcode: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  cost_price: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  sale_price: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  tax_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 }, // %
  unit: { type: DataTypes.STRING, defaultValue: 'pcs' },
  reorder_level: { type: DataTypes.INTEGER, defaultValue: 5 },
  stock_qty: { type: DataTypes.DECIMAL(14, 3), defaultValue: 0 },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
});

// ---------- STOCK MOVEMENTS (audit trail for all inventory changes) ----------
const StockMovement = sequelize.define('StockMovement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  type: { type: DataTypes.ENUM('sale', 'purchase', 'adjustment', 'return_in', 'return_out'), allowNull: false },
  qty_change: { type: DataTypes.DECIMAL(14, 3), allowNull: false }, // negative = out, positive = in
  reference: DataTypes.STRING, // e.g. SALE#1023 / PO#55
  note: DataTypes.STRING,
});

// ---------- SALES (POS) ----------
const Sale = sequelize.define('Sale', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  invoice_no: { type: DataTypes.STRING, allowNull: false, unique: true },
  subtotal: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  tax_total: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  amount_paid: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  change_due: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  payment_method: { type: DataTypes.ENUM('cash', 'card', 'mobile_money', 'bank_transfer', 'credit', 'split'), defaultValue: 'cash' },
  status: { type: DataTypes.ENUM('completed', 'refunded', 'partially_refunded', 'void'), defaultValue: 'completed' },
});

const SaleItem = sequelize.define('SaleItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  qty: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  discount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  tax_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  line_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
});

// ---------- PURCHASING ----------
const Purchase = sequelize.define('Purchase', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  po_no: { type: DataTypes.STRING, allowNull: false, unique: true },
  status: { type: DataTypes.ENUM('draft', 'ordered', 'received', 'cancelled'), defaultValue: 'draft' },
  subtotal: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  tax_total: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  amount_paid: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  payment_method: { type: DataTypes.ENUM('cash', 'card', 'mobile_money', 'bank_transfer', 'credit'), defaultValue: 'credit' },
  received_at: DataTypes.DATE,
});

const PurchaseItem = sequelize.define('PurchaseItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  qty: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  unit_cost: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  tax_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  line_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
});

// ---------- NOMINAL LEDGER / ACCOUNTING ----------
const Account = sequelize.define('Account', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('asset', 'liability', 'equity', 'income', 'expense'), allowNull: false },
  is_system: { type: DataTypes.BOOLEAN, defaultValue: false }, // auto-posted accounts, protected from deletion
});

const JournalEntry = sequelize.define('JournalEntry', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  entry_no: { type: DataTypes.STRING, allowNull: false, unique: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  memo: DataTypes.STRING,
  source: { type: DataTypes.ENUM('sale', 'purchase', 'manual', 'opening_balance'), defaultValue: 'manual' },
  reference: DataTypes.STRING,
});

const JournalLine = sequelize.define('JournalLine', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  debit: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  credit: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
});

// ================= ASSOCIATIONS =================
Product.belongsTo(Category, { foreignKey: 'category_id' });
Category.hasMany(Product, { foreignKey: 'category_id' });

Product.belongsTo(Supplier, { foreignKey: 'supplier_id' });
Supplier.hasMany(Product, { foreignKey: 'supplier_id' });

StockMovement.belongsTo(Product, { foreignKey: 'product_id' });
Product.hasMany(StockMovement, { foreignKey: 'product_id' });

Sale.belongsTo(Customer, { foreignKey: 'customer_id' });
Customer.hasMany(Sale, { foreignKey: 'customer_id' });
Sale.belongsTo(User, { foreignKey: 'cashier_id' });

Sale.hasMany(SaleItem, { foreignKey: 'sale_id', onDelete: 'CASCADE' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id' });
SaleItem.belongsTo(Product, { foreignKey: 'product_id' });

Purchase.belongsTo(Supplier, { foreignKey: 'supplier_id' });
Supplier.hasMany(Purchase, { foreignKey: 'supplier_id' });
Purchase.belongsTo(User, { foreignKey: 'created_by' });

Purchase.hasMany(PurchaseItem, { foreignKey: 'purchase_id', onDelete: 'CASCADE' });
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchase_id' });
PurchaseItem.belongsTo(Product, { foreignKey: 'product_id' });

JournalEntry.hasMany(JournalLine, { foreignKey: 'entry_id', onDelete: 'CASCADE' });
JournalLine.belongsTo(JournalEntry, { foreignKey: 'entry_id' });
JournalLine.belongsTo(Account, { foreignKey: 'account_id' });
Account.hasMany(JournalLine, { foreignKey: 'account_id' });

module.exports = {
  sequelize,
  Setting,
  User,
  Category,
  Supplier,
  Customer,
  Product,
  StockMovement,
  Sale,
  SaleItem,
  Purchase,
  PurchaseItem,
  Account,
  JournalEntry,
  JournalLine,
};
