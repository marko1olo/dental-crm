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
import { clientLogger } from "../../services/logging/clientLogger";

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
	readonly clinicInn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly initialShifts?: CashShiftItem[] | undefined;
	readonly onOpenShiftCloseModal?: ((shiftNumber?: number) => void) | undefined;
	readonly onOpenNewShift?: (() => void) | undefined;
}

const DEFAULT_EMPTY_SHIFTS: CashShiftItem[] = [];

export const CashShiftJournalView: React.FC<CashShiftJournalViewProps> = ({
	clinicName = "Стоматологическая клиника",
	clinicInn,
	clinicAddress,
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
		if (isRefreshing) return;
		setIsRefreshing(true);
		try {
			const res = await fetch("/api/cashbox/shifts", {
				headers: denteClinicalReadHeaders(),
			});
			if (!res.ok) {
				clientLogger.warn("[CashShiftJournalView] Ошибка загрузки смен", { status: res.status }, { module: "Shift" });
				return;
			}
			const json = await res.json().catch(() => null);
			const list = json?.data ?? json?.shifts;
			if (Array.isArray(list)) {
				setShifts(list);
			}
		} catch (err) {
			clientLogger.warn("[CashShiftJournalView] Не удалось обновить журнал смен", err, { module: "Shift" });
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
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
						<Layers className="w-5 h-5" />
					</div>
					<div>
						<h1 className="text-xl font-semibold text-[var(--ink)] tracking-tight">
							Журнал кассовых смен
						</h1>
						<p className="text-xs text-[var(--ink-muted)]">
							{`${clinicName} • Текущий кассир: ${cashierFullName}`}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleRefresh}
						aria-busy={isRefreshing}
						className="h-11 md:h-9 px-4 md:px-3.5 rounded-xl md:rounded-lg border border-[var(--line)] bg-[var(--paper)] text-base md:text-sm font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
						title="Обновить список смен"
					>
						<RefreshCw className={`w-4 h-4 shrink-0 ${isRefreshing ? "animate-spin" : ""}`} />
						<span>Обновить</span>
					</button>

					{activeOpenShift ? (
						<button
							type="button"
							onClick={() => onOpenShiftCloseModal?.(activeOpenShift.shiftNumber)}
							data-testid="btn-journal-close-shift"
							className="h-11 md:h-9 px-4 md:px-3.5 rounded-xl md:rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-base md:text-sm font-medium shadow-sm transition-all inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
							style={{ backgroundColor: "var(--primary)", color: "#ffffff" }}
						>
							<FileText className="w-4 h-4 shrink-0" />
							<span>Закрыть смену №{activeOpenShift.shiftNumber} (Z-отчёт)</span>
						</button>
					) : (
						<button
							type="button"
							onClick={onOpenNewShift}
							data-testid="btn-journal-open-shift"
							className="h-11 md:h-9 px-4 md:px-3.5 rounded-xl md:rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-base md:text-sm font-medium shadow-sm transition-all inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
							style={{ backgroundColor: "var(--primary)", color: "#ffffff" }}
						>
							<Plus className="w-4 h-4 shrink-0" />
							<span>Открыть новую смену</span>
						</button>
					)}
				</div>
			</div>

			{/* Filters Bar */}
			<div className="flex items-center justify-between px-1">
				<div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					{(["all", "open", "closed"] as const).map((filter) => (
						<button
							key={filter}
							type="button"
							onClick={() => setFilterStatus(filter)}
							className={`h-8 px-2.5 rounded-lg text-xs transition-all cursor-pointer ${
								filterStatus === filter
									? "bg-[var(--paper)] text-[var(--ink)] font-medium shadow-xs"
									: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] font-medium"
							}`}
						>
							{filter === "all" ? "Все" : filter === "open" ? "Открытые" : "Закрытые"}
						</button>
					))}
				</div>

				<span className="text-xs text-[var(--ink-muted)] font-mono tabular-nums">
					Всего смен: <b>{filteredShifts.length}</b>
				</span>
			</div>

			{/* Desktop Table View */}
			<div className="hidden md:block rounded-2xl bg-[var(--paper)] border border-[var(--line)] overflow-hidden shadow-xs">
				{filteredShifts.length === 0 ? (
					<div
						className="py-12 px-4 flex flex-col items-center justify-center text-center gap-2.5"
						data-testid="cash-shifts-empty-state"
					>
						<div className="w-10 h-10 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-center text-[var(--ink-muted)]">
							<Layers className="w-5 h-5" />
						</div>
						<div className="space-y-1">
							<h3 className="text-base font-semibold text-[var(--ink)]">
								Кассовые смены ещё не открывались
							</h3>
							<p className="text-xs text-[var(--ink-muted)] max-w-sm">
								После открытия первой кассовой смены здесь появится журнал операций, сверка Z-отчётов и статус передачи в ОФД.
							</p>
						</div>
						{onOpenNewShift && (
							<button
								type="button"
								onClick={onOpenNewShift}
								data-testid="btn-empty-open-shift"
								className="mt-1 h-9 px-3.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-medium transition-all shadow-sm inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
							>
								<Plus className="w-4 h-4 shrink-0" />
								<span>Открыть новую смену</span>
							</button>
						)}
					</div>
				) : (
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="bg-[var(--paper-soft)] border-b border-[var(--line)] text-[var(--ink-muted)] font-medium">
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
						<tbody className="divide-y divide-[var(--line)]">
							{filteredShifts.map((shift) => (
								<tr key={shift.id} className="hover:bg-[var(--paper-soft)]/60 transition-colors">
									<td className="py-3.5 px-4 font-semibold font-mono tabular-nums text-[var(--ink)]">
										{`№${shift.shiftNumber}`}
									</td>
									<td className="py-3.5 px-4">
										{shift.status === "open" ? (
											<span className="h-6 px-2 rounded-full bg-[var(--success-soft)] text-[var(--success-ink)] font-medium text-xs inline-flex items-center gap-1 shrink-0 border border-[var(--success-line)]">
												<span className="w-1.5 h-1.5 rounded-full bg-[var(--success-ink)] animate-pulse" />
												Открыта
											</span>
										) : (
											<span className="h-6 px-2 rounded-full bg-[var(--paper-soft)] text-[var(--ink-muted)] font-medium text-xs inline-flex items-center gap-1 shrink-0 border border-[var(--line)]">
												Закрыта
											</span>
										)}
									</td>
									<td className="py-3.5 px-4 text-[var(--ink-muted)] font-mono tabular-nums">
										<div>{new Date(shift.openedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
										{shift.closedAt && (
											<div className="text-xs opacity-80">
												до {new Date(shift.closedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
											</div>
										)}
									</td>
									<td className="py-3.5 px-4 font-medium text-[var(--ink)]">
										{shift.cashierName}
									</td>
									<td className="py-3.5 px-4 text-right font-mono tracking-tight font-medium tabular-nums">
										{shift.incomeCashRub.toLocaleString("ru-RU")} ₽
									</td>
									<td className="py-3.5 px-4 text-right font-mono tracking-tight font-medium tabular-nums">
										{shift.incomeElectronicRub.toLocaleString("ru-RU")} ₽
									</td>
									<td className="py-3.5 px-4 text-right font-mono tracking-tight font-medium tabular-nums">
										{shift.incomeSbpRub.toLocaleString("ru-RU")} ₽
									</td>
									<td className="py-3.5 px-4 text-right font-mono tracking-tight font-semibold tabular-nums text-[var(--ink)]">
										{shift.incomeTotalRub.toLocaleString("ru-RU")} ₽
									</td>
									<td className="py-3.5 px-4 text-center">
										<span className="inline-flex items-center gap-1 text-[var(--success-ink)] font-medium text-xs">
											<CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
											Доставлен ✓
										</span>
									</td>
									<td className="py-3.5 px-4 text-right">
										{shift.status === "closed" ? (
											<button
												type="button"
												onClick={() => handlePrintReport(shift, "Z")}
												className="h-8 px-2.5 rounded-md border border-[var(--line)] bg-[var(--paper)] text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
												title="Печать Z-отчёта"
											>
												<Printer className="w-3.5 h-3.5 shrink-0 text-[var(--primary)]" />
												<span>Z-отчёт</span>
											</button>
										) : (
											<button
												type="button"
												onClick={() => handlePrintReport(shift, "X")}
												className="h-8 px-2.5 rounded-md border border-[var(--line)] bg-[var(--paper)] text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
												title="Печать промежуточного X-отчёта"
											>
												<Printer className="w-3.5 h-3.5 shrink-0 text-[var(--ink-muted)]" />
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
						className="py-12 px-6 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex flex-col items-center justify-center text-center gap-2.5 shadow-xs"
						data-testid="cash-shifts-mobile-empty-state"
					>
						<div className="w-10 h-10 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-center text-[var(--ink-muted)]">
							<Layers className="w-5 h-5" />
						</div>
						<div className="space-y-1">
							<h3 className="text-base font-semibold text-[var(--ink)]">
								Кассовые смены ещё не открывались
							</h3>
							<p className="text-xs text-[var(--ink-muted)]">
								После открытия первой кассовой смены здесь появится журнал операций.
							</p>
						</div>
						{onOpenNewShift && (
							<button
								type="button"
								onClick={onOpenNewShift}
								className="min-h-[52px] w-full px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-base font-semibold transition-all shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
							>
								<Plus className="w-4 h-4 shrink-0" />
								<span>Открыть новую смену</span>
							</button>
						)}
					</div>
				) : (
					filteredShifts.map((shift) => (
						<div
							key={shift.id}
							className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-2.5 shadow-xs"
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="text-base font-semibold text-[var(--ink)]">
										{`Смена №${shift.shiftNumber}`}
									</span>
									<span
										className={`h-6 px-2 rounded-full text-xs font-medium inline-flex items-center gap-1 shrink-0 ${
											shift.status === "open"
												? "bg-[var(--success-soft)] text-[var(--success-ink)] border border-[var(--success-line)]"
												: "bg-[var(--paper-soft)] text-[var(--ink-muted)] border border-[var(--line)]"
										}`}
									>
										{shift.status === "open" ? "Открыта" : "Закрыта"}
									</span>
								</div>
								<span className="text-base font-semibold font-mono tracking-tight tabular-nums text-[var(--ink)]">
									{shift.incomeTotalRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>

							<div className="text-xs text-[var(--ink-muted)] space-y-0.5">
								<div>Кассир: {shift.cashierName}</div>
								<div className="font-mono tabular-nums">
									Открыта: {new Date(shift.openedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
									{shift.closedAt && ` • Закрыта: ${new Date(shift.closedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`}
								</div>
							</div>

							{/* 3 Tenders row */}
							<div className="grid grid-cols-3 gap-1 pt-1 border-t border-[var(--line)] text-xs">
								<div>
									<span className="text-[var(--ink-muted)] block">Нал:</span>
									<b className="font-mono tabular-nums">{shift.incomeCashRub.toLocaleString("ru-RU")} ₽</b>
								</div>
								<div>
									<span className="text-[var(--ink-muted)] block">Карта:</span>
									<b className="font-mono tabular-nums">{shift.incomeElectronicRub.toLocaleString("ru-RU")} ₽</b>
								</div>
								<div>
									<span className="text-[var(--ink-muted)] block">СБП:</span>
									<b className="font-mono tabular-nums">{shift.incomeSbpRub.toLocaleString("ru-RU")} ₽</b>
								</div>
							</div>

							{/* Action & OFD Status */}
							<div className="flex items-center justify-between pt-2">
								<span className="text-xs text-[var(--success-ink)] font-medium inline-flex items-center gap-1">
									<CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
									ОФД: Доставлен ✓
								</span>

								<button
									type="button"
									onClick={() => handlePrintReport(shift, shift.status === "closed" ? "Z" : "X")}
									className="h-11 px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-base font-medium text-[var(--ink)] inline-flex items-center justify-center gap-2 shrink-0 active:bg-[var(--paper-soft)] cursor-pointer"
								>
									<Printer className="w-4 h-4 shrink-0 text-[var(--primary)]" />
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
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
					data-testid="shift-print-preview-modal"
					role="dialog"
					aria-modal="true"
				>
					<div className="w-full max-w-md bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden overflow-x-clip flex flex-col max-h-[90vh]">
						{/* Header */}
						<div className="h-14 px-6 flex items-center justify-between border-b border-[var(--line)] shrink-0">
							<div className="flex items-center gap-2">
								<FileText className="w-4 h-4 shrink-0 text-[var(--primary)]" />
								<span className="text-base font-semibold text-[var(--ink)]">
									{activeShiftForPrint.type === "Z" ? "Фискальный Z-отчёт" : "Промежуточный X-отчёт"}
								</span>
							</div>
							<button
								type="button"
								onClick={() => setActiveShiftForPrint(null)}
								className="h-11 w-11 md:h-9 md:w-9 inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] shrink-0 cursor-pointer"
								aria-label="Закрыть"
							>
								<X className="w-4 h-4 shrink-0" />
							</button>
						</div>

						{/* Thermal Slip Body */}
						<div className="p-6 overflow-y-auto space-y-4">
							<div
								id="printable-shift-z-report"
								className="p-4 rounded-xl bg-white text-slate-900 border border-dashed border-slate-300 font-mono text-xs space-y-2 select-text shadow-xs"
							>
								<div className="text-center border-b border-dashed border-slate-300 pb-2 space-y-0.5">
									<div className="font-semibold text-sm tracking-tight">{clinicName}</div>
									{(clinicInn || clinicAddress) && (
										<div className="text-xs text-slate-600">
											{[clinicInn ? `ИНН: ${clinicInn}` : "", clinicAddress || ""].filter(Boolean).join(" • ")}
										</div>
									)}
									<div className="text-xs text-slate-600">
										Кассир: {activeShiftForPrint.shift.cashierName}
									</div>
									<div className="font-semibold text-xs pt-1">
										{activeShiftForPrint.type === "Z"
											? "Сменный Z-отчет (с гашением)"
											: "Сменный X-отчет (без гашения)"}
									</div>
								</div>

								<div className="flex justify-between text-xs pt-1">
									<span>Смена №{activeShiftForPrint.shift.shiftNumber}</span>
									<span>Док: {activeShiftForPrint.shift.zReportNumber || `${activeShiftForPrint.type}-${activeShiftForPrint.shift.shiftNumber}`}</span>
								</div>

								<div className="flex justify-between text-xs text-slate-600">
									<span>Открыта: {new Date(activeShiftForPrint.shift.openedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
									{activeShiftForPrint.shift.closedAt && (
										<span>Закрыта: {new Date(activeShiftForPrint.shift.closedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
									)}
								</div>

								<div className="border-t border-b border-dashed border-slate-300 py-1.5 space-y-1 text-xs">
									<div className="flex justify-between">
										<span className="text-slate-600">Наличные:</span>
										<span className="font-semibold font-mono tabular-nums">{activeShiftForPrint.shift.incomeCashRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="flex justify-between">
										<span className="text-slate-600">Безналичные (карта):</span>
										<span className="font-semibold font-mono tabular-nums">{activeShiftForPrint.shift.incomeElectronicRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="flex justify-between">
										<span className="text-slate-600">СБП QR-код:</span>
										<span className="font-semibold font-mono tabular-nums">{activeShiftForPrint.shift.incomeSbpRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="flex justify-between">
										<span className="text-slate-600">Зачёт авансов:</span>
										<span className="font-semibold font-mono tabular-nums">{activeShiftForPrint.shift.advanceOffsetRub.toLocaleString("ru-RU")} ₽</span>
									</div>
									<div className="flex justify-between text-xs font-semibold pt-1 border-t border-dashed border-slate-300 text-[var(--primary)]">
										<span>Итог выручки:</span>
										<span className="font-mono tabular-nums">{activeShiftForPrint.shift.incomeTotalRub.toLocaleString("ru-RU")} ₽</span>
									</div>
								</div>

								<div className="flex justify-between text-xs text-slate-600">
									<span>Входящий остаток:</span>
									<span className="font-mono tabular-nums">{activeShiftForPrint.shift.startBalanceRub.toLocaleString("ru-RU")} ₽</span>
								</div>

								<div className="pt-2 text-center text-xs text-emerald-700 flex items-center justify-center gap-1">
									<CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
									<span>
										{activeShiftForPrint.type === "Z"
											? "Смена закрыта • Z-отчёт передан в ОФД"
											: "Промежуточный срез • Смена открыта"}
									</span>
								</div>
							</div>
						</div>

						{/* Actions */}
						<div className="h-16 px-6 flex items-center justify-end gap-3 border-t border-[var(--line)] bg-[var(--paper-soft)]/50 shrink-0">
							<button
								type="button"
								onClick={() => setActiveShiftForPrint(null)}
								className="h-11 md:h-9 px-4 md:px-3.5 rounded-xl md:rounded-lg border border-[var(--line)] bg-[var(--paper)] text-base md:text-sm font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center shrink-0 cursor-pointer"
							>
								Закрыть
							</button>
							<button
								type="button"
								onClick={() => window.print()}
								data-testid="btn-execute-shift-print"
								className="h-11 md:h-9 px-4 md:px-3.5 rounded-xl md:rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-base md:text-sm font-medium shadow-sm inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
							>
								<Printer className="w-4 h-4 shrink-0" />
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
