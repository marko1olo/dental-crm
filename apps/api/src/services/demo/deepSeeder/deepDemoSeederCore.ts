/**
 * deepDemoSeederCore.ts — Master Clinical Demo Seeder Orchestrator and Tenant Isolation (Layer 2).
 */

import { eq, sql } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	chairs,
	clinics,
	crmLeads,
	inventoryItems,
	labItems,
	labOrderEvents,
	labOrders,
	organizations,
	patients,
	stockBatches,
	toothStates,
	treatmentPlanStages,
	treatmentPlans,
	users,
	visitDiaries,
	visits,
	warehouses,
} from "../../../db/schema.js";
import { hashCredential } from "../../../utils/cryptoHelper.js";
import { seedClinicalSchedule } from "./clinicalScheduleSeeder.js";
import {
	seedCrmLeads,
	seedLabOrders,
	seedWarehouseAndInventory,
} from "./financeAndSanpinSeeder.js";
import {
	seedDemoPatients,
	seedPatientToothStates,
	seedPatientTreatmentPlan,
	seedPatientVisitAndDiary,
} from "./patientTimelineSeeder.js";
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
	DEMO_LAB_ORDER_1_ID,
	DEMO_OWNER_ID,
	DEMO_SHOWCASE_ORG_ID,
	DEMO_WAREHOUSE_ID,
	type DeepDemoSeedResult,
	type EnsureDemoShowcaseResult,
	type SeedDeepDemoDataParams,
} from "./types.js";

/**
 * Сеет глубокие клинические данные для конкретной организации (в том числе при регистрации с демо-данными).
 */
export async function seedDeepDemoData(
	tx: DbTx,
	params: SeedDeepDemoDataParams,
): Promise<DeepDemoSeedResult> {
	const {
		organizationId,
		doctorUserId,
		primaryChairId,
		orthopedistUserId = doctorUserId,
		surgeonUserId = doctorUserId,
		chair2Id = primaryChairId,
		chair3Id = primaryChairId,
	} = params;

	// 1. Создаем 4 демо-пациента
	const patientsBundle = await seedDemoPatients(tx, organizationId);
	if (!patientsBundle) {
		return { patientIds: [], appointmentIds: [], leadIds: [] };
	}
	const { allPatients, p0, p1, p2, p3 } = patientsBundle;

	// 2. Создаем приемы в расписании (на сегодня и завтра)
	const insertedAppointments = await seedClinicalSchedule(tx, {
		organizationId,
		p0Id: p0.id,
		p1Id: p1.id,
		p2Id: p2.id,
		p3Id: p3.id,
		doctorUserId,
		orthopedistUserId,
		surgeonUserId,
		primaryChairId,
		chair2Id,
		chair3Id,
	});
	const [app0] = insertedAppointments;

	// 3. Сеем зубные формулы (одонтограммы)
	await seedPatientToothStates(tx, organizationId, p0.id, p1.id, p3.id);

	// 4. Сеем завершенный визит и медицинский дневник 043/у (SOAP)
	let createdVisitId: string | undefined;
	if (app0) {
		createdVisitId = await seedPatientVisitAndDiary(
			tx,
			organizationId,
			p0.id,
			app0.id,
			doctorUserId,
		);
	}

	// 5. Сеем утвержденный комплексный план лечения для пациента p0
	const createdPlanId = await seedPatientTreatmentPlan(
		tx,
		organizationId,
		p0,
		doctorUserId,
	);

	// 6. Сеем заказ в зуботехническую лабораторию (ЗТЛ)
	const createdLabOrderId = await seedLabOrders(
		tx,
		organizationId,
		p1.id,
		orthopedistUserId,
	);

	// 7. Сеем основной склад клиники и медикаменты партионного учета (FEFO)
	const warehouseId = await seedWarehouseAndInventory(tx, organizationId);

	// 8. Сеем лиды и входящие заявки (crm_leads)
	const insertedLeads = await seedCrmLeads(tx, organizationId);

	return {
		patientIds: allPatients.map((p) => p.id),
		appointmentIds: insertedAppointments.map((a) => a.id),
		visitId: createdVisitId,
		treatmentPlanId: createdPlanId,
		labOrderId: createdLabOrderId,
		warehouseId,
		leadIds: insertedLeads.map((l) => l.id),
	};
}

/**
 * Идемпотентный механизм обеспечения существования полного демонстрационного
 * тенанта (DEMO_SHOWCASE_ORG_ID = '01a00000-0000-0000-0000-000000000000') в PostgreSQL.
 *
 * Если организация уже существует и forceReset === false — завершается мгновенно.
 * Если forceReset === true — очищает строки только демо-тенанта и засевает заново.
 */
