import React from "react";
import { FlaskConical, X } from "lucide-react";
import { formatGostOrderNumber, type DentalLabOrderData } from "../labMath";

export interface LabTrackingDrawerHeaderProps {
	order: DentalLabOrderData;
	onClose: () => void;
}

export function LabTrackingDrawerHeader({
	order,
	onClose,
}: LabTrackingDrawerHeaderProps): React.JSX.Element {
	return (
		<div className="flex items-center justify-between px-6 py-5 border-b border-[var(--line)] bg-[var(--paper-soft)]">
			<div className="flex items-center gap-3">
				<div className="w-11 h-11 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] shadow-sm">
					<FlaskConical className="w-6 h-6" />
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h2 id="lab-drawer-title" className="text-base sm:text-lg font-bold text-[var(--ink)] m-0">
							{formatGostOrderNumber(order.secureToken)}
						</h2>
						<span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]">
							ЗТЛ Трекинг
						</span>
					</div>
					<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
						Пациент: <span className="font-bold text-[var(--ink)]">{order.patientName || "Пациент"}</span> · Врач: <span className="font-bold text-[var(--ink)]">{order.doctorName || "Лечащий врач"}</span>
					</p>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
				aria-label="Закрыть панель трекинга"
			>
				<X className="w-6 h-6" />
			</button>
		</div>
	);
}
