/**
 * RadiologyArchiveStats.tsx — Сводная статистика картотеки снимков (Мандат 8b).
 */

import React from "react";
import type { ImagingStudy } from "@dental/shared";

export interface RadiologyArchiveStatsProps {
	readonly studies: ImagingStudy[];
}

export const RadiologyArchiveStats: React.FC<RadiologyArchiveStatsProps> = ({ studies }) => {
	const total = studies.length;
	const cbctCount = studies.filter((s) => s.modality === "CT" || s.modality === "DX").length;
	const boundCount = studies.filter((s) => Boolean(s.patientId)).length;
	const unassignedCount = total - boundCount;

	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[var(--paper)] border-b border-[var(--line)]">
			<div className="p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)]">
				<div className="text-[10px] text-[var(--text-muted)]">Всего снимков</div>
				<div className="text-sm font-bold text-[var(--text)]">{total}</div>
			</div>
			<div className="p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)]">
				<div className="text-[10px] text-[var(--text-muted)]">3D КЛКТ</div>
				<div className="text-sm font-bold text-[var(--primary)]">{cbctCount}</div>
			</div>
			<div className="p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)]">
				<div className="text-[10px] text-[var(--text-muted)]">В картах пациентов</div>
				<div className="text-sm font-bold text-[var(--text)]">{boundCount}</div>
			</div>
			<div className="p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)]">
				<div className="text-[10px] text-[var(--text-muted)]">Ожидают привязки</div>
				<div className="text-sm font-bold text-[var(--warning,orange)]">{unassignedCount}</div>
			</div>
		</div>
	);
};
