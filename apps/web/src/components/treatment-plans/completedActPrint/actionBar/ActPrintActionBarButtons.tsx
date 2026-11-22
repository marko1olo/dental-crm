import React from "react";
import { AlertTriangle, Eye, EyeOff, Loader2, Package, Printer, X } from "lucide-react";
import type { CompletedWorksActAndWriteOffData } from "../types.js";

export interface ActPrintActionBarButtonsProps {
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly hasDeficit: boolean;
	readonly isExecuting?: boolean | undefined;
	readonly showMicroConsumables: boolean;
	readonly microConsumablesCount: number;
	readonly onConfirmExecuteWriteOff?: (() => void) | undefined;
	readonly onToggleMicroConsumables?: (() => void) | undefined;
	readonly onPrint: () => void;
	readonly onClose: () => void;
}

export const ActPrintActionBarButtons: React.FC<ActPrintActionBarButtonsProps> = ({
	actData,
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
					className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] flex-1 sm:flex-initial rounded-xl text-xs font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] shadow-sm cursor-pointer transition-colors"
					title={
						hasDeficit
							? "Позиции будут списаны со склада в фоновом режиме до оприходования накладной."
							: "Провести списание расходных материалов ТМЦ"
					}
					data-testid="execute-act-writeoff-btn"
				>
					{isExecuting ? (
						<Loader2 className="w-4 h-4 shrink-0 animate-spin" />
					) : hasDeficit ? (
						<AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
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
						<span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-semibold border border-amber-500/30">
							Овердрафт
						</span>
					)}
				</button>
			)}
			{microConsumablesCount > 0 && onToggleMicroConsumables && (
				<button
					type="button"
					onClick={onToggleMicroConsumables}
					className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
					title={
						showMicroConsumables
							? "Сгруппировать мелкие расходники в один гигиенический комплект"
							: "Показать мелкие расходники (валики, слюноотсосы, перчатки) отдельными строками"
					}
					data-testid="toggle-micro-consumables-act-btn"
				>
					{showMicroConsumables ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
				className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] flex-1 sm:flex-initial rounded-xl text-xs font-medium bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-sm transition-colors cursor-pointer"
				title="Распечатать официальный бланк акта (Ctrl+P)"
			>
				<Printer className="w-4 h-4" />
				<span>Печать бланка (Ctrl+P)</span>
			</button>
			<button
				type="button"
				onClick={onClose}
				className="p-2.5 rounded-xl text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
				aria-label="Закрыть окно печати акта"
			>
				<X className="w-5 h-5" />
			</button>
		</div>
	);
};
