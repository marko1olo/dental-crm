import React from "react";
import { TreatmentPlanPresenterComparisonTab } from "../TreatmentPlanPresenterComparisonTab";
import { TreatmentPlanPresenterStagesTab } from "../TreatmentPlanPresenterStagesTab";
import { TreatmentPlanRoadmap } from "../TreatmentPlanRoadmap";
import { TreatmentPlanPresenterFinanceTab } from "../TreatmentPlanPresenterFinanceTab";
import { TreatmentPlanPresenterPrintTab } from "./TreatmentPlanPresenterPrintTab";
import {
	getTierLetter,
	formatRubles,
	type useTreatmentPlanPresenterState,
} from "./useTreatmentPlanPresenterState";
import type { TreatmentPlanPresenterModalProps } from "./treatmentPlanPresenterTypes";

export interface TreatmentPlanPresenterBodyProps {
	readonly s: ReturnType<typeof useTreatmentPlanPresenterState>;
	readonly props: TreatmentPlanPresenterModalProps;
}

export const TreatmentPlanPresenterBody: React.FC<TreatmentPlanPresenterBodyProps> = ({
	s,
	props,
}) => {
	const {
		patientName = "",
		patientId = "",
		patientPhone = "",
		doctorFullName = "",
		clinicName = "DENTE Стоматология",
		teeth,
		onApproveAndSign,
		onSendStageToVisit,
		onSendStageToInvoice,
		planId,
	} = props;

	return (
		<main className="treatment-presenter-body" data-testid="treatment-presenter-body">
			{s.activeTab === "comparison" && (
				<TreatmentPlanPresenterComparisonTab
					allTiers={s.allTiers}
					selectedTierId={s.selectedTierId}
					onSelectTier={s.handleSelectTier}
					getTierLetter={getTierLetter}
					formatRubles={formatRubles}
					expandedStages={s.expandedStages}
					onToggleStage={s.toggleStage}
					onToggleAllStages={s.toggleAllStages}
					showMicroConsumables={s.showMicroConsumables}
					onUpdateItemPrice={s.handleUpdateItemPrice}
					onConfirmPatientChoice={s.handleConfirmPatientChoice}
					isChoiceConfirmed={s.isChoiceConfirmed}
					confirmedTierId={s.confirmedTierId}
					onApproveAndSign={onApproveAndSign}
					teeth={teeth}
					planId={planId}
					patientId={patientId}
					patientName={patientName}
					patientPhone={patientPhone}
					doctorFullName={doctorFullName}
				/>
			)}

			{s.activeTab === "stages" && (
				<TreatmentPlanPresenterStagesTab
					selectedTier={s.selectedTier}
					selectedTierId={s.selectedTierId}
					allTiers={s.allTiers}
					onSelectTier={s.handleSelectTier}
					showMicroConsumables={s.showMicroConsumables}
					onUpdateItemPrice={s.handleUpdateItemPrice}
					onSendStageToVisit={onSendStageToVisit}
					onSendStageToInvoice={onSendStageToInvoice}
					patientId={patientId}
					patientName={patientName}
				/>
			)}

			{s.activeTab === "roadmap" && (
				<TreatmentPlanRoadmap
					tier={s.selectedTier}
					patientName={patientName}
					patientId={patientId}
					planId={planId}
					doctorName={doctorFullName}
					clinicName={clinicName}
					displayContractNumber={s.displayContractNumber}
					todayRu={s.todayRu}
					getTierLetter={getTierLetter}
					onPrint={s.handlePrintAppendix}
					onConfirmPatientChoice={() => s.handleConfirmPatientChoice(s.selectedTier)}
				/>
			)}

			{s.activeTab === "finance" && (
				<TreatmentPlanPresenterFinanceTab
					selectedTier={s.selectedTier}
					installmentMonths={s.installmentMonths}
					setInstallmentMonths={s.setInstallmentMonths}
				/>
			)}

			{s.activeTab === "print_appendix" && (
				<TreatmentPlanPresenterPrintTab s={s} props={props} />
			)}
		</main>
	);
};
