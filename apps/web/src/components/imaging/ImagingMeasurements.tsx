/**
 * ImagingMeasurements.tsx — Панель измерений, калибровки и контроля безопасности
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Ruler, Trash2 } from "lucide-react";
import type { ViewerRulerMeasurement } from "./types.js";
import { ImagingMeasurementsList } from "./measurements/ImagingMeasurementsList.js";
import { ImagingSafetyDiagnostics } from "./measurements/ImagingSafetyDiagnostics.js";

export interface ImagingMeasurementsProps {
	measurements: ViewerRulerMeasurement[];
	onMeasurementsChange: (measurements: ViewerRulerMeasurement[]) => void;
	pixelSpacingMm: number;
	nerveDistanceMm?: number | null;
	boneDensityHU?: number | null;
	isRulerActive: boolean;
	onToggleRuler: () => void;
}

export function ImagingMeasurements({
	measurements,
	onMeasurementsChange,
	pixelSpacingMm,
	nerveDistanceMm,
	boneDensityHU,
	isRulerActive,
	onToggleRuler,
}: ImagingMeasurementsProps) {
	return (
		<div
			className="imaging-measurements-overlay flex flex-col gap-2 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs"
			data-testid="imaging-measurements-panel"
		>
			<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
				<div className="flex items-center gap-2">
					<Ruler size={15} className="text-[var(--teal,#0d9488)]" />
					<strong className="font-semibold text-[var(--ink)]">Измерения и калибровка</strong>
				</div>
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={onToggleRuler}
						className={`px-2 py-1 rounded text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer ${
							isRulerActive
								? "bg-[var(--teal,#0d9488)] text-white shadow-2xs"
								: "border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper)]"
						}`}
					>
						<span>{isRulerActive ? "Линейка вкл" : "Включить"}</span>
					</button>
					{measurements.length > 0 && (
						<button
							type="button"
							onClick={() => onMeasurementsChange([])}
							className="p-1 rounded text-[var(--muted)] hover:text-red-500 hover:bg-[var(--paper)] transition-colors cursor-pointer"
							title="Очистить все замеры"
						>
							<Trash2 size={13} />
						</button>
					)}
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
				<span className="px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] font-mono">
					Масштаб: {pixelSpacingMm.toFixed(3)} мм/пикс
				</span>
				{measurements.length > 0 && (
					<span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 font-medium">
						Замеров: {measurements.length}
					</span>
				)}
			</div>

			<ImagingMeasurementsList
				measurements={measurements}
				onMeasurementsChange={onMeasurementsChange}
				isRulerActive={isRulerActive}
			/>

			<ImagingSafetyDiagnostics
				nerveDistanceMm={nerveDistanceMm}
				boneDensityHU={boneDensityHU}
			/>
		</div>
	);
}
