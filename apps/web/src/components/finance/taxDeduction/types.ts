import type React from "react";
import type {
	FamilyMemberPayerConfig,
	FamilyTaxDeductionBatchResult,
	TaxDeductionCalculationResult,
	TaxDeductionCertificateParams,
	TaxDeductionPaymentItem,
	TaxDeductionRelationship,
	TaxDeductionYearSummary,
} from "../taxDeductionEngine";

export type TaxDeductionTab = "form" | "checks" | "family" | "xml";

export type {
	FamilyMemberPayerConfig,
	FamilyTaxDeductionBatchResult,
	TaxDeductionCalculationResult,
	TaxDeductionCertificateParams,
	TaxDeductionPaymentItem,
	TaxDeductionRelationship,
	TaxDeductionYearSummary,
};

export interface TaxDeductionCertificateModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientInn?: string | undefined;
	readonly patientSnils?: string | undefined;
	readonly payerSnils?: string | undefined;
	readonly payments?: readonly TaxDeductionPaymentItem[] | undefined;
	readonly selectedYear?: number | undefined;
	readonly defaultTaxYear?: number | undefined;
	readonly patientId?: string | undefined;
	readonly autoFetchPayments?: boolean | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicLicenseNumber?: string | undefined;
	readonly clinicLicenseDate?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly chiefDoctorName?: string | undefined;
}

export interface TaxDeductionHeaderProps {
	readonly activeTab: TaxDeductionTab;
	readonly onTabChange: (tab: TaxDeductionTab) => void;
	readonly onClose: () => void;
	readonly yearPaymentsCount: number;
}

export interface TaxDeductionPayerFormProps {
	readonly selectedYear: number;
	readonly setSelectedYear: (year: number) => void;
	readonly availableYears: readonly number[];
	readonly paymentsCountByYear: Record<number, number>;
	readonly payerRelationship: TaxDeductionRelationship;
	readonly setPayerRelationship: (rel: TaxDeductionRelationship) => void;
	readonly onFillFromPatient: () => void;
	readonly payerFullName: string;
	readonly setPayerFullName: (val: string) => void;
	readonly payerInn: string;
	readonly setPayerInn: (val: string) => void;
	readonly innValidation: { isValid: boolean; message?: string };
	readonly payerBirthDate: string;
	readonly setPayerBirthDate: (val: string) => void;
	readonly passportSeries: string;
	readonly setPassportSeries: (val: string) => void;
	readonly passportNumber: string;
	readonly setPassportNumber: (val: string) => void;
	readonly certificateNumber: string;
	readonly setCertificateNumber: (val: string) => void;
	readonly taxOfficeCode: string;
	readonly setTaxOfficeCode: (val: string) => void;
}

export interface TaxDeductionPaymentsTableProps {
	readonly selectedYear: number;
	readonly yearPayments: readonly TaxDeductionPaymentItem[];
	readonly allPaymentsCount: number;
	readonly targetYearSummary: TaxDeductionYearSummary;
	readonly clinicLicenseNumber: string;
	readonly clinicLicenseDate: string;
	readonly qrSvgString: string;
	readonly onClose: () => void;
}

export interface TaxDeductionFooterActionsProps {
	readonly activeTab: TaxDeductionTab;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly clinicKpp: string;
	readonly onClose: () => void;
	readonly onDownloadBatchNoMedoplXml: () => void;
	readonly onDownloadBatchXml: () => void;
	readonly onPrintBatch: () => void;
	readonly onDownloadNoMedoplXml: () => void;
	readonly onDownloadXml: () => void;
	readonly onPrintBlank: () => void;
	readonly onPrint: () => void;
}
