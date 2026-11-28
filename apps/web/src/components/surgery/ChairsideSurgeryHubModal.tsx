/**
 * ChairsideSurgeryHubModal.tsx — Единый канонический рабочий стол хирурга-имплантолога у кресла (DENTE CRM).
 * Чистый фасад поверх useSurgeryHubState, SurgeryProtocolSection и модулей (Мандаты 8b, 8zi, 8e, 8am).
 * Ровно ОДНА Primary CTA кнопка var(--primary): «✓ Зафиксировать операцию и внести в карту приёма >».
 */

import React, { useId } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import type { SurgeryScenarioType } from "./surgeryCatalogData";
import { SurgeryPostOpMemoSection } from "./SurgeryPostOpMemoSection";
import { ImplantPassportCard } from "../implants/ImplantPassportCard";
import { SurgeryHubHeader } from "./modules/SurgeryHubHeader";
import { SurgeryHubNavigation, type SurgeryHubTab } from "./modules/SurgeryHubNavigation";
import { SurgeryProtocolSection } from "./SurgeryProtocolSection";
import { SurgeryHubFooter } from "./modules/SurgeryHubFooter";
import {
	useSurgeryHubState,
	type ChairsideSurgerySavedProtocolData,
} from "./useSurgeryHubState";
import "./surgeryHub.css";

export type { SurgeryHubTab, ChairsideSurgerySavedProtocolData };

export interface ChairsideSurgeryHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly initialTooth?: number | undefined;
	readonly initialScenario?: SurgeryScenarioType | undefined;
	readonly initialTab?: SurgeryHubTab | undefined;
	readonly inventoryOverdraftActive?: boolean | undefined;
	readonly initialBrand?: string | undefined;
	readonly initialDiameterMm?: number | undefined;
	readonly initialLengthMm?: number | undefined;
	readonly initialTorqueNcm?: number | undefined;
	readonly initialLotNumber?: string | undefined;
	readonly initialBoneGraft?: string | undefined;
	readonly initialMembrane?: string | undefined;
	readonly initialSuture?: string | undefined;
	readonly initialTeeth?: readonly number[] | undefined;
	readonly onSaveProtocol?: ((data: ChairsideSurgerySavedProtocolData) => void) | undefined;
	readonly onInsertIntoDiary?: ((diaryText: string) => void) | undefined;
	readonly className?: string | undefined;
}

