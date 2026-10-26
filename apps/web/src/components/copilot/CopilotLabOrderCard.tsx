import React from 'react';
import { Package } from 'lucide-react';
import type { LabOrderItem, SelectIdHandler } from './copilotTypes';
import { CopilotLabOrderItem } from './labOrder/CopilotLabOrderItem';

export interface CopilotLabOrderCardProps {
  orders: LabOrderItem[];
  onSelectOrder?: SelectIdHandler;
}

export const CopilotLabOrderCard: React.FC<CopilotLabOrderCardProps> = ({ orders, onSelectOrder }) => {
  if (!orders.length) {
    return (
      <div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)] text-center">
        Лабораторные наряды не найдены
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] px-1 flex items-center gap-1.5">
        <Package className="w-3.5 h-3.5 text-[var(--teal)]" />
        <span>Зуботехнические наряды ({orders.length})</span>
      </div>

      <div className="space-y-2">
        {orders.map((order, idx) => (
          <CopilotLabOrderItem
            key={order.id || order.order_id || order.order_number || `lab-${idx + 1}`}
            order={order}
            index={idx}
            onSelectOrder={onSelectOrder}
          />
        ))}
      </div>
    </div>
  );
};
