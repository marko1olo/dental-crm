// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export type DocumentState = Record<string, any>;

export type ValidationResult = string[] | string | null;

export interface DocumentValidationOutput {
	valid: boolean;
	error?: string;
}

export type DocumentValidatorFn = (
	state: DocumentState,
) => ValidationResult;
