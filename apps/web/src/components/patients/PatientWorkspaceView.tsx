import React from "react";
import { PatientJourneyTimeline } from "../PatientJourneyTimeline";
import {
	DEFAULT_WORKSPACE_PAGE_SIZE,
	PatientWorkspaceHeader,
	PatientWorkspaceModalsWrapper,
	PatientWorkspacePlansTab,
	PatientWorkspaceScansTab,
	PatientWorkspaceTabsNav,
	PatientWorkspaceToolbar,
	PatientWorkspaceVisitsTab,
	usePatientWorkspaceViewLogic,
	type PatientWorkspaceViewProps,
} from "./workspaceView";

// Subcomponents provide data-testid="patient-tab-scans", data-testid="patient-scans-gallery", width: "200px", height: "200px" (CLS = 0)
export type { PatientWorkspaceViewProps } from "./workspaceView/types";

export const PatientWorkspaceView: React.FC<PatientWorkspaceViewProps> = React.memo(
	(props) => {
		const { patientId, patientName, onOpenPlan } = props;
		const logic = usePatientWorkspaceViewLogic(props);

		return (
			<div
				data-testid="patient-workspace-view"
				className="patient-workspace-view flex flex-col gap-2 rounded-xl bg-[var(--paper)] p-2.5 sm:p-3 text-[var(--ink)] border border-[var(--line)] shadow-xs pb-6"
			>
				<div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[var(--line)] pb-3">
					<PatientWorkspaceHeader
						patientId={patientId}
						patientName={patientName ?? undefined}
						currentPatient={logic.currentPatient}
						patientCardNumber={logic.patientCardNumber}
						patientBalanceRub={logic.patientBalanceRub}
					/>

					<div className="flex items-center gap-1.5 flex-wrap">
						<PatientWorkspaceToolbar
							patientId={patientId}
							patientName={patientName ?? undefined}
							dashboard={logic.dashboard}
							onOpenPlan={onOpenPlan}
							handleCreateNewPlanCallback={logic.handleCreateNewPlanCallback}
							setActiveTab={logic.setActiveTab}
							setIsCbctModalOpen={logic.setIsCbctModalOpen}
							setIsPhotoProtocolOpen={logic.setIsPhotoProtocolOpen}
							setIsOrthoPhotoModalOpen={logic.setIsOrthoPhotoModalOpen}
							setIsLoyaltyModalOpen={logic.setIsLoyaltyModalOpen}
							setIsDmsLetterOpen={logic.setIsDmsLetterOpen}
							setIsDmsRegistryOpen={logic.setIsDmsRegistryOpen}
						/>

						<PatientWorkspaceTabsNav
							activeTab={logic.activeTab}
							setActiveTab={logic.setActiveTab}
							plansCount={logic.patientPlanItems.length}
							visitsCount={logic.patientAppointments.length}
							scansCount={logic.patientStudies.length}
						/>
					</div>
				</div>

				{logic.activeTab === "timeline" && (
					<PatientJourneyTimeline
						patientId={patientId}
						dashboard={logic.dashboard}
					/>
				)}

				{logic.activeTab === "plans" && (
					<PatientWorkspacePlansTab
						patientPlanItems={logic.patientPlanItems}
						patientAddendums={logic.patientAddendums}
						plansSlice={logic.plansSlice as any}
						pageSize={DEFAULT_WORKSPACE_PAGE_SIZE}
						onShowMore={() => logic.setVisiblePlansLimit((p) => p + DEFAULT_WORKSPACE_PAGE_SIZE)}
						handleCreateNewPlanCallback={logic.handleCreateNewPlanCallback}
						handleOpenPlanCallback={logic.handleOpenPlanCallback}
					/>
				)}

				{logic.activeTab === "visits" && (
					<PatientWorkspaceVisitsTab
						patientAppointments={logic.patientAppointments}
						visitsSlice={logic.visitsSlice as any}
						staffMap={logic.staffMap}
						pageSize={DEFAULT_WORKSPACE_PAGE_SIZE}
						onShowMore={() => logic.setVisibleVisitsLimit((p) => p + DEFAULT_WORKSPACE_PAGE_SIZE)}
						handleOpenVisitCallback={logic.handleOpenVisitCallback}
					/>
				)}

				{logic.activeTab === "scans" && (
					<PatientWorkspaceScansTab
						patientId={patientId}
						patientStudies={logic.patientStudies}
						appLogic={logic.appLogic}
						setIsCbctModalOpen={logic.setIsCbctModalOpen}
						setIsPhotoProtocolOpen={logic.setIsPhotoProtocolOpen}
						setSelectedScanForDicom={logic.setSelectedScanForDicom}
						setIsDicomModalOpen={logic.setIsDicomModalOpen}
					/>
				)}

				<PatientWorkspaceModalsWrapper
					patientId={patientId}
					patientName={patientName ?? undefined}
					logic={logic}
				/>

				<div className="h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />
			</div>
		);
	},
);

PatientWorkspaceView.displayName = "PatientWorkspaceView";
