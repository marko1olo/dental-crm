/**
 * DicomStudyCard.tsx — Карточка исследования в очереди подтверждения (Мандат 8b <= 120 строк).
 */

import React from "react";
import { Layers, UserCheck, Trash2 } from "lucide-react";
import type { PendingStudyItem } from "./types";

interface DicomStudyCardProps {
	study: PendingStudyItem;
	actionPendingId: string | null;
	onBind: (studyId: string, patientId: string) => void;
	onDismiss: (studyId: string) => void;
}

export const DicomStudyCard: React.FC<DicomStudyCardProps> = ({
	study,
	actionPendingId,
	onBind,
	onDismiss,
}) => {
	const isPending = actionPendingId === study.id;

	return (
		<div
			className="p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
			style={{ background: "var(--paper, #ffffff)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="space-y-1.5">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
						Совпадение: {study.bindingConfidence}%
					</span>
					<span className="font-semibold text-sm">{study.title}</span>
					{study.sliceCount && (
						<span className="text-xs opacity-70 flex items-center gap-1">
							<Layers className="w-3.5 h-3.5" />
							{study.sliceCount} срезов
						</span>
					)}
				</div>

				<div className="text-xs space-y-0.5 opacity-80">
					{study.patientFullName && (
						<p>
							Найдена карточка в CRM:{" "}
							<strong className="text-teal-700 dark:text-teal-300">{study.patientFullName}</strong>
						</p>
					)}
					<p className="opacity-70 text-xs">
						Тег DICOM: {study.dicomPatientName ?? "Не указан"} | Д.Р.: {study.dicomBirthDate ?? "—"}
					</p>
					{study.aiSummary && <p className="text-xs italic opacity-60">{study.aiSummary}</p>}
				</div>
			</div>

			<div className="flex items-center gap-2 self-end md:self-center">
				{study.patientId && (
					<button
						type="button"
						disabled={isPending}
						onClick={() => onBind(study.id, study.patientId!)}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-semibold rounded-lg text-white bg-[var(--teal)] hover:opacity-95 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
					>
						<UserCheck className="w-3.5 h-3.5" />
						<span>Привязать к карте</span>
					</button>
				)}
				<button
					type="button"
					disabled={isPending}
					onClick={() => onDismiss(study.id)}
					className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-rose-600 hover:border-rose-400/50 transition-colors cursor-pointer shadow-2xs"
					title="Скрыть снимок"
				>
					<Trash2 className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
};
