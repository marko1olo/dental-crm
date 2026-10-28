import React from "react";
import { CheckCircle2, ShieldCheck, Wallet } from "lucide-react";
import { money } from "../../../AppHelpers";

export interface DoctorShiftCloseReconciliationCardProps {
	readonly cashRub: number;
	readonly countedCashRub: number;
	readonly onSetCountedCashRub: (rub: number) => void;
	readonly cashboxName: string;
	readonly printZReport: boolean;
	readonly onSetPrintZReport: (val: boolean) => void;
	readonly printShiftSummary: boolean;
	readonly onSetPrintShiftSummary: (val: boolean) => void;
	readonly onExecuteEncashment?: (() => void) | undefined;
	readonly isEncashmentDone?: boolean | undefined;
}

export const DoctorShiftCloseReconciliationCard: React.FC<DoctorShiftCloseReconciliationCardProps> = ({
	cashRub,
	countedCashRub,
	onSetCountedCashRub,
	cashboxName,
	printZReport,
	onSetPrintZReport,
	printShiftSummary,
	onSetPrintShiftSummary,
	onExecuteEncashment,
	isEncashmentDone,
}) => {
	const cashDifferenceRub = countedCashRub - cashRub;
	const isCashBalanced = Math.abs(cashDifferenceRub) < 0.01;
	const encashmentTargetRub = countedCashRub > 0 ? countedCashRub : cashRub;

	return (
		<div className="border border-[var(--line,#e2e8f0)] rounded-xl p-3 sm:p-3.5 bg-[var(--paper,#ffffff)] shadow-xs space-y-2.5">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink,#0f172a)] flex items-center gap-1.5">
					<ShieldCheck className="w-4 h-4 text-[var(--ok-fg,#059669)]" />
					Сверка кассы 54-ФЗ и фискальный Z-отчёт
				</span>
				<span className="text-[11px] font-mono text-[var(--muted,#64748b)] truncate max-w-[200px]" title={cashboxName}>
					{cashboxName}
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
				<div className="p-2.5 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
					<div className="text-[11px] text-[var(--muted,#64748b)]">Учетная наличность (по чекам)</div>
					<div className="text-base font-bold text-[var(--ink,#0f172a)]">{money(cashRub)}</div>
				</div>
				<div className="p-2.5 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col justify-between">
					<div className="flex items-center justify-between">
						<label htmlFor="counted-cash-input" className="text-[11px] text-[var(--muted,#64748b)]">Факт в денежном ящике</label>
						{!isCashBalanced && (
							<button
								type="button"
								onClick={() => onSetCountedCashRub(cashRub)}
								className="text-[10px] text-[var(--teal,#0d9488)] hover:underline font-semibold cursor-pointer"
							>
								Сверено (0 ₽)
							</button>
						)}
					</div>
					<div className="flex items-center gap-1.5 mt-1">
						<input
							id="counted-cash-input"
							type="number"
							min="0"
							step="100"
							value={countedCashRub}
							onChange={(e) => onSetCountedCashRub(Number(e.target.value) || 0)}
							className="w-full px-2 py-1 text-sm font-bold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-md text-[var(--ink,#0f172a)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
							aria-label="Фактическая наличность в кассе"
						/>
						<span className="text-xs font-bold text-[var(--muted,#64748b)]">₽</span>
					</div>
				</div>
			</div>

			<div
				className={`p-2.5 rounded-lg text-xs flex flex-col gap-1 font-semibold border ${
					isCashBalanced
						? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/30"
						: "bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 border-amber-500/30"
				}`}
				data-testid="shift-cash-discrepancy-status"
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<CheckCircle2 className={`w-4 h-4 ${isCashBalanced ? "text-emerald-600" : "text-amber-600"}`} />
						<span>{isCashBalanced ? "Сверено без расхождений (0 ₽):" : "Расхождение кассы:"}</span>
					</div>
					<span className="font-mono">
						{isCashBalanced ? "Касса 54-ФЗ сходится (0 ₽)" : `${money(Math.abs(cashDifferenceRub))} (${cashDifferenceRub > 0 ? "излишек" : "недостача"})`}
					</span>
				</div>
				{!isCashBalanced && (
					<p className="text-[11px] font-normal text-amber-700 dark:text-amber-300 mt-0.5">
						Мягкая толерантность: разница автоматически запишется в журнал аудита и Z-отчет. Закрытие смены не блокируется.
					</p>
				)}
			</div>

			{/* 1-Click Encashment Action Button */}
			{onExecuteEncashment && (
				<div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
					<button
						type="button"
						onClick={onExecuteEncashment}
						className="secondary-button text-xs font-bold py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
						style={{
							border: "1px solid var(--line)",
							background: isEncashmentDone ? "var(--teal-surface)" : "var(--paper-soft)",
							color: isEncashmentDone ? "var(--teal-dark)" : "var(--ink)",
							borderRadius: "8px",
						}}
						title="Сформировать чистый акт передачи денег владельцу клиники или банку"
						data-testid="btn-modal-encashment"
					>
						<Wallet className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
						<span>
							{isEncashmentDone
								? "✓ Выручка инкассирована (акт сформирован)"
								: `Инкассировать выручку (${money(encashmentTargetRub)})`}
						</span>
					</button>
					<span className="text-[11px] text-[var(--muted)]">
						Акт передачи выручки в сейф / банк в 1 клик
					</span>
				</div>
			)}

			<div className="pt-2 border-t border-[var(--line,#e2e8f0)] flex flex-wrap gap-4 text-xs">
				<label className="flex items-center gap-2 cursor-pointer select-none text-[var(--ink,#0f172a)] font-medium">
					<input
						type="checkbox"
						checked={printZReport}
						onChange={(e) => onSetPrintZReport(e.target.checked)}
						className="rounded border-[var(--line,#cbd5e1)] text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)] w-4 h-4"
					/>
					<span>Снять Z-отчёт с закрытием смены</span>
				</label>
				<label className="flex items-center gap-2 cursor-pointer select-none text-[var(--ink,#0f172a)] font-medium">
					<input
						type="checkbox"
						checked={printShiftSummary}
						onChange={(e) => onSetPrintShiftSummary(e.target.checked)}
						className="rounded border-[var(--line,#cbd5e1)] text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)] w-4 h-4"
					/>
					<span>Сформировать сводку смены врача</span>
				</label>
			</div>
		</div>
	);
};
