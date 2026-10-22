import React from "react";
import { Clock, Printer } from "lucide-react";
import type { LabOrder } from "./labOrdersTypes";

export interface LabOrderCardItemProps {
	order: LabOrder;
	onOpenPrintOrder?: (order: LabOrder) => void;
}

export const LabOrderCardItem: React.FC<LabOrderCardItemProps> = ({ order, onOpenPrintOrder }) => {
	return (
		<div className="lab-order-card p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between">
			<div>
				<div className="font-bold text-sm text-[var(--ink)]">
					{order.toothFdi ? `Зуб ${order.toothFdi}` : "Конструкция"} • {order.material || "Материал"}
				</div>
				<div className="text-xs text-[var(--muted)] flex items-center gap-1 mt-1">
					<Clock size={12} />
					<span>Создан: {new Date(order.createdAt).toLocaleDateString("ru-RU")}</span>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => onOpenPrintOrder?.(order)}
					className="secondary-button text-xs min-h-[32px] px-3 flex items-center gap-1.5"
					title="Распечатать заказ"
				>
					<Printer size={14} />
					<span>Печать заказа</span>
				</button>
			</div>
		</div>
	);
};

export default LabOrderCardItem;
