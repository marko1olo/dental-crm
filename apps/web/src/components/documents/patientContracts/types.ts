import type { Patient, GeneratedDocument } from "@dental/shared";

export interface PatientContractsSectionProps {
	readonly patient?: Patient | null;
	readonly contracts?: GeneratedDocument[];
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile
	readonly clinicProfileDraft?: any;
	readonly onCreateContract?: () => void;
	readonly onOpenContract?: (contractId: string) => void;
	readonly onPrintBlankContract?: () => void;
}

export type ContractFilterType = "all" | "issued" | "draft";
