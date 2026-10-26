import React from "react";
import { MoreHorizontal } from "lucide-react";
import { FiscalOperationsOverflowItems } from "./FiscalOperationsOverflowItems";

export interface FiscalOperationsOverflowMenuProps {
	readonly isOverflowMenuOpen: boolean;
	readonly setIsOverflowMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly handlePrintSalesSlip: () => Promise<void>;
	readonly handleManualCardTerminalConfirm: () => Promise<void>;
	readonly isSubmittingManualCard: boolean;
	readonly handleRetryFiscalizationWithoutBalanceImpact: () => Promise<void>;
	readonly isFiscalizing: boolean;
	readonly showSettings: boolean;
	readonly toggleSettings: () => void;
	readonly handleCopyActData: () => void;
	readonly handleCopyCertData: () => void;
}

export const FiscalOperationsOverflowMenu: React.FC<FiscalOperationsOverflowMenuProps> = ({
	isOverflowMenuOpen,
	setIsOverflowMenuOpen,
	handlePrintSalesSlip,
	handleManualCardTerminalConfirm,
	isSubmittingManualCard,
	handleRetryFiscalizationWithoutBalanceImpact,
	isFiscalizing,
	showSettings,
	toggleSettings,
	handleCopyActData,
	handleCopyCertData,
}) => {
	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setIsOverflowMenuOpen((prev) => !prev)}
				className="h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
				title="Дополнительные операции: товарный чек, ручное подтверждение, статья ДДС"
				data-testid="btn-payment-overflow-menu"
			>
				<MoreHorizontal size={15} />
				<span>Опции...</span>
			</button>

			{isOverflowMenuOpen && (
				<FiscalOperationsOverflowItems
					setIsOverflowMenuOpen={setIsOverflowMenuOpen}
					handlePrintSalesSlip={handlePrintSalesSlip}
					handleManualCardTerminalConfirm={handleManualCardTerminalConfirm}
					isSubmittingManualCard={isSubmittingManualCard}
					handleRetryFiscalizationWithoutBalanceImpact={handleRetryFiscalizationWithoutBalanceImpact}
					isFiscalizing={isFiscalizing}
					showSettings={showSettings}
					toggleSettings={toggleSettings}
					handleCopyActData={handleCopyActData}
					handleCopyCertData={handleCopyCertData}
				/>
			)}
		</div>
	);
};