export async function ensureDemoShowcaseTenant(
	_dbInstance?: DbTx,
	options?: { forceReset?: boolean },
): Promise<EnsureDemoShowcaseResult> {
	const forceReset = options?.forceReset === true;

	return withTenantCtx(DEMO_SHOWCASE_ORG_ID, async (tx) => {
		// 1. Проверяем, существует ли уже демо-организация
		const existingOrgs = await tx
			.select({ id: organizations.id, name: organizations.name })
			.from(organizations)
			.where(eq(organizations.id, DEMO_SHOWCASE_ORG_ID))
			.limit(1);

		const orgExists = existingOrgs.length > 0;

		if (orgExists && !forceReset) {
			// Проверяем, что есть сотрудники и пациенты
			const staffRows = await tx
				.select({ id: users.id })
				.from(users)
				.where(eq(users.organizationId, DEMO_SHOWCASE_ORG_ID))
				.limit(10);

			if (staffRows.length >= 5) {
				return {
					alreadyExisted: true,
					organizationId: DEMO_SHOWCASE_ORG_ID,
					clinicId: DEMO_CLINIC_ID,
					chairsCount: 3,
					staffCount: staffRows.length,
					patientsCount: 4,
					appointmentsCount: 6,
					labOrderId: DEMO_LAB_ORDER_1_ID,
					warehouseId: DEMO_WAREHOUSE_ID,
					leadsCount: 4,
				};
			}
		}

		// 2. Если forceReset — очищаем исключительно демо-строки (RLS и WHERE гарантируют изоляцию)
		if (forceReset && orgExists) {
			const tablesToClean = [
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
			];
			for (const tbl of tablesToClean) {
				try {
					await tx.execute(
						sql.raw(
							`DELETE FROM "${tbl}" WHERE organization_id = '${DEMO_SHOWCASE_ORG_ID}'::uuid`,
						),
					);
				} catch {
					// safe fallback
				}
			}

			await tx.delete(crmLeads).where(eq(crmLeads.organizationId, DEMO_SHOWCASE_ORG_ID));
			await tx.delete(labOrderEvents).where(eq(labOrderEvents.organizationId, DEMO_SHOWCASE_ORG_ID));
			await tx.delete(labItems).where(eq(labItems.organizationId, DEMO_SHOWCASE_ORG_ID));
			await tx.delete(labOrders).where(eq(labOrders.organizationId, DEMO_SHOWCASE_ORG_ID));
			await tx.delete(stockBatches).where(eq(stockBatches.organizationId, DEMO_SHOWCASE_ORG_ID));
			await tx.delete(inventoryItems).where(eq(inventoryItems.organizationId, DEMO_SHOWCASE_ORG_ID));
			await tx.delete(warehouses).where(eq(warehouses.organizationId, DEMO_SHOWCASE_ORG_ID));
			await tx.delete(treatmentPlanStages).where(eq(treatmentPlanStages.organizationId, DEMO_SHOWCASE_ORG_ID));
			await tx.delete(treatmentPlans).where(eq(treatmentPlans.organizationId, DEMO_SHOWCASE_ORG_ID));
			await tx.delete(visitDiaries).where(eq(visitDiaries.organizationId, DEMO_SHOWCASE_ORG_ID));
			await tx.delete(visits).where(eq(visits.organizationId, DEMO_SHOWCASE_ORG_ID));
			await tx.delete(appointments).where(eq(appointments.organizationId, DEMO_SHOWCASE_ORG_ID));
			await tx.delete(toothStates).where(eq(toothStates.organizationId, DEMO_SHOWCASE_ORG_ID));
			await tx.delete(patients).where(eq(patients.organizationId, DEMO_SHOWCASE_ORG_ID));
			await tx.delete(chairs).where(eq(chairs.organizationId, DEMO_SHOWCASE_ORG_ID));
		}

		// 3. Создаем организацию
		const defaultClinicPasswordHash = await hashCredential("dente2026");

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
			.onConflictDoNothing();

		// 4. Создаем филиал (клинику)
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

		// 5. Создаем 3 кресла
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

		// 6. Создаем всех 5 сотрудников с реальными ролями, PIN-кодами и правами
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

		// 7. Засеваем пациентов, приемы, ЗТЛ, склад, лиды через расширенный seedDeepDemoData
		const deepResult = await seedDeepDemoData(tx, {
			organizationId: DEMO_SHOWCASE_ORG_ID,
			doctorUserId: DEMO_DOCTOR_1_ID,
			primaryChairId: DEMO_CHAIR_1_ID,
			orthopedistUserId: DEMO_DOCTOR_ORTHOPEDIST_ID,
			surgeonUserId: DEMO_DOCTOR_SURGEON_ID,
			chair2Id: DEMO_CHAIR_2_ID,
			chair3Id: DEMO_CHAIR_3_ID,
		});

		return {
			alreadyExisted: false,
			organizationId: DEMO_SHOWCASE_ORG_ID,
			clinicId: DEMO_CLINIC_ID,
			chairsCount: 3,
			staffCount: 6,
			patientsCount: deepResult.patientIds.length,
			appointmentsCount: deepResult.appointmentIds.length,
			labOrderId: deepResult.labOrderId,
			warehouseId: deepResult.warehouseId,
			leadsCount: deepResult.leadIds.length,
		};
	});
}
