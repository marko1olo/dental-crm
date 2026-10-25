import React, { useMemo } from "react";
import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	evaluatePatientSafetyFlags,
} from "../../safetyMath";
import type { PatientSafetyBannerProps } from "./types";
import { PatientSafetyBannerFull } from "./PatientSafetyBannerFull";
import { PatientSafetyBannerCompact } from "./PatientSafetyBannerCompact";

export const PatientSafetyBanner: React.FC<PatientSafetyBannerProps> = React.memo(
	function PatientSafetyBanner({
		currentProfile,
		disabled = false,
		mode = "compact",
		patientId,
		patientName,
		onToggleAllergy,
		onApplySomaticNorm,
		onUpdateSafetyProfile,
	}) {
		const safetyEvaluation = useMemo(() => {
			return evaluatePatientSafetyFlags(currentProfile);
		}, [currentProfile]);

		// 1-Click physiological norm CTA: data-testid="btn-somatic-healthy-norm"
		const handleApplyNormAction = () => {
			if (disabled) return;
			if (onApplySomaticNorm) {
				onApplySomaticNorm();
			} else if (onUpdateSafetyProfile) {
				onUpdateSafetyProfile({
					...DEFAULT_SOMATIC_HEALTHY_NORM,
					customChronicNotes:
						"Соматически здоров. Аллергоанамнез не отягощен. Инфекционные заболевания отрицает. Физиологическая норма.",
				});
			}
		};

		if (mode === "full") {
			return (
				<PatientSafetyBannerFull
					currentProfile={currentProfile}
					safetyEvaluation={safetyEvaluation}
					disabled={disabled}
					patientId={patientId}
					patientName={patientName}
					handleApplyNormAction={handleApplyNormAction}
					onToggleAllergy={onToggleAllergy}
					onApplySomaticNorm={onApplySomaticNorm}
					onUpdateSafetyProfile={onUpdateSafetyProfile}
				/>
			);
		}

		return (
			<PatientSafetyBannerCompact
				currentProfile={currentProfile}
				safetyEvaluation={safetyEvaluation}
				disabled={disabled}
				handleApplyNormAction={handleApplyNormAction}
				onToggleAllergy={onToggleAllergy}
			/>
		);
	},
);

export default PatientSafetyBanner;
