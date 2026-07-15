import React from 'react';
import './ThermalReceiptSimulator.css';

interface ReceiptProps {
  receiptData: {
    clinicName: string;
    doctorName: string;
    items: Array<{ name: string; tooth?: string; price: number }>;
    splits: Array<{ method: string; amount: number }>;
    total: number;
    date: string;
  };
  onClose: () => void;
}

export function ThermalReceiptSimulator({ receiptData, onClose }: ReceiptProps) {
  return (
    <div className="receipt-overlay" onClick={onClose}>
      <div className="receipt-paper" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-header">
          <h2>{receiptData.clinicName}</h2>
          <p>Кассовый чек № 123456</p>
          <p>Врач: {receiptData.doctorName}</p>
          <p>Дата: {receiptData.date}</p>
        </div>
        <div className="receipt-divider">--------------------------------</div>
        <div className="receipt-items">
          {receiptData.items.map((item, i) => (
            <div key={i} className="receipt-item-row">
              <span className="item-name">{item.name} {item.tooth ? `(Зуб ${item.tooth})` : ''}</span>
              <span className="item-price">{item.price.toLocaleString('ru-RU')} ₽</span>
            </div>
          ))}
        </div>
        <div className="receipt-divider">--------------------------------</div>
        <div className="receipt-totals">
          <div className="receipt-total-row">
            <strong>Итого:</strong>
            <strong>{receiptData.total.toLocaleString('ru-RU')} ₽</strong>
          </div>
          {receiptData.splits.map((s, i) => (
            <div key={i} className="receipt-split-row">
              <span>{s.method.toUpperCase()}:</span>
              <span>{s.amount.toLocaleString('ru-RU')} ₽</span>
            </div>
          ))}
        </div>
        <div className="receipt-divider">--------------------------------</div>
        <div className="receipt-qr">
          <svg viewBox="0 0 100 100" width="80" height="80">
            <rect width="100" height="100" fill="#fff" />
            <path d="M10,10 h20 v20 h-20 z M15,15 h10 v10 h-10 z" fill="#000" />
            <path d="M70,10 h20 v20 h-20 z M75,15 h10 v10 h-10 z" fill="#000" />
            <path d="M10,70 h20 v20 h-20 z M15,75 h10 v10 h-10 z" fill="#000" />
            <rect x="40" y="40" width="20" height="20" fill="#000" />
            <rect x="10" y="40" width="10" height="10" fill="#000" />
            <rect x="70" y="40" width="10" height="10" fill="#000" />
          </svg>
        </div>
        <div className="receipt-footer">
          <p>Спасибо за оплату</p>
          <button className="print-btn" onClick={() => window.print()}>Распечатать</button>
        </div>
      </div>
    </div>
  );
}
