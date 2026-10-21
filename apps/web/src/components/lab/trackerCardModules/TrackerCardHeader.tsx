import React from "react";
import type { DentalLabOrderRecord, DentalLabStatusDef } from "../dentalLabOrderEngine";
import { formatFdiTeethDisplay } from "../dentalLabOrderEngine";

export interface TrackerCardHeaderProps {
	order: DentalLabOrderRecord;
	stDef: DentalLabStatusDef;
}

export function TrackerCardHeader({ order, stDef }: TrackerCardHeaderProps): React.JSX.Element {
	return (
		<div className="flex items-start justify-between gap-2">
			<div>
				<div className="flex items-center gap-1.5">
					<span className="font-mono font-bold text-xs text-[var(--ink,#0f172a)]">
						{order.orderNumber}
					</span>
					{order.isWarrantyRemake && (
						<span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
							Гарантия 0 ₽
						</span>
					)}
				</div>
				<div className="text-[11px] font-mono text-teal-700 dark:text-teal-300 font-bold mt-0.5">
					Зуб: #{formatFdiTeethDisplay(order.teethFdi)}
				</div>
			</div>

			<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${stDef.badgeClass}`}>
				{stDef.shortLabelRu}
			</span>
		</div>
	);
}
