/**
 * DentalLabHubOrderCard.tsx — Карточка наряда ЗТЛ в реестре хаба лаборатории.
 * Мандаты 8b (60–90 строк), 8am (Единый дизайн-код).
 */

import React from "react";
import { User, Printer } from "lucide-react";
import { LAB_STAGES, formatKopecks } from "../labCatalogData";
import type { DentalLabHubOrder } from "../DentalLabOrdersHubModal";

export interface DentalLabHubOrderCardProps {
	readonly order: DentalLabHubOrder;
	readonly onPrint: (order: DentalLabHubOrder) => void;
}

export const DentalLabHubOrderCard: React.FC<DentalLabHubOrderCardProps> = ({ order, onPrint }) => {
	const stage = LAB_STAGES.find((s) => s.id === order.stageId) ?? LAB_STAGES[0]!;

	return (
		<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:border-teal-500/50 transition-colors shadow-2xs flex flex-col justify-between gap-3">
			<div>
				<div className="flex items-center justify-between gap-2 mb-1.5">
					<span className="text-xs font-bold text-[var(--teal,#0d9488)]">{order.orderNumber}</span>
					<span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${stage.badgeClass}`}>
						{stage.title}
					</span>
				</div>
				<h4 className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<User size={12} className="text-[var(--muted)]" />
					<span>{order.patientName}</span>
					<span className="text-[var(--muted)] font-normal">• Зуб {order.toothFdi}</span>
				</h4>
				<p className="text-[11px] text-[var(--ink)] font-medium mt-1">{order.constructionTitle}</p>
				<div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--muted)]">
					<span>Цвет: <strong className="text-[var(--ink)]">{order.shadeVita}</strong></span>
					{order.shadeStump && <span>• Культя: <strong className="text-[var(--ink)]">{order.shadeStump}</strong></span>}
					<span>• ЗТЛ: {order.labName.split("(")[0]}</span>
				</div>
			</div>

			<div className="pt-2 border-t border-[var(--line-subtle,#e2e8f0)] flex items-center justify-between gap-2 text-[11px]">
				<div>
					<span className="text-[var(--muted)]">Расход ЗТЛ: </span>
					<strong className="text-[var(--ink)]">{formatKopecks(order.labCostKopecks)}</strong>
				</div>
				<button
					type="button"
					onClick={() => onPrint(order)}
					data-testid="btn-print-lab-order"
					className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
					title="Распечатать наряд"
				>
					<Printer size={13} />
					<span>Бланк А4</span>
				</button>
			</div>
		</div>
	);
};
