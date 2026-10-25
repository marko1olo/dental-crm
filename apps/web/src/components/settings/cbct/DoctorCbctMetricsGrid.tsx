import React from "react";
import type { DoctorCbctDefaultSettings } from "../../radiology/cbctLutMath";

interface DoctorCbctMetricsGridProps {
	settings: DoctorCbctDefaultSettings;
	interpolationLabel: string;
	interpolationTooltip?: string | undefined;
}

export function DoctorCbctMetricsGrid({
	settings,
	interpolationLabel,
	interpolationTooltip,
}: DoctorCbctMetricsGridProps) {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-7 gap-2.5">
			<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
				<span className="text-[10px] font-semibold text-[var(--muted)]">Ширина окна (WW)</span>
				<span className="text-xs font-mono font-bold text-[var(--ink)] mt-0.5">
					{settings.windowWidth} HU
				</span>
			</div>

			<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
				<span className="text-[10px] font-semibold text-[var(--muted)]">Уровень окна (WL)</span>
				<span className="text-xs font-mono font-bold text-[var(--ink)] mt-0.5">
					{settings.windowLevel} HU
				</span>
			</div>

			<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
				<span className="text-[10px] font-semibold text-[var(--muted)]">Гамма-кривая</span>
				<span className="text-xs font-mono font-bold text-[var(--ink)] mt-0.5">
					{settings.gamma.toFixed(2)}
				</span>
			</div>

			<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
				<span className="text-[10px] font-semibold text-[var(--muted)]">Отсечение воздуха</span>
				<span className="text-xs font-mono font-bold text-[var(--ink)] mt-0.5">
					{settings.airCutoffHU} HU
				</span>
			</div>

			<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
				<span className="text-[10px] font-semibold text-[var(--muted)]">Толщина MPR</span>
				<span className="text-xs font-mono font-bold text-[var(--ink)] mt-0.5">
					{settings.mprThicknessMm.toFixed(1)} мм
				</span>
			</div>

			<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
				<span className="text-[10px] font-semibold text-[var(--muted)]">Слой ОПТГ</span>
				<span className="text-xs font-mono font-bold text-[var(--ink)] mt-0.5">
					{settings.panoThicknessMm.toFixed(1)} мм
				</span>
			</div>

			<div
				className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between"
				data-testid="cbct-metric-interpolation"
			>
				<span className="text-[10px] font-semibold text-[var(--muted)]">2D-Интерполяция</span>
				<span
					className="text-xs font-semibold text-[var(--teal)] mt-0.5"
					title={interpolationTooltip}
				>
					{interpolationLabel.replace(/\s*\(.*\)/, "")}
				</span>
			</div>
		</div>
	);
}
