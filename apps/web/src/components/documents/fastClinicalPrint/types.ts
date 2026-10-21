import type { InsertCutLayout } from "../partisanMedicalInsertTemplate";

export type FastPrintDocType =
	| "partisan_insert_043u"
	| "form043u"
	| "act_and_receipt"
	| "treatment_estimate";

export interface FastPrintPatientInfo {
	id?: string | undefined;
	fullName?: string | undefined;
	birthDate?: string | null | undefined;
	phone?: string | null | undefined;
	address?: string | null | undefined;
	cardNumber?: string | undefined;
	allergies?: string | null | undefined;
	somaticNotes?: string | null | undefined;
}

export interface FastPrintClinicInfo {
	name?: string | undefined;
	legalName?: string | undefined;
	inn?: string | null | undefined;
	ogrn?: string | null | undefined;
	address?: string | null | undefined;
	phone?: string | null | undefined;
	licenseNumber?: string | null | undefined;
}

export interface FastPrintDoctorInfo {
	fullName?: string | undefined;
	specialty?: string | null | undefined;
}

export interface FastPrintServiceItem {
	code?: string | undefined;
	name: string;
	tooth?: string | undefined;
	quantity: number;
	price: number;
	amount: number;
}

export interface FastPrintPlanStage {
	title: string;
	services: Array<{ name: string; tooth?: string | undefined; price: number }>;
	total: number;
	dueDate?: string | undefined;
}

export interface FastClinicalPrintEngineProps {
	isOpen: boolean;
	onClose: () => void;
	initialDocType?: FastPrintDocType | undefined;
	patient?: FastPrintPatientInfo | undefined;
	clinic?: FastPrintClinicInfo | undefined;
	doctor?: FastPrintDoctorInfo | undefined;
	visitData?:
		| {
				date?: string | undefined;
				time?: string | undefined;
				toothNumber?: string | undefined;
				cavityLocalization?: string | undefined;
				diagnosis?: string | undefined;
				complaints?: string | undefined;
				objective?: string | undefined;
				treatment?: string | undefined;
				recommendations?: string | undefined;
				warrantyPeriod?: string | undefined;
		  }
		| undefined;
	services?: FastPrintServiceItem[] | undefined;
	planStages?: FastPrintPlanStage[] | undefined;
	fiscalData?:
		| {
				receiptNumber?: string | undefined;
				paymentType?: ("card" | "cash" | "sbp") | undefined;
				totalRub?: number | undefined;
				fiscalSign?: string | undefined;
				dateTime?: string | undefined;
		  }
		| undefined;
	onAfterPrint?: (() => void) | undefined;
}

export const DEFAULT_CLINIC: FastPrintClinicInfo = {
	name: "Стоматологическая клиника «DENTE»",
	legalName: 'ООО "ДЕНТЕ МЕДИКАЛ ГРУПП"',
	inn: "7704123456",
	ogrn: "1237700123456",
	address: "г. Москва, ул. Стоматологическая, д. 24, корп. 1",
	phone: "+7 (495) 777-88-99",
	licenseNumber: "ЛО41-01137-77/00368421 от 14.02.2023 г.",
};

export const DEFAULT_DOCTOR: FastPrintDoctorInfo = {
	fullName: "Смирнова Елена Александровна",
	specialty: "Врач-стоматолог терапевт",
};
