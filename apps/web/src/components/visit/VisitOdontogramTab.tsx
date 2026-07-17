import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { EgiszMonitor } from "../EgiszMonitor";
import { OdontogramModule } from "../odontogram/OdontogramModule";
import { VisitDiaryEditor } from "../VisitDiaryEditor";

export function VisitOdontogramTab() {
	const { activePatient, activeAppointment, dashboard } = useAppLogicContext();
	const workspaceFlags = useWorkspaceProfile();

	if (!activePatient?.id || !activeAppointment?.id) return null;

	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				gap: "24px",
				margin: "24px 0",
				width: "100%",
				maxWidth: "100%",
			}}
		>
			<div
				style={{
					flex: "1 1 45%",
					minWidth: "300px",
				}}
			>
				<OdontogramModule
					patientId={activePatient.id}
					pediatricMode={workspaceFlags.hasPediatricMode || (dashboard?.clinicSettings?.profile?.hasPediatricMode ?? false)}
				/>
			</div>
			<div
				style={{
					flex: "1 1 50%",
					minWidth: "300px",
				}}
			>
				<VisitDiaryEditor
					visitId={activeAppointment.id}
					patientId={activePatient.id}
				/>
				{workspaceFlags.hasEngineeringStatus && (
					<div style={{ marginTop: "16px" }}>
						<EgiszMonitor
							visitId={activeAppointment.id}
							patientId={activePatient.id}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
