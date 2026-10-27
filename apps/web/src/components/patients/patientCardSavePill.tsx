/**
 * patientCardSavePill.tsx — Плашка состояния сохранения карточки пациента
 */

import React from "react";
import {
	patientCardSavePill,
	type PatientCardSavePillInput,
	type PatientCardSavePillDescriptor,
	type PatientCardSavePillTone,
	type PatientSaveSection,
	type PatientSectionSaveState,
} from "./savePill/patientCardSavePillDescriptor";
import {
	PatientCardFloatingSaveBar,
	PatientFloatingSaveBar,
	type PatientCardFloatingSaveBarProps,
} from "./savePill/PatientCardFloatingSaveBar";

export {
	patientCardSavePill,
	PatientCardFloatingSaveBar,
	PatientFloatingSaveBar,
	type PatientCardSavePillInput,
	type PatientCardSavePillDescriptor,
	type PatientCardSavePillTone,
	type PatientSaveSection,
	type PatientSectionSaveState,
	type PatientCardFloatingSaveBarProps,
};

/**
 * Разметка плашки состояния сохранения.
 */
export function PatientCardSavePill(input: PatientCardSavePillInput) {
	const pill = patientCardSavePill(input);
	if (!pill) return null;
	return (
		<span
			className={pill.className}
			data-save-tone={pill.tone}
			title={pill.title}
		>
			{pill.label}
		</span>
	);
}
