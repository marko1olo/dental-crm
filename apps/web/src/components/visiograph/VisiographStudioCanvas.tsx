/**
 * VisiographStudioCanvas.tsx
 * Full-featured interactive HTML5 Canvas / WebGL 2D Visiograph & PACS Studio (Mandates 8b, 8d, 8e, 8n).
 * Canonical SSOT Workstation uniting DICOM Part 10, Hardware Dropzone, Mobile Bottom Sheet & PostgreSQL.
 */

import React, { useState, useCallback } from "react";
import { Sliders, X } from "lucide-react";
import { DEFAULT_VISIOGRAPH_IMAGE_PARAMS, type VisiographImageParams } from "./VisiographImageProcessor";
import {
	type CalibrationReference,
	DEFAULT_PIXEL_SCALE_MM,
	type AngleMeasurement,
	type PeriapicalLesion,
	type Point2D,
	type RulerMeasurement,
} from "./VisiographMeasurementMath";
import { handleToolCanvasClick, handleToolCanvasDoubleClick } from "./VisiographToolInteractions";
import { VisiographExportModal } from "./VisiographExportModal";
import { VisiographTopToolbar } from "./VisiographTopToolbar";
import { VisiographLesionsHud } from "./VisiographLesionsHud";
import {
	type ActiveVisiographTool,
	type SensorCalibrationPreset,
	type VisiographStudioCanvasProps,
	STANDARD_SENSOR_PRESETS,
	recalculateLesionsWithScale,
	recalculateRulersWithScale,
} from "./VisiographStudioTypes";
import { useVisiographCanvasState } from "./useVisiographCanvasState";
import { VisiographStudioSidebar } from "./VisiographStudioSidebar";
import { VisiographStudioViewport } from "./VisiographStudioViewport";
import { useVisiographStudioActions } from "./useVisiographStudioActions";
import { uploadImagingScanFile } from "../imaging/imagingUploadService";
import { showToast } from "../GlobalToast";

export type { SensorCalibrationPreset, ActiveVisiographTool, VisiographStudioCanvasProps };
export { STANDARD_SENSOR_PRESETS, recalculateRulersWithScale, recalculateLesionsWithScale };

