import React from "react";
import { Check, RotateCcw } from "lucide-react";
import {
	BLACK_CAVITY_PRESETS,
	TOOTH_SURFACES_MODBL,
	type ToothSurfaceKey,
} from "./types";

export interface ToothSurfacesSelectorProps {
	code: string;
	selectedSurfaces: string[];
	onSelectSurface?: ((surface: string) => void) | undefined;
	onClearSurfaces?: (() => void) | undefined;
}

export function ToothSurfacesSelector({
	code,
	selectedSurfaces,
	onSelectSurface,
	onClearSurfaces,
}: ToothSurfacesSelectorProps) {
	return (
		<div className="_ccm-surfaces-selector-block mb-3 p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs font-semibold text-[var(--text-strong)] flex items-center gap-1.5">
					<span>Анатомические поверхности (MODBL) · Зуб {code}</span>
					{selectedSurfaces.length > 0 && (
						<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--teal-subtle)] text-[var(--teal)] font-bold">
							[{selectedSurfaces.join("")}]
						</span>
					)}
				</span>
				{selectedSurfaces.length > 0 && onClearSurfaces && (
					<button
						type="button"
						onClick={onClearSurfaces}
						className="text-[11px] text-[var(--muted)] hover:text-red-500 flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors"
						title="Сбросить выбранные поверхности"
						aria-label="Сбросить выбранные поверхности"
					>
						<RotateCcw className="w-3 h-3" />
						<span>Сброс</span>
					</button>
				)}
			</div>

			{/* 5 анатомических поверхностей MODBL */}
			<div className="grid grid-cols-5 gap-1.5 mb-2.5" role="group" aria-label="Анатомические поверхности зуба">
				{TOOTH_SURFACES_MODBL.map((surf) => {
					const isSelected = selectedSurfaces.includes(surf.key);
					return (
						<button
							key={surf.key}
							type="button"
							data-testid={`tooth-surface-btn-${surf.key.toLowerCase()}`}
							onClick={() => onSelectSurface?.(surf.key)}
							className={`flex flex-col items-center justify-center min-h-[44px] p-1.5 rounded-md border text-center transition-all ${
								isSelected
									? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-sm font-bold"
									: "bg-[var(--paper)] text-[var(--text)] border-[var(--line)] hover:border-[var(--teal)]"
							}`}
							title={`${surf.fullRu}: ${surf.description}`}
							aria-pressed={isSelected}
						>
							<span className="text-sm font-mono leading-none">{surf.label}</span>
							<span className="text-[9px] mt-0.5 truncate max-w-full opacity-80">
								{surf.fullRu.slice(0, 4)}.
							</span>
						</button>
					);
				})}
			</div>

			{/* Быстрые пресеты полостей по Блэку */}
			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-[11px] text-[var(--muted)] font-medium shrink-0">
					Пресеты:
				</span>
				{BLACK_CAVITY_PRESETS.map((preset) => {
					const isPresetActive =
						selectedSurfaces.length === preset.surfaces.length &&
						preset.surfaces.every((s) => selectedSurfaces.includes(s));
					return (
						<button
							key={preset.code}
							type="button"
							data-testid={`preset-cavity-${preset.code.toLowerCase()}`}
							onClick={() => {
								if (onSelectSurface) {
									// Если уже выбран этот пресет — не дублируем
									onSelectSurface(preset.code);
								}
							}}
							className={`text-[11px] font-mono px-2 py-1 min-h-[30px] rounded border transition-colors flex items-center gap-1 ${
								isPresetActive
									? "bg-[var(--teal-subtle)] text-[var(--teal)] border-[var(--teal)] font-bold"
									: "bg-[var(--paper)] text-[var(--text)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
							}`}
							title={preset.name}
						>
							{isPresetActive && <Check className="w-3 h-3 text-[var(--teal)]" />}
							<span>{preset.code}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
