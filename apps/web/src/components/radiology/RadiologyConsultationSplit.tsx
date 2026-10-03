/**
 * DENTE CRM — Canonical EzDent-i Consultation Split Workstation (RadiologyConsultationSplit)
 *
 * Implements:
 * 1. Synchronous Dual-View Split (Side-by-Side Left/Right Viewports) - EzDent-i Screenshot 25
 * 2. Active slot focus indicator with 3px #00C853 emerald border
 * 3. Synchronized Zoom & Pan toggle (mirrored navigation across viewports)
 * 4. Chairside Vector Annotations layer: Freehand drawing, Arrows, and Text labels
 * 5. Two-Section Bottom Dock (Screenshot 25):
 *    - Left: ЗАХВАЧЕННЫЕ СНИМКИ (Patient captured X-ray/RVG/CBCT studies with active green pill)
 *    - Right: КОНСУЛЬТАЦИЯ СОДЕРЖАНИЯ (Clinical demonstration cases from 8 dental disciplines)
 * 6. Category selector for 8 dental disciplines (Screenshot 26)
 * 7. Snapshot (Camera) tool: combines viewports into composite card snapshot
 * 8. 1-Click Consultation Protocol insertion into Medical Card Form 043/u
 *
 * Standards: EzDent-i Screenshots 25 & 26; Mandate 8b (<=800 lines); Mandate 8e (Doctor Autonomy).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { ConsultationTopToolbar } from "./ConsultationTopToolbar.js";
import { ConsultationBottomDock } from "./ConsultationBottomDock.js";
import { ConsultationDynamicsHud } from "./ConsultationDynamicsHud.js";
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
	readonly initialSplitMode?: "consultation" | "dynamics" | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly onInsertProtocol?: ((note: string) => void) | undefined;
	readonly onSaveSnapshot?: ((dataUrl: string) => void) | undefined;
}

export const RadiologyConsultationSplit: React.FC<RadiologyConsultationSplitProps> = ({
	patientName = "Чухрова Лариса",
	patientCardNumber = "20190621_101042",
	patientAge = "58Y",
	patientGender = "Жен.",
	activeToothFdi,
	initialLeftStudy,
	initialRightStudy,
	patientStudiesHistory = [],
	initialSplitMode,
	onClose,
	onInsertProtocol,
	onSaveSnapshot,
}) => {
	// Mode: consultation (catalogue) vs dynamics (Pre/Post-op CT comparison)
	const [splitMode, setSplitMode] = useState<"consultation" | "dynamics">(
		initialSplitMode ?? "consultation",
	);

	// Active slot focus (Left vs Right)
	const [activeSlot, setActiveSlot] = useState<ConsultationSlot>("left");

	// Synchronous Pan & Zoom toggle (EzDent-i Screenshot 25 invariant)
	const [isSyncNav, setIsSyncNav] = useState<boolean>(true);

	// Synchronous Slice Z-scroll toggle & physical Z coordinate
	const [isSyncSlices, setIsSyncSlices] = useState<boolean>(true);
	const [currentZMm, setCurrentZMm] = useState<number>(25.0);

	// Bone measurements for Pre-op (baseline) and Post-op (followup)
	const [baselineBone, setBaselineBone] = useState<BoneDimensionPoint>({
		heightMm: 7.5,
		widthMm: 5.0,
		densityHU: 420,
		toothFdi: activeToothFdi ? String(activeToothFdi) : "16",
		measurementDate: "12.01.2024",
	});

	const [followupBone, setFollowupBone] = useState<BoneDimensionPoint>({
		heightMm: 11.7,
		widthMm: 6.5,
		densityHU: 840,
		toothFdi: activeToothFdi ? String(activeToothFdi) : "16",
		measurementDate: "15.07.2024",
	});

	// Synchronized slice calculation with slice thickness compensation
	const sliceSyncState = React.useMemo(() => {
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

	// Active Interactive Tool
	const [activeTool, setActiveTool] = useState<"pan" | "arrow" | "pencil" | "eraser">("pan");
	const [annotationColor] = useState<string>("#ef4444"); // Red highlight by default

	// Fullscreen Presentation Mode
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

	// 8 Dental Disciplines State
	const [selectedDiscipline, setSelectedDiscipline] = useState<DentalDisciplineId>("conservative");

	// Viewports state
	const [leftViewport, setLeftViewport] = useState<ViewportState>(() => {
		const s = initialLeftStudy;
		return {
			imageSrc: s?.imageUrl || s?.thumbnailUrl || "/radiology/sample_rvg_tooth16.jpg",
			title:
				(s as any)?.title ||
				(s as any)?.studyDescription ||
				(s?.teethFdi?.[0] ? `Снимок зуба ${s.teethFdi[0]}` : "Снимок ДО лечения"),
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

	const [rightViewport, setRightViewport] = useState<ViewportState>(() => {
		const s =
			initialRightStudy ||
			(initialSplitMode === "dynamics" && patientStudiesHistory.length >= 2
				? patientStudiesHistory[patientStudiesHistory.length - 1]
				: undefined);
		const defaultPathology = CONSULTATION_PATHOLOGY_CATALOG[1] || CONSULTATION_PATHOLOGY_CATALOG[0];
		return {
			imageSrc: s?.imageUrl || s?.thumbnailUrl || defaultPathology?.previewSvg || "",
			title:
				(s as any)?.title ||
				(s as any)?.studyDescription ||
				(initialSplitMode === "dynamics" ? "Контроль ПОСЛЕ операции" : defaultPathology?.titleRu) ||
				"Клинический эталон (Консультация)",
			subtitle: s?.studyDate ? formatFilmstripDateTime(s.studyDate).dateStr : "Обтурация каналов",
			toothCode: s?.teethFdi?.[0] || undefined,
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

	// Render both viewports
	const renderBoth = useCallback(() => {
		renderViewportToCanvas({
			canvas: leftCanvasRef.current,
			img: leftImgRef.current,
			state: leftViewport,
			isActive: activeSlot === "left",
			draftPoints,
			activeTool,
			annotationColor,
		});
		renderViewportToCanvas({
			canvas: rightCanvasRef.current,
			img: rightImgRef.current,
			state: rightViewport,
			isActive: activeSlot === "right",
			draftPoints,
			activeTool,
			annotationColor,
		});
	}, [activeSlot, draftPoints, activeTool, annotationColor, leftViewport, rightViewport]);

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
		if (!rightViewport.imageSrc.startsWith("data:") && !rightViewport.imageSrc.startsWith("blob:")) {
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

	// Mouse Down (Pan vs Annotation Drawing)
	const handleCanvasMouseDown = (slot: ConsultationSlot, e: React.MouseEvent<HTMLCanvasElement>) => {
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
			const pt = getImageCoords(canvas, state, { width: img.naturalWidth, height: img.naturalHeight }, e.clientX, e.clientY);
			setDraftPoints([pt]);
		}
	};

	const handleCanvasMouseMove = (slot: ConsultationSlot, e: React.MouseEvent<HTMLCanvasElement>) => {
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
			const pt = getImageCoords(canvas, state, { width: img.naturalWidth, height: img.naturalHeight }, e.clientX, e.clientY);
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
	};

	// Clear Annotations
	const handleClearAnnotations = () => {
		if (activeSlot === "left") {
			setLeftViewport((prev) => ({ ...prev, annotations: [] }));
		} else {
			setRightViewport((prev) => ({ ...prev, annotations: [] }));
		}
		setDraftPoints([]);
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
		showToast(`Загружен снимок в ${activeSlot === "left" ? "левое" : "правое"} окно`, "info");
	};

	// Select Pathology from Consultation Catalog
	const handleSelectPathology = (pathology: ConsultationPathologyItem) => {
		// By default, load pathology into right slot for instant comparison with patient on left
		setRightViewport((prev) => ({
			...prev,
			imageSrc: pathology.previewSvg,
			title: pathology.titleRu,
			subtitle: `${pathology.code} · ${pathology.titleEn}`,
			zoom: 1.0,
			panX: 0,
			panY: 0,
			annotations: [],
		}));
		setActiveSlot("right");
		showToast(`Эталон «${pathology.titleRu}» выведен в консультационный экран`, "success");
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
		const note = `Проведена клиническая консультация (EzDent-i Сплит): сопоставлены контрольные снимки пациента и эталонная схема лечения («${rightViewport.title}»). Пациенту наглядно продемонстрированы анатомические ориентиры, обоснован план комплексной санации и согласован протокол лечения.`;

		applyRadiologyProtocolToForm043({
			protocol: note,
			options: {
				toothFdi: leftViewport.toothCode || activeToothFdi ? String(leftViewport.toothCode || activeToothFdi) : undefined,
				modalityLabel: "Сплит-консультация",
			},
			onInsertToProtocol: onInsertProtocol,
			showNotification: true,
			copyToClipboard: true,
		});
	};

	// Toggle split mode between consultation and dynamics (Pre/Post-op CT comparison)
	const handleToggleSplitMode = useCallback(() => {
		setSplitMode((prev) => {
			const nextMode = prev === "consultation" ? "dynamics" : "consultation";
			if (nextMode === "dynamics") {
				// If right viewport was showing demo pathology SVG, and patient has >= 2 studies, auto-load followup study
				if (rightViewport.imageSrc.includes("data:image/svg+xml") || rightViewport.imageSrc.includes("pathology")) {
					if (patientStudiesHistory.length >= 2) {
						const postStudy = patientStudiesHistory[patientStudiesHistory.length - 1];
						if (postStudy) {
							const src = postStudy.imageUrl || postStudy.thumbnailUrl || "";
							const dateStr = formatFilmstripDateTime(postStudy.studyDate).dateStr;
							setRightViewport((rv) => ({
								...rv,
								imageSrc: src,
								title: (postStudy as any).title || (postStudy as any).studyDescription || "Контроль ПОСЛЕ операции",
								subtitle: dateStr,
								toothCode: postStudy.teethFdi?.[0] || rv.toothCode,
							}));
						}
					} else {
						setRightViewport((rv) => ({
							...rv,
							title: "Контроль ПОСЛЕ операции",
							subtitle: "Контрольное исследование",
						}));
					}
				}
				showToast("Режим сравнения динамики КТ (До / После) активирован", "info");
			} else {
				showToast("Режим консультации и клинических эталонов активирован", "info");
			}
			return nextMode;
		});
	}, [patientStudiesHistory, rightViewport.imageSrc]);

	// Assign selected study to a specific slot (Left or Right)
	const handleAssignStudyToSlot = useCallback(
		(study: RadiologyStudy | RadiologyFilmstripItem, slot: ConsultationSlot) => {
			const imgSrc = study.imageUrl || study.thumbnailUrl || "";
			const dateStr = formatFilmstripDateTime(study.studyDate).dateStr;
			const title =
				(study as any).title ||
				(study as any).studyDescription ||
				(slot === "left" ? "Снимок ДО операции" : "Контроль ПОСЛЕ операции");

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
			showToast(`Снимок назначен в ${slot === "left" ? "левое (До)" : "правое (После)"} окно`, "info");
		},
		[],
	);

	// 1-Click Form 043/u bone dynamics protocol injection
	const handleInsertDynamicsProtocol = useCallback(
		(protocolText: string) => {
			applyRadiologyProtocolToForm043({
				protocol: protocolText,
				options: {
					toothFdi: leftViewport.toothCode || (activeToothFdi ? String(activeToothFdi) : "16"),
					modalityLabel: "Динамика КТ",
				},
				onInsertToProtocol: onInsertProtocol,
				showNotification: true,
				copyToClipboard: true,
			});
		},
		[leftViewport.toothCode, activeToothFdi, onInsertProtocol],
	);

	// Current active study image source for bottom dock highlight
	const activeStudySrc = activeSlot === "left" ? leftViewport.imageSrc : rightViewport.imageSrc;

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
				patientGender={patientGender}
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
				{/* LEFT VIEWPORT */}
				<div
					data-testid="viewport-left-container"
					onClick={() => setActiveSlot("left")}
					style={{
						flex: 1,
						position: "relative",
						borderRadius: "8px",
						overflow: "hidden",
						backgroundColor: "#1e293b",
						border: activeSlot === "left" ? "3px solid #00C853" : "1px solid #1e293b",
						boxShadow: activeSlot === "left" ? "0 0 16px rgba(0, 200, 83, 0.4)" : "none",
					}}
					className="viewport-left flex flex-col transition-all duration-150"
				>
					{/* Header Pill */}
					<div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-[#070b14]/90 backdrop-blur-xs px-2.5 py-1 rounded border border-[#334155]">
						<span className="w-2 h-2 rounded-full bg-[#10b981]" />
						{splitMode === "dynamics" && (
							<span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">
								До операции
							</span>
						)}
						<span className="text-[11px] font-bold text-white">{leftViewport.title}</span>
						{leftViewport.toothCode && (
							<span className="text-[10px] font-mono font-bold px-1 rounded bg-[#00C853] text-[#022c15]">
								#{leftViewport.toothCode}
							</span>
						)}
						<span className="text-[10px] text-slate-400 font-mono">{leftViewport.subtitle}</span>
						{splitMode === "dynamics" && (
							<span className="text-[10px] text-cyan-300 font-mono bg-[#0f172a] px-1.5 py-0.5 rounded border border-[#334155]">
								Срез #{sliceSyncState.baselineIndex + 1}/{sliceSyncState.baselineMaxIndex + 1}
							</span>
						)}
					</div>

					<canvas
						ref={leftCanvasRef}
						data-testid="consultation-canvas-left"
						className="w-full h-full block"
						style={{ cursor: activeTool === "pan" ? "grab" : "crosshair" }}
						onWheel={(e) => handleViewportWheel("left", e)}
						onMouseDown={(e) => handleCanvasMouseDown("left", e)}
						onMouseMove={(e) => handleCanvasMouseMove("left", e)}
						onMouseUp={() => handleCanvasMouseUp("left")}
						onContextMenu={(e) => e.preventDefault()}
					/>
				</div>

				{/* RIGHT VIEWPORT */}
				<div
					data-testid="viewport-right-container"
					onClick={() => setActiveSlot("right")}
					style={{
						flex: 1,
						position: "relative",
						borderRadius: "8px",
						overflow: "hidden",
						backgroundColor: "#1e293b",
						border: activeSlot === "right" ? "3px solid #00C853" : "1px solid #1e293b",
						boxShadow: activeSlot === "right" ? "0 0 16px rgba(0, 200, 83, 0.4)" : "none",
					}}
					className="viewport-right flex flex-col transition-all duration-150"
				>
					{/* Header Pill */}
					<div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-[#070b14]/90 backdrop-blur-xs px-2.5 py-1 rounded border border-[#334155]">
						<span className="w-2 h-2 rounded-full bg-[#06b6d4]" />
						{splitMode === "dynamics" && (
							<span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60">
								После операции
							</span>
						)}
						<span className="text-[11px] font-bold text-white">{rightViewport.title}</span>
						{rightViewport.toothCode && (
							<span className="text-[10px] font-mono font-bold px-1 rounded bg-[#06b6d4] text-[#042f2e]">
								#{rightViewport.toothCode}
							</span>
						)}
						<span className="text-[10px] text-slate-400 font-mono">{rightViewport.subtitle}</span>
						{splitMode === "dynamics" && (
							<span className="text-[10px] text-cyan-300 font-mono bg-[#0f172a] px-1.5 py-0.5 rounded border border-[#334155]">
								Срез #{sliceSyncState.followupIndex + 1}/{sliceSyncState.followupMaxIndex + 1}
							</span>
						)}
					</div>

					<canvas
						ref={rightCanvasRef}
						data-testid="consultation-canvas-right"
						className="w-full h-full block"
						style={{ cursor: activeTool === "pan" ? "grab" : "crosshair" }}
						onWheel={(e) => handleViewportWheel("right", e)}
						onMouseDown={(e) => handleCanvasMouseDown("right", e)}
						onMouseMove={(e) => handleCanvasMouseMove("right", e)}
						onMouseUp={() => handleCanvasMouseUp("right")}
						onContextMenu={(e) => e.preventDefault()}
					/>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    2b. TREATMENT DYNAMICS BONE GAIN HUD (Rendered when splitMode === "dynamics")
			    ═══════════════════════════════════════════════════════════════════ */}
			{splitMode === "dynamics" && (
				<div className="px-2 pb-1.5 shrink-0">
					<ConsultationDynamicsHud
						toothFdi={leftViewport.toothCode || (activeToothFdi ? String(activeToothFdi) : "16")}
						baselineBone={baselineBone}
						followupBone={followupBone}
						onChangeBaselineBone={setBaselineBone}
						onChangeFollowupBone={setFollowupBone}
						sliceSyncState={sliceSyncState}
						isSyncSlices={isSyncSlices}
						onToggleSyncSlices={() => setIsSyncSlices((prev) => !prev)}
						onStepSliceZ={handleStepSliceZ}
						onInsertDynamicsProtocol={handleInsertDynamicsProtocol}
						baselineStudyDate={leftViewport.subtitle}
						followupStudyDate={rightViewport.subtitle}
					/>
				</div>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			    3. TWO-SECTION BOTTOM DOCK (EzDent-i Screenshot 25 Split Filmstrip)
			    ═══════════════════════════════════════════════════════════════════ */}
			<ConsultationBottomDock
				activeSlot={activeSlot}
				activeStudySrc={activeStudySrc}
				patientStudiesHistory={patientStudiesHistory}
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
