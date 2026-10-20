import React from "react";
import { Sparkles, Plus } from "lucide-react";
import {
	appendRecommendationToSoap,
	PATIENT_RECOMMENDATIONS,
} from "../../../../lib/clinicalProtocols043";
import type { DiaryState } from "../../../useVisitDiaryLogic";

export interface PatientRecommendationsBarProps {
	readonly fieldsDisabled: boolean;
	readonly ensureRevisingIfLocked: () => void;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly scheduleDebouncedSave: () => void;
}

export const PatientRecommendationsBar: React.FC<PatientRecommendationsBarProps> = ({
	fieldsDisabled,
	ensureRevisingIfLocked,
	setDiary,
	scheduleDebouncedSave,
}) => {
	if (fieldsDisabled) return null;

	return (
		<div
			className="mt-2 p-2.5 rounded-lg border border-[var(--glass-border)] bg-[var(--paper-soft)] flex flex-col gap-1.5"
			data-testid="patient-recommendations-bar"
		>
			<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
				<Sparkles className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
				Рекомендации пациенту:
			</span>
			<div className="flex flex-wrap items-center gap-1.5">
				{PATIENT_RECOMMENDATIONS.map((rec) => (
					<button
						key={rec.id}
						type="button"
						onClick={() => {
							ensureRevisingIfLocked();
							setDiary((prev) => appendRecommendationToSoap(prev, rec.text));
							scheduleDebouncedSave();
						}}
						className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[48px] rounded-xl bg-[var(--paper)] hover:bg-[var(--teal-surface)] border border-[var(--glass-border)] hover:border-[var(--teal)] text-xs sm:text-sm font-bold text-[var(--ink)] transition-colors shadow-xs touch-manipulation min-w-0 break-words cursor-pointer"
						title={rec.text}
						data-testid={`rec-btn-${rec.id}`}
					>
						<Plus className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
						<span className="min-w-0 break-words">{rec.label}</span>
					</button>
				))}
			</div>
		</div>
	);
};
