import React from "react";
import { Activity, Compass, Ruler, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import type { ImagingMeasurement, ViewerRulerMeasurement } from "./types";

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
	const hasNerveWarning = typeof nerveDistanceMm === "number" && nerveDistanceMm < 2.0;

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

			{/* Calibration status chip */}
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

			{/* Measurements List */}
			{measurements.length > 0 ? (
				<div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
					{measurements.map((m, idx) => (
						<div
							key={m.id || idx}
							className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-[var(--paper)] border border-[var(--line)] text-[11px]"
						>
							<div className="flex items-center gap-1.5 min-w-0">
								<span className="w-2 h-2 rounded-full bg-[var(--teal,#0d9488)] shrink-0" />
								<span className="truncate text-[var(--ink)]">
									{m.label || `Отрезок #${idx + 1}`}
								</span>
							</div>
							<div className="flex items-center gap-2 shrink-0 font-mono font-semibold text-[var(--ink)]">
								<span>{m.distanceMm.toFixed(1)} мм</span>
								<button
									type="button"
									onClick={() =>
										onMeasurementsChange(measurements.filter((_, i) => i !== idx))
									}
									className="text-[var(--muted)] hover:text-red-400 cursor-pointer"
									title="Удалить замер"
								>
									×
								</button>
							</div>
						</div>
					))}
				</div>
			) : (
				<p className="text-[11px] text-[var(--muted)] m-0">
					{isRulerActive
						? "Кликните и потяните по снимку для замера расстояния в мм"
						: "Включите линейку для измерения имплантационного ложа или кости"}
				</p>
			)}

			{/* Advanced Clinical Diagnostics (Nerve & Bone Density) */}
			{(typeof nerveDistanceMm === "number" || typeof boneDensityHU === "number") && (
				<div className="flex flex-col gap-1.5 pt-1.5 border-t border-[var(--line)]">
					{typeof nerveDistanceMm === "number" && (
						<div
							className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-[11px] font-medium ${
								hasNerveWarning
									? "bg-red-500/10 text-red-600 border border-red-500/20"
									: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20"
							}`}
						>
							<div className="flex items-center gap-1.5">
								{hasNerveWarning ? (
									<ShieldAlert size={13} className="shrink-0 text-red-500" />
								) : (
									<Activity size={13} className="shrink-0" />
								)}
								<span>Нижнечелюстной канал:</span>
							</div>
							<strong className="font-mono">
								{nerveDistanceMm.toFixed(1)} мм {hasNerveWarning ? "(Опасно!)" : "(Безопасно)"}
							</strong>
						</div>
					)}

					{typeof boneDensityHU === "number" && (
						<div className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-[var(--paper)] border border-[var(--line)] text-[11px]">
							<span className="text-[var(--muted)]">Плотность кости (Хаунсфилд):</span>
							<strong className="font-mono text-[var(--ink)]">{boneDensityHU} HU</strong>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
