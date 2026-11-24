/**
 * packages/shared/src/types/surgery.ts
 *
 * Канонические типы, нормы и Zod-схемы хирургической стоматологии и имплантологии.
 * Стандарты: Mandate 8e (Автономия врача), Mandate 8i (Суверенитет стоматологического контекста),
 * Mandate 8s (Анти-блоат), СанПиН 3.3686-21 (Класс Б отходы), Номенклатура 804н, Форма 043/у.
 *
 * Без стационарного госпитального блоата:
 * НЕТ общему наркозу, НЕТ койко-дням, НЕТ трансфузиям крови, НЕТ ПКУ наркотических анальгетиков,
 * НЕТ комиссиям из 3 человек для списания карпул или установки имплантатов.
 * Мягкий овердрафт склада (canProceed: true): задержка накладной никогда не блокирует операцию.
 */

import { z } from "zod";
import { permanentToothNumberFdiSchema } from "../schemas/implantologyAndPrescriptionSchemas.js";

export const SURGICAL_OPERATION_CATEGORIES = [
	"implant",
	"extraction",
	"perio_surgery",
	"sinus_gbr",
	"emergency",
] as const;

export type SurgicalOperationCategory = (typeof SURGICAL_OPERATION_CATEGORIES)[number];

export const surgicalOperationCategorySchema = z.enum(SURGICAL_OPERATION_CATEGORIES);

export interface SurgicalServiceItem {
	readonly code: string;
	readonly nameRu: string;
	readonly name: string;
	readonly priceRub: number;
	readonly quantity: number;
	readonly suggestedPriceRub?: number | undefined;
	readonly toothNumber?: number | undefined;
	readonly stageKind?: string | undefined;
	readonly isPrimary?: boolean | undefined;
	readonly priceKopecks?: bigint | number | undefined;
}

export type SurgicalService804n = SurgicalServiceItem;

export const surgicalServiceItemSchema = z
	.object({
		code: z.string().min(1),
		nameRu: z.string().min(1).optional(),
		name: z.string().min(1).optional(),
		priceRub: z.number().nonnegative(),
		quantity: z.number().positive().default(1),
		suggestedPriceRub: z.number().nonnegative().optional(),
		toothNumber: z.number().int().optional(),
		stageKind: z.string().optional(),
		isPrimary: z.boolean().optional(),
		priceKopecks: z.union([z.bigint(), z.number()]).optional(),
	})
	.strict()
	.transform((val) => ({
		...val,
		nameRu: val.nameRu || val.name || "Хирургическая манипуляция",
		name: val.name || val.nameRu || "Хирургическая манипуляция",
	}));

export const surgicalService804nSchema = surgicalServiceItemSchema;

export interface SurgicalMaterialItem {
	readonly name: string;
	readonly unit: string;
	readonly quantity: number;
	readonly isWarehouseCritical: boolean;
}

export const surgicalMaterialItemSchema = z
	.object({
		name: z.string().min(1),
		unit: z.string().min(1),
		quantity: z.number().positive(),
		isWarehouseCritical: z.boolean().default(false),
	})
	.strict();

export interface SurgicalOperationNorm {
	readonly id: string;
	readonly title: string;
	readonly shortBadge: string;
	readonly category: SurgicalOperationCategory;
	readonly icd10: string;
	readonly icd10Label: string;
	readonly serviceCode?: string;
	readonly serviceSubcode?: string;
	readonly serviceTitle?: string;
	readonly code804n?: string;
	readonly code804nSubcode?: string;
	readonly service804nTitle?: string;
	readonly defaultToothFdi?: number;
	readonly defaultPriceRub?: number;
	readonly priceRub?: number;
	readonly priceKopecks?: bigint;
	readonly standardProtocolTextRu: string;
	readonly anesthesiaDefaultRu: string;
	readonly postOpRecommendationsRu: string;
	readonly catalogServices?: readonly SurgicalServiceItem[];
	readonly order804nServices?: readonly SurgicalServiceItem[];
	readonly requiredMaterials: readonly SurgicalMaterialItem[];
}

export const surgicalOperationNormSchema = z
	.object({
		id: z.string().min(1),
		title: z.string().min(1),
		shortBadge: z.string().min(1),
		category: surgicalOperationCategorySchema,
		icd10: z.string().min(1),
		icd10Label: z.string().min(1),
		serviceCode: z.string().optional(),
		serviceSubcode: z.string().optional(),
		serviceTitle: z.string().optional(),
		code804n: z.string().optional(),
		code804nSubcode: z.string().optional(),
		service804nTitle: z.string().optional(),
		defaultToothFdi: z.number().int().optional(),
		defaultPriceRub: z.number().nonnegative().optional(),
		priceRub: z.number().nonnegative().optional(),
		priceKopecks: z.union([z.bigint(), z.number()]).optional(),
		standardProtocolTextRu: z.string().min(1),
		anesthesiaDefaultRu: z.string().min(1),
		postOpRecommendationsRu: z.string().min(1),
		catalogServices: z.array(surgicalServiceItemSchema).optional(),
		order804nServices: z.array(surgicalServiceItemSchema).optional(),
		requiredMaterials: z.array(surgicalMaterialItemSchema),
	})
	.strict();

/**
 * Статус мягкого овердрафта склада (Мандат 8e):
 * canProceed ВСЕГДА true — операция врача не блокируется.
 */
export interface SurgicalWarehouseOverdraftStatus {
	readonly hasOverdraft: boolean;
	readonly warningRu: string;
	readonly detailsRu: string;
	readonly pendingItems: readonly string[];
	readonly canProceed: true;
}

export const surgicalWarehouseOverdraftStatusSchema = z
	.object({
		hasOverdraft: z.boolean(),
		warningRu: z.string(),
		detailsRu: z.string(),
		pendingItems: z.array(z.string()),
		canProceed: z.literal(true),
	})
	.strict();

export type MischBoneDensity = "D1" | "D2" | "D3" | "D4" | "D5";
export type ImplantCapKind = "fdm" | "plug";

export interface FastImplantPassportData {
	readonly passportId?: string | undefined;
	readonly toothFdi: number;
	readonly brand: string;
	readonly model: string;
	readonly catalogArticle?: string | undefined;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly torqueNcm: number;
	readonly isqDay0?: number | undefined;
	readonly baselineIsq?: number | undefined;
	readonly isqMean?: number | undefined;
	readonly boneDensity: MischBoneDensity;
	readonly capType?: ImplantCapKind | undefined;
	readonly lotNumber?: string | undefined;
	readonly serialNumber?: string | undefined;
	readonly dateIso?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly isWarehouseOverdraft?: boolean | undefined;
	readonly inventoryItemId?: string | undefined;
	readonly expirationDate?: string | undefined;
	readonly operationPriceRub?: number | undefined;
	readonly implantCostRub?: number | undefined;
	readonly consumablesCostRub?: number | undefined;
	readonly doctorGrossMarginRub?: number | undefined;
	readonly netDoctorIncomeRub?: number | undefined;
	readonly operationPriceKopecks?: bigint | number | undefined;
	readonly implantCostKopecks?: bigint | number | undefined;
	readonly consumablesCostKopecks?: bigint | number | undefined;
	readonly doctorGrossMarginKopecks?: bigint | number | undefined;
	readonly netDoctorIncomeKopecks?: bigint | number | undefined;
	readonly isImmediateLoadingFeasible?: boolean | undefined;
	readonly osteointegrationExpectedDate?: string | undefined;
	readonly boneGraftMaterial?: string | undefined;
	readonly membraneUsed?: string | undefined;
	readonly sutureMaterial?: string | undefined;
	readonly notes?: string | undefined;
}

