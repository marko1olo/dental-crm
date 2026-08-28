import { z } from "zod";

/**
 * ============================================================================
 * CLINICAL PROCEDURE BOM (BILL OF MATERIALS) & MATERIAL DEDUCTION ENGINE
 * Canonical 804n Nomenclature Technological Maps & Cabinet Stock Automation
 * ============================================================================
 */

/**
 * Supported clinical procedure categories for technological maps.
 */
export const procedureCategorySchema = z.enum([
	"therapy",
	"endo",
	"surgery",
	"implant",
	"hygiene",
	"ortho",
	"perio",
	"whitening",
]);

export type ProcedureCategory = z.infer<typeof procedureCategorySchema>;

/**
 * Unit of measurement for medical and dental consumables.
 */
export const consumableUnitSchema = z.enum([
	"pcs",       // штук
	"carpule",   // карпула (1.7 - 1.8 мл)
	"gram",      // грамм (композит)
	"ml",        // миллилитр (ирригация)
	"pack",      // упаковка / саше
	"tube",      // туба
	"dose",      // разовая доза
	"cm",        // сантиметр (лента, шовник)
]);

export type ConsumableUnit = z.infer<typeof consumableUnitSchema>;

/**
 * Zod schema for a single material item within a standard Procedure BOM.
 */
export const procedureBomItemSchema = z.object({
	sku: z.string().min(1),
	nameRu: z.string().min(1),
	category: z.string().min(1),
	standardQuantity: z.number().positive(),
	unitOfMeasure: consumableUnitSchema,
	estimatedUnitCostKopecks: z.number().int().nonnegative(),
	isOptional: z.boolean().default(false),
	description: z.string().optional(),
});

export type ProcedureBomItem = z.infer<typeof procedureBomItemSchema>;

/**
 * Zod schema for a complete Procedure BOM technological map.
 */
export const procedureBomMapSchema = z.object({
	code804n: z.string().min(1),
	procedureTitleRu: z.string().min(1),
	category: procedureCategorySchema,
	materials: z.array(procedureBomItemSchema),
	defaultDurationMinutes: z.number().int().positive().default(30),
});

export type ProcedureBomMap = z.infer<typeof procedureBomMapSchema>;

/**
 * Canonical Standard Technological Maps (BOM) for 804n Clinical Procedures.
 */
