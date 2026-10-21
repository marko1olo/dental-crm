/**
 * ActPrintActionBar.tsx — Верхний тулбар управления печатью Акта и списания ТМЦ.
 * Скрыт при физической печати (print:hidden). Обеспечивает проведение списания
 * с мягким овердрафтом склада (Мандат 8e п. 10), переключение микро-расходников и печать.
 */

import React from "react";
import type { ActPrintActionBarProps } from "./types.js";
import { ActPrintActionBarMeta } from "./actionBar/ActPrintActionBarMeta.js";
import { ActPrintActionBarButtons } from "./actionBar/ActPrintActionBarButtons.js";

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
			<ActPrintActionBarMeta actData={actData} palette={palette} />

			<ActPrintActionBarButtons
				actData={actData}
				hasDeficit={hasDeficit}
				isExecuting={isExecuting}
				showMicroConsumables={showMicroConsumables}
				microConsumablesCount={microConsumablesCount}
				onConfirmExecuteWriteOff={onConfirmExecuteWriteOff}
				onToggleMicroConsumables={onToggleMicroConsumables}
				onPrint={onPrint}
				onClose={onClose}
			/>
		</div>
	);
};
