import { db } from "../db/client.js";
import { patients, treatmentPlans, appointments } from "../db/schema.js";
import {
	DEMO_SHOWCASE_ORG_ID,
	DEMO_PATIENT_1_ID,
	DEMO_PATIENT_2_ID,
	DEMO_PATIENT_3_ID,
	DEMO_PATIENT_4_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_SURGEON_ID,
} from "../services/demo/deepDemoSeeder.js";
import { eq, type InferInsertModel } from "drizzle-orm";

type TreatmentPlanInsert = InferInsertModel<typeof treatmentPlans>;

async function main() {
	console.log("Seeding realistic Treatment Pipeline cards for showcase demo across all 5 stages...");

	const now = new Date();
	const past42Days = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000);
	const past5Days = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
	const past1Day = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

	// Create 2 additional demo patients without future appointments
	const PATIENT_NO_APPT_ID = "01a00000-0000-0000-0000-000000000005";
	const PATIENT_ABANDONED_ID = "01a00000-0000-0000-0000-000000000006";

	for (const patientData of [
		{
			id: PATIENT_NO_APPT_ID,
			organizationId: DEMO_SHOWCASE_ORG_ID,
			fullName: "Васильев Игорь Олегович",
			phone: "+7 (926) 555-12-34",
			birthDate: "1988-04-12",
			createdAt: past5Days,
			updatedAt: past1Day,
		},
		{
			id: PATIENT_ABANDONED_ID,
			organizationId: DEMO_SHOWCASE_ORG_ID,
			fullName: "Фёдорова Надежда Павловна",
			phone: "+7 (903) 777-88-99",
			birthDate: "1975-09-23",
			createdAt: past42Days,
			updatedAt: past42Days,
		},
	]) {
		await db.insert(patients).values(patientData).onConflictDoNothing();
	}

	// Past visit for abandoned patient
	await db
		.insert(appointments)
		.values({
			id: "01a00000-0000-0001-0000-000000000099",
			organizationId: DEMO_SHOWCASE_ORG_ID,
			patientId: PATIENT_ABANDONED_ID,
			doctorUserId: DEMO_DOCTOR_1_ID,
			status: "completed",
			startsAt: past42Days,
			endsAt: new Date(past42Days.getTime() + 60 * 60 * 1000),
			reason: "Первичный терапевтический приём",
		})
		.onConflictDoNothing();

	const plansToUpsert: (typeof treatmentPlans.$inferInsert)[] = [
		// 1. requires_budget
		{
			id: "01a11f8c-b8a8-7f02-860f-fa121470e001",
			organizationId: DEMO_SHOWCASE_ORG_ID,
			patientId: DEMO_PATIENT_4_ID, // Морозова А. Д.
			doctorId: DEMO_DOCTOR_SURGEON_ID, // Громов К. Д.
			title: "Хирургическая санация и костная пластика",
			name: "Хирургическая санация и костная пластика",
			status: "Draft",
			totalPrice: "45000",
			totalPriceRub: "45000",
			planDiscountRub: 0,
			createdAt: past5Days,
			updatedAt: past5Days,
		},
		// 3. no_appointment
		{
			id: "01a11f8c-b8a8-7f02-860f-fa121470e003",
			organizationId: DEMO_SHOWCASE_ORG_ID,
			patientId: PATIENT_NO_APPT_ID, // Васильев И. О. (нет будущих визитов)
			doctorId: DEMO_DOCTOR_ORTHOPEDIST_ID, // Орлов А. В.
			title: "Тотальное протезирование на диоксиде циркония",
			name: "Тотальное протезирование на диоксиде циркония",
			status: "Approved",
			totalPrice: "142000",
			totalPriceRub: "142000",
			planDiscountRub: 7000,
			createdAt: past5Days,
			updatedAt: past1Day,
		},
		// 4. in_progress_abandoned
		{
			id: "01a11f8c-b8a8-7f02-860f-fa121470e004",
			organizationId: DEMO_SHOWCASE_ORG_ID,
			patientId: PATIENT_ABANDONED_ID, // Фёдорова Н. П. (нет будущих визитов, 42 дня тишины)
			doctorId: DEMO_DOCTOR_1_ID, // Соколов А. В.
			title: "Эндодонтическое перелечивание каналов 16, 17",
			name: "Эндодонтическое перелечивание каналов 16, 17",
			status: "Active",
			totalPrice: "28000",
			totalPriceRub: "28000",
			planDiscountRub: 0,
			createdAt: past42Days,
			updatedAt: past42Days,
		},
		// 5. completed
		{
			id: "01a11f8c-b8a8-7f02-860f-fa121470e005",
			organizationId: DEMO_SHOWCASE_ORG_ID,
			patientId: DEMO_PATIENT_3_ID, // Кузнецов Д. П.
			doctorId: DEMO_DOCTOR_2_ID, // Морозова Е. И.
			title: "Ортодонтическое лечение на элайнерах Spark",
			name: "Ортодонтическое лечение на элайнерах Spark",
			status: "Completed",
			totalPrice: "195000",
			totalPriceRub: "195000",
			planDiscountRub: 10000,
			createdAt: past42Days,
			updatedAt: past1Day,
		},
	];

	for (const p of plansToUpsert) {
		await db
			.insert(treatmentPlans)
			.values(p)
			.onConflictDoUpdate({
				target: treatmentPlans.id,
				set: {
					title: p.title ?? "",
					name: p.name,
					status: p.status ?? "Draft",
					totalPrice: p.totalPrice ?? "0",
					totalPriceRub: p.totalPriceRub,
					planDiscountRub: p.planDiscountRub ?? 0,
					updatedAt: p.updatedAt ?? new Date(),
				},
			});
	}

	console.log("Successfully seeded 5-stage pipeline demo plans!");
	process.exit(0);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
