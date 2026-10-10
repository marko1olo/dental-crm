import React from "react";
import { Plus, Banknote, CheckCircle2, Unlock, X, Check, Printer } from "lucide-react";
import { money } from "../../../AppHelpers";
import type { MobileShiftCockpitProps, MobileShiftConsumableItem } from "./types";

export interface ShiftActionsToolbarProps extends MobileShiftCockpitProps {
	isCashInSheetOpen: boolean;
	setIsCashInSheetOpen: (val: boolean) => void;
	isCashOutSheetOpen: boolean;
	setIsCashOutSheetOpen: (val: boolean) => void;
	isHandoverSheetOpen: boolean;
	setIsHandoverSheetOpen: (val: boolean) => void;
	cashInAmount: number;
	setCashInAmount: (val: number) => void;
	cashInReason: string;
	setCashInReason: (val: string) => void;
	isSubmittingCashIn: boolean;
	cashOutMode: "full" | "keep_float" | "z_only";
	setCashOutMode: (val: "full" | "keep_float" | "z_only") => void;
	isSubmittingCashOut: boolean;
	handleConfirmCashIn: () => void;
	handleConfirmCashOutAndZReport: () => void;
	handleConfirmHandoverShift: () => void;
	consumables: MobileShiftConsumableItem[];
}

