import React, { useState, useEffect } from 'react';
import { useBillingStore } from '../stores/useBillingStore.js';
import { denteAdminSecretRequestHeaders } from '../AppHelpers.js';
import './InvoiceSplitPaymentModal.css';

interface InvoiceModalProps {
  invoiceId: string;
  totalAmount: number;
  patientId: string;
  onClose: () => void;
  onSuccess: (splits: any[]) => void;
}

export function InvoiceSplitPaymentModal({ invoiceId, totalAmount, patientId, onClose, onSuccess }: InvoiceModalProps) {
  const { splitPayments, addSplitPayment, removeSplitPayment } = useBillingStore();
  const [method, setMethod] = useState<'cash' | 'card' | 'dms' | 'family_wallet'>('card');
  const [amount, setAmount] = useState<number>(totalAmount);
  
  // Family Wallet State
  const [familyGroupId, setFamilyGroupId] = useState<string | null>(null);
  const [familyBalance, setFamilyBalance] = useState<number>(0);
  const [isLoadingFamily, setIsLoadingFamily] = useState(false);

  useEffect(() => {
    // Try to load family wallet info
    if (patientId) {
      setIsLoadingFamily(true);
      fetch(`/api/finance/family/patient/${patientId}`, { headers: denteAdminSecretRequestHeaders() })
        .then(res => {
          if (res.ok) return res.json();
          return null;
        })
        .then(data => {
          if (data && data.id) {
            setFamilyGroupId(data.id);
            setFamilyBalance(Number(data.balance || 0));
          }
          setIsLoadingFamily(false);
        })
        .catch(() => setIsLoadingFamily(false));
    }
  }, [patientId]);

  const totalPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = totalAmount - totalPaid;

  const handleAdd = () => {
    if (amount > 0 && amount <= remaining) {
      if (method === 'family_wallet' && amount > familyBalance) {
        alert('Недостаточно средств на семейном счете!');
        return;
      }
      const paymentData: any = { method, amount };
      if (method === 'family_wallet' && familyGroupId) paymentData.familyGroupId = familyGroupId;
      addSplitPayment(paymentData);
      setAmount(remaining - amount);
    }
  };

  const handlePay = async () => {
    try {
      // 1. Process family wallet payments first
      for (const p of splitPayments) {
        if (p.method === 'family_wallet' && p.familyGroupId) {
          const famRes = await fetch('/api/finance/family/pay', {
            method: 'POST',
            headers: denteAdminSecretRequestHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              patientId,
              familyGroupId: p.familyGroupId,
              amountRub: p.amount,
              documentId: invoiceId
            })
          });
          if (!famRes.ok) {
            const err = await famRes.json();
            alert(`Ошибка оплаты семейным счетом: ${err.message || err.error}`);
            return;
          }
        }
      }

      // 2. Process standard split-pay for cashLedger and Invoice Status
      const res = await fetch('/api/billing/split-pay', {
        method: 'POST',
        headers: denteAdminSecretRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ invoiceId, payments: splitPayments })
      });
      if (res.ok) {
        onSuccess(splitPayments);
      } else {
        const err = await res.json();
        alert(`Ошибка проведения счета: ${err.message || err.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка при выполнении оплаты');
    }
  };

  return (
    <div className="invoice-modal-overlay" onClick={onClose}>
      <div className="invoice-modal" onClick={e => e.stopPropagation()}>
        <h2>Оплата счета</h2>
        <div className="invoice-totals">
          <p>Сумма к оплате: <strong>{totalAmount.toLocaleString('ru-RU')} ₽</strong></p>
          <p>Остаток: <strong style={{ color: 'var(--accent)' }}>{remaining.toLocaleString('ru-RU')} ₽</strong></p>
        </div>

        <div className="invoice-splits">
          {splitPayments.map((p, i) => (
            <div key={i} className="split-item">
              <span>
                {p.method === 'card' ? 'Банковская карта' :
                 p.method === 'cash' ? 'Наличные' :
                 p.method === 'dms' ? 'ДМС' : 'Семейный счет'}
              </span>
              <span>{p.amount.toLocaleString('ru-RU')} ₽</span>
              <button onClick={() => removeSplitPayment(i)}>✕</button>
            </div>
          ))}
        </div>

        {remaining > 0 && (
          <div className="invoice-add-split">
            <select value={method} onChange={(e) => setMethod(e.target.value as any)}>
              <option value="card">Банковская карта</option>
              <option value="cash">Наличные</option>
              <option value="dms">ДМС</option>
              {familyGroupId && (
                <option value="family_wallet">
                  Семейный счет (Баланс: {familyBalance.toLocaleString('ru-RU')} ₽)
                </option>
              )}
            </select>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(Number(e.target.value))} 
              max={remaining}
            />
            <button onClick={handleAdd}>Добавить</button>
          </div>
        )}

        <div className="invoice-actions">
          <button className="cancel-btn" onClick={onClose}>Отмена</button>
          <button 
            className="pay-btn" 
            disabled={totalPaid < totalAmount && remaining > 0} 
            onClick={handlePay}
          >
            Подтвердить оплату
          </button>
        </div>
      </div>
    </div>
  );
}
