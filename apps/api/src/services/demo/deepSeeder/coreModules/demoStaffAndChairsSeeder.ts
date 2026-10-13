/**
 * demoStaffAndChairsSeeder.ts — Demo Organization, Clinic, Chairs, Staff and Isolation Reset (Layer 2).
 */

import { eq, sql } from "drizzle-orm";
import {
	aiJobs,
	appointments,
	attachments,
	chairs,
	clinics,
	crmLeads,
	doctorShiftRosters,
	imagingAnnotations,
	imagingInstances,
	imagingSeries,
	imagingStudies,
	imagingViewerSessions,
	inventoryItems,
	labItems,
	labOrderEvents,
	labOrders,
	organizations,
	patients,
	stockBatches,
	toothStates,
	treatmentItems,
	treatmentPlanStages,
	treatmentPlans,
	users,
	visitDiaries,
	visits,
	warehouses,
	xrayScans,
} from "../../../../db/schema.js";
import { hashCredential } from "../../../../utils/cryptoHelper.js";
import {
	type DbTx,
	DEMO_ADMIN_ID,
	DEMO_CHAIR_1_ID,
	DEMO_CHAIR_2_ID,
	DEMO_CHAIR_3_ID,
	DEMO_CLINIC_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_SURGEON_ID,
	DEMO_OWNER_ID,
	DEMO_SHOWCASE_ORG_ID,
} from "../types.js";

/**
 * Очищает исключительно строки демо-тенанта при forceReset.
 * Строгие условия WHERE и RLS гарантируют нулевое воздействие на боевые клиники.
 */
