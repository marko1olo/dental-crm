/**
 * apps/web/src/components/shift/studio/ShiftDrawerActions.tsx
 *
 * Cashier drawer reconciliation, encashment parameters, and X/Z-report actions.
 * Compliant with Mandates 8e, 8n, 8am (0 disabled buttons, non-blocking flow).
 */

import React from "react";
import {
	AlertTriangle,
	ArrowDownToLine,
	Banknote,
	CheckCircle2,
	CreditCard,
	Download,
	Printer,
	RefreshCw,
} from "lucide-react";
import { kopecksToRub } from "@dental/shared";
import { formatKopecksToRub } from "../shiftCatalogData";

export interface ShiftDrawerActionsProps {
	readonly expectedCashInDrawerKop: number;
	readonly countedCashRub: number;
	readonly setCountedCashRub: (val: number) => void;
	readonly cashDiscrepancyKop: number;
	readonly isCashMatched: boolean;
	readonly cardRevenueKop: number;
	readonly isTerminalReconciled: boolean;
	readonly setIsTerminalReconciled: (val: boolean) => void;
	readonly encashmentOption: "full" | "retain_change";
	readonly setEncashmentOption: (val: "full" | "retain_change") => void;
	readonly retainedChangeRub: number;
	readonly setRetainedChangeRub: (val: number) => void;
	readonly printZReport: boolean;
	readonly setPrintZReport: (val: boolean) => void;
	readonly onPrintXReport?: () => void;
	readonly onExportJournal?: () => void;
}

export const ShiftDrawerActions: React.FC<ShiftDrawerActionsProps> = ({
	expectedCashInDrawerKop,
	countedCashRub,
	setCountedCashRub,
	cashDiscrepancyKop,
	isCashMatched,
	cardRevenueKop,
	isTerminalReconciled,
	setIsTerminalReconciled,
	encashmentOption,
	setEncashmentOption,
	retainedChangeRub,
	setRetainedChangeRub,
	printZReport,
	setPrintZReport,
	onPrintXReport,
	onExportJournal,
}) => {
	return (
		<div className="space-y-4">
			{/* Cash Reconciliation */}
			<div className="shift-card space-y-3">
				<div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-[var(--ink)]">
					<span className="flex items-center gap-1.5">
						<Banknote className="w-4 h-4 text-[var(--teal,#0d9488)]" />
						Сверка фактической наличности
					</span>
					<span className="text-xs text-[var(--muted)]">
						В ящике должно быть:{" "}
						<b>{formatKopecksToRub(expectedCashInDrawerKop)}</b>
					</span>
				</div>

				<div className="flex items-center gap-3">
					<div className="flex-1">
						<label className="block text-[11px] text-[var(--muted)] mb-1">
							Фактическая наличность в кассе (₽)
						</label>
						<input
							type="number"
							min={0}
							value={countedCashRub || ""}
							onChange={(e) => setCountedCashRub(Number(e.target.value) || 0)}
							className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-sm font-bold text-[var(--ink)]"
						/>
					</div>

					<div className="pt-5 shrink-0">
						{isCashMatched ? (
							<span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
								<CheckCircle2 className="w-4 h-4 text-emerald-600" />
								Сходится ✓
							</span>
						) : (
							<span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold">
								<AlertTriangle className="w-4 h-4 text-amber-600" />
								{cashDiscrepancyKop > 0
									? `+${kopecksToRub(cashDiscrepancyKop)}`
									: kopecksToRub(cashDiscrepancyKop)}{" "}
								₽
							</span>
						)}
					</div>
				</div>

				{/* Terminal Reconciliation */}
				<div className="pt-2 border-t border-[var(--line-subtle)] flex items-center justify-between">
					<span className="text-xs text-[var(--ink)] flex items-center gap-1.5">
						<CreditCard className="w-3.5 h-3.5 text-sky-600" />
						Сверка терминала эквайринга ({formatKopecksToRub(cardRevenueKop)})
					</span>
					<button
						type="button"
						onClick={() => setIsTerminalReconciled(!isTerminalReconciled)}
						className={`min-h-[36px] px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
							isTerminalReconciled
								? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)]"
								: "border-[var(--line)] text-[var(--muted)]"
						}`}
					>
						<CheckCircle2 className="w-3.5 h-3.5" />
						{isTerminalReconciled ? "Терминал сверен ✓" : "Подтвердить сверку"}
					</button>
				</div>
			</div>

			{/* Encashment Options */}
			<div className="shift-card space-y-2.5">
				<span className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
					<ArrowDownToLine className="w-4 h-4 text-[var(--teal,#0d9488)]" />
					Инкассация наличной выручки
				</span>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
					<button
						type="button"
						onClick={() => setEncashmentOption("retain_change")}
						className={`min-h-[44px] p-2.5 rounded-xl border text-left flex flex-col justify-center transition-colors cursor-pointer ${
							encashmentOption === "retain_change"
								? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] font-semibold"
								: "border-[var(--line)] text-[var(--muted)]"
						}`}
					>
						<span>Оставить размен на утро</span>
						<span className="text-[11px] font-normal opacity-80">
							Инкассировать только прибыль
						</span>
					</button>

					<button
						type="button"
						onClick={() => setEncashmentOption("full")}
						className={`min-h-[44px] p-2.5 rounded-xl border text-left flex flex-col justify-center transition-colors cursor-pointer ${
							encashmentOption === "full"
								? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] font-semibold"
								: "border-[var(--line)] text-[var(--muted)]"
						}`}
					>
						<span>Полная инкассация в сейф</span>
						<span className="text-[11px] font-normal opacity-80">
							Изъять всю наличность
						</span>
					</button>
				</div>

				{encashmentOption === "retain_change" && (
					<div className="flex items-center gap-2 pt-1">
						<span className="text-xs text-[var(--muted)] shrink-0">
							Сумма размена:
						</span>
						<input
							type="number"
							min={0}
							value={retainedChangeRub || ""}
							onChange={(e) => setRetainedChangeRub(Number(e.target.value) || 0)}
							className="min-h-[36px] w-28 px-2 py-1 rounded-lg border border-[var(--line)] text-xs font-bold"
						/>
						<span className="text-xs text-[var(--ink)]">₽</span>
					</div>
				)}
			</div>

			{/* Interim X-Report, Export & Paper Z-Report Actions */}
			<div className="shift-card space-y-3">
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onPrintXReport || (() => window.print())}
							className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
							title="Печать промежуточного X-отчёта без гашения"
						>
							<Printer className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							<span>Промежуточный X-отчёт</span>
						</button>

						<button
							type="button"
							onClick={onExportJournal || (() => window.print())}
							className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
							title="Экспорт ведомости смены"
						>
							<Download className="w-3.5 h-3.5" />
							<span>Экспорт</span>
						</button>
					</div>

					<label className="flex items-center gap-2 text-xs font-medium text-[var(--ink)] cursor-pointer select-none">
						<input
							type="checkbox"
							checked={printZReport}
							onChange={(e) => setPrintZReport(e.target.checked)}
							className="w-4 h-4 accent-[var(--teal,#0d9488)] cursor-pointer rounded"
						/>
						<span>Печать бумажного Z-отчёта</span>
					</label>
				</div>
			</div>
		</div>
	);
};

export default ShiftDrawerActions;