export const fastImplantPassportDataSchema = z
	.object({
		passportId: z.string().optional(),
		toothFdi: permanentToothNumberFdiSchema,
		brand: z.string().min(1),
		model: z.string().min(1),
		catalogArticle: z.string().optional(),
		diameterMm: z.number().positive(),
		lengthMm: z.number().positive(),
		torqueNcm: z.number().positive(),
		isqDay0: z.number().int().positive().optional(),
		boneDensity: z.enum(["D1", "D2", "D3", "D4", "D5"]),
		capType: z.enum(["fdm", "plug"]).optional(),
		lotNumber: z.string().optional(),
		serialNumber: z.string().optional(),
		dateIso: z.string().optional(),
		patientName: z.string().optional(),
		patientId: z.string().optional(),
		doctorName: z.string().optional(),
		doctorId: z.string().optional(),
		isWarehouseOverdraft: z.boolean().optional(),
		inventoryItemId: z.string().optional(),
		expirationDate: z.string().optional(),
		operationPriceRub: z.number().optional(),
		implantCostRub: z.number().optional(),
		consumablesCostRub: z.number().optional(),
		doctorGrossMarginRub: z.number().optional(),
		netDoctorIncomeRub: z.number().optional(),
		operationPriceKopecks: z.union([z.bigint(), z.number()]).optional(),
		implantCostKopecks: z.union([z.bigint(), z.number()]).optional(),
		consumablesCostKopecks: z.union([z.bigint(), z.number()]).optional(),
		doctorGrossMarginKopecks: z.union([z.bigint(), z.number()]).optional(),
		netDoctorIncomeKopecks: z.union([z.bigint(), z.number()]).optional(),
		isImmediateLoadingFeasible: z.boolean().optional(),
		osteointegrationExpectedDate: z.string().optional(),
		boneGraftMaterial: z.string().optional(),
		membraneUsed: z.string().optional(),
		sutureMaterial: z.string().optional(),
		notes: z.string().optional(),
	})
	.strict();

export interface StandardImplantationParams {
	readonly toothFdi?: number | undefined;
	readonly brand?: string | undefined;
	readonly model?: string | undefined;
	readonly diameterMm?: number | undefined;
	readonly lengthMm?: number | undefined;
	readonly torqueNcm?: number | undefined;
	readonly isq?: number | undefined;
	readonly capType?: ImplantCapKind | undefined;
	readonly sutureMaterial?: string | undefined;
	readonly postOpXray?: boolean | undefined;
}

export const standardImplantationParamsSchema = z
	.object({
		toothFdi: z.number().int().optional(),
		brand: z.string().optional(),
		model: z.string().optional(),
		diameterMm: z.number().positive().optional(),
		lengthMm: z.number().positive().optional(),
		torqueNcm: z.number().positive().optional(),
		isq: z.number().int().positive().optional(),
		capType: z.enum(["fdm", "plug"]).optional(),
		sutureMaterial: z.string().optional(),
		postOpXray: z.boolean().optional(),
	})
	.strict();

/**
 * Zod-схема создания протокола операции (Форма 043/у)
 */
export const createSurgicalProtocolSchema = z
	.object({
		visitId: z.string().uuid().optional().nullable(),
		patientId: z.string().uuid(),
		doctorId: z.string().uuid().optional().nullable(),
		normId: z.string().default("surgery_implant_standard"),
		toothNumberFdi: z.number().int().min(11).max(85).optional().nullable(),
		teeth: z.array(z.number().int().min(11).max(85)).optional().default([]),
		protocolText: z.string().min(10),
		anesthesiaText: z.string().optional().nullable(),
		recommendationsText: z.string().optional().nullable(),
		services: z.array(surgicalServiceItemSchema).default([]),
		services804n: z.array(surgicalServiceItemSchema).default([]),
		materialsUsed: z.array(surgicalMaterialItemSchema).default([]),
		isOverdraftActive: z.boolean().default(false),
		notes: z.string().optional().nullable(),
	})
	.strict()
	.superRefine((data, ctx) => {
		const isImplant =
			data.normId.toLowerCase().includes("implant") ||
			data.normId === "scen-implant" ||
			data.normId === "surgery_implant_standard";

		if (isImplant) {
			if (
				data.toothNumberFdi != null &&
				data.toothNumberFdi >= 51 &&
				data.toothNumberFdi <= 85
			) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Установка дентального имплантата в область молочного зуба (#${data.toothNumberFdi}) категорически запрещена анатомическим протоколом`,
					path: ["toothNumberFdi"],
				});
			}

			if (data.teeth && Array.isArray(data.teeth)) {
				for (let i = 0; i < data.teeth.length; i++) {
					const t = data.teeth[i];
					if (t != null && t >= 51 && t <= 85) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: `Установка дентального имплантата в область молочного зуба (#${t}) категорически запрещена анатомическим протоколом`,
							path: ["teeth", i],
						});
					}
				}
			}
		}
	});

export type CreateSurgicalProtocolInput = z.infer<typeof createSurgicalProtocolSchema>;

/**
 * Zod-схема быстрого 1-клик списания расходников у стоматологического кресла (Мандаты 8e, 8s, 8n).
 * Для карпул анестетиков — отходы Класса Б (СанПиН 3.3686-21) в 1 клик медсестрой без комиссий.
 */
export const surgicalQuickDeductSchema = z
	.object({
		visitId: z.string().uuid().optional().nullable(),
		bundleType: z.enum([
			"surgery",
			"implant",
			"sinus_gbr",
			"surgery_extraction",
			"surgery_apicoectomy",
			"anesthesia_carpule",
		]),
		toothNumberFdi: z.number().int().min(11).max(85).optional().nullable(),
		carpulesCount: z.number().int().positive().default(1),
		drugBrandName: z.string().default("Артикаин 1:100 000"),
		isNurseAction: z.boolean().default(true),
		notes: z.string().optional().nullable(),
	})
	.strict();

export type SurgicalQuickDeductInput = z.infer<typeof surgicalQuickDeductSchema>;

// Канонические тексты норм операций
export const DENTAL_IMPLANTATION_NORM_TEXT =
	"Инфильтрационная анестезия Артикаин 1:100 000 1.7 мл. Разрез по гребню альвеолярного отростка, отслоен слизисто-надкостничный лоскут. Препарирование ложа фрезами по хирургическому протоколу с охлаждением физраствором. Установлен дентальный имплантат, первичная торк-стабильность 35 Н·см. Установлен формирователь десны / винт-заглушка. Ушивание раны шовным материалом ПГА 4-0. Гемостаз полный. Рекомендации даны.";

export const SIMPLE_EXTRACTION_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Круговая связка зуба отслоена гладилкой. Наложены щипцы / элеватор, продвинуты под десну, фиксированы. Люксация элеватором и ротация щипцами. Тракция зуба из альвеолы. Тщательный кюретаж лунки острой ложкой, ревизия, удаление грануляций. Антисептическая обработка 0.05% хлоргексидином. Местный гемостаз: в лунку внесен Альвожиль / гемостатическая губка. Давящий марлевый тампон. Гемостаз полный. Рекомендации даны.";

