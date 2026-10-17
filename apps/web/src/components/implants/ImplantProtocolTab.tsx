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
	readonly onApplyImmediateProtocol?: () => void;
	readonly onApplyTwoStageProtocol?: () => void;
	readonly onApplyGbrProtocol?: () => void;
}

export const ImplantProtocolTab: React.FC<ImplantProtocolTabProps> = (props) => {
	return (
		<div className="implant-protocol-tab space-y-4" data-testid="tab-content-protocol">
			<div className="banner-standard-protocol-preset implant-presets-section p-3 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.08))] border border-[var(--teal-soft,rgba(13,148,136,0.3))] space-y-2.5">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2 min-w-0">
						<Sparkles size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
						<div className="text-xs">
							<strong className="text-[var(--ink)] block">Стандартный хирургический протокол (1 клик):</strong>
							<span className="text-[var(--muted)]">Ø 4.0×10 мм, 35 Н·см, ФДМ, охлаждение NaCl 0.9%, шов Викрил 4-0, списание со склада</span>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
					<button
						type="button"
						onClick={props.onApplyStandardProtocol}
						className="secondary-button min-h-[44px] p-2.5 text-xs text-left flex flex-col justify-between gap-1 w-full"
						data-testid="btn-apply-standard-protocol"
						title="Стандарт: 35 Н·см, ISQ 72, формирователь десны ФДМ"
					>
						<span className="font-bold text-[var(--ink)] block truncate">Стандартный протокол</span>
						<span className="text-[11px] text-[var(--muted)] block truncate">35 Н·см · ISQ 72 · ФДМ</span>
					</button>

					<button
						type="button"
						onClick={props.onApplyImmediateProtocol}
						className="secondary-button min-h-[44px] p-2.5 text-xs text-left flex flex-col justify-between gap-1 w-full"
						data-testid="btn-apply-immediate-protocol"
						title="Одномоментная имплантация: лунка удаленного зуба, немедленная нагрузка (45 Н·см, ISQ 75)"
					>
						<span className="font-bold text-[var(--teal,#0d9488)] block truncate">Немедленная нагрузка</span>
						<span className="text-[11px] text-[var(--muted)] block truncate">45 Н·см · ISQ &ge; 70 · Одномоментно</span>
					</button>

					<button
						type="button"
						onClick={props.onApplyTwoStageProtocol}
						className="secondary-button min-h-[44px] p-2.5 text-xs text-left flex flex-col justify-between gap-1 w-full"
						data-testid="btn-apply-twostage-protocol"
						title="Двухэтапная классическая: винт-заглушка с ушиванием раны наглухо (35 Н·см)"
					>
						<span className="font-bold text-[var(--ink)] block truncate">Двухэтапная заглушка</span>
						<span className="text-[11px] text-[var(--muted)] block truncate">35 Н·см · Заглушка наглухо</span>
					</button>

					<button
						type="button"
						onClick={props.onApplyGbrProtocol}
						className="secondary-button min-h-[44px] p-2.5 text-xs text-left flex flex-col justify-between gap-1 w-full"
						data-testid="btn-apply-gbr-protocol"
						title="Имплантация с НКР (GBR): Bio-Oss + Bio-Gide + пины/швы"
					>
						<span className="font-bold text-[var(--amber,#f59e0b)] block truncate">Костная пластика (НКР)</span>
						<span className="text-[11px] text-[var(--muted)] block truncate">Bio-Oss + Bio-Gide + пины</span>
					</button>
				</div>
			</div>

			<ImplantToothPicker toothFdi={props.toothFdi} onSelectTooth={props.handleToothSelect} />
			<ImplantBrandAndSizeSelector selectedBrand={props.selectedBrand} onSelectBrand={props.handleBrandSelect} diameterMm={props.diameterMm} setDiameterMm={props.setDiameterMm} lengthMm={props.lengthMm} setLengthMm={props.setLengthMm} />
			<ImplantStabilitySelector boneDensity={props.boneDensity} setBoneDensity={props.setBoneDensity} torqueNcm={props.torqueNcm} setTorqueNcm={props.setTorqueNcm} isIsqEnabled={props.isIsqEnabled} setIsIsqEnabled={props.setIsIsqEnabled} isqValue={props.isqValue} />
			<ImplantCapAndGbrSelector capType={props.capType} setCapType={props.setCapType} isGbrPerformed={props.isGbrPerformed} setIsGbrPerformed={props.setIsGbrPerformed} stockConsumables={props.stockConsumables || DEFAULT_CANONICAL_CONSUMABLES} selectedGraftId={props.selectedGraftId} onSelectGraftId={props.onSelectGraftId} selectedMembraneId={props.selectedMembraneId} onSelectMembraneId={props.onSelectMembraneId} selectedSutureId={props.selectedSutureId} onSelectSutureId={props.onSelectSutureId} />
			<ImplantBarcodeScannerRow scannedBarcode={props.scannedBarcode} setScannedBarcode={props.setScannedBarcode} onApplyBarcode={props.handleApplyBarcode} lotNumber={props.lotNumber} setLotNumber={props.setLotNumber} catalogArticle={props.catalogArticle} setCatalogArticle={props.setCatalogArticle} serialNumber={props.serialNumber} setSerialNumber={props.setSerialNumber} />

			{props.stockItems && (
				<ImplantWarehouseSelector stockItems={props.stockItems} selectedStockItemId={props.selectedStockItemId} onSelectStockItem={props.onSelectStockItem || (() => {})} isOverdraftActive={props.isOverdraftActive} lotNumber={props.lotNumber} catalogArticle={props.catalogArticle} />
			)}

			<ImplantEconomicsSection operationPriceRub={props.operationPriceRub || 45000} setOperationPriceRub={props.setOperationPriceRub || (() => {})} implantCostRub={props.implantCostRub || 12500} consumablesCostRub={props.consumablesCostRub || 0} doctorGrossMarginRub={props.doctorGrossMarginRub || 32500} />
		</div>
	);
};

export default ImplantProtocolTab;
