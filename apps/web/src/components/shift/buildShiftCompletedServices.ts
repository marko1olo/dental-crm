import type { DoctorCompletedServiceItem } from "@dental/shared/payroll";

export interface BuildShiftCompletedServicesOptions {
	// biome-ignore lint/suspicious/noExplicitAny: appointment
	todayAppointments: readonly any[];
	// biome-ignore lint/suspicious/noExplicitAny: patient map
	patientsById: Map<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: patient
	currentPatient: any;
	shiftActiveDoctorId?: string | undefined;
	todayIso: string;
	// biome-ignore lint/suspicious/noExplicitAny: staff map
	staffById: Map<string, any>;
}

function inferCategory(appAny: any, app: any, docId: string | undefined, staffById: Map<string, any>): DoctorCompletedServiceItem["category"] {
	const catRaw = String(appAny.category || "").toLowerCase();
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
		// biome-ignore lint/suspicious/noExplicitAny: app
		const appAny = app as any;
		const patient = patientsById.get(app.patientId ?? "") ?? (app.patientId === currentPatient?.id ? currentPatient : null);
		const patientName = patient?.fullName || appAny.patientFullName || "Пациент";
		const medicalCardNumber = patient?.medicalCardNumber || patient?.cardNumber || appAny.medicalCardNumber || "043/у";
		const docId = appAny.doctorUserId || shiftActiveDoctorId || undefined;
		const category = inferCategory(appAny, app, docId, staffById);

		const rawServices = appAny.services || appAny.items || appAny.completedServices;
		if (Array.isArray(rawServices) && rawServices.length > 0) {
			for (let idx = 0; idx < rawServices.length; idx++) {
				const srv = rawServices[idx];
				const srvPrice = Number(srv.priceRub || srv.costRub || srv.amountRub) || 0;
				items.push({
					id: String(srv.id || `${app.id}-srv-${idx + 1}`),
					dateIso: todayIso,
					patientName,
					medicalCardNumber,
					serviceNameRu: String(srv.name || srv.title || srv.serviceNameRu || app.reason || "Стоматологическая процедура"),
					category: (srv.category as any) || category,
					grossRevenueKop: Math.round(srvPrice * 100),
					labCostKop: Math.round((Number(srv.labCostRub) || 0) * 100),
					materialCostKop: Math.round((Number(srv.materialCostRub) || 0) * 100),
					doctorId: docId,
					performerId: srv.performerId || docId,
				});
			}
		} else {
			const appPrice = Number(appAny.priceRub || appAny.costRub || appAny.totalRub || appAny.amountRub) || 0;
			const isCompletedOrActive = ["completed", "done", "in_chair", "in_treatment", "in_progress"].includes(String(app.status || "").toLowerCase());
			if (isCompletedOrActive || appPrice > 0) {
				items.push({
					id: String(app.id),
					dateIso: todayIso,
					patientName,
					medicalCardNumber,
					serviceNameRu: String(app.reason || appAny.title || "Прием врача-стоматолога"),
					category,
					grossRevenueKop: Math.round(appPrice * 100),
					labCostKop: Math.round((Number(appAny.labCostRub) || 0) * 100),
					materialCostKop: Math.round((Number(appAny.materialCostRub) || 0) * 100),
					doctorId: docId,
					performerId: docId,
				});
			}
		}
	}

	return items;
}
