import React from 'react';
import type { LabOrderItem, SelectIdHandler } from '../copilotTypes';
import { CopilotLabOrderCard } from '../CopilotLabOrderCard';

type Obj = Record<string, unknown>;

export function renderLabSection(
  tool: string,
  obj: Obj,
  result: unknown,
  onSelectOrder?: SelectIdHandler,
): React.ReactNode | null {
  const isLab =
    tool.includes('lab') ||
    tool.includes('prosthetic') ||
    Array.isArray(obj.lab_orders) ||
    Array.isArray(obj.orders) ||
    typeof obj.prosthesis_kind === 'string' ||
    typeof obj.vita_shade === 'string';

  if (!isLab) return null;

  const orders: LabOrderItem[] = Array.isArray(obj.lab_orders)
    ? (obj.lab_orders as LabOrderItem[])
    : Array.isArray(obj.orders)
    ? (obj.orders as LabOrderItem[])
    : Array.isArray(result) && result.length > 0 && ('prosthesis_kind' in (result[0] as Obj) || 'order_id' in (result[0] as Obj))
    ? (result as LabOrderItem[])
    : typeof obj.prosthesis_kind === 'string' || typeof obj.order_id === 'string'
    ? [obj as unknown as LabOrderItem]
    : [];

  if (orders.length > 0) {
    return <CopilotLabOrderCard orders={orders} onSelectOrder={onSelectOrder} />;
  }

  return null;
}