export const STANDARD_PROCEDURE_BOM_MAPS: Record<string, ProcedureBomMap> = {
	// 1. A16.07.002 — Восстановление зуба пломбой (Кариес / Пломбирование светоотверждаемым композитом)
	"A16.07.002": {
		code804n: "A16.07.002",
		procedureTitleRu: "Восстановление зуба пломбой с нанокомпозитом светового отверждения",
		category: "therapy",
		defaultDurationMinutes: 45,
		materials: [
			{
				sku: "MAT-ANES-01",
				nameRu: "Анестетик артикаиновый (Ультракаин Д-С 1:200 000, 1.7 мл)",
				category: "Анестезия",
				standardQuantity: 1,
				unitOfMeasure: "carpule",
				estimatedUnitCostKopecks: 14500, // 145.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-COMP-01",
				nameRu: "Светоотверждаемый нанокомпозит (Filtek Ultimate / Estelite Asteria)",
				category: "Пломбировочные материалы",
				standardQuantity: 0.2,
				unitOfMeasure: "gram",
				estimatedUnitCostKopecks: 38000, // 380.00 ₽ за 0.2г (1900 ₽/г)
				isOptional: false,
			},
			{
				sku: "MAT-MATR-01",
				nameRu: "Секционная матрица контурная металлизированная (Tor VM)",
				category: "Матричные системы",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 4500, // 45.00 ₽
				isOptional: false,
			},
		],
	},

	// 2. A16.07.030 — Эндодонтическое лечение (Пульпит / Инструментальная и медикаментозная обработка 1 канала)
	"A16.07.030": {
		code804n: "A16.07.030",
		procedureTitleRu: "Инструментальная и медикаментозная обработка корневого канала (1 канал)",
		category: "endo",
		defaultDurationMinutes: 60,
		materials: [
			{
				sku: "MAT-ANES-01",
				nameRu: "Анестетик артикаиновый (Ультракаин Д-С 1:200 000, 1.7 мл)",
				category: "Анестезия",
				standardQuantity: 1,
				unitOfMeasure: "carpule",
				estimatedUnitCostKopecks: 14500, // 145.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-COFF-01",
				nameRu: "Платок раббердама латексный / бессиликоновый (Sanctuary)",
				category: "Изоляция",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 9500, // 95.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-NITI-01",
				nameRu: "NiTi ротационный машинный файл (ProTaper Gold / WaveOne Gold)",
				category: "Эндодонтия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 65000, // 650.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-HYPO-01",
				nameRu: "Гипохлорит натрия 3% стабилизированный (шприц 5 мл с эндо-иглой)",
				category: "Ирригация",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 12000, // 120.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-SEAL-01",
				nameRu: "Эпоксидный силер для постоянной обтурации (AH Plus Jet, 0.2г)",
				category: "Эндодонтия",
				standardQuantity: 1,
				unitOfMeasure: "dose",
				estimatedUnitCostKopecks: 42000, // 420.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-GUTT-01",
				nameRu: "Гуттаперчевые конусные штифты калиброванные (3 шт)",
				category: "Эндодонтия",
				standardQuantity: 3,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 4500, // 45.00 ₽ (15 ₽/шт)
				isOptional: false,
			},
		],
	},

	// 3. A16.07.006 — Сложное удаление зуба (Хирургия)
	"A16.07.006": {
		code804n: "A16.07.006",
		procedureTitleRu: "Сложное удаление постоянного зуба с фрагментацией корней",
		category: "surgery",
		defaultDurationMinutes: 45,
		materials: [
			{
				sku: "MAT-ANES-01",
				nameRu: "Анестетик артикаиновый (Ультракаин Д-С Форте 1:100 000, 1.7 мл)",
				category: "Анестезия",
				standardQuantity: 2,
				unitOfMeasure: "carpule",
				estimatedUnitCostKopecks: 29000, // 290.00 ₽ (2 x 145)
				isOptional: false,
			},
			{
				sku: "MAT-SCALP-01",
				nameRu: "Лезвие скальпеля хирургическое стерильное (№ 15C Swann-Morton)",
				category: "Хирургия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 6500, // 65.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-SUTR-01",
				nameRu: "Шовный материал полифиламентный рассасывающийся Vicryl 4-0 (Ethicon)",
				category: "Хирургия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 48000, // 480.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-HEMO-01",
				nameRu: "Гемостатическая антисептическая губка с хлоргексидином (Альвостаз)",
				category: "Хирургия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 18000, // 180.00 ₽
				isOptional: false,
			},
		],
	},

	// 4. A16.07.054 — Внутрикостная дентальная имплантация (Установка имплантата)
	"A16.07.054": {
		code804n: "A16.07.054",
		procedureTitleRu: "Внутрикостная дентальная имплантация (установка титанового имплантата)",
		category: "implant",
		defaultDurationMinutes: 60,
		materials: [
			{
				sku: "MAT-IMPL-01",
				nameRu: "Дентальный имплантат титановый SLA стерильный (Straumann/Osstem/Dentium)",
				category: "Имплантаты",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 1450000, // 14 500.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-COVER-01",
				nameRu: "Винт-заглушка стерильный титановый",
				category: "Имплантаты",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 150000, // 1 500.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-SUTR-01",
				nameRu: "Шовный материал Vicryl 4-0 с атравматической обратной режущей иглой",
				category: "Хирургия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 48000, // 480.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-ANES-01",
				nameRu: "Анестетик артикаиновый 4% с эпинефрином 1:100 000 (2 карпулы)",
				category: "Анестезия",
				standardQuantity: 2,
				unitOfMeasure: "carpule",
				estimatedUnitCostKopecks: 29000, // 290.00 ₽
				isOptional: false,
			},
		],
	},

	// 5. A16.07.051 — Профессиональная гигиена полости рта (AirFlow + УЗ скейлинг)
	"A16.07.051": {
		code804n: "A16.07.051",
		procedureTitleRu: "Профессиональная гигиена полости рта и удаление зубных отложений (AirFlow + УЗ)",
		category: "hygiene",
		defaultDurationMinutes: 60,
		materials: [
			{
				sku: "MAT-POWD-01",
				nameRu: "Порошок для воздушно-абразивной полировки AirFlow (саше 40г, Glycine/Erythritol)",
				category: "Профгигиена",
				standardQuantity: 1,
				unitOfMeasure: "pack",
				estimatedUnitCostKopecks: 65000, // 650.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-PAST-01",
				nameRu: "Полировочная паста для финишной обработки (Cleanic Prophy Paste)",
				category: "Профгигиена",
				standardQuantity: 1,
				unitOfMeasure: "dose",
				estimatedUnitCostKopecks: 12000, // 120.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-CUP-01",
				nameRu: "Полировочная чашечка / щеточка абразивная угловая",
				category: "Профгигиена",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 4500, // 45.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-OPTR-01",
				nameRu: "Роторасширитель эластичный OptraGate (Ivoclar Vivadent)",
				category: "Изоляция",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 18500, // 185.00 ₽
				isOptional: false,
			},
		],
	},

	// 6. A16.07.004 — Восстановление зуба коронкой (Ортопедия)
	"A16.07.004": {
		code804n: "A16.07.004",
		procedureTitleRu: "Восстановление зуба коронкой (препарирование, ретракция и оттиск)",
		category: "ortho",
		defaultDurationMinutes: 60,
		materials: [
			{
				sku: "MAT-CORD-01",
				nameRu: "Ретракционная нить пропитанная гемостатиком (Ultrapak №00/0)",
				category: "Ортопедия",
				standardQuantity: 20,
				unitOfMeasure: "cm",
				estimatedUnitCostKopecks: 15000, // 150.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-IMPR-01",
				nameRu: "А-силиконовая оттискная масса корригирующий слой (Honigum/Express)",
				category: "Ортопедия",
				standardQuantity: 1,
				unitOfMeasure: "dose",
				estimatedUnitCostKopecks: 75000, // 750.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-TCEM-01",
				nameRu: "Безэвгенольный цемент для временной фиксации (Temp-Bond NE)",
				category: "Ортопедия",
				standardQuantity: 1,
				unitOfMeasure: "dose",
				estimatedUnitCostKopecks: 18000, // 180.00 ₽
				isOptional: false,
			},
		],
	},

	// 7. A16.07.082 — Шинирование подвижных зубов (Пародонтология)
	"A16.07.082": {
		code804n: "A16.07.082",
		procedureTitleRu: "Шинирование зубов при заболеваниях пародонта (стекловолокно Ribbond)",
		category: "perio",
		defaultDurationMinutes: 60,
		materials: [
			{
				sku: "MAT-RIBB-01",
				nameRu: "Стекловолоконная биосовместимая лента (Ribbond THM 2mm / GrandTEC)",
				category: "Пародонтология",
				standardQuantity: 10,
				unitOfMeasure: "cm",
				estimatedUnitCostKopecks: 180000, // 1 800.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-FLOW-01",
				nameRu: "Текучий светоотверждаемый нанокомпозит (Filtek Supreme Flowable, 0.5г)",
				category: "Пломбировочные материалы",
				standardQuantity: 0.5,
				unitOfMeasure: "gram",
				estimatedUnitCostKopecks: 65000, // 650.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-ETCH-01",
				nameRu: "Протравочный гель фосфорной кислоты 37% с индикатором",
				category: "Расходные материалы",
				standardQuantity: 1,
				unitOfMeasure: "dose",
				estimatedUnitCostKopecks: 6000, // 60.00 ₽
				isOptional: false,
			},
		],
	},

	// 8. A16.07.050 — Профессиональное отбеливание зубов (Клиническое отбеливание)
	"A16.07.050": {
		code804n: "A16.07.050",
		procedureTitleRu: "Профессиональное клиническое отбеливание зубов (Zoom / Opalescence Boost)",
		category: "whitening",
		defaultDurationMinutes: 90,
		materials: [
			{
				sku: "MAT-DAM-01",
				nameRu: "Жидкий коффердам светоотверждаемый светонепроницаемый (Liquid Dam)",
				category: "Отбеливание",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 55000, // 550.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-BLEACH-01",
				nameRu: "Гель для клинического отбеливания перекись водорода 38% (Opalescence Boost)",
				category: "Отбеливание",
				standardQuantity: 1,
				unitOfMeasure: "dose",
				estimatedUnitCostKopecks: 320000, // 3 200.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-OPTR-01",
				nameRu: "Роторасширитель эластичный OptraGate (Ivoclar Vivadent)",
				category: "Изоляция",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 18500, // 185.00 ₽
				isOptional: false,
			},
		],
	},

	// 9. A16.07.001 — Удаление постоянного зуба (Хирургия / простое и сложное)
	"A16.07.001": {
		code804n: "A16.07.001",
		procedureTitleRu: "Удаление постоянного зуба (атравматичное / простое / сложное)",
		category: "surgery",
		defaultDurationMinutes: 30,
		materials: [
			{
				sku: "MAT-ANES-01",
				nameRu: "Анестетик артикаиновый 4% с эпинефрином 1:100 000 (2 карпулы)",
				category: "Анестезия",
				standardQuantity: 2,
				unitOfMeasure: "carpule",
				estimatedUnitCostKopecks: 29000, // 290.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-SCALP-01",
				nameRu: "Лезвие скальпеля хирургическое стерильное № 15C Swann-Morton",
				category: "Хирургия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 6500, // 65.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-SUTR-01",
				nameRu: "Шовный материал монофиламентный PTFE / Vicryl 4-0 с атравматической иглой",
				category: "Хирургия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 48000, // 480.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-HEMO-01",
				nameRu: "Гемостатическая антисептическая губка с хлоргексидином (Альвостаз)",
				category: "Хирургия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 18000, // 180.00 ₽
				isOptional: false,
			},
		],
	},

	// 10. A16.07.008 — Пломбирование корневого канала зуба гуттаперчей (Эндодонтия)
	"A16.07.008": {
		code804n: "A16.07.008",
		procedureTitleRu: "Пломбирование корневого канала зуба гуттаперчей и силером",
		category: "endo",
		defaultDurationMinutes: 40,
		materials: [
			{
				sku: "MAT-SEAL-01",
				nameRu: "Эпоксидный силер для постоянной обтурации (AH Plus Jet, 0.2г)",
				category: "Эндодонтия",
				standardQuantity: 1,
				unitOfMeasure: "dose",
				estimatedUnitCostKopecks: 42000, // 420.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-GUTT-01",
				nameRu: "Гуттаперчевые конусные штифты калиброванные (3 шт)",
				category: "Эндодонтия",
				standardQuantity: 3,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 4500, // 45.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-PIN-01",
				nameRu: "Штифты бумажные абсорбирующие стерильные (3 шт)",
				category: "Эндодонтия",
				standardQuantity: 3,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 4500, // 45.00 ₽
				isOptional: false,
			},
		],
	},

	// 11. A11.07.012 — Местная анестезия (Инфильтрационная / проводниковая)
	"A11.07.012": {
		code804n: "A11.07.012",
		procedureTitleRu: "Анестезия инфильтрационная / проводниковая карпульная",
		category: "therapy",
		defaultDurationMinutes: 10,
		materials: [
			{
				sku: "MAT-ANES-01",
				nameRu: "Анестетик артикаиновый (Ультракаин Д-С 1:200 000, 1.7 мл)",
				category: "Анестезия",
				standardQuantity: 1,
				unitOfMeasure: "carpule",
				estimatedUnitCostKopecks: 14500, // 145.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-NEEDLE-01",
				nameRu: "Игла карпульная 30G евростандарт 25 мм",
				category: "Анестезия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 2800, // 28.00 ₽
				isOptional: false,
			},
		],
	},

	// 12. A16.07.055 — Синус-лифтинг и направленная костная регенерация (НКР / Bio-Oss + Bio-Gide)
	"A16.07.055": {
		code804n: "A16.07.055",
		procedureTitleRu: "Синус-лифтинг (костная пластика) с использованием остеопластического материала и мембраны",
		category: "surgery",
		defaultDurationMinutes: 75,
		materials: [
			{
				sku: "MAT-GRAFT-01",
				nameRu: "Костнозамещающий натуральный графт (Geistlich Bio-Oss гранулы 0.5г)",
				category: "Остеопластика",
				standardQuantity: 1,
				unitOfMeasure: "pack",
				estimatedUnitCostKopecks: 1250000, // 12 500.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-MEMB-01",
				nameRu: "Коллагеновая резорбируемая барьерная мембрана (Geistlich Bio-Gide 25×25 мм)",
				category: "Остеопластика",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 1680000, // 16 800.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-PIN-02",
				nameRu: "Титановые микропины для фиксации барьерной мембраны (комплект 2 шт)",
				category: "Хирургия",
				standardQuantity: 2,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 240000, // 2 400.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-PROL-01",
				nameRu: "Шовный материал монофиламентный нерассасывающийся Prolene 5-0 (Ethicon)",
				category: "Хирургия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 54000, // 540.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-ANES-02",
				nameRu: "Анестетик артикаиновый 4% с эпинефрином 1:100 000 (Ультракаин Д-С Форте, 2 карпулы)",
				category: "Анестезия",
				standardQuantity: 2,
				unitOfMeasure: "carpule",
				estimatedUnitCostKopecks: 29000, // 290.00 ₽
				isOptional: false,
			},
		],
	},

	// 13. A16.07.041 — Костная пластика челюсти / аугментация альвеолярного отростка
	"A16.07.041": {
		code804n: "A16.07.041",
		procedureTitleRu: "Костная пластика челюсти с применением биодеградируемых мембран и костных графтов",
		category: "surgery",
		defaultDurationMinutes: 60,
		materials: [
			{
				sku: "MAT-GRAFT-01",
				nameRu: "Костнозамещающий натуральный графт (Geistlich Bio-Oss гранулы 0.5г)",
				category: "Остеопластика",
				standardQuantity: 1,
				unitOfMeasure: "pack",
				estimatedUnitCostKopecks: 1250000, // 12 500.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-MEMB-01",
				nameRu: "Коллагеновая резорбируемая барьерная мембрана (Geistlich Bio-Gide 25×25 мм)",
				category: "Остеопластика",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 1680000, // 16 800.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-SUTR-01",
				nameRu: "Шовный материал рассасывающийся Vicryl 4-0 с атравматической иглой",
				category: "Хирургия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 48000, // 480.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-ANES-02",
				nameRu: "Анестетик артикаиновый 4% с эпинефрином 1:100 000 (Ультракаин Д-С Форте, 2 карпулы)",
				category: "Анестезия",
				standardQuantity: 2,
				unitOfMeasure: "carpule",
				estimatedUnitCostKopecks: 29000, // 290.00 ₽
				isOptional: false,
			},
		],
	},
};

