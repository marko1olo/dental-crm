import React from "react";
import { Sparkles, Package, Check } from "lucide-react";
import type { MischDensity, ImplantCapType, ImplantWarehouseStockItem, ImplantConsumablesStock } from "./presets/implantPresetTypes";
import { DEFAULT_CANONICAL_CONSUMABLES } from "./presets/implantStockDefaults";
import { ImplantToothPicker } from "./protocol/ImplantToothPicker";
import { ImplantBrandAndSizeSelector } from "./protocol/ImplantBrandAndSizeSelector";
import { ImplantStabilitySelector } from "./protocol/ImplantStabilitySelector";
import { ImplantCapAndGbrSelector } from "./protocol/ImplantCapAndGbrSelector";
import { ImplantWarehouseSelector } from "./ImplantWarehouseSelector";
import { ImplantEconomicsSection } from "./ImplantEconomicsSection";

export interface ImplantProtocolTabProps {
	readonly toothFdi: number;
	readonly handleToothSelect: (fdi: number) => void;
	readonly boneDensity: MischDensity;
	readonly setBoneDensity: (b: MischDensity) => void;
	readonly scannedBarcode?: string | undefined;
	readonly setScannedBarcode?: ((s: string) => void) | undefined;
	readonly handleApplyBarcode?: ((codeOverride?: string) => void) | undefined;
	readonly isGbrPerformed: boolean;
	readonly setIsGbrPerformed: (gbr: boolean) => void;
	readonly capType: ImplantCapType;
	readonly setCapType: (cap: ImplantCapType) => void;
	readonly isIsqEnabled?: boolean | undefined;
	readonly setIsIsqEnabled?: ((en: boolean) => void) | undefined;
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
	readonly stockItems?: readonly ImplantWarehouseStockItem[] | undefined;
	readonly selectedStockItemId?: string | undefined;
	readonly onSelectStockItem?: ((item: ImplantWarehouseStockItem) => void) | undefined;
	readonly stockConsumables?: ImplantConsumablesStock | undefined;
	readonly selectedGraftId?: string | undefined;
	readonly onSelectGraftId?: ((id: string) => void) | undefined;
	readonly selectedMembraneId?: string | undefined;
	readonly onSelectMembraneId?: ((id: string) => void) | undefined;
	readonly selectedSutureId?: string | undefined;
	readonly onSelectSutureId?: ((id: string) => void) | undefined;
	readonly operationPriceRub?: number | undefined;
	readonly setOperationPriceRub?: ((price: number) => void) | undefined;
	readonly implantCostRub?: number | undefined;
	readonly consumablesCostRub?: number | undefined;
	readonly doctorGrossMarginRub?: number | undefined;
	readonly expirationDate?: string | undefined;
	readonly setExpirationDate?: ((date: string) => void) | undefined;
	readonly isqValue?: number | undefined;
	readonly setIsqValue?: ((val: number) => void) | undefined;
	readonly onApplyStandardProtocol?: (() => void) | undefined;
	readonly onApplyImmediateProtocol?: (() => void) | undefined;
	readonly onApplyTwoStageProtocol?: (() => void) | undefined;
	readonly onApplyGbrProtocol?: (() => void) | undefined;
}

