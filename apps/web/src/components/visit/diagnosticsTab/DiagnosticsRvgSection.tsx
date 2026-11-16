import React, { useMemo } from "react";
import { SensorStudyViewer } from "../../radiology/SensorStudyViewer";
import type { RadiologyFilmstripItem } from "../../radiology/RadiologyFilmstripDock.js";

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
	const studyItem = useMemo<RadiologyFilmstripItem | undefined>(() => {
		if (!selectedStudy) return undefined;
		return {
			id: selectedStudy.id,
			title: selectedStudy.title ?? "Радиовизиография",
			imageUrl: selectedStudy.viewerUrl ?? selectedStudy.previewUrl ?? "",
			...(selectedStudy.previewUrl ? { thumbnailUrl: selectedStudy.previewUrl } : {}),
			teethFdi: selectedStudy.toothCode ? [selectedStudy.toothCode] : (initialToothNumber ? [String(initialToothNumber)] : []),
			studyDate: selectedStudy.capturedAt ?? new Date().toISOString(),
			modality: "intraoral_rvg",
		};
	}, [selectedStudy, initialToothNumber]);

	return (
		<div
			className={isVisible ? "flex flex-col gap-2 visiograph-viewer" : "hidden"}
			data-testid="visiograph-viewer"
		>
			<SensorStudyViewer
				study={studyItem}
				initialImageUrl={selectedStudy?.viewerUrl ?? selectedStudy?.previewUrl}
				patientName={selectedPatientName || visitPatientName || undefined}
				toothFdiCode={initialToothNumber ? String(initialToothNumber) : undefined}
				onInsertToProtocol={onInsertToProtocol}
			/>
		</div>
	);
}
