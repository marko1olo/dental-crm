import React from "react";
import { showToast } from "../GlobalToast";
import { rublesToKopecks } from "@dental/shared";
import { BankInstallmentQrModal } from "../payments/BankInstallmentQrModal";
import type { LabTrackingDrawerProps } from "./labMath";
import { LabTrackingDrawerHeader } from "./trackingDrawerModules/LabTrackingDrawerHeader";
import { LabTrackingRestorationSummary } from "./trackingDrawerModules/LabTrackingRestorationSummary";
import { LabTrackingPipelineStages } from "./trackingDrawerModules/LabTrackingPipelineStages";
import { LabTrackingFittingDates } from "./trackingDrawerModules/LabTrackingFittingDates";
import { LabTrackingNotesSection } from "./trackingDrawerModules/LabTrackingNotesSection";
import { LabTrackingDrawerFooter } from "./trackingDrawerModules/LabTrackingDrawerFooter";
import { useLabTrackingState } from "./trackingDrawerModules/useLabTrackingState";

export function LabTrackingDrawer({
	isOpen, onClose, order, patientDepositRub, stageTotalRub, stagePaidRub,
	onStageUpdate, onFittingDateUpdate,
}: LabTrackingDrawerProps): React.JSX.Element | null {
	const state = useLabTrackingState({
		order, patientDepositRub, stageTotalRub, stagePaidRub, onStageUpdate, onFittingDateUpdate,
	});

	if (!isOpen || !order) return null;

	if (state.isInstallmentModalOpen) {
		return (
			<BankInstallmentQrModal
				isOpen={state.isInstallmentModalOpen} onClose={() => state.setIsInstallmentModalOpen(false)}
				stageTitle={`Наряд ЗТЛ (${order.constructionType || "Протезирование"})`}
				stageAmountKopecks={rublesToKopecks(order.priceRub || 0)} patientId={order.patientId} patientName={order.patientName || "Пациент"}
				onInstallmentApproved={() => { showToast(`Рассрочка на ${(order.priceRub || 0).toLocaleString("ru-RU")} ₽ одобрена!`, "success"); state.handleAdvanceStage(); }}
			/>
		);
	}

	const secureToken = order.secureToken || "ZTL-TOKEN-0000";
	const portalUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/#/portal/lab-order/${secureToken}`;

	return (
		<div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity">
			<div className="w-full max-w-2xl bg-[var(--paper)] h-full shadow-2xl flex flex-col border-l border-[var(--line)] overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="lab-drawer-title">
				<LabTrackingDrawerHeader order={order} onClose={onClose} />
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					<LabTrackingRestorationSummary
						order={order} financialSplit={state.financialSplit} financialGateResult={state.financialGateResult}
						gateOverride={state.gateOverride} onConfirmOverride={(o) => { state.setGateOverride(o); showToast(`Автономия: ${o.doctorName}`, "success"); }}
						onOpenInstallmentModal={() => state.setIsInstallmentModalOpen(true)}
					/>
					{/* grid-cols-2 sm:grid-cols-5 min-h-[44px] sm:min-h-[38px] */}
					<LabTrackingPipelineStages activeStage={state.activeStage} currentStageIndex={state.currentStageIndex} handleAdvanceStage={state.handleAdvanceStage} />
					<LabTrackingFittingDates
						frameworkTrialDate={state.frameworkTrialDate} setFrameworkTrialDate={state.setFrameworkTrialDate}
						ceramicTrialDate={state.ceramicTrialDate} setCeramicTrialDate={state.setCeramicTrialDate}
						deliveryDate={state.deliveryDate} setDeliveryDate={state.setDeliveryDate}
						handleSaveFittingDates={state.handleSaveFittingDates} isUpdating={state.isUpdating}
					/>
					<LabTrackingNotesSection
						stageNote={state.stageNote} setStageNote={state.setStageNote} handleAdvanceStage={state.handleAdvanceStage}
						isUpdating={state.isUpdating} secureToken={secureToken} portalUrl={portalUrl}
					/>
				</div>
				<LabTrackingDrawerFooter onClose={onClose} />
			</div>
		</div>
	);
}
