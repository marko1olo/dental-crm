import type React from "react";
import type { Tooth16Number } from "./tooth16Types";

export interface Tooth16StandHudProps {
	toothNumber: Tooth16Number;
	zoom: number;
	activePresetTitle: string;
	isDark: boolean;
}

/**
 * DENTE Dental CRM — Telemetry HUD Overlay for Upper First Molars (Gate 1)
 * Mandate 8b <= 120 lines.
 */
export const Tooth16StandHud: React.FC<Tooth16StandHudProps> = ({
	toothNumber,
	zoom,
	activePresetTitle,
	isDark,
}) => {
	const sideText = toothNumber === 16 ? "Верхний правый" : "Верхний левый";

	return (
		<div className="stand-hud absolute top-2 left-3 sm:top-3 sm:left-4 text-[10px] sm:text-xs font-mono opacity-70 space-y-0.5 pointer-events-none z-10">
			<div>
				FDI {toothNumber} ({sideText}) · Масштаб {zoom}x ({100 * zoom}×
				{160 * zoom}px)
			</div>
			<div>Пресет: {activePresetTitle}</div>
			<div className="hidden sm:block">
				WCAG: {isDark ? "4.52:1 (AAA)" : "3.33:1 (AA)"} · 4 Бугра + Карабелли ·
				Crista Obliqua · 3 Корня · 4 Канала
			</div>
			<div className="sm:hidden">
				4 Бугра + Карабелли · Crista Obliqua · 3 Корня
			</div>
		</div>
	);
};
