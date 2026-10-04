/**
 * DENTE CRM — Canonical EzDent-i Consultation Split Workstation (RadiologyConsultationSplit)
 *
 * Implements:
 * 1. Synchronous Dual-View Split (Side-by-Side Left/Right Viewports) - EzDent-i Screenshot 25
 * 2. Active slot focus indicator with 3px #00C853 emerald border
 * 3. Chairside clinical Pre/Post-op Comparison Mode ("До / После") as primary clinical workflow
 * 4. Clinical Reference Pathology Atlas Mode with authentic diagnostic radiographs (Zero SVG tooth cartoons!)
 * 5. Interactive Patient Presentation Tools:
 *    - Synchronized Pan & Zoom toggle (mirrored navigation across viewports)
 *    - Photon Laser Pointer spotlight tool with synchronized cursor projection
 *    - Freehand drawing and vector arrow markers
 * 6. Two-Section Bottom Dock (Screenshot 25):
 *    - Left: СНИМКИ ПАЦИЕНТА (Captured X-ray/RVG/CBCT studies with 1-click Left/Right slot assignment)
 *    - Right: КОНТРОЛЬ ПОСЛЕ ОПЕРАЦИИ / АТЛАС ПАТОЛОГИЙ (Pre/Post comparison vs 8 disciplines atlas)
 * 7. Snapshot (Camera) tool: combines viewports into composite card snapshot
 * 8. 1-Click Consultation Protocol insertion into Medical Card Form 043/u
 *
 * Standards: EzDent-i Screenshots 25 & 26; Mandate 8b (<=800 lines); Mandate 8e (Doctor Autonomy).
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
	CONSULTATION_PATHOLOGY_CATALOG,
	type DentalDisciplineId,
	type ConsultationPathologyItem,
} from "./ConsultationPathologyLibrary.js";
import { formatFilmstripDateTime, type RadiologyFilmstripItem } from "./RadiologyFilmstripDock.js";
import { teardownViewportCanvases } from "../../utils/viewportTeardownHelper.js";
import { applyRadiologyProtocolToForm043 } from "./radiologyProtocols.js";
import { showToast } from "../GlobalToast.js";
import type { RadiologyStudy } from "./types.js";
import {
	type ConsultationSlot,
	type ViewportAnnotation,
	type ViewportState,
	getImageCoords,
	renderViewportToCanvas,
	captureCompositeSnapshot,
} from "./consultationCanvasRenderers.js";
import { ConsultationTopToolbar, type ConsultationSplitMode } from "./ConsultationTopToolbar.js";
import { ConsultationBottomDock } from "./ConsultationBottomDock.js";
import { ConsultationViewportPane } from "./ConsultationViewportPane.js";
import {
	computeSynchronizedSliceIndices,
	type BoneDimensionPoint,
	type StudySliceSeriesInfo,
} from "./cbctComparisonMath.js";

export type { ConsultationSlot, ViewportAnnotation, ViewportState };

export interface RadiologyConsultationSplitProps {
	readonly patientName?: string | undefined;
	readonly patientCardNumber?: string | undefined;
	readonly patientAge?: string | number | undefined;
	readonly patientGender?: string | undefined;
	readonly activeToothFdi?: string | number | undefined;
	readonly initialLeftStudy?: RadiologyStudy | RadiologyFilmstripItem | undefined;
	readonly initialRightStudy?: RadiologyStudy | RadiologyFilmstripItem | undefined;
	readonly patientStudiesHistory?: readonly (RadiologyStudy | RadiologyFilmstripItem)[] | undefined;
	readonly initialSplitMode?: ConsultationSplitMode | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly onInsertProtocol?: ((note: string) => void) | undefined;
	readonly onSaveSnapshot?: ((dataUrl: string) => void) | undefined;
}

export const RadiologyConsultationSplit: React.FC<RadiologyConsultationSplitProps> = ({
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
}) => {
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
	const [currentZMm, setCurrentZMm] = useState<number>(25.0);

	// Bone measurements for Pre-op (baseline) and Post-op (followup)
	const [_baselineBone] = useState<BoneDimensionPoint>({
		heightMm: 7.5,
		widthMm: 5.0,
		densityHU: 420,
		toothFdi: activeToothFdi ? String(activeToothFdi) : "16",
		measurementDate: "12.01.2024",
	});

	const [_followupBone] = useState<BoneDimensionPoint>({
		heightMm: 11.7,
		widthMm: 6.5,
		densityHU: 840,
		toothFdi: activeToothFdi ? String(activeToothFdi) : "16",
		measurementDate: "15.07.2024",
	});

	// Synchronized slice calculation with slice thickness compensation
	const _sliceSyncState = useMemo(() => {
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
	const [activeTool, setActiveTool] = useState<"pan" | "laser" | "arrow" | "pencil" | "eraser">(
		"pan",
	);
	const [annotationColor] = useState<string>("#ef4444"); // Red highlight by default

	// Laser pointer coordinates (in image plane coordinates)
	const [laserPoint, setLaserPoint] = useState<{ x: number; y: number } | null>(null);

	// Fullscreen Presentation Mode
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

	// 8 Dental Disciplines State
	const [selectedDiscipline, setSelectedDiscipline] = useState<DentalDisciplineId>("conservative");

	// Effective guaranteed patient studies list
	const effectivePatientStudies = useMemo(() => {
		if (patientStudiesHistory.length > 0) return patientStudiesHistory;
		return [
			{
				id: "sample-study-baseline-pathology",
				imageUrl: "/radiology/sample_rvg_pathology.jpg",
				thumbnailUrl: "/radiology/sample_rvg_pathology.jpg",
				title: "Снимок ДО лечения (Кариес / Очаг)",
				studyDate: "2024-01-12T09:15:00.000Z",
				modality: "IO_SENSOR",
				teethFdi: ["16"],
			},
			{
				id: "sample-study-followup-obturation",
				imageUrl: "/radiology/sample_rvg_tooth16.jpg",
				thumbnailUrl: "/radiology/sample_rvg_tooth16.jpg",
				title: "Контроль ПОСЛЕ лечения (Обтурация каналов)",
				studyDate: "2024-05-16T10:45:00.000Z",
				modality: "IO_SENSOR",
				teethFdi: ["16"],
			},
		] as (RadiologyStudy | RadiologyFilmstripItem)[];
	}, [patientStudiesHistory]);

	// Viewports state
	const [leftViewport, setLeftViewport] = useState<ViewportState>(() => {
		const s = initialLeftStudy || effectivePatientStudies[0];
		return {
			imageSrc: s?.imageUrl || s?.thumbnailUrl || "/radiology/sample_rvg_pathology.jpg",
			title:
				(s as any)?.title ||
				(s as any)?.studyDescription ||
				(s?.teethFdi?.[0] ? `Снимок зуба ${s.teethFdi[0]} (ДО)` : "Снимок ДО лечения"),
			subtitle: s?.studyDate ? formatFilmstripDateTime(s.studyDate).dateStr : "12.01.2024",
			toothCode: s?.teethFdi?.[0] || (activeToothFdi ? String(activeToothFdi) : "16"),
			zoom: 1.0,
			panX: 0,
			panY: 0,
			invert: false,
			sharpness: false,
			annotations: [],
		};
	});

	const [rightViewport, setRightViewport] = useState<ViewportState>(() => {
		if (initialRightStudy) {
			const s = initialRightStudy;
			return {
				imageSrc: s.imageUrl || s.thumbnailUrl || "/radiology/sample_rvg_tooth16.jpg",
				title:
					(s as any)?.title ||
					(s as any)?.studyDescription ||
					"Контроль ПОСЛЕ лечения (Обтурация)",
				subtitle: s.studyDate ? formatFilmstripDateTime(s.studyDate).dateStr : "16.05.2024",
				toothCode: s.teethFdi?.[0] || (activeToothFdi ? String(activeToothFdi) : "16"),
				zoom: 1.0,
				panX: 0,
				panY: 0,
				invert: false,
				sharpness: false,
				annotations: [],
			};
		}

		if (splitMode === "atlas") {
			const defaultPathology =
				CONSULTATION_PATHOLOGY_CATALOG[1] || CONSULTATION_PATHOLOGY_CATALOG[0]!;
			return {
				imageSrc: defaultPathology.imageUrl || defaultPathology.previewUrl || "/radiology/sample_rvg_tooth16.jpg",
				title: defaultPathology.titleRu,
				subtitle: `${defaultPathology.code} · ${defaultPathology.titleEn}`,
				toothCode: activeToothFdi ? String(activeToothFdi) : undefined,
				zoom: 1.0,
				panX: 0,
				panY: 0,
				invert: false,
				sharpness: false,
				annotations: [],
			};
		}

		// Default: Comparison mode post-op follow-up study
		const s =
			effectivePatientStudies.length >= 2
				? effectivePatientStudies[effectivePatientStudies.length - 1]
				: undefined;
		return {
			imageSrc: s?.imageUrl || s?.thumbnailUrl || "/radiology/sample_rvg_tooth16.jpg",
			title:
				(s as any)?.title ||
				(s as any)?.studyDescription ||
				"Контроль ПОСЛЕ лечения (Обтурация каналов)",
			subtitle: s?.studyDate ? formatFilmstripDateTime(s.studyDate).dateStr : "16.05.2024",
			toothCode: s?.teethFdi?.[0] || (activeToothFdi ? String(activeToothFdi) : "16"),
			zoom: 1.0,
			panX: 0,
			panY: 0,
			invert: false,
			sharpness: false,
			annotations: [],
		};
	});

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
		const note = isAtlas
			? `Проведена клиническая консультация (Атлас патологий DENTE): сопоставлены рентгенограмма пациента и анатомический эталон («${rightViewport.title}»). Пациенту наглядно продемонстрированы анатомические ориентиры, обоснован план комплексной санации и согласован протокол лечения.`
			: `Проведена клиническая консультация (Сплит-сопоставление «До / После»): сопоставлены снимок зуба №${leftViewport.toothCode || "16"} до начала лечения («${leftViewport.title}», ${leftViewport.subtitle}) и контрольный снимок после лечения («${rightViewport.title}», ${rightViewport.subtitle}). Пациенту наглядно продемонстрирован результат лечения, согласован протокол реабилитации.`;

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
			const defaultPathology =
				CONSULTATION_PATHOLOGY_CATALOG[1] || CONSULTATION_PATHOLOGY_CATALOG[0]!;
			const src =
				defaultPathology.imageUrl || defaultPathology.previewUrl || "/radiology/sample_rvg_tooth16.jpg";
			setRightViewport((rv) => ({
				...rv,
				imageSrc: src,
				title: defaultPathology.titleRu,
				subtitle: `${defaultPathology.code} · ${defaultPathology.titleEn}`,
				zoom: 1.0,
				panX: 0,
				panY: 0,
				annotations: [],
			}));
			showToast("Режим Анатомического атласа активирован", "info");
		} else {
			// Revert right viewport to follow-up patient X-ray
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
	}, [splitMode, effectivePatientStudies]);

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

	// Current active study image source for bottom dock highlight
	const activeStudySrc = activeSlot === "left" ? leftViewport.imageSrc : rightViewport.imageSrc;
	const resolvedGender =
		patientGender ||
		(patientName.includes("Роман") || patientName.endsWith("ич") ? "Муж." : "Жен.");

	return (
		<div
			ref={containerRef}
			data-testid="radiology-consultation-split"
			style={{
				position: isFullscreen ? "fixed" : "relative",
				inset: isFullscreen ? 0 : "auto",
				zIndex: isFullscreen ? 99999 : "auto",
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				backgroundColor: "#020617",
				color: "#f8fafc",
				userSelect: "none",
				overflow: "hidden",
			}}
			className="radiology-consultation-split"
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    1. TOP CLINICAL TOOLBAR (Strict 32-36px Desktop Density)
			    ═══════════════════════════════════════════════════════════════════ */}
			<ConsultationTopToolbar
				patientName={patientName}
				patientCardNumber={patientCardNumber}
				patientAge={patientAge}
				patientGender={resolvedGender}
				activeSlot={activeSlot}
				onSelectSlot={setActiveSlot}
				splitMode={splitMode}
				onToggleSplitMode={handleToggleSplitMode}
				activeTool={activeTool}
				onSelectTool={setActiveTool}
				isSyncNav={isSyncNav}
				onToggleSyncNav={() => setIsSyncNav((prev) => !prev)}
				onResetView={handleResetView}
				onToggleInvert={handleToggleInvert}
				onClearAnnotations={handleClearAnnotations}
				onTakeSnapshot={handleTakeSnapshot}
				onInsertProtocol={handleInsertConsultationNote}
				isFullscreen={isFullscreen}
				onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
				onClose={onClose}
			/>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. DUAL-VIEWPORT MAIN STAGE (Screenshots 25 & 26 Side-by-Side)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="flex-1 flex overflow-hidden p-2 gap-2 bg-[#020617]">
				{/* LEFT VIEWPORT: PRIMARY / PRE-OP STUDY */}
				<ConsultationViewportPane
					slot="left"
					isActive={activeSlot === "left"}
					state={leftViewport}
					splitMode={splitMode}
					canvasRef={leftCanvasRef}
					activeTool={activeTool}
					onSelectSlot={setActiveSlot}
					onWheel={handleViewportWheel}
					onMouseDown={handleCanvasMouseDown}
					onMouseMove={handleCanvasMouseMove}
					onMouseUp={handleCanvasMouseUp}
				/>

				{/* RIGHT VIEWPORT: FOLLOWUP / POST-OP STUDY / CLINICAL REFERENCE */}
				<ConsultationViewportPane
					slot="right"
					isActive={activeSlot === "right"}
					state={rightViewport}
					splitMode={splitMode}
					canvasRef={rightCanvasRef}
					activeTool={activeTool}
					onSelectSlot={setActiveSlot}
					onWheel={handleViewportWheel}
					onMouseDown={handleCanvasMouseDown}
					onMouseMove={handleCanvasMouseMove}
					onMouseUp={handleCanvasMouseUp}
				/>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    3. TWO-SECTION BOTTOM DOCK (EzDent-i Screenshot 25 Split Filmstrip)
			    ═══════════════════════════════════════════════════════════════════ */}
			<ConsultationBottomDock
				activeSlot={activeSlot}
				activeStudySrc={activeStudySrc}
				patientStudiesHistory={effectivePatientStudies}
				selectedDiscipline={selectedDiscipline}
				onSelectDiscipline={setSelectedDiscipline}
				onSelectCapturedStudy={handleSelectCapturedStudy}
				onSelectPathology={handleSelectPathology}
				splitMode={splitMode}
				onAssignStudyToSlot={handleAssignStudyToSlot}
			/>
		</div>
	);
};
