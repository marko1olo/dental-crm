/**
 * CashShiftCompactBar.tsx — Компактная полоса кассовой смены (Мандат 8b <= 120 строк).
 */

import React from "react";
import { CashShiftCompactActions } from "./cashShiftCompact/CashShiftCompactActions.js";
import { CashShiftCompactReportsMenu } from "./cashShiftCompact/CashShiftCompactReportsMenu.js";
import { CashShiftCompactStatus } from "./cashShiftCompact/CashShiftCompactStatus.js";

export interface CashShiftCompactBarProps {
	readonly isShiftOpen: boolean;
	readonly shiftNumber: number;
	readonly cashierName: string;
	readonly totalTurnoverRub: number;
	readonly pendingOfflineCount: number;
	readonly isProcessing: boolean;
	readonly isReportsMenuOpen: boolean;
	readonly setIsReportsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onOpenCashInModal: () => void;
	readonly onOpenCashOutModal: () => void;
	readonly onToggleShift: () => void;
	readonly onOpenOfflineBatchModal: () => void;
	readonly onPrintXReport: () => void;
	readonly onPrintAccountingStatement: () => void;
	readonly onExport1cCsv: () => void;
	readonly onOpenCashRegisterModal: () => void;
	readonly formatMoneyRu: (value: number) => string;
}

export const CashShiftCompactBar: React.FC<CashShiftCompactBarProps> = ({
	isShiftOpen,
	shiftNumber,
	cashierName,
	totalTurnoverRub,
	pendingOfflineCount,
	isProcessing,
	isReportsMenuOpen,
	setIsReportsMenuOpen,
	onOpenCashInModal,
	onOpenCashOutModal,
	onToggleShift,
	onOpenOfflineBatchModal,
	onPrintXReport,
	onPrintAccountingStatement,
	onExport1cCsv,
	onOpenCashRegisterModal,
	formatMoneyRu,
}) => {
	return (
		<div
			className="cash-shift-container cash-shift-compact flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 sm:px-3 sm:py-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xs text-xs min-h-[44px] h-auto mb-3"
			data-testid="cash-shift-widget"
		>
			<CashShiftCompactStatus
				isShiftOpen={isShiftOpen}
				shiftNumber={shiftNumber}
				cashierName={cashierName}
				totalTurnoverRub={totalTurnoverRub}
				pendingOfflineCount={pendingOfflineCount}
				onOpenOfflineBatchModal={onOpenOfflineBatchModal}
				formatMoneyRu={formatMoneyRu}
			/>

			<div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-start sm:justify-end shrink-0 relative">
				<CashShiftCompactActions
					isShiftOpen={isShiftOpen}
					isProcessing={isProcessing}
					onOpenCashInModal={onOpenCashInModal}
					onOpenCashOutModal={onOpenCashOutModal}
					onToggleShift={onToggleShift}
				/>

				<CashShiftCompactReportsMenu
					isReportsMenuOpen={isReportsMenuOpen}
					setIsReportsMenuOpen={setIsReportsMenuOpen}
					isProcessing={isProcessing}
					onPrintXReport={onPrintXReport}
					onPrintAccountingStatement={onPrintAccountingStatement}
					onExport1cCsv={onExport1cCsv}
					onOpenCashRegisterModal={onOpenCashRegisterModal}
				/>
			</div>
		</div>
	);
};

export default CashShiftCompactBar;
