/**
 * deepDemoSeederCore.ts — Master Clinical Demo Seeder Orchestrator and Tenant Isolation (Facade).
 *
 * Decomposed into modular domain components (Gate 0..6 / Decomposer Skill):
 * - coreModules/demoSeederTypes.ts: Domain contracts, status summaries, transaction types.
 * - coreModules/demoCatalogAndPriceSeeder.ts: Baseline 804n services and pricelist under RLS.
 * - coreModules/demoStaffAndChairsSeeder.ts: Organization, clinic, chairs, staff users and RLS table cleanup.
 */

import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { doctorShiftRosters, organizations, patients, users } from "../../../db/schema.js";
import { seedClinicalSchedule } from "./clinicalScheduleSeeder.js";
import {
	seedCrmLeads,
	seedDemoFinanceAndPayments,
	seedInsuranceAndIntegrations,
	seedLabOrders,
	seedSanpinRegisters,
	seedWarehouseAndInventory,
} from "./financeAndSanpinSeeder.js";
import {
	seedDemoPatients,
	seedPatientToothStates,
	seedPatientTreatmentItems,
	seedPatientTreatmentPlan,
	seedPatientVisitAndDiary,
} from "./patientTimelineSeeder.js";
import {
	type DbTx,
	DEMO_CHAIR_1_ID, DEMO_CHAIR_2_ID, DEMO_CHAIR_3_ID,
	DEMO_CLINIC_ID, DEMO_DOCTOR_1_ID, DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_SURGEON_ID, DEMO_LAB_ORDER_1_ID, DEMO_SHOWCASE_ORG_ID,
	DEMO_WAREHOUSE_ID,
	type DeepDemoSeedResult,
	type EnsureDemoShowcaseResult,
	type SeedDeepDemoDataParams,
} from "./types.js";
import { type DemoShowcaseStatusSummary } from "./coreModules/demoSeederTypes.js";
import { ensureDemoPricelistCatalog } from "./coreModules/demoCatalogAndPriceSeeder.js";
import {
	cleanDemoShowcaseTables,
	seedDemoStaffAndChairs,
} from "./coreModules/demoStaffAndChairsSeeder.js";

// Re-export core types and module utilities
export type { DemoShowcaseStatusSummary };
export { ensureDemoPricelistCatalog, cleanDemoShowcaseTables, seedDemoStaffAndChairs };

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
		p0Id: p0.id, p1Id: p1.id, p2Id: p2.id, p3Id: p3.id,
		doctorUserId, orthopedistUserId, surgeonUserId,
		primaryChairId, chair2Id, chair3Id,
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

	// 5.1. Сеем позиции планов лечения (treatment_items) по услугам Приказа 804н
	const treatmentItemIds = await seedPatientTreatmentItems(tx, {
		organizationId,
		p0Id: p0.id, p1Id: p1.id, p3Id: p3.id,
		doctorUserId, orthopedistUserId, surgeonUserId,
		chair1Id: primaryChairId, chair2Id,
		visitId: createdVisitId,
	});

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

	// 9. Сеем договоры ДМС, гарантийные письма, права бланков ЕГИСЗ и Telegram-бота
	await seedInsuranceAndIntegrations(tx, organizationId);

	// 10. Сеем журналы СанПиН 3.3686-21 / 2.1.3684-21 (ЦСО, ПСО 366/у, Автоклавы 257/у, УФ, отходы)
	await seedSanpinRegisters(tx, organizationId, doctorUserId);

	// 11. Сеем кассовые счета, комиссии врачей, счета (patient_invoices) и платежи (payments)
	const financeResult = await seedDemoFinanceAndPayments(
		tx,
		organizationId,
		doctorUserId,
		orthopedistUserId,
		surgeonUserId,
		p0.id,
		p0.fullName,
		createdVisitId,
		p1.id,
		p3.id,
	);

	return {
		patientIds: allPatients.map((p) => p.id),
		appointmentIds: insertedAppointments.map((a) => a.id),
		visitId: createdVisitId,
		treatmentPlanId: createdPlanId,
		treatmentItemIds,
		invoiceIds: financeResult.invoiceIds,
		paymentIds: financeResult.paymentIds,
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

	// 0. Гарантируем, что каталог услуг 804н засеян для демо-тенанта под RLS ДО вызова seedDeepDemoData
	await ensureDemoPricelistCatalog(forceReset);

	const result = await withTenantCtx(DEMO_SHOWCASE_ORG_ID, async (tx) => {
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

			const todayIso = new Date().toISOString().slice(0, 10);
			const todayShifts = await tx
				.select({ id: doctorShiftRosters.id })
				.from(doctorShiftRosters)
				.where(
					and(
						eq(doctorShiftRosters.organizationId, DEMO_SHOWCASE_ORG_ID),
						eq(doctorShiftRosters.dateIso, todayIso),
					),
				)
				.limit(1);

			if (staffRows.length >= 5 && todayShifts.length > 0) {
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

			if (staffRows.length >= 5) {
				// Сотрудники есть, но смены и расписание на сегодня устарели — обновляем расписание на сегодня
				const patientRows = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(eq(patients.organizationId, DEMO_SHOWCASE_ORG_ID))
					.limit(4);
				const p0Id = patientRows[0]?.id || "01a00000-0000-0000-0000-000000000001";
				const p1Id = patientRows[1]?.id || "01a00000-0000-0000-0000-000000000002";
				const p2Id = patientRows[2]?.id || "01a00000-0000-0000-0000-000000000003";
				const p3Id = patientRows[3]?.id || "01a00000-0000-0000-0000-000000000004";

				await seedClinicalSchedule(tx, {
					organizationId: DEMO_SHOWCASE_ORG_ID,
					p0Id,
					p1Id,
					p2Id,
					p3Id,
					doctorUserId: DEMO_DOCTOR_1_ID,
					orthopedistUserId: DEMO_DOCTOR_ORTHOPEDIST_ID,
					surgeonUserId: DEMO_DOCTOR_SURGEON_ID,
					primaryChairId: DEMO_CHAIR_1_ID,
					chair2Id: DEMO_CHAIR_2_ID,
					chair3Id: DEMO_CHAIR_3_ID,
				});

				return {
					alreadyExisted: true,
					organizationId: DEMO_SHOWCASE_ORG_ID,
					clinicId: DEMO_CLINIC_ID,
					chairsCount: 3,
					staffCount: staffRows.length,
					patientsCount: patientRows.length,
					appointmentsCount: 6,
					labOrderId: DEMO_LAB_ORDER_1_ID,
					warehouseId: DEMO_WAREHOUSE_ID,
					leadsCount: 4,
				};
			}
		}

		// 2. Если forceReset — очищаем исключительно демо-строки (RLS и WHERE гарантируют изоляцию)
		if (forceReset && orgExists) {
			await cleanDemoShowcaseTables(tx);
		}

		// 3. Создаем организацию, филиал, кресла и 6 сотрудников
		await seedDemoStaffAndChairs(tx);

		// 4. Засеваем пациентов, приемы, ЗТЛ, склад, лиды через расширенный seedDeepDemoData
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

	return result;
}
