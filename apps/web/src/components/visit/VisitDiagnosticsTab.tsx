import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { VisiographAnalyzer } from "../imaging/VisiographAnalyzer";
import { LabOrdersPanel } from "../schedule/LabOrdersPanel";

export function VisitDiagnosticsTab(props?: { activePatient?: any }) {
	let ctx: any = null;
	try { ctx = useAppLogicContext(); } catch { /* rendered outside AppLogic provider: fall back to props */ }
	const activePatient = props?.activePatient ?? ctx?.activePatient;
	const workspaceFlags = useWorkspaceProfile();

	return (
		<div
			data-testid="visit-diagnostics-tab"
			className="visit-diagnostics-tab bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-4 flex flex-col gap-6"
		>
			<VisiographAnalyzer />
			{activePatient?.id && workspaceFlags.hasDentalLab && (
				<LabOrdersPanel patientId={activePatient.id} />
			)}
		</div>
	);
}
