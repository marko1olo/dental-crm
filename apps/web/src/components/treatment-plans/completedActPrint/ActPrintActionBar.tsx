/**
 * ActPrintActionBar.tsx — Верхний тулбар управления печатью Акта и списания ТМЦ.
 * Скрыт при физической печати (print:hidden). Обеспечивает проведение списания
 * с мягким овердрафтом склада (Мандат 8e п. 10), переключение микро-расходников и печать.
 */

import {
	AlertTriangle,
	Eye,
	EyeOff,
	FileCheck,
	Loader2,
	Package,
	Printer,
	X,
} from "lucide-react";
import React from "react";
import type { ActPrintActionBarProps } from "./types";

export const ActPrintActionBar: React.FC<ActPrintActionBarProps> = ({
	actData,
	palette,
	hasDeficit,
	isExecuting,
	showMicroConsumables,
	microConsumablesCount,
	onConfirmExecuteWriteOff,
	onToggleMicroConsumables,
	onPrint,
	onClose,
}) => {
	return (
		<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950/80 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 print:hidden">
			<div className="flex items-center gap-3">
				<div
					className="p-2.5 rounded-2xl text-white shadow-sm shrink-0 flex items-center justify-center"
					style={{ backgroundColor: palette.primary }}
				>
					<FileCheck className="w-5 h-5" />
				</div>
				<div>
					<div className="flex items-center gap-2 flex-wrap">
						<span className="font-bold text-sm text-[var(--ink,#0f172a)] dark:text-white block">
							Акт сдачи-приемки и Накладная на списание ТМЦ
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
								actData.status === "executed"
									? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
									: actData.status === "signed"
										? "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/40"
										: "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
							}`}
						>
							{actData.status === "executed"
								? "Списано на складе"
								: actData.status === "signed"
									? "Подписан пациентом"
									: "Черновик акта"}
						</span>
					</div>
					<span className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">
						Акт № {actData.actNumber} •{" "}
						{/^этап\s*\d+/i.test(actData.stageTitle.trim())
							? actData.stageTitle
							: `Этап ${actData.stageNumber}: ${actData.stageTitle}`}
					</span>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
				{onConfirmExecuteWriteOff && actData.status !== "executed" && (
					<button
						type="button"
						onClick={() => {
							if (!isExecuting) {
								onConfirmExecuteWriteOff();
							}
						}}
						aria-busy={isExecuting}
						className={`flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] flex-1 sm:flex-initial rounded-xl text-xs font-bold text-white shadow-md cursor-pointer transition-all ${
							hasDeficit
								? "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 border border-amber-400/50"
								: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
						}`}
						title={
							hasDeficit
								? "Позиции будут списаны с отрицательным остатком до оприходования накладной медсестрой (Мандат 8e п. 10, Мандат 8n п. 2)"
								: "Провести списание расходных материалов ТМЦ"
						}
						data-testid="execute-act-writeoff-btn"
					>
						{isExecuting ? (
							<Loader2 className="w-4 h-4 shrink-0 animate-spin" />
						) : hasDeficit ? (
							<AlertTriangle className="w-4 h-4 shrink-0 text-yellow-200" />
						) : (
							<Package className="w-4 h-4 shrink-0" />
						)}
						<span>
							{isExecuting
								? "Проведение списания..."
								: hasDeficit
									? "Провести списание (Мягкий овердрафт склада)"
									: "Провести списание ТМЦ"}
						</span>
						{hasDeficit && !isExecuting && (
							<span className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-200 text-[10px] font-mono font-bold uppercase tracking-wider border border-amber-300/40">
								Овердрафт
							</span>
						)}
					</button>
				)}
				{microConsumablesCount > 0 && (
					<button
						type="button"
						onClick={onToggleMicroConsumables}
						className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
						title={
							showMicroConsumables
								? "Сгруппировать мелкие расходники в один гигиенический комплект"
								: "Показать мелкие расходники (валики, слюноотсосы, перчатки) отдельными строками"
						}
						data-testid="toggle-micro-consumables-act-btn"
					>
						{showMicroConsumables ? (
							<EyeOff className="w-4 h-4" />
						) : (
							<Eye className="w-4 h-4" />
						)}
						<span>
							{showMicroConsumables
								? "Скрыть мелкие расходники"
								: `Расходники сгруппированы (${microConsumablesCount})`}
						</span>
					</button>
				)}
				<button
					type="button"
					onClick={onPrint}
					className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] flex-1 sm:flex-initial rounded-xl text-xs font-bold border border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-200 hover:bg-teal-500/20 transition-colors cursor-pointer"
					title="Распечатать официальный бланк акта (Ctrl+P)"
				>
					<Printer className="w-4 h-4" />
					<span>Печать бланка (Ctrl+P)</span>
				</button>
				<button
					type="button"
					onClick={onClose}
					className="p-2.5 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
					aria-label="Закрыть окно печати акта"
				>
					<X className="w-5 h-5" />
				</button>
			</div>
		</div>
	);
};
