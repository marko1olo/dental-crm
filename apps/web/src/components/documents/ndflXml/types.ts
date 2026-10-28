import type {
	FnsClinicInfo,
	FnsFiscalReceiptItem,
	FnsKinshipCode,
	FnsPatientInfo,
	FnsPersonInfo,
	SupportedTaxYear,
} from "@dental/shared";

export type FnsNdflClinicMetadata = FnsClinicInfo;
export type FnsNdflPayerMetadata = FnsPersonInfo;

export interface FnsNdflPatientMetadata extends Partial<FnsPatientInfo> {
	kinshipCode: FnsKinshipCode;
}

export type FnsNdflFiscalReceiptItem = FnsFiscalReceiptItem;

export interface FnsNdflXmlPayload {
	documentNumber: string;
	documentDate: string | Date;
	taxYear: SupportedTaxYear | number;
	taxInspectionCode?: string | undefined;
	certificateKind?: "1" | "2" | "3" | undefined;
	correctionNumber?: number | undefined;
	softwareVersion?: string | undefined;
	clinic: FnsNdflClinicMetadata;
	payer: FnsNdflPayerMetadata;
	patient: FnsNdflPatientMetadata;
	receipts: FnsNdflFiscalReceiptItem[];
	signatory?: {
		signatoryRole: "1" | "2";
		fullName: {
			family: string;
			given: string;
			patronymic?: string | undefined;
		};
		snils?: string | undefined;
		powerOfAttorneyNumber?: string | undefined;
	} | undefined;
}
