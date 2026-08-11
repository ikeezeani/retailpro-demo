# Manager & Admin Guide
### Setting Up Your Team and Running Day-to-Day Operations

As the Admin, you're the only one who can create logins for everyone else, and along
with Managers, you're the only one who can handle refunds, voids, and box/case selling
setup. This guide covers all of it.

> ✓ Team setup takes about a minute per person.

---

## 1. Before You Start

A few things worth knowing before you add your first staff member.

**Give every staff member their own login.** Don't let two people share one account — each sale and stock change is recorded against whoever is signed in, so shared logins make it impossible to know who did what.

**You choose what each person can see.** When you create an account, you pick a role for it. That role decides which parts of RetailPro that person can open — see [Choosing the Right Role](#3-choosing-the-right-role) below.

---

## 2. Adding a Staff Member

Do this once for each person who needs to use RetailPro.

1. **Sign in with your Admin account.** Only an Admin login can create or manage other accounts — if you're signed in as anything else, you won't see this option.
2. **Click "Users" in the left-side menu.** This opens the list of everyone who currently has access to RetailPro.
3. **Click the "+ New User" button.** A small form will pop up asking for their details.
4. **Fill in their name and email.** Use their real name so it's easy to recognize them later, and an email address that belongs to them personally.
5. **Set a temporary password.** Choose something simple for now — tell them to keep it private once they've signed in for the first time. Write it down so you can pass it to them directly (in person, not by leaving it lying around).
6. **Choose their role.** Pick from Cashier, Manager, or Accountant — see the table below to decide which one fits. (You won't see "Admin" as an option here on purpose — Admin accounts should stay limited to trusted owners/managers.)
7. **Click "Create User."** Their account is ready immediately. Give them the address, their email, and their temporary password so they can sign in — see [Handing It Over](#7-handing-it-over-to-your-team) below.

---

## 3. Choosing the Right Role

Think about what that person actually needs to do day-to-day, and pick the smallest role that covers it. You can always change it later if their job changes.

| Role | Good for | What they can access |
|---|---|---|
| **Cashier** | Till staff who only ring up sales | Point of Sale, Sales History |
| **Manager** | Someone who also handles stock and ordering | Everything a Cashier can, plus Products, Categories, Inventory, Purchasing, Suppliers, Customers |
| **Accountant** | Whoever looks after the books | The Nominal Ledger — Chart of Accounts, Journal, Trial Balance, Profit & Loss, Balance Sheet |
| **Admin** | You, and anyone else you fully trust with the whole store | Everything, including creating other accounts and changing store-wide Settings |

> **Keep the number of Admin accounts small.** Anyone with Admin access can create new logins, change settings, and see everything in the accounting books — treat it the way you'd treat a key to the safe.

---

## 4. Managing Accounts Later

**When someone leaves:**
Go to **Users**, find their name, and click **Disable**. This immediately stops them from being able to sign in, but keeps every sale they ever rang up in your records — you should disable an account rather than trying to delete it.

**If someone forgets their password:**
Go to **Users**, find their name, and click **Reset Password**. Type a new temporary
password and confirm — it takes effect immediately. Pass the new password to them
directly and privately, the same way you did when creating their account. No technical
steps needed; this is a normal part of managing your team.

**If someone's job changes:**
Go to **Users**, find their name, and update their role to match their new responsibilities — for example, promoting a Cashier to Manager once they start handling deliveries.

---

## 5. Setting Up Box/Case Selling

Some products can be sold either as a full box or as single loose units — a case of
drinks, a box of medicine, anything that comes packaged but is sometimes broken open
and sold individually.

**How it works:** stock is always tracked in the smallest unit (a bottle, a tablet strip,
etc.) — one single number. A box is just "12 of that unit" layered on top, not a
separate thing to track. This is deliberate: it's the only approach that can't let box
counts and loose-unit counts silently drift apart from reality.

**To set it up for a product:**

1. Go to **Products**, and open the item (or create a new one).
2. Scroll to the **"Sell by the box/case?"** section near the bottom of the form.
3. Fill in:
   - **Pack Size** — how many individual units are in one box (e.g. `12`).
   - **Pack Price** — what the full box sells for (usually a bit less than 12× the
     single-unit price, as a bulk discount).
   - **Pack Barcode** — the barcode printed on the box itself, if it's different from
     the barcode on a single unit.
4. Click **Save.**

That's it — at the till, staff will now see a second button under that product, like
**"+ Box of 12 — $9.99,"** and scanning either the box's barcode or a single unit's
barcode both work correctly from the same stock count.

> Leave **Pack Size** at `1` for anything that's never sold by the box — most products
> won't need this section touched at all.

---

## 6. Processing Refunds & Voiding Sales

Only Managers and Admins can do this — it's intentionally not available to Cashiers,
since reversing a sale affects stock and the accounting books.

### Refunding some or all of a sale

Use this when a **customer genuinely returns something** they bought.

1. Go to **Sales History** and find the original sale.
2. Click **View.**
3. For each item they're returning, type how many to refund into the box next to it
   (it shows the maximum you can still refund, in case part of it was already
   returned earlier).
4. Enter a short **reason** (e.g. "Customer changed their mind," "Item was faulty").
5. Click **Process Refund.**

RetailPro automatically works out the correct refund amount, puts the returned stock
back (correctly, whether it was originally sold by the box or individually), and
reverses the accounting entries — revenue, tax, and cost of goods sold all unwind
properly. If the original sale was on credit, the customer's balance is reduced
instead of any cash changing hands.

You can refund the same sale more than once if a customer returns items in stages —
the system keeps track of what's already been refunded on each line.

### Voiding an entire sale

Use this instead when **staff made a mistake** — the wrong items were rung up, a sale
was duplicated, or it was charged to the wrong customer — rather than a genuine
customer return.

1. Go to **Sales History**, find the sale, click **View.**
2. Click **Void Entire Sale…**
3. Enter a reason (required) and confirm.

This fully reverses the whole sale in one step — every item's stock is restored and
every accounting entry is undone. A voided sale is marked differently from a refunded
one in your reports, so you can always tell a genuine return apart from an internal
correction later.

> **Void is permanent and cannot be undone.** If in doubt, double-check with whoever
> made the sale before voiding it.

---

## 7. Handing It Over to Your Team

Once someone's account is created, here's a simple way to get them started without you having to explain everything yourself.

1. **Give them the address, their email, and their password.** Do this in person or over a private message — never write a password somewhere other staff could see it.
2. **Point them to the Everyday Guide.** Share the *"Learning to Use RetailPro"* guide with them — it walks a complete beginner through signing in and making their first sale, step by step, without needing you to sit with them the whole time.
3. **Watch their first sale together, if you can.** Even with a good guide, most people feel more confident after doing it once alongside someone who already knows the system.

> **That's it.** Once their account exists and they've seen the Everyday Guide, they're fully set up to work independently.

---

*RetailPro — Manager & Admin Guide. Keep this page bookmarked — you'll come back to it whenever you add someone new, set up a new box-sold product, or need to process a refund.*
