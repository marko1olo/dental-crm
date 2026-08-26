/**
 * defaultBomSeeds.ts — Эталонные технологические карты (BOM) расхода стоматологических материалов
 * по приказу Минздрава РФ № 804н и СанПиН 3.3686-21.
 *
 * ФУНКЦИОНАЛ:
 * 1. Нормативный справочник дефолтных техкарт для основных процедур:
 *    - Пломбирование светоотверждаемым композитом (A16.07.002.001)
 *    - Эндодонтия 1-канальная: мехобработка (A16.07.030.001) и обтурация (A16.07.008.001)
 *    - Эндодонтия 3-канальная: мехобработка (A16.07.030.003) и обтурация (A16.07.008.003)
 *    - Хирургическое удаление зуба (A16.07.001.001)
 *    - Профессиональная гигиена Air-Flow + УЗ (A16.07.051)
 *    - Дентальная имплантация (A16.07.054)
 * 2. Идемпотентный сидер seedDefaultProcedureMaterialRules(organizationId),
 *    гарантирующий наличие необходимых услуг, номенклатуры склада и связей в procedure_material_rules.
 */

import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	inventoryItems,
	procedureMaterialRules,
	serviceCatalogItems,
} from "../../db/schema.js";

export interface DefaultBomMaterialSeed {
	readonly name: string;
	readonly category: string;
	readonly unit: string;
	readonly quantityToDeduct: number;
	readonly requiredQty?: number;
	readonly defaultUnitCostRub: number;
	readonly defaultStockQty: number;
	readonly criticalThreshold: number;
}

export interface DefaultBomProcedureSeed {
	readonly serviceCode: string;
	readonly serviceTitle: string;
	readonly serviceCategory: "consultation" | "therapy" | "surgery" | "prosthetics" | "orthodontics" | "periodontology" | "hygiene" | "imaging" | "documents" | "other";
	readonly specialty: "therapist" | "orthopedist" | "surgeon" | "orthodontist" | "periodontist" | "hygienist" | "pediatric" | "implantologist" | "radiologist" | "universal";
	readonly basePriceRub: number;
	readonly durationMinutes: number;
	readonly materials: readonly DefaultBomMaterialSeed[];
}

