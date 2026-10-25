/**
 * ImplantProtocolTab.tsx — Хирургический протокол имплантации (Мандат 8b: фасад <= 80 строк).
 */
import React from "react";
import { DEFAULT_CANONICAL_CONSUMABLES } from "./presets/implantStockDefaults";
import { ProtocolExpressPresetsBanner } from "./protocol/ProtocolExpressPresetsBanner";
import { ProtocolImplantSelector } from "./protocol/ProtocolImplantSelector";
import { ImplantStabilitySelector } from "./protocol/ImplantStabilitySelector";
import { ImplantCapAndGbrSelector } from "./protocol/ImplantCapAndGbrSelector";
import { ProtocolPackagingInputs } from "./protocol/ProtocolPackagingInputs";
import { ImplantWarehouseSelector } from "./ImplantWarehouseSelector";
import { ImplantEconomicsSection } from "./ImplantEconomicsSection";
import type { ImplantProtocolTabProps } from "./protocol/protocolTabTypes";

export type { ImplantProtocolTabProps };

export const ImplantProtocolTab: React.FC<ImplantProtocolTabProps> = (props) => {
	return (
		<div className="implant-protocol-tab space-y-4" data-testid="tab-content-protocol">
			<ProtocolExpressPresetsBanner onApplyStandardProtocol={props.onApplyStandardProtocol} onApplyImmediateProtocol={props.onApplyImmediateProtocol} onApplyTwoStageProtocol={props.onApplyTwoStageProtocol} onApplyGbrProtocol={props.onApplyGbrProtocol} />
			<ProtocolImplantSelector toothFdi={props.toothFdi} onSelectTooth={props.handleToothSelect} selectedBrand={props.selectedBrand} onSelectBrand={props.handleBrandSelect} diameterMm={props.diameterMm} setDiameterMm={props.setDiameterMm} lengthMm={props.lengthMm} setLengthMm={props.setLengthMm} />
			<ImplantStabilitySelector boneDensity={props.boneDensity} setBoneDensity={props.setBoneDensity} torqueNcm={props.torqueNcm} setTorqueNcm={props.setTorqueNcm} isqValue={props.isqValue} setIsqValue={props.setIsqValue} />
			<ImplantCapAndGbrSelector capType={props.capType} setCapType={props.setCapType} isGbrPerformed={props.isGbrPerformed} setIsGbrPerformed={props.setIsGbrPerformed} stockConsumables={props.stockConsumables || DEFAULT_CANONICAL_CONSUMABLES} selectedGraftId={props.selectedGraftId} onSelectGraftId={props.onSelectGraftId} selectedMembraneId={props.selectedMembraneId} onSelectMembraneId={props.onSelectMembraneId} selectedSutureId={props.selectedSutureId} onSelectSutureId={props.onSelectSutureId} />
			<ProtocolPackagingInputs catalogArticle={props.catalogArticle} setCatalogArticle={props.setCatalogArticle} lotNumber={props.lotNumber} setLotNumber={props.setLotNumber} serialNumber={props.serialNumber} setSerialNumber={props.setSerialNumber} />
			{props.stockItems && (
				<ImplantWarehouseSelector stockItems={props.stockItems} selectedStockItemId={props.selectedStockItemId} onSelectStockItem={props.onSelectStockItem || (() => {})} isOverdraftActive={props.isOverdraftActive} lotNumber={props.lotNumber} catalogArticle={props.catalogArticle} />
			)}
			<ImplantEconomicsSection operationPriceRub={props.operationPriceRub || 45000} setOperationPriceRub={props.setOperationPriceRub || (() => {})} implantCostRub={props.implantCostRub || 12500} consumablesCostRub={props.consumablesCostRub || 0} doctorGrossMarginRub={props.doctorGrossMarginRub || 32500} />
		</div>
	);
};

export default ImplantProtocolTab;
