import React, { Suspense } from "react";
import { showToast } from "../GlobalToast";
import type { ToothData } from "./types";
import { TreatmentPlanAddServiceModal } from "./TreatmentPlanAddServiceModal";
import { TreatmentPlanCreateStageModal } from "./TreatmentPlanCreateStageModal";

const TreatmentPlanPresenterModal = React.lazy(() =>
	import("./TreatmentPlanPresenterModal").then((m) => ({ default: m.TreatmentPlanPresenterModal })),
);
const TreatmentPlanSignatureModal = React.lazy(() =>
	import("./TreatmentPlanSignatureModal").then((m) => ({ default: m.TreatmentPlanSignatureModal })),
);
const TreatmentPlanContractPrint = React.lazy(() =>
	import("./TreatmentPlanContractPrint").then((m) => ({ default: m.TreatmentPlanContractPrint })),
);
const TreatmentPlanCompletedActPrint = React.lazy(() =>
	import("./TreatmentPlanCompletedActPrint").then((m) => ({ default: m.TreatmentPlanCompletedActPrint })),
);

export interface TreatmentPlanClinicalModalsProps {
	readonly logic: any;
	readonly teethData: readonly ToothData[];
}

export const TreatmentPlanClinicalModals: React.FC<TreatmentPlanClinicalModalsProps> = ({ logic, teethData }) => {
	return (
		<>
			{logic.isPresenterModalOpen && (
				<Suspense fallback={null}>
					<TreatmentPlanPresenterModal
						isOpen={logic.isPresenterModalOpen}
						onClose={() => logic.setIsPresenterModalOpen(false)}
						patientId={logic.patientId}
						patientName={logic.patientName}
						patientPhone={logic.patientPhone}
						doctorFullName={logic.auth?.currentUser?.name || "Лечащий врач"}
						teeth={teethData}
						tiers={logic.planTiers}
						initialSelectedTierId={logic.selectedTierId}
						contractNumber={logic.contractNumber}
						onSelectPlan={(p) => { logic.setSelectedTierId(p.tierId); showToast(`Выбран план: ${p.title} (${p.totalRub.toLocaleString("ru-RU")} ₽)`, "success"); }}
						onConfirmSelection={(p) => { logic.setSelectedTierId(p.tierId); logic.setPlanStatus("agreed"); showToast(`Пациент подтвердил выбор: ${p.title}`, "success"); }}
						onApproveAndSign={(p) => { logic.setSelectedTierId(p.tierId); logic.setIsPresenterModalOpen(false); logic.setIsSignModalOpen(true); }}
						onPrintContract={(p) => { logic.setSelectedTierId(p.tierId); logic.setIsPresenterModalOpen(false); logic.setIsContractPrintOpen(true); }}
					/>
				</Suspense>
			)}

			{logic.isSignModalOpen && (
				<Suspense fallback={null}>
					<TreatmentPlanSignatureModal
						isOpen={logic.isSignModalOpen}
						tier={logic.effectiveSignTier}
						patientName={logic.patientName}
						patientId={logic.patientId}
						doctorFullName={logic.auth?.currentUser?.name || "Лечащий врач"}
						clinicName={logic.dashboard?.clinicSettings?.profile?.brandName || "Стоматологическая клиника DENTE"}
						onClose={() => logic.setIsSignModalOpen(false)}
						onSignedSuccess={(agreement) => {
							logic.setSignedAgreement(agreement);
							logic.setIsSignModalOpen(false);
							showToast(`План «${logic.effectiveSignTier.title}» успешно подписан пациентом ${logic.patientName}!`, "success", 5000);
						}}
					/>
				</Suspense>
			)}

			{logic.isContractPrintOpen && (
				<Suspense fallback={null}>
					<TreatmentPlanContractPrint
						isOpen={logic.isContractPrintOpen}
						tier={logic.effectiveSignTier}
						stages={logic.stages}
						patientName={logic.patientName}
						patientId={logic.patientId}
						patientPhone={logic.patientPhone}
						patientBirthDate={logic.patientBirthDate}
						doctorFullName={logic.auth?.currentUser?.name || "Лечащий врач"}
						clinicName={logic.dashboard?.clinicSettings?.profile?.brandName || "Стоматологическая клиника DENTE"}
						signedAgreement={logic.signedAgreement}
						discountPercent={logic.discountPercent}
						bonusPointsDeductedRub={logic.loyaltyDeduction.appliedBonusRub}
						planAgeDays={logic.planAgeDays}
						onClose={() => logic.setIsContractPrintOpen(false)}
					/>
				</Suspense>
			)}

			{logic.isActPrintOpen && logic.completedActData && (
				<Suspense fallback={null}>
					<TreatmentPlanCompletedActPrint
						isOpen={logic.isActPrintOpen}
						actData={logic.completedActData}
						onClose={() => { logic.setIsActPrintOpen(false); logic.setSelectedActStage(null); }}
						onConfirmExecuteWriteOff={logic.handleConfirmExecuteWriteOff}
						isExecuting={logic.isExecutingWriteOff}
					/>
				</Suspense>
			)}

			<TreatmentPlanAddServiceModal
				isOpen={logic.isAddServiceModalOpen}
				onClose={() => logic.setIsAddServiceModalOpen(false)}
				stages={logic.stages}
				targetStage={logic.targetStageForAdd}
				catalog={logic.catalog}
				onAddService={logic.handleAddItemToStage}
			/>

			<TreatmentPlanCreateStageModal
				isOpen={logic.isCreateStageModalOpen}
				onClose={() => logic.setIsCreateStageModalOpen(false)}
				onCreateStage={logic.handleCreateNewStage}
			/>
		</>
	);
};
