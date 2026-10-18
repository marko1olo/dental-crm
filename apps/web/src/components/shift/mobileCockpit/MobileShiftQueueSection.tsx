import React from "react";
import { CreditCard, FileText } from "lucide-react";
import { money } from "../../../AppHelpers";
import type { MobileShiftAppointmentSummary } from "./types";

export interface MobileShiftQueueSectionProps {
	readonly totalAppointmentsCount: number;
	readonly completedCount: number;
	readonly inChairCount: number;
	readonly activePatientFilter: "all" | "in_chair" | "waiting" | "payment";
	readonly setActivePatientFilter: (f: "all" | "in_chair" | "waiting" | "payment") => void;
	readonly filteredAppointments: readonly MobileShiftAppointmentSummary[];
	readonly onSelectAppointment?: ((id: string) => void) | undefined;
	readonly onOpenPatientEmk?: ((id: string) => void) | undefined;
	readonly onOpenCashCheckout?: ((id: string) => void) | undefined;
}

export const MobileShiftQueueSection: React.FC<MobileShiftQueueSectionProps> = ({
	totalAppointmentsCount,
	completedCount,
	inChairCount,
	activePatientFilter,
	setActivePatientFilter,
	filteredAppointments,
	onSelectAppointment,
	onOpenPatientEmk,
	onOpenCashCheckout,
}) => {
	const tabs = [
		{ id: "all" as const, label: `Все (${totalAppointmentsCount})` },
		{ id: "in_chair" as const, label: `В кресле (${inChairCount})` },
		{ id: "waiting" as const, label: "Ожидают" },
		{ id: "payment" as const, label: "Оплата" },
	];

	return (
		<section aria-label="Пациенты смены" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
			<div className="mobile-shift-section-title">
				<span>Пациенты смены ({totalAppointmentsCount})</span>
				<span style={{ fontSize: "11px", fontWeight: 600 }}>
					Принято: {completedCount} из {totalAppointmentsCount}
				</span>
			</div>

			<div className="flex w-full p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] gap-1" role="tablist" aria-label="Фильтр пациентов смены">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={activePatientFilter === tab.id}
						onClick={() => setActivePatientFilter(tab.id)}
						className={`flex-1 min-h-[44px] py-1 px-2 rounded-lg text-xs font-semibold transition-all ${
							activePatientFilter === tab.id ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div className="mobile-shift-consumables-card">
				{filteredAppointments.length > 0 ? (
					filteredAppointments.map((apt) => (
						<div key={apt.id} className="mobile-shift-consumable-item" onClick={() => onSelectAppointment?.(apt.id)} role="button" tabIndex={0}>
							<div className="mobile-shift-consumable-left">
								<div
									className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
									style={{
										background: apt.statusKey === "in_chair" ? "var(--teal-surface)" : apt.statusKey === "completed" ? "var(--ok-bg)" : "var(--paper-soft)",
										color: apt.statusKey === "in_chair" ? "var(--teal-dark)" : apt.statusKey === "completed" ? "var(--ok-fg)" : "var(--ink)",
									}}
								>
									{apt.timeStart}
								</div>
								<div className="mobile-shift-consumable-text">
									<span className="mobile-shift-consumable-name">{apt.patientName}</span>
									<span className="mobile-shift-consumable-sub">{apt.serviceTitle} · {money(apt.priceRub)}</span>
								</div>
							</div>

							<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
								{apt.statusKey === "in_chair" ? (
									<button
										type="button"
										className="min-h-[44px] px-3 py-1 rounded-lg text-xs font-bold bg-teal-600 text-white flex items-center gap-1 cursor-pointer"
										onClick={(e) => { e.stopPropagation(); onOpenPatientEmk?.(apt.patientId); }}
									>
										<FileText size={12} />
										<span>ЭМК</span>
									</button>
								) : apt.statusKey === "payment" ? (
									<button
										type="button"
										className="min-h-[44px] px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white flex items-center gap-1 cursor-pointer"
										onClick={(e) => { e.stopPropagation(); onOpenCashCheckout?.(apt.patientId); }}
									>
										<CreditCard size={12} />
										<span>Чек</span>
									</button>
								) : (
									<span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: "var(--paper-soft)", color: "var(--muted)", border: "1px solid var(--line)" }}>
										{apt.statusLabel}
									</span>
								)}
							</div>
						</div>
					))
				) : (
					<div style={{ padding: "18px 14px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
						Пациентов в этой очереди нет.
					</div>
				)}
			</div>
		</section>
	);
};