export const ShiftActionsToolbar: React.FC<ShiftActionsToolbarProps> = ({
	isShiftOpen,
	onToggleShift,
	isCashInSheetOpen,
	setIsCashInSheetOpen,
	isCashOutSheetOpen,
	setIsCashOutSheetOpen,
	isHandoverSheetOpen,
	setIsHandoverSheetOpen,
	cashInAmount,
	setCashInAmount,
	cashInReason,
	setCashInReason,
	isSubmittingCashIn,
	cashOutMode,
	setCashOutMode,
	isSubmittingCashOut,
	handleConfirmCashIn,
	handleConfirmCashOutAndZReport,
	handleConfirmHandoverShift,
	cashInDrawerRub = 15000,
	cardSumRub = 22500,
	sbpSumRub = 5000,
	doctorName = "Д-р Смирнова Е.В.",
	completedCount = 4,
	totalAppointmentsCount = 6,
	totalRevenueRub = 42500,
	estimatedDoctorPayoutRub = 12750,
	consumables,
	nextDoctorName = "Д-р Васильев Д.А.",
}) => {
	return (
		<>
			<footer className="mobile-shift-bottom-bar" data-testid="mobile-shift-bottom-bar">
				<div className="mobile-shift-quick-actions-row">
					<button
						type="button"
						className="mobile-shift-btn-secondary cash-in"
						onClick={() => setIsCashInSheetOpen(true)}
						data-testid="btn-mobile-cash-in"
					>
						<Plus size={15} />
						<span>Внесение размена</span>
					</button>

					<button
						type="button"
						className="mobile-shift-btn-secondary cash-out"
						onClick={() => setIsCashOutSheetOpen(true)}
						data-testid="btn-mobile-cash-out"
					>
						<Banknote size={15} />
						<span>Инкассация & Z-отчёт</span>
					</button>
				</div>

				<button
					type="button"
					className="mobile-shift-btn-primary-cta"
					onClick={() => {
						if (isShiftOpen) {
							setIsHandoverSheetOpen(true);
						} else {
							onToggleShift();
						}
					}}
					data-testid="btn-mobile-primary-shift-toggle"
				>
					{isShiftOpen ? (
						<>
							<CheckCircle2 size={19} />
							<span>Закрыть и передать смену</span>
						</>
					) : (
						<>
							<Unlock size={19} />
							<span>Открыть рабочую смену врача</span>
						</>
					)}
				</button>
			</footer>

			{isCashInSheetOpen && (
				<div
					className="mobile-shift-sheet-overlay"
					role="dialog"
					aria-modal="true"
					data-testid="sheet-cash-in"
				>
					<div
						className="mobile-shift-sheet-backdrop"
						onClick={() => setIsCashInSheetOpen(false)}
						aria-hidden="true"
					/>
					<div className="mobile-shift-sheet-container">
						<div className="mobile-shift-sheet-handle" />
						<div className="mobile-shift-sheet-header">
							<h3 className="mobile-shift-sheet-title">Внесение наличных (Размен)</h3>
							<button
								type="button"
								className="mobile-shift-sheet-close-btn"
								onClick={() => setIsCashInSheetOpen(false)}
								aria-label="Закрыть"
							>
								<X size={16} />
							</button>
						</div>

						<div className="mobile-shift-sheet-body">
							<p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.4 }}>
								Внесение разменного фонда в денежный ящик кассы перед началом приема по 54-ФЗ.
							</p>

							<div>
								<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "8px" }}>
									Быстрый выбор суммы:
								</span>
								<div className="mobile-shift-chip-row">
									{[1000, 3000, 5000, 10000].map((amt) => (
										<button
											key={amt}
											type="button"
											className={`mobile-shift-chip ${cashInAmount === amt ? "active" : ""}`}
											onClick={() => setCashInAmount(amt)}
										>
											{money(amt)}
										</button>
									))}
								</div>
							</div>

							<div>
								<label
									htmlFor="custom-cash-in-input"
									style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "6px" }}
								>
									Сумма внесения в рублях:
								</label>
								<input
									id="custom-cash-in-input"
									type="number"
									min="0"
									step="100"
									value={cashInAmount}
									onChange={(e) => setCashInAmount(Number(e.target.value) || 0)}
									className="w-full h-12 px-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-lg font-bold text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500"
								/>
							</div>

							<div>
								<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
									Основание внесения:
								</span>
								<select
									value={cashInReason}
									onChange={(e) => setCashInReason(e.target.value)}
									className="w-full h-11 px-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-sm text-[var(--ink)] focus:outline-none"
								>
									<option value="Разменная монета на начало смены">Разменная монета на начало смены</option>
									<option value="Пополнение кассового ящика">Пополнение кассового ящика</option>
									<option value="Возврат подотчетных сумм">Возврат подотчетных сумм</option>
								</select>
							</div>
						</div>

						<div className="mobile-shift-sheet-footer">
							<button
								type="button"
								className="mobile-shift-btn-primary-cta"
								onClick={handleConfirmCashIn}
								disabled={isSubmittingCashIn}
								data-testid="btn-confirm-cash-in"
							>
								<Check size={18} />
								<span>Внести {money(cashInAmount)} в кассу</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{isCashOutSheetOpen && (
				<div
					className="mobile-shift-sheet-overlay"
					role="dialog"
					aria-modal="true"
					data-testid="sheet-cash-out"
				>
					<div
						className="mobile-shift-sheet-backdrop"
						onClick={() => setIsCashOutSheetOpen(false)}
						aria-hidden="true"
					/>
					<div className="mobile-shift-sheet-container">
						<div className="mobile-shift-sheet-handle" />
						<div className="mobile-shift-sheet-header">
							<h3 className="mobile-shift-sheet-title">Инкассация & Z-отчёт 54-ФЗ</h3>
							<button
								type="button"
								className="mobile-shift-sheet-close-btn"
								onClick={() => setIsCashOutSheetOpen(false)}
								aria-label="Закрыть"
							>
								<X size={16} />
							</button>
						</div>

						<div className="mobile-shift-sheet-body">
							<div
								style={{
									padding: "12px 14px",
									borderRadius: "12px",
									background: "var(--paper-soft)",
									border: "1px solid var(--line)",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
								}}
							>
								<span style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)" }}>
									Наличных в ящике сейчас:
								</span>
								<strong style={{ fontSize: "17px", fontWeight: 800, color: "var(--ink)" }}>
									{money(cashInDrawerRub)}
								</strong>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
								<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
									Сценарий закрытия смены:
								</span>

								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "10px",
										padding: "10px 12px",
										borderRadius: "10px",
										background: cashOutMode === "keep_float" ? "var(--teal-surface)" : "var(--paper)",
										border: `1px solid ${cashOutMode === "keep_float" ? "var(--teal-dark)" : "var(--line)"}`,
										cursor: "pointer",
									}}
								>
									<input
										type="radio"
										name="cashOutMode"
										checked={cashOutMode === "keep_float"}
										onChange={() => setCashOutMode("keep_float")}
									/>
									<div style={{ minWidth: 0 }}>
										<strong style={{ display: "block", fontSize: "13.5px", color: "var(--ink)" }}>
											Оставить размен 3 000 ₽, остальное изъять
										</strong>
										<span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
											Инкассировать {money(Math.max(0, cashInDrawerRub - 3000))} в сейф клиники
										</span>
									</div>
								</label>

								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "10px",
										padding: "10px 12px",
										borderRadius: "10px",
										background: cashOutMode === "full" ? "var(--teal-surface)" : "var(--paper)",
										border: `1px solid ${cashOutMode === "full" ? "var(--teal-dark)" : "var(--line)"}`,
										cursor: "pointer",
									}}
								>
									<input
										type="radio"
										name="cashOutMode"
										checked={cashOutMode === "full"}
										onChange={() => setCashOutMode("full")}
									/>
									<div style={{ minWidth: 0 }}>
										<strong style={{ display: "block", fontSize: "13.5px", color: "var(--ink)" }}>
											Полная инкассация (изъять 100% наличности)
										</strong>
										<span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
											Инкассировать всю сумму {money(cashInDrawerRub)}
										</span>
									</div>
								</label>

								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "10px",
										padding: "10px 12px",
										borderRadius: "10px",
										background: cashOutMode === "z_only" ? "var(--teal-surface)" : "var(--paper)",
										border: `1px solid ${cashOutMode === "z_only" ? "var(--teal-dark)" : "var(--line)"}`,
										cursor: "pointer",
									}}
								>
									<input
										type="radio"
										name="cashOutMode"
										checked={cashOutMode === "z_only"}
										onChange={() => setCashOutMode("z_only")}
									/>
									<div style={{ minWidth: 0 }}>
										<strong style={{ display: "block", fontSize: "13.5px", color: "var(--ink)" }}>
											Только Z-отчет 54-ФЗ без изъятия наличных
										</strong>
										<span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
											Гашение смены на ККТ без формирования РКО
										</span>
									</div>
								</label>
							</div>

							<div
								style={{
									fontSize: "12px",
									color: "var(--muted)",
									padding: "8px 10px",
									borderRadius: "8px",
									background: "var(--paper-soft)",
									border: "1px solid var(--line-subtle)",
								}}
							>
								Сверка эквайринга: Терминал {money(cardSumRub)} · СБП {money(sbpSumRub)}. Суммы сверены и готовы к закрытию.
							</div>
						</div>

						<div className="mobile-shift-sheet-footer">
							<button
								type="button"
								className="mobile-shift-btn-primary-cta"
								onClick={handleConfirmCashOutAndZReport}
								disabled={isSubmittingCashOut}
								data-testid="btn-confirm-cash-out-z"
							>
								<Printer size={18} />
								<span>Снять Z-отчет & закрыть смену</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{isHandoverSheetOpen && (
				<div
					className="mobile-shift-sheet-overlay"
					role="dialog"
					aria-modal="true"
					data-testid="sheet-shift-handover"
				>
					<div
						className="mobile-shift-sheet-backdrop"
						onClick={() => setIsHandoverSheetOpen(false)}
						aria-hidden="true"
					/>
					<div className="mobile-shift-sheet-container">
						<div className="mobile-shift-sheet-handle" />
						<div className="mobile-shift-sheet-header">
							<h3 className="mobile-shift-sheet-title">Закрытие и передача смены</h3>
							<button
								type="button"
								className="mobile-shift-sheet-close-btn"
								onClick={() => setIsHandoverSheetOpen(false)}
								aria-label="Закрыть"
							>
								<X size={16} />
							</button>
						</div>

						<div className="mobile-shift-sheet-body">
							<div
								style={{
									background: "var(--paper-soft)",
									border: "1px solid var(--line)",
									borderRadius: "14px",
									padding: "14px",
									display: "flex",
									flexDirection: "column",
									gap: "8px",
								}}
							>
								<strong style={{ fontSize: "14.5px", color: "var(--ink)" }}>
									Итоги смены доктора: {doctorName}
								</strong>
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
									<div style={{ fontSize: "12px", color: "var(--muted)" }}>
										Принято пациентов: <strong style={{ color: "var(--ink)" }}>{completedCount} из {totalAppointmentsCount}</strong>
									</div>
									<div style={{ fontSize: "12px", color: "var(--muted)" }}>
										Выручка смены: <strong style={{ color: "var(--ink)" }}>{money(totalRevenueRub)}</strong>
									</div>
									<div style={{ fontSize: "12px", color: "var(--muted)" }}>
										Гонорар на руки: <strong style={{ color: "var(--teal-dark)" }}>{money(estimatedDoctorPayoutRub)}</strong>
									</div>
									<div style={{ fontSize: "12px", color: "var(--muted)" }}>
										Материалы: <strong style={{ color: "var(--ink)" }}>{consumables.length} поз. сверено</strong>
									</div>
								</div>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
								<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
									Передать кабинет и смену следующему врачу:
								</span>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "10px",
										padding: "10px 12px",
										borderRadius: "12px",
										background: "var(--paper)",
										border: "1px solid var(--line)",
									}}
								>
									<div
										style={{
											width: "36px",
											height: "36px",
											borderRadius: "10px",
											background: "var(--teal-surface)",
											color: "var(--teal-dark)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontWeight: 700,
											fontSize: "14px",
										}}
									>
										{nextDoctorName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
									</div>
									<div style={{ minWidth: 0, flex: 1 }}>
										<strong style={{ display: "block", fontSize: "13.5px", color: "var(--ink)" }}>
											{nextDoctorName}
										</strong>
										<span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
											Дежурный терапевт (вечерняя смена с 15:00)
										</span>
									</div>
									<CheckCircle2 size={18} className="text-teal-600" />
								</div>
							</div>

							<p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", lineHeight: 1.4 }}>
								Все электронные карты приемов сохранены. Акт передачи кабинета и списания расходников будет сформирован автоматически.
							</p>
						</div>

						<div className="mobile-shift-sheet-footer">
							<button
								type="button"
								className="mobile-shift-btn-primary-cta"
								onClick={handleConfirmHandoverShift}
								data-testid="btn-confirm-handover"
							>
								<CheckCircle2 size={18} />
								<span>Передать смену & Завершить</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