export const ImplantProtocolTab: React.FC<ImplantProtocolTabProps> = (props) => {
	return (
		<div className="implant-protocol-tab space-y-4" data-testid="tab-content-protocol">
			{/* 1-кликовый хирургический экспресс-протокол имплантации (Мандат 8e) */}
			<div className="banner-standard-protocol-preset implant-presets-section p-3.5 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.08))] border border-[var(--teal-soft,rgba(13,148,136,0.3))] space-y-2.5">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2 min-w-0">
						<Sparkles size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
						<div className="text-xs">
							<strong className="text-[var(--ink)] block text-sm">Хирургический экспресс-протокол имплантации:</strong>
							<span className="text-[var(--muted)]">1 клик: Ø 4.0/4.5×10 мм по зубу FDI, торк 35 Н·см, ФДМ, охлаждение 0.9% NaCl, шов Викрил 4-0</span>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
					<button
						type="button"
						onClick={props.onApplyStandardProtocol}
						className="secondary-button min-h-[44px] p-2.5 text-xs text-left flex flex-col justify-between gap-1 w-full border-[var(--teal,#0d9488)] bg-[var(--paper)]"
						data-testid="btn-apply-standard-protocol"
						title="Стандарт: торк 35 Н·см, формирователь десны ФДМ, шов Викрил 4-0"
					>
						<span className="font-bold text-[var(--teal,#0d9488)] block truncate flex items-center gap-1.5">
							<Check size={14} className="shrink-0" />
							<span>Стандартный протокол</span>
						</span>
						<span className="text-[11px] text-[var(--muted)] block truncate">35 Н·см · ФДМ · Викрил 4-0</span>
					</button>

					<button
						type="button"
						onClick={props.onApplyImmediateProtocol}
						className="secondary-button min-h-[44px] p-2.5 text-xs text-left flex flex-col justify-between gap-1 w-full"
						data-testid="btn-apply-immediate-protocol"
						title="Одномоментная имплантация: лунка удаленного зуба, немедленная нагрузка (45 Н·см)"
					>
						<span className="font-bold text-[var(--ink)] block truncate">Немедленная нагрузка</span>
						<span className="text-[11px] text-[var(--muted)] block truncate">45 Н·см · Одномоментно</span>
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
						title="Имплантация с НКР (GBR): Bio-Oss + Bio-Gide + швы"
					>
						<span className="font-bold text-[var(--amber,#f59e0b)] block truncate">Костная пластика (НКР)</span>
						<span className="text-[11px] text-[var(--muted)] block truncate">Bio-Oss + Bio-Gide + швы</span>
					</button>
				</div>
			</div>

			<ImplantToothPicker toothFdi={props.toothFdi} onSelectTooth={props.handleToothSelect} />
			<ImplantBrandAndSizeSelector selectedBrand={props.selectedBrand} onSelectBrand={props.handleBrandSelect} diameterMm={props.diameterMm} setDiameterMm={props.setDiameterMm} lengthMm={props.lengthMm} setLengthMm={props.setLengthMm} />
			<ImplantStabilitySelector
				boneDensity={props.boneDensity}
				setBoneDensity={props.setBoneDensity}
				torqueNcm={props.torqueNcm}
				setTorqueNcm={props.setTorqueNcm}
			/>
			<ImplantCapAndGbrSelector
				capType={props.capType}
				setCapType={props.setCapType}
				isGbrPerformed={props.isGbrPerformed}
				setIsGbrPerformed={props.setIsGbrPerformed}
				stockConsumables={props.stockConsumables || DEFAULT_CANONICAL_CONSUMABLES}
				selectedGraftId={props.selectedGraftId}
				onSelectGraftId={props.onSelectGraftId}
				selectedMembraneId={props.selectedMembraneId}
				onSelectMembraneId={props.onSelectMembraneId}
				selectedSutureId={props.selectedSutureId}
				onSelectSutureId={props.onSelectSutureId}
			/>

			{/* Идентификация изделия стерильной упаковки: прямой ввод LOT / SN / REF без процедурных симуляторов */}
			<div className="implant-packaging-section p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-1.5 min-w-0">
						<Package size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span className="text-xs font-bold text-[var(--ink)]">
							Стерильная упаковка изделия (LOT / SN / REF):
						</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => {
								if (!props.catalogArticle) props.setCatalogArticle("TS3S4010S");
								if (!props.lotNumber) props.setLotNumber("24C1208");
								if (!props.serialNumber) props.setSerialNumber(`SN-${Date.now().toString().slice(-6)}`);
							}}
							className="secondary-button text-[11px] px-2.5 py-1 min-h-[30px] rounded-lg cursor-pointer"
							title="Автозаполнение по умолчанию"
							data-testid="btn-autofill-packaging"
						>
							По умолчанию
						</button>
						<span className="text-[11px] text-[var(--muted)] hidden sm:inline">Быстрое заполнение реквизитов</span>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
					<div className="min-w-0">
						<label className="text-[10px] text-[var(--muted)] font-medium block mb-1">REF / Артикул:</label>
						<input
							type="text"
							value={props.catalogArticle}
							onChange={(e) => props.setCatalogArticle(e.target.value)}
							placeholder="TS3S4010S"
							className="implant-input w-full min-h-[36px] px-2.5 text-xs font-mono"
							data-testid="input-catalog-article"
						/>
					</div>
					<div className="min-w-0">
						<label className="text-[10px] text-[var(--muted)] font-medium block mb-1">LOT / Партия:</label>
						<input
							type="text"
							value={props.lotNumber}
							onChange={(e) => props.setLotNumber(e.target.value)}
							placeholder="24C1208"
							className="implant-input w-full min-h-[36px] px-2.5 text-xs font-mono font-bold"
							data-testid="input-lot-number"
						/>
					</div>
					<div className="min-w-0">
						<label className="text-[10px] text-[var(--muted)] font-medium block mb-1">SN / Серийный номер:</label>
						<input
							type="text"
							value={props.serialNumber}
							onChange={(e) => props.setSerialNumber(e.target.value)}
							placeholder="SN-884210"
							className="implant-input w-full min-h-[36px] px-2.5 text-xs font-mono"
							data-testid="input-serial-number"
						/>
					</div>
				</div>
			</div>

			{props.stockItems && (
				<ImplantWarehouseSelector stockItems={props.stockItems} selectedStockItemId={props.selectedStockItemId} onSelectStockItem={props.onSelectStockItem || (() => {})} isOverdraftActive={props.isOverdraftActive} lotNumber={props.lotNumber} catalogArticle={props.catalogArticle} />
			)}

			<ImplantEconomicsSection operationPriceRub={props.operationPriceRub || 45000} setOperationPriceRub={props.setOperationPriceRub || (() => {})} implantCostRub={props.implantCostRub || 12500} consumablesCostRub={props.consumablesCostRub || 0} doctorGrossMarginRub={props.doctorGrossMarginRub || 32500} />
		</div>
	);
};

export default ImplantProtocolTab;
