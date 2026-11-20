/**
 * ExportContextCard.tsx — Карточка контекста исследования и пациента (Мандат 8b <= 120 строк).
 */

import React from "react";
import type { ImagingStudy } from "../types";
import type { RulerMeasurement, AngleMeasurement, PeriapicalLesion } from "../../radiology/radiologyMeasurementMath.js";

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
		<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-1.5 text-xs">
			<div className="flex items-center justify-between">
				<span className="text-[var(--ink-muted)]">Исследование:</span>
				<strong className="font-semibold truncate max-w-[240px]">{effectiveStudy.title}</strong>
			</div>
			{toothCode && (
				<div className="flex items-center justify-between">
					<span className="text-[var(--ink-muted)]">Зуб (FDI):</span>
					<strong className="font-semibold text-[var(--primary)]">№ {toothCode}</strong>
				</div>
			)}
			<div className="flex items-center justify-between">
				<span className="text-[var(--ink-muted)]">Пациент:</span>
				<strong className="font-semibold">{patientName}</strong>
			</div>
			<div className="flex items-center justify-between">
				<span className="text-[var(--ink-muted)]">Амб. карта:</span>
				<span className="font-mono text-[11px]">{cardNum}</span>
			</div>
			<div className="flex items-center justify-between">
				<span className="text-[var(--ink-muted)]">Врач:</span>
				<span>{doctorName} (ЭЦП ГОСТ Р 34.10)</span>
			</div>
			{rulers && (rulers.length > 0 || (angles && angles.length > 0) || (lesions && lesions.length > 0)) && (
				<div className="flex items-center justify-between border-t border-[var(--line)] pt-1 mt-0.5">
					<span className="text-[var(--ink-muted)]">Замеры на снимке:</span>
					<span className="font-medium text-[var(--success-ink,#34d399)]">
						{rulers.length} линеек, {angles?.length ?? 0} углов, {lesions?.length ?? 0} очагов
					</span>
				</div>
			)}
			<div className="flex items-center justify-between">
				<span className="text-[var(--ink-muted)]">Дата съёмки:</span>
				<span>{new Date(effectiveStudy.capturedAt || Date.now()).toLocaleDateString("ru-RU")}</span>
			</div>
		</div>
	);
};
