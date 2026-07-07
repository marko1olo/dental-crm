import React, { useState, useEffect } from 'react';
import './InstallmentScheduler.css';

interface Installment {
  month: number;
  dueDate: string;
  amount: number;
}

export const InstallmentScheduler: React.FC<{ totalEstimate: number }> = ({ totalEstimate }) => {
  const [downPayment, setDownPayment] = useState<number>(0);
  const [months, setMonths] = useState<number>(3);
  const [discount, setDiscount] = useState<number>(0);
  const [installments, setInstallments] = useState<Installment[]>([]);

  useEffect(() => {
    // Cleanup state for State Bleeding Fix
    setDownPayment(0);
    setMonths(3);
    setDiscount(0);
    setInstallments([]);

    return () => {
      // Unmount cleanup
      setInstallments([]);
    };
  }, [totalEstimate]);

  const calculateInstallments = () => {
    const discountedTotal = totalEstimate * (1 - discount / 100);
    const remainder = discountedTotal - downPayment;
    
    if (remainder <= 0 || months <= 0) {
      setInstallments([]);
      return;
    }

    const monthlyAmount = remainder / months;
    const schedule: Installment[] = [];
    
    let currentDate = new Date();
    for (let i = 1; i <= months; i++) {
      currentDate.setMonth(currentDate.getMonth() + 1);
      schedule.push({
        month: i,
        dueDate: currentDate.toISOString().split('T')[0] || '',
        amount: Math.round(monthlyAmount),
      });
    }
    setInstallments(schedule);
  };

  return (
    <div className="installment-scheduler">
      <div className="scheduler-header">
        <h3>Installment Calculator</h3>
        <span className="total-badge">Total: {totalEstimate.toLocaleString()} ₽</span>
      </div>

      <div className="scheduler-controls">
        <div className="control-group">
          <label>Down Payment (₽)</label>
          <input 
            type="number" 
            value={downPayment} 
            onChange={(e) => setDownPayment(Number(e.target.value))}
            min="0"
          />
        </div>
        <div className="control-group">
          <label>Duration (Months)</label>
          <input 
            type="number" 
            value={months} 
            onChange={(e) => setMonths(Number(e.target.value))}
            min="1" max="24"
          />
        </div>
        <div className="control-group">
          <label>Discount (%)</label>
          <input 
            type="number" 
            value={discount} 
            onChange={(e) => setDiscount(Number(e.target.value))}
            min="0" max="100"
          />
        </div>
        <button className="calculate-btn" onClick={calculateInstallments}>
          Calculate
        </button>
      </div>

      {installments.length > 0 && (
        <div className="installments-preview">
          <h4>Payment Schedule</h4>
          <div className="installments-grid">
            {installments.map((inst) => (
              <div key={inst.month} className="installment-card">
                <div className="inst-month">Month {inst.month}</div>
                <div className="inst-date">{inst.dueDate}</div>
                <div className="inst-amount">{inst.amount.toLocaleString()} ₽</div>
              </div>
            ))}
          </div>
          <button className="confirm-plan-btn">Save Installment Plan</button>
        </div>
      )}
    </div>
  );
};
