import { useCallback, useRef, useState } from "react";
import { usePatientStore } from "../../../../store/patientStore.js";
import { logger } from "../../../../utils/logger.js";
import { planVisiographFindings } from "../../visiographFindings.js";
import { getInitialDefaultScan, saveVisiographScanToServer, type XrayScan } from "../../VisiographScanHelpers.js";

export interface UseVisiographAnalyzerScanProps {
	effectivePatientId: string | null | undefined;
	patientId?: string | undefined;
	toothCode?: string | null | undefined;
	effectiveVisitId?: string | undefined;
	denteClinicalMutationHeaders: (extra?: Record<string, string>) => Record<string, string>;
	setCurrentScan: React.Dispatch<React.SetStateAction<XrayScan | null>>;
	currentScanRef: React.MutableRefObject<XrayScan | null>;
	setCurrentImageUrl: React.Dispatch<React.SetStateAction<string | null>>;
	setSelectedFindingCodes: React.Dispatch<React.SetStateAction<Set<string>>>;
	setScanHistory: React.Dispatch<React.SetStateAction<XrayScan[]>>;
	resetAnalysisState: () => void;
	setError: (err: string | null) => void;
	setSaveFailure: (err: string | null) => void;
}

export function useVisiographAnalyzerScan({
	effectivePatientId, patientId, toothCode, effectiveVisitId, denteClinicalMutationHeaders,
	setCurrentScan, currentScanRef, setCurrentImageUrl, setSelectedFindingCodes, setScanHistory,
	resetAnalysisState, setError, setSaveFailure,
}: UseVisiographAnalyzerScanProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const dropRef = useRef<HTMLButtonElement>(null);
	const [isDragOver, setIsDragOver] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const handleLoadDemoScan = useCallback(() => {
		const demoScan = getInitialDefaultScan(toothCode ?? undefined, effectivePatientId ?? undefined);
		setCurrentScan(demoScan);
		currentScanRef.current = demoScan;
		if (demoScan.imageDataUri) setCurrentImageUrl(demoScan.imageDataUri);
		if (demoScan.aiToothStates) {
			const plan = planVisiographFindings(demoScan.aiToothStates);
			setSelectedFindingCodes(new Set(plan.groups.flatMap((g) => g.teeth.map((t) => t.code))));
		}
	}, [toothCode, effectivePatientId, setCurrentScan, currentScanRef, setCurrentImageUrl, setSelectedFindingCodes]);

	const processFile = useCallback(async (file: File) => {
		if (!file.type.startsWith("image/")) { setError("Поддерживаются только изображения (JPG, PNG, BMP, TIFF)."); return; }
		const patientAtStart = effectivePatientId;
		resetAnalysisState();
		setCurrentScan(null);
		setCurrentImageUrl(null);
		try {
			const dataUrl = await new Promise<string>((res, rej) => {
				const r = new FileReader();
				r.onload = (e) => res(e.target?.result as string);
				r.onerror = rej;
				r.readAsDataURL(file);
			});
			if (patientAtStart !== ((patientId ?? usePatientStore.getState().selectedPatientId) ?? null)) return;
			setCurrentImageUrl(dataUrl);
			const localScan: XrayScan = {
				id: crypto.randomUUID?.() ?? `local-${Date.now()}`, patientId: effectivePatientId ?? "unknown",
				status: "done", kind: "periapical", toothCode: toothCode || null, originalFilename: file.name,
				hasImage: true, imageDataUri: dataUrl, capturedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
			};
			setCurrentScan(localScan);
			if (effectivePatientId) {
				setIsSaving(true);
				const { saved, failure } = await saveVisiographScanToServer(
					effectivePatientId, dataUrl, file,
					denteClinicalMutationHeaders({ "Content-Type": "application/json" }), toothCode ?? undefined, effectiveVisitId ?? undefined,
				);
				setIsSaving(false);
				if (failure) setSaveFailure(failure);
				else if (saved) {
					setCurrentScan((prev) => ({ ...(prev ?? saved), id: saved.id, imageDataUri: dataUrl, hasImage: true }));
					setScanHistory((prev) => [saved, ...prev]);
				}
			}
		} catch (err: any) {
			logger.error("[VisiographAnalyzer] Error reading file:", err);
			setError(err.message || "Не удалось загрузить снимок.");
		} finally {
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	}, [effectivePatientId, patientId, toothCode, effectiveVisitId, resetAnalysisState, denteClinicalMutationHeaders, setScanHistory, setCurrentScan, setCurrentImageUrl, setError, setSaveFailure]);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
		const file = e.dataTransfer.files?.[0];
		if (file) processFile(file);
	}, [processFile]);

	return { fileInputRef, dropRef, isDragOver, setIsDragOver, isSaving, processFile, handleDrop, handleLoadDemoScan };
}
