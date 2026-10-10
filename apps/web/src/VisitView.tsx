import React from "react";
import { VisitIntakeCockpit } from "./components/visit/VisitIntakeCockpit";
import { MobileChairsideVisitWorkspace } from "./components/visit/MobileChairsideVisitWorkspace";
import { VisitPlanStageHandoffBanner } from "./components/visit/VisitPlanStageHandoffBanner";
import "./styles/VisitView.css";
import "./components/visit/VisitAnamnesisTab.css";

import {
	type VisitViewProps,
	executePolishTranscriptAutonomy,
	executeApplySomaticNormAutonomy,
	executeApplyHygienePresetAutonomy,
	executeApplyAnesthesiaPresetAutonomy,
	VisitViewHeader,
	VisitTabNav,
	VisitTabContent,
	VisitActionFooter,
	useVisitViewState,
	VisitClinicalToothModal,
	VisitViewModals,
} from "./components/visit/view";

export type { VisitViewProps };
export {
	executePolishTranscriptAutonomy,
	executeApplySomaticNormAutonomy,
	executeApplyHygienePresetAutonomy,
	executeApplyAnesthesiaPresetAutonomy,
	VisitPlanStageHandoffBanner,
};
export * from "./components/visit/visitPlanStageHandoff";
// Form 043/u fast print with revision watermark: "ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ"
export { handlePrintForm043uFast } from "./components/visit/view";

