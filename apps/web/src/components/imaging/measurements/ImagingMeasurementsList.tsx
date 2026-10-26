/**
 * ImagingMeasurementsList.tsx — Список проведенных измерений с удалением
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import type { ViewerRulerMeasurement } from "../types.js";

interface Props {
	measurements: ViewerRulerMeasurement[];
	onMeasurementsChange: (measurements: ViewerRulerMeasurement[]) => void;
	isRulerActive: boolean;
}

export const ImagingMeasurementsList: React.FC<Props> = ({
	measurements,
	onMeasurementsChange,
	isRulerActive,
}) => {
	if (measurements.length === 0) {
		return (
			<p className="text-[11px] text-[var(--muted)] m-0">
				{isRulerActive
					? "Кликните и потяните по снимку для замера расстояния в мм"
					: "Включите линейку для измерения имплантационного ложа или кости"}
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
			{measurements.map((m, idx) => (
				<div
					key={m.id || idx}
					className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-[var(--paper)] border border-[var(--line)] text-[11px]"
				>
					<div className="flex items-center gap-1.5 min-w-0">
						<span className="w-2 h-2 rounded-full bg-[var(--teal,#0d9488)] shrink-0" />
						<span className="truncate text-[var(--ink)]">{m.label || `Отрезок #${idx + 1}`}</span>
					</div>
					<div className="flex items-center gap-2 shrink-0 font-mono font-semibold text-[var(--ink)]">
						<span>{(m.distanceMm ?? m.lengthMm ?? 0).toFixed(1)} мм</span>
						<button
							type="button"
							onClick={() => onMeasurementsChange(measurements.filter((_, i) => i !== idx))}
							className="text-[var(--muted)] hover:text-red-400 cursor-pointer"
							title="Удалить замер"
						>
							×
						</button>
					</div>
				</div>
			))}
		</div>
	);
};
