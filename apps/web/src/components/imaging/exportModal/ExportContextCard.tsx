/**
 * ExportContextCard.tsx — Карточка контекста исследования и пациента (Мандат 8b <= 120 строк).
 */

import React from "react";
import type { ImagingStudy } from "../types";
import type { RulerMeasurement, AngleMeasurement, PeriapicalLesion } from "../../visiograph/VisiographMeasurementMath";

interface ExportContextCardProps {
	effectiveStudy: Partial<ImagingStudy>;
	toothCode?: string | null | undefined;
	patientName: string;
	cardNum: string;
	doctorName: string;
	rulers?: RulerMeasurement[] | undefined;
	angles?: AngleMeasurement[] | undefined;
	lesions?: PeriapicalLesion[] | undefined;
}

export const ExportContextCard: React.FC<ExportContextCardProps> = ({
	effectiveStudy,
	toothCode,
	patientName,
	cardNum,
	doctorName,
	rulers,
	angles,
	lesions,
}) => {
	return (
		<div className="p-3 rounded-xl border border-[var(--line,#334155)] bg-[var(--paper-soft,#1e293b)] flex flex-col gap-1.5 text-xs">
			<div className="flex items-center justify-between">
				<span className="text-[var(--muted,#94a3b8)]">Исследование:</span>
				<strong className="font-semibold truncate max-w-[240px]">{effectiveStudy.title}</strong>
			</div>
			{toothCode && (
				<div className="flex items-center justify-between">
					<span className="text-[var(--muted,#94a3b8)]">Зуб (FDI):</span>
					<strong className="font-semibold text-[var(--teal,#0d9488)]">№ {toothCode}</strong>
				</div>
			)}
			<div className="flex items-center justify-between">
				<span className="text-[var(--muted,#94a3b8)]">Пациент:</span>
				<strong className="font-semibold">{patientName}</strong>
			</div>
			<div className="flex items-center justify-between">
				<span className="text-[var(--muted,#94a3b8)]">Амб. карта:</span>
				<span className="font-mono text-[11px]">{cardNum}</span>
			</div>
			<div className="flex items-center justify-between">
				<span className="text-[var(--muted,#94a3b8)]">Врач:</span>
				<span>{doctorName} (ЭЦП ГОСТ Р 34.10)</span>
			</div>
			{rulers && (rulers.length > 0 || (angles && angles.length > 0) || (lesions && lesions.length > 0)) && (
				<div className="flex items-center justify-between border-t border-[var(--line,#334155)] pt-1 mt-0.5">
					<span className="text-[var(--muted,#94a3b8)]">Замеры на снимке:</span>
					<span className="font-medium text-emerald-400">
						{rulers.length} линеек, {angles?.length ?? 0} углов, {lesions?.length ?? 0} очагов
					</span>
				</div>
			)}
			<div className="flex items-center justify-between">
				<span className="text-[var(--muted,#94a3b8)]">Дата съёмки:</span>
				<span>{new Date(effectiveStudy.capturedAt || Date.now()).toLocaleDateString("ru-RU")}</span>
			</div>
		</div>
	);
};