export async function cleanDemoShowcaseTables(tx: DbTx): Promise<void> {
	const tablesToClean = [
		"dms_guarantee_letters",
		"insurance_contracts",
		"egisz_blank_permissions",
		"dente_telegram_bot_configs",
		"recent_patient_history",
		"patient_communication_consents",
		"patient_communication_timelines",
		"portal_otp_codes",
		"tooth_state_history",
		"patient_tooth_defects",
		"clinical_tasks",
		"patient_duplicate_decisions",
		"crm_leak_detector_leads",
		"patient_relationships",
		"periodontogram_snapshots",
		"treatment_consumable_deductions",
		"treatment_consumables",
		"doctor_payment_rewards",
		"doctor_payroll_statements",
		"cash_operations",
		"cash_box_shifts",
		"installment_tranches",
		"installment_contracts",
		"clinical_quality_audits",
		"crm_lead_stage_history",
		"staff_chat_messages",
		"staff_chat_channels",
		"dente_vk_user_accounts",
		"dente_telegram_account_configs",
		"communication_tasks",
		"communication_events",
		"generated_documents",
		"payments",
		"patient_invoices",
		"invoices",
		"doctor_commissions",
		"cash_operations",
		"cash_box_shifts",
		"cash_shifts",
		"cash_boxes",
		"treatment_plan_price_freeze_tokens",
		"treatment_items",
	];

	const validCols = await tx.execute(
		sql.raw(
			`SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'organization_id' AND table_name IN (${tablesToClean.map((t) => `'${t}'`).join(", ")})`,
		),
	);
	const validTableNames = new Set(
		(validCols.rows as Array<{ table_name: string }>).map((r) => r.table_name),
	);

	for (const tbl of tablesToClean) {
		if (validTableNames.has(tbl)) {
			await tx.execute(
				sql.raw(
					`DELETE FROM "${tbl}" WHERE organization_id = '${DEMO_SHOWCASE_ORG_ID}'::uuid`,
				),
			);
		}
	}

	await tx.delete(crmLeads).where(eq(crmLeads.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(labOrderEvents).where(eq(labOrderEvents.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(labItems).where(eq(labItems.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(labOrders).where(eq(labOrders.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(stockBatches).where(eq(stockBatches.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(inventoryItems).where(eq(inventoryItems.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(warehouses).where(eq(warehouses.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(treatmentItems).where(eq(treatmentItems.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(treatmentPlanStages).where(eq(treatmentPlanStages.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(treatmentPlans).where(eq(treatmentPlans.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(visitDiaries).where(eq(visitDiaries.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(visits).where(eq(visits.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(appointments).where(eq(appointments.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(aiJobs).where(eq(aiJobs.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(imagingAnnotations).where(eq(imagingAnnotations.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(imagingViewerSessions).where(eq(imagingViewerSessions.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(imagingInstances).where(eq(imagingInstances.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(imagingSeries).where(eq(imagingSeries.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(imagingStudies).where(eq(imagingStudies.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(xrayScans).where(eq(xrayScans.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(attachments).where(eq(attachments.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(toothStates).where(eq(toothStates.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(doctorShiftRosters).where(eq(doctorShiftRosters.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(patients).where(eq(patients.organizationId, DEMO_SHOWCASE_ORG_ID));
	await tx.delete(chairs).where(eq(chairs.organizationId, DEMO_SHOWCASE_ORG_ID));
}

/**
 * Создает организацию, филиал, стоматологические кресла и 6 сотрудников с правами и PIN-кодами.
 */
export async function seedDemoStaffAndChairs(tx: DbTx): Promise<void> {
	const defaultClinicPasswordHash = await hashCredential("dente2026");

	// 1. Создаем организацию
	await tx
		.insert(organizations)
		.values({
			id: DEMO_SHOWCASE_ORG_ID,
			name: "Стоматологическая Клиника DENTE (Демо)",
			loginId: "clinic@example.com",
			email: "demo@dente.ru",
			passwordHash: defaultClinicPasswordHash,
			clinicMode: "small_clinic",
			legalAddress: "г. Москва, ул. Клиническая, д. 12",
			medicalLicenseNumber: "ЛО41-01137-77/00345678",
			medicalLicenseIssuer: "Департамент здравоохранения г. Москвы",
		})
		.onConflictDoUpdate({
			target: organizations.id,
			set: {
				name: "Стоматологическая Клиника DENTE (Демо)",
			},
		});

	// 2. Создаем филиал (клинику)
	await tx
		.insert(clinics)
		.values({
			id: DEMO_CLINIC_ID,
			organizationId: DEMO_SHOWCASE_ORG_ID,
			name: "Центральное отделение DENTE",
			address: "г. Москва, ул. Клиническая, д. 12",
			phone: "+7 (495) 123-45-67",
		})
		.onConflictDoNothing();

	// 3. Создаем 3 кресла
	await tx
		.insert(chairs)
		.values([
			{
				id: DEMO_CHAIR_1_ID,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				clinicId: DEMO_CLINIC_ID,
				name: "Кабинет 1 (Терапия)",
				isActive: true,
				specializations: "Терапевтическая стоматология, эндодонтия",
			},
			{
				id: DEMO_CHAIR_2_ID,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				clinicId: DEMO_CLINIC_ID,
				name: "Кабинет 2 (Ортопедия / Хирургия)",
				isActive: true,
				specializations: "Ортопедическая стоматология, имплантация",
			},
			{
				id: DEMO_CHAIR_3_ID,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				clinicId: DEMO_CLINIC_ID,
				name: "Кабинет 3 (Ортодонтия)",
				isActive: true,
				specializations: "Ортодонтия, гигиена",
			},
		])
		.onConflictDoNothing();

	// 4. Создаем всех 6 сотрудников с реальными ролями, PIN-кодами и правами
	const [
		therapistPinHash,
		orthopedistPinHash,
		orthodontistPinHash,
		surgeonPinHash,
		ownerPinHash,
		adminPinHash,
	] = await Promise.all([
		hashCredential("1111"),
		hashCredential("2222"),
		hashCredential("3333"),
		hashCredential("4444"),
		hashCredential("0000"),
		hashCredential("5555"),
	]);

	await tx
		.insert(users)
		.values([
			{
				id: DEMO_DOCTOR_1_ID,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				fullName: "Д-р Соколов А. В.",
				role: "doctor",
				email: "therapist@dente-demo.ru",
				phone: "+7 916 111-22-33",
				pinCodeHash: therapistPinHash,
				isActive: true,
				canSignMedicalRecords: true,
				canManageMoney: false,
				canManageImports: false,
			},
			{
				id: DEMO_DOCTOR_ORTHOPEDIST_ID,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				fullName: "Д-р Орлов А. В.",
				role: "doctor",
				email: "orthopedist@dente-demo.ru",
				phone: "+7 916 111-88-99",
				pinCodeHash: orthopedistPinHash,
				isActive: true,
				canSignMedicalRecords: true,
				canManageMoney: false,
				canManageImports: false,
			},
			{
				id: DEMO_DOCTOR_2_ID,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				fullName: "Д-р Морозова Е. И.",
				role: "doctor",
				email: "orthodontist@dente-demo.ru",
				phone: "+7 916 222-33-44",
				pinCodeHash: orthodontistPinHash,
				isActive: true,
				canSignMedicalRecords: true,
				canManageMoney: false,
				canManageImports: false,
			},
			{
				id: DEMO_DOCTOR_SURGEON_ID,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				fullName: "Д-р Громов К. Д.",
				role: "doctor",
				email: "surgeon@dente-demo.ru",
				phone: "+7 916 333-44-55",
				pinCodeHash: surgeonPinHash,
				isActive: true,
				canSignMedicalRecords: true,
				canManageMoney: false,
				canManageImports: false,
			},
			{
				id: DEMO_OWNER_ID,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				fullName: "Д-р Воронов М. С.",
				role: "owner",
				email: "owner@dente-demo.ru",
				phone: "+7 916 444-55-66",
				pinCodeHash: ownerPinHash,
				isActive: true,
				canSignMedicalRecords: true,
				canManageMoney: true,
				canManageImports: true,
			},
			{
				id: DEMO_ADMIN_ID,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				fullName: "Смирнова А. П.",
				role: "administrator",
				email: "admin@dente-demo.ru",
				phone: "+7 916 555-66-77",
				pinCodeHash: adminPinHash,
				isActive: true,
				canSignMedicalRecords: false,
				canManageMoney: true,
				canManageImports: false,
			},
		])
		.onConflictDoNothing();
}