export const ATRAUMATIC_EXTRACTION_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Атравматичное отслаивание круговой связки зуба микропериотомом. Поочередное введение люксатора по длинной оси зуба в периодонтальную щель с мезиальной и дистальной стороны, щадящее расширение лунки без повреждения вестибулярной кортикальной пластинки альвеолы. Атравматичное извлечение зуба щипцами без ротации. Тщательный кюретаж лунки острой ложкой, удаление грануляций. Антисептическая обработка 0.05% раствором хлоргексидина. Контроль целостности стенок лунки: вестибулярная пластинка сохранена интактной. Местный гемостаз: коллагеновая губка, давящий марлевый тампон. Гемостаз полный. Рекомендации даны.";

export const SOCKET_PRESERVATION_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Атравматичная экстракция зуба периотомом/люксатором с сохранением костных стенок альвеолы. Тщательный кюретаж лунки, ревизия дна и стенок, деэпителизация краев десны. Антисептическая обработка 0.05% хлоргексидином. Консервация лунки: заполнение объема альвеолы гемостатическим коллагеновым конусом / остеопластической губкой до уровня альвеолярного гребня для предотвращения атрофии. Мобилизация десневых сосочков, наложение крестообразного шва ПГА 4-0 для стабилизации коллагенового матрикса. Гемостаз полный. Рекомендации даны.";

export const ALVEOLITIS_CURETTAGE_NORM_TEXT =
	"Жалобы на острую непрекращающуюся боль в области лунки удаленного зуба, иррадиирующую по ходу ветвей тройничного нерва, гнилостный запах изо рта. Анестезия проводниковая/инфильтрационная Sol. Articaini 4% 1:100 000 — 1.7 мл. Осмотр: лунка частично заполнена распавшимся серым сгустком, стенки обнажены, пальпация болезненна. Механический кюретаж лунки острой костной ложкой, удаление некротических масс и осколков до появления свежего точечного кровотечения со стенок. Обильное антисептическое промывание теплым 0.05% хлоргексидином. Внесение в лунку антисептической пасты для лунок с гемостатическими волокнами. Наложение рыхлого марлевого тампона. Боль купирована, гемостаз полный. Назначены НПВП, ротовые ванночки с антисептиком со 2 дня. Осмотр через 2 дня.";

export const ATYPICAL_EXTRACTION_NORM_TEXT =
	"Проводниковая торусальная и инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл. Разрез слизистой в ретромолярной области, выкраивание слизисто-надкостничного лоскута. Трепанация кортикальной пластинки, сепарация коронки и корней твердосплавным бором Lindemann с охлаждением физраствором. Атравматичная люксация и извлечение фрагментов элеватором. Тщательный кюретаж лунки, ревизия, удаление грануляций. Лунка заполнена гемостатической коллагеновой губкой. Рана ушита узловыми швами ПГА 4-0 (ушивание раны). Гемостаз полный. Рекомендации даны.";

export const COMPLEX_EXTRACTION_NORM_TEXT =
	"Инфильтрационная и проводниковая анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл. Разрез слизистой оболочки, отслаивание слизисто-надкостничного лоскута. Сепарация корней бором с водяным охлаждением (хирургический бор Lindemann). Люксация элеватором (атравматичная люксация), атравматичная тракция фрагментов корней щипцами. Тщательный кюретаж лунки острой ложкой, удаление грануляций. Антисептическая обработка 0.05% хлоргексидином. Местный гемостаз гемостатической губкой. Сближение краев лунки, наложение швов (швы ПГА 4-0). Давящий марлевый тампон. Гемостаз полный. Рекомендации даны.";

export const SINUS_LIFT_GBR_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Трапециевидный разрез в боковом отделе верхней челюсти, скелетирование передне-боковой стенки верхнечелюстного синуса. Формирование латерального окна пьезотомом. Элевация мембраны Шнайдера без перфорации. Субантральное пространство заполнено ксенографтом. Барьерная мембрана фиксирована пинами. Послойное ушивание ПГА 4-0. Гемостаз полный. Рекомендации даны.";

export const CLOSED_SINUS_LIFT_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Разрез по гребню альвеолярного отростка, отслоен слизисто-надкостничный лоскут. Пилотное препарирование костного ложа фрезами с обильным охлаждением физраствором с недоходом до дна пазухи 1 мм. Трансальвеолярная элевация дна верхнечелюстного синуса остеотомами Саммерса (закрытый синус-лифтинг). Целостность мембраны Шнайдера подтверждена пробой Вальсальвы (носоротовой тест отрицательный). Внесение остеопластического материала (ксенографт 0.5 г). Установка дентального имплантата с первичной стабильностью 35 Н·см. Установка винта-заглушки / формирователя десны. Ушивание раны шовным материалом ПГА 4-0 без натяжения. Гемостаз полный. Рекомендации даны.";

export const PERICORONITIS_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Иссечение воспаленного слизистого капюшона над коронкой ретинированного зуба скальпелем. Промывание антисептиками (хлоргексидин 0.05%), йодоформная турунда. Гемостаз полный. Рекомендации даны.";

export const PERIOSTOTOMY_NORM_TEXT =
	"Инфильтрационная анестезия по переходной складке Sol. Articaini 4% 1:100 000 — 1.7 мл. Разрез слизистой и надкостницы длиной 1.5–2 см по переходной складке в области проекции верхушки причинного зуба до кости. Отслоение надкостницы распатором, эвакуация гнойного экссудата. Антисептическая обработка 0.05% хлоргексидином. Введение резинового ленточного дренажа-выпускника для постоянного дренирования раны. Гемостаз стерильными марлевыми салфетками. Рекомендации даны, явка на следующий день.";

export const APICOECTOMY_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Трапециевидный разрез слизистой в проекции верхушки причинного зуба, отслоен слизисто-надкостничный лоскут. Трепанация кортикальной пластинки шаровидным бором с водяным охлаждением. Резекция верхушки корня на 3 мм под углом 90° твердосплавным фиссурным бором. Цистэктомия/кюретаж периапикального очага. Ультразвуковое ретроградное препарирование апикальной части канала насадкой КСТ на глубину 3 мм. Ретроградное пломбирование цементом МТА (минерал триоксид агрегат). Контроль гемостаза. Ушивание раны узловыми швами ПГА / Монофиламент 5-0. Контрольная радиовизиография: резекция выполнена, ретроградная пломба герметична. Рекомендации даны.";

export const MUCOGINGIVAL_FGG_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл в области реципиентного и донорского ложа (твердое нёбо). Формирование расщепленного реципиентного ложа лезвием #15C с деэпителизацией десневых сосочков. Забор свободного десневого трансплантата (СДТ) с твердого нёба толщиной 1.5 мм. Донорская зона на нёбе ушита гемостатической губкой и крестообразным швом. Трансплантат адаптирован к надкостнице в области дефекта, фиксирован узловыми и обвивными монофиламентными швами 6-0 без натяжения. Гемостаз полный. Рекомендации даны.";

export const MUCOGINGIVAL_CTG_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Формирование расщепленного конверта / туннеля в области рецессии. Забор субэпителиального соединительнотканного трансплантата (ССТ) методом одного разреза с нёба. Донорская зона ушита наглухо швом ПГА 5-0. Трансплантат позиционирован в ложе, фиксирован к надкостнице микрохирургическими монофиламентными швами 6-0. Корональное смещение покровного лоскута, послойное ушивание. Гемостаз полный. Рекомендации даны.";

