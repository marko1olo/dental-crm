import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";
import { MobileSheetBarcodeScanner } from "./MobileSheetBarcodeScanner.js";
import { MobileSheetHeader } from "./MobileSheetHeader.js";
import { MobileSheetStepper } from "./MobileSheetStepper.js";

export interface MobileStockActionSheetProps {
	readonly activeSheetItem: InventoryItem | null;
	readonly sheetQuantity: number;
	readonly isScanInputOpen: boolean;
	readonly barcodeInputValue: string;
	readonly scanInputRef: React.RefObject<HTMLInputElement | null>;
	readonly onClose: () => void;
	readonly onStepQuantity: (delta: number) => void;
	readonly onSetQuantity: (val: number) => void;
	readonly onBarcodeChange: (val: string) => void;
	readonly onBarcodeKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	readonly onOpenScanInput: () => void;
	readonly onCloseScanInput: () => void;
	readonly onExecuteDeduct: () => void;
	readonly onExecuteReceive: () => void;
}

export const MobileStockActionSheet: React.FC<MobileStockActionSheetProps> = ({
	activeSheetItem,
	sheetQuantity,
	isScanInputOpen,
	barcodeInputValue,
	scanInputRef,
	onClose,
	onStepQuantity,
	onSetQuantity,
	onBarcodeChange,
	onBarcodeKeyDown,
	onOpenScanInput,
	onCloseScanInput,
	onExecuteDeduct,
	onExecuteReceive,
}) => {
	if (!activeSheetItem) return null;

	return (
		<div
			className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="mobile-sheet-title"
			data-testid="warehouse-mobile-bottom-sheet"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="w-full rounded-t-[24px] bg-[var(--paper)] border-t border-[var(--line)] shadow-2xl p-4 pb-8 space-y-4 max-h-[90dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
				style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))" }}
			>
				<MobileSheetHeader activeSheetItem={activeSheetItem} onClose={onClose} />

				<MobileSheetStepper
					activeSheetItem={activeSheetItem}
					sheetQuantity={sheetQuantity}
					onStepQuantity={onStepQuantity}
					onSetQuantity={onSetQuantity}
				/>

				<MobileSheetBarcodeScanner
					activeSheetItem={activeSheetItem}
					isScanInputOpen={isScanInputOpen}
					barcodeInputValue={barcodeInputValue}
					scanInputRef={scanInputRef}
					onBarcodeChange={onBarcodeChange}
					onBarcodeKeyDown={onBarcodeKeyDown}
					onOpenScanInput={onOpenScanInput}
					onCloseScanInput={onCloseScanInput}
				/>

				<div className="flex flex-col gap-2.5 pt-1">
					<button
						type="button"
						onClick={onExecuteDeduct}
						className="min-h-[50px] w-full px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
						data-testid="sheet-deduct-btn"
					>
						<ArrowUpFromLine size={18} className="shrink-0" />
						<span>Списать {sheetQuantity} {activeSheetItem.unit || "ед."} (FEFO)</span>
					</button>

					<button
						type="button"
						onClick={onExecuteReceive}
						className="min-h-[50px] w-full px-4 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark,#0f766e)] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
						data-testid="sheet-receive-btn"
					>
						<ArrowDownToLine size={18} className="shrink-0" />
						<span>Оприходовать {sheetQuantity} {activeSheetItem.unit || "ед."}</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default MobileStockActionSheet;
