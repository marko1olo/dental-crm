import React from "react";
import { Scan } from "lucide-react";

export interface ImplantBarcodeScannerRowProps {
	readonly scannedBarcode: string;
	readonly setScannedBarcode: (s: string) => void;
	readonly onApplyBarcode: (override?: string) => void;
	readonly lotNumber: string;
	readonly setLotNumber: (lot: string) => void;
	readonly catalogArticle: string;
	readonly setCatalogArticle: (art: string) => void;
	readonly serialNumber: string;
	readonly setSerialNumber: (sn: string) => void;
}

export const ImplantBarcodeScannerRow: React.FC<ImplantBarcodeScannerRowProps> = ({
	scannedBarcode,
	setScannedBarcode,
	onApplyBarcode,
	lotNumber,
	setLotNumber,
	catalogArticle,
	setCatalogArticle,
	serialNumber,
	setSerialNumber,
}) => {
	return (
		<div className="space-y-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
			<div className="flex items-center gap-2">
				<div className="relative flex-1">
					<input
						type="text"
						value={scannedBarcode}
						onChange={(e) => setScannedBarcode(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								onApplyBarcode();
							}
						}}
						placeholder="Сканируйте штрихкод с упаковки (GS1 DataMatrix / REF)..."
						className="implant-input w-full min-h-[44px] pl-3 pr-8 text-xs font-mono"
						data-testid="input-barcode-scanner input-scanned-barcode"
					/>
				</div>
				<button
					type="button"
					onClick={() => onApplyBarcode()}
					className="secondary-button min-h-[44px] px-3.5 text-xs flex items-center gap-1.5"
					data-testid="btn-scan-barcode btn-apply-scanned-barcode"
					title="Распознать штрихкод упаковки"
				>
					<Scan size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>Распознать</span>
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
				<div className="min-w-0">
					<label className="text-[10px] text-[var(--muted)] block">REF / Артикул:</label>
					<input
						type="text"
						value={catalogArticle}
						onChange={(e) => setCatalogArticle(e.target.value)}
						className="implant-input w-full min-h-[32px] text-xs font-mono"
						data-testid="input-catalog-article"
					/>
				</div>
				<div className="min-w-0">
					<label className="text-[10px] text-[var(--muted)] block">LOT / Партия:</label>
					<input
						type="text"
						value={lotNumber}
						onChange={(e) => setLotNumber(e.target.value)}
						className="implant-input w-full min-h-[32px] text-xs font-mono"
						data-testid="input-lot-number"
					/>
				</div>
				<div className="min-w-0">
					<label className="text-[10px] text-[var(--muted)] block">SN / Серийный номер:</label>
					<input
						type="text"
						value={serialNumber}
						onChange={(e) => setSerialNumber(e.target.value)}
						className="implant-input w-full min-h-[32px] text-xs font-mono"
						data-testid="input-serial-number"
					/>
				</div>
			</div>
		</div>
	);
};
