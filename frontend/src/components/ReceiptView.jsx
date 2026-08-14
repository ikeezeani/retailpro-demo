import React from 'react';
import { useApp } from '../context/AppContext.jsx';

/**
 * Pure receipt content — no page chrome, no print button. Used both by the
 * standalone /receipt/:id page (for direct links / bookmarking) and by
 * in-app modals (POS checkout, Sales History) so a cashier never has to
 * leave the current screen just to see or print a receipt. The print
 * stylesheet (.receipt-print's @media print rule) makes this render as the
 * only visible thing on the page when printed, regardless of where in the
 * DOM it's actually nested — so it prints correctly whether it's on its own
 * page or inside a modal.
 */
export default function ReceiptView({ sale }) {
  const { formatMoney, settings } = useApp();
  if (!sale) return null;

  return (
    <div className="receipt-print">
      <div className="rp-center rp-bold rp-lg">{settings?.company_name || 'RetailPro Store'}</div>
      {settings?.company_address && <div className="rp-center">{settings.company_address}</div>}
      {settings?.company_phone && <div className="rp-center">{settings.company_phone}</div>}
      <div className="rp-dash" />
      <div>Invoice: {sale.invoice_no}</div>
      <div>Date: {new Date(sale.createdAt).toLocaleString()}</div>
      <div>Cashier: {sale.cashier_id ? `#${sale.cashier_id}` : '—'}</div>
      {sale.Customer && <div>Customer: {sale.Customer.name}</div>}
      <div className="rp-dash" />
      {sale.SaleItems?.map(it => (
        <div key={it.id} className="rp-item">
          <div>{it.sold_qty ?? it.qty} x {formatMoney(it.unit_price)}{it.mode === 'pack' ? ' (box)' : ''}</div>
          <div className="rp-row">
            <span>&nbsp;&nbsp;{it.Product?.name || `Item #${it.product_id}`}</span>
            <span>{formatMoney(it.line_total)}</span>
          </div>
        </div>
      ))}
      <div className="rp-dash" />
      <div className="rp-row"><span>Subtotal</span><span>{formatMoney(sale.subtotal)}</span></div>
      <div className="rp-row"><span>Discount</span><span>{formatMoney(sale.discount)}</span></div>
      <div className="rp-row"><span>Tax</span><span>{formatMoney(sale.tax_total)}</span></div>
      <div className="rp-row rp-bold rp-lg"><span>TOTAL</span><span>{formatMoney(sale.total)}</span></div>
      <div className="rp-dash" />
      {sale.payment_method === 'split' ? (
        <>
          <div className="rp-row"><span>Paid (cash)</span><span>{formatMoney(sale.split_cash_amount)}</span></div>
          <div className="rp-row"><span>Paid (electronic)</span><span>{formatMoney(sale.split_electronic_amount)}</span></div>
        </>
      ) : (
        <div className="rp-row"><span>Paid ({sale.payment_method})</span><span>{formatMoney(sale.amount_paid)}</span></div>
      )}
      {Number(sale.change_due) > 0 && <div className="rp-row"><span>Change</span><span>{formatMoney(sale.change_due)}</span></div>}
      <div className="rp-dash" />
      <div className="rp-center">{settings?.receipt_footer || 'Thank you for shopping with us!'}</div>
      <div className="rp-center rp-small">Powered by RetailPro 5.0</div>
    </div>
  );
}