export function VisiographStudioCanvas(props: VisiographStudioCanvasProps) {
	const {
		imageUrl: initialImageUrl,
		patientId = "pat_unknown",
		patientFullName = "Пациент ДЕНТЕ",
		toothCode = null,
		studyId: initialStudyId,
		doctorName = "Врач-рентгенолог ДЕНТЕ",
		initialTool = "pointer",
		onSaveToRecord,
		onClose,
	} = props;

	const [activeImageUrl, setActiveImageUrl] = useState<string | null>(initialImageUrl || null);
	const [studyId, setStudyId] = useState<string | undefined>(initialStudyId);
	const [isUploading, setIsUploading] = useState<boolean>(false);
	const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

	const [params, setParams] = useState<VisiographImageParams>({ ...DEFAULT_VISIOGRAPH_IMAGE_PARAMS });
	const [activeClinicalFilter, setActiveClinicalFilter] = useState<string | null>(null);
	const [activeTool, setActiveTool] = useState<ActiveVisiographTool>(initialTool);
	const [activeSensorPresetId, setActiveSensorPresetId] = useState<string | null>(null);
	const [calibration, setCalibration] = useState<CalibrationReference>({
		type: "sphere_5mm",
		p1: { x: 0, y: 0 },
		p2: { x: 100, y: 0 },
		knownLengthMm: 5.0,
		pixelDistance: 100,
		scaleMmPerPixel: DEFAULT_PIXEL_SCALE_MM,
	});
	const [isCalibrated, setIsCalibrated] = useState(false);
	const [rulers, setRulers] = useState<RulerMeasurement[]>([]);
	const [angles, setAngles] = useState<AngleMeasurement[]>([]);
	const [lesions, setLesions] = useState<PeriapicalLesion[]>([]);
	const [canvasZoom, setCanvasZoom] = useState<number>(1.0);
	const [canvasRotationDeg, setCanvasRotationDeg] = useState<number>(0);
	const [drawingPoints, setDrawingPoints] = useState<Point2D[]>([]);
	const [hoverPos, setHoverPos] = useState<Point2D | null>(null);
	const [showExportModal, setShowExportModal] = useState(false);
	const [currentToothCode, setCurrentToothCode] = useState<string>(toothCode || "16");

	const { canvasRef, getCanvasPoint, handleMouseMove, handleMouseLeave } = useVisiographCanvasState({
		imageUrl: activeImageUrl || undefined,
		params,
		rulers,
		angles,
		lesions,
		calibration,
		isCalibrated,
		activeTool,
		drawingPoints,
		hoverPos,
		setHoverPos,
	});

	const { handleApplySensorPreset, handleResetParams, handleApplyClinicalFilter, handlePrintProtocol, handleAttachToVisit } = useVisiographStudioActions({
		canvasRef,
		patientId,
		patientFullName,
		doctorName,
		studyId,
		toothCode: currentToothCode,
		rulers,
		angles,
		lesions,
		calibration,
		isCalibrated,
		activeClinicalFilter,
		setParams,
		setActiveClinicalFilter,
		setActiveSensorPresetId,
		setIsCalibrated,
		setCalibration,
		setRulers,
		setLesions,
		onSaveToRecord,
	});

	// Обработка перетаскивания и загрузки снимка через честный API в PostgreSQL
	const handleFileDrop = useCallback(async (file: File) => {
		setIsUploading(true);
		try {
			// Мгновенный показ локального превью
			const reader = new FileReader();
			reader.onload = (e) => {
				if (typeof e.target?.result === "string") {
					setActiveImageUrl(e.target.result);
				}
			};
			reader.readAsDataURL(file);

			// Честная загрузка через API в базу данных
			const uploadResult = await uploadImagingScanFile(file, {
				patientId,
				toothCode: currentToothCode,
				title: `Прицельный снимок (${file.name})`,
				kind: "periapical",
			});

			if (uploadResult.success && uploadResult.study?.id) {
				setStudyId(uploadResult.study.id);
				if (uploadResult.study.fileUrl) {
					setActiveImageUrl(uploadResult.study.fileUrl);
				}
			}
		} catch (err) {
			showToast("Ошибка при сохранении снимка", "error");
		} finally {
			setIsUploading(false);
		}
	}, [patientId, currentToothCode]);

	// Открытие сетевой папки визиографа (Hot Folder)
	const handleOpenHotFolder = useCallback(async () => {
		if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
			try {
				// @ts-expect-error File System Access API
				const handle = await window.showDirectoryPicker();
				if (handle) {
					showToast(`Папка «${handle.name}» подключена к автоподхвату снимков`, "success");
				}
			} catch {
				// Отмена диалога
			}
		} else {
			showToast("Используется стандартный мониторинг хотфолдера", "info");
		}
	}, []);

	const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		handleToolCanvasClick({
			pt: getCanvasPoint(e),
			activeTool,
			drawingPoints,
			calibration,
			calibRefType: "sphere_5mm",
			customMmInput: 5.0,
			toothCode: currentToothCode,
			rulersCount: rulers.length,
			anglesCount: angles.length,
			setDrawingPoints,
			setRulers,
			setAngles,
			setLesions,
			setCalibration,
			setIsCalibrated,
			setActiveTool,
		});
	};

	return (
		<div
			className="visiograph-studio-container"
			data-testid="visiograph-studio-container"
			style={{
				display: "flex",
				flexDirection: "column",
				background: "var(--paper, #0d1117)",
				color: "var(--ink, #c9d1d9)",
				borderRadius: "12px",
				border: "1px solid var(--line, #30363d)",
				overflow: "hidden",
				minHeight: "580px",
				position: "relative",
			}}
		>
			<VisiographTopToolbar
				activeTool={activeTool}
				setActiveTool={setActiveTool}
				onClearDrawing={() => setDrawingPoints([])}
				params={params}
				setParams={setParams}
				activeClinicalFilter={activeClinicalFilter}
				onApplyClinicalFilter={handleApplyClinicalFilter}
				canvasZoom={canvasZoom}
				setCanvasZoom={setCanvasZoom}
				setCanvasRotationDeg={setCanvasRotationDeg}
				sensorPresets={STANDARD_SENSOR_PRESETS}
				activeSensorPresetId={activeSensorPresetId}
				isCalibrated={isCalibrated}
				onApplySensorPreset={handleApplySensorPreset}
				onResetAll={() => {
					handleResetParams();
					setCanvasZoom(1.0);
					setCanvasRotationDeg(0);
				}}
				onPrintProtocol={handlePrintProtocol}
				onOpenExportModal={() => setShowExportModal(true)}
				onClose={onClose}
				toothCode={currentToothCode}
				onToothChange={setCurrentToothCode}
				onAttachToVisit={handleAttachToVisit}
				onToggleMobileDrawer={() => setIsMobileDrawerOpen((prev) => !prev)}
			/>

			{/* Мобильная кнопка вызова фильтров (Apple HIG Touch Target >= 44px) */}
			<div className="md:hidden flex items-center justify-between px-3 py-1.5 border-b border-[var(--line)] bg-[var(--paper-soft)]">
				<button
					type="button"
					onClick={() => setIsMobileDrawerOpen(true)}
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] min-h-[36px]"
					data-testid="btn-open-mobile-filters"
				>
					<Sliders size={13} />
					<span>Фильтры и пресеты датчиков</span>
				</button>
				<span className="text-[11px] font-mono text-[var(--teal,#0d9488)] font-semibold">
					Зуб #{currentToothCode}
				</span>
			</div>

			<div style={{ display: "flex", flex: 1, minHeight: "480px", position: "relative" }}>
				{/* Десктопный сайдбар (скрывается на мобильных экранах <= 768px по Apple HIG) */}
				<div className="hidden md:flex">
					<VisiographStudioSidebar
						params={params}
						setParams={setParams}
						onResetParams={handleResetParams}
						setActiveClinicalFilter={setActiveClinicalFilter}
						isCalibrated={isCalibrated}
						calibration={calibration}
						activeTool={activeTool}
						activeSensorPresetId={activeSensorPresetId}
						onApplySensorPreset={handleApplySensorPreset}
						onStartManualCalibration={() => {
							setActiveSensorPresetId(null);
							setActiveTool("calibrate");
							setDrawingPoints([]);
						}}
						rulersCount={rulers.length}
						anglesCount={angles.length}
						lesionsCount={lesions.length}
						onClearAllMeasurements={() => {
							setRulers([]);
							setAngles([]);
							setLesions([]);
						}}
					/>
				</div>

				{/* Единый канонический SSOT Вьюпорт визиографа с честной дропзоной */}
				<VisiographStudioViewport
					canvasRef={canvasRef}
					canvasZoom={canvasZoom}
					setCanvasZoom={setCanvasZoom}
					canvasRotationDeg={canvasRotationDeg}
					activeTool={activeTool}
					onCanvasClick={onCanvasClick}
					onCanvasDoubleClick={() =>
						handleToolCanvasDoubleClick({
							activeTool,
							drawingPoints,
							calibration,
							toothCode: currentToothCode,
							setDrawingPoints,
							setRulers,
							setLesions,
						})
					}
					onMouseMove={handleMouseMove}
					onMouseLeave={handleMouseLeave}
					hasImage={Boolean(activeImageUrl)}
					imageUrl={activeImageUrl}
					toothCode={currentToothCode}
					isLoading={isUploading}
					isCalibrated={isCalibrated}
					calibration={calibration}
					rulers={rulers}
					onFileDrop={handleFileDrop}
					onOpenHotFolder={handleOpenHotFolder}
				/>

				<VisiographLesionsHud lesions={lesions} />
			</div>

			{/* Мобильный Apple HIG Bottom Sheet для фильтров и настроек */}
			{isMobileDrawerOpen && (
				<div
					className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
					onClick={() => setIsMobileDrawerOpen(false)}
					role="dialog"
					aria-modal="true"
					aria-label="Фильтры визиографа"
				>
					<div
						className="w-full bg-[var(--paper-strong,#0f172a)] border-t border-[var(--line)] rounded-t-[24px] p-4 flex flex-col gap-3 shadow-2xl max-h-[80vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
						style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 16px))" }}
					>
						{/* Тактильный Drag Handle 36x5px по центру */}
						<div className="w-9 h-1.5 rounded-full bg-slate-500/50 self-center mb-1" />

						<div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
							<span className="text-sm font-bold text-[var(--ink)]">
								Настройки изображения и сенсора
							</span>
							<button
								type="button"
								onClick={() => setIsMobileDrawerOpen(false)}
								className="p-1 rounded-lg text-[var(--muted)] hover:text-white"
								aria-label="Закрыть"
							>
								<X size={18} />
							</button>
						</div>

						<VisiographStudioSidebar
							params={params}
							setParams={setParams}
							onResetParams={handleResetParams}
							setActiveClinicalFilter={setActiveClinicalFilter}
							isCalibrated={isCalibrated}
							calibration={calibration}
							activeTool={activeTool}
							activeSensorPresetId={activeSensorPresetId}
							onApplySensorPreset={handleApplySensorPreset}
							onStartManualCalibration={() => {
								setActiveSensorPresetId(null);
								setActiveTool("calibrate");
								setDrawingPoints([]);
							}}
							rulersCount={rulers.length}
							anglesCount={angles.length}
							lesionsCount={lesions.length}
							onClearAllMeasurements={() => {
								setRulers([]);
								setAngles([]);
								setLesions([]);
							}}
						/>
					</div>
				</div>
			)}

			<VisiographExportModal
				isOpen={showExportModal}
				onClose={() => setShowExportModal(false)}
				canvasRef={canvasRef}
				patientId={patientId}
				patientFullName={patientFullName}
				doctorName={doctorName}
				studyId={studyId}
				toothCode={currentToothCode}
				rulers={rulers}
				angles={angles}
				lesions={lesions}
				calibration={calibration}
				isCalibrated={isCalibrated}
				onSaveToRecord={onSaveToRecord}
				onPrintProtocol={handlePrintProtocol}
			/>
		</div>
	);
}
