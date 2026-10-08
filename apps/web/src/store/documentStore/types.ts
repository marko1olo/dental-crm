import type {
	DocumentSliceState,
	MedicalDocumentReleaseChannel,
	TaxSliceState,
} from "./types/coreTypes";
import type { IntakeConsentSliceState } from "./types/intakeConsentTypes";
import type { FinancialSliceState } from "./types/financialTypes";
import type { ClinicalSliceState } from "./types/clinicalTypes";
import type { MiscSliceState } from "./types/miscTypes";

export type { MedicalDocumentReleaseChannel };
export type {
	DocumentSliceState,
	TaxSliceState,
} from "./types/coreTypes";
export type { IntakeConsentSliceState } from "./types/intakeConsentTypes";
export type { FinancialSliceState } from "./types/financialTypes";
export type { ClinicalSliceState } from "./types/clinicalTypes";
export type { MiscSliceState } from "./types/miscTypes";

export interface DocumentState
	extends DocumentSliceState,
		TaxSliceState,
		IntakeConsentSliceState,
		FinancialSliceState,
		ClinicalSliceState,
		MiscSliceState {
	/**
	 * Вернуть все поля форм документов к исходным значениям.
	 */
	resetDocumentForms: () => void;
}