/**
 * Completed procedure input descriptor for calculating BOM deductions.
 */
export const completedProcedureInputSchema = z.object({
	procedureCode804n: z.string().min(1),
	procedureNameRu: z.string().optional(),
	quantity: z.number().int().positive().default(1),
	toothNumber: z.number().int().min(11).max(85).optional(),
	doctorId: z.string().optional(),
	cabinetId: z.string().optional(),
});

export type CompletedProcedureInput = z.infer<typeof completedProcedureInputSchema>;

/**
 * Cabinet stock item data contract for inventory checks.
 */
export const cabinetStockItemSchema = z.object({
	id: z.string().min(1),
	organizationId: z.string().min(1),
	cabinetId: z.string().min(1),
	sku: z.string().min(1),
	nameRu: z.string().min(1),
	currentQuantity: z.number(),
	minThresholdQuantity: z.number().nonnegative().default(5),
	unitOfMeasure: consumableUnitSchema,
	costKopecks: z.number().int().nonnegative().default(0),
});

export type CabinetStockItem = z.infer<typeof cabinetStockItemSchema>;

/**
 * Resolved material requirement item aggregated across all procedures.
 */
export interface ResolvedMaterialRequirement {
	readonly sku: string;
	readonly nameRu: string;
	readonly category: string;
	readonly totalQuantityRequired: number;
	readonly unitOfMeasure: ConsumableUnit;
	readonly totalEstimatedCostKopecks: number;
	readonly procedureBreakdown: readonly {
		readonly code804n: string;
		readonly procedureTitleRu: string;
		readonly quantity: number;
		readonly toothNumber?: number;
		readonly unitQuantity: number;
	}[];
	readonly isAvailableInStock: boolean;
	readonly currentStockQuantity: number;
	readonly shortfallQuantity: number;
}

