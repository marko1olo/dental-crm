/**
 * DicomStudiesList.tsx — Списки распознанных и нераспознанных исследований (Мандат 8b <= 120 строк).
 */

import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { PendingStudyItem } from "./types";
import { DicomStudyCard } from "./DicomStudyCard";

interface DicomStudiesListProps {
	mode: "pending" | "unassigned";
	studies: PendingStudyItem[];
	actionPendingId: string | null;
	onBind: (studyId: string, patientId: string) => void;
	onDismiss: (studyId: string) => void;
}

export const DicomStudiesList: React.FC<DicomStudiesListProps> = ({
	mode,
	studies,
	actionPendingId,
	onBind,
	onDismiss,
}) => {
	if (mode === "pending") {
		if (studies.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center py-12 text-center opacity-60 space-y-2">
					<CheckCircle2 className="w-10 h-10 text-teal-600" />
					<p className="text-sm font-semibold">Все снимки подтверждены</p>
					<p className="text-xs max-w-sm">Новые срезы КТ появятся здесь автоматически при экспорте.</p>
				</div>
			);
		}
		return (
			<div className="space-y-3">
				{studies.map((study) => (
					<DicomStudyCard
						key={study.id}
						study={study}
						actionPendingId={actionPendingId}
						onBind={onBind}
						onDismiss={onDismiss}
					/>
				))}
			</div>
		);
	}

	if (studies.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center opacity-60 space-y-2">
				<CheckCircle2 className="w-8 h-8 text-teal-600" />
				<p className="text-sm font-semibold">Нераспознанных снимков нет</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{studies.map((study) => (
				<div
					key={study.id}
					className="p-3.5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
					style={{ background: "var(--paper, #ffffff)", borderColor: "var(--line, #e2e8f0)" }}
				>
					<div className="space-y-1">
						<p className="font-medium text-xs">{study.title} ({study.sliceCount ?? 0} ср.)</p>
						<p className="text-xs text-[var(--muted)]">ФИО в DICOM: {study.dicomPatientName ?? "—"}</p>
					</div>
					<button
						type="button"
						onClick={() => onDismiss(study.id)}
						className="h-8 px-3 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer shadow-2xs"
					>
						Скрыть
					</button>
				</div>
			))}
		</div>
	);
};
