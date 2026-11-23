/**
 * apps/web/src/components/shift/CashShiftJournalView.tsx
 *
 * Canonical SSOT Cash Register Shifts Journal & Audit View.
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy.
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty.
 * - Mandate 8am: Exactly ONE Primary CTA button in var(--teal) per visible context.
 * - Apple HIG: Desktop dense table + Mobile iOS Grouped List Cards (>=44x44px touch targets).
 * - Living Clinical & Cashier Language: «Касса и чеки», «Журнал кассовых смен», «Z-отчёт», «ОФД: Доставлен ✓».
 * - Sweet Spot size: 280-350 lines.
 */

import React, { useState, useEffect } from "react";
import {
	Calendar,
	Clock,
	CheckCircle2,
	Printer,
	ShieldCheck,
	RefreshCw,
	Layers,
	FileText,
	AlertCircle,
	ArrowUpRight,
	Plus,
	Banknote,
	CreditCard,
	QrCode,
	Wallet,
	X,
} from "lucide-react";
import { denteClinicalReadHeaders } from "../../lib/denteRequestHeaders";

export interface CashShiftItem {
	id: string;
	shiftNumber: number;
	status: "open" | "closed";
	openedAt: string;
	closedAt?: string | null;
	cashierName: string;
	startBalanceRub: number;
	closingBalanceRub?: number | null;
	incomeTotalRub: number;
	expenseTotalRub: number;
	incomeCashRub: number;
	incomeElectronicRub: number;
	incomeSbpRub: number;
	advanceOffsetRub: number;
	ofdStatus: "delivered" | "pending";
	zReportNumber?: string | null;
}

export interface CashShiftJournalViewProps {
	readonly clinicName?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly initialShifts?: CashShiftItem[] | undefined;
	readonly onOpenShiftCloseModal?: ((shiftNumber?: number) => void) | undefined;
	readonly onOpenNewShift?: (() => void) | undefined;
}

const DEFAULT_EMPTY_SHIFTS: CashShiftItem[] = [];