/**
 * Complete summary of resolved materials for a treatment visit.
 */
export interface ResolvedMaterialRequirementSummary {
	readonly totalProceduresCount: number;
	readonly recognizedProceduresCount: number;
	readonly unrecognizedProceduresCount: number;
	readonly unrecognizedProcedureCodes: readonly string[];
	readonly totalEstimatedCostKopecks: number;
	readonly materials: readonly ResolvedMaterialRequirement[];
	readonly hasStockShortfall: boolean;
}

/**
 * Low stock warning alert item.
 */
export interface LowStockAlert {
	readonly sku: string;
	readonly nameRu: string;
	readonly cabinetId: string;
	readonly previousQuantity: number;
	readonly remainingQuantity: number;
	readonly minThresholdQuantity: number;
	readonly alertLevel: "warning_low_stock" | "critical_out_of_stock";
	readonly messageRu: string;
}

/**
 * Shortfall record when requested quantity exceeds available cabinet stock.
 */
export interface ShortfallItem {
	readonly sku: string;
	readonly nameRu: string;
	readonly category: string;
	readonly requiredQuantity: number;
	readonly availableQuantity: number;
	readonly deficitQuantity: number;
	readonly unitOfMeasure: ConsumableUnit;
}

/**
 * Result of a stock deduction operation.
 */
export interface DeductionOperationResult {
	readonly success: boolean;
	readonly totalDeductionCostKopecks: number;
	readonly updatedStock: readonly CabinetStockItem[];
	readonly deductedItems: readonly {
		readonly sku: string;
		readonly nameRu: string;
		readonly deductedQuantity: number;
		readonly previousQuantity: number;
		readonly remainingQuantity: number;
		readonly unitOfMeasure: ConsumableUnit;
	}[];
	readonly lowStockAlerts: readonly LowStockAlert[];
	readonly hasShortfall: boolean;
	readonly shortfallItems?: readonly ShortfallItem[] | undefined;
	readonly preventedNegativeStock?: boolean | undefined;
	readonly purchaseOrder?: SupplierPurchaseOrder | null | undefined;
}

/**
 * Options configuring stock deduction behavior.
 */
export interface DeductMaterialsOptions {
	/**
	 * When true, prevents negative stock. If any requested material is insufficient,
	 * the deduction is not committed (stock copy remains untouched), success is false,
	 * and detailed shortfall records are returned.
	 */
	readonly preventNegativeStock?: boolean | undefined;
	/**
	 * Automatically generate a supplier purchase order if any item has a shortfall or breaches critical threshold.
	 */
	readonly autoGeneratePurchaseOrder?: boolean | undefined;
	readonly clinicNameRu?: string | undefined;
	readonly visitId?: string | undefined;
	readonly reorderBufferMultiplier?: number | undefined;
}

/**
 * Canonical 804n code aliases and child sub-codes mapping to standard technological maps.
 */
export const PROCEDURE_804N_ALIASES: Readonly<Record<string, string>> = {
	"A16.07.002.001": "A16.07.002",
	"A16.07.002.002": "A16.07.002",
	"A16.07.030.001": "A16.07.030",
	"A16.07.030.002": "A16.07.030",
	"A16.07.030.003": "A16.07.030",
	"A16.07.008.001": "A16.07.008",
	"A16.07.008.002": "A16.07.008",
	"A16.07.008.003": "A16.07.008",
	"A16.07.001.001": "A16.07.001",
	"A16.07.006.001": "A16.07.006",
	"A16.07.054.001": "A16.07.054",
	"A11.07.012.001": "A11.07.012",
	"A16.07.051.001": "A16.07.051",
	"A16.07.004.001": "A16.07.004",
	"A16.07.082.001": "A16.07.082",
	"A16.07.050.001": "A16.07.050",
	"A16.07.055.001": "A16.07.055",
	"A16.07.055.002": "A16.07.055",
	"A16.07.041.001": "A16.07.041",
	"A16.07.041.002": "A16.07.041",
};

/**
 * Retrieves the standard Bill of Materials (BOM) technological map for an 804n code.
 * Supports exact codes, child sub-codes (e.g. A16.07.002.001), and aliases.
 */
export function getStandardBOMForProcedure(code804n: string): ProcedureBomMap | undefined {
	if (!code804n) return undefined;
	const normalizedCode = code804n.trim().toUpperCase();
	if (STANDARD_PROCEDURE_BOM_MAPS[normalizedCode]) {
		return STANDARD_PROCEDURE_BOM_MAPS[normalizedCode];
	}
	const aliasTarget = PROCEDURE_804N_ALIASES[normalizedCode];
	if (aliasTarget && STANDARD_PROCEDURE_BOM_MAPS[aliasTarget]) {
		return STANDARD_PROCEDURE_BOM_MAPS[aliasTarget];
	}
	const segments = normalizedCode.split(".");
	if (segments.length > 3) {
		const basePrefix = segments.slice(0, 3).join(".");
		if (STANDARD_PROCEDURE_BOM_MAPS[basePrefix]) {
			return STANDARD_PROCEDURE_BOM_MAPS[basePrefix];
		}
	}
	return undefined;
}

/**
 * Pure function: Resolves total material requirements for a set of completed 804n procedures.
 * Cross-references with optional cabinet stock to detect shortfalls.
 */
