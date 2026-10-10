import React from "react";
import { RefreshCw, Ruler, UploadCloud, X } from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import type { MobileGestureViewportProps } from "./types.js";

/**
 * MobileGestureViewport: Dominant black canvas viewport with multi-touch gestures,
 * pinch-to-zoom, pan, double-tap zoom step, and calibrated clinical caliper (ruler).
 */
export const MobileGestureViewport: React.FC<MobileGestureViewportProps> = ({
	selectedImagingStudy,
	effectivePreviewUrl,
	previewLoadError,
	selectedStudyHasFile,
	zoom,
	pan,
	rotationDeg,
	computedFilter,
	computedTransform,
	isRulerActive,
	rulerStart,
	rulerCurrent,
	savedRulerDistanceMm,
	pixelSpacingMm,
	isAnalyzingAI,
	viewportRef,
	touchStartRef,
	setZoom,
	setPan,
	setRulerStart,
	setRulerCurrent,
	setSavedRulerDistanceMm,
	triggerHaptic,
	onPickFiles,
}) => {
	// Touch gesture handlers for Touch Pan, Pinch-to-zoom and Ruler
	const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
		if (e.touches.length === 1) {
			const touch = e.touches[0];
			if (!touch) return;
			const now = Date.now();
			const isDoubleTap = now - touchStartRef.current.lastTapTime < 280;
			touchStartRef.current.lastTapTime = now;

			if (isDoubleTap && !isRulerActive) {
				// Double tap toggle between 1.0x and 2.0x
				triggerHaptic();
				setZoom((prev) => (prev > 1.2 ? 1.0 : 2.0));
				setPan({ x: 0, y: 0 });
				return;
			}

			if (isRulerActive && viewportRef.current) {
				const rect = viewportRef.current.getBoundingClientRect();
				const x = touch.clientX - rect.left;
				const y = touch.clientY - rect.top;
				setRulerStart({ x, y });
				setRulerCurrent({ x, y });
				return;
			}

			touchStartRef.current = {
				x: touch.clientX,
				y: touch.clientY,
				panX: pan.x,
				panY: pan.y,
				dist: 0,
				initialZoom: zoom,
				lastTapTime: now,
			};
		} else if (e.touches.length === 2) {
			// Pinch start
			const t1 = e.touches[0];
			const t2 = e.touches[1];
			if (!t1 || !t2) return;
			const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
			touchStartRef.current.dist = dist;
			touchStartRef.current.initialZoom = zoom;
		}
	};

	const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
		if (e.touches.length === 1) {
			const touch = e.touches[0];
			if (!touch) return;
			if (isRulerActive && rulerStart && viewportRef.current) {
				const rect = viewportRef.current.getBoundingClientRect();
				const x = touch.clientX - rect.left;
				const y = touch.clientY - rect.top;
				setRulerCurrent({ x, y });
				return;
			}

			const dx = touch.clientX - touchStartRef.current.x;
			const dy = touch.clientY - touchStartRef.current.y;
			setPan({
				x: touchStartRef.current.panX + dx,
				y: touchStartRef.current.panY + dy,
			});
		} else if (e.touches.length === 2) {
			// Pinch zoom
			const t1 = e.touches[0];
			const t2 = e.touches[1];
			if (!t1 || !t2) return;
			const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
			if (touchStartRef.current.dist > 0) {
				const scale = dist / touchStartRef.current.dist;
				const nextZoom = Math.max(0.8, Math.min(4.5, touchStartRef.current.initialZoom * scale));
				setZoom(Number(nextZoom.toFixed(2)));
			}
		}
	};

	const handleTouchEnd = () => {
		if (isRulerActive && rulerStart && rulerCurrent) {
			const dx = rulerCurrent.x - rulerStart.x;
			const dy = rulerCurrent.y - rulerStart.y;
			const distPx = Math.hypot(dx, dy);
			if (distPx > 10) {
				const distMm = Number(((distPx / zoom) * pixelSpacingMm).toFixed(1));
				setSavedRulerDistanceMm(distMm);
				triggerHaptic();
				showToast(`Измерение: ${distMm} мм`, "success");
			} else {
				setRulerStart(null);
				setRulerCurrent(null);
			}
		}
	};

	return (
		<main
			ref={viewportRef}
			className="mobile-radiology-viewport"
			data-testid="mobile-radiology-viewport"
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
		>
			{/* Scale HUD Badge */}
			<div className="mobile-radiology-scale-badge" data-testid="mobile-scale-hud">
				{zoom.toFixed(1)}x {rotationDeg !== 0 ? `· ${rotationDeg}°` : ""}
			</div>

			{/* Ruler Caliper Banner when Ruler is active */}
			{isRulerActive && (
				<div className="mobile-radiology-ruler-banner" data-testid="mobile-ruler-banner">
					<Ruler size={13} className="text-white shrink-0" />
					<span>
						{savedRulerDistanceMm !== null
							? `Длина: ${savedRulerDistanceMm} мм`
							: "Проведите пальцем для замера (мм)"}
					</span>
					{savedRulerDistanceMm !== null && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setSavedRulerDistanceMm(null);
								setRulerStart(null);
								setRulerCurrent(null);
							}}
							className="ml-1 p-0.5 rounded text-white/80 hover:text-white"
							title="Сбросить замер"
						>
							<X size={12} />
						</button>
					)}
				</div>
			)}

			{/* Active Image or RVG Vector Fallback */}
			<div
				className="mobile-radiology-canvas-wrap"
				style={{
					transform: computedTransform,
					transition: touchStartRef.current.dist > 0 ? "none" : "transform 0.15s ease-out",
				}}
			>
				{effectivePreviewUrl && !previewLoadError ? (
					<img
						src={effectivePreviewUrl}
						alt={selectedImagingStudy?.title || "Рентген-снимок"}
						className="mobile-radiology-img"
						style={{ filter: computedFilter }}
						data-testid="mobile-active-xray-image"
					/>
				) : (
					<div
						className="w-72 h-80 rounded-2xl border-2 border-dashed border-teal-500/30 bg-slate-900/80 p-5 flex flex-col items-center justify-center text-center gap-3 select-none"
						data-testid="mobile-rvg-vector-placeholder"
					>
						<div className="w-14 h-14 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
							<UploadCloud size={28} />
						</div>
						<div className="text-sm font-bold text-white">
							{selectedImagingStudy?.title || "Интраоральный RVG снимок"}
						</div>
						<div className="text-xs text-slate-400">
							{selectedStudyHasFile
								? "Снимок готов к просмотру"
								: "Файл визиографа не прикреплен к карточке"}
						</div>
						<button
							type="button"
							onClick={onPickFiles}
							className="mt-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
							data-testid="btn-mobile-attach-xray"
						>
							<UploadCloud size={14} />
							<span>Загрузить снимок</span>
						</button>
					</div>
				)}

				{/* Caliper Measurement Overlay Line */}
				{isRulerActive && rulerStart && rulerCurrent && (
					<svg
						className="absolute inset-0 w-full h-full pointer-events-none"
						style={{ overflow: "visible" }}
					>
						<line
							x1={rulerStart.x}
							y1={rulerStart.y}
							x2={rulerCurrent.x}
							y2={rulerCurrent.y}
							stroke="#10b981"
							strokeWidth="2.5"
							strokeDasharray="4 2"
						/>
						<circle cx={rulerStart.x} cy={rulerStart.y} r="4" fill="#10b981" />
						<circle cx={rulerCurrent.x} cy={rulerCurrent.y} r="4" fill="#10b981" />
					</svg>
				)}
			</div>

			{/* AI Loading indicator */}
			{isAnalyzingAI && (
				<div
					className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 z-40"
					data-testid="mobile-ai-analyzing-modal"
				>
					<div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 animate-spin mb-3">
						<RefreshCw size={24} />
					</div>
					<div className="text-sm font-bold text-white mb-1">
						ShadowAnalyst ИИ анализирует снимок...
					</div>
					<div className="text-xs text-slate-400">
						Выявление кариеса дентина, периапикальных очагов и резорбции
					</div>
				</div>
			)}
		</main>
	);
};
