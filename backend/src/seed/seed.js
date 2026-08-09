require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
  sequelize, Product, Category, Supplier, Customer, User,
  Sale, SaleItem, Purchase, PurchaseItem, StockMovement,
} = require('../models');
const { isInstalled } = require('../config/db');
const { postSaleEntry, postCogsEntry, postPurchaseEntry } = require('../utils/accounting');

// ---------- helpers ----------
const rint = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rint(0, arr.length - 1)];
const pad = (n, len) => String(n).padStart(len, '0');

function weightedPick(weighted) {
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [value, w] of weighted) {
    if (roll < w) return value;
    roll -= w;
  }
  return weighted[0][0];
}

async function run() {
  if (!(await isInstalled())) {
    console.log('RetailPro is not installed yet. Run the installation wizard first.');
    process.exit(1);
  }
  await sequelize.authenticate();

  // ---------- 1. Categories ----------
  const categoryNames = [
    'Beverages', 'Snacks & Confectionery', 'Household & Cleaning', 'Personal Care',
    'Dairy & Bakery', 'Frozen Foods', 'Stationery & Office', 'Electronics & Accessories',
    'Health & Wellness', 'Baby Care',
  ];
  const categories = {};
  for (const name of categoryNames) {
    const [c] = await Category.findOrCreate({ where: { name } });
    categories[name] = c;
  }

  // ---------- 2. Suppliers ----------
  const supplierDefs = [
    { name: 'Coastal Beverages Ltd', phone: '+234 803 111 2222', email: 'orders@coastalbev.com', address: 'Plot 14, Harbour Road' },
    { name: 'Golden Snacks Distributors', phone: '+234 803 222 3333', email: 'sales@goldensnacks.com', address: '22 Market Street' },
    { name: 'CleanHome Wholesale', phone: '+234 803 333 4444', email: 'info@cleanhomewholesale.com', address: '9 Industrial Avenue' },
    { name: 'PureCare Cosmetics Supply', phone: '+234 803 444 5555', email: 'accounts@purecare.com', address: '5 Beauty Lane' },
    { name: 'FreshDairy Logistics', phone: '+234 803 555 6666', email: 'dispatch@freshdairy.com', address: '77 Cold Chain Road' },
  ];
  const suppliers = [];
  for (const s of supplierDefs) {
    const [row] = await Supplier.findOrCreate({ where: { name: s.name }, defaults: s });
    suppliers.push(row);
  }

  // ---------- 3. Products ----------
  const productDefs = [
    ['Bottled Water 500ml', 'Beverages', 0.25, 0.60, 0, 'pcs', 30, 220],
    ['Bottled Water 1.5L', 'Beverages', 0.45, 1.00, 0, 'pcs', 20, 150],
    ['Cola 330ml Can', 'Beverages', 0.35, 0.90, 7.5, 'pcs', 25, 180],
    ['Orange Juice 1L', 'Beverages', 1.10, 2.20, 7.5, 'pcs', 15, 90],
    ['Energy Drink 250ml', 'Beverages', 0.70, 1.60, 7.5, 'pcs', 15, 100],

    ['Potato Chips 150g', 'Snacks & Confectionery', 0.70, 1.60, 7.5, 'pcs', 20, 130],
    ['Chocolate Bar 45g', 'Snacks & Confectionery', 0.45, 1.10, 7.5, 'pcs', 25, 160],
    ['Biscuits Pack 200g', 'Snacks & Confectionery', 0.90, 2.00, 7.5, 'pcs', 20, 110],
    ['Popcorn 100g', 'Snacks & Confectionery', 0.55, 1.30, 7.5, 'pcs', 15, 95],
    ['Mixed Nuts 200g', 'Snacks & Confectionery', 1.80, 3.75, 7.5, 'pcs', 12, 60],

    ['Dish Soap 500ml', 'Household & Cleaning', 1.00, 2.30, 7.5, 'pcs', 12, 70],
    ['Laundry Detergent 1kg', 'Household & Cleaning', 2.10, 4.40, 7.5, 'pcs', 10, 55],
    ['Toilet Paper 4-Pack', 'Household & Cleaning', 1.40, 3.00, 7.5, 'pcs', 15, 80],
    ['Trash Bags 30-Pack', 'Household & Cleaning', 1.20, 2.70, 7.5, 'pcs', 12, 65],
    ['All-Purpose Cleaner 750ml', 'Household & Cleaning', 1.60, 3.40, 7.5, 'pcs', 10, 50],

    ['Toothpaste 100ml', 'Personal Care', 0.80, 1.90, 7.5, 'pcs', 15, 90],
    ['Shampoo 400ml', 'Personal Care', 1.90, 3.90, 7.5, 'pcs', 12, 60],
    ['Bar Soap', 'Personal Care', 0.35, 0.85, 7.5, 'pcs', 20, 120],
    ['Deodorant Spray', 'Personal Care', 1.70, 3.60, 7.5, 'pcs', 12, 55],
    ['Hand Sanitizer 250ml', 'Personal Care', 0.95, 2.10, 7.5, 'pcs', 15, 70],

    ['Fresh Milk 1L', 'Dairy & Bakery', 0.85, 1.70, 0, 'pcs', 20, 60],
    ['White Bread Loaf', 'Dairy & Bakery', 0.60, 1.30, 0, 'pcs', 15, 45],
    ['Butter 250g', 'Dairy & Bakery', 1.50, 2.90, 0, 'pcs', 10, 35],
    ['Eggs Tray (30)', 'Dairy & Bakery', 2.80, 4.50, 0, 'tray', 8, 30],
    ['Yogurt Cup 150g', 'Dairy & Bakery', 0.50, 1.10, 0, 'pcs', 20, 70],

    ['Frozen Chicken 1kg', 'Frozen Foods', 3.20, 5.50, 0, 'kg', 10, 35],
    ['Frozen Peas 500g', 'Frozen Foods', 1.00, 2.10, 0, 'pcs', 12, 40],
    ['Ice Cream Tub 1L', 'Frozen Foods', 2.40, 4.80, 7.5, 'pcs', 8, 25],
    ['Frozen Fries 1kg', 'Frozen Foods', 1.60, 3.20, 0, 'pcs', 10, 38],
    ['Fish Fillet 500g', 'Frozen Foods', 2.90, 5.20, 0, 'pcs', 8, 28],

    ['A4 Paper Ream', 'Stationery & Office', 3.50, 6.50, 7.5, 'pcs', 10, 40],
    ['Ballpoint Pen Pack (10)', 'Stationery & Office', 1.20, 2.80, 7.5, 'pack', 15, 55],
    ['Notebook A5', 'Stationery & Office', 0.60, 1.50, 7.5, 'pcs', 20, 80],
    ['Stapler', 'Stationery & Office', 1.80, 3.90, 7.5, 'pcs', 8, 25],
    ['Sticky Notes Pack', 'Stationery & Office', 0.90, 2.00, 7.5, 'pack', 15, 45],

    ['USB-C Cable 1m', 'Electronics & Accessories', 1.50, 3.90, 7.5, 'pcs', 12, 45],
    ['Phone Charger 20W', 'Electronics & Accessories', 3.80, 8.50, 7.5, 'pcs', 8, 30],
    ['Wired Earphones', 'Electronics & Accessories', 2.20, 5.50, 7.5, 'pcs', 10, 35],
    ['Power Bank 10000mAh', 'Electronics & Accessories', 8.50, 16.90, 7.5, 'pcs', 6, 18],
    ['AA Batteries 4-Pack', 'Electronics & Accessories', 1.10, 2.60, 7.5, 'pack', 15, 60],

    ['Vitamin C Tablets', 'Health & Wellness', 2.50, 5.20, 0, 'pcs', 10, 30],
    ['Pain Relief Tablets', 'Health & Wellness', 1.20, 2.80, 0, 'pcs', 15, 50],
    ['First Aid Plasters', 'Health & Wellness', 0.80, 1.90, 0, 'pack', 12, 40],
    ['Face Masks 10-Pack', 'Health & Wellness', 1.50, 3.30, 7.5, 'pack', 15, 55],
    ['Multivitamin Syrup', 'Health & Wellness', 3.00, 6.20, 0, 'pcs', 8, 22],

    ['Diapers Pack (M)', 'Baby Care', 4.50, 8.90, 0, 'pack', 10, 30],
    ['Baby Wipes 80-Pack', 'Baby Care', 1.30, 2.90, 0, 'pack', 15, 45],
    ['Baby Formula 400g', 'Baby Care', 6.50, 11.90, 0, 'pcs', 8, 20],
    ['Baby Lotion 200ml', 'Baby Care', 1.80, 3.80, 0, 'pcs', 10, 28],
    ['Baby Powder 100g', 'Baby Care', 1.10, 2.40, 0, 'pcs', 10, 25],
  ];

  const products = [];
  let barcodeSeed = 6009900000001;
  for (let i = 0; i < productDefs.length; i++) {
    const [name, catName, cost, sale, tax, unit, reorder, stock] = productDefs[i];
    const sku = `SKU-${pad(i + 1, 4)}`;
    const supplier = pick(suppliers);
    const [product] = await Product.findOrCreate({
      where: { sku },
      defaults: {
        sku, barcode: String(barcodeSeed++), name, cost_price: cost, sale_price: sale,
        tax_rate: tax, unit, reorder_level: reorder, stock_qty: stock,
        category_id: categories[catName].id, supplier_id: supplier.id,
      },
    });
    products.push(product);
  }

  // ---------- 4. Customers ----------
  const customerDefs = [
    ['Amara Okafor', '+234 802 111 0001', 'amara.okafor@example.com'],
    ['Tunde Bakare', '+234 802 111 0002', 'tunde.bakare@example.com'],
    ['Chiamaka Eze', '+234 802 111 0003', 'chiamaka.eze@example.com'],
    ['Ibrahim Sule', '+234 802 111 0004', 'ibrahim.sule@example.com'],
    ['Ngozi Adeyemi', '+234 802 111 0005', 'ngozi.adeyemi@example.com'],
    ['Femi Alabi', '+234 802 111 0006', 'femi.alabi@example.com'],
    ['Blessing Nwosu', '+234 802 111 0007', 'blessing.nwosu@example.com'],
    ['Kelechi Obi', '+234 802 111 0008', 'kelechi.obi@example.com'],
    ['Halima Yusuf', '+234 802 111 0009', 'halima.yusuf@example.com'],
    ['Emeka Chukwu', '+234 802 111 0010', 'emeka.chukwu@example.com'],
    ['Grace Umeh', '+234 802 111 0011', 'grace.umeh@example.com'],
    ['Segun Ojo', '+234 802 111 0012', 'segun.ojo@example.com'],
  ];
  const customers = [];
  for (const [name, phone, email] of customerDefs) {
    const [c] = await Customer.findOrCreate({ where: { name }, defaults: { name, phone, email } });
    customers.push(c);
  }
  const [walkIn] = await Customer.findOrCreate({ where: { name: 'Walk-in Customer' } });

  // ---------- 5. Extra staff logins (for demoing roles) ----------
  const demoPassword = await bcrypt.hash('Demo1234!', 10);
  const staffDefs = [
    ['Store Manager', 'manager@retailpro.demo', 'manager'],
    ['Front Till Cashier', 'cashier@retailpro.demo', 'cashier'],
    ['Books Accountant', 'accountant@retailpro.demo', 'accountant'],
  ];
  const staff = [];
  for (const [name, email, role] of staffDefs) {
    const [u] = await User.findOrCreate({ where: { email }, defaults: { name, email, role, password_hash: demoPassword, active: true } });
    staff.push(u);
  }
  const admin = await User.findOne({ where: { role: 'admin' } });
  const cashierPool = [admin, ...staff].filter(Boolean);

  // ---------- Idempotency guard for the transaction history ----------
  const existingSales = await Sale.count();
  if (existingSales > 5) {
    console.log('Demo master data (categories, suppliers, products, customers, staff) is up to date.');
    console.log('Sales/purchase history already exists - skipping regeneration to avoid duplicates.');
    console.log('\nDemo staff logins (password for all: Demo1234!):');
    staffDefs.forEach(([, email, role]) => console.log(`  ${role.padEnd(11)} ${email}`));
    process.exit(0);
  }

  // ---------- 6. Historical purchase orders (last 25 days) ----------
  let poCounter = await Purchase.count();
  const today = new Date();

  for (let i = 0; i < 8; i++) {
    const daysAgo = rint(2, 25);
    const orderDate = new Date(today); orderDate.setDate(orderDate.getDate() - daysAgo);
    orderDate.setHours(rint(9, 16), rint(0, 59));

    const supplier = pick(suppliers);
    const lineCount = rint(3, 5);
    const lineProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, lineCount);
    const paymentMethod = weightedPick([['credit', 5], ['bank_transfer', 3], ['cash', 2]]);
    const isReceived = i < 6; // 6 received, 2 still "ordered" (for Purchasing module demo)

    await sequelize.transaction(async (t) => {
      let subtotal = 0, tax_total = 0;
      const lines = lineProducts.map((p) => {
        const qty = rint(30, 90);
        const unit_cost = Number(p.cost_price);
        const gross = unit_cost * qty;
        const tax = (gross * Number(p.tax_rate)) / 100;
        subtotal += gross; tax_total += tax;
        return { product_id: p.id, qty, unit_cost, tax_rate: p.tax_rate, line_total: gross + tax };
      });
      const total = subtotal + tax_total;
      poCounter++;
      const po_no = `PO-${pad(poCounter, 6)}`;

      const purchase = await Purchase.create({
        po_no, supplier_id: supplier.id, subtotal, tax_total, total,
        payment_method: paymentMethod, status: isReceived ? 'received' : 'ordered',
        received_at: isReceived ? orderDate : null, created_by: admin ? admin.id : null,
        createdAt: orderDate, updatedAt: orderDate,
      }, { transaction: t });

      for (const line of lines) await PurchaseItem.create({ ...line, purchase_id: purchase.id }, { transaction: t });

      if (isReceived) {
        for (const line of lines) {
          const product = products.find(p => p.id === line.product_id);
          await product.increment('stock_qty', { by: line.qty, transaction: t });
          await product.reload({ transaction: t });
          await StockMovement.create({
            product_id: product.id, type: 'purchase', qty_change: line.qty, reference: po_no, createdAt: orderDate,
          }, { transaction: t });
        }
        if (paymentMethod === 'credit') {
          await supplier.increment('balance', { by: total, transaction: t });
        }
        await postPurchaseEntry(purchase, t);
      }
    });
  }

  // ---------- 7. Historical sales (last 22 days, including today) ----------
  let saleCounter = await Sale.count();
  let totalSalesCreated = 0;

  for (let dayOffset = 21; dayOffset >= 0; dayOffset--) {
    const day = new Date(today); day.setDate(day.getDate() - dayOffset);
    const salesToday = dayOffset === 0 ? rint(1, 4) : rint(4, 9); // partial "today"

    for (let s = 0; s < salesToday; s++) {
      const saleTime = new Date(day);
      saleTime.setHours(rint(8, 20), rint(0, 59), 0, 0);

      const lineCount = rint(1, 4);
      const available = products.filter(p => Number(p.stock_qty) > 5);
      if (available.length === 0) continue;
      const lineProducts = [...available].sort(() => 0.5 - Math.random()).slice(0, lineCount);

      const paymentMethod = weightedPick([
        ['cash', 45], ['card', 20], ['mobile_money', 20], ['bank_transfer', 10], ['credit', 5],
      ]);
      const customer = paymentMethod === 'credit' ? pick(customers) : (Math.random() < 0.3 ? pick(customers) : walkIn);

      await sequelize.transaction(async (t) => {
        let subtotal = 0, tax_total = 0, cogsAmount = 0;
        const resolvedItems = [];

        for (const p of lineProducts) {
          const maxQty = Math.min(4, Math.floor(Number(p.stock_qty)));
          if (maxQty < 1) continue;
          const qty = rint(1, maxQty);
          const gross = Number(p.sale_price) * qty;
          const tax = (gross * Number(p.tax_rate)) / 100;
          subtotal += gross; tax_total += tax; cogsAmount += Number(p.cost_price) * qty;
          resolvedItems.push({ product_id: p.id, qty, unit_price: p.sale_price, discount: 0, tax_rate: p.tax_rate, line_total: gross + tax, _product: p });
        }
        if (resolvedItems.length === 0) return;

        const discount = Math.random() < 0.08 ? Math.round(subtotal * 0.05 * 100) / 100 : 0;
        const total = subtotal - discount + tax_total;
        const amountPaid = paymentMethod === 'credit' ? 0 : total + (Math.random() < 0.2 ? rint(1, 5) : 0);

        saleCounter++;
        const invoice_no = `INV-${pad(saleCounter, 6)}`;
        const sale = await Sale.create({
          invoice_no, subtotal, discount, tax_total, total,
          amount_paid: paymentMethod === 'credit' ? 0 : amountPaid,
          change_due: paymentMethod === 'credit' ? 0 : Math.max(0, amountPaid - total),
          payment_method: paymentMethod, cashier_id: pick(cashierPool) ? pick(cashierPool).id : null,
          customer_id: customer.id, status: 'completed',
          createdAt: saleTime, updatedAt: saleTime,
        }, { transaction: t });

        for (const item of resolvedItems) {
          await SaleItem.create({
            product_id: item.product_id, qty: item.qty, unit_price: item.unit_price, discount: item.discount,
            tax_rate: item.tax_rate, line_total: item.line_total, sale_id: sale.id,
          }, { transaction: t });
          await item._product.decrement('stock_qty', { by: item.qty, transaction: t });
          await item._product.reload({ transaction: t });
          await StockMovement.create({
            product_id: item.product_id, type: 'sale', qty_change: -item.qty, reference: invoice_no, createdAt: saleTime,
          }, { transaction: t });
        }

        if (paymentMethod === 'credit') {
          await customer.increment('balance', { by: total, transaction: t });
        }

        await postSaleEntry(sale, t);
        await postCogsEntry({ invoice_no, cogsAmount, date: saleTime }, t);
        totalSalesCreated++;
      });
    }
  }

  console.log('Demo data seeded successfully:');
  console.log(`  ${categoryNames.length} categories, ${suppliers.length} suppliers, ${products.length} products`);
  console.log(`  ${customers.length} customers, ${staffDefs.length} extra staff logins`);
  console.log('  8 historical purchase orders (6 received, 2 pending)');
  console.log(`  ${totalSalesCreated} historical sales spread across the last 22 days`);
  console.log('\nDemo staff logins (password for all: Demo1234!):');
  staffDefs.forEach(([, email, role]) => console.log(`  ${role.padEnd(11)} ${email}`));
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
