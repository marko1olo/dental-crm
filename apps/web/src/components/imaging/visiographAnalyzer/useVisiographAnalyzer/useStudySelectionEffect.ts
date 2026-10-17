import { useEffect } from "react";
import { planVisiographFindings } from "../../visiographFindings.js";
import type { XrayScan } from "../../VisiographScanHelpers.js";

export function useStudySelectionEffect({
	selectedStudy,
	toothCode,
	effectivePatientId,
	setCurrentImageUrl,
	setCurrentScan,
	currentScanRef,
	setSelectedFindingCodes,
}: {
	selectedStudy?: { id?: string | null; previewUrl?: string | null; viewerUrl?: string | null; toothCode?: string | null; title?: string | null; modality?: string | null; capturedAt?: string | null } | null | undefined;
	toothCode?: string | null | undefined;
	effectivePatientId: string | null | undefined;
	setCurrentImageUrl: (url: string | null) => void;
	setCurrentScan: (scan: XrayScan | null) => void;
	currentScanRef: React.MutableRefObject<XrayScan | null>;
	setSelectedFindingCodes: (codes: Set<string>) => void;
}) {
	useEffect(() => {
		if (!selectedStudy) return;
		const imageUrl = selectedStudy.previewUrl || selectedStudy.viewerUrl;
		if (!imageUrl) return;

		setCurrentImageUrl(imageUrl);
		const scanTooth = selectedStudy.toothCode ?? toothCode ?? "16";
		const scan: XrayScan = {
			id: selectedStudy.id || `study-${Date.now()}`,
			patientId: effectivePatientId || "active_patient",
			status: "done",
			kind: selectedStudy.modality || "periapical",
			toothCode: scanTooth,
			originalFilename: selectedStudy.title || `rvg_${scanTooth}.jpg`,
			aiReport: selectedStudy.title ? `### Снимок\n${selectedStudy.title}` : `### Снимок зуба ${scanTooth}\nПрицельная радиовизиография`,
			aiSummary: selectedStudy.title || `Снимок зуба ${scanTooth}`,
			aiToothStates: { [scanTooth]: "treatment" },
			hasImage: true,
			imageDataUri: imageUrl,
			capturedAt: selectedStudy.capturedAt || new Date().toISOString(),
			createdAt: selectedStudy.capturedAt || new Date().toISOString(),
		};
		setCurrentScan(scan);
		currentScanRef.current = scan;
		const plan = planVisiographFindings({ [scanTooth]: "treatment" });
		setSelectedFindingCodes(new Set(plan.groups.flatMap((g) => g.teeth.map((t) => t.code))));
	}, [selectedStudy, toothCode, effectivePatientId, setCurrentImageUrl, setCurrentScan, currentScanRef, setSelectedFindingCodes]);
}
