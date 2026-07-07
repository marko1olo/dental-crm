import React from 'react';
import './FinancialDashboard.css';

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

  return (
    <div className="financial-dashboard" aria-label="Финансовая аналитика">
      <header className="financial-header">
        <h2>Dashboard Аналитики и Эффективности</h2>
      </header>
      
      <div className="metrics-grid">
        <article className="metric-card">
          <h3>Средний чек</h3>
          <p className="metric-value">{metrics.averageInvoice.toLocaleString('ru-RU')} ₽</p>
        </article>
        
        <article className="metric-card">
          <h3>Конверсия планов</h3>
          <p className="metric-value">{metrics.conversionRate.toFixed(1)}%</p>
          <small>Из черновика в работу</small>
        </article>
        
        <article className="metric-card highlight">
          <h3>Чистая Маржа</h3>
          <p className="metric-value">{margin.toLocaleString('ru-RU')} ₽</p>
          <small>Рентабельность: {marginPercentage}% (За вычетом зуботехнических расходов)</small>
        </article>
        
        <article className="metric-card danger">
          <h3>Задолженность</h3>
          <p className="metric-value">{metrics.totalDebts.toLocaleString('ru-RU')} ₽</p>
          <small>Лечение проведено, не оплачено</small>
        </article>
      </div>

      <div className="revenue-breakdown">
        <h3>Выручка по направлениям</h3>
        <div className="bars-container">
          <div className="bar-row">
            <span className="bar-label">Терапия</span>
            <div className="bar-track">
              <div 
                className="bar-fill therapy" 
                style={{ width: `${(metrics.revenueByDepartment.therapy / metrics.totalRevenue) * 100}%` }} 
              />
            </div>
            <span className="bar-value">{metrics.revenueByDepartment.therapy.toLocaleString('ru-RU')} ₽</span>
          </div>
          
          <div className="bar-row">
            <span className="bar-label">Ортопедия</span>
            <div className="bar-track">
              <div 
                className="bar-fill orthopedics" 
                style={{ width: `${(metrics.revenueByDepartment.orthopedics / metrics.totalRevenue) * 100}%` }} 
              />
            </div>
            <span className="bar-value">{metrics.revenueByDepartment.orthopedics.toLocaleString('ru-RU')} ₽</span>
          </div>

          <div className="bar-row">
            <span className="bar-label">Хирургия</span>
            <div className="bar-track">
              <div 
                className="bar-fill surgery" 
                style={{ width: `${(metrics.revenueByDepartment.surgery / metrics.totalRevenue) * 100}%` }} 
              />
            </div>
            <span className="bar-value">{metrics.revenueByDepartment.surgery.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
      </div>
    </div>
  );
}
