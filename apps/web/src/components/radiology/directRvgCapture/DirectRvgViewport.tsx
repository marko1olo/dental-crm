import React from "react";
import { Scan, UploadCloud, Zap } from "lucide-react";
import { DirectRvgViewportToolbar } from "../DirectRvgViewportToolbar";
import { RvgFiltersToolbar, DEFAULT_RVG_FILTERS } from "../RvgFiltersToolbar";
import { PROJECTION_TYPES } from "../directRvgTypes";
import type { DirectRvgViewportProps } from "./types";

export const DirectRvgViewport: React.FC<DirectRvgViewportProps> = ({
	modalId,
	sensorStatus,
	acquisitionProgress,
	capturedImage,
	selectedTeeth,
	projectionType,
	panZoom,
	filters,
	onFiltersChange,
	activePresetId,
	onSelectPresetId,
	isSplitCompare,
	onToggleSplitCompare,
	canvasRef,
	isDragOver,
	onViewportDragOver,
	onViewportDragLeave,
	onViewportDrop,
	onTriggerCapture,
	onUploadClick,
	onLoadDemo,
	isDemo,
	cssFilterStyle,
}) => {
	const currentProjection = PROJECTION_TYPES.find((p) => p.id === projectionType);

	return (
		<div className="rvg-viewport-pane" data-testid="rvg-viewport-pane">
			{/* Top Float Toolbar with Rotate CW/CCW and Mirror X/Y */}
			<DirectRvgViewportToolbar
				zoom={panZoom.zoom}
				flipH={panZoom.flipH}
				flipV={panZoom.flipV}
				isSplitCompare={isSplitCompare}
				onZoomIn={panZoom.handleZoomIn}
				onZoomOut={panZoom.handleZoomOut}
				onRotate={panZoom.handleRotateCw}
				onRotateCcw={panZoom.handleRotateCcw}
				onToggleFlipH={panZoom.handleToggleFlipH}
				onToggleFlipV={panZoom.handleToggleFlipV}
				onResetTransform={panZoom.handleResetTransform}
				extraSlot={
					<RvgFiltersToolbar
						filters={filters}
						onChange={onFiltersChange}
						activePresetId={activePresetId}
						onSelectPreset={(p) => onSelectPresetId(p.id)}
						isSplitCompare={isSplitCompare}
						onToggleSplitCompare={onToggleSplitCompare}
						onRotate={panZoom.handleRotate}
						onReset={() => {
							onFiltersChange(DEFAULT_RVG_FILTERS);
							onSelectPresetId("standard");
						}}
						layout="toolbar"
					/>
				}
			/>

			{/* Acquiring Animation Overlay */}
			{sensorStatus === "acquiring" && (
				<div className="rvg-acquiring-overlay" data-testid="rvg-acquiring-overlay">
					<div className="rvg-scanner-beam" />
					<Scan className="w-16 h-16 animate-pulse text-teal-400" />
					<div className="text-center">
						<p className="text-sm font-bold tracking-wide text-teal-200 uppercase">
							Получение снимка с датчика...
						</p>
						<p className="text-xs font-mono text-teal-400/80 mt-1">
							Передача данных {acquisitionProgress}%
						</p>
					</div>
				</div>
			)}

			{/* Viewport Canvas Container with Drag-and-Drop Dropzone Support */}
			<div
				className={`rvg-canvas-container ${panZoom.isDragging ? "grabbing" : ""} ${isDragOver ? "dragover" : ""}`}
				onMouseDown={panZoom.handleMouseDown}
				onMouseMove={panZoom.handleMouseMove}
				onMouseUp={panZoom.handleMouseUp}
				onMouseLeave={panZoom.handleMouseUp}
				onWheel={panZoom.handleWheel}
				onDragOver={onViewportDragOver}
				onDragLeave={onViewportDragLeave}
				onDrop={onViewportDrop}
				data-testid="rvg-canvas-container"
			>
				{isDragOver && (
					<div className="rvg-drop-overlay" data-testid="rvg-drop-overlay">
						<UploadCloud className="w-12 h-12 text-teal-400 animate-bounce" />
						<span className="text-sm font-bold text-teal-200">
							Отпустите файл для загрузки снимка (DICOM, TIFF, PNG, JPG)
						</span>
					</div>
				)}

				{!capturedImage && (
					<div
						className="rvg-empty-sensor-state flex flex-col items-center justify-center h-full w-full p-8 text-center z-10"
						data-testid="rvg-empty-sensor-state"
					>
						<div className="w-16 h-16 rounded-full bg-teal-500/15 border border-teal-500/35 flex items-center justify-center mb-4 text-teal-400 shadow-lg shadow-teal-500/10">
							<Zap className="w-8 h-8 animate-pulse text-teal-400" />
						</div>
						<h3 className="text-base font-bold text-white mb-2">
							Датчик готов к захвату (Auto-Trigger)
						</h3>
						<p className="text-xs max-w-md leading-relaxed text-teal-300 font-medium mb-1">
							Работает параллельно с Vatech EzDent-i, Carestream, Romexis без конфликта за USB
						</p>
						<p className="text-xs max-w-md leading-relaxed text-slate-300 mb-5">
							Сделайте экспозицию на рентген-аппарате. Датчик автоматически зафиксирует импульс (&lt;50 мс), либо снимок поступит из папки аппарата. Также можно перетащить файл (Drag &amp; Drop) или вставить из буфера (Ctrl+V).
						</p>
						<div className="flex gap-2.5 items-center flex-wrap justify-center">
							<button
								type="button"
								data-testid="btn-rvg-trigger-empty-capture"
								onClick={(e) => {
									e.stopPropagation();
									onTriggerCapture();
								}}
								className="rvg-empty-btn-primary"
								title="Мгновенный захват <50мс без искусственных задержек"
							>
								<Zap className="w-4 h-4 fill-current" />
								<span>Захват снимка (Space) · &lt;50мс</span>
							</button>
							<button
								type="button"
								data-testid="btn-rvg-upload-disk"
								onClick={(e) => {
									e.stopPropagation();
									onUploadClick();
								}}
								className="rvg-empty-btn-secondary"
							>
								<UploadCloud className="w-4 h-4 text-teal-400" />
								<span>Загрузить с диска</span>
							</button>
							{isDemo && (
								<button
									type="button"
									data-testid="btn-rvg-load-demo"
									onClick={(e) => {
										e.stopPropagation();
										onLoadDemo();
									}}
									className="rvg-empty-btn-demo"
								>
									<span>Показать демо-снимок</span>
								</button>
							)}
						</div>
					</div>
				)}

				{capturedImage ? (
					<img
						src={capturedImage}
						alt={`Снимок зуба ${selectedTeeth.join(", ")}`}
						className="rvg-render-canvas"
						style={{
							transform: `translate(${panZoom.pan.x}px, ${panZoom.pan.y}px) scale(${panZoom.zoom}) rotate(${panZoom.rotation}deg) scaleX(${panZoom.flipH ? -1 : 1}) scaleY(${panZoom.flipV ? -1 : 1})`,
							filter: isSplitCompare ? "none" : cssFilterStyle,
							maxWidth: "92%",
							maxHeight: "92%",
							objectFit: "contain",
							borderRadius: "0.5rem",
							boxShadow: "0 10px 40px rgba(0, 0, 0, 0.8)",
						}}
						data-testid="rvg-render-canvas"
					/>
				) : null}
				<canvas
					ref={canvasRef}
					style={{ display: "none" }}
				/>
			</div>

			{/* Viewport HUD Telemetry */}
			<div className="rvg-hud-overlay">
				<div className="rvg-hud-card">
					<span className="text-teal-400 font-bold">Зуб {selectedTeeth.join(", ")}</span> · {currentProjection?.shortLabel ?? "Прицельный"}
				</div>
				<div className="rvg-hud-card text-right">
					<span>Калибровка: 0.035 мм/пикс</span>
				</div>
			</div>
		</div>
	);
};

export default DirectRvgViewport;
