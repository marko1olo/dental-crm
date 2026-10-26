import type { TreatmentPlanItem } from "../../../../treatment-plans/types";
import type { CompletedWorksActParams } from "../../../invoiceEngine";

export interface BuildActParamsInput {
	readonly actNumber: string;
	readonly contractNumber: string;
	readonly clinicName: string;
	readonly oneCClinicInn: string;
	readonly oneCClinicKpp: string;
	readonly cashierFullName: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly oneCPatientAddress: string;
	readonly activeItems: readonly TreatmentPlanItem[];
}

export function buildActParams(p: BuildActParamsInput): CompletedWorksActParams {
	return {
		actNumber: p.actNumber,
		contractNumber: p.contractNumber,
		contractDateIso: new Date().toISOString(),
		actDateIso: new Date().toISOString(),
		clinic: {
			name: p.clinicName,
			legalName: p.clinicName,
			inn: p.oneCClinicInn || "7707083893",
			kpp: p.oneCClinicKpp || "770101001",
			ogrn: "1027700132195",
			licenseNumber: "ЛО41-01137-77/00368421",
			licenseDate: "12.10.2021",
			address: "г. Москва, ул. Профсоюзная, д. 42",
			phone: "+7 (495) 789-01-23",
			chiefDoctorName: p.cashierFullName,
		},
		patient: {
			id: p.patientId,
			fullName: p.patientName,
			phone: p.patientPhone || "",
			address: p.oneCPatientAddress || "",
			medicalCardNumber: `043/у-${(p.patientId || "patient").slice(0, 4)}`,
		},
		doctor: {
			fullName: p.cashierFullName,
			specialty: "Врач-стоматолог терапевт-ортопед",
		},
		items: p.activeItems.map((it, idx) => ({
			id: it.id || `srv-${idx + 1}`,
			name: it.name,
			category: (it.category as CompletedWorksActParams["items"][number]["category"]) || "therapy",
			toothNumber: it.toothNumber ? String(it.toothNumber) : undefined,
			code804n: it.code804n || "A16.07.002",
			priceRub: it.priceRub,
			quantity: it.quantity || 1,
			discountRub: it.discountRub || 0,
			warrantyMonths: it.isWarranty ? 12 : undefined,
			isWarranty: it.isWarranty,
		})),
	};
}
