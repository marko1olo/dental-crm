import { fuzzyMatchPhone, normalizePhoneDigits } from "./formatters.js";
import type { PatientFinancialSummary } from "./types.js";
import type {
	TelephonyInsuranceContractLike,
	TelephonyPatientInsightLike,
	TelephonyPatientLike,
} from "./resolverTypes.js";

/**
 * Searches and resolves a patient by phone number against a list of patients using fuzzy matching.
 */
export function resolvePatientFromPhone<T extends TelephonyPatientLike>(
	patientsList: T[] | undefined | null,
	phone: string | null | undefined,
): T | null {
	if (!patientsList || !phone) return null;
	const cleanSearch = normalizePhoneDigits(phone);
	if (cleanSearch.length < 7) return null;

	for (const patient of patientsList) {
		if (patient.phone && fuzzyMatchPhone(patient.phone, phone)) {
			return patient;
		}
		const repPhone = patient.administrativeProfile?.legalRepresentativePhone;
		if (repPhone && fuzzyMatchPhone(repPhone, phone)) {
			return patient;
		}
	}
	return null;
}

/**
 * Computes structured financial metrics for a patient.
 */
export function calculatePatientFinancialStatus(
	patient: TelephonyPatientLike | null | undefined,
	insight?: TelephonyPatientInsightLike | null | undefined,
	insuranceContracts?: TelephonyInsuranceContractLike[] | null | undefined,
): PatientFinancialSummary {
	if (!patient) {
		return {
			balanceRub: 0,
			formattedBalance: "0 ₽",
			hasDebt: false,
			debtRub: 0,
			formattedDebt: "0 ₽",
			hasInsurance: false,
			insuranceName: null,
			policyNumber: null,
		};
	}

	const balanceRub = Number(patient.balanceRub) || 0;
	const insightDue = Number(insight?.balanceDueRub) || 0;
	const debtRub = balanceRub < 0 ? Math.abs(balanceRub) : insightDue > 0 ? insightDue : 0;
	const hasDebt = balanceRub < 0 || insightDue > 0;

	const formatRub = (amount: number) =>
		new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: 0,
		}).format(amount);

	const formattedBalance = balanceRub > 0 ? `+${formatRub(balanceRub)}` : formatRub(balanceRub);
	const formattedDebt = formatRub(debtRub);
	const policyNumber = patient.administrativeProfile?.insurancePolicyNumber || null;

	let insuranceName: string | null = null;
	if (insuranceContracts && insuranceContracts.length > 0) {
		const activeContract = insuranceContracts.find((c) => c.isActive);
		if (activeContract) {
			insuranceName = activeContract.companyName;
		}
	}

	const hasInsurance = Boolean(policyNumber || insuranceName);

	return {
		balanceRub,
		formattedBalance,
		hasDebt,
		debtRub,
		formattedDebt,
		hasInsurance,
		insuranceName,
		policyNumber,
	};
}
