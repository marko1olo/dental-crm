import React from "react";
import { Check, FileSpreadsheet, FileText, Layers } from "lucide-react";
import type { CashDaySummary } from "../cashDaySummary";

interface CashDayTallyActionsBarProps {
	readonly countedCashInput: string;
	readonly setCountedCashInput: (val: string) => void;
	readonly countedCashInvalid: boolean;
	readonly differenceRub: number | null;
	readonly summary: CashDaySummary;
	readonly money: (val: number | null) => string;
	readonly pendingQueueCount: number;
	readonly onOpenOfflineBatch: () => void;
	readonly onPrintStatement: () => void;
	readonly onExport1cCsv: () => void;
	readonly onOpenZReport: () => void;
}

export function CashDayTallyActionsBar({
	countedCashInput,
	setCountedCashInput,
	countedCashInvalid,
	differenceRub,
	summary,
	money,
	pendingQueueCount,
	onOpenOfflineBatch,
	onPrintStatement,
	onExport1cCsv,
	onOpenZReport,
}: CashDayTallyActionsBarProps) {
	return (
		<div className="space-y-3 pt-2">
			<div className="flex items-center gap-3 flex-wrap">
				<div className="smart-field" style={{ maxWidth: "280px" }}>
					<input
						id="cash-day-counted"
						inputMode="decimal"
						autoComplete="off"
						value={countedCashInput}
						onChange={(event) => setCountedCashInput(event.target.value)}
						placeholder=" "
						aria-invalid={countedCashInvalid || undefined}
						aria-describedby="cash-day-counted-result"
					/>
					<label htmlFor="cash-day-counted">Фактические наличные в ящике (₽)</label>
				</div>

				<button
					type="button"
					onClick={() => setCountedCashInput(summary.cashRub.toString())}
					className="min-h-[44px] px-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
					title="Подставить расчетную сумму кассы"
					data-testid="btn-cash-matches"
				>
					<Check size={15} className="text-emerald-600" />
					<span>Совпадает с кассой ({money(summary.cashRub)})</span>
				</button>

				<button
					type="button"
					onClick={onOpenOfflineBatch}
					className="min-h-[44px] px-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
					title="Очередь фискализации и сверка с эквайрингом"
				>
					<Layers size={15} />
					<span>Очередь чеков {pendingQueueCount > 0 ? `(${pendingQueueCount})` : ""}</span>
				</button>

				<button
					type="button"
					onClick={onPrintStatement}
					className="min-h-[44px] px-3.5 rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] hover:bg-[var(--paper-soft)] dark:hover:bg-[var(--paper)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
					title="Печать бухгалтерской ведомости А4"
				>
					<FileText size={15} className="text-teal-600 dark:text-teal-400" />
					<span>Ведомость А4</span>
				</button>

				<button
					type="button"
					onClick={onExport1cCsv}
					className="min-h-[44px] px-3.5 rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] hover:bg-[var(--paper-soft)] dark:hover:bg-[var(--paper)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
					title="Экспорт в 1С:Бухгалтерию (CSV UTF-8 BOM)"
				>
					<FileSpreadsheet size={15} className="text-blue-600 dark:text-blue-400" />
					<span>1С (CSV)</span>
				</button>

				<button
					type="button"
					onClick={onOpenZReport}
					className="min-h-[44px] px-4 rounded-xl bg-[var(--ink,#0f172a)] hover:opacity-90 text-[var(--paper,#ffffff)] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm ml-auto whitespace-nowrap"
				>
					<FileText size={16} />
					<span>Сформировать Z-отчет</span>
				</button>
			</div>

			<p id="cash-day-counted-result" style={{ margin: "6px 0 0" }} className="text-xs sm:text-sm font-medium" role="status">
				{countedCashInvalid
					? "Впишите сумму цифрами, копейки после запятой: 12 000,50"
					: differenceRub === null
						? `По записям в ящике должно быть ${money(summary.cashRub)}.`
						: differenceRub === 0
							? `Сходится: ${money(summary.cashRub)}.`
							: differenceRub > 0
								? `В ящике на ${money(differenceRub)} больше, чем по записям. Скорее всего, оплату приняли, но не записали в программу.`
								: `В ящике на ${money(-differenceRub)} меньше, чем по записям. Проверьте сдачу и возвраты: возврат по оплате, принятой в другой день, в сегодняшний итог не попадает — программа не хранит время возврата.`}
			</p>
		</div>
	);
}