export function resolveProcedureMaterials(
	procedures: readonly CompletedProcedureInput[],
	currentStock?: readonly CabinetStockItem[],
): ResolvedMaterialRequirementSummary {
	const stockMap = new Map<string, CabinetStockItem>();
	if (currentStock) {
		for (const item of currentStock) {
			stockMap.set(item.sku.trim().toUpperCase(), item);
		}
	}

	const materialMap = new Map<
		string,
		{
			sku: string;
			nameRu: string;
			category: string;
			totalQuantityRequired: number;
			unitOfMeasure: ConsumableUnit;
			totalEstimatedCostKopecks: number;
			procedureBreakdown: Array<{
				code804n: string;
				procedureTitleRu: string;
				quantity: number;
				toothNumber?: number;
				unitQuantity: number;
			}>;
		}
	>();

	let totalProceduresCount = 0;
	let recognizedProceduresCount = 0;
	const unrecognizedProcedureCodes: string[] = [];

	for (const proc of procedures) {
		totalProceduresCount += proc.quantity;
		const bom = getStandardBOMForProcedure(proc.procedureCode804n);

		if (!bom) {
			unrecognizedProcedureCodes.push(proc.procedureCode804n);
			continue;
		}

		recognizedProceduresCount += proc.quantity;

		for (const mat of bom.materials) {
			const skuKey = mat.sku.trim().toUpperCase();
			const qtyNeeded = Number((mat.standardQuantity * proc.quantity).toFixed(4));
			const costKopecks = Math.round(mat.estimatedUnitCostKopecks * proc.quantity * mat.standardQuantity);

			const existing = materialMap.get(skuKey);
			if (existing) {
				existing.totalQuantityRequired = Number((existing.totalQuantityRequired + qtyNeeded).toFixed(4));
				existing.totalEstimatedCostKopecks += costKopecks;
				existing.procedureBreakdown.push({
					code804n: bom.code804n,
					procedureTitleRu: bom.procedureTitleRu,
					quantity: proc.quantity,
					...(proc.toothNumber !== undefined ? { toothNumber: proc.toothNumber } : {}),
					unitQuantity: mat.standardQuantity,
				});
			} else {
				materialMap.set(skuKey, {
					sku: mat.sku,
					nameRu: mat.nameRu,
					category: mat.category,
					totalQuantityRequired: qtyNeeded,
					unitOfMeasure: mat.unitOfMeasure,
					totalEstimatedCostKopecks: costKopecks,
					procedureBreakdown: [
						{
							code804n: bom.code804n,
							procedureTitleRu: bom.procedureTitleRu,
							quantity: proc.quantity,
							...(proc.toothNumber !== undefined ? { toothNumber: proc.toothNumber } : {}),
							unitQuantity: mat.standardQuantity,
						},
					],
				});
			}
		}
	}

	let grandTotalCostKopecks = 0;
	let hasStockShortfall = false;

	const resolvedMaterials: ResolvedMaterialRequirement[] = Array.from(materialMap.values()).map((item) => {
		grandTotalCostKopecks += item.totalEstimatedCostKopecks;
		const stockItem = stockMap.get(item.sku.trim().toUpperCase());
		const currentStockQty = stockItem ? stockItem.currentQuantity : 0;
		const shortfall = Math.max(0, Number((item.totalQuantityRequired - currentStockQty).toFixed(4)));

		if (stockItem && shortfall > 0) {
			hasStockShortfall = true;
		}

		return {
			sku: item.sku,
			nameRu: item.nameRu,
			category: item.category,
			totalQuantityRequired: item.totalQuantityRequired,
			unitOfMeasure: item.unitOfMeasure,
			totalEstimatedCostKopecks: item.totalEstimatedCostKopecks,
			procedureBreakdown: item.procedureBreakdown,
			isAvailableInStock: shortfall === 0,
			currentStockQuantity: currentStockQty,
			shortfallQuantity: shortfall,
		};
	});

	return {
		totalProceduresCount,
		recognizedProceduresCount,
		unrecognizedProceduresCount: unrecognizedProcedureCodes.length,
		unrecognizedProcedureCodes,
		totalEstimatedCostKopecks: grandTotalCostKopecks,
		materials: resolvedMaterials,
		hasStockShortfall,
	};
}

/**
 * Pure function: Decrements cabinet inventory, prevents negative stock if requested,
 * and alerts if stock falls below minimum reorder threshold.
 */
export function deductMaterialsFromCabinetStock(
	stock: readonly CabinetStockItem[],
	requirements: readonly ResolvedMaterialRequirement[],
	options?: DeductMaterialsOptions,
): DeductionOperationResult {
	const stockCopy: CabinetStockItem[] = stock.map((s) => ({ ...s }));
	const stockMap = new Map<string, CabinetStockItem>();

	for (const s of stockCopy) {
		stockMap.set(s.sku.trim().toUpperCase(), s);
	}

	const deductedItems: Array<{
		sku: string;
		nameRu: string;
		deductedQuantity: number;
		previousQuantity: number;
		remainingQuantity: number;
		unitOfMeasure: ConsumableUnit;
	}> = [];

	const shortfallItems: ShortfallItem[] = [];
	const lowStockAlerts: LowStockAlert[] = [];
	let totalDeductionCostKopecks = 0;
	let hasShortfall = false;

	// 1. Initial validation pass: detect shortfalls and deficits
	for (const req of requirements) {
		const skuKey = req.sku.trim().toUpperCase();
		const stockItem = stockMap.get(skuKey);
		const availableQty = stockItem ? stockItem.currentQuantity : 0;
		const reqQty = req.totalQuantityRequired;

		if (!stockItem || availableQty < reqQty) {
			hasShortfall = true;
			shortfallItems.push({
				sku: req.sku,
				nameRu: req.nameRu,
				category: req.category,
				requiredQuantity: reqQty,
				availableQuantity: availableQty,
				deficitQuantity: Number(Math.max(0, reqQty - availableQty).toFixed(4)),
				unitOfMeasure: req.unitOfMeasure,
			});
		}
	}

	// 2. Deduction pass: deduct from available stock (allowing soft deficit if stock is insufficient)
	for (const req of requirements) {
		const skuKey = req.sku.trim().toUpperCase();
		const stockItem = stockMap.get(skuKey);

		if (!stockItem) {
			hasShortfall = true;
			continue;
		}

		const prevQty = stockItem.currentQuantity;
		const deductQty = req.totalQuantityRequired;
		const newQty = Number((prevQty - deductQty).toFixed(4));

		if (newQty < 0 || prevQty < deductQty) {
			hasShortfall = true;
		}

		stockItem.currentQuantity = newQty;
		totalDeductionCostKopecks += req.totalEstimatedCostKopecks;

		deductedItems.push({
			sku: req.sku,
			nameRu: req.nameRu,
			deductedQuantity: deductQty,
			previousQuantity: prevQty,
			remainingQuantity: newQty,
			unitOfMeasure: req.unitOfMeasure,
		});

		// Check if threshold breached or deficit occurred
		if (newQty < 0) {
			lowStockAlerts.push({
				sku: req.sku,
				nameRu: req.nameRu,
				cabinetId: stockItem.cabinetId,
				previousQuantity: prevQty,
				remainingQuantity: newQty,
				minThresholdQuantity: stockItem.minThresholdQuantity,
				alertLevel: "critical_out_of_stock",
				messageRu: `Дефицит материала: «${req.nameRu}» списан в минус (остаток: ${newQty} ${req.unitOfMeasure}, нехватка: ${Math.abs(newQty)} ${req.unitOfMeasure}). Зафиксирован мягкий дефицит для отдела снабжения.`,
			});
		} else if (newQty === 0) {
			lowStockAlerts.push({
				sku: req.sku,
				nameRu: req.nameRu,
				cabinetId: stockItem.cabinetId,
				previousQuantity: prevQty,
				remainingQuantity: newQty,
				minThresholdQuantity: stockItem.minThresholdQuantity,
				alertLevel: "critical_out_of_stock",
				messageRu: `Критический остаток: «${req.nameRu}» полностью израсходован в кабинете #${stockItem.cabinetId} (Остаток: 0 ${req.unitOfMeasure})!`,
			});
		} else if (newQty <= stockItem.minThresholdQuantity) {
			lowStockAlerts.push({
				sku: req.sku,
				nameRu: req.nameRu,
				cabinetId: stockItem.cabinetId,
				previousQuantity: prevQty,
				remainingQuantity: newQty,
				minThresholdQuantity: stockItem.minThresholdQuantity,
				alertLevel: "warning_low_stock",
				messageRu: `Низкий остаток: «${req.nameRu}» в кабинете #${stockItem.cabinetId} составляет ${newQty} ${req.unitOfMeasure} (порог перезаказа: ${stockItem.minThresholdQuantity} ${req.unitOfMeasure}).`,
			});
		}
	}

	let purchaseOrder: SupplierPurchaseOrder | null = null;
	if (options?.autoGeneratePurchaseOrder && (hasShortfall || lowStockAlerts.length > 0)) {
		purchaseOrder = generateSupplierPurchaseOrder({
			alerts: lowStockAlerts,
			requirements,
			stock: stockCopy,
			...(options.visitId ? { visitId: options.visitId } : {}),
			...(options.clinicNameRu ? { clinicNameRu: options.clinicNameRu } : {}),
			...(options.reorderBufferMultiplier !== undefined ? { reorderBufferMultiplier: options.reorderBufferMultiplier } : {}),
		});
	}

	return {
		success: true,
		totalDeductionCostKopecks,
		updatedStock: stockCopy,
		deductedItems,
		lowStockAlerts,
		hasShortfall,
		...(shortfallItems.length > 0 ? { shortfallItems } : {}),
		preventedNegativeStock: false,
		purchaseOrder,
	};
}

