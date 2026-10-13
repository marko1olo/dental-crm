/**
 * DENTE CRM — Radiology Consultation Split Controller Hook (Layer 3)
 * Directed Acyclic Graph (DAG): Layer 3 (State, custom hooks, handlers, subscriptions)
 * Strictly <= 500 lines (Mandate 8b & Engineering Route).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { teardownViewportCanvases } from "../../../utils/viewportTeardownHelper.js";
import {
	type ConsultationSlot,
	type ViewportAnnotation,
	type ViewportState,
	getImageCoords,
	renderViewportToCanvas,
} from "../consultationCanvasRenderers.js";
import type { ConsultationSplitMode } from "../ConsultationTopToolbar.js";
import type {
	RadiologyConsultationSplitProps,
	ActiveConsultationTool,
} from "./types.js";
import {
	DEFAULT_ANNOTATION_COLOR,
} from "./consultationConstants.js";
import {
	resolvePatientGender,
} from "./consultationUtils.js";
import {
	createDefaultEffectivePatientStudies,
	createInitialLeftViewport,
	createInitialRightViewport,
} from "./consultationInitialState.js";
import { formatFilmstripDateTime } from "../RadiologyFilmstripDock.js";
import { showToast } from "../../GlobalToast.js";
import { useRadiologySliceSyncController } from "./useRadiologySliceSyncController.js";
import { useRadiologyDiagnosticSyncController } from "./useRadiologyDiagnosticSyncController.js";
import { useRadiologyExportConsultationController } from "./useRadiologyExportConsultationController.js";

export function useRadiologyConsultationSplitController(props: RadiologyConsultationSplitProps) {
	const {
		patientName = "Чухрова Лариса",
		patientCardNumber = "20190621_101042",
		patientAge = "58Y",
		patientGender,
		activeToothFdi,
		initialLeftStudy,
		initialRightStudy,
		patientStudiesHistory = [],
		initialSplitMode,
		onClose,
		onInsertProtocol,
		onSaveSnapshot,
	} = props;

	// Mode: "comparison" (Pre/Post-op patient X-ray comparison) vs "atlas" (Anatomical pathologies)
	const [splitMode, setSplitMode] = useState<ConsultationSplitMode>(() => {
		if (initialSplitMode === "consultation" || initialSplitMode === "atlas") return "atlas";
		return "comparison";
	});

	// Active slot focus (Left vs Right)
	const [activeSlot, setActiveSlot] = useState<ConsultationSlot>("left");

	// Synchronous Pan & Zoom toggle (EzDent-i Screenshot 25 invariant)
	const [isSyncNav, setIsSyncNav] = useState<boolean>(true);

	// Effective guaranteed patient studies list
	const effectivePatientStudies = useMemo(
		() => createDefaultEffectivePatientStudies(patientStudiesHistory),
		[patientStudiesHistory],
	);

	// Viewports state
	const [leftViewport, setLeftViewport] = useState<ViewportState>(() =>
		createInitialLeftViewport({
			initialLeftStudy,
			effectiveStudies: effectivePatientStudies,
			activeToothFdi,
		}),
	);

	const [rightViewport, setRightViewport] = useState<ViewportState>(() =>
		createInitialRightViewport({
			initialRightStudy,
			effectiveStudies: effectivePatientStudies,
			splitMode,
			activeToothFdi,
		}),
	);

	// Active Interactive Tool: "pan" | "laser" | "arrow" | "pencil" | "eraser"
	const [activeTool, setActiveTool] = useState<ActiveConsultationTool>("pan");
	const [annotationColor] = useState<string>(DEFAULT_ANNOTATION_COLOR);

	// Laser pointer coordinates (in image plane coordinates)
	const [laserPoint, setLaserPoint] = useState<{ x: number; y: number } | null>(null);

	// Fullscreen Presentation Mode
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

	// Canvas and image refs for both viewports
	const leftCanvasRef = useRef<HTMLCanvasElement>(null);
	const rightCanvasRef = useRef<HTMLCanvasElement>(null);
	const leftImgRef = useRef<HTMLImageElement | null>(null);
	const rightImgRef = useRef<HTMLImageElement | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Mouse drag tracking
	const isDraggingRef = useRef<boolean>(false);
	const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const dragStartPanLeftRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const dragStartPanRightRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

	// Active annotation drafting
	const [draftPoints, setDraftPoints] = useState<{ x: number; y: number }[]>([]);

	// 1. Subcontroller: Slice navigation and Z-synchronization
	const sliceSyncCtrl = useRadiologySliceSyncController({
		activeToothFdi,
		isSyncNav,
		setLeftViewport,
		setRightViewport,
	});

	// 2. Subcontroller: Diagnostic sync with Odontogram & Form 043/u EHR
	const diagnosticSyncCtrl = useRadiologyDiagnosticSyncController({
		activeToothFdi,
		leftViewport,
		setLeftViewport,
		setRightViewport,
		activeSlot,
		setActiveSlot,
	});

	// 3. Subcontroller: Export, Snapshot, Notes, Consilium Protocol
	const exportCtrl = useRadiologyExportConsultationController({
		leftCanvasRef,
		rightCanvasRef,
		leftViewport,
		rightViewport,
		splitMode,
		patientName,
		patientCardNumber,
		activeToothFdi,
		onInsertProtocol,
		onSaveSnapshot,
	});

	// Render both viewports with responsive fitting & laser spotlight
	const renderBoth = useCallback(() => {
		renderViewportToCanvas({
			canvas: leftCanvasRef.current,
			img: leftImgRef.current,
			state: leftViewport,
			isActive: activeSlot === "left",
			draftPoints,
			activeTool,
			annotationColor,
			laserPoint: isSyncNav || activeSlot === "left" ? laserPoint : null,
		});
		renderViewportToCanvas({
			canvas: rightCanvasRef.current,
			img: rightImgRef.current,
			state: rightViewport,
			isActive: activeSlot === "right",
			draftPoints,
			activeTool,
			annotationColor,
			laserPoint: isSyncNav || activeSlot === "right" ? laserPoint : null,
		});
	}, [
		activeSlot,
		draftPoints,
		activeTool,
		annotationColor,
		leftViewport,
		rightViewport,
		laserPoint,
		isSyncNav,
	]);

	// Load images on URL change
	useEffect(() => {
		if (!leftViewport.imageSrc) return;
		const img = new Image();
		if (!leftViewport.imageSrc.startsWith("data:") && !leftViewport.imageSrc.startsWith("blob:")) {
			img.crossOrigin = "anonymous";
		}
		img.onload = () => {
			leftImgRef.current = img;
			renderBoth();
		};
		img.src = leftViewport.imageSrc;
	}, [leftViewport.imageSrc, renderBoth]);

	useEffect(() => {
		if (!rightViewport.imageSrc) return;
		const img = new Image();
		if (
			!rightViewport.imageSrc.startsWith("data:") &&
			!rightViewport.imageSrc.startsWith("blob:")
		) {
			img.crossOrigin = "anonymous";
		}
		img.onload = () => {
			rightImgRef.current = img;
			renderBoth();
		};
		img.src = rightViewport.imageSrc;
	}, [rightViewport.imageSrc, renderBoth]);

	// Trigger render on state updates
	useEffect(() => {
		renderBoth();
	}, [renderBoth]);

	// Responsive resize
	useEffect(() => {
		if (!containerRef.current) return;
		const obs = new ResizeObserver(() => renderBoth());
		obs.observe(containerRef.current);
		return () => obs.disconnect();
	}, [renderBoth]);

	// Unmount cleanup: Zero canvas backing store (Mandate 8c & 8x)
	useEffect(() => {
		return () => {
			if (containerRef.current) {
				teardownViewportCanvases(containerRef.current);
			}
		};
	}, []);

	// Mouse Down (Pan vs Annotation Drawing vs Laser)
	const handleCanvasMouseDown = (
		slot: ConsultationSlot,
		e: React.MouseEvent<HTMLCanvasElement>,
	) => {
		setActiveSlot(slot);

		if (e.button === 0 && activeTool === "pan") {
			isDraggingRef.current = true;
			dragStartPosRef.current = { x: e.clientX, y: e.clientY };
			dragStartPanLeftRef.current = { x: leftViewport.panX, y: leftViewport.panY };
			dragStartPanRightRef.current = { x: rightViewport.panX, y: rightViewport.panY };
			return;
		}

		if (e.button === 0 && (activeTool === "pencil" || activeTool === "arrow")) {
			const canvas = slot === "left" ? leftCanvasRef.current : rightCanvasRef.current;
			const img = slot === "left" ? leftImgRef.current : rightImgRef.current;
			if (!canvas || !img) return;
			const state = slot === "left" ? leftViewport : rightViewport;
			const pt = getImageCoords(
				canvas,
				state,
				{ width: img.naturalWidth, height: img.naturalHeight },
				e.clientX,
				e.clientY,
				true,
			);
			setDraftPoints([pt]);
		}
	};

	const handleCanvasMouseMove = (
		slot: ConsultationSlot,
		e: React.MouseEvent<HTMLCanvasElement>,
	) => {
		// Update Laser Pointer spotlight
		if (activeTool === "laser") {
			const canvas = slot === "left" ? leftCanvasRef.current : rightCanvasRef.current;
			const img = slot === "left" ? leftImgRef.current : rightImgRef.current;
			if (canvas && img && img.naturalWidth > 0) {
				const state = slot === "left" ? leftViewport : rightViewport;
				const pt = getImageCoords(
					canvas,
					state,
					{ width: img.naturalWidth, height: img.naturalHeight },
					e.clientX,
					e.clientY,
					true,
				);
				setLaserPoint(pt);
			}
			return;
		}

		if (isDraggingRef.current && activeTool === "pan") {
			const dx = e.clientX - dragStartPosRef.current.x;
			const dy = e.clientY - dragStartPosRef.current.y;

			if (isSyncNav) {
				setLeftViewport((prev) => ({
					...prev,
					panX: dragStartPanLeftRef.current.x + dx,
					panY: dragStartPanLeftRef.current.y + dy,
				}));
				setRightViewport((prev) => ({
					...prev,
					panX: dragStartPanRightRef.current.x + dx,
					panY: dragStartPanRightRef.current.y + dy,
				}));
			} else if (slot === "left") {
				setLeftViewport((prev) => ({
					...prev,
					panX: dragStartPanLeftRef.current.x + dx,
					panY: dragStartPanLeftRef.current.y + dy,
				}));
			} else {
				setRightViewport((prev) => ({
					...prev,
					panX: dragStartPanRightRef.current.x + dx,
					panY: dragStartPanRightRef.current.y + dy,
				}));
			}
			return;
		}

		if (draftPoints.length > 0 && (activeTool === "pencil" || activeTool === "arrow")) {
			const canvas = slot === "left" ? leftCanvasRef.current : rightCanvasRef.current;
			const img = slot === "left" ? leftImgRef.current : rightImgRef.current;
			if (!canvas || !img) return;
			const state = slot === "left" ? leftViewport : rightViewport;
			const pt = getImageCoords(
				canvas,
				state,
				{ width: img.naturalWidth, height: img.naturalHeight },
				e.clientX,
				e.clientY,
				true,
			);
			if (activeTool === "pencil") {
				setDraftPoints((prev) => [...prev, pt]);
			} else {
				setDraftPoints([draftPoints[0]!, pt]);
			}
		}
	};

	const handleCanvasMouseUp = (slot: ConsultationSlot) => {
		isDraggingRef.current = false;

		if (draftPoints.length >= 2 && (activeTool === "pencil" || activeTool === "arrow")) {
			const newAnn: ViewportAnnotation = {
				id: `ann-${Date.now()}`,
				type: activeTool === "pencil" ? "freehand" : "arrow",
				points: draftPoints,
				color: annotationColor,
			};

			const updateSlotAnnotations = (prev: ViewportState) => ({
				...prev,
				annotations: [...prev.annotations, newAnn],
			});

			if (slot === "left") {
				setLeftViewport(updateSlotAnnotations);
			} else {
				setRightViewport(updateSlotAnnotations);
			}
			setDraftPoints([]);
		}
	};

	// Reset Pan & Zoom
	const handleResetView = () => {
		const reset = (prev: ViewportState) => ({ ...prev, zoom: 1.0, panX: 0, panY: 0 });
		setLeftViewport(reset);
		setRightViewport(reset);
		setLaserPoint(null);
	};

	// Clear Annotations
	const handleClearAnnotations = () => {
		if (activeSlot === "left") {
			setLeftViewport((prev) => ({ ...prev, annotations: [] }));
		} else {
			setRightViewport((prev) => ({ ...prev, annotations: [] }));
		}
		setDraftPoints([]);
		setLaserPoint(null);
		showToast(`Аннотации ${activeSlot === "left" ? "левого" : "правого"} окна очищены`, "info");
	};

	// Invert Toggle
	const handleToggleInvert = () => {
		const toggle = (prev: ViewportState) => ({ ...prev, invert: !prev.invert });
		if (activeSlot === "left") setLeftViewport(toggle);
		else setRightViewport(toggle);
	};

	// Toggle split mode between comparison and atlas
	const handleToggleSplitMode = useCallback(() => {
		const nextMode = splitMode === "atlas" ? "comparison" : "atlas";
		setSplitMode(nextMode);

		if (nextMode === "atlas") {
			const rightAtlas = createInitialRightViewport({
				effectiveStudies: effectivePatientStudies,
				splitMode: "atlas",
				activeToothFdi,
			});
			setRightViewport((rv) => ({
				...rv,
				imageSrc: rightAtlas.imageSrc,
				title: rightAtlas.title,
				subtitle: rightAtlas.subtitle,
				zoom: 1.0,
				panX: 0,
				panY: 0,
				annotations: [],
			}));
			showToast("Режим Анатомического атласа активирован", "info");
		} else {
			const postStudy =
				effectivePatientStudies.length >= 2
					? effectivePatientStudies[effectivePatientStudies.length - 1]
					: undefined;
			setRightViewport((rv) => ({
				...rv,
				imageSrc: postStudy?.imageUrl || "/radiology/sample_rvg_tooth16.jpg",
				title: (postStudy as any)?.title || "Контроль ПОСЛЕ лечения (Обтурация каналов)",
				subtitle: postStudy?.studyDate
					? formatFilmstripDateTime(postStudy.studyDate).dateStr
					: "16.05.2024",
				toothCode: postStudy?.teethFdi?.[0] || rv.toothCode,
				zoom: 1.0,
				panX: 0,
				panY: 0,
				annotations: [],
			}));
			showToast("Клиническое сравнение «До / После» активировано", "info");
		}
	}, [splitMode, effectivePatientStudies, activeToothFdi]);

	// Current active study image source for bottom dock highlight
	const activeStudySrc = activeSlot === "left" ? leftViewport.imageSrc : rightViewport.imageSrc;
	const resolvedGender = resolvePatientGender(patientGender, patientName);

	return {
		patientName,
		patientCardNumber,
		patientAge,
		resolvedGender,
		activeToothFdi,
		onClose,
		splitMode,
		setSplitMode,
		activeSlot,
		setActiveSlot,
		isSyncNav,
		setIsSyncNav,
		isSyncSlices: sliceSyncCtrl.isSyncSlices,
		currentZMm: sliceSyncCtrl.currentZMm,
		handleStepSliceZ: sliceSyncCtrl.handleStepSliceZ,
		sliceSyncState: sliceSyncCtrl.sliceSyncState,
		baselineBone: sliceSyncCtrl.baselineBone,
		followupBone: sliceSyncCtrl.followupBone,
		handleViewportWheel: sliceSyncCtrl.handleViewportWheel,
		activeTool,
		setActiveTool,
		annotationColor,
		laserPoint,
		isFullscreen,
		setIsFullscreen,
		selectedDiscipline: diagnosticSyncCtrl.selectedDiscipline,
		setSelectedDiscipline: diagnosticSyncCtrl.setSelectedDiscipline,
		effectivePatientStudies,
		leftViewport,
		rightViewport,
		activeStudySrc,
		participants: exportCtrl.participants,
		setParticipants: exportCtrl.setParticipants,
		isParticipantsBarOpen: exportCtrl.isParticipantsBarOpen,
		setIsParticipantsBarOpen: exportCtrl.setIsParticipantsBarOpen,
		notes: exportCtrl.notes,
		setNotes: exportCtrl.setNotes,
		isNotesPanelOpen: exportCtrl.isNotesPanelOpen,
		setIsNotesPanelOpen: exportCtrl.setIsNotesPanelOpen,
		handleAddNote: exportCtrl.handleAddNote,
		handleTakeSnapshot: exportCtrl.handleTakeSnapshot,
		handleInsertConsultationNote: exportCtrl.handleInsertConsultationNote,
		handleSelectCapturedStudy: diagnosticSyncCtrl.handleSelectCapturedStudy,
		handleSelectPathology: diagnosticSyncCtrl.handleSelectPathology,
		handleAssignStudyToSlot: diagnosticSyncCtrl.handleAssignStudyToSlot,
		leftCanvasRef,
		rightCanvasRef,
		containerRef,
		handleCanvasMouseDown,
		handleCanvasMouseMove,
		handleCanvasMouseUp,
		handleResetView,
		handleClearAnnotations,
		handleToggleInvert,
		handleToggleSplitMode,
	};
}
