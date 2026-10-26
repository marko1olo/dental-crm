import type { PublicAuthMethod } from "@dental/shared";

export interface BudgetItem {
	id?: string;
	title: string;
	toothNumber?: number | null;
	quantity?: number;
	priceRub: number;
	discountRub?: number;
}

export interface BudgetPortalData {
	token: string;
	planId?: string | null;
	status: "pending" | "viewed" | "accepted" | "rejected" | "expired";
	clinicName?: string;
	clinicPhone?: string;
	clinicAddress?: string;
	doctorName?: string;
	patientFirstName?: string;
	totalPriceRub: number;
	discountRub: number;
	netTotalRub: number;
	currency: string;
	items: BudgetItem[];
	requiresVerification: boolean;
	authMethod: PublicAuthMethod;
	isVerified: boolean;
	viewedAt?: string | null;
	signedAt?: string | null;
	signerName?: string | null;
	documentHash?: string | null;
}

export interface PatientBudgetSignViewProps {
	token?: string;
	apiBaseUrl?: string;
	onSuccess?: (data: { signedAt: string; documentHash: string }) => void;
	className?: string;
}

export function formatRub(value: number): string {
	return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

export function formatIsoDateTime(isoString?: string | null): string {
	if (!isoString) return "";
	try {
		const d = new Date(isoString);
		return d.toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return isoString;
	}
}