export const DEFAULT_804N_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	{
		serviceCode: "A16.07.002.001",
		serviceTitle: "Восстановление зуба пломбой (нанокомпозит светоотверждаемый)",
		serviceCategory: "therapy",
		specialty: "therapist",
		basePriceRub: 4500,
		durationMinutes: 45,
		materials: [
			{
				name: "Композит светоотверждаемый наногибридный Filtek Z250 / Estelite",
				category: "composite",
				unit: "г",
				quantityToDeduct: 0.35,
				defaultUnitCostRub: 1300, // 455 ₽ за 0.35 г
				defaultStockQty: 50,
				criticalThreshold: 5,
			},
			{
				name: "Адгезив самопротравливающий 7 пок. Single Bond Universal",
				category: "composite",
				unit: "мл",
				quantityToDeduct: 0.1,
				defaultUnitCostRub: 1800, // 180 ₽ за 0.1 мл
				defaultStockQty: 20,
				criticalThreshold: 2,
			},
			{
				name: "Гель травильный 37% ортофосфорная кислота",
				category: "composite",
				unit: "мл",
				quantityToDeduct: 0.2,
				defaultUnitCostRub: 175, // 35 ₽
				defaultStockQty: 30,
				criticalThreshold: 3,
			},
			{
				name: "Платок коффердама латексный Sanctuary Dental Dam",
				category: "ppe",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 115,
				defaultStockQty: 100,
				criticalThreshold: 10,
			},
			{
				name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 1.7 мл",
				category: "anesthesia",
				unit: "карп.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 220,
				defaultStockQty: 150,
				criticalThreshold: 20,
			},
			{
				name: "Игла карпульная 30G евростандарт 25 мм",
				category: "anesthesia",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 28,
				defaultStockQty: 200,
				criticalThreshold: 30,
			},
			{
				name: "Перчатки нитриловые неопудренные (пара)",
				category: "ppe",
				unit: "пары",
				quantityToDeduct: 2,
				defaultUnitCostRub: 35,
				defaultStockQty: 500,
				criticalThreshold: 50,
			},
			{
				name: "Слюноотсос одноразовый с гибким наконечником",
				category: "ppe",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 12.5,
				defaultStockQty: 300,
				criticalThreshold: 30,
			},
		],
	},
	{
		serviceCode: "A16.07.030.001",
		serviceTitle: "Инструментальная и медикаментозная обработка корневого канала (1-канальный зуб)",
		serviceCategory: "therapy",
		specialty: "therapist",
		basePriceRub: 3500,
		durationMinutes: 40,
		materials: [
			{
				name: "Раствор натрия гипохлорита 3% для ирригации",
				category: "endo",
				unit: "мл",
				quantityToDeduct: 15,
				defaultUnitCostRub: 8, // 120 ₽
				defaultStockQty: 1000,
				criticalThreshold: 100,
			},
			{
				name: "Гель ЭДТА 17% для химического расширения каналов",
				category: "endo",
				unit: "мл",
				quantityToDeduct: 0.5,
				defaultUnitCostRub: 240, // 120 ₽
				defaultStockQty: 50,
				criticalThreshold: 5,
			},
			{
				name: "Эндолубрикант водорастворимый RC-Prep",
				category: "endo",
				unit: "мл",
				quantityToDeduct: 0.5,
				defaultUnitCostRub: 190, // 95 ₽
				defaultStockQty: 40,
				criticalThreshold: 5,
			},
			{
				name: "Машинный Ni-Ti ротационный файл ProTaper / WaveOne",
				category: "endo",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 850,
				defaultStockQty: 60,
				criticalThreshold: 10,
			},
			{
				name: "Штифты бумажные абсорбирующие стерильные (пины)",
				category: "endo",
				unit: "шт.",
				quantityToDeduct: 3,
				defaultUnitCostRub: 15,
				defaultStockQty: 400,
				criticalThreshold: 50,
			},
			{
				name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 1.7 мл",
				category: "anesthesia",
				unit: "карп.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 220,
				defaultStockQty: 150,
				criticalThreshold: 20,
			},
			{
				name: "Перчатки нитриловые неопудренные (пара)",
				category: "ppe",
				unit: "пары",
				quantityToDeduct: 2,
				defaultUnitCostRub: 35,
				defaultStockQty: 500,
				criticalThreshold: 50,
			},
		],
	},
	{
		serviceCode: "A16.07.008.001",
		serviceTitle: "Пломбирование корневого канала зуба гуттаперчей (1 канал)",
		serviceCategory: "therapy",
		specialty: "therapist",
		basePriceRub: 4000,
		durationMinutes: 30,
		materials: [
			{
				name: "Эпоксидный силер для постоянной обтурации AH Plus (Dentsply)",
				category: "endo",
				unit: "г",
				quantityToDeduct: 0.1,
				defaultUnitCostRub: 4800, // 480 ₽ за 0.1 г
				defaultStockQty: 20,
				criticalThreshold: 2,
			},
			{
				name: "Гуттаперчевые конусные штифты 0.04/0.06 калиброванные",
				category: "endo",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 60,
				defaultStockQty: 300,
				criticalThreshold: 30,
			},
			{
				name: "Штифты бумажные абсорбирующие стерильные (пины)",
				category: "endo",
				unit: "шт.",
				quantityToDeduct: 3,
				defaultUnitCostRub: 15,
				defaultStockQty: 400,
				criticalThreshold: 50,
			},
			{
				name: "Перчатки нитриловые неопудренные (пара)",
				category: "ppe",
				unit: "пары",
				quantityToDeduct: 2,
				defaultUnitCostRub: 35,
				defaultStockQty: 500,
				criticalThreshold: 50,
			},
		],
	},
	{
		serviceCode: "A16.07.030.003",
		serviceTitle: "Инструментальная и медикаментозная обработка корневых каналов (3-канальный зуб)",
		serviceCategory: "therapy",
		specialty: "therapist",
		basePriceRub: 8200,
		durationMinutes: 60,
		materials: [
			{
				name: "Раствор натрия гипохлорита 3% для ирригации",
				category: "endo",
				unit: "мл",
				quantityToDeduct: 30,
				defaultUnitCostRub: 8, // 240 ₽
				defaultStockQty: 1000,
				criticalThreshold: 100,
			},
			{
				name: "Гель ЭДТА 17% для химического расширения каналов",
				category: "endo",
				unit: "мл",
				quantityToDeduct: 1.5,
				defaultUnitCostRub: 240, // 360 ₽
				defaultStockQty: 50,
				criticalThreshold: 5,
			},
			{
				name: "Эндолубрикант водорастворимый RC-Prep",
				category: "endo",
				unit: "мл",
				quantityToDeduct: 1.0,
				defaultUnitCostRub: 190, // 190 ₽
				defaultStockQty: 40,
				criticalThreshold: 5,
			},
			{
				name: "Машинный Ni-Ti ротационный файл ProTaper / WaveOne",
				category: "endo",
				unit: "шт.",
				quantityToDeduct: 2,
				defaultUnitCostRub: 850, // 1700 ₽
				defaultStockQty: 60,
				criticalThreshold: 10,
			},
			{
				name: "Штифты бумажные абсорбирующие стерильные (пины)",
				category: "endo",
				unit: "шт.",
				quantityToDeduct: 9,
				defaultUnitCostRub: 15, // 135 ₽
				defaultStockQty: 400,
				criticalThreshold: 50,
			},
			{
				name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 1.7 мл",
				category: "anesthesia",
				unit: "карп.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 220,
				defaultStockQty: 150,
				criticalThreshold: 20,
			},
			{
				name: "Перчатки нитриловые неопудренные (пара)",
				category: "ppe",
				unit: "пары",
				quantityToDeduct: 2,
				defaultUnitCostRub: 35,
				defaultStockQty: 500,
				criticalThreshold: 50,
			},
		],
	},
	{
		serviceCode: "A16.07.008.003",
		serviceTitle: "Пломбирование корневых каналов трехканального зуба (3 канала)",
		serviceCategory: "therapy",
		specialty: "therapist",
		basePriceRub: 9500,
		durationMinutes: 45,
		materials: [
			{
				name: "Эпоксидный силер для постоянной обтурации AH Plus (Dentsply)",
				category: "endo",
				unit: "г",
				quantityToDeduct: 0.3,
				defaultUnitCostRub: 4800, // 1440 ₽ за 0.3 г
				defaultStockQty: 20,
				criticalThreshold: 2,
			},
			{
				name: "Гуттаперчевые конусные штифты 0.04/0.06 калиброванные",
				category: "endo",
				unit: "шт.",
				quantityToDeduct: 3,
				defaultUnitCostRub: 60, // 180 ₽
				defaultStockQty: 300,
				criticalThreshold: 30,
			},
			{
				name: "Штифты бумажные абсорбирующие стерильные (пины)",
				category: "endo",
				unit: "шт.",
				quantityToDeduct: 9,
				defaultUnitCostRub: 15, // 135 ₽
				defaultStockQty: 400,
				criticalThreshold: 50,
			},
			{
				name: "Перчатки нитриловые неопудренные (пара)",
				category: "ppe",
				unit: "пары",
				quantityToDeduct: 2,
				defaultUnitCostRub: 35,
				defaultStockQty: 500,
				criticalThreshold: 50,
			},
		],
	},
	{
		serviceCode: "A16.07.001.001",
		serviceTitle: "Удаление постоянного зуба (простое / сложное)",
		serviceCategory: "surgery",
		specialty: "surgeon",
		basePriceRub: 3500,
		durationMinutes: 30,
		materials: [
			{
				name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 1.7 мл",
				category: "anesthesia",
				unit: "карп.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 220,
				defaultStockQty: 150,
				criticalThreshold: 20,
			},
			{
				name: "Игла карпульная 30G евростандарт 25 мм",
				category: "anesthesia",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 28,
				defaultStockQty: 200,
				criticalThreshold: 30,
			},
			{
				name: "Гемостатическая коллагеновая губка Альвостаз / Parasorb Cone",
				category: "surgery",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 310,
				defaultStockQty: 50,
				criticalThreshold: 10,
			},
			{
				name: "Шовный материал монофиламентный PTFE / Пролен 4-0",
				category: "surgery",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 340,
				defaultStockQty: 50,
				criticalThreshold: 10,
			},
			{
				name: "Микрохирургическое лезвие №15C Swann-Morton стерильное",
				category: "surgery",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 85,
				defaultStockQty: 100,
				criticalThreshold: 15,
			},
			{
				name: "Перчатки нитриловые неопудренные (пара)",
				category: "ppe",
				unit: "пары",
				quantityToDeduct: 2,
				defaultUnitCostRub: 35,
				defaultStockQty: 500,
				criticalThreshold: 50,
			},
			{
				name: "Салфетка нагрудная двухслойная водонепроницаемая",
				category: "ppe",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 18,
				defaultStockQty: 300,
				criticalThreshold: 30,
			},
		],
	},
	{
		serviceCode: "A16.07.051",
		serviceTitle: "Профессиональная гигиена полости рта и зубов (Air-Flow + УЗ)",
		serviceCategory: "hygiene",
		specialty: "hygienist",
		basePriceRub: 5500,
		durationMinutes: 50,
		materials: [
			{
				name: "Порошок Air-Flow глициновый мелкодисперсный EMS Plus",
				category: "hygiene",
				unit: "г",
				quantityToDeduct: 25,
				defaultUnitCostRub: 18, // 450 ₽
				defaultStockQty: 500,
				criticalThreshold: 50,
			},
			{
				name: "Полировочная паста Cleanic / Detartrine",
				category: "hygiene",
				unit: "г",
				quantityToDeduct: 3,
				defaultUnitCostRub: 40, // 120 ₽
				defaultStockQty: 100,
				criticalThreshold: 10,
			},
			{
				name: "Щетка полировочная циркулярная нейлоновая",
				category: "hygiene",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 65,
				defaultStockQty: 100,
				criticalThreshold: 10,
			},
			{
				name: "Ретрактор мягкий OptraGate (Ivoclar)",
				category: "hygiene",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 210,
				defaultStockQty: 80,
				criticalThreshold: 10,
			},
			{
				name: "Фторлак защитный Clinpro White Varnish",
				category: "hygiene",
				unit: "мл",
				quantityToDeduct: 0.5,
				defaultUnitCostRub: 640, // 320 ₽
				defaultStockQty: 30,
				criticalThreshold: 5,
			},
			{
				name: "Слюноотсос одноразовый с гибким наконечником",
				category: "ppe",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 12.5,
				defaultStockQty: 300,
				criticalThreshold: 30,
			},
			{
				name: "Перчатки нитриловые неопудренные (пара)",
				category: "ppe",
				unit: "пары",
				quantityToDeduct: 2,
				defaultUnitCostRub: 35,
				defaultStockQty: 500,
				criticalThreshold: 50,
			},
		],
	},
	{
		serviceCode: "A16.07.054",
		serviceTitle: "Внутрикостная дентальная имплантация (установка имплантата)",
		serviceCategory: "surgery",
		specialty: "surgeon",
		basePriceRub: 35000,
		durationMinutes: 60,
		materials: [
			{
				name: "Стерильный операционный набор СИЗ хирурга и ассистента",
				category: "ppe",
				unit: "компл.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 950,
				defaultStockQty: 30,
				criticalThreshold: 5,
			},
			{
				name: "Шовный материал монофиламентный PTFE / Пролен 5-0",
				category: "surgery",
				unit: "шт.",
				quantityToDeduct: 2,
				defaultUnitCostRub: 360,
				defaultStockQty: 50,
				criticalThreshold: 10,
			},
			{
				name: "Физиологический раствор стерильный 0.9% 500 мл",
				category: "surgery",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 140,
				defaultStockQty: 60,
				criticalThreshold: 10,
			},
			{
				name: "Микрохирургическое лезвие №15C Swann-Morton стерильное",
				category: "surgery",
				unit: "шт.",
				quantityToDeduct: 2,
				defaultUnitCostRub: 85,
				defaultStockQty: 100,
				criticalThreshold: 15,
			},
			{
				name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 1.7 мл",
				category: "anesthesia",
				unit: "карп.",
				quantityToDeduct: 2,
				defaultUnitCostRub: 220,
				defaultStockQty: 150,
				criticalThreshold: 20,
			},
			{
				name: "Игла карпульная 30G евростандарт 25 мм",
				category: "anesthesia",
				unit: "шт.",
				quantityToDeduct: 2,
				defaultUnitCostRub: 28,
				defaultStockQty: 200,
				criticalThreshold: 30,
			},
		],
	},
];

