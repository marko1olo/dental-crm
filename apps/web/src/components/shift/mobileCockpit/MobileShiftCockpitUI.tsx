import React from "react";
import { countLabel } from "../../../lib/russianPlural";
import { Syringe, ShieldCheck, Package, Minus, Plus, FileText, CreditCard } from "lucide-react";
import { money } from "../../../AppHelpers";
import type { MobileShiftCockpitProps, MobileShiftConsumableItem, MobileShiftAppointmentSummary } from "./types";

export interface MobileShiftCockpitUIProps extends MobileShiftCockpitProps {
	consumables: MobileShiftConsumableItem[];
	handleAdjustConsumable: (id: string, delta: number) => void;
	activePatientFilter: "all" | "in_chair" | "waiting" | "payment";
	setActivePatientFilter: (f: "all" | "in_chair" | "waiting" | "payment") => void;
	filteredAppointments: readonly MobileShiftAppointmentSummary[];
}

export const MobileShiftCockpitUI: React.FC<MobileShiftCockpitUIProps> = ({
	totalAppointmentsCount = 6,
	completedCount = 4,
	inChairCount = 1,
	consumables,
	handleAdjustConsumable,
	activePatientFilter,
	setActivePatientFilter,
	filteredAppointments,
	onSelectAppointment,
	onOpenPatientEmk,
	onOpenCashCheckout,
}) => {
	return (
		<>
			{/* Consumables Card */}
			<section
				aria-label="Сверка списанных материалов за смену"
				style={{ display: "flex", flexDirection: "column", gap: "6px" }}
			>
				<div className="mobile-shift-section-title">
					<span>Сверка материалов за смену</span>
					<span style={{ fontSize: "11px", fontWeight: 600, color: "var(--teal-dark)" }}>
						{countLabel(consumables.length, "позиция", "позиции", "позиций")}
					</span>
				</div>

				<div className="mobile-shift-consumables-card" data-testid="consumables-reconciliation-card">
					{consumables.map((item) => (
						<div key={item.id} className="mobile-shift-consumable-item">
							<div className="mobile-shift-consumable-left">
								<div className="mobile-shift-consumable-icon" aria-hidden="true">
									{item.category === "Анестезия" ? (
										<Syringe size={17} />
									) : item.category === "Стерилизация" ? (
										<ShieldCheck size={17} />
									) : (
										<Package size={17} />
									)}
								</div>
								<div className="mobile-shift-consumable-text">
									<span className="mobile-shift-consumable-name">{item.name}</span>
									<div className="mobile-shift-consumable-sub">
										<span>
											Списано: <strong style={{ color: "var(--ink)" }}>{item.deductedCount} {item.unitName}</strong>
										</span>
										<span style={{ opacity: 0.6 }}>·</span>
										<span>В кабинете: {item.stockRemaining} {item.unitName}</span>
									</div>
								</div>
							</div>

							<div
								className="mobile-shift-stepper"
								role="group"
								aria-label={`Корректировка ${item.name}`}
							>
								<button
									type="button"
									className="mobile-shift-step-btn"
									onClick={() => handleAdjustConsumable(item.id, -1)}
									title="Уменьшить списание"
									aria-label={`Уменьшить списание ${item.name}`}
								>
									<Minus size={14} />
								</button>
								<span className="mobile-shift-step-val">{item.deductedCount}</span>
								<button
									type="button"
									className="mobile-shift-step-btn"
									onClick={() => handleAdjustConsumable(item.id, 1)}
									title="Добавить списание"
									aria-label={`Добавить списание ${item.name}`}
								>
									<Plus size={14} />
								</button>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Patients Shift Queue & Agenda */}
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
							className={`flex-1 min-h-[36px] py-1 px-2 rounded-lg text-xs font-semibold transition-all ${
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
											className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-600 text-white flex items-center gap-1 cursor-pointer"
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
											className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white flex items-center gap-1 cursor-pointer"
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
		</>
	);
};