/**
 * Pure helper: Calculates the material cost and items breakdown for a specific 804n procedure.
 */
export function calculateProcedureMaterialsCost(
	procedureCode804n: string,
	quantity = 1,
): {
	totalCostKopecks: number;
	materials: Array<{ nameRu: string; qty: number; unit: ConsumableUnit; costKopecks: number }>;
} {
	const bom = getStandardBOMForProcedure(procedureCode804n);
	if (!bom) {
		return { totalCostKopecks: 0, materials: [] };
	}

	let total = 0;
	const mats = bom.materials.map((m) => {
		const itemQty = Number((m.standardQuantity * quantity).toFixed(4));
		const itemCost = Math.round(m.estimatedUnitCostKopecks * quantity * m.standardQuantity);
		total += itemCost;
		return {
			nameRu: m.nameRu,
			qty: itemQty,
			unit: m.unitOfMeasure,
			costKopecks: itemCost,
		};
	});

	return {
		totalCostKopecks: total,
		materials: mats,
	};
}

/**
 * ============================================================================
 * SUPPLIER PURCHASE ORDER (ЗАКАЗ ПОСТАВЩИКУ) ENGINE
 * 1-Click Purchase Order Generation on Critical Minimum Threshold Breaches
 * ============================================================================
 */

export const supplierPurchaseOrderItemSchema = z.object({
	sku: z.string().min(1),
	nameRu: z.string().min(1),
	category: z.string().min(1),
	unitOfMeasure: consumableUnitSchema,
	currentStock: z.number(),
	minThreshold: z.number().nonnegative(),
	shortfallQuantity: z.number().nonnegative(),
	suggestedOrderQuantity: z.number().positive(),
	estimatedUnitCostKopecks: z.number().int().nonnegative(),
	totalCostKopecks: z.number().int().nonnegative(),
	totalCostFormattedRu: z.string().min(1),
});

export type SupplierPurchaseOrderItem = z.infer<typeof supplierPurchaseOrderItemSchema>;

export const supplierPurchaseOrderSchema = z.object({
	id: z.string().min(1),
	orderNumber: z.string().min(1),
	orderDate: z.string().min(1),
	visitId: z.string().optional(),
	clinicNameRu: z.string().min(1),
	reason: z.enum(["critical_threshold_breach", "stock_deficit", "scheduled_restock"]),
	items: z.array(supplierPurchaseOrderItemSchema),
	totalItemsCount: z.number().int().positive(),
	totalOrderCostKopecks: z.number().int().nonnegative(),
	totalOrderCostFormattedRu: z.string().min(1),
	status: z.enum(["draft", "submitted", "approved"]),
});

export type SupplierPurchaseOrder = z.infer<typeof supplierPurchaseOrderSchema>;

/**
 * Pure function: Generates a 1-click supplier purchase order draft from critical alerts or shortfalls.
 */
