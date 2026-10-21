import { Camera, QrCode } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";

export interface MobileSheetBarcodeScannerProps {
	readonly activeSheetItem: InventoryItem;
	readonly isScanInputOpen: boolean;
	readonly barcodeInputValue: string;
	readonly scanInputRef: React.RefObject<HTMLInputElement | null>;
	readonly onBarcodeChange: (val: string) => void;
	readonly onBarcodeKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	readonly onOpenScanInput: () => void;
	readonly onCloseScanInput: () => void;
}

export const MobileSheetBarcodeScanner: React.FC<MobileSheetBarcodeScannerProps> = ({
	activeSheetItem,
	isScanInputOpen,
	barcodeInputValue,
	scanInputRef,
	onBarcodeChange,
	onBarcodeKeyDown,
	onOpenScanInput,
	onCloseScanInput,
}) => {
	return (
		<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs">
			{isScanInputOpen ? (
				<div className="flex items-center gap-2 w-full">
					<input
						ref={scanInputRef}
						type="text"
						value={barcodeInputValue}
						onChange={(e) => onBarcodeChange(e.target.value)}
						onKeyDown={onBarcodeKeyDown}
						placeholder="Штрихкод / DataMatrix + Enter..."
						className="h-9 min-h-[36px] w-full px-3 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)]"
						data-testid="input-barcode-hid"
						autoFocus
					/>
					<button
						type="button"
						onClick={onCloseScanInput}
						className="h-9 min-h-[36px] px-2.5 rounded-lg border border-[var(--line)] text-xs text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--paper)] cursor-pointer shrink-0"
					>
						Отмена
					</button>
				</div>
			) : (
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<QrCode size={16} className="text-teal-600 shrink-0" />
						<span className="text-[var(--ink)] font-semibold truncate">
							Штрихкод: {activeSheetItem.barcode || "б/ш"}
						</span>
					</div>
					<button
						type="button"
						onClick={onOpenScanInput}
						className="min-h-[36px] px-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] text-xs font-bold hover:border-[var(--teal)] flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
						data-testid="btn-scan-barcode-hid"
					>
						<Camera size={13} />
						<span>Сканировать ШК</span>
					</button>
				</div>
			)}
		</div>
	);
};

export default MobileSheetBarcodeScanner;
