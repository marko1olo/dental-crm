/**
 * types.ts — Контракты моделей экспресс-прикрепления гарантийного письма ДМС
 */

export interface PatientGuaranteeLetter {
	readonly id: string;
	readonly letterNumber: string;
	readonly insurerKey: string;
	readonly insurerName: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly issueDate: string;
	readonly validFrom: string;
	readonly validUntil: string;
	readonly maxCoverageKopecks: number;
	readonly usedAmountKopecks: number;
	readonly franchisePct: number;
	readonly franchiseType: "percent" | "fixed_kopecks";
	readonly franchiseFixedKopecks: number;
	readonly approvedTeethFdi: readonly string[];
	readonly approvedServiceCodes804n: readonly string[];
	readonly approvedDiagnosisMkb10: readonly string[];
	readonly curatorFullName: string;
	readonly curatorPhone: string;
	readonly curatorEmail?: string | undefined;
	readonly notes?: string | undefined;
	readonly status:
		| "draft"
		| "pending_approval"
		| "approved"
		| "active"
		| "billed"
		| "paid"
		| "exhausted"
		| "expired"
		| "cancelled";
}

export interface BillItemToSplit {
	readonly id: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly discountPercent?: number | undefined;
}

export interface ExpressDmsGuaranteePreset {
	readonly id: string;
	readonly labelRu: string;
	readonly insurerKey: string;
	readonly insurerNameRu: string;
	readonly maxCoverageRub: number;
	readonly franchisePct: number;
	readonly approvedServiceCodes804n: readonly string[];
	readonly approvedDiagnosisMkb10: readonly string[];
	readonly noteRu: string;
}
