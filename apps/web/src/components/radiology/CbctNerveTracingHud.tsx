/**
 * DENTE CRM — CBCT Mandibular Nerve Tracing HUD Overlay
 * Planmeca Romexis / 3Shape Implant Studio clinical workflow
 *
 * Visual & Ergonomic Invariants:
 * 1. Zero idle HUD pollution: Renders STRICTLY when activeTool === "nerve".
 * 2. Doctor Autonomy (Mandate 8e): 1-click fallback between [ ⚡ Авто (2 клика) | ✏️ Вручную ].
 * 3. Clinical Russian terminology (zero engineering jargon):
 *    - Step 1: «Шаг 1: Укажите ментальное отверстие»
 *    - Step 2: «Шаг 2: Укажите нижнечелюстное отверстие»
 *    - Completed: «Нижнечелюстной нерв: XX.X мм» (static badge, not clickable pseudo-button)
 *    - Sides: Segmented Bar [ Правый ] | [ Левый ]
 *    - Reset: «↺ Сбросить»
 * 4. Dense, non-blocking floating bar with backdrop blur and WCAG AAA contrast.
 *
 * Mandate 8b compliant (strictly <= 800 lines).
 */

import { Check, Info, RotateCcw, Trash2 } from "lucide-react";
import React, { useState } from "react";
import type { Point3D } from "./cbctMprMath.js";
import { formatNerveStepStatus } from "./mpr/cbctNerveHitTest.js";
import type { NerveCanalSide, NerveTracingMode } from "./mpr/cbctStudioTypes.js";

