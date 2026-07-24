import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { EgiszMonitor } from "../EgiszMonitor";
import { OdontogramModule } from "../odontogram/OdontogramModule";
import { VisitDiaryEditor } from "../VisitDiaryEditor";

export function VisitOdontogramTab(props?: { activePatient?: any; activeAppointment?: any; dashboard?: any }) {
	let ctx: any = null;
	try { ctx = useAppLogicContext(); } catch (e) {}
	const activePatient = props?.activePatient ?? ctx?.activePatient;
	const activeAppointment = props?.activeAppointment ?? ctx?.activeAppointment;
	const dashboard = props?.dashboard ?? ctx?.dashboard;
	const workspaceFlags = useWorkspaceProfile();

	if (!activePatient?.id) {
		return (
			<div style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
				<div style={{ fontSize: "36px", marginBottom: "12px" }}>🦷</div>
				<h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ink)" }}>Пациент не выбран</h4>
				<p style={{ fontSize: "0.875rem", margin: 0 }}>Выберите пациента, чтобы открыть одонтограмму.</p>
			</div>
		);
	}

	return (
		<div
			data-testid="visit-odontogram-tab"
			className="visit-odontogram-tab bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl p-4"
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
