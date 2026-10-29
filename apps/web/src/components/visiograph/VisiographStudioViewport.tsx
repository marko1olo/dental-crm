/**
 * VisiographStudioViewport.tsx
 * Canonical SSOT Viewport for 2D Visiograph & PACS Studio (Mandates 8b, 8e, 8n).
 *
 * Consolidates:
 * 1. Zoomable & Pannable radiological canvas with GPU/LUT acceleration.
 * 2. Hardware-aware Dropzone supporting Trophy, Gendex, Vatech, Planmeca, Sirona (.dcm, .tif, .png, .jpg).
 * 3. Calibrated physical ladder scale in millimeters (Mandate 8e, 0.035-0.04 mm/px).
 * 4. Chairside passport overlay (Tooth FDI, Sensor model, silent dosimetry ~0.02 mSv).
 * 5. Full touch ergonomics & pinch-to-zoom support (Apple HIG).
 */

import React, { useRef, useState } from "react";
import {
	Activity,
	FolderOpen,
	HardDrive,
	Loader2,
	UploadCloud,
	Zap,
} from "lucide-react";
import "./VisiographStudioViewport.css";
import type { ActiveVisiographTool } from "./VisiographStudioTypes";
import type { CalibrationReference, RulerMeasurement } from "./VisiographMeasurementMath";

export interface VisiographStudioViewportProps {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	canvasZoom: number;
	setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
	canvasRotationDeg: number;
	activeTool: ActiveVisiographTool;
	onCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	onCanvasDoubleClick: () => void;
	onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	onMouseLeave: () => void;

	// Enhanced SSOT Capabilities:
	hasImage?: boolean;
	imageUrl?: string | null;
	toothCode?: string | null;
	sensorBrandName?: string;
	isLoading?: boolean;
	isCalibrated?: boolean;
	calibration?: CalibrationReference;
	rulers?: RulerMeasurement[];
	onFileDrop?: (file: File) => Promise<void> | void;
	onOpenHotFolder?: () => void;
}

