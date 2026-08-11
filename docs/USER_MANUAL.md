# RetailPro 5.0 — User Manual

## 1. Signing In

Go to your RetailPro URL (e.g. `http://localhost:5175`) and sign in with the email and
password created during installation (or one issued to you by your administrator).
The sidebar and available actions adapt to your **role**:

| Role        | Can do |
|-------------|--------|
| **Cashier**    | Point of Sale, view Sales History |
| **Manager**     | Everything a Cashier can, plus Products, Categories, Inventory, Purchasing, Suppliers, Customers |
| **Accountant**  | Nominal Ledger (Chart of Accounts, Journal, reports) plus read access elsewhere |
| **Admin**       | Everything, including Users and Settings |

---

## 2. Point of Sale (POS)

This is the checkout screen your cashiers will live in all day.

### Scanning items
Click into the **scan bar** at the top (it's auto-focused when you open POS). Every
standard USB/Bluetooth barcode scanner works like a keyboard — scanning a barcode types
the code and presses Enter automatically, which adds the matching product straight to
the cart. No special drivers needed.

### Adding items manually
Use the search box to filter by name or SKU, or simply click a product tile in the grid.

### The cart (receipt tape)
Every item you add appears on the receipt-style panel on the right, showing quantity,
unit price and line total. Use the **−** / **+** buttons to change quantity, or
**remove** to delete a line.

### Payment methods
RetailPro supports:
- **Cash** — enter amount received; RetailPro calculates change due automatically
- **Card**
- **Mobile Money**
- **Bank Transfer**
- **Split Pay** — part cash, part card/mobile money/bank transfer, entered as two
  amounts that must add up to the total; the accounting entry splits correctly
  between the Cash and Bank accounts
- **On Credit** — requires selecting a customer; the sale is added to that customer's
  balance instead of being paid immediately

Click **Charge** to complete the sale. Stock is deducted instantly and the accounting
entries (revenue, tax, and cost of goods sold) are posted automatically behind the
scenes — you don't need to do anything extra.

---

## 3. Sales History

Every completed sale is listed with invoice number, date, customer, payment method and
total. Click **View** to see the full line-item breakdown of any invoice.

---

## 4. Products

Add and manage everything you sell:

- **SKU** — your internal product code
- **Barcode** — the number the scanner reads at the till
- **Cost Price** / **Sale Price** — used to calculate profit and COGS automatically
- **Tax Rate** — applied per item at checkout
- **Reorder Level** — when stock falls to or below this number, it's flagged as low stock
- **Category** and **Unit** (pcs, kg, box, etc.)

Deactivating a product hides it from POS without deleting its sales history.

## 5. Categories

Simple groupings (e.g. Beverages, Snacks, Household) used to organize and filter products.

---

## 6. Inventory

- **Stock levels** for every active product, with a badge showing **In Stock** or
  **Reorder Soon**
- **Adjust** — manually add or remove stock (positive number to add, negative to
  remove) for stock counts, damage, theft, or corrections — with a required note for
  your audit trail
- **History** — full movement log per product: every sale, purchase receipt, and manual
  adjustment, in order

---

## 7. Purchasing

1. Click **New Purchase Order**, choose a supplier and payment method, and add line
   items (product, quantity, unit cost, tax rate).
2. The order is created with status **Ordered** — stock is *not* affected yet.
3. When goods physically arrive, click **Receive Goods**. This is the moment stock
   increases, product cost prices update to the latest purchase cost, and the
   accounting entries (inventory asset, tax, and either cash/bank or accounts payable)
   are posted automatically.

Purchases can be paid **Cash, Card, Bank Transfer, Mobile Money**, or **On Credit**
(added to the supplier's payable balance).

---

## 8. Suppliers & Customers

Basic contact records with a running balance:
- **Suppliers** show what you owe them (accounts payable) from credit purchases
- **Customers** show what they owe you (accounts receivable) from credit sales

---

## 9. Nominal Ledger (Accounting)

RetailPro keeps a full **double-entry** set of books behind every sale and purchase, so
your accounts are always up to date without manual bookkeeping.

- **Chart of Accounts** — the list of asset, liability, equity, income and expense
  accounts. A standard set is created for you at install (Cash, Bank, Accounts
  Receivable/Payable, Inventory, Sales Revenue, COGS, Sales Tax Payable, etc.), and you
  can add your own (e.g. Rent Expense, Utilities).
- **Journal** — every transaction, automatic or manual, shown as balanced debit/credit
  lines. Use **Manual Journal Entry** for things RetailPro doesn't post automatically
  (e.g. recording a loan, owner's investment, or a bank fee).
- **Trial Balance** — total debits and credits per account; they must match.
- **Profit & Loss** — income minus expenses for the period, i.e. your net profit.
- **Balance Sheet** — assets, liabilities and equity, with a live check confirming
  Assets = Liabilities + Equity.

---

## 10. Users

Administrators can create logins for staff and assign a role (Cashier, Manager,
Accountant, Admin), and disable access for anyone who leaves without deleting their
sales history.

---

## 11. Settings

Update your company name, address, contact details, **currency**, default tax rate, and
receipt footer message at any time — changes apply immediately across the app.

---

## 12. Currency

RetailPro is currency-agnostic. Whichever currency you selected during installation
(or later changed in Settings) is used for every price, invoice, and report — there is
no per-transaction currency conversion; RetailPro assumes your business operates in a
single base currency.

---

## Tips for a smooth first day

- Add your **Categories** first, then your **Products** — it keeps the POS grid organized.
- Enter accurate **Cost Prices** on every product; this is what drives your automatic
  Cost of Goods Sold and profit reporting.
- Set sensible **Reorder Levels** so the Inventory page actually warns you before you
  run out.
- Use **On Credit** payments sparingly and follow up via the Customers/Suppliers balance
  columns.
