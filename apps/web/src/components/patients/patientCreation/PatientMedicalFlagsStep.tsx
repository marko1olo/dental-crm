/**
 * PatientMedicalFlagsStep.tsx — Медицинские флаги, срочный приём, анонимность и соматическая норма.
 */

import React from "react";
import { PatientAnonymousIntakeCard } from "./PatientAnonymousIntakeCard";
import { PatientEmergencyIntakeCard } from "./PatientEmergencyIntakeCard";
import { PatientSomaticNormCard } from "./PatientSomaticNormCard";
import type { PatientMedicalFlagsStepProps } from "./types";

export function PatientMedicalFlagsStep({
	isEmergencyOrPrimary,
	onToggleEmergency,
	isAnonymous,
	onToggleAnonymous,
	isSomaticNorm,
	onToggleSomaticNorm,
}: PatientMedicalFlagsStepProps) {
	return (
		<>
			<PatientEmergencyIntakeCard
				isEmergencyOrPrimary={isEmergencyOrPrimary}
				onToggleEmergency={onToggleEmergency}
			/>

			{/* Карточка режима: Анонимный приём */}
			<PatientAnonymousIntakeCard
				isAnonymous={isAnonymous}
				onToggleAnonymous={onToggleAnonymous}
			/>

			<PatientSomaticNormCard
				isSomaticNorm={isSomaticNorm}
				onToggleSomaticNorm={onToggleSomaticNorm}
			/>
		</>
	);
}
