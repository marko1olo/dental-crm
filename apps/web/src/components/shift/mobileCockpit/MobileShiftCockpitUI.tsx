import React, { useState } from "react";
import { Calculator, Calendar, CreditCard, FileText } from "lucide-react";
import { money } from "../../../AppHelpers";
import { ChairRentalShiftWidget } from "../ChairRentalShiftWidget";
import type {
	MobileShiftAppointmentSummary,
	MobileShiftCockpitProps,
	MobileShiftConsumableItem,
} from "./types";

export interface MobileShiftCockpitUIProps extends MobileShiftCockpitProps {
	consumables: MobileShiftConsumableItem[];
	handleAdjustConsumable: (id: string, delta: number) => void;
	activePatientFilter: "all" | "in_chair" | "waiting" | "payment";
	setActivePatientFilter: (f: "all" | "in_chair" | "waiting" | "payment") => void;
	filteredAppointments: readonly MobileShiftAppointmentSummary[];
}

export const MobileShiftCockpitUI: React.FC<MobileShiftCockpitUIProps> = ({
	doctorName = "Д-р Смирнова Е.В.",
	totalRevenueRub = 42500,
	totalAppointmentsCount = 6,
	completedCount = 4,
	inChairCount = 1,
	activePatientFilter,
	setActivePatientFilter,
	filteredAppointments,
	onSelectAppointment,
	onOpenPatientEmk,
	onOpenCashCheckout,
}) => {
	const [mobileSection, setMobileSection] = useState<"queue" | "rental">(() => {
		try {
			const saved = window.localStorage.getItem("dente_mobile_shift_tab");
			if (saved === "queue" || saved === "rental") return saved;
		} catch {}
		return "rental";
	});
	const [rentalNetProfitRub, setRentalNetProfitRub] = useState<number>(30200);

	const handleSelectSection = (sec: "queue" | "rental") => {
		setMobileSection(sec);
		try {
			window.localStorage.setItem("dente_mobile_shift_tab", sec);
		} catch {}
	};

	return (
		<>
			{/* Segmented Mode Switcher: Очередь приёмов vs Субаренда кресла (Apple HIG >= 44px) */}
			<div
				role="tablist"
				aria-label="Раздел мобильной смены врача"
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "6px",
					padding: "4px",
					borderRadius: "12px",
					background: "var(--paper-soft)",
					border: "1px solid var(--line)",
				}}
				data-testid="mobile-shift-section-tabs"
			>
				<button
					type="button"
					role="tab"
					aria-selected={mobileSection === "queue"}
					onClick={() => handleSelectSection("queue")}
					data-testid="mobile-shift-tab-queue"
					style={{
						minHeight: "44px",
						padding: "0 8px",
						borderRadius: "9px",
						fontSize: "12px",
						fontWeight: 700,
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "5px",
						border:
							mobileSection === "queue"
								? "1px solid var(--line)"
								: "1px solid transparent",
						background:
							mobileSection === "queue" ? "var(--paper)" : "transparent",
						color:
							mobileSection === "queue" ? "var(--ink)" : "var(--muted)",
						cursor: "pointer",
						whiteSpace: "nowrap",
					}}
				>
					<Calendar size={14} style={{ flexShrink: 0 }} />
					<span>Очередь ({totalAppointmentsCount})</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={mobileSection === "rental"}
					onClick={() => handleSelectSection("rental")}
					data-testid="mobile-shift-tab-rental"
					style={{
						minHeight: "44px",
						padding: "0 8px",
						borderRadius: "9px",
						fontSize: "12px",
						fontWeight: 700,
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "5px",
						border:
							mobileSection === "rental"
								? "1px solid var(--line)"
								: "1px solid transparent",
						background:
							mobileSection === "rental" ? "var(--paper)" : "transparent",
						color:
							mobileSection === "rental" ? "var(--teal)" : "var(--muted)",
						cursor: "pointer",
						whiteSpace: "nowrap",
					}}
				>
					<Calculator size={14} style={{ flexShrink: 0 }} />
					<span>Субаренда ({money(rentalNetProfitRub)})</span>
				</button>
			</div>

			{mobileSection === "rental" ? (
				/* Субаренда кресла и экономика смены врача (без обрезанных хвостов очереди внизу экрана) */
				<ChairRentalShiftWidget
					doctorFullName={doctorName}
					initialGrossRevenueRub={totalRevenueRub}
					onEconomicsChange={(econ) => setRentalNetProfitRub(econ.netProfitRub)}
				/>
			) : (
				/* Очередь приёмов смены (на первом экране без скролла) */
				<section
					aria-label="Пациенты смены"
					style={{ display: "flex", flexDirection: "column", gap: "8px" }}
				>
					<div className="mobile-shift-section-title">
						<span>Пациенты смены ({totalAppointmentsCount})</span>
						<span style={{ fontSize: "11px", fontWeight: 600 }}>
							Принято: {completedCount} из {totalAppointmentsCount}
						</span>
					</div>

					<div
						className="flex w-full p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] gap-1"
						role="tablist"
						aria-label="Фильтр пациентов смены"
					>
						{(
							[
								{ id: "all", label: `Все (${totalAppointmentsCount})` },
								{ id: "in_chair", label: `В кресле (${inChairCount})` },
								{ id: "waiting", label: "Ожидают" },
								{ id: "payment", label: "Оплата" },
							] as const
						).map((tab) => (
							<button
								key={tab.id}
								type="button"
								role="tab"
								aria-selected={activePatientFilter === tab.id}
								onClick={() => setActivePatientFilter(tab.id)}
								className={`flex-1 min-h-[44px] py-1 px-2 rounded-lg text-xs font-semibold transition-all ${
									activePatientFilter === tab.id
										? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>

					<div className="mobile-shift-consumables-card">
						{filteredAppointments.length > 0 ? (
							filteredAppointments.map((apt) => (
								<div
									key={apt.id}
									className="mobile-shift-consumable-item"
									onClick={() => onSelectAppointment?.(apt.id)}
									role="button"
									tabIndex={0}
								>
									<div className="mobile-shift-consumable-left">
										<div
											className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
											style={{
												background:
													apt.statusKey === "in_chair"
														? "var(--teal-surface)"
														: apt.statusKey === "completed"
															? "var(--ok-bg)"
															: "var(--paper-soft)",
												color:
													apt.statusKey === "in_chair"
														? "var(--teal-dark)"
														: apt.statusKey === "completed"
															? "var(--ok-fg)"
															: "var(--ink)",
											}}
										>
											{apt.timeStart}
										</div>
										<div className="mobile-shift-consumable-text">
											<span className="mobile-shift-consumable-name">
												{apt.patientName}
											</span>
											<span className="mobile-shift-consumable-sub">
												{apt.serviceTitle} · {money(apt.priceRub)}
											</span>
										</div>
									</div>

									<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
										{apt.statusKey === "in_chair" ? (
											<button
												type="button"
												className="min-h-[44px] px-3 py-1 rounded-lg text-xs font-bold bg-teal-600 text-white flex items-center gap-1 cursor-pointer"
												onClick={(e) => {
													e.stopPropagation();
													onOpenPatientEmk?.(apt.patientId);
												}}
											>
												<FileText size={12} />
												<span>ЭМК</span>
											</button>
										) : apt.statusKey === "payment" ? (
											<button
												type="button"
												className="min-h-[44px] px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white flex items-center gap-1 cursor-pointer"
												onClick={(e) => {
													e.stopPropagation();
													onOpenCashCheckout?.(apt.patientId);
												}}
											>
												<CreditCard size={12} />
												<span>Чек</span>
											</button>
										) : (
											<span
												className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
												style={{
													background: "var(--paper-soft)",
													color: "var(--muted)",
													border: "1px solid var(--line)",
												}}
											>
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
			)}
		</>
	);
};

