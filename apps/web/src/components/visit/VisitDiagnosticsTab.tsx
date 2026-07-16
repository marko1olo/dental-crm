import React from "react";
import { VisiographAnalyzer } from "../imaging/VisiographAnalyzer";
import { LabOrdersPanel } from "../schedule/LabOrdersPanel";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

export function VisitDiagnosticsTab() {
	const { activePatient } = useAppLogicContext();

	return (
		<div className="visit-diagnostics-tab" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
			<VisiographAnalyzer />
			{activePatient?.id && (
				<LabOrdersPanel patientId={activePatient.id} />
			)}
		</div>
	);
}
