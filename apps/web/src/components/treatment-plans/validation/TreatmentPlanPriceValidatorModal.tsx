import React from "react";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import type { TreatmentPlanStage } from "../types.js";
import type {
	CatalogServiceItem,
	PlanPricePolicyPresetId,
	TreatmentPlanValidationPayload,
} from "./planPriceValidationPresets.js";
import type { WorkOrderValidatedExport } from "./planPriceValidationEngine.js";
import { PriceValidatorModalView } from "./modal/PriceValidatorModalView.js";
import { usePriceValidatorActions } from "./modal/usePriceValidatorActions.js";
import { usePriceValidatorData } from "./modal/usePriceValidatorData.js";
import { PriceValidatorLabOrderWrapper } from "./modal/PriceValidatorLabOrderWrapper.js";

if (typeof document !== "undefined") {
	void import("./planPriceValidation.css");
}

export type { PriceValidatorActiveTab } from "./modal/PriceValidatorTabBar.js";

export interface TreatmentPlanPriceValidatorModalProps {
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly planId?: string;
	readonly planPayload?: TreatmentPlanValidationPayload;
	readonly stages?: readonly TreatmentPlanStage[];
	readonly catalogPricelist?: readonly CatalogServiceItem[];
	readonly initialPresetId?: PlanPricePolicyPresetId;
	readonly onExportWorkOrder?: (data: WorkOrderValidatedExport) => void;
	readonly onExportCompletedAct?: (data: WorkOrderValidatedExport) => void;
}

export const TreatmentPlanPriceValidatorModal: React.FC<TreatmentPlanPriceValidatorModalProps> = ({
	isOpen = true,
	onClose,
	planId,
	planPayload: propPayload,
	stages,
	catalogPricelist: propCatalog,
	initialPresetId = "standard_30",
	onExportWorkOrder,
	onExportCompletedAct,
}) => {
	if (!isOpen) return null;

	const { planPayload, catalogPricelist, starValidation } = usePriceValidatorData(
		planId, propPayload, propCatalog, stages,
	);
	const actions = usePriceValidatorActions({
		planPayload, catalogPricelist, initialPresetId, onExportWorkOrder, onExportCompletedAct,
	});

	const filteredStarChecks = useMemo(() => {
		if (!starValidation?.checks) return [];
		if (actions.protocolSeverityFilter === "warnings_errors") {
			return starValidation.checks.filter((c: any) => c.status === "warning" || c.status === "error");
		}
		if (actions.protocolSeverityFilter === "passed") {
			return starValidation.checks.filter((c: any) => c.status === "pass");
		}
		return starValidation.checks;
	}, [starValidation?.checks, actions.protocolSeverityFilter]);

	const labTeeth = useMemo(() => {
		const items = Array.isArray(planPayload?.items) ? planPayload.items : [];
		const teeth = items.map((i: any) => i.toothNumber).filter((t: any): t is number => typeof t === "number" && t > 0);
		return teeth.length > 0 ? Array.from(new Set(teeth)) : [];
	}, [planPayload]);

	if (actions.isLabOrderModalOpen) {
		return (
			<PriceValidatorLabOrderWrapper
				isOpen={actions.isLabOrderModalOpen}
				onClose={() => actions.setIsLabOrderModalOpen(false)}
				planPayload={planPayload}
				labTeeth={labTeeth}
			/>
		);
	}

	const view = (
		<PriceValidatorModalView
			planPayload={planPayload}
			report={actions.report}
			starValidation={starValidation}
			filteredStarChecks={filteredStarChecks}
			activeTab={actions.activeTab}
			setActiveTab={actions.setActiveTab}
			selectedPresetId={actions.selectedPresetId}
			setSelectedPresetId={actions.setSelectedPresetId}
			activePreset={actions.activePreset}
			showAdminDrawer={actions.showAdminDrawer}
			setShowAdminDrawer={actions.setShowAdminDrawer}
			adminOverride={actions.adminOverride}
			adminReasonInput={actions.adminReasonInput}
			setAdminReasonInput={actions.setAdminReasonInput}
			adminPinInput={actions.adminPinInput}
			setAdminPinInput={actions.setAdminPinInput}
			statusNotice={actions.statusNotice}
			protocolSeverityFilter={actions.protocolSeverityFilter}
			setProtocolSeverityFilter={actions.setProtocolSeverityFilter}
			onClose={onClose}
			onItemResolutionChange={actions.handleItemResolutionChange}
			onBatchLockOriginal={actions.handleBatchLockOriginal}
			onBatchUpdateToCurrent={actions.handleBatchUpdateToCurrent}
			onRevokeAdminOverride={actions.handleRevokeAdminOverride}
			onAuthorizeDoctorAutonomy={actions.handleAuthorizeDoctorAutonomy}
			onGenerateWorkOrder={actions.handleGenerateWorkOrder}
			onGenerateCompletedAct={actions.handleGenerateCompletedAct}
		/>
	);

	return typeof document !== "undefined" ? createPortal(view, document.body) : view;
};

export default TreatmentPlanPriceValidatorModal;
