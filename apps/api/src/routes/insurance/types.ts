/**
 * TypeScript interfaces and constants for Insurance / DMS routes.
 * Layer 0: Contracts, DTOs, and static reference directories.
 */

export interface ContractParams {
	contractId: string;
}

export interface LetterParams {
	letterId: string;
}

export interface ContractCreateBody {
	companyName: string;
	policyNumberMask?: string;
	coverageTherapyPct?: number;
	coverageSurgeryPct?: number;
	coverageOrthoPct?: number;
	coverageHygienePct?: number;
	annualLimitRub?: number;
}

export interface ContractUpdateBody {
	companyName?: string;
	policyNumberMask?: string;
	coverageTherapyPct?: number;
	coverageSurgeryPct?: number;
	coverageOrthoPct?: number;
	coverageHygienePct?: number;
	annualLimitRub?: number;
	isActive?: boolean;
}

export interface CalculateCoverageBody {
	usedAnnualAmountRub?: number;
	items: Array<{
		serviceId: string;
		serviceName?: string;
		category:
			| "consultation"
			| "therapy"
			| "surgery"
			| "prosthetics"
			| "orthodontics"
			| "periodontology"
			| "hygiene"
			| "imaging"
			| "documents"
			| "other";
		priceRub: number;
		quantity?: number;
	}>;
}

export interface GuaranteeLettersQuerystring {
	patientId?: string;
	status?: string;
	search?: string;
}

export interface RegistryQuerystring {
	insurerKey?: string;
	contractId?: string;
	patientId?: string;
	period?: "current_month" | "prev_month" | "quarter" | "custom";
	periodStart?: string;
	periodEnd?: string;
	search?: string;
	format?: "json" | "xml" | "csv";
}

export interface QuickAttachBody {
	patientId: string;
	insurerKey: string;
	policyNumber: string;
	patientFullName?: string;
	patientBirthDate?: string;
	isEmergency?: boolean;
	maxCoverageRub?: number;
}

export const INSURER_DIRECTORY: Record<string, { name: string; inn: string }> = {
	sogaz: { name: "АО «СОГАЗ»", inn: "7736035485" },
	ingosstrakh: { name: "СПАО «Ингосстрах»", inn: "7705042179" },
	reso: { name: "СПАО «РЕСО-Гарантия»", inn: "7710045520" },
	reso_garantiya: { name: "СПАО «РЕСО-Гарантия»", inn: "7710045520" },
	alfastrakh: { name: "АО «АльфаСтрахование»", inn: "7713056834" },
	alfastrakhovanie: { name: "АО «АльфаСтрахование»", inn: "7713056834" },
	vsk: { name: "САО «ВСК»", inn: "7710026574" },
	soglasie: { name: "ООО «СК «Согласие»", inn: "7706070733" },
	rosgosstrakh: { name: "ПАО СК «Росгосстрах»", inn: "7707067683" },
	ugoria: { name: "АО «ГСК «Югория»", inn: "8601023568" },
};
