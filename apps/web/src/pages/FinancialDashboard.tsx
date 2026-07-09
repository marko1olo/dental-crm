import React, { useState, useEffect } from 'react';
import './FinancialDashboard.css';
import { DoctorPayoutDashboard } from './DoctorPayoutDashboard.js';
import { InvoiceSplitPaymentModal } from './InvoiceSplitPaymentModal.js';
import { ThermalReceiptSimulator } from './ThermalReceiptSimulator.js';
import { useBillingStore } from '../stores/useBillingStore.js';

export interface FinancialMetrics {
  averageInvoice: number;
  conversionRate: number; // percentage
  revenueByDepartment: {
    therapy: number;
    orthopedics: number;
    surgery: number;
  };
  totalRevenue: number;
  totalLabCosts: number;
  totalDebts: number;
}

export function FinancialDashboard({ metrics }: { metrics: FinancialMetrics }) {
  const margin = metrics.totalRevenue - metrics.totalLabCosts;
  const marginPercentage = metrics.totalRevenue > 0 
    ? ((margin / metrics.totalRevenue) * 100).toFixed(1) 
    : '0.0';

  const [showModal, setShowModal] = useState(false);
  const { receiptBuffer, setReceiptBuffer, purgeState } = useBillingStore();
  
  // OOM safety cleanup
  useEffect(() => {
    return () => {
      purgeState();
    };
  }, [purgeState]);

  const handlePaymentSuccess = (splits: any[]) => {
    setShowModal(false);
    // Show mock receipt
    setReceiptBuffer({
      clinicName: 'DENTE Premium Clinic',
      doctorName: 'Dr. Smith',
      items: [{ name: 'Composite Filling', tooth: '14', price: 15000 }],
      splits,
      total: 15000,
      date: new Date().toLocaleString()
    });
  };

  return (
    <div className="financial-dashboard" aria-label="Financial Dashboard">
      <header className="financial-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Dashboard Finance & Billing</h2>
        <button 
          style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          onClick={() => setShowModal(true)}
          className="demo-pay-btn"
        >
          ????????? ????? (Demo)
        </button>
      </header>
      
      <div className="metrics-grid">
        <article className="metric-card">
          <h3>??? ???</h3>
          <p className="metric-value">{metrics.averageInvoice.toLocaleString('ru-RU')} '?.</p>
        </article>
        
        <article className="metric-card">
          <h3>??????????</h3>
          <p className="metric-value">{metrics.conversionRate.toFixed(1)}%</p>
        </article>
        
        <article className="metric-card highlight">
          <h3>?????? ??????</h3>
          <p className="metric-value">{margin.toLocaleString('ru-RU')} '?.</p>
        </article>
        
        <article className="metric-card danger">
          <h3>?????????????</h3>
          <p className="metric-value">{metrics.totalDebts.toLocaleString('ru-RU')} '?.</p>
        </article>
      </div>

      <DoctorPayoutDashboard />

      {showModal && (
        <InvoiceSplitPaymentModal
          invoiceId="mock-invoice-id"
          totalAmount={15000}
          onClose={() => setShowModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
      
      {receiptBuffer && (
        <ThermalReceiptSimulator
          receiptData={receiptBuffer}
          onClose={() => setReceiptBuffer(null)}
        />
      )}
    </div>
  );
}
