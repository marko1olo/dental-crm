import React, { useState } from 'react';
import { useBillingStore } from '../stores/useBillingStore.js';
import './InvoiceSplitPaymentModal.css';

interface InvoiceModalProps {
  invoiceId: string;
  totalAmount: number;
  onClose: () => void;
  onSuccess: (splits: any[]) => void;
}

export function InvoiceSplitPaymentModal({ invoiceId, totalAmount, onClose, onSuccess }: InvoiceModalProps) {
  const { splitPayments, addSplitPayment, removeSplitPayment } = useBillingStore();
  const [method, setMethod] = useState<'cash' | 'card' | 'dms' | 'installment_balance'>('card');
  const [amount, setAmount] = useState<number>(totalAmount);

  const totalPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = totalAmount - totalPaid;

  const handleAdd = () => {
    if (amount > 0 && amount <= remaining) {
      addSplitPayment({ method, amount });
      setAmount(remaining - amount);
    }
  };

  const handlePay = async () => {
    try {
      const res = await fetch('/api/billing/split-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, payments: splitPayments })
      });
      if (res.ok) {
        onSuccess(splitPayments);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="invoice-modal-overlay" onClick={onClose}>
      <div className="invoice-modal" onClick={e => e.stopPropagation()}>
        <h2>?????? ?????</h2>
        <div className="invoice-totals">
          <p>????? ? ??????: <strong>{totalAmount.toLocaleString('ru-RU')} '?.</strong></p>
          <p>????????: <strong style={{ color: 'var(--accent)' }}>{remaining.toLocaleString('ru-RU')} '?.</strong></p>
        </div>

        <div className="invoice-splits">
          {splitPayments.map((p, i) => (
            <div key={i} className="split-item">
              <span>{p.method.toUpperCase()}</span>
              <span>{p.amount.toLocaleString('ru-RU')} '?.</span>
              <button onClick={() => removeSplitPayment(i)}>?</button>
            </div>
          ))}
        </div>

        {remaining > 0 && (
          <div className="invoice-add-split">
            <select value={method} onChange={(e) => setMethod(e.target.value as any)}>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
              <option value="dms">DMS</option>
              <option value="installment_balance">Installment</option>
            </select>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(Number(e.target.value))} 
              max={remaining}
            />
            <button onClick={handleAdd}>????????</button>
          </div>
        )}

        <div className="invoice-actions">
          <button className="cancel-btn" onClick={onClose}>??????</button>
          <button 
            className="pay-btn" 
            disabled={totalPaid < totalAmount && remaining > 0} 
            onClick={handlePay}
          >
            ????????? ???????
          </button>
        </div>
      </div>
    </div>
  );
}
