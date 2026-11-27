import type { DocumentState, ResolvedDocumentState } from "../documentLogic/types";

export type { DocumentState, ResolvedDocumentState };

export type ValidationResult = string[] | string | null;

export interface DocumentValidationOutput {
	valid: boolean;
	error?: string;
}

export type DocumentValidatorFn = (
	state: DocumentState,
) => ValidationResult;
