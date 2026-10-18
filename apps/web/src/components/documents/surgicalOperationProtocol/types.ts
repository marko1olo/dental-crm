export interface SurgicalOperationProtocolPrintOptions {
	patient: {
		fullName?: string | null | undefined;
		birthDate?: string | null | undefined;
		phone?: string | null | undefined;
		cardNumber?: string | null | undefined;
		gender?: string | null | undefined;
		snils?: string | null | undefined;
		address?: string | null | undefined;
	} | null | undefined;
	clinic?: {
		legalName?: string | null | undefined;
		clinicName?: string | null | undefined;
		fullName?: string | null | undefined;
		address?: string | null | undefined;
		actualAddress?: string | null | undefined;
		inn?: string | null | undefined;
		ogrn?: string | null | undefined;
		licenseNumber?: string | null | undefined;
		phone?: string | null | undefined;
	} | null | undefined;
	doctorFullName?: string | null | undefined;
	assistantFullName?: string | null | undefined;
	operationDate?: string | null | undefined;
	operationType?: string | null | undefined;
	toothNumber?: string | number | null | undefined;
	diagnosis?: string | null | undefined;
	mkb10?: string | null | undefined;
	anesthesia?: {
		type?: string | null | undefined;
		drug?: string | null | undefined;
		volumeMl?: number | string | null | undefined;
		vasoconstrictor?: string | null | undefined;
	} | null | undefined;
	protocolText?: string | null | undefined;
	surgeryDetails?: {
		implantBrand?: string | null | undefined;
		implantModel?: string | null | undefined;
		diameterMm?: number | string | null | undefined;
		lengthMm?: number | string | null | undefined;
		torqueNcm?: number | string | null | undefined;
		isq?: number | string | null | undefined;
		capType?: "fdm" | "plug" | string | null | undefined;
		lotNumber?: string | null | undefined;
		boneGraft?: string | null | undefined;
		membrane?: string | null | undefined;
		sutureMaterial?: string | null | undefined;
		hemostasis?: string | null | undefined;
		complications?: string | null | undefined;
	} | null | undefined;
	isSignedByDoctor?: boolean | undefined;
}

export interface SurgicalOperationProtocolContext {
	formattedDate: string;
	clinicName: string;
	clinicAddress: string;
	clinicLicense: string;
	clinicInn: string;
	clinicPhone?: string | null | undefined;
	ptName: string;
	ptBirth: string;
	ptCard: string;
	doctor: string;
	assistant: string;
	opTitle: string;
	toothStr: string;
	diagStr: string;
	mkbStr: string;
	anesthesiaText: string;
	protocolBody: string;
	stampHtml: string;
	surgeryDetails?: SurgicalOperationProtocolPrintOptions["surgeryDetails"];
}
