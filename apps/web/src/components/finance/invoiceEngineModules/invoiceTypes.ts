export interface InvoiceServiceItem {
	readonly id: string;
	readonly name: string;
	readonly code804n?: string | null | undefined;
	readonly toothNumber?: number | string | null | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly discountRub?: number | undefined;
	readonly category?: "therapy" | "orthopedics" | "implantology" | "surgery" | "hygiene" | "orthodontics" | "other" | undefined;
	readonly isWarranty?: boolean | undefined;
	readonly warrantyDiscountPercent?: number | undefined;
	readonly warrantyPriceRub?: number | undefined;
	readonly warrantySourceAppointmentId?: string | number | null | undefined;
	readonly isRefund?: boolean | undefined;
	readonly isReturned?: boolean | undefined;
	readonly status?: "active" | "refunded" | "cancelled" | "returned" | string | undefined;
}

export interface WarrantyObligationTerm {
	readonly categoryName: string;
	readonly teethDisplay: string;
	readonly warrantyMonths: number;
	readonly warrantyPeriodText: string;
	readonly serviceLifeText: string;
	readonly conditionsText: string;
}

export interface CompletedWorksActParams {
	readonly actNumber: string;
	readonly contractNumber: string;
	readonly contractDateIso?: string | undefined;
	readonly actDateIso?: string | undefined;
	readonly clinic: {
		readonly name: string;
		readonly legalName: string;
		readonly inn: string;
		readonly kpp?: string | undefined;
		readonly ogrn?: string | undefined;
		readonly licenseNumber?: string | undefined;
		readonly licenseDate?: string | undefined;
		readonly address: string;
		readonly phone?: string | undefined;
		readonly chiefDoctorName?: string | undefined;
	};
	readonly patient: {
		readonly id?: string | undefined;
		readonly fullName: string;
		readonly birthDate?: string | undefined;
		readonly passportData?: string | undefined;
		readonly phone?: string | undefined;
		readonly address?: string | undefined;
		readonly medicalCardNumber?: string | undefined;
	};
	readonly doctor: {
		readonly fullName: string;
		readonly specialty?: string | undefined;
	};
	readonly items: readonly InvoiceServiceItem[];
}

export interface CompiledActAndWarrantySummary {
	readonly actNumber: string;
	readonly contractNumber: string;
	readonly items: readonly InvoiceServiceItem[];
	readonly totalGrossKopecks: number;
	readonly totalGrossRub: number;
	readonly totalDiscountKopecks: number;
	readonly totalDiscountRub: number;
	readonly totalNetKopecks: number;
	readonly totalNetRub: number;
	readonly totalNetRubFormatted: string;
	readonly totalInWords: string;
	readonly warrantyTerms: readonly WarrantyObligationTerm[];
	readonly hasWarrantyRework?: boolean | undefined;
	readonly warrantyItemsCount?: number | undefined;
	readonly totalWarrantyPriceRub?: number | undefined;
	readonly warrantySourceAppointmentId?: string | number | null | undefined;
}
