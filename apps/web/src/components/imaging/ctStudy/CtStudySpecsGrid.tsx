/**
 * CtStudySpecsGrid.tsx — Сетка параметров томографии (вокслы, срезы, матрица)
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Layers } from "lucide-react";

interface Props {
	manufacturer?: string | null | undefined;
	sliceCount?: number | null | undefined;
	dimensions?: string | null | undefined;
	voxelSpacing?: string | null | undefined;
}

export const CtStudySpecsGrid: React.FC<Props> = ({
	manufacturer,
	sliceCount,
	dimensions,
	voxelSpacing,
}) => {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs">
			<div>
				<span className="block text-[var(--muted)] text-xs uppercase tracking-wide font-medium">Томограф</span>
				<strong className="truncate block font-semibold text-[var(--ink)]">{manufacturer || "Стандартный DICOM"}</strong>
			</div>
			<div>
				<span className="block text-[var(--muted)] text-xs uppercase tracking-wide font-medium">Кол-во срезов</span>
				<strong className="block font-semibold text-[var(--ink)] flex items-center gap-1">
					<Layers className="w-3 h-3 text-[var(--muted)]" />
					{sliceCount || "—"}
				</strong>
			</div>
			<div>
				<span className="block text-[var(--muted)] text-xs uppercase tracking-wide font-medium">Размер кадра</span>
				<strong className="block font-semibold text-[var(--ink)]">{dimensions || "—"}</strong>
			</div>
			<div>
				<span className="block text-[var(--muted)] text-xs uppercase tracking-wide font-medium">Размер вокселя</span>
				<strong className="block font-semibold text-[var(--ink)]">{voxelSpacing || "—"}</strong>
			</div>
		</div>
	);
};
