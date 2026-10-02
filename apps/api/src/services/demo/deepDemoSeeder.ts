/**
 * deepDemoSeeder.ts — Глубокая клиническая инициализация демонстрационной клиники (МАНДАТ 8y, 8n).
 *
 * Сеет полноценный клинический контекст:
 * 1. 4 пациента с реалистичными анамнезами и контактами.
 * 2. 4 записи в расписании (на сегодня и завтра) с привязкой к креслу и врачу.
 * 3. Зубная формула (одонтограмма) пациента: кариес 16 (MOD), пломба 24 (O), пульпит 36 (MO), адентия третьих моляров (18, 28, 38, 48).
 * 4. Завершенный визит и протокол амбулаторного приема (Форма 043/у) SOAP: жалобы, анамнез, статус локалис, протокол лечения.
 * 5. Утвержденный комплексный план лечения (смета) с этапами.
 * 6. Основной склад клиники с медикаментами и расходниками (Артикаин 4%, композит Ceram.x Spectra ST, иглы, OptiBond FL)
 *    с активными сериями партионного учета FEFO (срок годности, номер партии).
 */

import type { db } from "../../db/client.js";
import type { TenantDb } from "../../db/rls.js";
import {
	appointments,
	inventoryItems,
	patients,
	stockBatches,
	toothStates,
	treatmentPlans,
	treatmentPlanStages,
	visitDiaries,
	visits,
	warehouses,
} from "../../db/schema.js";

export type DbTx =
	| Parameters<Parameters<typeof db.transaction>[0]>[0]
	| TenantDb;

export interface SeedDeepDemoDataParams {
	readonly organizationId: string;
	readonly doctorUserId: string;
	readonly primaryChairId: string;
}

export async function seedDeepDemoData(
	tx: DbTx,
	params: SeedDeepDemoDataParams,
): Promise<{
	patientIds: string[];
	appointmentIds: string[];
	visitId?: string | undefined;
	treatmentPlanId?: string | undefined;
}> {
	const { organizationId, doctorUserId, primaryChairId } = params;

	// 1. Создаем 4 демо-пациента
	const demoPatientsList = [
		{
			organizationId,
			fullName: "Иванов Алексей Сергеевич",
			phone: "+7 (912) 345-67-89",
			birthDate: "1988-04-12",
			notes: "Первичный осмотр, жалоба на чувствительность 2.4",
			status: "active" as const,
		},
		{
			organizationId,
			fullName: "Смирнова Елена Викторовна",
			phone: "+7 (927) 876-54-32",
			birthDate: "1994-09-23",
			notes: "Профгигиена AirFlow и ремотерапия",
			status: "active" as const,
		},
		{
			organizationId,
			fullName: "Кузнецов Дмитрий Павлович",
			phone: "+7 (903) 555-43-21",
			birthDate: "1979-11-05",
			notes: "Лечение кариеса 3.6, анестезия артикаин",
			status: "active" as const,
		},
		{
			organizationId,
			fullName: "Морозова Анна Дмитриевна",
			phone: "+7 (987) 654-32-10",
			birthDate: "2001-02-18",
			notes: "Консультация ортодонта, слепки",
			status: "active" as const,
		},
	];

	const insertedPatients = await tx
		.insert(patients)
		.values(demoPatientsList)
		.returning({ id: patients.id, fullName: patients.fullName });

	const [p0, p1, p2, p3] = insertedPatients;
	if (!p0 || !p1 || !p2 || !p3) {
		return { patientIds: [], appointmentIds: [] };
	}

	// 2. Создаем 4 приема в расписании (на сегодня и завтра)
	const now = new Date();
	const today10 = new Date(now);
	today10.setHours(10, 0, 0, 0);
	const today1045 = new Date(today10.getTime() + 45 * 60 * 1000);

	const today12 = new Date(now);
	today12.setHours(12, 0, 0, 0);
	const today13 = new Date(today12.getTime() + 60 * 60 * 1000);

	const today1530 = new Date(now);
	today1530.setHours(15, 30, 0, 0);
	const today1600 = new Date(today1530.getTime() + 30 * 60 * 1000);

	const tomorrow11 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	tomorrow11.setHours(11, 0, 0, 0);
	const tomorrow12 = new Date(tomorrow11.getTime() + 60 * 60 * 1000);

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
				reason: "Консультация и диагностика",
				comment: "Демо-запись: первичный приём завершен",
			},
			{
				organizationId,
				patientId: p1.id,
				doctorUserId,
				chairId: primaryChairId,
				status: "planned",
				startsAt: today12,
				endsAt: today13,
				reason: "Профессиональная гигиена",
				comment: "Демо-запись: плановый визит",
			},
			{
				organizationId,
				patientId: p2.id,
				doctorUserId,
				chairId: primaryChairId,
				status: "planned",
				startsAt: today1530,
				endsAt: today1600,
				reason: "Лечение кариеса",
				comment: "Демо-запись: зуб 3.6",
			},
			{
				organizationId,
				patientId: p3.id,
				doctorUserId,
				chairId: primaryChairId,
				status: "planned",
				startsAt: tomorrow11,
				endsAt: tomorrow12,
				reason: "Ортодонтический приём",
				comment: "Демо-запись: контрольный осмотр",
			},
		])
		.returning({ id: appointments.id });

	const [app0] = insertedAppointments;

	// 3. Сеем зубную формулу (одонтограмму) для пациента p0 (Иванов А. С.)
	await tx.insert(toothStates).values([
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
	]);

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
			.returning({ id: visits.id });

		if (createdVisit) {
			createdVisitId = createdVisit.id;
			await tx.insert(visitDiaries).values({
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
			});
		}
	}

	// 5. Сеем утвержденный план лечения для пациента p0
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
		.returning({ id: treatmentPlans.id, title: treatmentPlans.title });

	if (createdPlan) {
		await tx.insert(treatmentPlanStages).values({
			organizationId,
			patientName: p0.fullName,
			planTitle: createdPlan.title,
			stageOrder: 1,
			stageName: "Терапевтическая санация (лечение кариеса 1.6 и пульпита 3.6)",
			completionPercentage: 50,
			autoArchived: false,
		});
	}

	// 6. Сеем основной склад клиники и медикаменты партионного учета (FEFO)
	const [mainWarehouse] = await tx
		.insert(warehouses)
		.values({
			organizationId,
			name: "Основной склад клиники",
			code: "MAIN",
			isDefault: true,
			status: "active",
		})
		.returning({ id: warehouses.id });

	const warehouseId = mainWarehouse?.id ?? null;

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
			.returning({ id: inventoryItems.id });

		if (createdItem && warehouseId) {
			await tx.insert(stockBatches).values({
				organizationId,
				warehouseId,
				inventoryItemId: createdItem.id,
				batchNumber: itemData.batchNumber,
				expirationDate: itemData.expirationDate,
				initialQty: itemData.batchQty,
				remainingQty: itemData.batchQty,
				purchasePricePerUnit: itemData.unitCostRub,
				status: "active",
			});
		}
	}

	return {
		patientIds: insertedPatients.map((p) => p.id),
		appointmentIds: insertedAppointments.map((a) => a.id),
		visitId: createdVisitId,
		treatmentPlanId: createdPlan?.id,
	};
}
