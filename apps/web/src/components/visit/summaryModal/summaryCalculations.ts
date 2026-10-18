import { DEFAULT_CHAIRSIDE_SERVICES } from "../visitBillingTypes.js";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../lib/demoMode.js";
import type { VisitSummaryPatient, VisitSummaryToothItem } from "./types";

export function formatPatientFullName(p: VisitSummaryPatient | null): string {
	if (!p) return "—";
	if (typeof p.fullName === "string" && p.fullName.trim()) return p.fullName.trim();
	const parts = [p.lastName, p.firstName, p.middleName]
		.map((x) => (typeof x === "string" ? x.trim() : ""))
		.filter(Boolean);
	return parts.length ? parts.join(" ") : "—";
}

export function resolveChairsideServices(
	servicesProp?: readonly any[],
	storeServices?: readonly any[],
	activeVisitServices?: any[],
	patientId?: string,
): readonly any[] {
	if (Array.isArray(servicesProp) && servicesProp.length > 0) return servicesProp;
	if (Array.isArray(storeServices) && storeServices.length > 0) return storeServices;
	if (Array.isArray(activeVisitServices) && activeVisitServices.length > 0) return activeVisitServices;
	if (isDemoShowcaseMode() || isDemoPatientId(patientId || "")) return DEFAULT_CHAIRSIDE_SERVICES;
	return [];
}

export function calculateServicesTotalRub(services: readonly any[]): number {
	return services.reduce((sum: number, it: any) => {
		const price = Number(it.priceRub ?? it.unitPriceRub ?? it.price ?? 0);
		const qty = Number(it.quantity ?? 1);
		const total = Number(it.totalRub ?? price * qty);
		return sum + total;
	}, 0);
}

export function resolveEffectiveTotalDueRub(
	totalDueRubProp?: number,
	calculatedServicesTotalRub: number = 0,
	_patientId?: string,
): number {
	if (typeof totalDueRubProp === "number") return totalDueRubProp;
	if (calculatedServicesTotalRub > 0) return calculatedServicesTotalRub;
	return 0;
}

export function resolveEffectiveDepositRub(
	patientDepositRubProp?: number,
	patient?: any,
	activePatientBalanceRub?: number,
): number {
	if (typeof patientDepositRubProp === "number") return patientDepositRubProp;
	const p = patient as any;
	const balance = Number(
		p?.depositRub ??
		p?.balanceRub ??
		(typeof p?.balanceKopecks === "number" ? p.balanceKopecks / 100 : undefined) ??
		(activePatientBalanceRub ?? 0)
	);
	return Math.max(0, balance);
}

export function resolveEffectiveFamilyBalanceRub(
	patientFamilyBalanceRubProp?: number,
	patient?: any,
): number {
	if (typeof patientFamilyBalanceRubProp === "number") return patientFamilyBalanceRubProp;
	const p = patient as any;
	return Number(p?.familyBalanceRub ?? 0);
}

export function extractAbnormalTeeth(teethData?: readonly VisitSummaryToothItem[]): readonly VisitSummaryToothItem[] {
	return (teethData ?? []).filter((t) => {
		const s = (t.state || "").toLowerCase();
		return s !== "healthy" && s !== "" && s !== "0";
	});
}

export const MEDICAL_SERVICES_VAT_PERCENT = 0;
export const DEFAULT_CLINIC_WARRANTY_MONTHS = 12;
