import React from "react";
import { DiagnosticsActionButtons } from "./DiagnosticsActionButtons";
import { DiagnosticsPatientAlerts } from "./DiagnosticsPatientAlerts";
import { DiagnosticsSegmentedModes } from "./DiagnosticsSegmentedModes";
import type { DiagnosticTabMode } from "./types";

export interface DiagnosticsTabToolbarProps {
	readonly diagnosticMode: DiagnosticTabMode;
	readonly setDiagnosticMode: (mode: DiagnosticTabMode) => void;
	readonly photoAttachmentsCount: number;
	readonly target: string;
	readonly visitPatientId: string | null;
	readonly visitPatientName: string | null;
	readonly selectedPatientName: string | null;
	readonly setSelectedPatientId: (id: string) => void;
	readonly onOpenReportStudio: () => void;
	readonly onOpenRadiologyReferral: () => void;
	readonly onOpenDirectRvg?: () => void;
	readonly onOpenHotFolder?: () => void;
	readonly onOpenDicomViewer?: () => void;
	readonly onOpenComparison?: () => void;
}

export function DiagnosticsTabToolbar(props: DiagnosticsTabToolbarProps) {
	return (
		<>
			<div className="flex items-center justify-between gap-2.5 flex-nowrap h-[34px] min-h-[34px] overflow-x-auto">
				<DiagnosticsSegmentedModes
					diagnosticMode={props.diagnosticMode}
					setDiagnosticMode={props.setDiagnosticMode}
					photoAttachmentsCount={props.photoAttachmentsCount}
				/>
				<DiagnosticsActionButtons
					diagnosticMode={props.diagnosticMode}
					onOpenReportStudio={props.onOpenReportStudio}
					onOpenRadiologyReferral={props.onOpenRadiologyReferral}
					onOpenDirectRvg={props.onOpenDirectRvg}
					onOpenHotFolder={props.onOpenHotFolder}
					onOpenDicomViewer={props.onOpenDicomViewer}
					onOpenComparison={props.onOpenComparison}
				/>
			</div>

			<DiagnosticsPatientAlerts
				target={props.target}
				visitPatientId={props.visitPatientId}
				visitPatientName={props.visitPatientName}
				selectedPatientName={props.selectedPatientName}
				setSelectedPatientId={props.setSelectedPatientId}
			/>
		</>
	);
}
