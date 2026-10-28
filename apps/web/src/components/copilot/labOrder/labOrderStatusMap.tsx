import React from 'react';
import { Package, Clock, CheckCircle2, AlertCircle, Truck } from 'lucide-react';

export interface LabStatusConfig {
  label: string;
  bg: string;
  fg: string;
  icon: React.ReactNode;
}

export const LAB_STATUS_MAP: Record<string, LabStatusConfig> = {
  draft: {
    label: 'Черновик',
    bg: 'var(--paper-soft)',
    fg: 'var(--muted)',
    icon: <Package className="w-3 h-3 text-[var(--muted)]" />,
  },
  in_production: {
    label: 'На моделировании',
    bg: 'var(--teal-soft)',
    fg: 'var(--teal)',
    icon: <Clock className="w-3 h-3 text-[var(--teal)]" />,
  },
  in_progress: {
    label: 'На моделировании',
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
    label: 'Готов в клинике',
    bg: 'var(--ok-bg)',
    fg: 'var(--ok-fg)',
    icon: <CheckCircle2 className="w-3 h-3 text-[var(--ok-fg)]" />,
  },
  ready: {
    label: 'Готов в клинике',
    bg: 'var(--ok-bg)',
    fg: 'var(--ok-fg)',
    icon: <CheckCircle2 className="w-3 h-3 text-[var(--ok-fg)]" />,
  },
  ready_in_clinic: {
    label: 'Готов в клинике',
    bg: 'var(--ok-bg)',
    fg: 'var(--ok-fg)',
    icon: <CheckCircle2 className="w-3 h-3 text-[var(--ok-fg)]" />,
  },
  fitting: {
    label: 'На примерке',
    bg: 'var(--warn-bg)',
    fg: 'var(--warn-fg)',
    icon: <Clock className="w-3 h-3 text-[var(--warn-fg)]" />,
  },
  try_in: {
    label: 'На примерке',
    bg: 'var(--warn-bg)',
    fg: 'var(--warn-fg)',
    icon: <Clock className="w-3 h-3 text-[var(--warn-fg)]" />,
  },
  delivered_to_patient: {
    label: 'Установлен пациенту',
    bg: 'var(--ok-bg)',
    fg: 'var(--ok-fg)',
    icon: <CheckCircle2 className="w-3 h-3 text-[var(--ok-fg)]" />,
  },
  completed: {
    label: 'Установлен пациенту',
    bg: 'var(--ok-bg)',
    fg: 'var(--ok-fg)',
    icon: <CheckCircle2 className="w-3 h-3 text-[var(--ok-fg)]" />,
  },
  delayed: {
    label: 'Задержан лабораторией',
    bg: 'var(--bad-bg)',
    fg: 'var(--bad-fg)',
    icon: <AlertCircle className="w-3 h-3 text-[var(--bad-fg)]" />,
  },
};
