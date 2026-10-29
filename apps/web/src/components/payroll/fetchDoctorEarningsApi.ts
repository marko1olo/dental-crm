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
	params: FetchDoctorEarningsParams
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

	const res = await fetch(`/api/doctor/my-earnings?${query.toString()}`);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const data = await res.json();

	const mapped: DoctorCompletedServiceItem[] = [];
	if (data && Array.isArray(data.appointments)) {
		for (const apt of data.appointments) {
			const dateIso = apt.startsAtIso ? apt.startsAtIso.slice(0, 10) : params.periodStart;
			if (Array.isArray(apt.services) && apt.services.length > 0) {
				for (const srv of apt.services) {
					const cat = ["therapy", "orthopedics", "surgery", "orthodontics", "hygiene", "retail_hygiene", "pediatric"].includes(srv.category)
						? srv.category
						: "therapy";
					mapped.push({
						id: srv.id || `srv-${apt.appointmentId}-${mapped.length}`,
						dateIso,
						patientName: apt.patientFullName || "Пациент",
						medicalCardNumber: apt.cardNumber || "—",
						serviceNameRu: srv.nameRu || "Стоматологическая процедура",
						category: cat as DoctorCompletedServiceItem["category"],
						grossRevenueKop: srv.priceKop ?? Math.round((srv.priceRub || 0) * 100),
						labCostKop: srv.labCostKop ?? Math.round((srv.labCostRub || 0) * 100),
						materialCostKop: srv.materialCostKop ?? Math.round((srv.materialCostRub || 0) * 100),
						customCommissionPercent: srv.commissionPercent,
						doctorId: params.doctorId,
						performerId: params.doctorId,
						isPaid: srv.isPaid,
						paidAmountKop: srv.paidKop ?? (srv.isPaid ? (srv.priceKop ?? Math.round((srv.priceRub || 0) * 100)) : 0),
					});
				}
			}
		}
	}

	return {
		services: mapped,
		isPeriodClosed: Boolean(data?.isPeriodClosed),
		settlementStatement: data?.settlementStatement ?? null,
	};
}

export async function fetchDoctorEarningsApi(
	params: FetchDoctorEarningsParams
): Promise<DoctorCompletedServiceItem[]> {
	const res = await fetchDoctorEarningsWithStatusApi(params);
	return res.services;
}