export function generateSupplierPurchaseOrder(params: {
	alerts?: readonly LowStockAlert[] | undefined;
	requirements?: readonly ResolvedMaterialRequirement[] | undefined;
	stock?: readonly CabinetStockItem[] | undefined;
	visitId?: string | undefined;
	clinicNameRu?: string | undefined;
	reorderBufferMultiplier?: number | undefined;
}): SupplierPurchaseOrder | null {
	const clinicName = params.clinicNameRu || "Стоматологическая клиника DENTE";
	const bufferMultiplier = params.reorderBufferMultiplier ?? 2;
	const dateStr = new Date().toISOString().slice(0, 10);
	const orderNumber = `ПО-${dateStr.replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

	const itemsMap = new Map<string, SupplierPurchaseOrderItem>();

	const stockMap = new Map<string, CabinetStockItem>();
	if (params.stock) {
		for (const s of params.stock) {
			stockMap.set(s.sku.trim().toUpperCase(), s);
		}
	}

	const reqMap = new Map<string, ResolvedMaterialRequirement>();
	if (params.requirements) {
		for (const r of params.requirements) {
			reqMap.set(r.sku.trim().toUpperCase(), r);
		}
	}

	// 1. Ingest low stock alerts (critical out-of-stock or warning)
	if (params.alerts) {
		for (const alert of params.alerts) {
			const skuKey = alert.sku.trim().toUpperCase();
			if (itemsMap.has(skuKey)) continue;

			const stock = stockMap.get(skuKey);
			const req = reqMap.get(skuKey);

			const currentStock = alert.remainingQuantity;
			const threshold = alert.minThresholdQuantity;
			const shortfall = req ? req.shortfallQuantity : 0;
			const unit = req?.unitOfMeasure ?? stock?.unitOfMeasure ?? "pcs";

			// Determine suggested order quantity (ensuring minimum batch and safety buffer)
			let suggested = 0;
			if (unit === "pcs" || unit === "carpule" || unit === "pack" || unit === "tube" || unit === "dose") {
				suggested = Math.max(Math.ceil(threshold * bufferMultiplier), Math.ceil(shortfall + threshold), 1);
			} else {
				suggested = Number(Math.max(threshold * bufferMultiplier, shortfall + threshold, 1).toFixed(2));
			}

			const unitCostKopecks =
				stock?.costKopecks ??
				(req && req.totalQuantityRequired > 0
					? Math.round(req.totalEstimatedCostKopecks / req.totalQuantityRequired)
					: 10000);
			const totalCostKopecks = Math.round(suggested * unitCostKopecks);

			itemsMap.set(skuKey, {
				sku: alert.sku,
				nameRu: alert.nameRu,
				category: req?.category ?? "Расходные материалы",
				unitOfMeasure: unit,
				currentStock,
				minThreshold: threshold,
				shortfallQuantity: shortfall,
				suggestedOrderQuantity: suggested,
				estimatedUnitCostKopecks: unitCostKopecks,
				totalCostKopecks,
				totalCostFormattedRu: `${(totalCostKopecks / 100).toLocaleString("ru-RU", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})} ₽`,
			});
		}
	}

	// 2. Ingest unmet requirements with shortfall
	if (params.requirements) {
		for (const req of params.requirements) {
			const skuKey = req.sku.trim().toUpperCase();
			if (itemsMap.has(skuKey) || req.shortfallQuantity <= 0) continue;

			const stock = stockMap.get(skuKey);
			const currentStock = req.currentStockQuantity;
			const threshold = stock ? stock.minThresholdQuantity : 1;
			const shortfall = req.shortfallQuantity;
			const unit = req.unitOfMeasure;

			let suggested = 0;
			if (unit === "pcs" || unit === "carpule" || unit === "pack" || unit === "tube" || unit === "dose") {
				suggested = Math.max(Math.ceil(threshold * bufferMultiplier), Math.ceil(shortfall + threshold), 1);
			} else {
				suggested = Number(Math.max(threshold * bufferMultiplier, shortfall + threshold, 1).toFixed(2));
			}

			const unitCostKopecks =
				stock?.costKopecks ??
				(req.totalQuantityRequired > 0
					? Math.round(req.totalEstimatedCostKopecks / req.totalQuantityRequired)
					: 10000);
			const totalCostKopecks = Math.round(suggested * unitCostKopecks);

			itemsMap.set(skuKey, {
				sku: req.sku,
				nameRu: req.nameRu,
				category: req.category,
				unitOfMeasure: unit,
				currentStock,
				minThreshold: threshold,
				shortfallQuantity: shortfall,
				suggestedOrderQuantity: suggested,
				estimatedUnitCostKopecks: unitCostKopecks,
				totalCostKopecks,
				totalCostFormattedRu: `${(totalCostKopecks / 100).toLocaleString("ru-RU", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})} ₽`,
			});
		}
	}

	const items = Array.from(itemsMap.values());
	if (items.length === 0) return null;

	let totalOrderCostKopecks = 0;
	for (const item of items) {
		totalOrderCostKopecks += item.totalCostKopecks;
	}

	const hasDeficit = items.some((i) => i.shortfallQuantity > 0 || i.currentStock === 0);

	return {
		id: `po-${Date.now()}`,
		orderNumber,
		orderDate: dateStr,
		...(params.visitId ? { visitId: params.visitId } : {}),
		clinicNameRu: clinicName,
		reason: hasDeficit ? "stock_deficit" : "critical_threshold_breach",
		items,
		totalItemsCount: items.length,
		totalOrderCostKopecks,
		totalOrderCostFormattedRu: `${(totalOrderCostKopecks / 100).toLocaleString("ru-RU", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})} ₽`,
		status: "draft",
	};
}

/**
 * Formats a SupplierPurchaseOrder into plain text representation for email/clipboard.
 */
export function formatSupplierPurchaseOrderText(order: SupplierPurchaseOrder): string {
	const lines = [
		`================================================================================`,
		`ЗАКАЗ ПОСТАВЩИКУ МЕДИЦИНСКИХ РАСХОДНЫХ МАТЕРИАЛОВ`,
		`Номер документа: ${order.orderNumber}`,
		`Дата формирования: ${order.orderDate}`,
		`Заказчик: ${order.clinicNameRu}`,
		`Причина формирования: ${
			order.reason === "stock_deficit"
				? "Ликвидация дефицита материалов (неснижаемый остаток исчерпан)"
				: order.reason === "critical_threshold_breach"
					? "Срабатывание алерта критического неснижаемого остатка"
					: "Плановое пополнение запасов"
		}`,
		...(order.visitId ? [`Связанный прием/визит: ${order.visitId}`] : []),
		`================================================================================`,
		`СПЕЦИФИКАЦИЯ МАТЕРИАЛОВ К ЗАКАЗУ:`,
		`--------------------------------------------------------------------------------`,
	];

	order.items.forEach((item, idx) => {
		lines.push(
			`${idx + 1}. [${item.sku}] ${item.nameRu}`,
			`   Категория: ${item.category} | Ед. изм.: ${item.unitOfMeasure}`,
			`   Текущий остаток: ${item.currentStock} | Порог нормы: ${item.minThreshold} | Дефицит: ${item.shortfallQuantity}`,
			`   Рекомендуемый заказ: ${item.suggestedOrderQuantity} ${item.unitOfMeasure} × ${(item.estimatedUnitCostKopecks / 100).toFixed(2)} ₽ = ${item.totalCostFormattedRu}`,
			`--------------------------------------------------------------------------------`,
		);
	});

	lines.push(
		`ВСЕГО ПОЗИЦИЙ К ЗАКАЗУ: ${order.totalItemsCount}`,
		`ИТОГОВАЯ ОРИЕНТИРОВОЧНАЯ СТОИМОСТЬ: ${order.totalOrderCostFormattedRu} (${order.totalOrderCostKopecks} коп.)`,
		`================================================================================`,
		`Сформировано автоматически системой DENTE CRM (модуль Auto-BOM Inventory).`,
	);

	return lines.join("\n");
}

/**
 * Generates an official print-ready HTML document for the Supplier Purchase Order.
 */
export function generateSupplierPurchaseOrderHtml(order: SupplierPurchaseOrder): string {
	const tableRows = order.items
		.map(
			(item, idx) => `
		<tr>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${idx + 1}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-family: monospace; font-size: 11px;">${item.sku}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 600;">${item.nameRu}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${item.category}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${item.unitOfMeasure}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right;">${item.currentStock}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; color: #b91c1c; font-weight: bold;">${item.shortfallQuantity > 0 ? item.shortfallQuantity : "—"}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-weight: bold; background-color: #f0fdf4;">${item.suggestedOrderQuantity}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right;">${(item.estimatedUnitCostKopecks / 100).toFixed(2)} ₽</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-weight: bold;">${item.totalCostFormattedRu}</td>
		</tr>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Заказ поставщику ${order.orderNumber}</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #0f172a; font-size: 13px; line-height: 1.4; }
		h1 { font-size: 18px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
		.meta-box { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }
		table { width: 100%; border-collapse: collapse; margin-top: 12px; }
		th { background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px; font-size: 12px; font-weight: 600; text-align: left; }
		.total-box { margin-top: 16px; padding: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; display: flex; justify-content: flex-end; gap: 32px; font-size: 15px; }
		.signatures { margin-top: 40px; display: flex; justify-content: space-between; padding: 0 20px; }
		.sig-line { width: 220px; border-top: 1px solid #000; text-align: center; font-size: 11px; padding-top: 4px; }
		@media print { body { margin: 0; } }
	</style>
</head>
<body>
	<div class="meta-box">
		<div>
			<h1>Заказ поставщику расходных материалов</h1>
			<div><strong>Документ №:</strong> ${order.orderNumber} от ${order.orderDate}</div>
			<div><strong>Организация (Заказчик):</strong> ${order.clinicNameRu}</div>
		</div>
		<div style="text-align: right;">
			<div><strong>Основание:</strong> ${order.reason === "stock_deficit" ? "Дефицит материалов" : "Пополнение неснижаемого запаса"}</div>
			${order.visitId ? `<div><strong>Прием:</strong> ${order.visitId}</div>` : ""}
			<div><strong>Статус:</strong> Проект (Сформирован в 1 клик)</div>
		</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 30px; text-align: center;">№</th>
				<th style="width: 100px;">Артикул</th>
				<th>Наименование материала</th>
				<th style="width: 110px;">Категория</th>
				<th style="width: 50px; text-align: center;">Ед.</th>
				<th style="width: 60px; text-align: right;">Остаток</th>
				<th style="width: 60px; text-align: right;">Дефицит</th>
				<th style="width: 70px; text-align: right;">Заказ</th>
				<th style="width: 90px; text-align: right;">Цена за ед.</th>
				<th style="width: 100px; text-align: right;">Сумма</th>
			</tr>
		</thead>
		<tbody>
			${tableRows}
		</tbody>
	</table>

	<div class="total-box">
		<div>Всего позиций: <strong>${order.totalItemsCount}</strong></div>
		<div>Итого к оплате: <strong style="color: #047857; font-size: 16px;">${order.totalOrderCostFormattedRu}</strong></div>
	</div>

	<div class="signatures">
		<div>
			<div style="height: 30px;"></div>
			<div class="sig-line">Ответственный за закупку (ФИО / Подпись)</div>
		</div>
		<div>
			<div style="height: 30px;"></div>
			<div class="sig-line">Главная медицинская сестра / Зав. складом</div>
		</div>
		<div>
			<div style="height: 30px;"></div>
			<div class="sig-line">Руководитель клиники / Главврач</div>
		</div>
	</div>
</body>
</html>`;
}

/**
 * Parameters for high-level automated visit BOM deduction.
 */
export interface ExecuteVisitAutoBomDeductionParams {
	readonly visitId: string;
	readonly procedures: readonly CompletedProcedureInput[];
	readonly currentStock: readonly CabinetStockItem[];
	readonly options?: DeductMaterialsOptions | undefined;
}

/**
 * Result of the end-to-end automated visit material deduction.
 */
export interface VisitAutoBomDeductionSummary {
	readonly success: boolean;
	readonly visitId: string;
	readonly totalCostKopecks: number;
	readonly totalCostFormattedRu: string;
	readonly requirementsSummary: ResolvedMaterialRequirementSummary;
	readonly deductionResult: DeductionOperationResult;
	readonly purchaseOrder: SupplierPurchaseOrder | null;
	readonly hasShortfall: boolean;
	readonly preventedNegativeStock: boolean;
	readonly statusMessageRu: string;
}

/**
 * High-level orchestration engine: Resolves materials for finished visit procedures,
 * validates against cabinet stock, enforces negative stock prevention, and produces
 * 1-click supplier purchase order if critical thresholds are breached.
 */
export function executeVisitAutoBomDeduction(
	params: ExecuteVisitAutoBomDeductionParams,
): VisitAutoBomDeductionSummary {
	const requirementsSummary = resolveProcedureMaterials(params.procedures, params.currentStock);

	const deductionResult = deductMaterialsFromCabinetStock(
		params.currentStock,
		requirementsSummary.materials,
		{
			preventNegativeStock: false,
			autoGeneratePurchaseOrder: params.options?.autoGeneratePurchaseOrder ?? true,
			...(params.options?.clinicNameRu ? { clinicNameRu: params.options.clinicNameRu } : {}),
			visitId: params.visitId,
			reorderBufferMultiplier: params.options?.reorderBufferMultiplier ?? 2,
		},
	);

	const totalCostKopecks = deductionResult.totalDeductionCostKopecks;
	const totalCostFormattedRu = `${(totalCostKopecks / 100).toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})} ₽`;

	let statusMessageRu = "Списание материалов по техкартам 804н выполнено успешно.";
	if (deductionResult.hasShortfall) {
		statusMessageRu = "Списание материалов выполнено с фиксацией дефицита для отдела снабжения.";
	} else if (deductionResult.lowStockAlerts.length > 0) {
		statusMessageRu = `Списание выполнено. Зафиксировано ${deductionResult.lowStockAlerts.length} предупреждений о критическом неснижаемом остатке.`;
	}

	return {
		success: deductionResult.success,
		visitId: params.visitId,
		totalCostKopecks,
		totalCostFormattedRu,
		requirementsSummary,
		deductionResult,
		purchaseOrder: deductionResult.purchaseOrder ?? null,
		hasShortfall: deductionResult.hasShortfall,
		preventedNegativeStock: deductionResult.preventedNegativeStock ?? false,
		statusMessageRu,
	};
}
