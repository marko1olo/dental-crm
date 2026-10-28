import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { showToast } from "../../GlobalToast";
import { FDI_TOOTH_NAMES } from "../radiologyMath";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode";
import { DEFAULT_RVG_FILTERS, type RvgFilterValues } from "../RvgFiltersToolbar";
import type {
	DirectRvgCaptureModalProps,
	ProjectionAngleType,
} from "../directRvgTypes";
import type { AnatomicalZone, PatientCategory } from "../DirectRvgProjectionSelector";
import { useRvgGlCanvas } from "../useRvgGlCanvas";
import { useDirectRvgPanZoom } from "../useDirectRvgPanZoom";
import { useDirectRvgSensorAcquisition } from "./useDirectRvgSensorAcquisition";
import { useDirectRvgEmrActions } from "./useDirectRvgEmrActions";

export function useDirectRvgCapture(props: DirectRvgCaptureModalProps) {
	const {
		isOpen,
		onClose,
		patientId = "PAT-001",
		patientName = "Пациент",
		patientCardNumber = "МК-2026/891",
		doctorName = "Лечащий врач",
		initialToothFdi = "16",
		initialImageUrl,
		onSaveToEmr,
		onSendToLab,
		onExportDicom,
	} = props;
	const modalId = useId();
	const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId) || isDemoPatientId(patientName);

	// 1-Click Anatomical & Patient Category Presets (Mandate 8e: Doctor Autonomy)
	const [patientCategory, setPatientCategory] = useState<PatientCategory>("adult");
	const [anatomicalZone, setAnatomicalZone] = useState<AnatomicalZone>("molar");
	const [exposureSec, setExposureSec] = useState<number>(0.08);

	// Tooth & Projection
	const [selectedTeeth, setSelectedTeeth] = useState<string[]>([initialToothFdi]);
	useEffect(() => {
		if (initialToothFdi && initialToothFdi !== "all") {
			setSelectedTeeth([initialToothFdi]);
		}
	}, [initialToothFdi]);

	const [projectionType, setProjectionType] = useState<ProjectionAngleType>("periapical");
	const [clinicalNotes, setClinicalNotes] = useState<string>(
		"Контрольный прицельный снимок после эндодонтической обработки и пломбирования.",
	);

	// Sensor Acquisition Sub-hook
	const sensorAcq = useDirectRvgSensorAcquisition({
		initialImageUrl,
		isDemo,
		onTeethDetected: (teeth, suggestedProj) => {
			setSelectedTeeth(teeth);
			if (suggestedProj) setProjectionType(suggestedProj);
		},
		onClinicalNoteDetected: (note) => {
			setClinicalNotes((prev) => (prev.startsWith("Контрольный прицельный") ? note : prev));
		},
	});

	// Viewport & Image Filters
	const [filters, setFilters] = useState<RvgFilterValues>(DEFAULT_RVG_FILTERS);
	const [activePresetId, setActivePresetId] = useState<string>("standard");
	const [isSplitCompare, setIsSplitCompare] = useState<boolean>(false);

	// Pan, Zoom, Rotation & Mirroring
	const panZoom = useDirectRvgPanZoom();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { isWebGL } = useRvgGlCanvas(canvasRef, sensorAcq.capturedImage, filters);

	// Standard calibrated effective dose in µSv (quiet telemetry)
	const calculatedDoseMicrosv = useMemo(() => {
		const zoneMult = anatomicalZone === "molar" ? 1.2 : anatomicalZone === "premolar" ? 1.0 : 0.8;
		const ageMult = patientCategory === "child" ? 0.6 : 1.0;
		return Number((65 * 7.0 * exposureSec * 0.0825 * zoneMult * ageMult).toFixed(1));
	}, [exposureSec, anatomicalZone, patientCategory]);

	const primaryTooth = selectedTeeth[0] || "16";
	const primaryToothName = FDI_TOOTH_NAMES[primaryTooth] || `Зуб ${primaryTooth}`;

	// EMR & Export Actions Sub-hook
	const emrActions = useDirectRvgEmrActions({
		patientId,
		patientName,
		patientCardNumber,
		doctorName,
		selectedSensorModel: sensorAcq.selectedSensorModel,
		selectedTeeth,
		primaryToothName,
		initialToothFdi,
		exposureSec,
		calculatedDoseMicrosv,
		capturedImage: sensorAcq.capturedImage,
		clinicalNotes,
		canvasRef,
		onSaveToEmr,
		onSendToLab,
		onExportDicom,
		onClose,
	});

	// Handle tooth selection click (1-click fast toggle)
	const handleToothToggle = (tooth: string, multiSelect = false) => {
		if (multiSelect || projectionType === "bitewing" || projectionType === "occlusal") {
			if (selectedTeeth.includes(tooth)) {
				if (selectedTeeth.length > 1) {
					setSelectedTeeth(selectedTeeth.filter((t) => t !== tooth));
				}
			} else {
				setSelectedTeeth([...selectedTeeth, tooth].sort());
			}
		} else {
			if (selectedTeeth.includes(tooth) && selectedTeeth.length > 1) {
				setSelectedTeeth(selectedTeeth.filter((t) => t !== tooth));
			} else {
				setSelectedTeeth([tooth]);
			}
		}
	};

	// Keyboard Shortcuts & Paste
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			if (e.code === "Space") {
				e.preventDefault();
				sensorAcq.handleTriggerCapture();
			} else if (e.key === "Escape") {
				e.preventDefault();
				onClose();
			} else if (e.key === "r" || e.key === "R" || e.key === "к" || e.key === "К") {
				e.preventDefault();
				panZoom.handleRotate();
			} else if (e.key === "+" || e.key === "=") {
				e.preventDefault();
				panZoom.handleZoomIn();
			} else if (e.key === "-" || e.key === "_") {
				e.preventDefault();
				panZoom.handleZoomOut();
			} else if (e.key === "0") {
				e.preventDefault();
				panZoom.handleResetTransform();
			}
		};

		const handlePaste = (e: ClipboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}
			const items = e.clipboardData?.items;
			if (!items) return;
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (item && item.kind === "file") {
					const file = item.getAsFile();
					if (file) {
						e.preventDefault();
						void sensorAcq.handleProcessFile(file);
						showToast("Снимок успешно вставлен из буфера обмена (Ctrl+V)", "success");
						break;
					}
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("paste", handlePaste);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("paste", handlePaste);
		};
	}, [isOpen, sensorAcq, onClose, panZoom]);

	const handleSelectProjectionType = (projId: ProjectionAngleType, typicalExp?: number) => {
		setProjectionType(projId);
		if (typicalExp) {
			setExposureSec(typicalExp);
		}
	};

	// Compute CSS filter string with authentic SVG convolution kernel for clinical sharpness
	const cssFilterStyle = [
		`brightness(${filters.brightness}%)`,
		`contrast(${filters.contrast + (filters.clahe > 0 ? filters.clahe * 0.4 : 0)}%)`,
		filters.invert ? "invert(100%)" : "",
		filters.sharpness > 0 ? `url(#rvg-sharpness-kernel-${modalId}) contrast(${100 + Math.round(filters.sharpness * 0.35)}%)` : "",
	].filter(Boolean).join(" ");

	return {
		modalId,
		isDemo,
		sensorStatus: sensorAcq.sensorStatus,
		selectedSensorModel: sensorAcq.selectedSensorModel,
		setSelectedSensorModel: sensorAcq.setSelectedSensorModel,
		acquisitionProgress: sensorAcq.acquisitionProgress,
		isSaving: emrActions.isSaving,
		isDetectingSensor: sensorAcq.isDetectingSensor,
		sensorHealthStatus: sensorAcq.sensorHealthStatus,
		handleAutoDetectSensor: sensorAcq.handleAutoDetectSensor,
		handleTestSensorConnection: sensorAcq.handleTestSensorConnection,
		patientCategory,
		setPatientCategory,
		anatomicalZone,
		setAnatomicalZone,
		exposureSec,
		setExposureSec,
		selectedTeeth,
		setSelectedTeeth,
		projectionType,
		clinicalNotes,
		setClinicalNotes,
		capturedImage: sensorAcq.capturedImage,
		setCapturedImage: sensorAcq.setCapturedImage,
		filters,
		setFilters,
		activePresetId,
		setActivePresetId,
		isSplitCompare,
		setIsSplitCompare,
		panZoom,
		canvasRef,
		isWebGL,
		calculatedDoseMicrosv,
		primaryTooth,
		primaryToothName,
		availableSensors: sensorAcq.availableSensors,
		handleToothToggle,
		handleTriggerCapture: sensorAcq.handleTriggerCapture,
		handleLoadDemo: sensorAcq.handleLoadDemo,
		fileInputRef: sensorAcq.fileInputRef,
		isDragOver: sensorAcq.isDragOver,
		handleFileInputChange: sensorAcq.handleFileInputChange,
		handleViewportDragOver: sensorAcq.handleViewportDragOver,
		handleViewportDragLeave: sensorAcq.handleViewportDragLeave,
		handleViewportDrop: sensorAcq.handleViewportDrop,
		handleSaveToEmr: emrActions.handleSaveToEmr,
		handleSendToLab: emrActions.handleSendToLab,
		handleSendToPlan: emrActions.handleSendToPlan,
		handleExportDicom: emrActions.handleExportDicom,
		handleSelectProjectionType,
		cssFilterStyle,
	};
}
