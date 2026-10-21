import React from "react";
import { AlertTriangle, Clock, Layers } from "lucide-react";
import type { DentalLabOrderData } from "../DentalLabOrderModal";

export interface TimelineHeaderProps {
	order: DentalLabOrderData;
	collision: { hasCollision: boolean; warningRu?: string };
}

export function TimelineHeader({ order, collision }: TimelineHeaderProps): React.JSX.Element {
	const orderNum = (order as unknown as { orderNumber?: string }).orderNumber || (order.id ? `#${order.id.slice(0, 8)}` : "ЗТЛ");

	return (
		<>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
						<Layers className="w-4 h-4" />
					</div>
					<div>
						<h4 className="font-bold text-xs text-[var(--ink)] m-0 leading-tight">
							Клинико-лабораторный маршрут ЗТЛ (6 этапов)
						</h4>
						<p className="text-[11px] text-[var(--muted)] m-0">
							Наряд: <strong className="font-mono text-teal-600 dark:text-teal-400">{orderNum}</strong> · Пациент: {order.patientName || "Пациент"}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{order.dueDate && (
						<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[11px] font-mono">
							<Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
							<span>Срок сдачи: <strong>{new Date(order.dueDate).toLocaleDateString("ru-RU")}</strong></span>
						</div>
					)}
				</div>
			</div>

			{collision.hasCollision && (
				<div
					className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-start gap-2 text-xs text-amber-950 dark:text-amber-100"
					data-testid="timeline-fitting-collision-alert"
				>
					<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
					<div className="min-w-0">
						<div className="font-bold text-xs">Коллизия в расписании визитов</div>
						<div className="text-[11px] text-amber-900/80 dark:text-amber-300/80">
							{collision.warningRu || "Визит на примерку назначен раньше расчетной готовности работы в лаборатории."}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
