import React, { useId } from "react";
import { AlertTriangle } from "lucide-react";
import { showToast } from "../GlobalToast";
import type { FastImplantPassportData } from "./implantQuickPresets";
import { FREQUENT_IMPLANT_SITES, PERMANENT_TEETH_OPTIONS } from "./implantConstants";
export { FREQUENT_IMPLANT_SITES, PERMANENT_TEETH_OPTIONS };
import { ImplantPassportCard } from "./ImplantPassportCard";
import { ImplantDiaryTab } from "./ImplantDiaryTab";
import { ImplantProtocolTab } from "./ImplantProtocolTab";
import { useImplantPassportLogic, type ImplantModalTab } from "./modal/useImplantPassportLogic";
import { useImplantModalHandlers } from "./modal/useImplantModalHandlers";
import { ImplantPassportModalHeader } from "./modal/ImplantPassportModalHeader";
import { ImplantPassportModalNav } from "./modal/ImplantPassportModalNav";
import { ImplantPassportModalFooter } from "./modal/ImplantPassportModalFooter";
import "./implants.css";

export interface ImplantPassportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly initialTooth?: number | undefined;
	readonly initialTab?: (ImplantModalTab | "isq") | undefined;
	readonly inventoryOverdraftActive?: boolean | undefined;
	readonly onSavePassport?: ((data: FastImplantPassportData) => void) | undefined;
	readonly onInsertIntoDiary?: ((diaryText: string) => void) | undefined;
	readonly className?: string | undefined;
}

export const ImplantPassportModal: React.FC<ImplantPassportModalProps> = ({
	isOpen,
	onClose,
	patientName = "Пациент",
	patientId = "PAT-01",
	doctorName = "Хирург-имплантолог",
	doctorId = "DOC-01",
	initialTooth = 46,
	initialTab = "protocol",
	inventoryOverdraftActive = false,
	onSavePassport,
	onInsertIntoDiary,
	className = "",
}) => {
	const titleId = useId();
	const logic = useImplantPassportLogic({
		isOpen,
		initialTooth,
		initialTab,
		inventoryOverdraftActive,
		patientName,
		patientId,
		doctorName,
		doctorId,
		onSavePassport,
		onInsertIntoDiary,
		onClose,
	});
	const handlers = useImplantModalHandlers(logic, patientId, onSavePassport, onInsertIntoDiary, onClose);

	const handlePrintPassport = () => {
		logic.setActiveTab("passport");
		setTimeout(() => {
			window.print?.();
			showToast(`Печать паспорта #${logic.toothFdi}`, "success");
		}, 100);
	};

	if (!isOpen) return null;

	return (
		<div className="implant-passport-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid="implant-passport-modal-backdrop">
			<div className={`implant-passport-card-container implant-surgical-passport-modal ${className}`.trim()} data-testid="implant-passport-modal">
				<ImplantPassportModalHeader
					titleId={titleId}
					toothFdi={logic.toothFdi}
					patientName={patientName}
					doctorName={doctorName}
					activeTab={logic.activeTab}
					onTogglePassportView={() => logic.setActiveTab(logic.activeTab === "passport" ? "protocol" : "passport")}
					onPrintPassport={handlePrintPassport}
					onClose={onClose}
				/>
				<ImplantPassportModalNav
					activeTab={logic.activeTab}
					setActiveTab={logic.setActiveTab}
					torqueNcm={logic.torqueNcm}
				/>
				<div className="implant-passport-content p-4 overflow-y-auto min-h-0 flex-1 space-y-4">
					{Boolean(inventoryOverdraftActive) && !logic.isOverdraftDismissed && (
						<div className="p-3 rounded-xl bg-[var(--amber-surface,rgba(245,158,11,0.1))] border border-[var(--amber-soft,rgba(245,158,11,0.3))] text-xs text-[var(--ink)] flex items-center gap-2.5" data-testid="passport-overdraft-notice">
							<AlertTriangle size={18} className="text-[var(--amber,#f59e0b)] shrink-0" />
							<div className="flex-1 min-w-0">
								<strong className="text-[var(--amber,#f59e0b)]">Мягкий овердрафт склада: </strong>
								<span>Задержка накладной не блокирует сохранение протокола.</span>
							</div>
							<button type="button" onClick={() => logic.setIsOverdraftDismissed(true)} className="text-xs font-bold underline text-[var(--ink)] cursor-pointer shrink-0">
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
					{/* Вывод паспорта на печать даже при активной вкладке протокола */}
					{logic.activeTab !== "passport" && (
						<div className="hidden print:block" aria-hidden="true">
							<ImplantPassportCard data={logic.assembledData} />
						</div>
					)}
				</div>
				<ImplantPassportModalFooter
					brand={logic.selectedSystem.brand}
					diameterMm={logic.diameterMm}
					lengthMm={logic.lengthMm}
					torqueNcm={logic.torqueNcm}
					onPrint={handlePrintPassport}
					onSave={handlers.handleSaveAndInsertDiary}
				/>
			</div>
		</div>
	);
};

export default ImplantPassportModal;