export interface CbctNerveTracingHudProps {
	readonly activeTool: string;
	readonly activeSide: NerveCanalSide;
	readonly onSwitchSide: (side: NerveCanalSide) => void;
	readonly tracingMode?: NerveTracingMode | undefined;
	readonly onSwitchTracingMode?: ((mode: NerveTracingMode) => void) | undefined;
	readonly nervePoints: readonly Point3D[];
	readonly nerveTotalLengthMm: number;
	readonly selectedNerveNodeIdx?: number | null | undefined;
	readonly onResetNerve: () => void;
	readonly onDeleteSelectedNode?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export const CbctNerveTracingHud: React.FC<CbctNerveTracingHudProps> = ({
	activeTool,
	activeSide,
	onSwitchSide,
	tracingMode,
	onSwitchTracingMode,
	nervePoints,
	nerveTotalLengthMm,
	selectedNerveNodeIdx,
	onResetNerve,
	onDeleteSelectedNode,
	className = "",
}) => {
	// 1. СТРОГО ПО КНОПКЕ ДЛЯ КАНАЛА: HUD отображается ТОЛЬКО когда активен инструмент нерва
	if (activeTool !== "nerve") {
		return null;
	}

	const [internalMode, setInternalMode] = useState<NerveTracingMode>("auto");
	const effectiveMode = tracingMode ?? internalMode;
	const handleModeChange = (mode: NerveTracingMode) => {
		if (onSwitchTracingMode) {
			onSwitchTracingMode(mode);
		} else {
			setInternalMode(mode);
		}
	};

	const status = formatNerveStepStatus(
		nervePoints.length,
		nerveTotalLengthMm,
		activeSide,
		effectiveMode,
	);

	return (
		<div
			className={`absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950/95 border border-zinc-800 backdrop-blur-md shadow-2xl transition-all w-max max-w-[calc(100%-16px)] shrink-0 ${className}`}
			style={{ width: "max-content", maxWidth: "calc(100% - 16px)" }}
			data-testid="cbct-nerve-tracing-hud"
			data-nerve-step={status.step}
			data-nerve-side={activeSide}
			data-nerve-mode={effectiveMode}
		>
			{/* 1. БИЛАТЕРАЛЬНЫЙ ПЕРЕКЛЮЧАТЕЛЬ СТОРОНЫ (Apple HIG Segmented Bar) */}
			<div
				className="flex items-center gap-0.5 p-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] shrink-0"
				role="group"
				aria-label="Сторона нижнечелюстного канала"
			>
				<button
					type="button"
					onClick={() => onSwitchSide("right")}
					className={`px-2.5 py-0.5 rounded font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 text-[11px] ${
						activeSide === "right"
							? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
							: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
					}`}
					title="Правый нижнечелюстной канал (квадрант 4)"
					data-testid="cbct-nerve-hud-side-right-btn"
				>
					Правый
				</button>
				<button
					type="button"
					onClick={() => onSwitchSide("left")}
					className={`px-2.5 py-0.5 rounded font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 text-[11px] ${
						activeSide === "left"
							? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
							: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
					}`}
					title="Левый нижнечелюстной канал (квадрант 3)"
					data-testid="cbct-nerve-hud-side-left-btn"
				>
					Левый
				</button>
			</div>

			{/* 2. РЕЖИМ ТРАССИРОВКИ (МАНДАТ 8e: АВТОНОМИЯ ВРАЧА / РУЧНОЙ ФОЛБЕК) */}
			<div
				className="flex items-center gap-0.5 p-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] shrink-0"
				role="group"
				aria-label="Режим трассировки канала"
			>
				<button
					type="button"
					onClick={() => handleModeChange("auto")}
					className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 text-[11px] flex items-center gap-1 ${
						effectiveMode === "auto"
							? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
							: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
					}`}
					title="Автоматическая трассировка (2 клика: ментальное -> нижнечелюстное отверстие)"
					data-testid="cbct-nerve-hud-mode-auto-btn"
				>
					<span>⚡ Авто (2 клика)</span>
				</button>
				<button
					type="button"
					onClick={() => handleModeChange("manual")}
					className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 text-[11px] flex items-center gap-1 ${
						effectiveMode === "manual"
							? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
							: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
					}`}
					title="Ручная разметка: кликайте по срезам вдоль канала, перетаскивайте узлы мышью"
					data-testid="cbct-nerve-hud-mode-manual-btn"
				>
					<span>✏️ Вручную</span>
				</button>
			</div>

			{/* 3. ИНДИКАТОР ТЕКУЩЕГО ШАГА / РЕЗУЛЬТАТА (Чистый аккуратный статический бейдж) */}
			<div className="flex items-center gap-1.5 shrink-0">
				<div
					className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${status.badgeClass}`}
					data-testid="cbct-nerve-hud-step-badge"
					title={status.hintRu}
				>
					{status.step === 1 && (
						<span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping" />
					)}
					{status.step === 2 && (
						<span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-ping" />
					)}
					{status.step === 3 && (
						<Check className="w-3.5 h-3.5 text-cyan-300 shrink-0 stroke-[2.5]" />
					)}
					<span className="whitespace-nowrap">{status.titleRu}</span>
				</div>
			</div>

			{/* 4. КНОПКИ УПРАВЛЕНИЯ ТРАССОЙ (1-КЛИК СБРОС И УДАЛЕНИЕ УЗЛА) */}
			<div className="flex items-center gap-1 pl-1 border-l border-zinc-800 shrink-0">
				{selectedNerveNodeIdx !== null &&
					selectedNerveNodeIdx !== undefined &&
					onDeleteSelectedNode && (
						<button
							type="button"
							onClick={onDeleteSelectedNode}
							className="h-7 px-2 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-rose-100 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
							style={{ whiteSpace: "nowrap" }}
							title={`Удалить выбранный узел #${selectedNerveNodeIdx + 1} (Backspace)`}
							data-testid="cbct-nerve-hud-delete-node-btn"
						>
							<Trash2 className="w-3 h-3" />
							<span>Узел #{selectedNerveNodeIdx + 1}</span>
						</button>
					)}

				<button
					type="button"
					onClick={onResetNerve}
					disabled={nervePoints.length === 0}
					className="h-7 px-2.5 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700/60 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
					style={{ whiteSpace: "nowrap" }}
					title="Сбросить трассировку канала"
					data-testid="cbct-nerve-hud-reset-btn"
				>
					<RotateCcw className="w-3 h-3 text-amber-400" />
					<span>Сбросить</span>
				</button>
			</div>

			{/* 5. ТИХАЯ ПОДСКАЗКА ВРАЧУ О ПОДГОНКЕ */}
			{status.isCompleted && (
				<div
					className="hidden xl:flex items-center gap-1 text-[10px] text-zinc-400 pl-1 border-l border-zinc-800 shrink-0"
					title="Перетащите любой узел мышью или кликните на срезе для добавления контрольной точки"
				>
					<Info className="w-3 h-3 text-cyan-400 shrink-0" />
					<span className="whitespace-nowrap">Тяните узел для подгонки</span>
				</div>
			)}
		</div>
	);
};

export default CbctNerveTracingHud;
