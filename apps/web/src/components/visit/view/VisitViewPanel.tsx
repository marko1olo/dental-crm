import React from "react";
import { VisitViewHeader } from "./VisitViewHeader";
import { VisitTabNav } from "./VisitTabNav";
import { VisitTabContent } from "./VisitTabContent";
import { VisitActionFooter } from "./VisitActionFooter";
import type { useVisitViewState } from "./useVisitViewState";

export interface VisitViewPanelProps {
	readonly s: ReturnType<typeof useVisitViewState>;
}

export function VisitViewPanel({ s }: VisitViewPanelProps) {
	return (
		<div className="panel visit-panel pb-28 sm:pb-8" id="visit" data-testid="visit-view">
			<header
				className="visit-monolithic-header rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xs mb-1 sm:mb-1.5 overflow-visible shrink-0 sticky top-0 z-30 backdrop-blur-md"
				data-testid="visit-header-monolith"
				aria-label="Шапка текущего приёма"
			>
				<VisitViewHeader
					activePatient={s.activePatient}
					patientAge={s.patientAge}
					activeAppointment={s.activeAppointment}
					activeDoctor={s.activeDoctor}
					activePatientCriticalBadges={s.activePatientCriticalBadges}
					consolidatedAllergyChip={s.consolidatedAllergyChip}
					activePeers={s.activePeers}
					summaryText={s.summaryText}
					visitNoteForm={s.visitNoteForm}
					updateVisitNoteField={s.updateVisitNoteField}
					handleApplySomaticNormQuick={s.handleApplySomaticNormQuick}
					handlePrintForm043uFast={s.handlePrintForm043uFast}
					handlePrintCompletedActFast={s.handlePrintCompletedActFast}
					handlePrintEstimateFast={s.handlePrintEstimateFast}
					handlePrintInformedConsentFast={s.handlePrintInformedConsentFast}
					handleOpenLabOrder={s.handleOpenLabOrder}
					setIsEmergencyModalOpen={s.setIsEmergencyModalOpen}
					handleFinishVisitAction={s.handleFinishVisitAction}
					setIsQueueCockpitForced={s.setIsQueueCockpitForced}
					setSelectedPatientId={s.setSelectedPatientId}
					appLogic={s.appLogic}
					isHeaderMoreMenuOpen={s.isHeaderMoreMenuOpen}
					setIsHeaderMoreMenuOpen={s.setIsHeaderMoreMenuOpen}
					headerMoreMenuRef={s.headerMoreMenuRef}
					setIsDoctorShiftModalOpen={s.setIsDoctorShiftModalOpen}
					setIsPriceValidatorModalOpen={s.setIsPriceValidatorModalOpen}
					setIsStagePaymentModalOpen={s.setIsStagePaymentModalOpen}
					setIsWarrantyModalOpen={s.setIsWarrantyModalOpen}
					onOpenVisiographComparison={() => s.setIsVisiographComparisonModalOpen(true)}
					setIsVisiographComparisonModalOpen={s.setIsVisiographComparisonModalOpen}
				/>
				<VisitTabNav activeTab={s.visitSubViewTab} onTabChange={s.handleTabChange} />
			</header>

			<VisitTabContent
				visitSubViewTab={s.visitSubViewTab}
				activeAppointment={s.activeAppointment}
				activePatient={s.activePatient}
				activeDoctor={s.activeDoctor}
				visitNoteForm={s.visitNoteForm}
				updateVisitNoteField={s.updateVisitNoteField}
				loadedTreatmentPlan={(s.loadedTreatmentPlan || s.activePlan) as any}
				dashboard={s.dashboard}
				selectedToothForMenu={s.selectedToothForMenu}
				handlePrintEstimateFast={s.handlePrintEstimateFast}
				handlePrintForm043uFast={s.handlePrintForm043uFast}
				handlePrintInformedConsentFast={s.handlePrintInformedConsentFast}
				setIsInformedConsentModalOpen={s.setIsInformedConsentModalOpen}
				setIsWarrantyModalOpen={s.setIsWarrantyModalOpen}
			/>

			<VisitActionFooter
				loadedTreatmentPlan={s.loadedTreatmentPlan || s.activePlan}
				activeAppointment={s.activeAppointment}
				activePatient={s.activePatient}
				visitSubViewTab={s.visitSubViewTab}
				safeVisitPrimaryAction={s.safeVisitPrimaryAction}
				isTreatmentPlanExpiredSoft={s.isTreatmentPlanExpiredSoft}
				treatmentPlanAgeDays={s.treatmentPlanAgeDays}
				props={s.props}
				transcript={s.transcript}
				setTranscript={s.setTranscript}
				isTranscriptPolishing={s.isTranscriptPolishing}
				polishTranscript={s.polishTranscript}
				updateVisitNoteField={s.updateVisitNoteField}
				visitNoteForm={s.visitNoteForm}
				handlePrintForm043uFast={s.handlePrintForm043uFast}
				setIsPriceValidatorModalOpen={s.setIsPriceValidatorModalOpen}
				setIsStagePaymentModalOpen={s.setIsStagePaymentModalOpen}
			/>
		</div>
	);
}
