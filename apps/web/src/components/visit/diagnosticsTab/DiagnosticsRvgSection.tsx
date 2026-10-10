import React from "react";
import { VisiographAnalyzer } from "../../imaging/VisiographAnalyzer";

import type { DiagnosticStudy } from "./types";

export interface DiagnosticsRvgSectionProps {
	isVisible: boolean;
	initialToothNumber: number;
	target: string;
	visitPatientName: string | null;
	selectedPatientName: string | null;
	activePatientId?: string | undefined;
	activeVisitId?: string | undefined;
	selectedStudy?: DiagnosticStudy | null | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
	onOpenDirectRvg: () => void;
	onOpenHotFolder: () => void;
	onOpenDicomViewer: () => void;
	onOpenRadiologyReferral: () => void;
}

export function DiagnosticsRvgSection({
	isVisible,
	initialToothNumber,
	target,
	visitPatientName,
	selectedPatientName,
	activePatientId,
	activeVisitId,
	selectedStudy,
	onInsertToProtocol,
	onOpenDirectRvg,
	onOpenHotFolder,
	onOpenDicomViewer,
	onOpenRadiologyReferral,
}: DiagnosticsRvgSectionProps) {
	return (
		<div className={isVisible ? "flex flex-col gap-2" : "hidden"}>
			{/* Модуль визиографа и рентген-анализа ИИ */}
			<VisiographAnalyzer
				patientId={activePatientId}
				visitId={activeVisitId}
				toothCode={initialToothNumber ? String(initialToothNumber) : undefined}
				onInsertToProtocol={onInsertToProtocol}
				onConnectRvg={onOpenDirectRvg}
				onReferToRadiology={onOpenRadiologyReferral}
				onUploadDicom={onOpenDicomViewer}
				selectedStudy={selectedStudy}
			/>
		</div>
	);
}
