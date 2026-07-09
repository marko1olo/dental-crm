import React, { useEffect, useState } from 'react';
import './DoctorPayoutDashboard.css';

export function DoctorPayoutDashboard() {
  const [payouts, setPayouts] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/billing/payouts')
      .then(res => res.json())
      .then(data => {
        if (data.payouts) {
          // Mock data generation based on paid invoices for UI demo purposes
          const mockPayouts = data.payouts.map((inv: any) => ({
            id: inv.id,
            doctorName: 'Dr. John Doe', // Mapped from visit -> user
            revenue: parseFloat(inv.totalAmountRub),
            materialCost: parseFloat(inv.totalAmountRub) * 0.15, // 15% assumed material cost
            commissionRate: 30, // 30%
            netPayout: (parseFloat(inv.totalAmountRub) - (parseFloat(inv.totalAmountRub) * 0.15)) * 0.30,
            date: new Date(inv.createdAt).toLocaleDateString()
          }));
          setPayouts(mockPayouts);
        }
      });
  }, []);

  return (
    <div className="payout-dashboard">
      <header className="payout-header">
        <h2>????????? ?????????? ??????</h2>
      </header>
      <div className="payout-table-wrapper">
        <table className="payout-table">
          <thead>
            <tr>
              <th>????</th>
              <th>??????</th>
              <th>???????</th>
              <th>??????????</th>
              <th>???????? (%)</th>
              <th>? ???????</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p, i) => (
              <tr key={i}>
                <td>{p.date}</td>
                <td>{p.doctorName}</td>
                <td>{p.revenue.toLocaleString('ru-RU')} '?.</td>
                <td className="cost">-{p.materialCost.toLocaleString('ru-RU')} '?.</td>
                <td>{p.commissionRate}%</td>
                <td className="net">{p.netPayout.toLocaleString('ru-RU')} '?.</td>
              </tr>
            ))}
            {payouts.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                  ??? ?????????? ????????????...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
