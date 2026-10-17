import React from "react";
import { Sparkles } from "lucide-react";
import type { MischDensity, ImplantCapType, ImplantWarehouseStockItem, ImplantConsumablesStock } from "./presets/implantPresetTypes";
import { DEFAULT_CANONICAL_CONSUMABLES } from "./presets/implantStockDefaults";
import { ImplantToothPicker } from "./protocol/ImplantToothPicker";
import { ImplantBrandAndSizeSelector } from "./protocol/ImplantBrandAndSizeSelector";
import { ImplantStabilitySelector } from "./protocol/ImplantStabilitySelector";
import { ImplantCapAndGbrSelector } from "./protocol/ImplantCapAndGbrSelector";
import { ImplantBarcodeScannerRow } from "./protocol/ImplantBarcodeScannerRow";
import { ImplantWarehouseSelector } from "./ImplantWarehouseSelector";
import { ImplantEconomicsSection } from "./ImplantEconomicsSection";

export interface ImplantProtocolTabProps {
	readonly toothFdi: number;
	readonly handleToothSelect: (fdi: number) => void;
	readonly boneDensity: MischDensity;
	readonly setBoneDensity: (b: MischDensity) => void;
	readonly scannedBarcode: string;
	readonly setScannedBarcode: (s: string) => void;
	readonly handleApplyBarcode: (codeOverride?: string) => void;
	readonly isGbrPerformed: boolean;
	readonly setIsGbrPerformed: (gbr: boolean) => void;
	readonly capType: ImplantCapType;
	readonly setCapType: (cap: ImplantCapType) => void;
	readonly isIsqEnabled: boolean;
	readonly setIsIsqEnabled: (en: boolean) => void;
	readonly selectedBrand: string;
	readonly handleBrandSelect: (brand: string) => void;
	readonly diameterMm: number;
	readonly setDiameterMm: (dia: number) => void;
	readonly lengthMm: number;
	readonly setLengthMm: (len: number) => void;
	readonly torqueNcm: number;
	readonly setTorqueNcm: (torque: number) => void;
	readonly lotNumber: string;
	readonly setLotNumber: (lot: string) => void;
	readonly catalogArticle: string;
	readonly setCatalogArticle: (art: string) => void;
	readonly serialNumber: string;
	readonly setSerialNumber: (sn: string) => void;
	readonly isOverdraftActive: boolean;
	readonly stockItems?: readonly ImplantWarehouseStockItem[];
	readonly selectedStockItemId?: string;
	readonly onSelectStockItem?: (item: ImplantWarehouseStockItem) => void;
	readonly stockConsumables?: ImplantConsumablesStock;
	readonly selectedGraftId?: string;
	readonly onSelectGraftId?: (id: string) => void;
	readonly selectedMembraneId?: string;
	readonly onSelectMembraneId?: (id: string) => void;
	readonly selectedSutureId?: string;
	readonly onSelectSutureId?: (id: string) => void;
	readonly operationPriceRub?: number;
	readonly setOperationPriceRub?: (price: number) => void;
	readonly implantCostRub?: number;
	readonly consumablesCostRub?: number;
	readonly doctorGrossMarginRub?: number;
	readonly expirationDate?: string;
	readonly setExpirationDate?: (date: string) => void;
	readonly isqValue?: number;
	readonly onApplyStandardProtocol?: () => void;
}

export const ImplantProtocolTab: React.FC<ImplantProtocolTabProps> = (props) => {
	return (
		<div className="implant-protocol-tab space-y-4" data-testid="tab-content-protocol">
			<div className="banner-standard-protocol-preset p-3 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.08))] border border-[var(--teal-soft,rgba(13,148,136,0.3))] flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-2 min-w-0">
					<Sparkles size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
					<div className="text-xs">
						<strong className="text-[var(--ink)] block">Стандартный хирургический протокол (1 клик):</strong>
						<span className="text-[var(--muted)]">Ø 4.0×10 мм, 35 Н·см, ФДМ, охлаждение NaCl 0.9%, шов Викрил 4-0, списание со склада</span>
					</div>
				</div>
				<button
					type="button"
					onClick={props.onApplyStandardProtocol}
					className="primary-button min-h-[44px] px-3.5 text-xs font-bold shrink-0"
					data-testid="btn-apply-standard-protocol"
				>
					Применить стандартный протокол
				</button>
			</div>

			<ImplantToothPicker toothFdi={props.toothFdi} onSelectTooth={props.handleToothSelect} />
			<ImplantBrandAndSizeSelector selectedBrand={props.selectedBrand} onSelectBrand={props.handleBrandSelect} diameterMm={props.diameterMm} setDiameterMm={props.setDiameterMm} lengthMm={props.lengthMm} setLengthMm={props.setLengthMm} />
			<ImplantStabilitySelector boneDensity={props.boneDensity} setBoneDensity={props.setBoneDensity} torqueNcm={props.torqueNcm} setTorqueNcm={props.setTorqueNcm} isIsqEnabled={props.isIsqEnabled} setIsIsqEnabled={props.setIsIsqEnabled} isqValue={props.isqValue} />
			<ImplantCapAndGbrSelector capType={props.capType} setCapType={props.setCapType} isGbrPerformed={props.isGbrPerformed} setIsGbrPerformed={props.setIsGbrPerformed} stockConsumables={props.stockConsumables || DEFAULT_CANONICAL_CONSUMABLES} selectedGraftId={props.selectedGraftId} onSelectGraftId={props.onSelectGraftId} selectedMembraneId={props.selectedMembraneId} onSelectMembraneId={props.onSelectMembraneId} selectedSutureId={props.selectedSutureId} onSelectSutureId={props.onSelectSutureId} />
			<ImplantBarcodeScannerRow scannedBarcode={props.scannedBarcode} setScannedBarcode={props.setScannedBarcode} onApplyBarcode={props.handleApplyBarcode} lotNumber={props.lotNumber} setLotNumber={props.setLotNumber} catalogArticle={props.catalogArticle} setCatalogArticle={props.setCatalogArticle} serialNumber={props.serialNumber} setSerialNumber={props.setSerialNumber} />

			{props.stockItems && (
				<ImplantWarehouseSelector stockItems={props.stockItems} selectedStockItemId={props.selectedStockItemId} onSelectStockItem={props.onSelectStockItem || (() => {})} isOverdraftActive={props.isOverdraftActive} />
			)}

			<ImplantEconomicsSection operationPriceRub={props.operationPriceRub || 45000} setOperationPriceRub={props.setOperationPriceRub || (() => {})} implantCostRub={props.implantCostRub || 12500} consumablesCostRub={props.consumablesCostRub || 0} doctorGrossMarginRub={props.doctorGrossMarginRub || 32500} />
		</div>
	);
};

export default ImplantProtocolTab;
