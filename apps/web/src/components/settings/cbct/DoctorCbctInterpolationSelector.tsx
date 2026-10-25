import { Info, Layers } from "lucide-react";
import React from "react";
import {
	CBCT_INTERPOLATION_METHODS,
	type CbctInterpolationMethod,
} from "../../radiology/cbctLutMath";

interface DoctorCbctInterpolationSelectorProps {
	activeInterpolation: CbctInterpolationMethod;
	onSelect: (method: CbctInterpolationMethod) => void;
}

export function DoctorCbctInterpolationSelector({
	activeInterpolation,
	onSelect,
}: DoctorCbctInterpolationSelectorProps) {
	const activeMeta =
		CBCT_INTERPOLATION_METHODS.find((m) => m.id === activeInterpolation) ??
		CBCT_INTERPOLATION_METHODS[1];

	return (
		<div
			className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-2.5"
			data-testid="cbct-interpolation-selector-section"
		>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
				<div className="flex items-center gap-2">
					<div className="w-5 h-5 rounded-md bg-teal-500/15 text-[var(--teal)] flex items-center justify-center shrink-0">
						<Layers size={13} />
					</div>
					<span className="text-xs font-bold text-[var(--ink)]">Метод 2D-интерполяции срезов КТ</span>
					<span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] font-mono">
						GPU Shader ES 3.00
					</span>
				</div>
				<span className="text-[11px] text-[var(--muted)]">
					Рекомендовано: <strong className="text-[var(--ink)]">{activeMeta?.recommendedFor}</strong>
				</span>
			</div>

			<div
				className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]"
				role="radiogroup"
				aria-label="Выбор алгоритма 2D-интерполяции срезов КТ"
				data-testid="cbct-interpolation-segmented-control"
			>
				{CBCT_INTERPOLATION_METHODS.map((method) => {
					const isSelected = activeInterpolation === method.id;
					return (
						<button
							key={method.id}
							type="button"
							onClick={() => onSelect(method.id)}
							className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-0.5 ${
								isSelected
									? "bg-[var(--teal)] text-white shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
							}`}
							data-testid={`cbct-interp-btn-${method.id}`}
							role="radio"
							aria-checked={isSelected}
							title={method.descriptionRu}
						>
							<span className="font-bold text-xs">{method.shortLabel}</span>
							<span
								className={`text-[10px] truncate max-w-full ${
									isSelected ? "text-teal-100" : "text-[var(--muted)]"
								}`}
							>
								{method.id === "catmull_rom"
									? "Дефолт • Максимум деталей"
									: method.id === "b_spline"
										? "Шумоподавление • Импланты"
										: "Базовый • 120+ FPS"}
							</span>
						</button>
					);
				})}
			</div>

			<div className="flex items-start gap-2 pt-1 text-[11px] text-[var(--muted)] border-t border-[var(--line)]">
				<Info size={13} className="shrink-0 mt-0.5 text-[var(--teal)]" />
				<div className="leading-tight">
					<strong className="text-[var(--ink)] font-semibold">{activeMeta?.labelRu}:</strong>{" "}
					<span>{activeMeta?.descriptionRu}</span>
				</div>
			</div>
		</div>
	);
}
