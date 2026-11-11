/**
 * fetchDoctorEarningsApi.ts — Клиентский адаптер выборки начислений врача через SSOT /api/v1/payroll/calculations.
 * Mandate 8bf: Единый SSOT расчетного движка.
 */

import type { DoctorCompletedServiceItem } from "./staffPayrollEngine";
import type { SettlementStatementPayload } from "./closeSettlementPeriodApi";

export interface FetchDoctorEarningsParams {
	readonly doctorId: string;
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly payoutModel: string;
	readonly chairRentalRub: number;
	readonly advanceRub: number;
	readonly taxRegime: string;
}

export interface FetchDoctorEarningsWithStatusResult {
	readonly services: DoctorCompletedServiceItem[];
	readonly isPeriodClosed: boolean;
	readonly settlementStatement: SettlementStatementPayload | null;
}

export async function fetchDoctorEarningsWithStatusApi(
	params: FetchDoctorEarningsParams,
): Promise<FetchDoctorEarningsWithStatusResult> {
	const query = new URLSearchParams({
		doctorId: params.doctorId,
		from: params.periodStart,
		to: params.periodEnd,
		payoutModel: params.payoutModel,
		chairRentalRub: String(params.chairRentalRub),
		advanceRub: String(params.advanceRub),
		taxRegime: params.taxRegime,
	});

	const res = await fetch(`/api/v1/payroll/calculations?${query.toString()}`);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const data = await res.json();

	const mapped: DoctorCompletedServiceItem[] = [];
	if (data && Array.isArray(data.orders)) {
		for (const ord of data.orders) {
			const cat = [
				"therapy",
				"orthopedics",
				"surgery",
				"orthodontics",
				"hygiene",
				"retail_hygiene",
				"pediatric",
			].includes(ord.category)
				? ord.category
				: "therapy";

			mapped.push({
				id: ord.id,
				dateIso: ord.dateIso,
				patientName: ord.patientName || "Пациент",
				medicalCardNumber: ord.medicalCardNumber || "—",
				serviceNameRu: ord.serviceNameRu || "Стоматологическая процедура",
				category: cat as DoctorCompletedServiceItem["category"],
				grossRevenueKop: ord.grossKopecks,
				labCostKop: ord.labCostKopecks,
				materialCostKop: ord.materialCostKopecks,
				doctorId: ord.doctorId || params.doctorId,
				performerId: ord.doctorId || params.doctorId,
				isPaid: ord.isPaid54Fz,
				paidAmountKop: ord.isPaid54Fz ? ord.grossKopecks : 0,
			});
		}
	}

	const isPeriodClosed = Array.isArray(data?.closedPeriods) && data.closedPeriods.length > 0;
	return {
		services: mapped,
		isPeriodClosed,
		settlementStatement: data?.summary ?? null,
	};
}

export async function fetchDoctorEarningsApi(
	params: FetchDoctorEarningsParams,
): Promise<DoctorCompletedServiceItem[]> {
	const res = await fetchDoctorEarningsWithStatusApi(params);
	return res.services;
}
