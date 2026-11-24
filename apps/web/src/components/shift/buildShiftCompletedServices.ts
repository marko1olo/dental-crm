import type { DoctorCompletedServiceItem } from "@dental/shared/payroll";
import { rublesToKopecks } from "@dental/shared";

export interface ShiftRawServiceItem {
	readonly id?: string | number | undefined;
	readonly name?: string | undefined;
	readonly title?: string | undefined;
	readonly serviceNameRu?: string | undefined;
	readonly category?: DoctorCompletedServiceItem["category"] | string | undefined;
	readonly priceRub?: number | string | undefined;
	readonly costRub?: number | string | undefined;
	readonly amountRub?: number | string | undefined;
	readonly labCostRub?: number | string | undefined;
	readonly materialCostRub?: number | string | undefined;
	readonly performerId?: string | undefined;
}

export interface ShiftCompletedAppointment {
	readonly id: string | number;
	readonly patientId?: string | null | undefined;
	readonly doctorUserId?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly status?: string | null | undefined;
	readonly state?: string | null | undefined;
	readonly reason?: string | null | undefined;
	readonly title?: string | null | undefined;
	readonly patientFullName?: string | null | undefined;
	readonly medicalCardNumber?: string | null | undefined;
	readonly category?: string | null | undefined;
	readonly priceRub?: number | string | undefined;
	readonly costRub?: number | string | undefined;
	readonly totalRub?: number | string | undefined;
	readonly amountRub?: number | string | undefined;
	readonly labCostRub?: number | string | undefined;
	readonly materialCostRub?: number | string | undefined;
	readonly services?: readonly ShiftRawServiceItem[] | undefined;
	readonly items?: readonly ShiftRawServiceItem[] | undefined;
	readonly completedServices?: readonly ShiftRawServiceItem[] | undefined;
}

export interface ShiftCompletedPatient {
	readonly id: string;
	readonly fullName: string;
	readonly medicalCardNumber?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
}

export interface ShiftCompletedStaff {
	readonly id?: string | undefined;
	readonly fullName?: string | undefined;
	readonly specialty?: string | null | undefined;
	readonly specialtyId?: string | null | undefined;
}

export interface BuildShiftCompletedServicesOptions {
	todayAppointments: readonly ShiftCompletedAppointment[];
	patientsById: ReadonlyMap<string, ShiftCompletedPatient>;
	currentPatient?: ShiftCompletedPatient | null | undefined;
	shiftActiveDoctorId?: string | undefined;
	todayIso: string;
	staffById: ReadonlyMap<string, ShiftCompletedStaff>;
}

function sanitizeCategory(
	cat: string | undefined,
	fallback: DoctorCompletedServiceItem["category"],
): DoctorCompletedServiceItem["category"] {
	if (!cat) return fallback;
	const c = cat.toLowerCase();
	if (["therapy", "orthopedics", "surgery", "orthodontics", "hygiene", "retail_hygiene", "pediatric"].includes(c)) {
		return c as DoctorCompletedServiceItem["category"];
	}
	return fallback;
}

function inferCategory(
	app: ShiftCompletedAppointment,
	docId: string | undefined,
	staffById: ReadonlyMap<string, ShiftCompletedStaff>,
): DoctorCompletedServiceItem["category"] {
	const catRaw = String(app.category || "").toLowerCase();
	if (["orthopedics", "orthopedic", "cad_cam"].includes(catRaw)) return "orthopedics";
	if (["surgery", "implant", "implantation"].includes(catRaw)) return "surgery";
	if (["orthodontics", "orthodontic", "aligner"].includes(catRaw)) return "orthodontics";
	if (["hygiene", "pro_hygiene"].includes(catRaw)) return "hygiene";
	if (["retail", "retail_hygiene"].includes(catRaw)) return "retail_hygiene";
	if (["pediatric", "pediatric_dentist"].includes(catRaw)) return "pediatric";

	const doc = staffById.get(docId ?? "");
	const spec = String(doc?.specialty || doc?.specialtyId || "").toLowerCase();
	const reason = String(app.reason || "").toLowerCase();
	if (spec.includes("orthoped") || reason.includes("коронк") || reason.includes("протез") || reason.includes("винир")) return "orthopedics";
	if (spec.includes("surg") || spec.includes("implant") || reason.includes("имплант") || reason.includes("удал")) return "surgery";
	if (spec.includes("orthodont") || reason.includes("брекет") || reason.includes("элайн")) return "orthodontics";
	if (spec.includes("hygien") || reason.includes("гигиен") || reason.includes("air-flow")) return "hygiene";
	if (spec.includes("pediatric") || reason.includes("детск")) return "pediatric";
	return "therapy";
}

export function buildShiftCompletedServices({
	todayAppointments,
	patientsById,
	currentPatient,
	shiftActiveDoctorId,
	todayIso,
	staffById,
}: BuildShiftCompletedServicesOptions): DoctorCompletedServiceItem[] {
	const items: DoctorCompletedServiceItem[] = [];

	for (const app of todayAppointments) {
		const patient = patientsById.get(app.patientId ?? "") ?? (app.patientId === currentPatient?.id ? currentPatient : null);
		const patientName = patient?.fullName || app.patientFullName || "Пациент";
		const medicalCardNumber = patient?.medicalCardNumber || patient?.cardNumber || app.medicalCardNumber || "043/у";
		const docId = app.doctorUserId || shiftActiveDoctorId || undefined;
		const category = inferCategory(app, docId, staffById);

		const rawServices = app.services || app.items || app.completedServices;
		if (Array.isArray(rawServices) && rawServices.length > 0) {
			for (let idx = 0; idx < rawServices.length; idx++) {
				const srv = rawServices[idx];
				if (!srv) continue;
				const srvPrice = Number(srv.priceRub || srv.costRub || srv.amountRub) || 0;
				items.push({
					id: String(srv.id || `${app.id}-srv-${idx + 1}`),
					dateIso: todayIso,
					patientName,
					medicalCardNumber,
					serviceNameRu: String(srv.name || srv.title || srv.serviceNameRu || app.reason || "Стоматологическая процедура"),
					category: sanitizeCategory(srv.category, category),
					grossRevenueKop: rublesToKopecks(srvPrice),
					labCostKop: rublesToKopecks(Number(srv.labCostRub) || 0),
					materialCostKop: rublesToKopecks(Number(srv.materialCostRub) || 0),
					doctorId: docId,
					performerId: srv.performerId || docId,
				});
			}
		} else {
			const appPrice = Number(app.priceRub || app.costRub || app.totalRub || app.amountRub) || 0;
			const isCompletedOrActive = ["completed", "done", "in_chair", "in_treatment", "in_progress"].includes(String(app.status || "").toLowerCase());
			if (isCompletedOrActive || appPrice > 0) {
				items.push({
					id: String(app.id),
					dateIso: todayIso,
					patientName,
					medicalCardNumber,
					serviceNameRu: String(app.reason || app.title || "Прием врача-стоматолога"),
					category,
					grossRevenueKop: rublesToKopecks(appPrice),
					labCostKop: rublesToKopecks(Number(app.labCostRub) || 0),
					materialCostKop: rublesToKopecks(Number(app.materialCostRub) || 0),
					doctorId: docId,
					performerId: docId,
				});
			}
		}
	}

	return items;
}
