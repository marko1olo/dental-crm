import React, { useEffect, useState } from 'react';
import './DoctorPayoutDashboard.css';

interface Payout {
  id: string;
  doctorName: string;
  revenue: number;
  materialCost: number;
  commissionRate: number;
  netPayout: number;
  date: string;
}

export function DoctorPayoutDashboard() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/billing/payouts')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data.payouts)) {
          const mapped: Payout[] = data.payouts.map((item: any) => ({
            id: item.id,
            doctorName: item.doctorName ?? item.staffName ?? 'Врач не указан',
            revenue: parseFloat(item.revenue ?? item.totalAmountRub ?? 0),
            materialCost: parseFloat(item.materialCost ?? 0),
            commissionRate: parseFloat(item.commissionRate ?? item.commissionPercent ?? 0),
            netPayout: parseFloat(item.netPayout ?? 0),
            date: item.date ? new Date(item.date).toLocaleDateString('ru-RU') : '—'
          }));
          setPayouts(mapped);
        } else {
          setPayouts([]);
        }
      })
      .catch(e => {
        setError(e.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });

  if (isLoading) return <div className="payout-dashboard"><p style={{ padding: 20 }}>Загрузка выплат...</p></div>;
  if (error) return <div className="payout-dashboard"><p style={{ padding: 20, color: 'var(--danger, #ef4444)' }}>Ошибка загрузки: {error}</p></div>;

  return (
    <div className="payout-dashboard">
      <header className="payout-header">
        <h2>Выплаты врачам</h2>
      </header>
      <div className="payout-table-wrapper">
        <table className="payout-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Врач</th>
              <th>Выручка</th>
              <th>Материалы</th>
              <th>Комиссия (%)</th>
              <th>К выплате</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id}>
                <td>{p.date}</td>
                <td>{p.doctorName}</td>
                <td>{fmt(p.revenue)} ₽</td>
                <td className="cost">−{fmt(p.materialCost)} ₽</td>
                <td>{p.commissionRate}%</td>
                <td className="net">{fmt(p.netPayout)} ₽</td>
              </tr>
            ))}
            {payouts.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-faint)' }}>
                  Нет начисленных выплат
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
