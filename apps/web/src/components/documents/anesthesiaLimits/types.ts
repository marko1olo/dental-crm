export interface AnesthesiaTextLimit {
	field: string;
	label: string;
	limit: number;
	length: number;
}

export interface AnesthesiaTextLimitsReview {
	tooLong: AnesthesiaTextLimit[];
}

export interface AnesthesiaTextLimitsInput {
	method: string;
	anesthetic: string;
	vasoconstrictor: string;
	zone: string;
	allergyStatus: string;
	restrictionNotes: string;
	doseTime: string;
	doseMl: string;
	reaction: string;
}
