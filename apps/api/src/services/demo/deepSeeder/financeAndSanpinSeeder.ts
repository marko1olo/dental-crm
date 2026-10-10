/**
 * financeAndSanpinSeeder.ts — ZTL Dental Lab Orders, FEFO Warehouse Inventory, and CRM Leads (Layer 1).
 */

import {
	crmLeads,
	inventoryItems,
	labItems,
	labOrderEvents,
	labOrders,
	stockBatches,
	warehouses,
} from "../../../db/schema.js";
import {
	type DbTx,
	DEMO_LAB_ORDER_1_ID,
	DEMO_SHOWCASE_ORG_ID,
	DEMO_WAREHOUSE_ID,
} from "./types.js";

/**
 * Засевает наряд-заказ в зуботехническую лабораторию (ЗТЛ), спецификацию изделия и трекинг-события.
 */
export async function seedLabOrders(
	tx: DbTx,
	organizationId: string,
	p1Id: string,
	orthopedistUserId: string,
): Promise<string | undefined> {
	const isCanonicalDemoOrg = organizationId === DEMO_SHOWCASE_ORG_ID;

	const [createdLabOrder] = await tx
		.insert(labOrders)
		.values({
			...(isCanonicalDemoOrg ? { id: DEMO_LAB_ORDER_1_ID } : {}),
			organizationId,
			patientId: p1Id,
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

	const targetLabOrderId =
		createdLabOrder?.id ?? (isCanonicalDemoOrg ? DEMO_LAB_ORDER_1_ID : undefined);

	if (targetLabOrderId) {
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

	return targetLabOrderId;
}

/**
 * Засевает основной склад клиники, номенклатуру материалов и партии партионного учета (FEFO).
 */
export async function seedWarehouseAndInventory(
	tx: DbTx,
	organizationId: string,
): Promise<string | undefined> {
	const isCanonicalDemoOrg = organizationId === DEMO_SHOWCASE_ORG_ID;

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

	return warehouseId ?? undefined;
}

/**
 * Засевает демо-лиды и входящие заявки CRM с источниками и ожидаемой выручкой.
 */
export async function seedCrmLeads(
	tx: DbTx,
	organizationId: string,
): Promise<Array<{ id: string }>> {
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

	return insertedLeads;
}