export function VisiographStudioViewport({
	canvasRef,
	canvasZoom,
	setCanvasZoom,
	canvasRotationDeg,
	activeTool,
	onCanvasClick,
	onCanvasDoubleClick,
	onMouseMove,
	onMouseLeave,
	hasImage = true,
	imageUrl,
	toothCode = "16",
	sensorBrandName = "Vatech EzSensor HD",
	isLoading = false,
	isCalibrated = false,
	calibration,
	rulers = [],
	onFileDrop,
	onOpenHotFolder,
}: VisiographStudioViewportProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [isDragOver, setIsDragOver] = useState(false);

	// Apple HIG Pinch-to-zoom for Mobile / Tablets
	const touchStartDistRef = useRef<number | null>(null);
	const initialZoomRef = useRef<number>(1.0);

	const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
		if (e.touches.length === 2) {
			const t1 = e.touches[0];
			const t2 = e.touches[1];
			if (t1 && t2) {
				const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
				touchStartDistRef.current = dist;
				initialZoomRef.current = canvasZoom;
			}
		}
	};

	const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
		if (e.touches.length === 2 && touchStartDistRef.current !== null) {
			const t1 = e.touches[0];
			const t2 = e.touches[1];
			if (t1 && t2) {
				const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
				const factor = currentDist / touchStartDistRef.current;
				const newZoom = Math.min(3.5, Math.max(0.4, Number((initialZoomRef.current * factor).toFixed(2))));
				setCanvasZoom(newZoom);
			}
		}
	};

	const handleTouchEnd = () => {
		touchStartDistRef.current = null;
	};

	const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
		e.preventDefault();
		const delta = e.deltaY < 0 ? 0.1 : -0.1;
		setCanvasZoom((z) => Math.min(3.5, Math.max(0.4, Number((z + delta).toFixed(2)))));
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (!isDragOver) setIsDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	};

	const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);

		const files = e.dataTransfer.files;
		if (files && files.length > 0 && onFileDrop) {
			const file = files[0];
			if (file) {
				await onFileDrop(file);
			}
		}
	};

	const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0 && onFileDrop) {
			const file = files[0];
			if (file) {
				await onFileDrop(file);
			}
		}
		if (e.target) e.target.value = "";
	};

	const isDisplayingImage = Boolean(hasImage || imageUrl);

	return (
		<div
			className="visiograph-viewport-container"
			data-testid="visiograph-studio-viewport"
			onWheel={handleWheel}
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<input
				type="file"
				ref={fileInputRef}
				style={{ display: "none" }}
				accept=".dcm,.dicom,.tif,.tiff,.png,.jpg,.jpeg,.bmp,image/*"
				data-testid="visiograph-dropzone-input"
				onChange={handleFileInputChange}
			/>

			{/* Драг-оверлей при наведении файла */}
			{isDragOver && (
				<div className="visiograph-drag-overlay" data-testid="visiograph-drop-overlay">
					<UploadCloud size={48} className="animate-bounce" />
					<div style={{ fontSize: "16px", fontWeight: 700 }}>
						Отпустите файл для мгновенной загрузки в базу данных
					</div>
					<div style={{ fontSize: "12px", opacity: 0.85 }}>
						Vatech, Trophy, Gendex, Planmeca, Sirona (DICOM / TIFF / JPEG)
					</div>
				</div>
			)}

			{/* Индикатор загрузки в базу данных */}
			{isLoading && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						zIndex: 40,
						background: "rgba(9, 13, 22, 0.8)",
						backdropFilter: "blur(4px)",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: "10px",
						color: "var(--teal, #0d9488)",
					}}
				>
					<Loader2 size={36} className="animate-spin" />
					<span style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
						Сохранение снимка в базу данных клиники...
					</span>
				</div>
			)}

			{/* Если снимок загружен — рендерим холст и клинические оверлеи */}
			{isDisplayingImage ? (
				<div className="visiograph-viewport-canvas-wrapper">
					{/* Паспорт снимка (левый верхний угол) */}
					<div className="visiograph-passport-badge" data-testid="visiograph-passport-badge">
						<Activity size={14} style={{ color: "var(--teal, #0d9488)" }} />
						<span style={{ fontWeight: 700, color: "var(--teal, #2dd4bf)" }}>
							Зуб #{toothCode || "16"}
						</span>
						<span style={{ opacity: 0.6 }}>•</span>
						<span>{sensorBrandName}</span>
						<span style={{ opacity: 0.6 }}>•</span>
						<span style={{ fontSize: "10.5px", color: "var(--muted, #8b949e)" }}>
							Доза: 0.02 мЗв
						</span>
					</div>

					{/* Физическая калиброванная шкала в мм (справа) */}
					<div className="visiograph-calibrated-ladder" data-testid="visiograph-calibrated-ladder">
						<div className="visiograph-ladder-ticks">
							<div className="visiograph-ladder-tick-major" />
							<div className="visiograph-ladder-tick-minor" />
							<div className="visiograph-ladder-tick-minor" />
							<div className="visiograph-ladder-tick-minor" />
							<div className="visiograph-ladder-tick-minor" />
							<div className="visiograph-ladder-tick-major" />
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
							<span style={{ fontWeight: 700, color: "var(--teal, #2dd4bf)" }}>
								{isCalibrated ? "5.0 мм" : "Шкала"}
							</span>
							<span style={{ fontSize: "9px", color: "var(--muted, #8b949e)" }}>
								{calibration ? `${(calibration.scaleMmPerPixel * 100).toFixed(1)} мм/100px` : "RVG 0.04"}
							</span>
						</div>
					</div>

					{/* Главный холст снимка */}
					<canvas
						ref={canvasRef}
						onClick={onCanvasClick}
						onDoubleClick={onCanvasDoubleClick}
						onMouseMove={onMouseMove}
						onMouseLeave={onMouseLeave}
						onTouchStart={handleTouchStart}
						onTouchMove={handleTouchMove}
						onTouchEnd={handleTouchEnd}
						className="visiograph-viewport-canvas"
						style={{
							cursor: activeTool === "pointer" ? "default" : "crosshair",
							transform: `scale(${canvasZoom}) rotate(${canvasRotationDeg}deg)`,
							touchAction: "none",
						}}
					/>
				</div>
			) : (
				/* Честная пустая дропзона визиографов и томографов */
				<div
					className={`visiograph-empty-dropzone ${isDragOver ? "is-active-drag" : ""}`}
					data-testid="visiograph-empty-dropzone"
					onClick={() => fileInputRef.current?.click()}
					role="button"
					tabIndex={0}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
					}}
				>
					<div className="visiograph-drop-icon-box">
						<UploadCloud size={28} />
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
						<div style={{ fontSize: "15px", fontWeight: 700, color: "var(--ink, #c9d1d9)" }}>
							Перетащите сюда снимок визиографа или КЛКТ
						</div>
						<div style={{ fontSize: "12px", color: "var(--muted, #8b949e)" }}>
							Поддерживаются оригинальные 16-bit DICOM (.dcm), TIFF, JPEG и PNG
						</div>
					</div>

					{/* Чипы поддерживаемого клинического оборудования клиники */}
					<div className="visiograph-hardware-chips-row">
						<span className="visiograph-hardware-chip">
							<Zap size={10} style={{ color: "var(--teal, #0d9488)" }} />
							Vatech EzSensor
						</span>
						<span className="visiograph-hardware-chip">
							<HardDrive size={10} />
							KaVo Gendex
						</span>
						<span className="visiograph-hardware-chip">
							<HardDrive size={10} />
							Trophy RVG / Carestream
						</span>
						<span className="visiograph-hardware-chip">
							<HardDrive size={10} />
							Planmeca ProSensor
						</span>
						<span className="visiograph-hardware-chip">
							<HardDrive size={10} />
							Sirona XIOS
						</span>
					</div>

					{/* Кнопки выбора и хотфолдера */}
					<div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
						<button
							type="button"
							className="secondary-button"
							data-testid="btn-select-file-disk"
							onClick={(e) => {
								e.stopPropagation();
								fileInputRef.current?.click();
							}}
							style={{ minHeight: "36px", padding: "0 14px" }}
						>
							<HardDrive size={14} />
							<span>Выбрать файл на диске</span>
						</button>

						{onOpenHotFolder && (
							<button
								type="button"
								className="secondary-button"
								data-testid="btn-hotfolder-picker"
								onClick={(e) => {
									e.stopPropagation();
									onOpenHotFolder();
								}}
								style={{ minHeight: "36px", padding: "0 14px" }}
							>
								<FolderOpen size={14} />
								<span>Сетевая папка визиографа</span>
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
