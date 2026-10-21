import React from "react";
import type { DentalLabOrderData } from "../DentalLabOrderModal";
import { formatLabOrderTeethOrJaw, isJawWideConstruction } from "../labMath";

export interface LabOrderCardHeaderProps {
	order: DentalLabOrderData;
	getStatusBadge: (status?: string) => React.ReactNode;
}

export function LabOrderCardHeader({
	order,
	getStatusBadge,
}: LabOrderCardHeaderProps): React.JSX.Element {
	const isJawWide =
		order.jawScope ||
		isJawWideConstruction(order.constructionType) ||
		Boolean(
			order.toothFdi &&
				(order.toothFdi.includes("челюст") ||
					order.toothFdi.includes("В/Ч") ||
					order.toothFdi.includes("Н/Ч")),
		);

	return (
		<div className="flex items-start justify-between gap-2 min-w-0">
			<div className="flex items-center gap-2 min-w-0 flex-1">
				<span
					className={`min-h-[36px] px-2.5 py-1 rounded-xl font-extrabold text-xs flex items-center justify-center text-center shrink-0 ${
						isJawWide
							? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
							: "bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-400 font-mono"
					}`}
					title={order.toothFdi || "Челюсть / Зубы"}
				>
					{formatLabOrderTeethOrJaw(order)}
				</span>
				<div className="min-w-0 flex-1">
					<h3 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0 break-words leading-snug">
						{order.patientName || "Пациент"}
					</h3>
					<span className="text-xs text-[var(--muted)] block break-words leading-snug">
						Врач: {order.doctorName || "Не указан"}
					</span>
				</div>
			</div>

			<div className="shrink-0">{getStatusBadge(order.status)}</div>
		</div>
	);
}
