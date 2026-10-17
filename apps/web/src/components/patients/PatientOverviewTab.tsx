import { History, Stethoscope, ClipboardList } from "lucide-react";
import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientStore } from "../../store/patientStore";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { PatientWorkspaceView } from "./PatientWorkspaceView";
import { PatientFamilyCard } from "./PatientFamilyCard";
import { PatientNoShowRisk } from "./PatientNoShowRisk";
import { PatientWhatsappSendPanel } from "./PatientWhatsappSendPanel";
import { usePatientFamilyLoader } from "./overview/usePatientFamilyLoader";
import { PatientCommunicationTimelineWidget } from "./PatientCommunicationTimelineWidget";
import { PatientArchiveAndBlacklistWidget } from "./PatientArchiveAndBlacklistWidget";
import { PatientDuplicateMergeQueuesWidget } from "../crm/PatientDuplicateMergeQueuesWidget";

export interface PatientOverviewTabProps {
	readonly showHeaderCard?: boolean;
}

export function PatientOverviewTab(_props: PatientOverviewTabProps = {}) {
	const appLogic = useAppLogicContext();
	const { selectedPatientId } = usePatientStore();
	const workspaceFlags = useWorkspaceProfile();
	const { selectedPatient, dashboard } = appLogic;
	const { familyData, familyLoadFailure, loadFamily } = usePatientFamilyLoader(selectedPatientId, appLogic);

	if (!selectedPatientId) return null;

	return (
		<div data-testid="patient-overview-tab" className="flex flex-col gap-3">
			<PatientWorkspaceView
				patientId={selectedPatientId}
				patientName={selectedPatient?.fullName || null}
				dashboard={dashboard}
				compactHeader={true}
			/>

			<div className="patient-clinical-grid grid grid-cols-1 lg:grid-cols-2 gap-3">
				<div className="flex flex-col gap-3">
					<PatientFamilyCard
						patientId={selectedPatientId}
						patientName={selectedPatient?.fullName || null}
						familyData={familyData}
						loadFailure={familyLoadFailure}
						onRetryLoad={loadFamily}
						onFamilyDataChanged={loadFamily}
					/>
					<PatientNoShowRisk patientId={selectedPatientId} />
				</div>

				<div className="flex flex-col gap-3">
					<PatientWhatsappSendPanel
						patientId={selectedPatientId}
						patientName={selectedPatient?.fullName || null}
						patientPhone={selectedPatient?.phone || null}
					/>

					<details className="patient-secondary-accordion rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3">
						<summary className="cursor-pointer font-bold text-xs flex items-center justify-between text-[var(--ink)]">
							<span className="flex items-center gap-2">
								<History size={15} className="text-[var(--teal)] shrink-0" aria-hidden="true" />
								<span>История коммуникаций и CRM</span>
							</span>
							<span className="text-[11px] text-[var(--muted)] font-normal">Развернуть ▾</span>
						</summary>
						<div className="pt-3 flex flex-col gap-2">
							<PatientCommunicationTimelineWidget patientId={selectedPatientId} />
							<PatientArchiveAndBlacklistWidget patientId={selectedPatientId} />
							<PatientDuplicateMergeQueuesWidget />
						</div>
					</details>
				</div>
			</div>

			<div className="h-12 w-full shrink-0 pointer-events-none" aria-hidden="true" />
		</div>
	);
}
