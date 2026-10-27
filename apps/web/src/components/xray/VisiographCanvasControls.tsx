/**
 * VisiographCanvasControls.tsx — Элементы управления холстом снимка (зум, поворот, линейка 5мм)
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { RotateCw, Ruler, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";

export interface VisiographCanvasControlsProps {
	readonly zoom: number;
	readonly onZoomIn: () => void;
	readonly onZoomOut: () => void;
	readonly onRotate: () => void;
	readonly onReset: () => void;
	readonly isRulerActive?: boolean;
	readonly onToggleRuler?: () => void;
	readonly calibrationMm?: number;
}

export function VisiographCanvasControls({
	zoom,
	onZoomIn,
	onZoomOut,
	onRotate,
	onReset,
	isRulerActive = false,
	onToggleRuler,
	calibrationMm = 5,
}: VisiographCanvasControlsProps) {
	return (
		<div
			className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] shadow-xs"
			data-testid="visiograph-canvas-controls"
			role="toolbar"
			aria-label="Управление просмотром снимка"
		>
			<button
				type="button"
				onClick={onZoomOut}
				data-testid="btn-xray-zoom-out"
				className="h-8 min-h-[32px] sm:min-h-[32px] min-w-[32px] sm:min-w-[32px] px-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper,#0f172a)] text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center justify-center cursor-pointer touch-manipulation"
				title="Уменьшить масштаб"
			>
				<ZoomOut size={15} />
			</button>

			<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] px-1 select-none tabular-nums">
				{Math.round(zoom * 100)}%
			</span>

			<button
				type="button"
				onClick={onZoomIn}
				data-testid="btn-xray-zoom-in"
				className="h-8 min-h-[32px] sm:min-h-[32px] min-w-[32px] sm:min-w-[32px] px-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper,#0f172a)] text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center justify-center cursor-pointer touch-manipulation"
				title="Увеличить масштаб"
			>
				<ZoomIn size={15} />
			</button>

			<div className="w-[1px] h-4 bg-[var(--line,#e2e8f0)] dark:bg-[var(--line,#334155)] mx-0.5" />

			<button
				type="button"
				onClick={onRotate}
				data-testid="btn-xray-rotate"
				className="h-8 min-h-[32px] sm:min-h-[32px] min-w-[32px] sm:min-w-[32px] px-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper,#0f172a)] text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center justify-center cursor-pointer touch-manipulation"
				title="Повернуть на 90°"
			>
				<RotateCw size={15} />
			</button>

			{onToggleRuler && (
				<button
					type="button"
					onClick={onToggleRuler}
					data-testid="btn-xray-ruler"
					className={`h-8 min-h-[32px] sm:min-h-[32px] px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation ${
						isRulerActive
							? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] font-semibold"
							: "border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper,#0f172a)] text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft)]"
					}`}
					title={`Эндодонтическая калиброванная линейка (${calibrationMm} мм)`}
				>
					<Ruler size={14} className={isRulerActive ? "text-[var(--teal,#0d9488)]" : "text-[var(--muted,#64748b)]"} />
					<span className="hidden sm:inline">Линейка {calibrationMm}мм</span>
				</button>
			)}

			<button
				type="button"
				onClick={onReset}
				data-testid="btn-xray-reset"
				className="h-8 min-h-[32px] sm:min-h-[32px] min-w-[32px] sm:min-w-[32px] px-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper,#0f172a)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center justify-center cursor-pointer touch-manipulation"
				title="Сбросить масштаб и положение"
			>
				<RefreshCw size={14} />
			</button>
		</div>
	);
}
