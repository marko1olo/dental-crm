import type React from "react";
import { AlertTriangle } from "lucide-react";
import { getIcdColor, ICD10_DICTIONARY } from "../../lib/icd10";
import type { DiaryState } from "../useVisitDiaryLogic";
import type { VisitDiaryEntry043 } from "../emr";

export interface VisitSummaryDiarySectionsProps {
	diary: DiaryState;
	synthesizedDiaryPreview: VisitDiaryEntry043 | null;
}

export const VisitSummaryDiarySections: React.FC<VisitSummaryDiarySectionsProps> = ({
	diary,
	synthesizedDiaryPreview,
}) => {
	const icdEntry = (ICD10_DICTIONARY ?? []).find(
		(i) => i?.code === diary.diagnosisIcd10,
	);

	return (
		<div className="space-y-4">
			{/* I - Жалобы и анамнез */}
			<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-1.5">
				<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
					<span className="font-mono font-black">I</span> — Жалобы и анамнез
				</div>
				<p className="text-sm text-[var(--ink)] whitespace-pre-wrap leading-relaxed">
					{synthesizedDiaryPreview?.subjectiveComplaints || diary.anamnesis || "—"}
				</p>
			</div>

			{/* II - Объективно */}
			<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-1.5">
				<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
					<span className="font-mono font-black">II</span> — Осмотр и зубная формула
				</div>
				<p className="text-sm text-[var(--ink)] whitespace-pre-wrap leading-relaxed">
					{synthesizedDiaryPreview?.objectiveStatusLocalis || diary.statusLocalis || "—"}
				</p>
			</div>

			{/* III - Диагноз */}
			<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2">
				<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
					<span className="font-mono font-black">III</span> — Диагноз
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{synthesizedDiaryPreview?.assessmentIcd10Code || diary.diagnosisIcd10 ? (
						<div
							className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-semibold min-w-0 break-words ${getIcdColor(synthesizedDiaryPreview?.assessmentIcd10Code || diary.diagnosisIcd10)}`}
						>
							<span className="font-mono shrink-0">
								{synthesizedDiaryPreview?.assessmentIcd10Code || diary.diagnosisIcd10}
							</span>
							<span className="min-w-0 break-words">
								{synthesizedDiaryPreview?.assessmentDiagnosisText || (icdEntry?.label ?? "Диагноз выбран")}
							</span>
						</div>
					) : (
						<span className="inline-flex items-center px-3 py-2 min-h-[44px] text-xs text-[var(--muted)] min-w-0 break-words">
							Диагноз не указан
						</span>
					)}
					{synthesizedDiaryPreview?.toothNumber || diary.diagnosisTooth ? (
						<span className="inline-flex items-center text-xs text-[var(--muted)] px-3 py-2 min-h-[44px] rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] min-w-0 break-words">
							Зубы: {synthesizedDiaryPreview?.toothNumber || diary.diagnosisTooth}
						</span>
					) : null}
				</div>
			</div>

			{/* IV - Дневник лечения и рекомендации */}
			<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-1.5">
				<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--teal)]">
					<span className="font-mono font-black">IV</span> — Лечение и рекомендации
				</div>
				<p className="text-sm text-[var(--ink)] whitespace-pre-wrap leading-relaxed">
					{synthesizedDiaryPreview?.procedureProtocol || diary.treatmentDescription || "—"}
				</p>
			</div>

			{/* Complications & Comorbidities */}
			{(diary.complications || diary.comorbidities) && (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs">
					{diary.complications ? (
						<div>
							<div className="font-bold text-[var(--bad-fg)] mb-1 flex items-center gap-1">
								<AlertTriangle className="w-3.5 h-3.5" /> Осложнения:
							</div>
							<p className="text-[var(--ink)]">{diary.complications}</p>
						</div>
					) : null}
					{diary.comorbidities ? (
						<div>
							<div className="font-bold text-[var(--muted)] mb-1">
								Сопутствующие заболевания:
							</div>
							<p className="text-[var(--ink)]">{diary.comorbidities}</p>
						</div>
					) : null}
				</div>
			)}
		</div>
	);
};
