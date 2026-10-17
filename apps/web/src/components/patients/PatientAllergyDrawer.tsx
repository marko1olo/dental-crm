import React from "react";
import { Syringe } from "lucide-react";
import type { EvaluatedSafetyFlagsResult } from "./safetyMath";
import { PatientAllergyFlagCard } from "./PatientAllergyFlagCard";

export const PatientAllergyDrawer: React.FC<{
	evaluation: EvaluatedSafetyFlagsResult;
}> = ({ evaluation }) => (
	<div className="patient-safety-banner__drawer">
		<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
			{evaluation.activeFlags.map((flag) => (
				<PatientAllergyFlagCard key={flag.id} flag={flag} />
			))}
		</div>

		{evaluation.anestheticRecommendations.length > 0 && (
			<div className="p-3 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal,var(--brand-primary))]/20 text-xs text-[var(--teal-dark,var(--teal))] flex flex-col gap-1">
				<span className="font-bold uppercase tracking-wide inline-flex items-center gap-1.5">
					<Syringe className="w-3.5 h-3.5 text-teal-600 shrink-0" aria-hidden="true" />
					<span>Сводные клинические рекомендации по анестезии:</span>
				</span>
				<ul className="m-0 pl-4 space-y-0.5">
					{evaluation.anestheticRecommendations.map((rec, i) => (
						<li key={`anesthetic-rec-${i}`}>{rec}</li>
					))}
				</ul>
			</div>
		)}
	</div>
);
