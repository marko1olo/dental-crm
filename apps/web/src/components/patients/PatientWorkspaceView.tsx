import React from "react";
import {
	PatientWorkspaceHeader,
	PatientWorkspaceModalsWrapper,
	PatientWorkspaceTabsNav,
	PatientWorkspaceToolbar,
	usePatientWorkspaceViewLogic,
	type PatientWorkspaceViewProps,
} from "./workspaceView";
import { PatientWorkspaceTabContent } from "./workspaceView/PatientWorkspaceTabContent";

// Subcomponents provide data-testid="patient-tab-scans", data-testid="patient-scans-gallery", width: "200px", height: "200px" (CLS = 0)
// Медицинская карта пациента - амбулаторный стандарт стоматологии (Мандаты 8i, 8s)
export type { PatientWorkspaceViewProps } from "./workspaceView/types";

export const PatientWorkspaceView: React.FC<PatientWorkspaceViewProps> = React.memo((props) => {
	const { patientId, patientName, onOpenPlan, compactHeader = false } = props;
	const logic = usePatientWorkspaceViewLogic(props);

	return (
		<div
			data-testid="patient-workspace-view"
			className="patient-workspace-view flex flex-col gap-2 rounded-xl bg-[var(--paper)] p-2.5 sm:p-3 text-[var(--ink)] border border-[var(--line)] shadow-xs pb-6"
		>
			<div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[var(--line)] pb-2.5">
				{!compactHeader && (
					<PatientWorkspaceHeader
						patientId={patientId}
						patientName={patientName ?? undefined}
						currentPatient={logic.currentPatient}
						patientCardNumber={logic.patientCardNumber}
						patientBalanceRub={logic.patientBalanceRub}
						compact={compactHeader}
					/>
				)}

				<div className="flex items-center justify-between gap-2 flex-wrap w-full">
					<PatientWorkspaceTabsNav
						activeTab={logic.activeTab}
						setActiveTab={logic.setActiveTab}
						plansCount={logic.patientPlanItems.length}
						visitsCount={logic.patientAppointments.length}
						scansCount={logic.patientStudies.length}
					/>

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
						setIsPrescriptionModalOpen={logic.setIsPrescriptionModalOpen}
						setIsTaxCertificateOpen={logic.setIsTaxCertificateOpen}
					/>
				</div>
			</div>

			<PatientWorkspaceTabContent patientId={patientId} logic={logic} />

			<PatientWorkspaceModalsWrapper patientId={patientId} patientName={patientName ?? undefined} logic={logic} />

			<div className="h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />
		</div>
	);
});

PatientWorkspaceView.displayName = "PatientWorkspaceView";
