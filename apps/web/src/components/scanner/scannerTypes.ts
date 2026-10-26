/**
 * scannerTypes.ts
 *
 * Domain types for patient document intake and scanner cockpit.
 */

export interface ScannerPatientSummary {
	readonly id: string;
	readonly fullName: string;
	readonly phone?: string | undefined;
	readonly birthDate?: string | undefined;
	readonly cardNumber?: string | undefined;
}

export interface ScannerAttachmentSummary {
	readonly id: string;
	readonly fileName: string;
	readonly mimeType?: string | undefined;
	readonly createdAt?: string | undefined;
	readonly url?: string | undefined;
}

export interface NewPatientIntakeDraft {
	fullName: string;
	phone: string;
	birthDate: string;
	passportSeries: string;
	passportNumber: string;
	passportIssuerCode: string;
	snils: string;
	omsPolicy: string;
}

export const DEMO_COCKPIT_PATIENTS: ScannerPatientSummary[] = [
	{ id: "pat-demo-01", fullName: "Иванов Алексей Владимирович", phone: "+7 (916) 123-45-67", birthDate: "1988-04-12", cardNumber: "К-0842" },
	{ id: "pat-demo-02", fullName: "Смирнова Екатерина Олеговна", phone: "+7 (925) 888-21-43", birthDate: "1994-11-28", cardNumber: "К-0915" },
	{ id: "pat-demo-03", fullName: "Кузнецов Дмитрий Сергеевич", phone: "+7 (903) 555-12-90", birthDate: "1981-07-03", cardNumber: "К-0721" },
];
