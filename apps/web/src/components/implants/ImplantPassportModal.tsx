/**
 * ImplantPassportModal.tsx — Каноническое единое окно хирургического протокола и паспорта имплантата (DENTE CRM).
 * Полная автономия врача-хирурга: кнопки никогда не блокируются, 1-кликовая норма D2/D3,
 * памятка пациенту (WhatsApp/Telegram), автоматический дневник SOAP и складской овердрафт (Мандаты 8e, 8n, 8am, 8b).
 */

import React, { useId } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Award, FileText, HeartHandshake, Stethoscope } from "lucide-react";
import {
	FREQUENT_IMPLANT_SITES,
	PERMANENT_TEETH_OPTIONS,
} from "./implantConstants";
import type { FastImplantPassportData } from "./implantQuickPresets";
import { ImplantPassportCard } from "./ImplantPassportCard";
import { ImplantDiaryTab } from "./ImplantDiaryTab";
import { ImplantProtocolTab } from "./ImplantProtocolTab";
import {
	PassportModalHeader,
	PassportModalFooter,
	PostOpMemoTab,
	useImplantPassportState,
	type ImplantModalTab,
} from "./passportModal";
import "./implants.css";
import "./implantsDarkAndResponsive.css";

export { FREQUENT_IMPLANT_SITES, PERMANENT_TEETH_OPTIONS };
export type { ImplantModalTab };

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

	const state = useImplantPassportState({
		isOpen,
		onClose,
		patientName,
		patientId,
		doctorName,
		doctorId,
		initialTooth,
		initialTab,
		inventoryOverdraftActive,
		onSavePassport,
		onInsertIntoDiary,
	});

	if (!isOpen) return null;

	const modalContent = (
		<div className="implant-passport-modal-backdrop" data-testid="implant-passport-modal-backdrop">
			<div
				className={`implant-passport-card-container implant-surgical-passport-modal max-h-[calc(100vh-48px)] flex flex-col min-h-0 ${className}`.trim()}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				data-testid="implant-passport-modal"
			>
				{/* Модульная шапка модального окна */}
				<PassportModalHeader
					titleId={titleId}
					toothFdi={state.toothFdi}
					patientName={patientName}
					doctorName={doctorName}
					activeTab={state.activeTab}
					onTogglePassportView={() => state.setActiveTab(state.activeTab === "passport" ? "protocol" : "passport")}
					onPrintPassport={state.handlePrintPassport}
					onClose={onClose}
				/>

				{/* Навигация по табам */}
				<nav className="implant-tabs-nav flex items-center gap-1.5 px-3 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0 overflow-x-auto" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={state.activeTab === "protocol"}
						onClick={() => state.setActiveTab("protocol")}
						className={`secondary-button min-h-[36px] h-9 px-3 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer border transition-all ${
							state.activeTab === "protocol"
								? "bg-[var(--paper)] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] shadow-xs"
								: "bg-transparent border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
						}`}
						data-testid="implant-tab-protocol"
					>
						<Stethoscope size={14} className="shrink-0" />
						<span>1. Протокол ({state.torqueNcm} Н·см)</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={state.activeTab === "diary"}
						onClick={() => state.setActiveTab("diary")}
						className={`secondary-button min-h-[36px] h-9 px-3 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer border transition-all ${
							state.activeTab === "diary"
								? "bg-[var(--paper)] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] shadow-xs"
								: "bg-transparent border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
						}`}
						data-testid="implant-tab-diary"
					>
						<FileText size={14} className="shrink-0" />
						<span>2. В дневник (SOAP)</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={state.activeTab === "memo"}
						onClick={() => state.setActiveTab("memo")}
						className={`secondary-button min-h-[36px] h-9 px-3 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer border transition-all ${
							state.activeTab === "memo"
								? "bg-[var(--paper)] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] shadow-xs"
								: "bg-transparent border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
						}`}
						data-testid="implant-tab-memo"
					>
						<HeartHandshake size={14} className="shrink-0" />
						<span>3. Памятка пациенту</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={state.activeTab === "passport"}
						onClick={() => state.setActiveTab("passport")}
						className={`secondary-button min-h-[36px] h-9 px-3 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer border transition-all ${
							state.activeTab === "passport"
								? "bg-[var(--paper)] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] shadow-xs"
								: "bg-transparent border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
						}`}
						data-testid="implant-tab-passport"
					>
						<Award size={14} className="shrink-0" />
						<span>4. Паспорт имплантата</span>
					</button>
				</nav>

				{/* Основное тело */}
				<div className="implant-passport-content p-4 overflow-y-auto min-h-0 flex-1 space-y-4">
					{Boolean(inventoryOverdraftActive) && !state.isOverdraftDismissed && (
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
								onClick={() => state.setIsOverdraftDismissed(true)}
								className="text-xs font-bold underline text-[var(--ink)] cursor-pointer shrink-0 bg-transparent border-0 p-0"
							>
								Закрыть
							</button>
						</div>
					)}

					{state.activeTab === "passport" ? (
						<div data-testid="tab-content-passport">
							<ImplantPassportCard data={state.assembledData} />
						</div>
					) : state.activeTab === "diary" ? (
						<div data-testid="tab-content-diary">
							<ImplantDiaryTab diaryText={state.generateDiaryText()} />
						</div>
					) : state.activeTab === "memo" ? (
						<PostOpMemoTab
							patientName={patientName}
							toothFdi={state.toothFdi}
							doctorName={doctorName}
							implantBrand={state.selectedBrand}
							capType={state.capType}
						/>
					) : (
						<ImplantProtocolTab
							toothFdi={state.toothFdi}
							handleToothSelect={state.handleToothSelect}
							boneDensity={state.boneDensity}
							setBoneDensity={state.setBoneDensity}
							scannedBarcode={state.scannedBarcode}
							setScannedBarcode={state.setScannedBarcode}
							handleApplyBarcode={state.handleApplyBarcode}
							isGbrPerformed={state.isGbrPerformed}
							setIsGbrPerformed={state.setIsGbrPerformed}
							capType={state.capType}
							setCapType={state.setCapType}
							selectedBrand={state.selectedBrand}
							handleBrandSelect={state.handleBrandSelect}
							diameterMm={state.diameterMm}
							setDiameterMm={state.setDiameterMm}
							lengthMm={state.lengthMm}
							setLengthMm={state.setLengthMm}
							torqueNcm={state.torqueNcm}
							setTorqueNcm={state.setTorqueNcm}
							lotNumber={state.lotNumber}
							setLotNumber={state.setLotNumber}
							catalogArticle={state.catalogArticle}
							setCatalogArticle={state.setCatalogArticle}
							serialNumber={state.serialNumber}
							setSerialNumber={state.setSerialNumber}
							isOverdraftActive={Boolean(inventoryOverdraftActive)}
							stockItems={state.stockItems}
							selectedStockItemId={state.selectedStockItemId}
							onSelectStockItem={state.handleSelectStockItem}
							stockConsumables={state.stockConsumables}
							selectedGraftId={state.selectedGraftId}
							onSelectGraftId={state.setSelectedGraftId}
							selectedMembraneId={state.selectedMembraneId}
							onSelectMembraneId={state.setSelectedMembraneId}
							selectedSutureId={state.selectedSutureId}
							onSelectSutureId={state.setSelectedSutureId}
							operationPriceRub={state.operationPriceRub}
							setOperationPriceRub={state.setOperationPriceRub}
							implantCostRub={state.implantCostRub}
							consumablesCostRub={state.consumablesCostRub}
							doctorGrossMarginRub={state.doctorGrossMarginRub}
							expirationDate={state.expirationDate}
							setExpirationDate={state.setExpirationDate}
							onApplyStandardProtocol={state.handleApplyStandardProtocol}
							onApplyImmediateProtocol={state.handleApplyImmediateProtocol}
							onApplyTwoStageProtocol={state.handleApplyTwoStageProtocol}
							onApplyGbrProtocol={state.handleApplyGbrProtocol}
						/>
					)}

					{state.activeTab !== "passport" && (
						<div className="hidden print:block" aria-hidden="true">
							<ImplantPassportCard data={state.assembledData} />
						</div>
					)}
				</div>

				{/* Модульная панель действий подвала: ровно 2 кнопки по закону Миллера и Мандату 8am */}
				<PassportModalFooter
					selectedBrand={state.selectedBrand}
					diameterMm={state.diameterMm}
					lengthMm={state.lengthMm}
					torqueNcm={state.torqueNcm}
					screwdriverType={state.systemCatalog.screwdriverType}
					screwdriverAliasRu={state.systemCatalog.screwdriverAliasRu}
					onPrintPassport={state.handlePrintPassport}
					onSaveProtocol={state.handleSaveAndInsertDiary}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body
		? createPortal(modalContent, document.body)
		: modalContent;
};

export default ImplantPassportModal;