export const RECESSION_CAF_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Внутрибороздковые разрезы и косые субмаргинальные разрезы по методике Зуккелли (Zucchelli). Деэпителизация анатомических сосочков. Отслоение комбинированного полнослойно-расщепленного лоскута. Механическая и ультразвуковая обработка корня зуба, медикаментозное кондиционирование 24% ЭДТА. Корональное позиционирование лоскута выше цементно-эмалевой границы на 1 мм без натяжения. Фиксация сосочков подвесными матрасными монофиламентными швами 6-0. Гемостаз полный. Рекомендации даны.";

export const RECESSION_TUNNEL_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Внутрибороздковые разрезы, атравматичная субпериостальная туннелизация микрораспаторами и туннельными ножами без вертикальных разрезов. Мобилизация сосочков с сохранением их кровоснабжения. Введение и позиционирование соединительнотканного трансплантата (ССТ) в туннель. Фиксация трансплантата и корональное смещение комплекса десны матрасными обвивными монофиламентными швами 6-0. Гемостаз полный. Рекомендации даны.";

export const PERIO_FLAP_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Внутрибороздковые и межзубные разрезы с сохранением десневых сосочков по Видману-Нейману. Отслоение слизисто-надкостничного лоскута. Тщательный кюретаж пародонтальных карманов остеотропными кюретами Грейси (Gracey), ультразвуковой скейлинг корней, удаление грануляций и поддесневого камня. Антисептическая обработка хлоргексидином 0.05%. Моделирование краев лоскута, адаптация в межзубных промежутках, ушивание межзубными матрасными швами ПГА 5-0 / монофиламент 5-0. Наложение пародонтальной защитной повязки. Рекомендации даны.";

export const FRENULOPLASTY_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 0.8 мл. Иссечение рубцово-измененного тяжа короткой уздечки скальпелем / лазером (френулотомия/френулэктомия). Мобилизация краев слизистой оболочки, устранение мышечного натяжения с десневого края. Наложение узловых швов ПГА 5-0 / монофиламент 6-0. Контроль натяжения: десневой сосочек неподвижен при натяжении губы. Гемостаз полный. Рекомендации даны.";

export const VESTIBULOPLASTY_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Разрез слизистой оболочки по границе прикрепленной десны (по Кларку / Казаньяну). Острое и тупое препарирование подслизистого слоя, апикальное смещение мышечно-сухожильных волокон от надкостницы на глубину 10–12 мм. Фиксация мобилизованного лоскута к надкостнице в глубине новообразованного преддверия узловыми швами ПГА 5-0. Раневая поверхность надкостницы укрыта гемостатической коллагеновой пластиной. Гемостаз полный. Рекомендации даны.";

export const CROWN_LENGTHENING_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Внутрибороздковый разрез, обратный скошенный разрез десны по контуру будущего зенита. Отслоение слизисто-надкостничного лоскута. Остеоэктомия и остеопластика хирургическим бором с обильным водяным охлаждением для восстановления биологической ширины (3 мм от будущего края реставрации до гребня кости). Сглаживание костных краев, антисептическая обработка. Адаптация лоскута, наложение узловых монофиламентных швов 6-0. Гемостаз полный. Рекомендации даны.";

/**
 * Канонический реестр 1-клик хирургических норм (Номенклатура 804н, Форма 043/у).
 */
