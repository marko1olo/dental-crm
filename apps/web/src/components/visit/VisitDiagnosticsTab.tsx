import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { VisiographAnalyzer } from "../imaging/VisiographAnalyzer";
import { LabOrdersPanel } from "../schedule/LabOrdersPanel";

export function VisitDiagnosticsTab() {
	const { activePatient } = useAppLogicContext();
	const workspaceFlags = useWorkspaceProfile();

	return (
		<div
			className="visit-diagnostics-tab"
			style={{ display: "flex", flexDirection: "column", gap: "24px" }}
		>
			<VisiographAnalyzer />
			{activePatient?.id && workspaceFlags.hasDentalLab && (
				<LabOrdersPanel patientId={activePatient.id} />
			)}
		</div>
	);
}
