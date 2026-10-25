import type { DoctorCompletedServiceItem } from "@dental/shared/payroll";

const VALID_CATEGORIES = new Set([
	"therapy",
	"orthopedics",
	"surgery",
	"orthodontics",
	"hygiene",
	"retail_hygiene",
	"pediatric",
]);

export function mapEarningsApiServices(
	data: any,
	doctorId: string,
	periodStart: string
): DoctorCompletedServiceItem[] {
	const mapped: DoctorCompletedServiceItem[] = [];
	if (!data || !Array.isArray(data.appointments)) return mapped;

	for (const apt of data.appointments) {
		const dateIso = apt.startsAtIso ? apt.startsAtIso.slice(0, 10) : periodStart;
		if (Array.isArray(apt.services) && apt.services.length > 0) {
			for (const srv of apt.services) {
				const cat = VALID_CATEGORIES.has(srv.category) ? srv.category : "therapy";
				const isPaid = srv.isPaid !== false && apt.paymentStatus !== "unpaid";
				const priceKop = srv.priceKop ?? Math.round((srv.priceRub || 0) * 100);

				mapped.push({
					id: srv.id || `srv-${apt.appointmentId}-${mapped.length}`,
					dateIso,
					patientName: apt.patientFullName || "Пациент",
					medicalCardNumber: apt.cardNumber || "—",
					serviceNameRu: srv.nameRu || "Стоматологическая процедура",
					category: cat as DoctorCompletedServiceItem["category"],
					grossRevenueKop: priceKop,
					labCostKop: srv.labCostKop ?? Math.round((srv.labCostRub || 0) * 100),
					materialCostKop: srv.materialCostKop ?? Math.round((srv.materialCostRub || 0) * 100),
					customCommissionPercent: srv.commissionPercent,
					doctorId,
					performerId: doctorId,
					isPaid,
					paidAmountKop: srv.paidKop ?? (isPaid ? priceKop : 0),
				});
			}
		}
	}
	return mapped;
}