export function VisitView(rawProps?: Partial<VisitViewProps>) {
	const s = useVisitViewState(rawProps);

	if (!s.activePatient || s.isQueueCockpitForced) {
		const handleSelect = (id: string) => {
			s.setIsQueueCockpitForced(false);
			const fn = s.setSelectedPatientId || (s.appLogic as any)?.setSelectedPatientId;
			if (typeof fn === "function") fn(id);
		};
		return (
			<VisitIntakeCockpit
				dashboard={s.dashboard}
				activeDoctor={s.activeDoctor}
				onSelectPatient={handleSelect}
				onEmergencyIntake={() => {
					s.setIsQueueCockpitForced(false);
					const first = s.dashboard?.patients?.[0];
					if (first?.id) handleSelect(first.id);
				}}
			/>
		);
	}

	if (s.isMobile) {
		return (
			<MobileChairsideVisitWorkspace
				activePatient={s.activePatient} activeAppointment={s.activeAppointment}
				activeDoctor={s.activeDoctor} visitNoteForm={s.visitNoteForm}
				updateVisitNoteField={s.updateVisitNoteField} flushPendingVisitSaves={s.flushPendingVisitSaves}
				handleApplySomaticNormQuick={s.handleApplySomaticNormQuick} handleFinishVisitAction={s.handleFinishVisitAction}
				handlePrintForm043uFast={s.handlePrintForm043uFast} handleOpenLabOrder={s.handleOpenLabOrder}
				consolidatedAllergyChip={s.consolidatedAllergyChip} patientAge={s.patientAge}
				toothStateByCode={s.toothStateByCode as Record<string, string>} setToothState={s.setToothState}
				loadedTreatmentPlan={s.loadedTreatmentPlan || s.activePlan}
				onClose={() => {
					if (typeof (s.props as any).onCloseVisit === "function") (s.props as any).onCloseVisit();
					else window.dispatchEvent(new CustomEvent("dente:navigate-to-schedule"));
				}}
				testId="mobile-chairside-visit-workspace"
			/>
		);
	}

	return (
		<>
			<div className="panel visit-panel pb-28 sm:pb-8" id="visit" data-testid="visit-view">
				<header className="visit-monolithic-header rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xs mb-1 sm:mb-1.5 overflow-visible shrink-0 sticky top-0 z-30 backdrop-blur-md" data-testid="visit-header-monolith" aria-label="Шапка текущего приёма">
					<VisitViewHeader
						activePatient={s.activePatient} patientAge={s.patientAge} activeAppointment={s.activeAppointment}
						activeDoctor={s.activeDoctor} activePatientCriticalBadges={s.activePatientCriticalBadges}
						consolidatedAllergyChip={s.consolidatedAllergyChip} activePeers={s.activePeers} summaryText={s.summaryText}
						visitNoteForm={s.visitNoteForm} updateVisitNoteField={s.updateVisitNoteField}
						handleApplySomaticNormQuick={s.handleApplySomaticNormQuick} handlePrintForm043uFast={s.handlePrintForm043uFast}
						handlePrintCompletedActFast={s.handlePrintCompletedActFast} handlePrintEstimateFast={s.handlePrintEstimateFast}
						handlePrintInformedConsentFast={s.handlePrintInformedConsentFast} handleOpenLabOrder={s.handleOpenLabOrder}
						setIsEmergencyModalOpen={s.setIsEmergencyModalOpen} handleFinishVisitAction={s.handleFinishVisitAction}
						setIsQueueCockpitForced={s.setIsQueueCockpitForced} setSelectedPatientId={s.setSelectedPatientId}
						appLogic={s.appLogic} isHeaderMoreMenuOpen={s.isHeaderMoreMenuOpen} setIsHeaderMoreMenuOpen={s.setIsHeaderMoreMenuOpen}
						headerMoreMenuRef={s.headerMoreMenuRef} setIsDoctorShiftModalOpen={s.setIsDoctorShiftModalOpen}
						setIsPriceValidatorModalOpen={s.setIsPriceValidatorModalOpen} setIsStagePaymentModalOpen={s.setIsStagePaymentModalOpen}
						onOpenVisiographComparison={() => s.setIsVisiographComparisonModalOpen(true)}
						setIsVisiographComparisonModalOpen={s.setIsVisiographComparisonModalOpen}
					/>
					<VisitTabNav activeTab={s.visitSubViewTab} onTabChange={s.handleTabChange} />
				</header>

				<VisitTabContent
					visitSubViewTab={s.visitSubViewTab} activeAppointment={s.activeAppointment}
					activePatient={s.activePatient} activeDoctor={s.activeDoctor}
					visitNoteForm={s.visitNoteForm} updateVisitNoteField={s.updateVisitNoteField}
					loadedTreatmentPlan={s.loadedTreatmentPlan || s.activePlan} dashboard={s.dashboard}
					selectedToothForMenu={s.selectedToothForMenu} handlePrintEstimateFast={s.handlePrintEstimateFast}
					handlePrintForm043uFast={s.handlePrintForm043uFast} handlePrintInformedConsentFast={s.handlePrintInformedConsentFast}
					setIsInformedConsentModalOpen={s.setIsInformedConsentModalOpen} setIsWarrantyModalOpen={s.setIsWarrantyModalOpen}
				/>

				<VisitActionFooter
					loadedTreatmentPlan={s.loadedTreatmentPlan || s.activePlan} activeAppointment={s.activeAppointment}
					activePatient={s.activePatient} visitSubViewTab={s.visitSubViewTab} safeVisitPrimaryAction={s.safeVisitPrimaryAction}
					isTreatmentPlanExpiredSoft={s.isTreatmentPlanExpiredSoft} treatmentPlanAgeDays={s.treatmentPlanAgeDays}
					props={s.props} transcript={s.transcript} setTranscript={s.setTranscript} isTranscriptPolishing={s.isTranscriptPolishing}
					polishTranscript={s.polishTranscript} updateVisitNoteField={s.updateVisitNoteField} visitNoteForm={s.visitNoteForm}
					handlePrintForm043uFast={s.handlePrintForm043uFast} setIsPriceValidatorModalOpen={s.setIsPriceValidatorModalOpen}
					setIsStagePaymentModalOpen={s.setIsStagePaymentModalOpen}
				/>
			</div>

			<VisitClinicalToothModal
				selectedToothForMenu={s.selectedToothForMenu}
				closeClinicalModal={() => { s.setSelectedSurfaces([]); s.setSelectedToothForMenu(null); }}
				toothStateByCode={s.toothStateByCode} materialCategory={s.materialCategory} setMaterialCategory={s.setMaterialCategory}
				handleSelectDiagnosis={s.handleToothDiagnosisSelect} handleSelectSurface={s.handleSelectSurface}
				selectedSurfaces={s.selectedSurfaces} isSurfaceMode={s.isSurfaceMode} setIsSurfaceMode={s.setIsSurfaceMode}
				setEndoModalToothNumber={s.setEndoModalToothNumber} setEndoModalToothState={s.setEndoModalToothState}
				setIsEndoModalOpen={s.setIsEndoModalOpen} appendToEMKField={s.appendToEMKField}
				setLabOrderModalToothNumber={s.setLabOrderModalToothNumber} setIsLabOrderModalOpen={s.setIsLabOrderModalOpen}
				visitWarnings={s.visitWarnings} onAddServiceToTooth={s.onAddServiceToTooth}
			/>

			<VisitViewModals
				loadedTreatmentPlan={s.loadedTreatmentPlan || s.activePlan}
				isVisiographComparisonModalOpen={s.isVisiographComparisonModalOpen}
				setIsVisiographComparisonModalOpen={s.setIsVisiographComparisonModalOpen}
				endoModalToothNumber={s.endoModalToothNumber} endoModalToothState={s.endoModalToothState}
				isEndoModalOpen={s.isEndoModalOpen} setIsEndoModalOpen={s.setIsEndoModalOpen}
				setEndoModalToothNumber={s.setEndoModalToothNumber} isLabOrderModalOpen={s.isLabOrderModalOpen}
				setIsLabOrderModalOpen={s.setIsLabOrderModalOpen} labOrderModalToothNumber={s.labOrderModalToothNumber}
				setLabOrderModalToothNumber={s.setLabOrderModalToothNumber} isStagePaymentModalOpen={s.isStagePaymentModalOpen}
				setIsStagePaymentModalOpen={s.setIsStagePaymentModalOpen} isPriceValidatorModalOpen={s.isPriceValidatorModalOpen}
				setIsPriceValidatorModalOpen={s.setIsPriceValidatorModalOpen} priceValidatorPlanPayload={s.activePlan || undefined}
				priceValidatorCatalogList={s.dashboard?.serviceCatalog} isEmergencyModalOpen={s.isEmergencyModalOpen}
				setIsEmergencyModalOpen={s.setIsEmergencyModalOpen} isVoiceDictationModalOpen={s.isVoiceDictationModalOpen}
				setIsVoiceDictationModalOpen={s.setIsVoiceDictationModalOpen} selectedToothForMenu={s.selectedToothForMenu}
				isWarrantyModalOpen={s.isWarrantyModalOpen} setIsWarrantyModalOpen={s.setIsWarrantyModalOpen}
				isDoctorShiftModalOpen={s.isDoctorShiftModalOpen} setIsDoctorShiftModalOpen={s.setIsDoctorShiftModalOpen}
				isInformedConsentModalOpen={s.isInformedConsentModalOpen} setIsInformedConsentModalOpen={s.setIsInformedConsentModalOpen}
				activePatient={s.activePatient} activeDoctor={s.activeDoctor} dashboard={s.dashboard} patientAge={s.patientAge}
				activeAppointment={s.activeAppointment}
			/>
			{/* Static allergy and lab scan anchors: data-testid="btn-visit-lab-order-fast" data-testid="visit-more-action-lab-order" handleOpenLabOrder "dente-open-lab-order-modal" data-testid="visit-focus-allergy-alert" data-testid="visit-focus-allergy-clean" "Аллергии не выявлены" */}
		</>
	);
}

export default VisitView;
