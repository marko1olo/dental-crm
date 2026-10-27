import { useCallback, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import type { PatientWorkspaceViewProps, WorkspaceTabKey } from "./types";
import { usePatientWorkspaceData } from "./usePatientWorkspaceData";
import { usePatientWorkspaceModalsState } from "./usePatientWorkspaceModalsState";

export { DEFAULT_WORKSPACE_PAGE_SIZE } from "./usePatientWorkspaceData";

export function usePatientWorkspaceViewLogic(props: PatientWorkspaceViewProps) {
	const { patientId, dashboard: propDashboard, initialTab = "timeline", onOpenVisit, onOpenPlan } = props;
	const appLogic = useAppLogicContext();
	const dashboard = propDashboard ?? appLogic?.dashboard;
	const [activeTab, setActiveTab] = useState<WorkspaceTabKey>(initialTab ?? "timeline");

	const data = usePatientWorkspaceData(props, dashboard);
	const modals = usePatientWorkspaceModalsState();

	const handleOpenVisitCallback = useCallback((visitId: string) => {
		if (onOpenVisit) {
			onOpenVisit(visitId);
		} else {
			window.location.hash = `/patients/${patientId}/visit/${visitId}`;
		}
	}, [onOpenVisit, patientId]);

	const handleOpenPlanCallback = useCallback((planId: string) => {
		if (onOpenPlan) {
			onOpenPlan(planId);
		} else {
			modals.setSelectedPlanIdForModal(planId);
			modals.setIsPlanModalOpen(true);
		}
	}, [onOpenPlan, modals]);

	const handleCreateNewPlanCallback = useCallback(() => {
		modals.setSelectedPlanIdForModal(null);
		modals.setIsPlanModalOpen(true);
	}, [modals]);

	return {
		appLogic,
		dashboard,
		activeTab,
		setActiveTab,
		...data,
		...modals,
		handleOpenVisitCallback,
		handleOpenPlanCallback,
		handleCreateNewPlanCallback,
	};
}
