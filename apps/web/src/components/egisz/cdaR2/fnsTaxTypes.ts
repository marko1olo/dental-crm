/**
 * fnsTaxTypes.ts — TypeScript Interfaces for FNS Tax Deduction (КНД 1151156)
 */

import type { GostSignatureInfo } from "./cdaTypes";

export interface FnsTaxPaymentItem {
	id?: string | undefined;
	date: string | Date;
	serviceCode: "1" | "2";
	serviceDescription?: string | undefined;
	amountKopecks: number;
}

export interface FnsTaxCertificatePayload {
	documentNumber: string;
	documentDate: string | Date;
	taxYear: number;
	clinic: {
		name: string;
		inn: string;
		kpp?: string | undefined;
		ogrn: string;
		phone?: string | undefined;
		email?: string | undefined;
	};
	taxpayer: {
		fullName: string;
		inn?: string | undefined;
		snils?: string | undefined;
		birthDate?: string | undefined;
		docTypeCode?: string | undefined;
		docSeriesNumber?: string | undefined;
	};
	patient: {
		fullName: string;
		snils?: string | undefined;
		birthDate?: string | undefined;
		relationshipCode: "1" | "2" | "3" | "4";
		relationshipName?: string | undefined;
	};
	payments: FnsTaxPaymentItem[];
	signer: {
		fullName: string;
		position: string;
		snils?: string | undefined;
	};
	doctorSignature?: GostSignatureInfo | undefined;
	moSignature?: GostSignatureInfo | undefined;
}
