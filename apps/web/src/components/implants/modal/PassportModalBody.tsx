/**
 * PassportModalBody.tsx — Контейнер содержимого модального окна имплантации (Мандат 8b: <= 120 строк).
 */
import React from "react";
import { AlertTriangle } from "lucide-react";
import { ImplantPassportCard } from "../ImplantPassportCard";
import { ImplantDiaryTab } from "../ImplantDiaryTab";
import { ImplantProtocolTab } from "../ImplantProtocolTab";
import type { useImplantPassportLogic } from "./useImplantPassportLogic";
import type { useImplantModalHandlers } from "./useImplantModalHandlers";

export interface PassportModalBodyProps {
	readonly logic: ReturnType<typeof useImplantPassportLogic>;
	readonly handlers: ReturnType<typeof useImplantModalHandlers>;
	readonly inventoryOverdraftActive: boolean;
}

export const PassportModalBody: React.FC<PassportModalBodyProps> = ({
	logic,
	handlers,
	inventoryOverdraftActive,
}) => {
	return (
		<div className="implant-passport-content p-4 overflow-y-auto min-h-0 flex-1 space-y-4">
			{Boolean(inventoryOverdraftActive) && !logic.isOverdraftDismissed && (
				<div
					className="p-3 rounded-xl bg-[var(--amber-surface,rgba(245,158,11,0.1))] border border-[var(--amber-soft,rgba(245,158,11,0.3))] text-xs text-[var(--ink)] flex items-center gap-2.5"
					data-testid="passport-overdraft-notice"
				>
					<AlertTriangle size={18} className="text-[var(--amber,#f59e0b)] shrink-0" />
					<div className="flex-1 min-w-0">
						<strong className="text-[var(--amber,#f59e0b)]">Мягкий овердрафт склада: </strong>
						<span>Задержка накладной не блокирует сохранение протокола.</span>
					</div>
					<button
						type="button"
						onClick={() => logic.setIsOverdraftDismissed(true)}
						className="text-xs font-bold underline text-[var(--ink)] cursor-pointer shrink-0"
					>
						Закрыть
					</button>
				</div>
			)}

			{logic.activeTab === "passport" ? (
				<div data-testid="tab-content-passport">
					<ImplantPassportCard data={logic.assembledData} />
				</div>
			) : logic.activeTab === "diary" ? (
				<div data-testid="tab-content-diary">
					<ImplantDiaryTab diaryText={handlers.generateDiaryText()} />
				</div>
			) : (
				<ImplantProtocolTab
					toothFdi={logic.toothFdi}
					handleToothSelect={handlers.handleToothSelect}
					boneDensity={logic.boneDensity}
					setBoneDensity={logic.setBoneDensity}
					scannedBarcode={logic.scannedBarcode}
					setScannedBarcode={logic.setScannedBarcode}
					handleApplyBarcode={handlers.handleApplyBarcode}
					isGbrPerformed={logic.isGbrPerformed}
					setIsGbrPerformed={logic.setIsGbrPerformed}
					capType={logic.capType}
					setCapType={logic.setCapType}
					selectedBrand={logic.selectedBrand}
					handleBrandSelect={handlers.handleBrandSelect}
					diameterMm={logic.diameterMm}
					setDiameterMm={logic.setDiameterMm}
					lengthMm={logic.lengthMm}
					setLengthMm={logic.setLengthMm}
					torqueNcm={logic.torqueNcm}
					setTorqueNcm={logic.setTorqueNcm}
					lotNumber={logic.lotNumber}
					setLotNumber={logic.setLotNumber}
					catalogArticle={logic.catalogArticle}
					setCatalogArticle={logic.setCatalogArticle}
					serialNumber={logic.serialNumber}
					setSerialNumber={logic.setSerialNumber}
					isOverdraftActive={Boolean(inventoryOverdraftActive)}
					stockItems={logic.stockItems}
					selectedStockItemId={logic.selectedStockItemId}
					onSelectStockItem={handlers.handleSelectStockItem}
					stockConsumables={logic.stockConsumables}
					selectedGraftId={logic.selectedGraftId}
					onSelectGraftId={logic.setSelectedGraftId}
					selectedMembraneId={logic.selectedMembraneId}
					onSelectMembraneId={logic.setSelectedMembraneId}
					selectedSutureId={logic.selectedSutureId}
					onSelectSutureId={logic.setSelectedSutureId}
					operationPriceRub={logic.operationPriceRub}
					setOperationPriceRub={logic.setOperationPriceRub}
					implantCostRub={logic.implantCostRub}
					consumablesCostRub={logic.consumablesCostRub}
					doctorGrossMarginRub={logic.doctorGrossMarginRub}
					expirationDate={logic.expirationDate}
					setExpirationDate={logic.setExpirationDate}
					onApplyStandardProtocol={handlers.handleApplyStandardProtocol}
					onApplyImmediateProtocol={handlers.handleApplyImmediateProtocol}
					onApplyTwoStageProtocol={handlers.handleApplyTwoStageProtocol}
					onApplyGbrProtocol={handlers.handleApplyGbrProtocol}
				/>
			)}

			{logic.activeTab !== "passport" && (
				<div className="hidden print:block" aria-hidden="true">
					<ImplantPassportCard data={logic.assembledData} />
				</div>
			)}
		</div>
	);
};

export default PassportModalBody;
