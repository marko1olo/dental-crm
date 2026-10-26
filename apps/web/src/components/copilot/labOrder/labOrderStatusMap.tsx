import React from 'react';
import { Package, Clock, CheckCircle2, AlertCircle, Truck } from 'lucide-react';

export interface LabStatusConfig {
  label: string;
  bg: string;
  fg: string;
  icon: React.ReactNode;
}

export const LAB_STATUS_MAP: Record<string, LabStatusConfig> = {
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
