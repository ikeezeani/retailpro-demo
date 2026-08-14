import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import ReceiptView from '../components/ReceiptView.jsx';

// Standalone page for a direct /receipt/:id link (bookmarking, reprint via
// a shared URL). POS and Sales History no longer navigate here for their
// normal flow — they show the same ReceiptView in an in-app modal instead,
// so completing a sale never pulls a cashier away from the till screen.
export default function Receipt() {
  const { id } = useParams();
  const [sale, setSale] = useState(null);

  useEffect(() => {
    client.get(`/sales/${id}`).then(({ data }) => setSale(data));
  }, [id]);

  if (!sale) return <p style={{ padding: 20, fontFamily: 'monospace' }}>Loading receipt…</p>;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <div>
        <ReceiptView sale={sale} />
        <button className="btn btn-primary no-print" style={{ marginTop: 16, width: '100%' }} onClick={() => window.print()}>
          🖨️ Print Receipt
        </button>
      </div>
    </div>
  );
}