export const CANONICAL_SURGICAL_OPERATION_NORMS: readonly SurgicalOperationNorm[] = [
	{
		id: "surgery_implant_standard",
		title: "Дентальная имплантация (Норма)",
		shortBadge: "Имплантация 35 Н·см",
		category: "implant",
		icd10: "K08.1",
		icd10Label: "Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		code804n: "A16.07.054",
		service804nTitle: "Внутрикостная дентальная имплантация",
		defaultToothFdi: 46,
		defaultPriceRub: 35000,
		priceKopecks: 3500000n,
		standardProtocolTextRu: DENTAL_IMPLANTATION_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Артикаин 1:100 000 1.7 мл",
		postOpRecommendationsRu:
			"Холод на область операции 15 мин каждые 2 часа в первый день. Ванночки с 0.05% хлоргексидином с 2-х суток. Исключить горячее, бани, физ. нагрузки 7 дней. Прием НПВП и антибиотикотерапия по назначению. Осмотр через 7 дней.",
		order804nServices: [
			{
				code: "A16.07.054",
				nameRu: "Внутрикостная дентальная имплантация (установка имплантата)",
				name: "Внутрикостная дентальная имплантация (установка имплантата)",
				priceRub: 35000,
				priceKopecks: 3500000n,
				quantity: 1,
				suggestedPriceRub: 35000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.054.002",
				nameRu: "Установка формирователя десны (ФДМ) / винта-заглушки",
				name: "Установка формирователя десны (ФДМ) / винта-заглушки",
				priceRub: 3500,
				priceKopecks: 350000n,
				quantity: 1,
				suggestedPriceRub: 3500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				priceRub: 1500,
				priceKopecks: 150000n,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Дентальный имплантат титановый", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ name: "Формирователь десны / винт-заглушка", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ name: "Шовный материал рассасывающийся ПГА 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_extraction_simple",
		title: "Простое удаление зуба (Норма)",
		shortBadge: "Удаление простое",
		category: "extraction",
		icd10: "K08.8",
		icd10Label: "Другие уточненные изменения зубов и их опорного аппарата",
		code804n: "A16.07.001",
		code804nSubcode: "A16.07.001.001",
		service804nTitle: "Удаление зуба (простое)",
		defaultToothFdi: 36,
		defaultPriceRub: 3500,
		priceKopecks: 350000n,
		standardProtocolTextRu: SIMPLE_EXTRACTION_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Марлевый тампон сплюнуть через 20 минут. Не полоскать рот 24 часа. Не принимать горячую ванну и острую пищу 3 дня. При болях — Нимесил 1 пак.",
		order804nServices: [
			{
				code: "A16.07.001",
				nameRu: "Удаление постоянного зуба (простое)",
				name: "Удаление постоянного зуба (простое)",
				priceRub: 3500,
				priceKopecks: 350000n,
				quantity: 1,
				suggestedPriceRub: 3500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.013",
				nameRu: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
				name: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
				priceRub: 1200,
				priceKopecks: 120000n,
				quantity: 1,
				suggestedPriceRub: 1200,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
			{ name: "Губка гемостатическая коллагеновая Альвожиль", unit: "доза", quantity: 1, isWarehouseCritical: false },
			{ name: "Марлевый стерильный шарик/тампон", unit: "шт.", quantity: 2, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_extraction_atraumatic",
		title: "Атравматичное удаление зуба люксатором (Норма)",
		shortBadge: "Атравматичное удаление",
		category: "extraction",
		icd10: "K08.8",
		icd10Label: "Другие уточненные изменения зубов и их опорного аппарата",
		code804n: "A16.07.001.001",
		code804nSubcode: "A16.07.001.001",
		service804nTitle: "Удаление постоянного зуба атравматичное с сохранением кортикальной пластинки",
		defaultToothFdi: 11,
		defaultPriceRub: 4500,
		priceKopecks: 450000n,
		standardProtocolTextRu: ATRAUMATIC_EXTRACTION_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Марлевый тампон сплюнуть через 20 минут. Не полоскать лунку 24 часа. Не принимать горячую пищу и ванну 3 дня. Прием НПВП при болях.",
		order804nServices: [
			{
				code: "A16.07.001.001",
				nameRu: "Удаление постоянного зуба (атравматичное люксатором)",
				name: "Удаление постоянного зуба (атравматичное люксатором)",
				priceRub: 4500,
				priceKopecks: 450000n,
				quantity: 1,
				suggestedPriceRub: 4500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.013",
				nameRu: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
				name: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
				priceRub: 1200,
				priceKopecks: 120000n,
				quantity: 1,
				suggestedPriceRub: 1200,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
			{ name: "Губка гемостатическая коллагеновая Альвостаз", unit: "доза", quantity: 1, isWarehouseCritical: false },
			{ name: "Марлевый стерильный шарик/тампон", unit: "шт.", quantity: 2, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_socket_preservation",
		title: "Консервация лунки коллагеновым конусом под имплантацию (Норма)",
		shortBadge: "Консервация лунки",
		category: "extraction",
		icd10: "K08.8",
		icd10Label: "Другие уточненные изменения зубов и их опорного аппарата",
		code804n: "A16.07.001.001",
		code804nSubcode: "A16.07.041.001",
		service804nTitle: "Удаление зуба с консервацией лунки биодеградируемым конусом",
		defaultToothFdi: 21,
		defaultPriceRub: 6000,
		priceKopecks: 600000n,
		standardProtocolTextRu: SOCKET_PRESERVATION_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Не прикасаться языком к конусу и швам! Ванночки с 0.05% хлоргексидином со 2 дня. Исключить грубую и горячую пищу 7 дней. Снятие швов через 10-12 дней.",
		order804nServices: [
			{
				code: "A16.07.001.001",
				nameRu: "Атравматичное удаление зуба с сохранением лунки",
				name: "Атравматичное удаление зуба с сохранением лунки",
				priceRub: 4500,
				priceKopecks: 450000n,
				quantity: 1,
				suggestedPriceRub: 4500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.041.001",
				nameRu: "Консервация лунки остеопластическим коллагеновым конусом",
				name: "Консервация лунки остеопластическим коллагеновым конусом",
				priceRub: 6000,
				priceKopecks: 600000n,
				quantity: 1,
				suggestedPriceRub: 6000,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение крестообразного шва на десну (ПГА 4-0)",
				name: "Наложение крестообразного шва на десну (ПГА 4-0)",
				priceRub: 1500,
				priceKopecks: 150000n,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
			{ name: "Коллагеновый конус гемостатический", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ name: "Шовный материал рассасывающийся ПГА 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_alveolitis_curettage",
		title: "Лечение альвеолита: ревизия, кюретаж лунки и антисептический компресс (Норма)",
		shortBadge: "Лечение альвеолита",
		category: "emergency",
		icd10: "K10.3",
		icd10Label: "Альвеолит челюсти",
		code804n: "A16.07.013",
		service804nTitle: "Кюретаж лунки удаленного зуба при альвеолите",
		defaultToothFdi: 36,
		defaultPriceRub: 2500,
		priceKopecks: 250000n,
		standardProtocolTextRu: ALVEOLITIS_CURETTAGE_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная / проводниковая анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Не выполаскивать лекарственный компресс из лунки! Ванночки с 0.05% хлоргексидином со 2 дня. Прием НПВП по назначению. Осмотр через 2 дня.",
		order804nServices: [
			{
				code: "A16.07.013",
				nameRu: "Кюретаж лунки удаленного зуба при альвеолите",
				name: "Кюретаж лунки удаленного зуба при альвеолите",
				priceRub: 2500,
				priceKopecks: 250000n,
				quantity: 1,
				suggestedPriceRub: 2500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
			{ name: "Антисептический компресс Альвожил", unit: "доза", quantity: 1, isWarehouseCritical: false },
			{ name: "Марлевый стерильный шарик/тампон", unit: "шт.", quantity: 2, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_extraction_atypical",
		title: "Атипичное удаление зуба мудрости (Норма)",
		shortBadge: "Атипичное удаление 8-ки",
		category: "extraction",
		icd10: "K01.1",
		icd10Label: "Ретинированные зубы",
		code804n: "A16.07.024",
		service804nTitle: "Операция удаления ретинированного, дистопированного или сверхкомплектного зуба",
		defaultToothFdi: 48,
		standardProtocolTextRu: ATYPICAL_EXTRACTION_NORM_TEXT,
		anesthesiaDefaultRu: "Проводниковая торусальная и инфильтрационная Sol. Articaini 4% 1:100 000 — 3.4 мл",
		postOpRecommendationsRu:
			"Холод на щеку по 15 минут в первые 3 часа. Ванночки с антисептиком со 2-х суток. Не греть! Антибиотикотерапия (Амоксиклав 1000 мг 2 р/д 5 дней), НПВП (Кетанов/Нимесил). Явка на осмотр и снятие швов через 7–8 дней.",
		order804nServices: [
			{
				code: "A16.07.024",
				nameRu: "Операция удаления ретинированного/дистопированного зуба",
				name: "Операция удаления ретинированного/дистопированного зуба",
				priceRub: 8500,
				priceKopecks: 850000n,
				quantity: 1,
				suggestedPriceRub: 8500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				priceRub: 1500,
				priceKopecks: 150000n,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.016",
				nameRu: "Проводниковая анестезия (Торусальная / Мандибулярная)",
				name: "Проводниковая анестезия (Торусальная / Мандибулярная)",
				priceRub: 1100,
				priceKopecks: 110000n,
				quantity: 1,
				suggestedPriceRub: 1100,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 2, isWarehouseCritical: false },
			{ name: "Шовный материал рассасывающийся ПГА 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Губка гемостатическая антисептическая", unit: "доза", quantity: 1, isWarehouseCritical: false },
			{ name: "Хирургический твердосплавный бор Lindemann", unit: "шт.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_sinus_lift_gbr",
		title: "Синус-лифтинг и НКР аугментация (Норма)",
		shortBadge: "Синус-лифтинг + НКР",
		category: "sinus_gbr",
		icd10: "K08.2",
		icd10Label: "Атрофия беззубого альвеолярного края",
		code804n: "A16.07.041",
		service804nTitle: "Костная пластика челюстно-лицевой области с применением биодеградируемых материалов (синус-лифтинг)",
		defaultToothFdi: 16,
		standardProtocolTextRu: SINUS_LIFT_GBR_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Категорический запрет: не сморкаться, чихать с открытым ртом, не летать самолетом и не нырять 3 недели! Сосудосуживающие капли в нос (Тизин/Називин 5 дней). Антибиотики и НПВП строго по схеме. Контрольный осмотр через 3 и 10 дней.",
		order804nServices: [
			{
				code: "A16.07.041",
				nameRu: "Синус-лифтинг (открытый/закрытый) с костной аугментацией",
				name: "Синус-лифтинг (открытый/закрытый) с костной аугментацией",
				priceRub: 45000,
				priceKopecks: 4500000n,
				quantity: 1,
				suggestedPriceRub: 45000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.041.001",
				nameRu: "Использование костнопластического материала (ксенографт 0.5 г)",
				name: "Использование костнопластического материала (ксенографт 0.5 г)",
				priceRub: 18000,
				priceKopecks: 1800000n,
				quantity: 1,
				suggestedPriceRub: 18000,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.041.002",
				nameRu: "Фиксация коллагеновой барьерной мембраны пинами",
				name: "Фиксация коллагеновой барьерной мембраны пинами",
				priceRub: 14000,
				priceKopecks: 1400000n,
				quantity: 1,
				suggestedPriceRub: 14000,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение швов на слизистую оболочку рта (ПГА 4-0)",
				name: "Наложение швов на слизистую оболочку рта (ПГА 4-0)",
				priceRub: 1500,
				priceKopecks: 150000n,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Остеопластический материал ксенографт 0.5 г", unit: "флак.", quantity: 1, isWarehouseCritical: true },
			{ name: "Коллагеновая барьерная мембрана 20x20 мм", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ name: "Титановые микропины для фиксации мембран", unit: "шт.", quantity: 2, isWarehouseCritical: false },
			{ name: "Шовный материал рассасывающийся ПГА 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 2, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_sinus_lift_closed",
		title: "Закрытый (трансальвеолярный) синус-лифтинг остеотомами",
		shortBadge: "Закрытый синус",
		category: "sinus_gbr",
		icd10: "K08.2",
		icd10Label: "Атрофия беззубого альвеолярного края",
		code804n: "A16.07.041",
		code804nSubcode: "A16.07.041.002",
		service804nTitle: "Костная пластика челюстно-лицевой области (синус-лифтинг закрытый)",
		defaultToothFdi: 16,
		standardProtocolTextRu: CLOSED_SINUS_LIFT_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Сосудосуживающие капли в нос 5 дней. Не сморкаться, не чихать с закрытым ртом 10 дней. Прием НПВП и антибиотикотерапия по назначению. Осмотр через 7 дней.",
		order804nServices: [
			{
				code: "A16.07.041",
				nameRu: "Костная пластика челюстно-лицевой области (трансальвеолярный синус-лифтинг)",
				name: "Костная пластика челюстно-лицевой области (трансальвеолярный синус-лифтинг)",
				priceRub: 18000,
				priceKopecks: 1800000n,
				quantity: 1,
				suggestedPriceRub: 18000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.041.001",
				nameRu: "Внесение остеопластического материала (ксенографт 0.5 г)",
				name: "Внесение остеопластического материала (ксенографт 0.5 г)",
				priceRub: 9000,
				priceKopecks: 900000n,
				quantity: 1,
				suggestedPriceRub: 9000,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				priceRub: 1500,
				priceKopecks: 150000n,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Остеопластический материал ксенографт 0.5 г", unit: "флак.", quantity: 1, isWarehouseCritical: true },
			{ name: "Шовный материал рассасывающийся ПГА 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% (Артикаин 1:100 000 1.7 мл)", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_extraction_complex",
		title: "Сложное удаление зуба с разъединением корней (Норма)",
		shortBadge: "Сложное удаление с сепарацией",
		category: "extraction",
		icd10: "K08.8",
		icd10Label: "Другие уточненные изменения зубов и их опорного аппарата",
		code804n: "A16.07.002",
		code804nSubcode: "A16.07.002.001",
		service804nTitle: "Сложное удаление зуба с разъединением корней",
		defaultToothFdi: 37,
		standardProtocolTextRu: COMPLEX_EXTRACTION_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная и проводниковая Sol. Articaini 4% 1:100 000 — 3.4 мл",
		postOpRecommendationsRu:
			"Марлевый тампон сплюнуть через 20 минут. Не полоскать, не греть 3 дня. Прием НПВП при болях (Нимесил/Кетанов). Явка на осмотр и снятие швов через 7-8 дней.",
		order804nServices: [
			{
				code: "A16.07.002",
				nameRu: "Удаление зуба сложное с разъединением корней",
				name: "Удаление зуба сложное с разъединением корней",
				priceRub: 5500,
				priceKopecks: 550000n,
				quantity: 1,
				suggestedPriceRub: 5500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				priceRub: 1500,
				priceKopecks: 150000n,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 2, isWarehouseCritical: false },
			{ name: "Шовный материал рассасывающийся ПГА 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Губка гемостатическая антисептическая", unit: "доза", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_periostotomy",
		title: "Периостотомия с дренированием (Норма)",
		shortBadge: "Периостотомия",
		category: "emergency",
		icd10: "K10.2",
		icd10Label: "Воспалительные заболевания челюстей (Периостит)",
		code804n: "A16.07.011",
		service804nTitle: "Вскрытие поднадкостничного очага воспаления (периостотомия)",
		defaultToothFdi: 36,
		standardProtocolTextRu: PERIOSTOTOMY_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Не вытаскивать резиновый дренаж самостоятельно! Ротовые ванночки с 0.05% хлоргексидином 4-5 раз в день. Антибиотикотерапия (Цифран СТ / Амоксиклав). Обязательная явка завтра на перевязку.",
		order804nServices: [
			{
				code: "A16.07.011",
				nameRu: "Периостотомия (вскрытие поднадкостничного абсцесса)",
				name: "Периостотомия (вскрытие поднадкостничного абсцесса)",
				priceRub: 3000,
				priceKopecks: 300000n,
				quantity: 1,
				suggestedPriceRub: 3000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.011.001",
				nameRu: "Дренирование очага воспаления резиновым выпускником",
				name: "Дренирование очага воспаления резиновым выпускником",
				priceRub: 800,
				priceKopecks: 80000n,
				quantity: 1,
				suggestedPriceRub: 800,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
			{ name: "Резиновый ленточный выпускник стерильный", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Марлевые стерильные салфетки", unit: "упак.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_apicoectomy",
		title: "Резекция верхушки корня (апикоэктомия) (Норма)",
		shortBadge: "Апикоэктомия + МТА",
		category: "perio_surgery",
		icd10: "K04.5",
		icd10Label: "Хронический апикальный периодонтит",
		code804n: "A16.07.007",
		service804nTitle: "Резекция верхушки корня зуба с ретроградным пломбированием",
		defaultToothFdi: 21,
		standardProtocolTextRu: APICOECTOMY_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Холод на верхнюю губу 2 часа с интервалами. Ванночки с Мирамистином. Исключить откусывание передними зубами твердой пищи 2 недели. Снятие швов через 8 дней.",
		order804nServices: [
			{
				code: "A16.07.007",
				nameRu: "Резекция верхушки корня зуба (апикоэктомия)",
				name: "Резекция верхушки корня зуба (апикоэктомия)",
				priceRub: 12000,
				priceKopecks: 1200000n,
				quantity: 1,
				suggestedPriceRub: 12000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.007.001",
				nameRu: "Ретроградное пломбирование канала цементом МТА",
				name: "Ретроградное пломбирование канала цементом МТА",
				priceRub: 4500,
				priceKopecks: 450000n,
				quantity: 1,
				suggestedPriceRub: 4500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА 5-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА 5-0)",
				priceRub: 1500,
				priceKopecks: 150000n,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
			{ name: "МТА материал для ретроградного пломбирования", unit: "доз.", quantity: 1, isWarehouseCritical: true },
			{ name: "Шовный материал ПГА 5-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_mucogingival_fgg",
		title: "Пластика десны свободным десневым трансплантатом (СДТ) (Норма)",
		shortBadge: "СДТ с нёба",
		category: "perio_surgery",
		icd10: "K06.0",
		icd10Label: "Рецессия десны",
		code804n: "A16.07.042",
		service804nTitle: "Гингивопластика (пересадка свободного десневого трансплантата)",
		defaultToothFdi: 41,
		standardProtocolTextRu: MUCOGINGIVAL_FGG_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Холод на губу/подбородок 2 часа с интервалами. Не травмировать нёбо грубой пищей, ванночки с 0.05% хлоргексидином. Щадящая чистка зубов. Снятие швов через 12–14 дней.",
		order804nServices: [
			{
				code: "A16.07.042",
				nameRu: "Гингивопластика (пересадка свободного десневого трансплантата СДТ)",
				name: "Гингивопластика (пересадка свободного десневого трансплантата СДТ)",
				priceRub: 16000,
				priceKopecks: 1600000n,
				quantity: 1,
				suggestedPriceRub: 16000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение микрохирургического шва (монофиламент 6-0)",
				name: "Наложение микрохирургического шва (монофиламент 6-0)",
				priceRub: 2000,
				priceKopecks: 200000n,
				quantity: 1,
				suggestedPriceRub: 2000,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Шовный материал монофиламент 6-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Лезвие скальпеля микрохирургическое #15C", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Губка гемостатическая коллагеновая", unit: "доза", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_mucogingival_ctg",
		title: "Пластика десны соединительнотканным трансплантатом (ССТ) (Норма)",
		shortBadge: "ССТ с нёба",
		category: "perio_surgery",
		icd10: "K06.0",
		icd10Label: "Рецессия десны",
		code804n: "A16.07.042.001",
		service804nTitle: "Пластика десны субэпителиальным соединительнотканным трансплантатом",
		defaultToothFdi: 13,
		standardProtocolTextRu: MUCOGINGIVAL_CTG_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Холод 15 минут с перерывами в первый день. Исключить горячее и твердое 7 дней. Ротовые ванночки с хлоргексидином 0.05%. Снятие швов через 14 дней.",
		order804nServices: [
			{
				code: "A16.07.042.001",
				nameRu: "Пластика десны соединительнотканным трансплантатом (ССТ)",
				name: "Пластика десны соединительнотканным трансплантатом (ССТ)",
				priceRub: 18000,
				priceKopecks: 1800000n,
				quantity: 1,
				suggestedPriceRub: 18000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение микрохирургического шва (монофиламент 6-0)",
				name: "Наложение микрохирургического шва (монофиламент 6-0)",
				priceRub: 2000,
				priceKopecks: 200000n,
				quantity: 1,
				suggestedPriceRub: 2000,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Шовный материал монофиламент 6-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Шовный материал рассасывающийся ПГА 5-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Лезвие скальпеля микрохирургическое #15C", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_recession_caf",
		title: "Устранение рецессии коронально смещенным лоскутом по Зуккелли (Норма)",
		shortBadge: "CAF Зуккелли",
		category: "perio_surgery",
		icd10: "K06.0",
		icd10Label: "Рецессия десны",
		code804n: "A16.07.042.002",
		service804nTitle: "Устранение рецессии десны коронально смещенным лоскутом (CAF)",
		defaultToothFdi: 23,
		standardProtocolTextRu: RECESSION_CAF_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Не натягивать губу при осмотре! Исключить чистку щеткой в зоне операции 14 дней. Ванночки с 0.05% хлоргексидином. Снятие швов через 14 дней.",
		order804nServices: [
			{
				code: "A16.07.042.002",
				nameRu: "Корональное смещение лоскута по Зуккелли (устранение рецессии)",
				name: "Корональное смещение лоскута по Зуккелли (устранение рецессии)",
				priceRub: 14000,
				priceKopecks: 1400000n,
				quantity: 1,
				suggestedPriceRub: 14000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение подвесных швов на десну (монофиламент 6-0)",
				name: "Наложение подвесных швов на десну (монофиламент 6-0)",
				priceRub: 2000,
				priceKopecks: 200000n,
				quantity: 1,
				suggestedPriceRub: 2000,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Шовный материал монофиламент 6-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Гель для кондиционирования корня ЭДТА 24%", unit: "доз.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_recession_tunnel",
		title: "Туннельное закрытие рецессий десны (Норма)",
		shortBadge: "Туннельная пластика",
		category: "perio_surgery",
		icd10: "K06.0",
		icd10Label: "Рецессия десны",
		code804n: "A16.07.042.003",
		service804nTitle: "Туннельное закрытие множественных рецессий десны",
		defaultToothFdi: 14,
		standardProtocolTextRu: RECESSION_TUNNEL_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Абсолютный покой зоны вмешательства. Не травмировать щеткой 14 дней. Антисептические ванночки. Снятие швов через 14 дней.",
		order804nServices: [
			{
				code: "A16.07.042.003",
				nameRu: "Туннельная пластика множественных рецессий десны",
				name: "Туннельная пластика множественных рецессий десны",
				priceRub: 22000,
				priceKopecks: 2200000n,
				quantity: 1,
				suggestedPriceRub: 22000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение обвивных матрасных швов (монофиламент 6-0)",
				name: "Наложение обвивных матрасных швов (монофиламент 6-0)",
				priceRub: 2500,
				priceKopecks: 250000n,
				quantity: 1,
				suggestedPriceRub: 2500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Шовный материал монофиламент 6-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Одноразовый туннельный нож / распатор", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_perio_flap",
		title: "Лоскутная операция при пародонтите с открытым кюретажем (Норма)",
		shortBadge: "Лоскутная операция",
		category: "perio_surgery",
		icd10: "K05.3",
		icd10Label: "Хронический пародонтит",
		code804n: "A16.07.040",
		service804nTitle: "Лоскутная операция в полости рта в области 4-6 зубов",
		defaultToothFdi: 31,
		standardProtocolTextRu: PERIO_FLAP_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Не смещать десневую пародонтальную защитную повязку. Щадящая теплая диета. Прием антибактериальных препаратов по схеме. Снятие повязки и швов через 10–12 дней.",
		order804nServices: [
			{
				code: "A16.07.040",
				nameRu: "Лоскутная операция в полости рта (сегмент)",
				name: "Лоскутная операция в полости рта (сегмент)",
				priceRub: 12000,
				priceKopecks: 1200000n,
				quantity: 1,
				suggestedPriceRub: 12000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.026",
				nameRu: "Открытый кюретаж пародонтальных карманов",
				name: "Открытый кюретаж пародонтальных карманов",
				priceRub: 4000,
				priceKopecks: 400000n,
				quantity: 1,
				suggestedPriceRub: 4000,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение межзубных швов (ПГА 5-0)",
				name: "Наложение межзубных швов (ПГА 5-0)",
				priceRub: 1500,
				priceKopecks: 150000n,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Шовный материал ПГА 5-0 / монофиламент 5-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Десневая пародонтальная защитная повязка", unit: "доза", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_frenuloplasty",
		title: "Пластика уздечки губы / языка (френулопластика) (Норма)",
		shortBadge: "Пластика уздечки",
		category: "perio_surgery",
		icd10: "Q38.1",
		icd10Label: "Анкилоглоссия (короткая уздечка)",
		code804n: "A16.07.044",
		service804nTitle: "Пластика уздечки языка/губы",
		defaultToothFdi: 11,
		standardProtocolTextRu: FRENULOPLASTY_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 0.8 мл",
		postOpRecommendationsRu:
			"Гимнастика языка/губы со 2 дня. Ванночки с Мирамистином. Исключить жесткую пищу. Осмотр через 7 дней.",
		order804nServices: [
			{
				code: "A16.07.044",
				nameRu: "Пластика уздечки губы / языка (френулопластика)",
				name: "Пластика уздечки губы / языка (френулопластика)",
				priceRub: 5500,
				priceKopecks: 550000n,
				quantity: 1,
				suggestedPriceRub: 5500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение узловых швов (ПГА 5-0)",
				name: "Наложение узловых швов (ПГА 5-0)",
				priceRub: 1500,
				priceKopecks: 150000n,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Шовный материал ПГА 5-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_vestibuloplasty",
		title: "Вестибулопластика (углубление преддверия рта) (Норма)",
		shortBadge: "Вестибулопластика",
		category: "perio_surgery",
		icd10: "K06.8",
		icd10Label: "Другие уточненные изменения десны и альвеолярного края",
		code804n: "A16.07.043",
		service804nTitle: "Вестибулопластика",
		defaultToothFdi: 31,
		standardProtocolTextRu: VESTIBULOPLASTY_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Ограничить мимические движения. Холод в первые сутки. Обработка раневой поверхности кератопластиками. Осмотр через 7 дней.",
		order804nServices: [
			{
				code: "A16.07.043",
				nameRu: "Вестибулопластика (углубление преддверия полости рта)",
				name: "Вестибулопластика (углубление преддверия полости рта)",
				priceRub: 14000,
				priceKopecks: 1400000n,
				quantity: 1,
				suggestedPriceRub: 14000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.097",
				nameRu: "Фиксация лоскута швами к надкостнице (ПГА 5-0)",
				name: "Фиксация лоскута швами к надкостнице (ПГА 5-0)",
				priceRub: 2000,
				priceKopecks: 200000n,
				quantity: 1,
				suggestedPriceRub: 2000,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Шовный материал ПГА 5-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Коллагеновая гемостатическая пластина", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_crown_lengthening",
		title: "Хирургическое удлинение коронки зуба с остеоэктомией (Норма)",
		shortBadge: "Удлинение коронки",
		category: "perio_surgery",
		icd10: "K06.8",
		icd10Label: "Другие уточненные изменения десны и альвеолярного края",
		code804n: "A16.07.045",
		service804nTitle: "Клиническое удлинение коронки зуба",
		defaultToothFdi: 24,
		standardProtocolTextRu: CROWN_LENGTHENING_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Ванночки с антисептиком со 2 дня. Щадящая диета. Не накусывать на причинный зуб. Снятие швов через 10 дней.",
		order804nServices: [
			{
				code: "A16.07.045",
				nameRu: "Хирургическое удлинение клинической коронки зуба",
				name: "Хирургическое удлинение клинической коронки зуба",
				priceRub: 8500,
				priceKopecks: 850000n,
				quantity: 1,
				suggestedPriceRub: 8500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение узловых швов (монофиламент 6-0)",
				name: "Наложение узловых швов (монофиламент 6-0)",
				priceRub: 1500,
				priceKopecks: 150000n,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Шовный материал монофиламент 6-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Хирургический твердосплавный бор", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_pericoronitis",
		title: "Иссечение капюшона при перикороните (Норма)",
		shortBadge: "Иссечение капюшона",
		category: "emergency",
		icd10: "K05.2",
		icd10Label: "Острый перикоронит",
		code804n: "A16.07.016",
		service804nTitle: "Иссечение десневого капюшона",
		defaultToothFdi: 48,
		standardProtocolTextRu: PERICORONITIS_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Ротовые ванночки с 0.05% хлоргексидином 4-5 раз в день. Не греть щеку! При болях — Нимесил. Осмотр через 2 дня.",
		order804nServices: [
			{
				code: "A16.07.016",
				nameRu: "Иссечение десневого капюшона при затрудненном прорезывании зуба",
				name: "Иссечение десневого капюшона при затрудненном прорезывании зуба",
				priceRub: 2500,
				priceKopecks: 250000n,
				quantity: 1,
				suggestedPriceRub: 2500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				priceKopecks: 90000n,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Лезвие скальпеля стерильное #15", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Йодоформная марлевая турунда", unit: "доза", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
];

/**
 * Проверка мягкого овердрафта склада (Мандат 8e):
 * canProceed ВСЕГДА true — операция врача не блокируется.
 */
export function evaluateWarehouseOverdraft(
	materials: readonly { name: string; isWarehouseCritical?: boolean | undefined }[],
	hasWarehouseDelay = false,
	specificDelayedItems?: readonly string[] | undefined,
): SurgicalWarehouseOverdraftStatus {
	if (!hasWarehouseDelay && (!specificDelayedItems || specificDelayedItems.length === 0)) {
		return {
			hasOverdraft: false,
			warningRu: "Склад в норме",
			detailsRu: "Все позиции числятся на остатках.",
			pendingItems: [],
			canProceed: true,
		};
	}

	const pending = specificDelayedItems && specificDelayedItems.length > 0
		? [...specificDelayedItems]
		: materials.filter((m) => m.isWarehouseCritical).map((m) => m.name);

	const itemsList = pending.length > 0 ? pending.join(", ") : "расходные материалы";

	return {
		hasOverdraft: true,
		warningRu: "Мягкий овердрафт склада: задержка накладной не блокирует операцию.",
		detailsRu: `Позиции будут списаны с признаком: мягкий овердрафт (${itemsList}). Доктор сохраняет протокол беспрепятственно. Операция не блокируется: списание зафиксировано.`,
		pendingItems: pending,
		canProceed: true,
	};
}

/**
 * Генерация 1-клик канонического протокола дентальной имплантации (Mandates 8e, 8k СтАР).
 */
export function buildStandardImplantationProtocolText(
	params: StandardImplantationParams = {},
): string {
	const toothStr = params.toothFdi ? `зуба FDI #${params.toothFdi}` : "имплантации";
	const brand = params.brand || "Dentium";
	const model = params.model ? ` ${params.model}` : "";
	const dia = params.diameterMm ?? 4.0;
	const len = params.lengthMm ?? 10.0;
	const torque = params.torqueNcm ?? 35;
	const isq = params.isq ?? 72;
	const capStr =
		params.capType === "plug"
			? "Установлен винт-заглушка (двухэтапный протокол с ушиванием наглухо)."
			: "Установлен формирователь десны (ФДМ).";
	const suture = params.sutureMaterial || "Монофиламент 4-0";
	const xrayStr =
		params.postOpXray !== false
			? " Выполнен контрольный прицельный радиовизиографический снимок: положение имплантата правильное, субкрестально 0.5 мм, без повреждения смежных анатомических структур."
			: "";

	return (
		`Инфильтрационная анестезия Артикаин 1:100 000 — 1.7 мл. Разрез по гребню альвеолярного отростка в области ${toothStr}, отслоен слизисто-надкостничный лоскут. ` +
		`Препарирование ложа фрезами по хирургическому протоколу ${brand} с обильным охлаждением стерильным 0.9% NaCl (800 об/мин). ` +
		`Установлен дентальный имплантат ${brand}${model} Ø ${dia} × ${len} мм. ` +
		`Первичная торк-стабильность ${torque} Н·см, RFA стабильность ISQ ${isq} (высокая первичная фиксация). ` +
		`${capStr} ` +
		`Мобилизация лоскута, наложены узловые швы ${suture} без натяжения. Гемостаз полный.${xrayStr} ` +
		`Назначена антибактериальная и противовоспалительная терапия, рекомендации выданы.`
	);
}
