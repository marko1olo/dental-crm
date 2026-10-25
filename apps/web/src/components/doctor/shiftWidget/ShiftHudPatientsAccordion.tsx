/**
 * ShiftHudPatientsAccordion.tsx — Аккордеон приемов пациентов и вычетов за смену.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import React from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import type { ChairsideShiftEarningsSummary } from "../doctorShiftEarnings.js";

export interface ShiftHudPatientsAccordionProps {
	readonly summary: ChairsideShiftEarningsSummary;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

export const ShiftHudPatientsAccordion: React.FC<ShiftHudPatientsAccordionProps> = ({
	summary,
	isOpen,
	onToggle,
}) => {
	return (
		<>
			<div className="px-3.5 pb-2">
				<button
					type="button"
					onClick={onToggle}
					className="w-full py-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-between border-t border-[var(--line)] pt-2 cursor-pointer"
					data-testid="btn-toggle-patient-details"
				>
					<span className="flex items-center gap-1">
						<Users className="w-3 h-3" />
						<span>Детализация по пациентам ({summary.patientItems.length})</span>
					</span>
					{isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
				</button>
			</div>

			{isOpen && (
				<div className="doctor-shift-hud-patients-list" data-testid="hud-patients-list">
					{summary.patientItems.length === 0 ? (
						<div className="text-[11px] text-[var(--muted)] text-center py-2">
							Нет завершенных приемов на текущую смену
						</div>
					) : (
						summary.patientItems.map((item) => (
							<div key={item.appointmentId} className="doctor-shift-hud-patient-row" data-testid={`patient-row-${item.patientId}`}>
								<div className="flex flex-col min-w-0 pr-2">
									<span className="font-bold text-[var(--ink)] truncate">
										{item.patientFullName}
									</span>
									<span className="text-[10px] text-[var(--muted)] truncate">
										{item.serviceTitles.join(", ") || "Консультация"}
									</span>
									{item.labCostKop > 0 && (
										<span className="text-[9px] text-rose-600">
											ЗТЛ: −{Math.round(item.labCostKop / 100).toLocaleString("ru-RU")} ₽
										</span>
									)}
								</div>
								<div className="text-right shrink-0">
									<span className="font-bold font-mono text-emerald-700 dark:text-emerald-400 block">
										+{Math.round(item.doctorEarnedKop / 100).toLocaleString("ru-RU")} ₽
									</span>
									<span className="text-[9px] text-[var(--muted)] font-mono">
										{Math.round(item.grossRevenueKop / 100).toLocaleString("ru-RU")} ₽
									</span>
								</div>
							</div>
						))
					)}
				</div>
			)}
		</>
	);
};