export const ChairsideSurgeryHubModal: React.FC<ChairsideSurgeryHubModalProps> = ({
	isOpen,
	onClose,
	patientName,
	patientId,
	doctorName,
	doctorId,
	initialTooth,
	initialScenario,
	initialTab,
	inventoryOverdraftActive = false,
	initialBrand,
	initialDiameterMm,
	initialLengthMm,
	initialTorqueNcm,
	initialLotNumber,
	initialBoneGraft,
	initialMembrane,
	initialSuture,
	initialTeeth,
	onSaveProtocol,
	onInsertIntoDiary,
	className = "",
}) => {
	const titleId = useId();
	const state = useSurgeryHubState({
		isOpen,
		onClose,
		patientName,
		patientId,
		doctorName,
		doctorId,
		initialTooth,
		initialScenario,
		initialTab,
		inventoryOverdraftActive,
		initialBrand,
		initialDiameterMm,
		initialLengthMm,
		initialTorqueNcm,
		initialLotNumber,
		initialBoneGraft,
		initialMembrane,
		initialSuture,
		initialTeeth,
		onSaveProtocol,
		onInsertIntoDiary,
	});

	if (!isOpen) return null;

	const toothBadge = state.selectedTeeth.length > 1
		? `#${state.selectedTeeth.join(", #")}`
		: `#${state.toothFdi}`;

	const modalContent = (
		<div
			className="surgery-hub-modal-backdrop"
			data-testid="chairside-surgery-hub-backdrop"
			onClick={(e) => {
				if (e.target === e.currentTarget) state.handleClose();
			}}
		>
			<div
				className={`surgery-hub-card-container ${className}`.trim()}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				data-testid="chairside-surgery-hub-modal"
			>
				<SurgeryHubHeader
					titleId={titleId}
					toothBadge={toothBadge}
					patientName={state.effectivePatient.name}
					doctorName={state.effectiveDoctor.name}
					onPrint={state.handlePrintDocument}
					onClose={state.handleClose}
				/>

				<SurgeryHubNavigation
					activeScenario={state.activeScenario}
					onSelectScenario={state.handleSelectScenario}
					activeTab={state.activeTab}
					onSelectTab={state.setActiveTab}
				/>

				<div className="surgery-hub-content">
					{Boolean(inventoryOverdraftActive) && !state.isOverdraftNoticeDismissed && (
						<div
							className="p-3 rounded-xl bg-[var(--amber-surface,rgba(245,158,11,0.1))] border border-[var(--amber-soft,rgba(245,158,11,0.3))] text-xs text-[var(--ink)] flex items-center gap-2.5 shrink-0"
							data-testid="surgery-hub-overdraft-notice"
						>
							<AlertTriangle className="w-4 h-4 text-[var(--amber,#f59e0b)] shrink-0" />
							<div className="flex-1 min-w-0">
								<strong className="text-[var(--amber,#f59e0b)]">Мягкий овердрафт склада: </strong>
								<span>Задержка накладной не блокирует операцию. Списание расходников зафиксировано.</span>
							</div>
							<button
								type="button"
								onClick={state.dismissOverdraftNotice}
								className="h-8 px-2.5 text-xs font-medium rounded-md bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] cursor-pointer shrink-0 hover:bg-[var(--paper-soft)]"
							>
								Закрыть
							</button>
						</div>
					)}

					{state.activeTab === "memo" ? (
						<SurgeryPostOpMemoSection
							memoText={state.memoText}
							toothFdi={state.toothFdi}
							scenarioTitle={state.scenarioConfig.titleRu}
							onShareWhatsApp={state.handleShareWhatsAppMemo}
							onShareTelegram={state.handleShareTelegramMemo}
							onCopy={state.handleCopyMemo}
							onPrint={state.handlePrintDocument}
						/>
					) : state.activeTab === "passport" && state.activeScenario === "implant" ? (
						<div data-testid="surgery-passport-content">
							<ImplantPassportCard data={state.passportData} />
						</div>
					) : state.activeTab === "diary" ? (
						<div className="flex flex-col gap-3 min-h-0" data-testid="surgery-diary-content">
							<div className="text-xs font-semibold text-[var(--ink-muted)]">
								Автоматический протокол приёма для внесения в медицинскую карту:
							</div>
							<textarea
								readOnly
								value={state.diaryText}
								className="w-full h-72 sm:h-80 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono leading-relaxed resize-none focus:outline-none"
								data-testid="surgery-soap-textarea"
							/>
						</div>
					) : (
						<SurgeryProtocolSection
							activeScenario={state.activeScenario}
							scenarioConfig={state.scenarioConfig}
							onApplyPhysiologicalNorm={state.handleApplyPhysiologicalNorm}
							apiLoadError={state.apiLoadError}
							patientName={state.effectivePatient.name}
							isPatientBound={state.effectivePatient.isBound}
							doctorName={state.effectiveDoctor.name}
							isDoctorBound={state.effectiveDoctor.isBound}
							livePatients={state.livePatients}
							liveDoctors={state.liveDoctors}
							isLoadingPatients={state.isLoadingPatients}
							isLoadingDoctors={state.isLoadingDoctors}
							patientSearchQuery={state.patientSearchQuery}
							onChangePatientSearchQuery={state.setPatientSearchQuery}
							onSelectPatient={state.selectPatient}
							onSelectDoctor={state.selectDoctor}
							anesthesiaProtocol={state.anesthesiaProtocol}
							onChangeAnesthesiaProtocol={state.setAnesthesiaProtocol}
							incisionProtocol={state.incisionProtocol}
							onChangeIncisionProtocol={state.setIncisionProtocol}
							boneBedProtocol={state.boneBedProtocol}
							onChangeBoneBedProtocol={state.setBoneBedProtocol}
							boneDensity={state.boneDensity}
							onSelectBoneDensity={state.setBoneDensity}
							selectedBrand={state.selectedBrand}
							diameterMm={state.diameterMm}
							lengthMm={state.lengthMm}
							catalogArticle={state.catalogArticle}
							torqueNcm={state.torqueNcm}
							isqValue={state.isqValue}
							capType={state.capType}
							selectedSuture={state.selectedSuture}
							selectedTeeth={state.selectedTeeth}
							onSelectTooth={state.handleSelectTooth}
							activeEditingTooth={state.activeEditingTooth}
							onSelectActiveEditingTooth={state.handleSelectActiveEditingTooth}
							perToothSpecs={state.perToothSpecs}
							getToothSpec={state.getToothSpec}
							onSelectBrand={state.handleSelectBrand}
							onSelectDiameter={(d) => state.updateActiveImplantSpec({ diameterMm: d })}
							onSelectLength={(l) => state.updateActiveImplantSpec({ lengthMm: l })}
							onSelectTorque={(t) => state.updateActiveImplantSpec({ torqueNcm: t })}
							onSelectIsq={(isq) => state.updateActiveImplantSpec({ isqValue: isq })}
							onSelectCapType={(cap) => state.updateActiveImplantSpec({ capType: cap })}
							lotNumber={state.lotNumber}
							serialNumber={state.serialNumber}
							onChangeLotNumber={(lot) => state.updateActiveImplantSpec({ lotNumber: lot })}
							onChangeSerialNumber={(sn) => state.updateActiveImplantSpec({ serialNumber: sn })}
							isGuidedSurgery={state.isGuidedSurgery}
							onToggleGuidedSurgery={state.setIsGuidedSurgery}
							guidedSleeveDiameterMm={state.guidedSleeveDiameterMm}
							onSelectGuidedSleeveDiameter={state.setGuidedSleeveDiameterMm}
							guidedSleeveOffsetMm={state.guidedSleeveOffsetMm}
							onSelectGuidedSleeveOffset={state.setGuidedSleeveOffsetMm}
							surgicalGuideTemplateId={state.surgicalGuideTemplateId}
							onChangeSurgicalGuideTemplateId={state.setSurgicalGuideTemplateId}
						/>
					)}
				</div>

				<SurgeryHubFooter
					scenarioConfig={state.scenarioConfig}
					selectedTeeth={state.selectedTeeth}
					toothFdi={state.toothFdi}
					onPrint={state.handlePrintDocument}
					onSave={state.handleSaveOperationAndCommit}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body
		? createPortal(modalContent, document.body)
		: modalContent;
};

export const SurgeryStudioModal = ChairsideSurgeryHubModal;
export type SurgeryStudioModalProps = ChairsideSurgeryHubModalProps;

export default ChairsideSurgeryHubModal;
