import React from "react";
import { PatientJourneyTimeline } from "../../PatientJourneyTimeline";
import { PatientFinanceTab } from "../tabs/PatientFinanceTab";
import {
	DEFAULT_WORKSPACE_PAGE_SIZE,
	PatientWorkspacePlansTab,
	PatientWorkspaceScansTab,
	PatientWorkspaceVisitsTab,
} from "./index";

export interface PatientWorkspaceTabContentProps {
	readonly patientId: string;
	readonly logic: any;
}

export const PatientWorkspaceTabContent: React.FC<PatientWorkspaceTabContentProps> = ({ patientId, logic }) => {
	const { activeTab } = logic;

	if (activeTab === "timeline") {
		return (
			<div className="flex flex-col gap-3">
				<PatientJourneyTimeline patientId={patientId} dashboard={logic.dashboard} />
			</div>
		);
	}

	if (activeTab === "plans") {
		return (
			<PatientWorkspacePlansTab
				patientPlanItems={logic.patientPlanItems}
				patientAddendums={logic.patientAddendums}
				plansSlice={logic.plansSlice as any}
				pageSize={DEFAULT_WORKSPACE_PAGE_SIZE}
				onShowMore={() => logic.setVisiblePlansLimit((p: number) => p + DEFAULT_WORKSPACE_PAGE_SIZE)}
				handleCreateNewPlanCallback={logic.handleCreateNewPlanCallback}
				handleOpenPlanCallback={logic.handleOpenPlanCallback}
			/>
		);
	}

	if (activeTab === "visits") {
		return (
			<PatientWorkspaceVisitsTab
				patientAppointments={logic.patientAppointments}
				visitsSlice={logic.visitsSlice as any}
				staffMap={logic.staffMap}
				pageSize={DEFAULT_WORKSPACE_PAGE_SIZE}
				onShowMore={() => logic.setVisibleVisitsLimit((p: number) => p + DEFAULT_WORKSPACE_PAGE_SIZE)}
				handleOpenVisitCallback={logic.handleOpenVisitCallback}
			/>
		);
	}

	if (activeTab === "finance") {
		return (
			<div className="p-1 sm:p-2" data-testid="patient-workspace-finance-tab">
				<PatientFinanceTab
					patient={logic.currentPatient as any}
					onUpdateBalance={() => {
						if (typeof window !== "undefined") {
							window.dispatchEvent(new CustomEvent("dente-patient-balance-changed"));
						}
					}}
					onNewAppointment={logic.handleCreateNewPlanCallback}
				/>
			</div>
		);
	}

	if (activeTab === "scans") {
		return (
			<PatientWorkspaceScansTab
				patientId={patientId}
				patientStudies={logic.patientStudies}
				appLogic={logic.appLogic}
				setIsCbctModalOpen={logic.setIsCbctModalOpen}
				setIsPhotoProtocolOpen={logic.setIsPhotoProtocolOpen}
				setSelectedScanForDicom={logic.setSelectedScanForDicom}
				setIsDicomModalOpen={logic.setIsDicomModalOpen}
				onOpenDirectRvg={() => logic.setIsDirectRvgOpen(true)}
				onOpenConsultationSplit={() => logic.setIsConsultationSplitOpen(true)}
			/>
		);
	}

	return null;
};
