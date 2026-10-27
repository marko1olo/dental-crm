export interface AdvertisingSourceOption {
	readonly key: string;
	readonly label: string;
	readonly category: string;
	readonly isOnlineSelfBooking: boolean;
	readonly description?: string;
}

export interface PatientDraftValidationInput {
	fullName: string;
	phone?: string | null | undefined;
	advertisingSource?: string | null | undefined;
	snils?: string | null | undefined;
	birthDate?: string | null | undefined;
	identityDocument?: string | null | undefined;
	isAnonymous?: boolean | null | undefined;
	isEmergencyOrPrimary?: boolean | null | undefined;
}

export interface PatientDraftValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
	missingRequiredLabels: string[];
	guidanceMessage: string | null;
}