export interface SeedDefaultBomResult {
	readonly createdServicesCount: number;
	readonly createdItemsCount: number;
	readonly createdRulesCount: number;
	readonly totalRulesCount: number;
}

/**
 * Идемпотентно засевает дефолтные технологические карты (BOM) для клиники.
 */
export async function seedDefaultProcedureMaterialRules(
	organizationId: string,
): Promise<SeedDefaultBomResult> {
	let createdServicesCount = 0;
	let createdItemsCount = 0;
	let createdRulesCount = 0;

	// 1. Загружаем все существующие услуги клиники
	const existingServices = await db
		.select()
		.from(serviceCatalogItems)
		.where(eq(serviceCatalogItems.organizationId, organizationId));

	const serviceMap = new Map<string, typeof serviceCatalogItems.$inferSelect>();
	for (const s of existingServices) {
		if (s.code) serviceMap.set(s.code.trim(), s);
	}

	// 2. Загружаем все существующие материалы склада клиники
	const existingItems = await db
		.select()
		.from(inventoryItems)
		.where(eq(inventoryItems.organizationId, organizationId));

	const itemMap = new Map<string, typeof inventoryItems.$inferSelect>();
	for (const it of existingItems) {
		itemMap.set(it.name.toLowerCase().trim(), it);
	}

	// 3. Загружаем существующие правила списания
	const existingRules = await db
		.select()
		.from(procedureMaterialRules)
		.where(eq(procedureMaterialRules.organizationId, organizationId));

	const ruleSet = new Set<string>();
	for (const r of existingRules) {
		if (r.serviceId && r.inventoryItemId) {
			ruleSet.add(`${r.serviceId}:${r.inventoryItemId}`);
		}
	}

	// 4. Проходим по каждому шаблону техкарты
	for (const proto of DEFAULT_804N_BOM_SEEDS) {
		let service = serviceMap.get(proto.serviceCode);

		// Если услуги с таким 804н кодом нет, создаём её
		if (!service) {
			const [newService] = await db
				.insert(serviceCatalogItems)
				.values({
					organizationId,
					code: proto.serviceCode,
					title: proto.serviceTitle,
					category: proto.serviceCategory,
					specialty: proto.specialty,
					basePriceRub: proto.basePriceRub,
					priceRub: proto.basePriceRub,
					durationMinutes: proto.durationMinutes,
					taxDeductible: true,
					order804nCode: proto.serviceCode,
					isActive: true,
				})
				.returning();

			if (newService) {
				service = newService;
				serviceMap.set(proto.serviceCode, newService);
				createdServicesCount++;
			}
		}

		if (!service) continue;

		for (const mat of proto.materials) {
			const matKey = mat.name.toLowerCase().trim();
			let item = itemMap.get(matKey);

			// Если расходника нет на складе, создаём его с базовыми параметрами
			if (!item) {
				const [newItem] = await db
					.insert(inventoryItems)
					.values({
						organizationId,
						name: mat.name,
						category: mat.category,
						unit: mat.unit,
						unitCostRub: String(mat.defaultUnitCostRub),
						stockQuantity: String(mat.defaultStockQty),
						currentQty: String(mat.defaultStockQty),
						criticalThreshold: String(mat.criticalThreshold),
					})
					.returning();

				if (newItem) {
					item = newItem;
					itemMap.set(matKey, newItem);
					createdItemsCount++;
				}
			}

			if (!item) continue;

			// Если правило ещё не создано, вставляем его
			const ruleKey = `${service.id}:${item.id}`;
			if (!ruleSet.has(ruleKey)) {
				const [newRule] = await db
					.insert(procedureMaterialRules)
					.values({
						organizationId,
						serviceId: service.id,
						inventoryItemId: item.id,
						serviceCode: proto.serviceCode,
						materialItemId: item.id,
						materialName: item.name,
						quantityToDeduct: String(mat.quantityToDeduct),
						requiredQty: String(mat.quantityToDeduct),
					})
					.returning();

				if (newRule) {
					ruleSet.add(ruleKey);
					createdRulesCount++;
				}
			}
		}
	}

	const totalRules = await db
		.select()
		.from(procedureMaterialRules)
		.where(eq(procedureMaterialRules.organizationId, organizationId));

	return {
		createdServicesCount,
		createdItemsCount,
		createdRulesCount,
		totalRulesCount: totalRules.length,
	};
}
