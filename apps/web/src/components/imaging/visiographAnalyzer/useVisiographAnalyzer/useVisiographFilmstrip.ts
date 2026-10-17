import { useCallback, useMemo, useState } from "react";
import type { RadiologyFilmstripItem } from "../../../radiology/RadiologyFilmstripDock.js";
import type { XrayScan } from "../../VisiographScanHelpers.js";

export function useVisiographFilmstrip({
	scanHistory,
	currentScan,
	currentImageUrl,
	toothCode,
	onScanSelected,
}: {
	scanHistory: XrayScan[];
	currentScan: XrayScan | null;
	currentImageUrl: string | null;
	toothCode?: string | null | undefined;
	onScanSelected: (scan: XrayScan) => void;
}) {
	const [isSensorViewerOpen, setIsSensorViewerOpen] = useState(false);

	const filmstripItems: RadiologyFilmstripItem[] = useMemo(() => {
		if (scanHistory && scanHistory.length > 0) {
			return scanHistory.map((s) => ({
				id: s.id,
				title: s.originalFilename || (s.toothCode || toothCode ? `Зуб #${s.toothCode || toothCode}` : "Снимок RVG"),
				modality: "intraoral_rvg",
				modalityLabel: "IO-СЕНСОР",
				studyDate: s.capturedAt || s.createdAt || "01.10.2026",
				teethFdi: s.toothCode ? [s.toothCode] : toothCode ? [toothCode] : [],
				imageUrl: s.imageDataUri || "",
				thumbnailUrl: s.imageDataUri || "",
			}));
		}
		if (currentScan) {
			return [{
				id: currentScan.id,
				title: currentScan.originalFilename || (currentScan.toothCode || toothCode ? `Зуб #${currentScan.toothCode || toothCode}` : "Снимок RVG"),
				modality: "intraoral_rvg",
				modalityLabel: "IO-СЕНСОР",
				studyDate: currentScan.capturedAt || currentScan.createdAt || "01.10.2026",
				teethFdi: currentScan.toothCode ? [currentScan.toothCode] : toothCode ? [toothCode] : [],
				imageUrl: currentScan.imageDataUri || currentImageUrl || "",
				thumbnailUrl: currentScan.imageDataUri || currentImageUrl || "",
			}];
		}
		return [];
	}, [scanHistory, toothCode, currentScan, currentImageUrl]);

	const handleSelectFilmstripStudy = useCallback((item: any) => {
		const target = scanHistory.find((s) => s.id === item.id);
		if (target) onScanSelected(target);
	}, [scanHistory, onScanSelected]);

	const handleDoubleClickFilmstripStudy = useCallback((item: any) => {
		const target = scanHistory.find((s) => s.id === item.id);
		if (target) onScanSelected(target);
		setIsSensorViewerOpen(true);
	}, [scanHistory, onScanSelected]);

	return { filmstripItems, isSensorViewerOpen, setIsSensorViewerOpen, handleSelectFilmstripStudy, handleDoubleClickFilmstripStudy };
}
