/**
 * DENTE CRM — Radiology Consultation Split Controller Hook (Layer 3)
 * Directed Acyclic Graph (DAG): Layer 3 (State, custom hooks, handlers, subscriptions)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DentalDisciplineId, ConsultationPathologyItem } from "../ConsultationPathologyLibrary.js";
import { formatFilmstripDateTime, type RadiologyFilmstripItem } from "../RadiologyFilmstripDock.js";
import { teardownViewportCanvases } from "../../../utils/viewportTeardownHelper.js";
import { applyRadiologyProtocolToForm043 } from "../radiologyProtocols.js";
import { showToast } from "../../GlobalToast.js";
import type { RadiologyStudy } from "../types.js";
import {
	type ConsultationSlot,
	type ViewportAnnotation,
	type ViewportState,
	getImageCoords,
	renderViewportToCanvas,
	captureCompositeSnapshot,
} from "../consultationCanvasRenderers.js";
import type { ConsultationSplitMode } from "../ConsultationTopToolbar.js";
import {
	computeSynchronizedSliceIndices,
	type BoneDimensionPoint,
	type StudySliceSeriesInfo,
} from "../cbctComparisonMath.js";
import type {
	RadiologyConsultationSplitProps,
	ActiveConsultationTool,
	ConsultationParticipant,
	ConsultationNoteItem,
} from "./types.js";
import {
	DEFAULT_CONSULTATION_PARTICIPANTS,
	DEFAULT_ANNOTATION_COLOR,
	DEFAULT_Z_MM,
} from "./consultationConstants.js";
import {
	resolvePatientGender,
	buildForm043ConsultationStatement,
	formatConsultationTimestamp,
} from "./consultationUtils.js";
import {
	createDefaultEffectivePatientStudies,
	createInitialLeftViewport,
	createInitialRightViewport,
	createInitialConsiliumNotes,
} from "./consultationInitialState.js";

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

	// Synchronous Slice Z-scroll toggle & physical Z coordinate for CT series
	const [isSyncSlices] = useState<boolean>(true);
	const [currentZMm, setCurrentZMm] = useState<number>(DEFAULT_Z_MM);

	// Consilium participants state
	const [participants, setParticipants] = useState<readonly ConsultationParticipant[]>(
		DEFAULT_CONSULTATION_PARTICIPANTS,
	);
	const [isParticipantsBarOpen, setIsParticipantsBarOpen] = useState<boolean>(false);

	// Consilium notes & treatment protocol
	const [notes, setNotes] = useState<readonly ConsultationNoteItem[]>(() =>
		createInitialConsiliumNotes(activeToothFdi),
	);
	const [isNotesPanelOpen, setIsNotesPanelOpen] = useState<boolean>(false);

	// Bone measurements for Pre-op (baseline) and Post-op (followup)
	const [baselineBone] = useState<BoneDimensionPoint>({
		heightMm: 7.5,
		widthMm: 5.0,
		densityHU: 420,
		toothFdi: activeToothFdi ? String(activeToothFdi) : "16",
		measurementDate: "12.01.2024",
	});

	const [followupBone] = useState<BoneDimensionPoint>({
		heightMm: 11.7,
		widthMm: 6.5,
		densityHU: 840,
		toothFdi: activeToothFdi ? String(activeToothFdi) : "16",
		measurementDate: "15.07.2024",
	});

	// Synchronized slice calculation with slice thickness compensation
	const sliceSyncState = useMemo(() => {
		const baselineSeries: StudySliceSeriesInfo = {
			sliceCount: 300,
			sliceThicknessMm: 0.5,
		};
		const followupSeries: StudySliceSeriesInfo = {
			sliceCount: 150,
			sliceThicknessMm: 1.0,
		};
		return computeSynchronizedSliceIndices({
			currentZMm,
			baseline: baselineSeries,
			followup: followupSeries,
		});
	}, [currentZMm]);

	// Active Interactive Tool: "pan" | "laser" | "arrow" | "pencil" | "eraser"
	const [activeTool, setActiveTool] = useState<ActiveConsultationTool>("pan");
	const [annotationColor] = useState<string>(DEFAULT_ANNOTATION_COLOR);

	// Laser pointer coordinates (in image plane coordinates)
	const [laserPoint, setLaserPoint] = useState<{ x: number; y: number } | null>(null);

	// Fullscreen Presentation Mode
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

	// 8 Dental Disciplines State
	const [selectedDiscipline, setSelectedDiscipline] = useState<DentalDisciplineId>("conservative");

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

	// Step Slice Z in physical millimeters
	const handleStepSliceZ = useCallback((deltaZMm: number) => {
		setCurrentZMm((prev) => Math.max(0, Math.min(150, prev + deltaZMm)));
	}, []);

	// Wheel Zoom with Synchronization & Slice Z-scroll
	const handleViewportWheel = (slot: ConsultationSlot, e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();

		if (isSyncSlices && (e.shiftKey || e.altKey)) {
			const deltaZ = e.deltaY < 0 ? -1.0 : 1.0;
			handleStepSliceZ(deltaZ);
			return;
		}

		const factor = e.deltaY < 0 ? 1.15 : 0.87;

		const updateZoom = (prev: ViewportState) => {
			const nextZoom = Math.min(16.0, Math.max(0.2, prev.zoom * factor));
			return { ...prev, zoom: nextZoom };
		};

		if (isSyncNav) {
			setLeftViewport(updateZoom);
			setRightViewport(updateZoom);
		} else if (slot === "left") {
			setLeftViewport(updateZoom);
		} else {
			setRightViewport(updateZoom);
		}
	};

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

	// Select Study from Patient Captured Tape
	const handleSelectCapturedStudy = (study: RadiologyStudy | RadiologyFilmstripItem) => {
		const imgSrc = study.imageUrl || study.thumbnailUrl || "";
		const title =
			(study as any).title ||
			(study as any).studyDescription ||
			(study.teethFdi?.[0] ? `Зуб ${study.teethFdi[0]}` : "Рентген визиографа");
		const dateStr = formatFilmstripDateTime(study.studyDate).dateStr;

		const targetUpdater = (prev: ViewportState) => ({
			...prev,
			imageSrc: imgSrc,
			title,
			subtitle: dateStr,
			toothCode: study.teethFdi?.[0] || prev.toothCode,
			zoom: 1.0,
			panX: 0,
			panY: 0,
		});

		if (activeSlot === "left") {
			setLeftViewport(targetUpdater);
		} else {
			setRightViewport(targetUpdater);
		}
		showToast(
			`Снимок назначен в ${activeSlot === "left" ? "левое (До)" : "правое (После)"} окно`,
			"info",
		);
	};

	// Select Pathology from Consultation Catalog (Switches into Right slot)
	const handleSelectPathology = (pathology: ConsultationPathologyItem) => {
		const src = pathology.imageUrl || pathology.previewUrl || "/radiology/sample_rvg_tooth16.jpg";
		setRightViewport((prev) => ({
			...prev,
			imageSrc: src,
			title: pathology.titleRu,
			subtitle: `${pathology.code} · ${pathology.titleEn}`,
			zoom: 1.0,
			panX: 0,
			panY: 0,
			annotations: [],
		}));
		setActiveSlot("right");
		showToast(`Атлас «${pathology.titleRu}» выведен в демонстрационный экран`, "success");
	};

	// Snapshot (Camera) Action — Captures composite comparison card
	const handleTakeSnapshot = () => {
		const snapshotDataUrl = captureCompositeSnapshot({
			leftCanvas: leftCanvasRef.current,
			rightCanvas: rightCanvasRef.current,
			leftTitle: leftViewport.title,
			rightTitle: rightViewport.title,
			patientName,
			patientCardNumber,
		});

		if (snapshotDataUrl) {
			if (onSaveSnapshot) {
				onSaveSnapshot(snapshotDataUrl);
			}
			showToast("Снимок консультации (Сплит) успешно сохранён в карту пациента", "success");
		} else {
			showToast("Не удалось сформировать снимок экрана", "error");
		}
	};

	// 1-Click Form 043/u Consultation Protocol Injection
	const handleInsertConsultationNote = () => {
		const isAtlas = splitMode === "atlas";
		const targetTooth = leftViewport.toothCode || activeToothFdi;
		const note = buildForm043ConsultationStatement({
			isAtlas,
			targetTooth,
			leftTitle: leftViewport.title,
			leftSubtitle: leftViewport.subtitle,
			rightTitle: rightViewport.title,
			rightSubtitle: rightViewport.subtitle,
		});

		applyRadiologyProtocolToForm043({
			protocol: note,
			options: {
				toothFdi:
					leftViewport.toothCode || activeToothFdi
						? String(leftViewport.toothCode || activeToothFdi)
						: undefined,
				modalityLabel: isAtlas ? "Консультация (Атлас)" : "Сплит «До / После»",
			},
			onInsertToProtocol: onInsertProtocol,
			showNotification: true,
			copyToClipboard: true,
		});
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

	// Assign selected study to a specific slot (Left or Right)
	const handleAssignStudyToSlot = useCallback(
		(study: RadiologyStudy | RadiologyFilmstripItem, slot: ConsultationSlot) => {
			const imgSrc = study.imageUrl || study.thumbnailUrl || "";
			const dateStr = formatFilmstripDateTime(study.studyDate).dateStr;
			const title =
				(study as any).title ||
				(study as any).studyDescription ||
				(slot === "left" ? "Снимок ДО лечения" : "Контроль ПОСЛЕ лечения");

			const updater = (prev: ViewportState) => ({
				...prev,
				imageSrc: imgSrc,
				title,
				subtitle: dateStr,
				toothCode: study.teethFdi?.[0] || prev.toothCode,
				zoom: 1.0,
				panX: 0,
				panY: 0,
			});

			if (slot === "left") {
				setLeftViewport(updater);
			} else {
				setRightViewport(updater);
			}
			setActiveSlot(slot);
			showToast(
				`Снимок назначен в ${slot === "left" ? "левое окно (До)" : "правое окно (После)"}`,
				"info",
			);
		},
		[],
	);

	// Add note to consilium log
	const handleAddNote = useCallback(
		(text: string) => {
			if (!text.trim()) return;
			const newNote: ConsultationNoteItem = {
				id: `note-${Date.now()}`,
				authorRole: "surgeon",
				authorName: "Д-р Романенко А. И.",
				text: text.trim(),
				timestamp: formatConsultationTimestamp(),
				targetTooth: activeToothFdi ? String(activeToothFdi) : "16",
			};
			setNotes((prev) => [...prev, newNote]);
			showToast("Заметка консилиума добавлена", "success");
		},
		[activeToothFdi],
	);

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
		isSyncSlices,
		currentZMm,
		handleStepSliceZ,
		sliceSyncState,
		baselineBone,
		followupBone,
		activeTool,
		setActiveTool,
		annotationColor,
		laserPoint,
		isFullscreen,
		setIsFullscreen,
		selectedDiscipline,
		setSelectedDiscipline,
		effectivePatientStudies,
		leftViewport,
		rightViewport,
		activeStudySrc,
		participants,
		setParticipants,
		isParticipantsBarOpen,
		setIsParticipantsBarOpen,
		notes,
		setNotes,
		isNotesPanelOpen,
		setIsNotesPanelOpen,
		handleAddNote,
		leftCanvasRef,
		rightCanvasRef,
		containerRef,
		handleViewportWheel,
		handleCanvasMouseDown,
		handleCanvasMouseMove,
		handleCanvasMouseUp,
		handleResetView,
		handleClearAnnotations,
		handleToggleInvert,
		handleSelectCapturedStudy,
		handleSelectPathology,
		handleTakeSnapshot,
		handleInsertConsultationNote,
		handleToggleSplitMode,
		handleAssignStudyToSlot,
	};
}
