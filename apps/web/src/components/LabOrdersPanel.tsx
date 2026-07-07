import React from 'react';
import './LabOrdersPanel.css';

export type LabOrderStatus = 'draft' | 'sent' | 'in_progress' | 'delivered' | 'fitting' | 'refitting' | 'completed';

export interface LabOrder {
  id: string;
  fdiTooth: string;
  workType: string;
  material: string;
  shade: string;
  status: LabOrderStatus;
  plannedFittingDate: string | null;
  deliveryDate: string | null;
  labCostAmount: number;
}

interface LabOrdersPanelProps {
  orders: LabOrder[];
  nextAppointmentDate?: string | null;
}

const statusLabels: Record<LabOrderStatus, string> = {
  draft: 'Черновик',
  sent: 'Отправлен',
  in_progress: 'В работе',
  delivered: 'Доставлен',
  fitting: 'На примерке',
  refitting: 'Переделка',
  completed: 'Установлен'
};

export function LabOrdersPanel({ orders, nextAppointmentDate }: LabOrdersPanelProps) {
  if (orders.length === 0) {
    return (
      <div className="lab-orders-empty">
        <p>Нет активных зуботехнических заказов</p>
      </div>
    );
  }

  return (
    <div className="lab-orders-panel" aria-label="Панель ортопедических заказов">
      <header className="lab-orders-header">
        <h3>Лабораторные работы ({orders.length})</h3>
      </header>
      
      <div className="lab-orders-list">
        {orders.map(order => {
          // Warning logic: if delivery date is after appointment
          let showWarning = false;
          if (nextAppointmentDate && order.deliveryDate && order.status !== 'delivered' && order.status !== 'completed') {
            const appointment = new Date(nextAppointmentDate);
            const delivery = new Date(order.deliveryDate);
            if (delivery > appointment) {
              showWarning = true;
            }
          }

          return (
            <article key={order.id} className={`lab-order-card status-${order.status}`}>
              <div className="lab-order-main">
                <span className="fdi-badge">{order.fdiTooth}</span>
                <div className="order-details">
                  <strong>{order.workType.toUpperCase()}</strong>
                  <small>{order.material} · {order.shade || 'Без цвета'}</small>
                </div>
              </div>
              
              <div className="lab-order-meta">
                <span className={`status-badge ${order.status}`}>{statusLabels[order.status]}</span>
                {order.deliveryDate && (
                  <span className="delivery-date">
                    Доставка: {new Date(order.deliveryDate).toLocaleDateString()}
                  </span>
                )}
                <span className="cost">{order.labCostAmount} ₽</span>
              </div>

              {showWarning && (
                <div className="lab-order-warning">
                  ⚠️ Внимание: дата примерки пациента ближе, чем дата плановой доставки из лаборатории!
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
