import type { ProcedureBomMap } from "./types.js";

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
