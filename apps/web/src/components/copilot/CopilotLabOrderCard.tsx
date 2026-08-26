import React from 'react';
import { Package, Clock, CheckCircle2, AlertCircle, Truck, Sparkles } from 'lucide-react';
import type { LabOrderItem, SelectIdHandler } from './copilotTypes';
import { formatDateTime } from './useCopilotFormat';

export interface CopilotLabOrderCardProps {
  orders: LabOrderItem[];
  onSelectOrder?: SelectIdHandler;
}

const STATUS_MAP: Record<string, { label: string; bg: string; fg: string; icon: React.ReactNode }> = {
  in_production: {
    label: 'В производстве',
    bg: 'var(--teal-soft)',
    fg: 'var(--teal)',
    icon: <Clock className="w-3 h-3 text-[var(--teal)]" />,
  },
  sent_to_lab: {
    label: 'Отправлен в лабораторию',
    bg: 'var(--paper-soft)',
    fg: 'var(--muted)',
    icon: <Package className="w-3 h-3 text-[var(--muted)]" />,
  },
  in_transit: {
    label: 'В пути / Курьер',
    bg: 'var(--warn-bg)',
    fg: 'var(--warn-fg)',
    icon: <Truck className="w-3 h-3 text-[var(--warn-fg)]" />,
  },
  delivered: {
    label: 'Доставлен в клинику',
    bg: 'var(--ok-bg)',
    fg: 'var(--ok-fg)',
    icon: <CheckCircle2 className="w-3 h-3 text-[var(--ok-fg)]" />,
  },
  ready: {
    label: 'Готов к примерке',
    bg: 'var(--ok-bg)',
    fg: 'var(--ok-fg)',
    icon: <CheckCircle2 className="w-3 h-3 text-[var(--ok-fg)]" />,
  },
  fitting: {
    label: 'Примерка / Коррекция',
    bg: 'var(--warn-bg)',
    fg: 'var(--warn-fg)',
    icon: <Clock className="w-3 h-3 text-[var(--warn-fg)]" />,
  },
  delayed: {
    label: 'Задержан лабораторией',
    bg: 'var(--bad-bg)',
    fg: 'var(--bad-fg)',
    icon: <AlertCircle className="w-3 h-3 text-[var(--bad-fg)]" />,
  },
};

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
        {orders.map((order, idx) => {
          const orderId = order.id || order.order_id || order.order_number || `lab-${idx + 1}`;
          const prosthesis = order.prosthesis_kind || order.prosthesis_type || order.kind || 'Ортопедическая конструкция';
          const shade = order.vita_shade || order.shade;
          const statusKey = (order.status || 'in_production').toLowerCase();
          const statusConfig = STATUS_MAP[statusKey] || {
            label: order.status || 'В работе',
            bg: 'var(--paper-soft)',
            fg: 'var(--muted)',
            icon: <Package className="w-3 h-3" />,
          };
          const etaText = order.eta || order.delivery_date ? formatDateTime(String(order.eta || order.delivery_date)) : null;
          const teethText = order.teeth ? order.teeth.join(', ') : order.tooth_number || order.tooth;

          return (
            <div
              key={orderId}
              className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] hover:border-[var(--teal)] transition-all shadow-sm space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-[var(--teal)] bg-[var(--teal-soft)] px-1.5 py-0.5 rounded border border-[var(--teal-surface)]">
                      № {orderId}
                    </span>
                    <span className="font-semibold text-xs text-[var(--ink)] truncate">
                      {prosthesis}
                    </span>
                  </div>
                  {order.patient_name && (
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">Пациент: {order.patient_name}</p>
                  )}
                </div>

                {shade && (
                  <span
                    className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/50 shrink-0 shadow-xs flex items-center gap-1"
                    title={`VITA расцветка: ${shade}`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>{`VITA ${shade}`}</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--line)] text-[11px]">
                <span
                  className="px-2 py-0.5 rounded-full font-medium flex items-center gap-1.5"
                  style={{ backgroundColor: statusConfig.bg, color: statusConfig.fg }}
                >
                  {statusConfig.icon}
                  <span>{statusConfig.label}</span>
                </span>

                {teethText && (
                  <span className="text-[var(--muted)] bg-[var(--paper-soft)] px-1.5 py-0.5 rounded border border-[var(--line)]">
                    Зуб: <strong className="text-[var(--ink)]">{teethText}</strong>
                  </span>
                )}

                {etaText && (
                  <span className="text-[var(--muted)] ml-auto flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[var(--teal)] shrink-0" />
                    <span>Готовность: <strong className="text-[var(--ink)]">{etaText}</strong></span>
                  </span>
                )}
              </div>

              {order.lab_name && (
                <div className="text-[10px] text-[var(--muted)] truncate">
                  Лаборатория: <span className="text-[var(--ink)] font-medium">{order.lab_name}</span>
                </div>
              )}

              {onSelectOrder && (
                <button
                  type="button"
                  onClick={() => onSelectOrder(orderId)}
                  className="w-full mt-1 py-1 rounded bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] text-[var(--ink)] hover:text-[var(--teal)] text-xs font-medium border border-[var(--line)] hover:border-[var(--teal-surface)] transition-colors"
                >
                  Открыть наряд в ортопедии
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