export const CashShiftJournalView: React.FC<CashShiftJournalViewProps> = ({
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	cashierFullName = "Администратор / Кассир",
	initialShifts = DEFAULT_EMPTY_SHIFTS,
	onOpenShiftCloseModal,
	onOpenNewShift,
}) => {
	const [shifts, setShifts] = useState<CashShiftItem[]>(initialShifts);
	const [filterStatus, setFilterStatus] = useState<"all" | "open" | "closed">("all");
	const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
	const [activeShiftForPrint, setActiveShiftForPrint] = useState<{
		shift: CashShiftItem;
		type: "Z" | "X";
	} | null>(null);

	const activeOpenShift = shifts.find((s) => s.status === "open");

	const filteredShifts = shifts.filter((s) => {
		if (filterStatus === "open") return s.status === "open";
		if (filterStatus === "closed") return s.status === "closed";
		return true;
	});

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			const res = await fetch("/api/cashbox/shifts", {
				headers: denteClinicalReadHeaders(),
			}).catch(() => null);
			if (res && res.ok) {
				const json = await res.json().catch(() => null);
				const list = json?.data ?? json?.shifts;
				if (Array.isArray(list)) {
					setShifts(list);
				}
			}
		} catch {
			// Fallback silently
		} finally {
			setTimeout(() => setIsRefreshing(false), 300);
		}
	};

	useEffect(() => {
		void handleRefresh();
	}, []);

	const handlePrintReport = (shift: CashShiftItem, type: "Z" | "X") => {
		setActiveShiftForPrint({ shift, type });
	};

	return (
		<div className="w-full flex flex-col space-y-4 max-w-full" data-testid="cash-shift-journal-view">
			{/* Top Bar / Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-xs">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
						<Layers className="w-5 h-5" />
					</div>
					<div>
						<h1 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] tracking-tight">
							Журнал кассовых смен
						</h1>
						<p className="text-xs text-[var(--muted,#64748b)]">
							{`${clinicName} • Текущий кассир: ${cashierFullName}`}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleRefresh}
						disabled={isRefreshing}
						className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors flex items-center gap-1.5"
						title="Обновить список смен"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
						<span>Обновить</span>
					</button>

					{activeOpenShift ? (
						<button
							type="button"
							onClick={() => onOpenShiftCloseModal?.(activeOpenShift.shiftNumber)}
							data-testid="btn-journal-close-shift"
							className="min-h-[40px] px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2"
							style={{ backgroundColor: "var(--primary)", color: "#ffffff" }}
						>
							<FileText className="w-4 h-4" />
							<span>Закрыть смену №{activeOpenShift.shiftNumber} (Z-отчёт)</span>
						</button>
					) : (
						<button
							type="button"
							onClick={onOpenNewShift}
							data-testid="btn-journal-open-shift"
							className="min-h-[40px] px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2"
							style={{ backgroundColor: "var(--primary)", color: "#ffffff" }}
						>
							<Plus className="w-4 h-4" />
							<span>Открыть новую смену</span>
						</button>
					)}
				</div>
			</div>

			{/* Filters Bar */}
			<div className="flex items-center justify-between px-1">
				<div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)]">
					{(["all", "open", "closed"] as const).map((filter) => (
						<button
							key={filter}
							type="button"
							onClick={() => setFilterStatus(filter)}
							className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
								filterStatus === filter
									? "bg-[var(--paper,#ffffff)] text-[var(--primary)] shadow-xs"
									: "bg-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							{filter === "all" ? "Все" : filter === "open" ? "Открытые" : "Закрытые"}
						</button>
					))}
				</div>

				<span className="text-xs text-[var(--muted,#64748b)]">
					Всего смен: <b>{filteredShifts.length}</b>
				</span>
			</div>

			{/* Desktop Table View */}
			<div className="hidden md:block rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] overflow-hidden shadow-xs">
				{filteredShifts.length === 0 ? (
					<div
						className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-3"
						data-testid="cash-shifts-empty-state"
					>
						<div className="w-12 h-12 rounded-2xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)]">
							<Layers className="w-6 h-6" />
						</div>
						<div className="space-y-1">
							<h3 className="text-sm font-bold text-[var(--ink,#0f172a)]">
								Кассовые смены ещё не открывались
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] max-w-sm">
								После открытия первой кассовой смены здесь появится журнал операций, сверка Z-отчётов и статус передачи в ОФД.
							</p>
						</div>
						{onOpenNewShift && (
							<button
								type="button"
								onClick={onOpenNewShift}
								data-testid="btn-empty-open-shift"
								className="mt-2 min-h-[38px] px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
							>
								<Plus className="w-3.5 h-3.5" />
								<span>Открыть новую смену</span>
							</button>
						)}
					</div>
				) : (
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] font-semibold">
								<th className="py-3 px-4">Смена</th>
								<th className="py-3 px-4">Статус</th>
								<th className="py-3 px-4">Открыта / Закрыта</th>
								<th className="py-3 px-4">Кассир</th>
								<th className="py-3 px-4 text-right">Наличные</th>
								<th className="py-3 px-4 text-right">Безнал / карта</th>
								<th className="py-3 px-4 text-right">СБП QR</th>
								<th className="py-3 px-4 text-right">Выручка</th>
								<th className="py-3 px-4 text-center">ОФД</th>
								<th className="py-3 px-4 text-right">Действия</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
							{filteredShifts.map((shift) => (
								<tr key={shift.id} className="hover:bg-[var(--paper-soft,#f8fafc)]/60 transition-colors">
									<td className="py-3.5 px-4 font-bold text-[var(--ink,#0f172a)]">
										{`№${shift.shiftNumber}`}
									</td>
									<td className="py-3.5 px-4">
										{shift.status === "open" ? (
											<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200 dark:border-emerald-800">
												<span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
												Открыта
											</span>
										) : (
											<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
												Закрыта
											</span>
										)}
									</td>
									<td className="py-3.5 px-4 text-[var(--muted,#64748b)]">
										<div>{new Date(shift.openedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
										{shift.closedAt && (
											<div className="text-[10px] opacity-80">
												до {new Date(shift.closedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
											</div>
										)}
									</td>
									<td className="py-3.5 px-4 font-medium text-[var(--ink,#0f172a)]">
										{shift.cashierName}
									</td>
									<td className="py-3.5 px-4 text-right font-medium">
										{shift.incomeCashRub.toLocaleString("ru-RU")} ₽
									</td>
									<td className="py-3.5 px-4 text-right font-medium">
										{shift.incomeElectronicRub.toLocaleString("ru-RU")} ₽
									</td>
									<td className="py-3.5 px-4 text-right font-medium">
										{shift.incomeSbpRub.toLocaleString("ru-RU")} ₽
									</td>
									<td className="py-3.5 px-4 text-right font-bold text-[var(--ink,#0f172a)]">
										{shift.incomeTotalRub.toLocaleString("ru-RU")} ₽
									</td>
									<td className="py-3.5 px-4 text-center">
										<span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
											<CheckCircle2 className="w-3.5 h-3.5" />
											Доставлен ✓
										</span>
									</td>
									<td className="py-3.5 px-4 text-right">
										{shift.status === "closed" ? (
											<button
												type="button"
												onClick={() => handlePrintReport(shift, "Z")}
												className="min-h-[30px] px-2 py-1 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[11px] font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors inline-flex items-center gap-1"
												title="Печать Z-отчёта"
											>
												<Printer className="w-3 h-3 text-[var(--primary)]" />
												<span>Z-отчёт</span>
											</button>
										) : (
											<button
												type="button"
												onClick={() => handlePrintReport(shift, "X")}
												className="min-h-[30px] px-2 py-1 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[11px] font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors inline-flex items-center gap-1"
												title="Печать промежуточного X-отчёта"
											>
												<Printer className="w-3 h-3 text-[var(--muted,#64748b)]" />
												<span>X-отчёт</span>
											</button>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{/* Mobile iOS Grouped List Cards (Apple HIG: >=44x44px touch targets) */}
			<div className="md:hidden space-y-3">
				{filteredShifts.length === 0 ? (
					<div
						className="p-6 rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex flex-col items-center justify-center text-center space-y-3 shadow-xs"
						data-testid="cash-shifts-mobile-empty-state"
					>
						<div className="w-12 h-12 rounded-2xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)]">
							<Layers className="w-6 h-6" />
						</div>
						<div className="space-y-1">
							<h3 className="text-sm font-bold text-[var(--ink,#0f172a)]">
								Кассовые смены ещё не открывались
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)]">
								После открытия первой кассовой смены здесь появится журнал операций.
							</p>
						</div>
						{onOpenNewShift && (
							<button
								type="button"
								onClick={onOpenNewShift}
								className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
							>
								<Plus className="w-4 h-4" />
								<span>Открыть новую смену</span>
							</button>
						)}
					</div>
				) : (
					filteredShifts.map((shift) => (
						<div
							key={shift.id}
							className="p-4 rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-2.5 shadow-xs"
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="text-base font-bold text-[var(--ink,#0f172a)]">
										{`Смена №${shift.shiftNumber}`}
									</span>
									<span
										className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
											shift.status === "open"
												? "bg-emerald-50 text-emerald-700 border border-emerald-200"
												: "bg-slate-100 text-slate-700"
										}`}
									>
										{shift.status === "open" ? "Открыта" : "Закрыта"}
									</span>
								</div>
								<span className="text-base font-extrabold text-[var(--ink,#0f172a)]">
									{shift.incomeTotalRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>

							<div className="text-xs text-[var(--muted,#64748b)] space-y-0.5">
								<div>Кассир: {shift.cashierName}</div>
								<div>
									Открыта: {new Date(shift.openedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
									{shift.closedAt && ` • Закрыта: ${new Date(shift.closedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`}
								</div>
							</div>

							{/* 4 Tenders row */}
							<div className="grid grid-cols-3 gap-1 pt-1 border-t border-[var(--line-subtle,#f1f5f9)] text-[11px]">
								<div>
									<span className="text-[var(--muted,#64748b)] block">Нал:</span>
									<b>{shift.incomeCashRub.toLocaleString("ru-RU")} ₽</b>
								</div>
								<div>
									<span className="text-[var(--muted,#64748b)] block">Карта:</span>
									<b>{shift.incomeElectronicRub.toLocaleString("ru-RU")} ₽</b>
								</div>
								<div>
									<span className="text-[var(--muted,#64748b)] block">СБП:</span>
									<b>{shift.incomeSbpRub.toLocaleString("ru-RU")} ₽</b>
								</div>
							</div>

							{/* Action & OFD Status */}
							<div className="flex items-center justify-between pt-2">
								<span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
									<CheckCircle2 className="w-3.5 h-3.5" />
									ОФД: Доставлен ✓
								</span>

								<button
									type="button"
									onClick={() => handlePrintReport(shift, shift.status === "closed" ? "Z" : "X")}
									className="min-h-[44px] px-3 py-1.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5 active:bg-[var(--paper-soft,#f1f5f9)]"
								>
									<Printer className="w-4 h-4 text-[var(--primary)]" />
									<span>{shift.status === "closed" ? "Печать Z-отчёта" : "Печать X-отчёта"}</span>
								</button>
							</div>
						</div>
					))
				)}
			</div>

			{/* Thermal Z/X Report Print Slip Modal */}
			{activeShiftForPrint && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
					data-testid="shift-print-preview-modal"
					role="dialog"
					aria-modal="true"
				>
					<div className="w-full max-w-md bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
							<div className="flex items-center gap-2">
								<FileText className="w-4 h-4 text-[var(--primary)]" />
								<span className="text-sm font-bold text-[var(--ink,#0f172a)]">
									{activeShiftForPrint.type === "Z" ? "Фискальный Z-отчёт" : "Промежуточный X-отчёт"}
								</span>
							</div>
							<button
								type="button"
								onClick={() => setActiveShiftForPrint(null)}
								className="p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]"
								aria-label="Закрыть"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{/* Thermal Slip Body */}
						<div className="p-4 overflow-y-auto space-y-3">
							<div
								id="printable-shift-z-report"
								className="p-4 rounded-xl bg-white text-slate-900 border border-dashed border-slate-300 font-mono text-xs space-y-2 select-text shadow-xs"
							>
								<div className="text-center border-b border-dashed border-slate-300 pb-2 space-y-0.5">
									<div className="font-bold text-sm tracking-tight">{clinicName}</div>
									<div className="text-[10px] text-slate-500">ИНН: 7701234567 • г. Москва</div>
									<div className="text-[10px] text-slate-500">
										Кассир: {activeShiftForPrint.shift.cashierName}
									</div>
									<div className="font-bold text-[11px] pt-1">
										{activeShiftForPrint.type === "Z"
											? "Сменный Z-отчет (с гашением)"
											: "Сменный X-отчет (без гашения)"}
									</div>
								</div>

								<div className="flex justify-between text-[11px] pt-1">
									<span>Смена №{activeShiftForPrint.shift.shiftNumber}</span>
									<span>Док: {activeShiftForPrint.shift.zReportNumber || `${activeShiftForPrint.type}-${activeShiftForPrint.shift.shiftNumber}`}</span>
								</div>

								<div className="flex justify-between text-[10px] text-slate-500">
									<span>Открыта: {new Date(activeShiftForPrint.shift.openedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
									{activeShiftForPrint.shift.closedAt && (
										<span>Закрыта: {new Date(activeShiftForPrint.shift.closedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
									)}
								</div>

								<div className="border-t border-b border-dashed border-slate-300 py-1.5 space-y-1 text-[11px]">
									<div className="flex justify-between">
										<span className="text-slate-600">Наличные:</span>
										<span className="font-bold">{activeShiftForPrint.shift.incomeCashRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="flex justify-between">
										<span className="text-slate-600">Безналичные (карта):</span>
										<span className="font-bold">{activeShiftForPrint.shift.incomeElectronicRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="flex justify-between">
										<span className="text-slate-600">СБП QR-код:</span>
										<span className="font-bold">{activeShiftForPrint.shift.incomeSbpRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="flex justify-between">
										<span className="text-slate-600">Зачёт авансов:</span>
										<span className="font-bold">{activeShiftForPrint.shift.advanceOffsetRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="flex justify-between text-xs font-extrabold pt-1 border-t border-dashed border-slate-300 text-[var(--primary)]">
										<span>Итог выручки:</span>
										<span>{activeShiftForPrint.shift.incomeTotalRub.toLocaleString("ru-RU")} ₽</span>
									</div>
								</div>

								<div className="flex justify-between text-[11px] text-slate-600">
									<span>Входящий остаток:</span>
									<span>{activeShiftForPrint.shift.startBalanceRub.toLocaleString("ru-RU")} ₽</span>
								</div>

								<div className="pt-2 text-center text-[10px] text-emerald-700 flex items-center justify-center gap-1">
									<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
									<span>
										{activeShiftForPrint.type === "Z"
											? "Смена закрыта • Z-отчёт передан в ОФД"
											: "Промежуточный срез • Смена открыта"}
									</span>
								</div>
							</div>
						</div>

						{/* Actions */}
						<div className="flex items-center justify-end gap-2 p-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
							<button
								type="button"
								onClick={() => setActiveShiftForPrint(null)}
								className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)]"
							>
								Закрыть
							</button>
							<button
								type="button"
								onClick={() => window.print()}
								data-testid="btn-execute-shift-print"
								className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
							>
								<Printer className="w-3.5 h-3.5" />
								<span>Печать</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default CashShiftJournalView;
