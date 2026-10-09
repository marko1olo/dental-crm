import React from "react";
import { Scan, UploadCloud } from "lucide-react";
import { RadiologyClinicalHud } from "../RadiologyClinicalHud.js";
import { RadiologyCalibratedScaleRuler } from "../RadiologyCalibratedScaleRuler.js";
import { showToast } from "../../GlobalToast.js";
import type { SensorViewerState, SensorStudyViewerProps } from "./types.js";

export interface ViewerCanvasViewportProps {
	readonly state: SensorViewerState;
	readonly props: SensorStudyViewerProps;
}

export const ViewerCanvasViewport: React.FC<ViewerCanvasViewportProps> = ({ state, props }) => {
	const {
		containerRef,
		canvasRef,
		uploadInputRef,
		activeStudy,
		activeImageUrl,
		effectiveTooth,
		isFullscreen,
		setIsFullscreen,
		handleClose,
		zoom,
		pixelPitchMicrons,
		activeTool,
		handleDirectFileUpload,
		handleWheel,
		handleMouseDown,
		handleMouseMove,
		handleMouseLeave,
		handleMouseUp,
		handleCanvasClick,
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
		handleTouchCancel,
		isMobile,
	} = state;

	const {
		patientName,
		patientBirthDate,
		patientAge,
		patientGender,
		medicalCardNumber,
	} = props;

	return (
		<div
			ref={containerRef}
			style={{
				flex: 1,
				position: "relative",
				overflow: "hidden",
				backgroundColor: "#020617",
			}}
			className="sensor-viewport-container"
		>
			{/* Fullscreen Clinical HUD (Top-Left) — Telemetry without kV/mA */}
			{(!isMobile || isFullscreen) && (
				<RadiologyClinicalHud
					patientName={(activeStudy as any)?.patientName || patientName}
					patientBirthDate={(activeStudy as any)?.patientBirthDate || patientBirthDate}
					patientAge={patientAge}
					patientGender={patientGender}
					medicalCardNumber={(activeStudy as any)?.medicalCardNumber || medicalCardNumber}
					toothFdi={effectiveTooth}
					modalityLabel={(activeStudy as any)?.modalityLabel || "IO-СЕНСОР (ВНУТРИРОТОВОЙ СЕНСОР)"}
					studyDate={activeStudy?.studyDate}
					isFullscreen={isFullscreen}
					onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
					onClose={handleClose}
				/>
			)}

			{/* Vertical 5 mm Calibrated Ladder Scale Ruler (Left Edge) */}
			<RadiologyCalibratedScaleRuler
				zoom={zoom}
				pixelPitchMicrons={pixelPitchMicrons}
				sensorModelOrDevice={(activeStudy as any)?.apparatusModel || "vatech_ezsensor"}
				targetLengthMm={5.0}
				position="left"
			/>

			{/* Empty state when no image is loaded */}
			{!activeImageUrl && (
				<div
					className="absolute inset-0 flex flex-col items-center justify-center p-6 text-slate-300 gap-4 z-10"
					data-testid="sensor-viewer-empty-placeholder"
				>
					<div className="w-16 h-16 rounded-2xl bg-[#0f172a] border border-[#334155] flex items-center justify-center shadow-lg">
						<Scan size={36} className="text-[#2dd4bf]" />
					</div>
					<div className="text-center max-w-sm">
						<h3 className="text-sm font-bold text-white mb-1">Снимки пока не загружены</h3>
						<p className="text-xs text-slate-400">
							Выберите снимок в истории исследований пациента, загрузите локальный файл или выполните захват с визиографа
						</p>
					</div>
					<div className="flex flex-wrap items-center justify-center gap-2">
						<button
							type="button"
							onClick={() => uploadInputRef.current?.click()}
							className="px-3.5 py-2 rounded-lg bg-[#00C853] hover:bg-[#00b047] text-[#022c15] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-transform active:scale-95"
							data-testid="btn-empty-upload-image"
						>
							<UploadCloud size={14} />
							<span>+ Загрузить снимок / DICOM</span>
						</button>
						<button
							type="button"
							onClick={() => {
								showToast("Датчик RVG EzSensor подключен и откалиброван. Готов к экспозиции.", "info");
							}}
							className="px-3 py-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
							data-testid="btn-empty-connect-rvg"
						>
							<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
							<span>Подключить визиограф RVG</span>
						</button>
					</div>
				</div>
			)}

			<input
				type="file"
				ref={uploadInputRef}
				onChange={handleDirectFileUpload}
				accept="image/*,.dcm,application/dicom"
				style={{ display: "none" }}
				data-testid="input-direct-file-upload"
			/>

			{/* Active Canvas Layer */}
			<canvas
				ref={canvasRef}
				data-testid="sensor-viewer-canvas"
				style={{
					width: "100%",
					height: "100%",
					display: "block",
					touchAction: "none",
					cursor:
						activeTool === "ruler" || activeTool === "curved_canal"
							? "crosshair"
							: activeTool === "magnifier"
							? "crosshair"
							: "grab",
				}}
				onWheel={handleWheel}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				onMouseUp={handleMouseUp}
				onClick={handleCanvasClick}
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
				onTouchEnd={handleTouchEnd}
				onTouchCancel={handleTouchCancel}
				onContextMenu={(e) => e.preventDefault()}
			/>
		</div>
	);
};
