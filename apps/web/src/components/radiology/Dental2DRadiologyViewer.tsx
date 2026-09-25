/**
 * DENTE CRM — Practical 2D Dental Radiology Viewer
 * 2D Viewer for OPG (Orthopantomogram), RVG (Radiovisiograph), and CBCT slices.
 * 1-click FDI tooth binding (11..48), calibrated measurement ruler (mm),
 * negative inversion, and 1-click Chairside Patient Presentation Mode.
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Minimize2, UploadCloud } from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	CLINICAL_2D_WL_PRESETS,
	DEFAULT_MODALITY_PIXEL_SPACING,
	calculatePhysicalDistanceMm,
	formatDistanceMm,
	type ClinicalWlPreset,
	type ViewerPoint2D,
	type ViewerRulerMeasurement,
} from "./dentalViewerMath";
import { DentalToothFdiSelector } from "./DentalToothFdiSelector";
import { Dental2DRadiologyToolbar } from "./Dental2DRadiologyToolbar";
import { Dental2DRadiologySubToolbar } from "./Dental2DRadiologySubToolbar";
import { Dental2DRadiologyRulerOverlay } from "./Dental2DRadiologyRulerOverlay";
import type { RadiologyModality, RadiologyStudy } from "./types";

export interface Dental2DRadiologyViewerProps {
	readonly study?: RadiologyStudy | null;
	readonly initialImageSrc?: string | null;
	readonly title?: string;
	readonly modality?: RadiologyModality | "optg" | "opg" | "rvg" | "cbct_slice" | "periapical";
	readonly initialToothFdi?: string | null;
	readonly patientName?: string;
	readonly studyDate?: string;
	readonly onToothChange?: (toothFdi: string) => void;
	readonly onInsertNormaTo043?: (text: string) => void;
	readonly onExport?: (dataUrl: string, filename: string) => void;
	readonly onClose?: () => void;
	readonly isChairsideFullscreen?: boolean;
}

export const Dental2DRadiologyViewer: React.FC<Dental2DRadiologyViewerProps> = ({
	study,
	initialImageSrc,
	title = "Дентальный снимок 2D",
	modality = "intraoral_rvg",
	initialToothFdi,
	patientName,
	studyDate,
	onToothChange,
	onInsertNormaTo043,
	onExport,
	onClose,
	isChairsideFullscreen: initialFullscreen = false,
}) => {
	// Resolved Image Source
	const [imageSrc, setImageSrc] = useState<string | null>(
		initialImageSrc || study?.imageUrl || null,
	);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Tooth FDI Binding (11..48)
	const [activeToothFdi, setActiveToothFdi] = useState<string | null>(
		initialToothFdi || (study?.teethFdi && study.teethFdi[0]) || null,
	);
	const [showToothSelector, setShowToothSelector] = useState(false);

	// Clinical Image Adjustment States
	const [brightness, setBrightness] = useState<number>(100);
	const [contrast, setContrast] = useState<number>(100);
	const [invert, setInvert] = useState<boolean>(false);
	const [zoom, setZoom] = useState<number>(1.0);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [rotationDeg, setRotationDeg] = useState<number>(0);
	const [flipHorizontal, setFlipHorizontal] = useState<boolean>(false);
	const [activePresetId, setActivePresetId] = useState<string>("standard");

	// Active Interaction Tool: "pan" | "ruler"
	const [activeTool, setActiveTool] = useState<"pan" | "ruler">("pan");

	// Calibrated Ruler Tool States
	const [measurements, setMeasurements] = useState<ViewerRulerMeasurement[]>([]);
	const [rulerStart, setRulerStart] = useState<ViewerPoint2D | null>(null);
	const [currentRulerEnd, setCurrentRulerEnd] = useState<ViewerPoint2D | null>(null);
	const [mmPerPixel, setMmPerPixel] = useState<number>(() => {
		const key = String(modality).toLowerCase();
		return DEFAULT_MODALITY_PIXEL_SPACING[key] || 0.04;
	});

	// Chairside Patient Presentation Mode
	const [isPresentationMode, setIsPresentationMode] = useState<boolean>(initialFullscreen);

	// Canvas / Viewport References
	const viewportRef = useRef<HTMLDivElement>(null);
	const imgRef = useRef<HTMLImageElement>(null);
	const isDraggingRef = useRef<boolean>(false);
	const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const panStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

	// Sync initial image
	useEffect(() => {
		if (initialImageSrc) {
			setImageSrc(initialImageSrc);
		} else if (study?.imageUrl) {
			setImageSrc(study.imageUrl);
		}
	}, [initialImageSrc, study?.imageUrl]);

	// 1-Click FDI Tooth selection
	const handleSelectTooth = useCallback(
		(code: string) => {
			setActiveToothFdi(code);
			setShowToothSelector(false);
			if (onToothChange) {
				onToothChange(code);
			}
			showToast(`Снимок привязан к зубу #${code}`, "success");
		},
		[onToothChange],
	);

	// Apply Clinical W/L Preset
	const handleApplyPreset = (preset: ClinicalWlPreset) => {
		setBrightness(preset.brightness);
		setContrast(preset.contrast);
		setInvert(preset.invert);
		setActivePresetId(preset.id);
	};

	// Reset adjustments
	const handleResetView = () => {
		setBrightness(100);
		setContrast(100);
		setInvert(false);
		setZoom(1.0);
		setPan({ x: 0, y: 0 });
		setRotationDeg(0);
		setFlipHorizontal(false);
		setActivePresetId("standard");
		setActiveTool("pan");
	};

	// 1-Click Norma to 043/u (Мандат 8e)
	const handleApplyNorma = () => {
		const toothTag = activeToothFdi ? ` зуба ${activeToothFdi}` : "";
		const statement = `Рентгенологическое исследование 2D${toothTag}: норма. Периапикальные ткани без патологических изменений, периодонтальная щель равномерная. Кортикальная пластинка альвеолы прослеживается на всем протяжении.`;
		if (onInsertNormaTo043) {
			onInsertNormaTo043(statement);
		}
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(statement).catch(() => {});
		}
		showToast(`Заключение «Норма» скопировано и внесено в карту 043/у${toothTag}`, "success");
	};

	// 1-Click Export to PNG without lag
	const handleExportImage = () => {
		if (!imageSrc) return;
		const canvas = document.createElement("canvas");
		const img = imgRef.current;
		if (!img) return;

		canvas.width = img.naturalWidth || 800;
		canvas.height = img.naturalHeight || 600;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Draw with filters and transformations
		ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) ${invert ? "invert(100%)" : ""}`;
		ctx.save();
		if (flipHorizontal) {
			ctx.translate(canvas.width, 0);
			ctx.scale(-1, 1);
		}
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
		ctx.restore();

		// Burn in measurements onto export image
		ctx.filter = "none";
		ctx.lineWidth = 2.5;
		ctx.font = "bold 14px monospace";
		measurements.forEach((m) => {
			ctx.strokeStyle = "#0d9488";
			ctx.fillStyle = "#14b8a6";
			ctx.beginPath();
			ctx.moveTo(m.startX, m.startY);
			ctx.lineTo(m.endX, m.endY);
			ctx.stroke();

			// Text tag
			const midX = (m.startX + m.endX) / 2;
			const midY = (m.startY + m.endY) / 2;
			ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
			ctx.fillRect(midX - 30, midY - 14, 60, 20);
			ctx.fillStyle = "#5eead4";
			ctx.fillText(`${m.lengthMm.toFixed(1)}мм`, midX - 24, midY);
		});

		// Tooth badge watermark
		if (activeToothFdi) {
			ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
			ctx.fillRect(16, 16, 110, 28);
			ctx.fillStyle = "#2dd4bf";
			ctx.fillText(`FDI: Зуб #${activeToothFdi}`, 24, 35);
		}

		const dataUrl = canvas.toDataURL("image/png");
		const filename = `Dental_2D_Tooth_${activeToothFdi || "radiograph"}_${Date.now()}.png`;

		if (onExport) {
			onExport(dataUrl, filename);
		} else {
			const a = document.createElement("a");
			a.href = dataUrl;
			a.download = filename;
			a.click();
		}
		showToast("Снимок экспортирован в PNG", "success");
	};

	// Mouse event handlers for Pan & Ruler
	const handleMouseDown = (e: React.MouseEvent) => {
		if (e.button !== 0) return; // Only left click
		const rect = viewportRef.current?.getBoundingClientRect();
		if (!rect) return;

		const clientX = e.clientX - rect.left;
		const clientY = e.clientY - rect.top;

		if (activeTool === "pan") {
			isDraggingRef.current = true;
			dragStartPosRef.current = { x: e.clientX, y: e.clientY };
			panStartPosRef.current = { ...pan };
		} else if (activeTool === "ruler") {
			if (!rulerStart) {
				setRulerStart({ x: clientX, y: clientY });
				setCurrentRulerEnd({ x: clientX, y: clientY });
			} else {
				// Complete ruler measurement
				const lengthMm = calculatePhysicalDistanceMm(rulerStart, { x: clientX, y: clientY }, mmPerPixel);
				const newRuler: ViewerRulerMeasurement = {
					id: `ruler_${Date.now()}`,
					startX: rulerStart.x,
					startY: rulerStart.y,
					endX: clientX,
					endY: clientY,
					lengthMm,
					color: "#14b8a6",
				};
				setMeasurements((prev) => [...prev, newRuler]);
				setRulerStart(null);
				setCurrentRulerEnd(null);
				showToast(`Измерение зафиксировано: ${formatDistanceMm(lengthMm)}`, "info");
			}
		}
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (activeTool === "pan" && isDraggingRef.current) {
			const dx = e.clientX - dragStartPosRef.current.x;
			const dy = e.clientY - dragStartPosRef.current.y;
			setPan({
				x: panStartPosRef.current.x + dx,
				y: panStartPosRef.current.y + dy,
			});
		} else if (activeTool === "ruler" && rulerStart) {
			const rect = viewportRef.current?.getBoundingClientRect();
			if (!rect) return;
			setCurrentRulerEnd({
				x: e.clientX - rect.left,
				y: e.clientY - rect.top,
			});
		}
	};

	const handleMouseUp = () => {
		isDraggingRef.current = false;
	};

	// Zoom with wheel
	const handleWheel = (e: React.WheelEvent) => {
		e.preventDefault();
		const delta = e.deltaY < 0 ? 0.15 : -0.15;
		setZoom((prev) => Math.min(5.0, Math.max(0.4, prev + delta)));
	};

	// Handle local file drop/upload
	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			setImageSrc(reader.result as string);
			setMeasurements([]);
			handleResetView();
			showToast("Снимок загружен в просмотрщик", "success");
		};
		reader.readAsDataURL(file);
	};

	// Modality Display Label
	const modalityLabel = useMemo(() => {
		const mod = String(modality).toLowerCase();
		if (mod.includes("opg") || mod.includes("optg") || mod.includes("panor")) return "Ортопантомограмма (ОПТГ)";
		if (mod.includes("cbct") || mod.includes("ct")) return "КЛКТ / КТ (2D срез)";
		return "Радиовизиограф (RVG)";
	}, [modality]);

	return (
		<div
			className="dental-2d-radiology-viewer"
			style={{
				position: isPresentationMode ? "fixed" : "relative",
				inset: isPresentationMode ? 0 : "auto",
				zIndex: isPresentationMode ? 9999 : 1,
				width: "100%",
				height: isPresentationMode ? "100vh" : "100%",
				minHeight: isPresentationMode ? "100vh" : "560px",
				backgroundColor: "#070b14",
				color: "#f8fafc",
				display: "flex",
				flexDirection: "column",
				fontFamily: "inherit",
				overflow: "hidden",
				userSelect: "none",
			}}
		>
			<input
				type="file"
				ref={fileInputRef}
				accept="image/*,.dcm,.rvg,.png,.jpg,.jpeg,.webp,.tiff"
				style={{ display: "none" }}
				onChange={handleFileSelect}
			/>

			{/* Clinical 1-Row Toolbar (32-36px Desktop Dense - Mandate 8d) */}
			<Dental2DRadiologyToolbar
				title={title}
				modalityLabel={modalityLabel}
				activeToothFdi={activeToothFdi}
				onToggleToothSelector={() => setShowToothSelector((v) => !v)}
				activeTool={activeTool}
				onSelectTool={setActiveTool}
				invert={invert}
				onToggleInvert={() => setInvert((v) => !v)}
				zoom={zoom}
				onZoomIn={() => setZoom((z) => Math.min(5.0, z + 0.25))}
				onZoomOut={() => setZoom((z) => Math.max(0.4, z - 0.25))}
				onZoomReset={() => setZoom(1.0)}
				onRotate={() => setRotationDeg((r) => (r + 90) % 360)}
				flipHorizontal={flipHorizontal}
				onToggleFlipHorizontal={() => setFlipHorizontal((f) => !f)}
				onApplyNorma={handleApplyNorma}
				isPresentationMode={isPresentationMode}
				onTogglePresentationMode={() => setIsPresentationMode((v) => !v)}
				onExportImage={handleExportImage}
				onTriggerUpload={() => fileInputRef.current?.click()}
				onResetView={handleResetView}
				onClose={onClose}
			/>

			{/* Collapsible FDI 11..48 Quick Selector Drawer */}
			{showToothSelector && (
				<div style={{ padding: "6px 10px", backgroundColor: "#0f172a", borderBottom: "1px solid #334155" }}>
					<DentalToothFdiSelector
						selectedToothFdi={activeToothFdi}
						onSelectTooth={handleSelectTooth}
						onClearTooth={() => setActiveToothFdi(null)}
					/>
				</div>
			)}

			{/* Sub-toolbar: Preset Pills & Brightness/Contrast Sliders (hidden in Presentation Mode) */}
			{!isPresentationMode && (
				<Dental2DRadiologySubToolbar
					activePresetId={activePresetId}
					onApplyPreset={handleApplyPreset}
					brightness={brightness}
					onChangeBrightness={setBrightness}
					contrast={contrast}
					onChangeContrast={setContrast}
					measurementsCount={measurements.length}
					onClearMeasurements={() => setMeasurements([])}
				/>
			)}

			{/* Main Canvas Viewport Area */}
			<div
				ref={viewportRef}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onWheel={handleWheel}
				style={{
					flex: 1,
					position: "relative",
					overflow: "hidden",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: activeTool === "ruler" ? "crosshair" : "grab",
					backgroundColor: "#05070d",
				}}
			>
				{imageSrc ? (
					<div
						style={{
							transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotationDeg}deg) ${flipHorizontal ? "scaleX(-1)" : ""}`,
							transformOrigin: "center center",
							transition: isDraggingRef.current ? "none" : "transform 0.08s ease-out",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							position: "relative",
						}}
					>
						<img
							ref={imgRef}
							src={imageSrc}
							alt={title}
							draggable={false}
							style={{
								maxWidth: isPresentationMode ? "90vw" : "85vw",
								maxHeight: isPresentationMode ? "88vh" : "70vh",
								objectFit: "contain",
								filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? "invert(100%)" : ""}`,
								boxShadow: "0 0 40px rgba(0,0,0,0.8)",
								borderRadius: "4px",
							}}
						/>
					</div>
				) : (
					/* Clean dropzone placeholder when no image attached */
					<div
						onClick={() => fileInputRef.current?.click()}
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: "12px",
							padding: "30px",
							border: "2px dashed #334155",
							borderRadius: "12px",
							color: "#94a3b8",
							cursor: "pointer",
							backgroundColor: "#0f172a",
						}}
					>
						<UploadCloud size={40} color="#14b8a6" />
						<div style={{ textAlign: "center" }}>
							<div style={{ fontWeight: 700, fontSize: "14px", color: "#f8fafc" }}>
								Перетащите снимок RVG, ОПТГ или КЛКТ срез
							</div>
							<div style={{ fontSize: "12px", marginTop: "4px" }}>
								или нажмите для выбора файла (DICOM, TIFF, PNG, JPG, WebP)
							</div>
						</div>
					</div>
				)}

				{/* Overlaid Rulers SVG Layer */}
				<Dental2DRadiologyRulerOverlay
					measurements={measurements}
					rulerStart={rulerStart}
					currentRulerEnd={currentRulerEnd}
					mmPerPixel={mmPerPixel}
				/>

				{/* Chairside Presentation HUD Overlay: clean, patient-friendly annotations */}
				{isPresentationMode && (
					<div
						style={{
							position: "absolute",
							top: "20px",
							left: "20px",
							backgroundColor: "rgba(15, 23, 42, 0.85)",
							backdropFilter: "blur(6px)",
							padding: "10px 14px",
							borderRadius: "8px",
							border: "1px solid #334155",
							display: "flex",
							flexDirection: "column",
							gap: "4px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<span style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc" }}>
								{patientName || "Пациент"}
							</span>
							{activeToothFdi && (
								<span
									style={{
										padding: "2px 8px",
										borderRadius: "4px",
										backgroundColor: "#0d9488",
										color: "#ffffff",
										fontWeight: 800,
										fontFamily: "monospace",
										fontSize: "12px",
									}}
								>
									Зуб #{activeToothFdi}
								</span>
							)}
						</div>
						<div style={{ fontSize: "11px", color: "#94a3b8" }}>
							{studyDate || "Дата снимка: сегодня"} • {modalityLabel}
						</div>
					</div>
				)}

				{/* Presentation Exit Button (Floating Top-Right) */}
				{isPresentationMode && (
					<button
						type="button"
						onClick={() => setIsPresentationMode(false)}
						style={{
							position: "absolute",
							top: "20px",
							right: "20px",
							height: "36px",
							padding: "0 14px",
							backgroundColor: "rgba(15, 23, 42, 0.85)",
							backdropFilter: "blur(6px)",
							border: "1px solid #475569",
							borderRadius: "8px",
							color: "#f8fafc",
							fontWeight: 700,
							fontSize: "12px",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<Minimize2 size={14} />
						<span>Закрыть презентацию (Esc)</span>
					</button>
				)}
			</div>
		</div>
	);
};
export default Dental2DRadiologyViewer;
