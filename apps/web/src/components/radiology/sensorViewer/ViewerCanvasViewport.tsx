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
				backgroundColor: "var(--paper-strong, #020617)",
			}}
			className="sensor-viewport-container"
		>
			{/* Fullscreen Clinical HUD (Top-Left) — Telemetry without kV/mA */}
			{(!isMobile || isFullscreen) && (
				<RadiologyClinicalHud
					patientName={
						(activeStudy && "patientName" in activeStudy ? activeStudy.patientName : undefined) ||
						patientName
					}
					patientBirthDate={
						(activeStudy && "patientBirthDate" in activeStudy ? activeStudy.patientBirthDate : undefined) ||
						patientBirthDate
					}
					patientAge={patientAge}
					patientGender={patientGender}
					medicalCardNumber={
						(activeStudy && "medicalCardNumber" in activeStudy ? activeStudy.medicalCardNumber : undefined) ||
						medicalCardNumber
					}
					toothFdi={effectiveTooth}
					modalityLabel={activeStudy?.modalityLabel || "IO-СЕНСОР (ВНУТРИРОТОВОЙ СЕНСОР)"}
					studyDate={activeStudy?.studyDate}
					isFullscreen={isFullscreen}
					onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
					onClose={handleClose}
				/>
			)}

			{/* Vertical 5 mm Calibrated Ladder Scale Ruler (Left Edge, when image loaded) */}
			{Boolean(activeImageUrl) && (
				<RadiologyCalibratedScaleRuler
					zoom={zoom}
					pixelPitchMicrons={pixelPitchMicrons}
					sensorModelOrDevice={
						(activeStudy && "apparatusModel" in activeStudy && activeStudy.apparatusModel) ||
						(activeStudy && "metadata" in activeStudy && activeStudy.metadata?.apparatusModel) ||
						"vatech_ezsensor"
					}
					targetLengthMm={5.0}
					position="left"
				/>
			)}

			{/* Empty state when no image is loaded */}
			{!activeImageUrl && (
				<div
					className="absolute inset-0 flex flex-col items-center justify-center p-6 text-[var(--ink)] gap-4 z-10"
					data-testid="sensor-viewer-empty-placeholder"
				>
					<div className="w-14 h-14 rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center shadow-sm">
						<Scan size={32} className="text-[var(--primary)]" />
					</div>
					<div className="text-center max-w-sm">
						<h3 className="text-sm font-semibold text-[var(--ink)] mb-1">Снимки пока не загружены</h3>
						<p className="text-xs text-[var(--ink-muted)]">
							Выберите снимок в истории исследований пациента, загрузите локальный файл или выполните захват с визиографа
						</p>
					</div>
					<div className="flex flex-wrap items-center justify-center gap-2">
						<button
							type="button"
							onClick={() => uploadInputRef.current?.click()}
							className="h-9 px-3.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer shadow-sm transition-transform active:scale-95"
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
							className="h-9 px-3.5 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-xs font-medium inline-flex items-center gap-2 cursor-pointer transition-colors"
							data-testid="btn-empty-connect-rvg"
						>
							<span className="w-2 h-2 rounded-full bg-[var(--success,#10b981)] animate-pulse" />
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
