import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import { useVisitStore } from "../../../store/visitStore.js";
import { usePatientStore } from "../../../store/patientStore.js";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext.js";
import { openCbctPopoutWindow } from "../../../native/desktopBridge.js";
import { DEFAULT_DICOM_VIEWPORT_STATE, type CalibratedRulerMeasurement, type DicomViewportState } from "../rvgViewerEngine.js";
import { RADIOLOGY_STANDARD_PROTOCOLS, applyRadiologyProtocolToForm043 } from "../../radiology/radiologyProtocols.js";
import type { RadiologyFilmstripItem } from "../../radiology/RadiologyFilmstripDock.js";
import type { DicomViewerModalProps } from "./types.js";
import { useDicomViewerModalAi } from "./useDicomViewerModalAi.js";
import { teardownViewportCanvases } from "../../../utils/viewportTeardownHelper.js";

export function useDicomViewerModalController(props: DicomViewerModalProps) {
	const { isOpen, onClose, imageSrc, title, toothFdiCode, patientName, patientId, studyDate, initialViewMode = "2d", onInsertToProtocol } = props;
	const [viewMode, setViewMode] = useState(initialViewMode);
	const [isCtSelectorOpen, setIsCtSelectorOpen] = useState(false);
	const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(imageSrc || null);
	const [activeStudyId, setActiveStudyId] = useState("study-current");
	const [viewportState, setViewportState] = useState<DicomViewportState>(DEFAULT_DICOM_VIEWPORT_STATE);
	const [measurements, setMeasurements] = useState<CalibratedRulerMeasurement[]>([]);
	const [isNormaApplied, setIsNormaApplied] = useState(false);
	const [isProtocolsDropdownOpen, setIsProtocolsDropdownOpen] = useState(false);
	const [appliedProtocolId, setAppliedProtocolId] = useState<string | null>(null);
	const [isDragOver, setIsDragOver] = useState(false);

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const modalContainerRef = useRef<HTMLDivElement | null>(null);
	const protocolsDropdownRef = useRef<HTMLDivElement | null>(null);

	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const appLogic = useOptionalAppLogicContext();
	const authRef = useRef(appLogic?.auth);
	authRef.current = appLogic?.auth;

	const denteClinicalReadHeaders = useCallback((extra?: Record<string, string>) => (authRef.current?.denteClinicalReadHeaders ? authRef.current.denteClinicalReadHeaders(extra ?? {}) : { ...(extra ?? {}) }), []);
	const denteClinicalMutationHeaders = useCallback((extra?: Record<string, string>) => (authRef.current?.denteClinicalMutationHeaders ? authRef.current.denteClinicalMutationHeaders(extra ?? {}) : { ...(extra ?? {}) }), []);

	const ai = useDicomViewerModalAi(currentImageSrc, selectedPatientId, denteClinicalReadHeaders, denteClinicalMutationHeaders, fileInputRef);

	useEffect(() => { if (imageSrc) setCurrentImageSrc(imageSrc); }, [imageSrc]);

	const handleClose = useCallback(() => {
		if (modalContainerRef.current) teardownViewportCanvases(modalContainerRef.current);
		onClose();
	}, [onClose]);

	const handleSwitchViewMode = useCallback((mode: "2d" | "3d_mpr" | "sectioning") => {
		if (mode === "3d_mpr" || mode === "sectioning") {
			openCbctPopoutWindow({ studyId: "ct-study-current", patientId: patientId || undefined, patientName: patientName || undefined, title: `3D КТ · ${patientName || "Исследование"}` }).then((res) => { if (!res.success) setIsCtSelectorOpen(true); });
			return;
		}
		if (modalContainerRef.current) teardownViewportCanvases(modalContainerRef.current);
		setViewMode(mode);
	}, [patientId, patientName]);

	const handleInsertNormaTo043 = useCallback(() => {
		const targetTooth = toothFdiCode ? ` зуба ${toothFdiCode}` : "";
		const statement = `Рентгенологическое исследование (RVG/DICOM)${targetTooth}: норма. Патологических изменений костной ткани не выявлено.`;
		applyRadiologyProtocolToForm043({ protocol: statement, options: { toothFdi: toothFdiCode, modalityLabel: "RVG/DICOM" }, onInsertToProtocol, showNotification: false });
		try { useVisitStore.getState().setVisitNoteForm((prev) => ({ ...prev, objectiveStatus: prev.objectiveStatus ? `${prev.objectiveStatus}\n${statement}` : statement })); } catch {}
		if (onInsertToProtocol) onInsertToProtocol(statement);
		setIsNormaApplied(true);
		setAppliedProtocolId("norma");
		showToast(`Заключение «Норма» внесено в медицинскую карту${targetTooth ? ` (${targetTooth.trim()})` : ""}`, "success");
	}, [toothFdiCode, onInsertToProtocol]);

	const handleApplyProtocol = useCallback((preset: (typeof RADIOLOGY_STANDARD_PROTOCOLS)[number]) => {
		applyRadiologyProtocolToForm043({ protocol: preset.text, options: { toothFdi: toothFdiCode, modalityLabel: "RVG/DICOM" }, onInsertToProtocol, showNotification: true });
		setAppliedProtocolId(preset.id);
		setIsProtocolsDropdownOpen(false);
	}, [toothFdiCode, onInsertToProtocol]);

	const processFile = useCallback((file: File) => {
		const reader = new FileReader();
		reader.onload = () => {
			setCurrentImageSrc(reader.result as string);
			ai.resetAiState();
			setMeasurements([]);
			setViewportState(DEFAULT_DICOM_VIEWPORT_STATE);
		};
		reader.readAsDataURL(file);
	}, [ai]);

	return {
		viewMode, isCtSelectorOpen, setIsCtSelectorOpen, currentImageSrc, setCurrentImageSrc,
		activeStudyId, setActiveStudyId, viewportState, setViewportState, measurements, setMeasurements,
		isNormaApplied, isProtocolsDropdownOpen, setIsProtocolsDropdownOpen, appliedProtocolId,
		isDragOver, setIsDragOver, fileInputRef, modalContainerRef, protocolsDropdownRef, ai,
		handleClose, handleSwitchViewMode, handleInsertNormaTo043, handleApplyProtocol, processFile,
	};
}
