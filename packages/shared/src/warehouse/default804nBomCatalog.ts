/**
 * default804nBomCatalog.ts — Canonical Standard Technological Maps (BOM) for 804n Services.
 *
 * Provides statutory default consumable material recipes for core dental procedures
 * under Order 804n of the Ministry of Health of the Russian Federation and SanPiN 3.3686-21.
 *
 * MANDATE 8n & 8e (Scale Sovereignty & Solo Doctor Autonomy):
 * A solo doctor or compact clinic has instant background material deduction out-of-the-box
 * without having to manually configure database tables or click 20 buttons per tooth.
 *
 * ZERO EMOJIS — Exact kopeck pricing — Pure deterministic math.
 */

import type { ConsumableItemLink } from "./treatmentConsumablesEngine.js";

export const DEFAULT_804N_CONSUMABLE_LINKS: readonly ConsumableItemLink[] = [
	// ─── 1. АНЕСТЕЗИЯ МЕСТНАЯ (A11.07.012) ──────────────────────────────────
	{
		id: "def-link-anes-carpule",
		service804nCode: "A11.07.012",
		serviceTitle: "Анестезия инфильтрационная / проводниковая",
		inventoryItemId: "mat-anes-art-100k",
		itemName: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)",
		category: "anesthetic",
		unit: "карпула",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 14500, // 145.00 ₽
		notes: "СанПиН 3.3686-21, отходы Класса Б",
	},
	{
		id: "def-link-anes-needle",
		service804nCode: "A11.07.012",
		serviceTitle: "Анестезия инфильтрационная / проводниковая",
		inventoryItemId: "mat-anes-needle-30g",
		itemName: "Игла карпульная стоматологическая 30G евростандарт (25 мм)",
		category: "anesthetic",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 2500, // 25.00 ₽
		notes: "Остроконечные отходы Класса Б (СанПиН 2.1.3684-21)",
	},
	{
		id: "def-link-anes-wipe",
		service804nCode: "A11.07.012",
		serviceTitle: "Анестезия инфильтрационная / проводниковая",
		inventoryItemId: "mat-anes-wipe",
		itemName: "Антисептическая спиртовая салфетка стерильная",
		category: "disinfectant",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 500, // 5.00 ₽
		notes: "Обработка места инъекции",
	},

	// ─── 2. ТЕРАПИЯ / ПЛОМБИРОВАНИЕ КАРИЕСА (A16.07.002.001 / A16.07.002) ─
	{
		id: "def-link-caries-composite",
		service804nCode: "A16.07.002.001",
		serviceTitle: "Восстановление зуба пломбой (кариес)",
		inventoryItemId: "mat-composite-filtek",
		itemName: "Светоотверждаемый нанокомпозит (Filtek / Estelite)",
		category: "composite",
		unit: "шприц_гр",
		quantityPerService: 0.2,
		isMandatory: true,
		costPriceKopecks: 38000, // 380.00 ₽ за 0.2г (1900 ₽/г)
		notes: "Норма расхода на 1 поверхность",
	},
	{
		id: "def-link-caries-adhesive",
		service804nCode: "A16.07.002.001",
		serviceTitle: "Восстановление зуба пломбой (кариес)",
		inventoryItemId: "mat-adhesive-single",
		itemName: "Адгезивная система самопротравливающая (7 пок.)",
		category: "composite",
		unit: "dose",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 12000, // 120.00 ₽
		notes: "Разовая доза адгезива",
	},
	{
		id: "def-link-caries-matrix",
		service804nCode: "A16.07.002.001",
		serviceTitle: "Восстановление зуба пломбой (кариес)",
		inventoryItemId: "mat-matrix-sectional",
		itemName: "Секционная матрица контурная металлизированная",
		category: "composite",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 4500, // 45.00 ₽
		notes: "Восстановление контактного пункта",
	},
	{
		id: "def-link-caries-microbrush",
		service804nCode: "A16.07.002.001",
		serviceTitle: "Восстановление зуба пломбой (кариес)",
		inventoryItemId: "mat-microbrush",
		itemName: "Микробраш аппликатор стоматологический",
		category: "other",
		unit: "шт",
		quantityPerService: 2,
		isMandatory: true,
		costPriceKopecks: 1200, // 12.00 ₽
		notes: "Внесение бонда и протравки",
	},
	// Базовый код номенклатуры A16.07.002
	{
		id: "def-link-caries-base-composite",
		service804nCode: "A16.07.002",
		serviceTitle: "Восстановление зуба пломбой",
		inventoryItemId: "mat-composite-filtek",
		itemName: "Светоотверждаемый нанокомпозит (Filtek / Estelite)",
		category: "composite",
		unit: "шприц_гр",
		quantityPerService: 0.2,
		isMandatory: true,
		costPriceKopecks: 38000,
		notes: "Норма расхода на 1 полость",
	},
	{
		id: "def-link-caries-base-adhesive",
		service804nCode: "A16.07.002",
		serviceTitle: "Восстановление зуба пломбой",
		inventoryItemId: "mat-adhesive-single",
		itemName: "Адгезивная система самопротравливающая (7 пок.)",
		category: "composite",
		unit: "dose",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 12000,
		notes: "Разовая доза адгезива",
	},

	// ─── 3. ЭНДОДОНТИЯ (A16.07.030) ───────────────────────────────────────────
	{
		id: "def-link-endo-hypo",
		service804nCode: "A16.07.030",
		serviceTitle: "Эндодонтическое лечение и обработка корневых каналов",
		inventoryItemId: "mat-hypochlorite-3",
		itemName: "Гипохлорит натрия 3% стабилизированный (шприц 5 мл с эндо-иглой)",
		category: "disinfectant",
		unit: "ml",
		quantityPerService: 5,
		isMandatory: true,
		costPriceKopecks: 12000, // 120.00 ₽
		notes: "Ирригация корневого канала (остроконечные отходы Класса Б)",
	},
	{
		id: "def-link-endo-sealer",
		service804nCode: "A16.07.030",
		serviceTitle: "Эндодонтическое лечение и обработка корневых каналов",
		inventoryItemId: "mat-endo-sealer-ahplus",
		itemName: "Эпоксидный силер для постоянной обтурации (AH Plus)",
		category: "endo_file",
		unit: "dose",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 42000, // 420.00 ₽
		notes: "Постоянная обтурация канала",
	},
	{
		id: "def-link-endo-gutta",
		service804nCode: "A16.07.030",
		serviceTitle: "Эндодонтическое лечение и обработка корневых каналов",
		inventoryItemId: "mat-gutta-percha",
		itemName: "Гуттаперчевые конусные штифты",
		category: "endo_file",
		unit: "шт",
		quantityPerService: 3,
		isMandatory: true,
		costPriceKopecks: 4500, // 45.00 ₽
		notes: "Обтурация гуттаперчей",
	},
	{
		id: "def-link-endo-niti",
		service804nCode: "A16.07.030",
		serviceTitle: "Эндодонтическое лечение и обработка корневых каналов",
		inventoryItemId: "mat-niti-rotary-file",
		itemName: "NiTi ротационный машинный файл (ProTaper / WaveOne)",
		category: "endo_file",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 65000, // 650.00 ₽
		notes: "Инструментальная обработка канала",
	},

	// ─── 4. ХИРУРГИЧЕСКОЕ УДАЛЕНИЕ ЗУБА (A16.07.001 / A16.07.006) ────────────
	{
		id: "def-link-surg-scalpel",
		service804nCode: "A16.07.001",
		serviceTitle: "Хирургическое удаление зуба",
		inventoryItemId: "mat-scalpel-15c",
		itemName: "Лезвие скальпеля хирургическое стерильное №15C",
		category: "suture",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 6500, // 65.00 ₽
		notes: "Остроконечные отходы Класса Б (СанПиН 2.1.3684-21)",
	},
	{
		id: "def-link-surg-suture",
		service804nCode: "A16.07.001",
		serviceTitle: "Хирургическое удаление зуба",
		inventoryItemId: "mat-suture-vicryl",
		itemName: "Шовный материал Викрил 4-0 с атравматической иглой",
		category: "suture",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 48000, // 480.00 ₽
		notes: "Ушивание лунки",
	},
	{
		id: "def-link-surg-sponge",
		service804nCode: "A16.07.001",
		serviceTitle: "Хирургическое удаление зуба",
		inventoryItemId: "mat-hemostatic-sponge",
		itemName: "Гемостатическая антисептическая губка Альвостаз",
		category: "other",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 18000, // 180.00 ₽
		notes: "Гемостаз в лунке",
	},
	{
		id: "def-link-surg-gauze",
		service804nCode: "A16.07.001",
		serviceTitle: "Хирургическое удаление зуба",
		inventoryItemId: "mat-gauze-swabs",
		itemName: "Салфетки марлевые стерильные 5х5 см",
		category: "other",
		unit: "шт",
		quantityPerService: 5,
		isMandatory: true,
		costPriceKopecks: 3000, // 30.00 ₽
		notes: "Гемостатический тампон (Класс Б)",
	},
	// A16.07.006 (Сложное удаление зуба)
	{
		id: "def-link-surg-complex-scalpel",
		service804nCode: "A16.07.006",
		serviceTitle: "Сложное удаление зуба",
		inventoryItemId: "mat-scalpel-15c",
		itemName: "Лезвие скальпеля хирургическое стерильное №15C",
		category: "suture",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 6500,
		notes: "Остроконечные отходы Класса Б",
	},
	{
		id: "def-link-surg-complex-suture",
		service804nCode: "A16.07.006",
		serviceTitle: "Сложное удаление зуба",
		inventoryItemId: "mat-suture-vicryl",
		itemName: "Шовный материал Викрил 4-0 с атравматической иглой",
		category: "suture",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 48000,
		notes: "Ушивание лунки",
	},

	// ─── 5. ПРОФЕССИОНАЛЬНАЯ ГИГИЕНА (A16.07.051) ────────────────────────────
	{
		id: "def-link-hyg-powder",
		service804nCode: "A16.07.051",
		serviceTitle: "Комплексная профессиональная гигиена полости рта",
		inventoryItemId: "mat-airflow-powder",
		itemName: "Порошок для воздушно-абразивной полировки AirFlow (саше 25 г)",
		category: "hygiene_paste",
		unit: "pack",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 65000, // 650.00 ₽
		notes: "Air-Flow полировка",
	},
	{
		id: "def-link-hyg-paste",
		service804nCode: "A16.07.051",
		serviceTitle: "Комплексная профессиональная гигиена полости рта",
		inventoryItemId: "mat-prophy-paste",
		itemName: "Паста полировочная абразивная Cleanic",
		category: "hygiene_paste",
		unit: "dose",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 12000, // 120.00 ₽
		notes: "Финишная полировка эмали",
	},
	{
		id: "def-link-hyg-brush",
		service804nCode: "A16.07.051",
		serviceTitle: "Комплексная профессиональная гигиена полости рта",
		inventoryItemId: "mat-prophy-brush",
		itemName: "Щеточка полировочная циркулярная для наконечника",
		category: "bur",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 4500, // 45.00 ₽
		notes: "Механическая чистка",
	},
	{
		id: "def-link-hyg-optragate",
		service804nCode: "A16.07.051",
		serviceTitle: "Комплексная профессиональная гигиена полости рта",
		inventoryItemId: "mat-optragate",
		itemName: "Роторасширитель эластичный OptraGate",
		category: "rubber_dam",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 18500, // 185.00 ₽
		notes: "Изоляция губ и щек",
	},

	// ─── 6. ИЗОЛЯЦИЯ КОФФЕРДАМ (A16.07.002.009) ──────────────────────────────
	{
		id: "def-link-cofferdam-sheet",
		service804nCode: "A16.07.002.009",
		serviceTitle: "Изоляция операционного поля системой коффердам",
		inventoryItemId: "mat-rubber-dam-sheet",
		itemName: "Платок коффердама латексный / бессиликоновый",
		category: "rubber_dam",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 9500, // 95.00 ₽
		notes: "Изоляция зуба",
	},

	// ─── 7. РАДИОВИЗИОГРАФИЯ (A06.07.003) ────────────────────────────────────
	{
		id: "def-link-rvg-sleeve",
		service804nCode: "A06.07.003",
		serviceTitle: "Прицельная радиовизиография",
		inventoryItemId: "mat-rvg-sensor-sleeve",
		itemName: "Одноразовый защитный чехол визиографического датчика",
		category: "other",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 1500, // 15.00 ₽
		notes: "Асептический барьер датчика",
	},

	// ─── 8. БАЗОВЫЕ СИЗ И РАСХОДНИКИ ПРИЕМА (B01.065.001 / САНПИН) ───────────
	{
		id: "def-link-base-gloves",
		service804nCode: "B01.065.001",
		serviceTitle: "Прием врача-стоматолога",
		inventoryItemId: "mat-nitrile-gloves",
		itemName: "Перчатки смотровые нитриловые неопудренные (пара)",
		category: "other",
		unit: "шт",
		quantityPerService: 2,
		isMandatory: true,
		costPriceKopecks: 7000, // 70.00 ₽ (2 пары)
		notes: "СИЗ врача и ассистента (СанПиН 3.3686-21, Класс Б)",
	},
	{
		id: "def-link-base-mask",
		service804nCode: "B01.065.001",
		serviceTitle: "Прием врача-стоматолога",
		inventoryItemId: "mat-medical-mask",
		itemName: "Маска медицинская защитная трехслойная",
		category: "other",
		unit: "шт",
		quantityPerService: 2,
		isMandatory: true,
		costPriceKopecks: 2400, // 24.00 ₽ (2 шт)
		notes: "СИЗ персонала",
	},
	{
		id: "def-link-base-ejector",
		service804nCode: "B01.065.001",
		serviceTitle: "Прием врача-стоматолога",
		inventoryItemId: "mat-saliva-ejector",
		itemName: "Слюноотсос стоматологический одноразовый",
		category: "other",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 1250, // 12.50 ₽
		notes: "Эвакуация слюны (Класс Б)",
	},
	{
		id: "def-link-base-cotton",
		service804nCode: "B01.065.001",
		serviceTitle: "Прием врача-стоматолога",
		inventoryItemId: "mat-cotton-rolls",
		itemName: "Ватные валики стоматологические стерильные №2",
		category: "other",
		unit: "шт",
		quantityPerService: 4,
		isMandatory: true,
		costPriceKopecks: 1200, // 12.00 ₽ (4 шт)
		notes: "Изоляция слюны (Класс Б)",
	},
	{
		id: "def-link-base-bib",
		service804nCode: "B01.065.001",
		serviceTitle: "Прием врача-стоматолога",
		inventoryItemId: "mat-patient-bib",
		itemName: "Салфетка нагрудная стоматологическая двухслойная",
		category: "other",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 800, // 8.00 ₽
		notes: "Защита одежды пациента",
	},
];
