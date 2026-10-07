/**
 * deepDemoSeeder.ts — Глубокая клиническая инициализация демонстрационной клиники (МАНДАТ 8c, 8f, 8y, 8n).
 *
 * Сеет полноценный клинический контекст в реальную PostgreSQL 18 базу данных:
 * 1. Организация демо-клиники с 3 креслами и филиалом (DEMO_SHOWCASE_ORG_ID).
 * 2. Все 5 демо-ролей персонала:
 *    - Терапевт (Д-р Соколов А. В., PIN 1111)
 *    - Ортопед (Д-р Орлов А. В., PIN 2222)
 *    - Ортодонт (Д-р Морозова Е. И., PIN 3333)
 *    - Хирург-имплантолог (Д-р Громов К. Д., PIN 4444)
 *    - Главврач / Владелец (Д-р Воронов М. С., PIN 0000)
 *    - Старший администратор (Смирнова А. П., PIN 5555)
 * 3. 4 реальных пациента с привязанными зубными картами (tooth_states):
 *    - Терапевтический кейс (кариес 16 MOD, пломба 24 O, пульпит 36 MO, адентия 18/28/38/48)
 *    - Ортопедический кейс (коронка ZrO2 11, эстетические виниры)
 *    - Ортодонтический кейс (элайнеры, аттачменты 14/13/23/24)
 *    - Хирургический кейс (имплантация Straumann BLX 46)
 * 4. Записи в расписании (appointments) на сегодня и завтра с привязкой к креслам и врачам.
 * 5. Завершенный визит и протокол амбулаторного приема (Форма 043/у) SOAP: жалобы, анамнез, статус локалис, протокол.
 * 6. Утвержденный комплексный план лечения (смета) с этапами.
 * 7. Наряд-заказ в зуботехническую лабораторию (lab_orders) с позициями и этапами отслеживания (lab_items, lab_order_events).
 * 8. Основной склад клиники (warehouses, inventory_items) с сериями партионного учета FEFO (stock_batches).
 * 9. Лиды / входящие заявки пациентов (crm_leads) с источниками, ожидаемой выручкой и этапами.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { type TenantDb, withTenantCtx } from "../../db/rls.js";
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
	treatmentPlans,
	treatmentPlanStages,
	users,
	visitDiaries,
	visits,
	warehouses,
} from "../../db/schema.js";
import { hashCredential } from "../../utils/cryptoHelper.js";

export type DbTx =
	| Parameters<Parameters<typeof db.transaction>[0]>[0]
	| TenantDb;

// ─── Канонические ID демо-контура (SSOT) ─────────────────────────────────────────

export const DEMO_SHOWCASE_ORG_ID = "01a00000-0000-0000-0000-000000000000";

export const DEMO_CLINIC_ID = "01a00000-0000-0001-0000-000000000001";

export const DEMO_CHAIR_1_ID = "01a00000-0000-0000-0002-000000000001"; // Терапия
export const DEMO_CHAIR_2_ID = "01a00000-0000-0000-0002-000000000002"; // Ортопедия / Хирургия
export const DEMO_CHAIR_3_ID = "01a00000-0000-0000-0002-000000000003"; // Ортодонтия

export const DEMO_DOCTOR_1_ID = "01a00000-0000-0000-0003-000000000001"; // Терапевт (Соколов А. В.)
export const DEMO_DOCTOR_ORTHOPEDIST_ID = "01a00000-0000-0000-0003-000000000006"; // Ортопед (Орлов А. В.)
export const DEMO_DOCTOR_2_ID = "01a00000-0000-0000-0003-000000000002"; // Ортодонт (Морозова Е. И.)
export const DEMO_DOCTOR_SURGEON_ID = "01a00000-0000-0000-0003-000000000003"; // Хирург-имплантолог (Громов К. Д.)
export const DEMO_OWNER_ID = "01a00000-0000-0000-0003-000000000004"; // Главврач / Владелец (Воронов М. С.)
export const DEMO_ADMIN_ID = "01a00000-0000-0000-0003-000000000005"; // Старший администратор (Смирнова А. П.)

export const DEMO_PATIENT_1_ID = "01a00000-0000-0000-0000-000000000001"; // Иванов А. С. (Терапия)
export const DEMO_PATIENT_2_ID = "01a00000-0000-0000-0000-000000000002"; // Смирнова Е. В. (Ортопедия / ЗТЛ)
export const DEMO_PATIENT_3_ID = "01a00000-0000-0000-0000-000000000003"; // Кузнецов Д. П. (Ортодонтия)
export const DEMO_PATIENT_4_ID = "01a00000-0000-0000-0000-000000000004"; // Морозова А. Д. (Хирургия)

export const DEMO_WAREHOUSE_ID = "01a00000-0000-0004-0000-000000000001";
export const DEMO_LAB_ORDER_1_ID = "01a00000-0000-0005-0000-000000000001";

export interface SeedDeepDemoDataParams {
	readonly organizationId: string;
	readonly doctorUserId: string;
	readonly primaryChairId: string;
	readonly orthopedistUserId?: string;
	readonly surgeonUserId?: string;
	readonly chair2Id?: string;
	readonly chair3Id?: string;
}

export interface DeepDemoSeedResult {
	patientIds: string[];
	appointmentIds: string[];
	visitId?: string | undefined;
	treatmentPlanId?: string | undefined;
	labOrderId?: string | undefined;
	warehouseId?: string | undefined;
	leadIds: string[];
}

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
	const isCanonicalDemoOrg = organizationId === DEMO_SHOWCASE_ORG_ID;

	const demoPatientsList = [
		{
			...(isCanonicalDemoOrg ? { id: DEMO_PATIENT_1_ID } : {}),
			organizationId,
			fullName: "Иванов Алексей Сергеевич",
			phone: "+7 (912) 345-67-89",
			birthDate: "1988-04-12",
			notes: "Первичный терапевтический осмотр, жалоба на чувствительность 1.6",
			status: "active" as const,
		},
		{
			...(isCanonicalDemoOrg ? { id: DEMO_PATIENT_2_ID } : {}),
			organizationId,
			fullName: "Смирнова Елена Викторовна",
			phone: "+7 (927) 876-54-32",
			birthDate: "1994-09-23",
			notes: "Ортопедический приём: коронка ZrO2 Prettau на зуб 11, заказ в ЗТЛ",
			status: "active" as const,
		},
		{
			...(isCanonicalDemoOrg ? { id: DEMO_PATIENT_3_ID } : {}),
			organizationId,
			fullName: "Кузнецов Дмитрий Павлович",
			phone: "+7 (903) 555-43-21",
			birthDate: "1979-11-05",
			notes: "Ортодонтическое лечение: элайнеры (капа 12 из 30), контроль аттачментов",
			status: "active" as const,
		},
		{
			...(isCanonicalDemoOrg ? { id: DEMO_PATIENT_4_ID } : {}),
			organizationId,
			fullName: "Морозова Анна Дмитриевна",
			phone: "+7 (987) 654-32-10",
			birthDate: "2001-02-18",
			notes: "Хирургический приём: имплантация Straumann BLX 4.5x10 в области 4.6",
			status: "active" as const,
		},
	];

	const insertedPatients = await tx
		.insert(patients)
		.values(demoPatientsList)
		.onConflictDoNothing()
		.returning({ id: patients.id, fullName: patients.fullName });

	// Если уже были вставлены ранее (при идемпотентном вызове) — считываем их
	const allPatients =
		insertedPatients.length >= 4
			? insertedPatients
			: await tx
					.select({ id: patients.id, fullName: patients.fullName })
					.from(patients)
					.where(eq(patients.organizationId, organizationId))
					.limit(4);

	const [p0, p1, p2, p3] = allPatients;
	if (!p0 || !p1 || !p2 || !p3) {
		return { patientIds: [], appointmentIds: [], leadIds: [] };
	}

	// 2. Создаем приемы в расписании (на сегодня и завтра)
	const now = new Date();
	const today10 = new Date(now);
	today10.setHours(10, 0, 0, 0);
	const today1045 = new Date(today10.getTime() + 45 * 60 * 1000);

	const today1130 = new Date(now);
	today1130.setHours(11, 30, 0, 0);
	const today1230 = new Date(today1130.getTime() + 60 * 60 * 1000);

	const today1400 = new Date(now);
	today1400.setHours(14, 0, 0, 0);
	const today1500 = new Date(today1400.getTime() + 60 * 60 * 1000);

	const today1600 = new Date(now);
	today1600.setHours(16, 0, 0, 0);
	const today1730 = new Date(today1600.getTime() + 90 * 60 * 1000);

	const tomorrow10 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	tomorrow10.setHours(10, 0, 0, 0);
	const tomorrow11 = new Date(tomorrow10.getTime() + 60 * 60 * 1000);

	const tomorrow12 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	tomorrow12.setHours(12, 0, 0, 0);
	const tomorrow13 = new Date(tomorrow12.getTime() + 60 * 60 * 1000);

	const insertedAppointments = await tx
		.insert(appointments)
		.values([
			{
				organizationId,
				patientId: p0.id,
				doctorUserId,
				chairId: primaryChairId,
				status: "completed",
				startsAt: today10,
				endsAt: today1045,
				reason: "Консультация и лечение кариеса",
				comment: "Демо-запись: первичный терапевтический приём завершен",
			},
			{
				organizationId,
				patientId: p1.id,
				doctorUserId: orthopedistUserId,
				chairId: chair2Id,
				status: "planned",
				startsAt: today1130,
				endsAt: today1230,
				reason: "Ортопедическая примерка коронки 11",
				comment: "Демо-запись: примерка циркониевой коронки из ЗТЛ",
			},
			{
				organizationId,
				patientId: p2.id,
				doctorUserId,
				chairId: chair3Id,
				status: "planned",
				startsAt: today1400,
				endsAt: today1500,
				reason: "Контроль элайнеров (капа 12/30)",
				comment: "Демо-запись: ортодонтическая активация",
			},
			{
				organizationId,
				patientId: p3.id,
				doctorUserId: surgeonUserId,
				chairId: chair2Id,
				status: "planned",
				startsAt: today1600,
				endsAt: today1730,
				reason: "Дентальная имплантация зуба 46",
				comment: "Демо-запись: операция имплантации Straumann BLX",
			},
			{
				organizationId,
				patientId: p0.id,
				doctorUserId,
				chairId: primaryChairId,
				status: "planned",
				startsAt: tomorrow10,
				endsAt: tomorrow11,
				reason: "Лечение пульпита 36 (этап 2)",
				comment: "Демо-запись: пломбирование корневых каналов",
			},
			{
				organizationId,
				patientId: p1.id,
				doctorUserId: orthopedistUserId,
				chairId: chair2Id,
				status: "planned",
				startsAt: tomorrow12,
				endsAt: tomorrow13,
				reason: "Постоянная фиксация коронки 11",
				comment: "Демо-запись: фиксация на RelyX U200",
			},
		])
		.onConflictDoNothing()
		.returning({ id: appointments.id });

	const [app0] = insertedAppointments;

	// 3. Сеем зубные формулы (одонтограммы)
	await tx
		.insert(toothStates)
		.values([
			// Пациент 1 (Терапия)
			{
				organizationId,
				patientId: p0.id,
				toothNumber: 16,
				state: "caries",
				surfaces: ["M", "O", "D"],
				notes: "Глубокий кариес дентина (K02.1)",
			},
			{
				organizationId,
				patientId: p0.id,
				toothNumber: 24,
				state: "filling",
				surfaces: ["O"],
				notes: "Световая пломба Ceram.x Spectra ST (Z96.5)",
			},
			{
				organizationId,
				patientId: p0.id,
				toothNumber: 36,
				state: "pulpitis",
				surfaces: ["M", "O"],
				notes: "Острый необратимый пульпит (K04.0)",
			},
			{
				organizationId,
				patientId: p0.id,
				toothNumber: 18,
				state: "missing",
				notes: "Адентия третьего моляра",
			},
			{
				organizationId,
				patientId: p0.id,
				toothNumber: 28,
				state: "missing",
				notes: "Адентия третьего моляра",
			},
			{
				organizationId,
				patientId: p0.id,
				toothNumber: 38,
				state: "missing",
				notes: "Адентия третьего моляра",
			},
			{
				organizationId,
				patientId: p0.id,
				toothNumber: 48,
				state: "missing",
				notes: "Адентия третьего моляра",
			},
			// Пациент 2 (Ортопедия)
			{
				organizationId,
				patientId: p1.id,
				toothNumber: 11,
				state: "crown",
				notes: "Коронка из диоксида циркония (ZrO2 Prettau), наряд ЗТЛ",
			},
			{
				organizationId,
				patientId: p1.id,
				toothNumber: 12,
				state: "filling",
				surfaces: ["V"],
				notes: "Керамический винир E.max",
			},
			{
				organizationId,
				patientId: p1.id,
				toothNumber: 21,
				state: "filling",
				surfaces: ["V"],
				notes: "Керамический винир E.max",
			},
			// Пациент 4 (Хирургия)
			{
				organizationId,
				patientId: p3.id,
				toothNumber: 46,
				state: "implant",
				notes: "Имплантат Straumann BLX 4.5x10, формирователь десны",
			},
		])
		.onConflictDoNothing();

	// 4. Сеем завершенный визит и медицинский дневник 043/у (SOAP)
	let createdVisitId: string | undefined;
	if (app0) {
		const [createdVisit] = await tx
			.insert(visits)
			.values({
				organizationId,
				patientId: p0.id,
				appointmentId: app0.id,
				status: "signed",
			})
			.onConflictDoNothing()
			.returning({ id: visits.id });

		if (createdVisit) {
			createdVisitId = createdVisit.id;
			await tx
				.insert(visitDiaries)
				.values({
					organizationId,
					visitId: createdVisit.id,
					patientId: p0.id,
					doctorId: doctorUserId,
					authorId: doctorUserId,
					anamnesis:
						"Пациент обратился с жалобами на кратковременные боли от сладкого и холодного в области зуба 1.6. " +
						"Полость заметил около 2 месяцев назад. Аллергоанамнез не отягощен, соматически здоров.",
					statusLocalis:
						"На окклюзионной и контактных поверхностях зуба 1.6 глубокая кариозная полость, " +
						"выполненная размягченным дентином. Зондирование дна чувствительно. Термопроба положительна, кратковременна. " +
						"Перкуссия безболезненна. Слизистая в норме.",
					diagnosisIcd10: "K02.1 Кариес дентина",
					diagnosisTooth: "16",
					treatmentDescription:
						"Инфильтрационная анестезия Sol. Articaini 4% 1.7 мл. Изоляция системой коффердам. " +
						"Препарирование полости зуба 1.6, некрэктомия. Медикаментозная обработка 2% р-ром хлоргексидина. " +
						"Лечебная подкладка МТА, изолирующая прокладка СИЦ. Адгезивный протокол OptiBond FL. " +
						"Послойная анатомическая реставрация композитом Ceram.x Spectra ST A2, A3. Полировка Sof-Lex.",
					content:
						"Первичный прием врача-стоматолога терапевта. Успешное терапевтическое лечение глубокого кариеса зуба 1.6.",
					isLocked: true,
					lockedAt: new Date(),
					lockedByUserId: doctorUserId,
				})
				.onConflictDoNothing();
		}
	}

	// 5. Сеем утвержденный комплексный план лечения для пациента p0
	const [createdPlan] = await tx
		.insert(treatmentPlans)
		.values({
			organizationId,
			patientId: p0.id,
			doctorId: doctorUserId,
			title: "Комплексный план санации полости рта",
			name: "Комплексный план санации полости рта",
			status: "Active",
			totalPriceRub: "18500.00",
			totalPrice: "18500.00",
			approvedAt: new Date(),
		})
		.onConflictDoNothing()
		.returning({ id: treatmentPlans.id, title: treatmentPlans.title });

	if (createdPlan) {
		await tx
			.insert(treatmentPlanStages)
			.values({
				organizationId,
				patientName: p0.fullName,
				planTitle: createdPlan.title,
				stageOrder: 1,
				stageName: "Терапевтическая санация (лечение кариеса 1.6 и пульпита 3.6)",
				completionPercentage: 50,
				autoArchived: false,
			})
			.onConflictDoNothing();
	}

	// 6. Сеем заказ в зуботехническую лабораторию (ЗТЛ)
	let createdLabOrderId: string | undefined;
	const [createdLabOrder] = await tx
		.insert(labOrders)
		.values({
			...(isCanonicalDemoOrg ? { id: DEMO_LAB_ORDER_1_ID } : {}),
			organizationId,
			patientId: p1.id,
			doctorId: orthopedistUserId,
			doctorName: "Д-р Орлов А. В.",
			secureToken: `ztl-token-${organizationId.slice(0, 8)}-p1`,
			toothFdi: "11",
			material: "Диоксид циркония (ZrO2 Prettau)",
			colorVita: "A2",
			status: "in_progress",
			dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
			clinicalNotes:
				"Одиночная анатомическая коронка ZrO2 Prettau на зуб 11. Культя витальная, расцветка культи ND2. Высокая прозрачность эмалевого края.",
			labComments: "3D CAD-моделирование утверждено. Каркас отфрезерован, передан на синтеризацию.",
			priceRub: 14500,
			isLockedInstalled: false,
			sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
		})
		.onConflictDoNothing()
		.returning({ id: labOrders.id });

	const targetLabOrderId = createdLabOrder?.id ?? (isCanonicalDemoOrg ? DEMO_LAB_ORDER_1_ID : undefined);
	if (targetLabOrderId) {
		createdLabOrderId = targetLabOrderId;

		// Добавляем позицию в наряд (lab_items)
		await tx
			.insert(labItems)
			.values({
				organizationId,
				labOrderId: targetLabOrderId,
				toothFdi: 11,
				restorationType: "crown_monolithic",
				material: "zirconia_multilayer_gradient",
				shadeSystem: "VITA_CLASSICAL",
				shadeFinal: "A2",
				shadeStump: "ND2",
				translucencyLevel: "HT",
				cementGapMicrons: 30,
				priceRub: "14500.00",
			})
			.onConflictDoNothing();

		// Добавляем этапы прохождения заказа (lab_order_events)
		await tx
			.insert(labOrderEvents)
			.values([
				{
					organizationId,
					labOrderId: targetLabOrderId,
					milestone: "impression_received",
					actorType: "dental_lab",
					actorName: "ЗТЛ Дентал-Мастер (техник Сидоров)",
					notes: "Интраоральный скан STL принят в работу, краевое прилегание четкое.",
				},
				{
					organizationId,
					labOrderId: targetLabOrderId,
					milestone: "cad_design_ready",
					actorType: "dental_lab",
					actorName: "ЗТЛ Дентал-Мастер",
					notes: "Виртуальное моделирование окклюзии в exocad завершено.",
				},
				{
					organizationId,
					labOrderId: targetLabOrderId,
					milestone: "milling_in_progress",
					actorType: "dental_lab",
					actorName: "Фрезерный центр VHF",
					notes: "Фрезерование циркониевого диска Katana Zirconia UTML.",
				},
			])
			.onConflictDoNothing();
	}

	// 7. Сеем основной склад клиники и медикаменты партионного учета (FEFO)
	const [mainWarehouse] = await tx
		.insert(warehouses)
		.values({
			...(isCanonicalDemoOrg ? { id: DEMO_WAREHOUSE_ID } : {}),
			organizationId,
			name: "Основной склад клиники",
			code: "MAIN",
			isDefault: true,
			status: "active",
		})
		.onConflictDoNothing()
		.returning({ id: warehouses.id });

	const warehouseId = mainWarehouse?.id ?? (isCanonicalDemoOrg ? DEMO_WAREHOUSE_ID : null);

	const demoItemsToInsert = [
		{
			organizationId,
			name: "Артикаин 4% с эпинефрином 1:200 000 (INPUL 1.7 мл, карпулы)",
			category: "anesthesia",
			unit: "карп",
			currentQty: "50.000",
			stockQuantity: "50.000",
			minQty: "10.000",
			pricePerUnit: "120.00",
			unitCostRub: "120.00",
			lotNumber: "ART-2026-01",
			expirationDate: "2028-12-31",
			batchNumber: "ART-2026-01",
			batchQty: "50.000",
		},
		{
			organizationId,
			name: "Наногибридный композит Ceram.x Spectra ST A2 (шприц 3 г)",
			category: "material",
			unit: "шпр",
			currentQty: "10.000",
			stockQuantity: "10.000",
			minQty: "2.000",
			pricePerUnit: "3500.00",
			unitCostRub: "3500.00",
			lotNumber: "CXS-9842",
			expirationDate: "2027-10-15",
			batchNumber: "CXS-9842",
			batchQty: "10.000",
		},
		{
			organizationId,
			name: "Иглы стоматологические карпульные 0.3 x 25 мм",
			category: "material",
			unit: "шт",
			currentQty: "100.000",
			stockQuantity: "100.000",
			minQty: "20.000",
			pricePerUnit: "15.00",
			unitCostRub: "15.00",
			lotNumber: "NDL-441",
			expirationDate: "2029-01-01",
			batchNumber: "NDL-441",
			batchQty: "100.000",
		},
		{
			organizationId,
			name: "Адгезивная система OptiBond FL (набор 8 мл)",
			category: "material",
			unit: "уп",
			currentQty: "5.000",
			stockQuantity: "5.000",
			minQty: "1.000",
			pricePerUnit: "6800.00",
			unitCostRub: "6800.00",
			lotNumber: "OBF-772",
			expirationDate: "2027-06-30",
			batchNumber: "OBF-772",
			batchQty: "5.000",
		},
		{
			organizationId,
			name: "Шовный материал Vicryl 4-0 с иглой 16 мм",
			category: "material",
			unit: "шт",
			currentQty: "20.000",
			stockQuantity: "20.000",
			minQty: "5.000",
			pricePerUnit: "380.00",
			unitCostRub: "380.00",
			lotNumber: "VCR-2026",
			expirationDate: "2028-05-30",
			batchNumber: "VCR-2026",
			batchQty: "20.000",
		},
		{
			organizationId,
			name: "Дентальный имплантат Straumann BLX 4.5 x 10 мм Roxolid",
			category: "implant",
			unit: "шт",
			currentQty: "4.000",
			stockQuantity: "4.000",
			minQty: "1.000",
			pricePerUnit: "24500.00",
			unitCostRub: "24500.00",
			lotNumber: "STR-8812",
			expirationDate: "2030-01-01",
			batchNumber: "STR-8812",
			batchQty: "4.000",
		},
	];

	for (const itemData of demoItemsToInsert) {
		const [createdItem] = await tx
			.insert(inventoryItems)
			.values({
				organizationId,
				name: itemData.name,
				category: itemData.category,
				unit: itemData.unit,
				currentQty: itemData.currentQty,
				stockQuantity: itemData.stockQuantity,
				minQty: itemData.minQty,
				pricePerUnit: itemData.pricePerUnit,
				unitCostRub: itemData.unitCostRub,
				lotNumber: itemData.lotNumber,
				expirationDate: itemData.expirationDate,
			})
			.onConflictDoNothing()
			.returning({ id: inventoryItems.id });

		if (createdItem && warehouseId) {
			await tx
				.insert(stockBatches)
				.values({
					organizationId,
					warehouseId,
					inventoryItemId: createdItem.id,
					batchNumber: itemData.batchNumber,
					expirationDate: itemData.expirationDate,
					initialQty: itemData.batchQty,
					remainingQty: itemData.batchQty,
					purchasePricePerUnit: itemData.unitCostRub,
					status: "active",
				})
				.onConflictDoNothing();
		}
	}

	// 8. Сеем лиды и входящие заявки (crm_leads)
	const demoLeadsToInsert = [
		{
			organizationId,
			name: "Ковалев Роман Викторович",
			patientName: "Ковалев Роман Викторович",
			phone: "+7 (905) 123-45-67",
			source: "Яндекс.Директ (Имплантация)",
			status: "new",
			expectedRevenue: "180000.00",
			priority: "high",
			clinicalTags: ["all-on-4", "имплантация"],
			notes: "Интересуется тотальной реабилитацией All-on-4. Запрос на консультацию хирурга.",
		},
		{
			organizationId,
			name: "Васильева Ольга Николаевна",
			patientName: "Васильева Ольга Николаевна",
			phone: "+7 (916) 987-65-43",
			source: "Яндекс.Карты",
			status: "contacted",
			expectedRevenue: "12000.00",
			priority: "normal",
			clinicalTags: ["терапия", "гигиена"],
			notes: "Звонила по поводу профгигиены AirFlow и осмотра терапевта.",
		},
		{
			organizationId,
			name: "Попов Михаил Андреевич",
			patientName: "Попов Михаил Андреевич",
			phone: "+7 (926) 345-67-89",
			source: "Рекомендация пациента",
			status: "consultation_scheduled",
			expectedRevenue: "45000.00",
			priority: "normal",
			clinicalTags: ["ортопедия", "цирконий"],
			notes: "Записан на консультацию к ортопеду по протезированию передних зубов.",
		},
		{
			organizationId,
			name: "Федорова Татьяна Сергеевна",
			patientName: "Федорова Татьяна Сергеевна",
			phone: "+7 (903) 765-43-21",
			source: "Telegram-бот",
			status: "converted",
			expectedRevenue: "210000.00",
			priority: "high",
			clinicalTags: ["ортодонтия", "элайнеры"],
			notes: "Заключен договор на ортодонтическое лечение элайнерами.",
		},
	];

	const insertedLeads = await tx
		.insert(crmLeads)
		.values(demoLeadsToInsert)
		.onConflictDoNothing()
		.returning({ id: crmLeads.id });

	return {
		patientIds: allPatients.map((p) => p.id),
		appointmentIds: insertedAppointments.map((a) => a.id),
		visitId: createdVisitId,
		treatmentPlanId: createdPlan?.id,
		labOrderId: createdLabOrderId,
		warehouseId: warehouseId ?? undefined,
		leadIds: insertedLeads.map((l) => l.id),
	};
}

// ─── Полная инициализация постоянного демонстрационного тенанта ───────────────────

export interface EnsureDemoShowcaseResult {
	alreadyExisted: boolean;
	organizationId: string;
	clinicId: string;
	chairsCount: number;
	staffCount: number;
	patientsCount: number;
	appointmentsCount: number;
	labOrderId?: string | undefined;
	warehouseId?: string | undefined;
	leadsCount: number;
}

/**
 * Идемпотентный механизм обеспечения существования полного демонстрационного
 * тенанта (DEMO_SHOWCASE_ORG_ID = '01a00000-0000-0000-0000-000000000000') в PostgreSQL.
 *
 * Если организация уже существует и forceReset === false — завершается мгновенно.
 * Если forceReset === true — очищает строки только демо-тенанта и засевает заново.
 */
export async function ensureDemoShowcaseTenant(
	dbInstance?: DbTx,
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
					await tx.execute(sql.raw(`DELETE FROM "${tbl}" WHERE organization_id = '${DEMO_SHOWCASE_ORG_ID}'::uuid`));
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
