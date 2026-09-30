/**
 * ctImplantIntegrationBridge.ts — спайка 3D КЛКТ с автоматической генерацией планов лечения DENTE CRM.
 *
 * МАНДАТЫ DENTE CRM:
 * - Мандат 8b: строго <= 800 строк.
 * - Мандат 8d: ноль мультяшных эмодзи.
 * - Мандат 8e: Doctor Autonomy (независимость врача, 1-клик генерация без номенклатурного ада).
 * - ACID / 54-ФЗ: целочисленные копейки, точный расчет 13% НДФЛ и рассрочки 0%.
 * - Кодировка: строго UTF-8 без BOM.
 */

import {
	type Kopecks,
	calculatePlanTaxDeductionBreakdown,
	calculateStaged304030Schedule,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import type { ToothData } from "../odontogram/ToothChart";
import type { CatalogServiceLookupItem } from "./treatmentPlanStagesEngine";
import { computeTierInstallments } from "./treatmentPlanStagesEngine";
import type {
	NdflDeductionResult,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanStageKind,
	TreatmentPlanTier,
	TreatmentPlanTierId,
} from "./types";
import type { ImplantBrandKey, VirtualImplantSpec } from "../radiology/implantSafetyEngine";
import { loadPersistedCustomPlanItems } from "../radiology/ctImplantIntegrationBridge";

export * from "../radiology/ctImplantIntegrationBridge";

// ─── 1. ТИПЫ КЛИНИЧЕСКИХ НАХОДОК КЛКТ (CBCT FINDINGS) ─────────────────────────

export type CbctDestructionLevel =
	| "caries"
	| "pulpitis"
	| "periodontitis_periapical"
	| "subgingival_fracture_hopeless"
	| "missing";

export type CbctAugmentationType =
	| "closed_sinus_lift"
	| "open_sinus_lift"
	| "gbr_membrane"
	| "socket_preservation";

export interface CbctImplantFinding {
	readonly toothFdi: number;
	readonly implantSpec?: VirtualImplantSpec | undefined;
	readonly brand?: ImplantBrandKey | undefined;
	readonly diameterMm?: number | undefined;
	readonly lengthMm?: number | undefined;
	readonly angulationDeg?: number | undefined;
	readonly ridgeHeightMm?: number | null | undefined;
	readonly ridgeWidthMm?: number | null | undefined;
	readonly meanHU?: number | null | undefined;
	readonly mischClass?: string | undefined;
	readonly nerveClearanceMm?: number | null | undefined;
	readonly recommendedTorqueNcm?: string | undefined;
	readonly drillingProtocol?: string | undefined;
	readonly isNerveWarning?: boolean | undefined;
	readonly isNerveDanger?: boolean | undefined;
	readonly needsSinusLift?: boolean | undefined;
	readonly sinusLiftType?: "closed" | "open" | undefined;
	readonly boneGraftRequired?: boolean | undefined;
	readonly boneDefectVolumeCc?: number | undefined;
	readonly customPriceRub?: number | undefined;
}

export interface CbctBoneDefectFinding {
	readonly toothFdi?: number | undefined;
	readonly region: "maxilla_sinus" | "mandible_canal" | "alveolar_crest" | "periapical";
	readonly defectType: "sinus_pneumatization" | "vertical_atrophy" | "horizontal_atrophy" | "periapical_cyst";
	readonly residualHeightMm?: number | undefined;
	readonly residualWidthMm?: number | undefined;
	readonly recommendedAugmentation: CbctAugmentationType;
	readonly boneGraftGrams?: number | undefined;
	readonly notes?: string | undefined;
}

export interface CbctToothDestructionFinding {
	readonly toothFdi: number;
	readonly destructionLevel: CbctDestructionLevel;
	readonly isHopelessForExtraction?: boolean | undefined;
	readonly periapicalDefectMm?: number | undefined;
	readonly rootCanalCount?: number | undefined;
	readonly crownRecommendation?: "metalloceramic" | "zirconia" | "emax" | "composite" | undefined;
	readonly notes?: string | undefined;
}

export interface CbctAutoPlanFindingsInput {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly studyId?: string | undefined;
	readonly implants?: readonly CbctImplantFinding[] | undefined;
	readonly boneDefects?: readonly CbctBoneDefectFinding[] | undefined;
	readonly toothDestructions?: readonly CbctToothDestructionFinding[] | undefined;
	readonly generalFindings?: readonly string[] | undefined;
	readonly maxillaSinusPneumatization?: boolean | undefined;
	readonly mandibleAtrophy?: boolean | undefined;
	readonly notes?: string | undefined;
	readonly tierBrands?: Partial<Record<TreatmentPlanTierId, ImplantBrandKey>> | undefined;
}

// ─── 2. СПРАВОЧНИКИ И ЦЕНЫ 804н ────────────────────────────────────────────────

export const BRAND_DEFAULTS: Record<ImplantBrandKey, { label: string; economy: number; standard: number; premium: number }> = {
	straumann: { label: "Straumann Roxolid SLActive (Швейцария)", economy: 45000, standard: 52000, premium: 65000 },
	nobel_biocare: { label: "Nobel Biocare Replace (Швеция)", economy: 42000, standard: 49000, premium: 58000 },
	dentium: { label: "Dentium SuperLine SLA (Южная Корея)", economy: 24000, standard: 32000, premium: 38000 },
	osstem: { label: "Osstem TS-III SA (Южная Корея)", economy: 22000, standard: 29000, premium: 35000 },
	mis: { label: "MIS V3 / Seven (Израиль)", economy: 20000, standard: 26000, premium: 32000 },
};

function resolveCatalogPrice(
	order804nCode: string,
	fallbackPriceRub: number,
	catalog?: readonly CatalogServiceLookupItem[] | undefined,
): number {
	if (!catalog || catalog.length === 0) return fallbackPriceRub;
	const clean = order804nCode.trim();
	const item = catalog.find(
		(s) => s.active !== false && (s.order804nCode === clean || s.code === clean || (s.title && s.title.includes(clean))),
	);
	return item && typeof item.basePriceRub === "number" && item.basePriceRub > 0 ? item.basePriceRub : fallbackPriceRub;
}

function makePlanItem(
	id: string,
	toothNumber: number | undefined,
	code804n: string,
	name: string,
	category: string,
	priceRub: number,
	phase: number,
	stageKind: TreatmentPlanStageKind,
	materials: string,
	clinicalRationale: string,
): TreatmentPlanItem {
	return {
		id,
		toothNumber,
		code804n,
		name,
		category,
		priceRub,
		unitPriceRub: priceRub,
		discountRub: 0,
		quantity: 1,
		phase,
		stageKind,
		isAuto: true,
		fromCatalog: true,
		materials,
		clinicalRationale,
	};
}

// ─── 3. СБОРКА ХИРУРГИЧЕСКОГО ПАКЕТА ИМПЛАНТАЦИИ ПО КЛКТ ───────────────────────

export function buildImplantSurgicalPackageItems(
	finding: CbctImplantFinding,
	tierId: TreatmentPlanTierId,
	catalog?: readonly CatalogServiceLookupItem[] | undefined,
): TreatmentPlanItem[] {
	const toothFdi = finding.toothFdi;
	const brandKey: ImplantBrandKey =
		finding.implantSpec?.brand ?? finding.brand ?? (tierId === "optimum" ? "straumann" : tierId === "standard" ? "dentium" : "osstem");
	const brandInfo = BRAND_DEFAULTS[brandKey] || BRAND_DEFAULTS.dentium;
	const diam = finding.implantSpec?.diameterMm ?? finding.diameterMm ?? 4.0;
	const len = finding.implantSpec?.lengthMm ?? finding.lengthMm ?? 10.0;
	const basePrice = tierId === "optimum" ? brandInfo.premium : tierId === "standard" ? brandInfo.standard : brandInfo.economy;
	const implantPrice = resolveCatalogPrice("A16.07.054.001", finding.customPriceRub ?? basePrice, catalog);
	const abutmentPrice = resolveCatalogPrice("A16.07.054.002", tierId === "optimum" ? 7500 : tierId === "standard" ? 5500 : 4500, catalog);
	const anesthPrice = resolveCatalogPrice("A11.07.012", 900, catalog);
	const suturePrice = resolveCatalogPrice("A16.07.097", 1300, catalog);

	const ridgeH = typeof finding.ridgeHeightMm === "number" ? `H=${finding.ridgeHeightMm.toFixed(1)} мм` : "H: КТ-контроль";
	const ridgeW = typeof finding.ridgeWidthMm === "number" ? `W=${finding.ridgeWidthMm.toFixed(1)} мм` : "W: КТ-контроль";
	const isNerveCritical =
		finding.isNerveDanger ||
		finding.isNerveWarning ||
		(typeof finding.nerveClearanceMm === "number" && finding.nerveClearanceMm < 2.0);
	const nerve = isNerveCritical
		? `ВНИМАНИЕ: зазор до нижнечелюстного нерва (${finding.nerveClearanceMm !== null && finding.nerveClearanceMm !== undefined ? finding.nerveClearanceMm.toFixed(1) : "< 2"} мм) критический!`
		: finding.nerveClearanceMm !== null && finding.nerveClearanceMm !== undefined
			? `Зазор до канала/синуса: ${finding.nerveClearanceMm.toFixed(1)} мм`
			: "Безопасная зона";
	const rationale = `3D КЛКТ (#${toothFdi}): ${ridgeH}, ${ridgeW}. Кость: ${finding.mischClass || "D2"} (${finding.meanHU ?? 650} HU). ${nerve}. Торк: ${finding.recommendedTorqueNcm || ">= 35 Н·см"}.`;
	const now = Date.now();

	return [
		makePlanItem(`cbct-imp-op-${toothFdi}-${tierId}-${now}`, toothFdi, "A16.07.054.001", `[Зуб ${toothFdi}] Внутрикостная дентальная имплантация: ${brandInfo.label} (Ø${diam.toFixed(1)} × ${len.toFixed(1)} мм)`, "Хирургия", implantPrice, 3, "stage_2_surgery", `Имплантат ${brandInfo.label} Ø${diam.toFixed(1)}x${len.toFixed(1)} мм`, rationale),
		makePlanItem(`cbct-imp-abut-${toothFdi}-${tierId}-${now}`, toothFdi, "A16.07.054.002", `[Зуб ${toothFdi}] Установка титанового формирователя десны`, "Хирургия", abutmentPrice, 3, "stage_2_surgery", "Титановый формирователь десны Healing Abutment", "Формирование анатомического профиля десневой манжеты"),
		makePlanItem(`cbct-imp-anes-${toothFdi}-${tierId}-${now}`, toothFdi, "A11.07.012", `[Зуб ${toothFdi}] Местная анестезия проводниковая / инфильтрационная`, "Анестезия", anesthPrice, 3, "stage_2_surgery", "Карпула Ubistesin forte / Ultracain, игла 27G/30G", "Блокада надкостницы и костной ткани челюсти"),
		makePlanItem(`cbct-imp-sut-${toothFdi}-${tierId}-${now}`, toothFdi, "A16.07.097", `[Зуб ${toothFdi}] Наложение хирургических швов на слизистую оболочку`, "Хирургия", suturePrice, 3, "stage_2_surgery", "Монофиламент Prolene 5-0 / Vicryl 4-0", "Герметичная адаптация краев лоскута"),
	];
}

// ─── 4. СБОРКА КОСТНОЙ АУГМЕНТАЦИИ И СИНУС-ЛИФТИНГА ПО КЛКТ ──────────────────

export function buildBoneAugmentationItems(
	defect: CbctBoneDefectFinding,
	tierId: TreatmentPlanTierId,
	catalog?: readonly CatalogServiceLookupItem[] | undefined,
): TreatmentPlanItem[] {
	const toothFdi = defect.toothFdi;
	const prefix = toothFdi ? `[Зуб ${toothFdi}] ` : "[Область синуса] ";
	const residualH = defect.residualHeightMm ?? 6.0;
	const isClosed = defect.recommendedAugmentation === "closed_sinus_lift" || (residualH >= 5.0 && residualH <= 8.5);
	const now = Date.now();
	const items: TreatmentPlanItem[] = [];

	if (isClosed) {
		const liftPrice = resolveCatalogPrice("A16.07.041.002", 18000, catalog);
		const graftPrice = resolveCatalogPrice("A16.07.041", tierId === "optimum" ? 18000 : tierId === "standard" ? 15000 : 12000, catalog);
		items.push(
			makePlanItem(`cbct-sinus-c-${toothFdi ?? 0}-${now}`, toothFdi, "A16.07.041.002", `${prefix}Закрытый синус-лифтинг через остеотомическое ложе имплантата`, "Хирургия", liftPrice, 3, "stage_2_surgery", "Остеотомы Summers, CAS-Kit", `КЛКТ: высота кости ${residualH.toFixed(1)} мм. Закрытый синус-лифтинг.`),
			makePlanItem(`cbct-graft-c-${toothFdi ?? 0}-${now}`, toothFdi, "A16.07.041", `${prefix}Костная пластика: биоматериал Geistlich Bio-Oss (0.5 см³)`, "Хирургия", graftPrice, 3, "stage_2_surgery", "Geistlich Bio-Oss Spongiosa (0.5 см³)", "Остеокондуктивный костный объем вокруг имплантата"),
		);
	} else {
		const openLiftPrice = resolveCatalogPrice("A16.07.041.001", 32000, catalog);
		const graftPrice = resolveCatalogPrice("A16.07.041", tierId === "optimum" ? 22000 : tierId === "standard" ? 18000 : 15000, catalog);
		const memPrice = resolveCatalogPrice("A16.07.041.003", tierId === "optimum" ? 14000 : tierId === "standard" ? 12000 : 9500, catalog);
		const suturePrice = resolveCatalogPrice("A16.07.097", 1300, catalog);
		items.push(
			makePlanItem(`cbct-sinus-o-${toothFdi ?? 0}-${now}`, toothFdi, "A16.07.041.001", `${prefix}Открытый синус-лифтинг с латеральным костным окном`, "Хирургия", openLiftPrice, 3, "stage_2_surgery", "Пьезохирургический аппарат Mectron", `КЛКТ: выраженная атрофия кости (${residualH.toFixed(1)} мм < 5 мм).`),
			makePlanItem(`cbct-graft-o-${toothFdi ?? 0}-${now}`, toothFdi, "A16.07.041", `${prefix}Костная пластика: гранулят Geistlich Bio-Oss (1.0-2.0 г)`, "Хирургия", graftPrice, 3, "stage_2_surgery", "Geistlich Bio-Oss (гранулы 0.25-1.0 мм, 1.0 г)", "Субантральная остеопластика"),
			makePlanItem(`cbct-mem-o-${toothFdi ?? 0}-${now}`, toothFdi, "A16.07.041.003", `${prefix}Барьерная мембрана Geistlich Bio-Gide с фиксацией пинами`, "Хирургия", memPrice, 3, "stage_2_surgery", "Мембрана Geistlich Bio-Gide 25x25 мм, пины", "Барьерная защита зоны регенерации"),
			makePlanItem(`cbct-sut-o-${toothFdi ?? 0}-${now}`, toothFdi, "A16.07.097", `${prefix}Наложение хирургических швов Vicryl 4-0`, "Хирургия", suturePrice, 3, "stage_2_surgery", "Плетеный шовный материал Vicryl 4-0 Ethicon", "Герметичное ушивание слизисто-надкостничного лоскута"),
		);
	}
	return items;
}

// ─── 5. СБОРКА ЭТАПОВ САНАЦИИ И ОРТОПЕДИИ ПО РАЗРУШЕНИЮ ЗУБОВ ─────────────────

export interface DestructionPlanBreakdown {
	readonly emergencyItems: TreatmentPlanItem[];
	readonly therapyItems: TreatmentPlanItem[];
	readonly surgeryItems: TreatmentPlanItem[];
	readonly orthoItems: TreatmentPlanItem[];
}

export function buildDestructionAndProstheticsItems(
	finding: CbctToothDestructionFinding,
	tierId: TreatmentPlanTierId,
	catalog?: readonly CatalogServiceLookupItem[] | undefined,
): DestructionPlanBreakdown {
	const toothFdi = finding.toothFdi;
	const prefix = `[Зуб ${toothFdi}] `;
	const now = Date.now();
	const emergencyItems: TreatmentPlanItem[] = [];
	const therapyItems: TreatmentPlanItem[] = [];
	const surgeryItems: TreatmentPlanItem[] = [];
	const orthoItems: TreatmentPlanItem[] = [];

	if (finding.isHopelessForExtraction || finding.destructionLevel === "subgingival_fracture_hopeless") {
		const isMolar = toothFdi % 10 >= 6 || toothFdi % 10 === 8;
		const extCode = isMolar ? "A16.07.001.003" : "A16.07.001.001";
		const extTitle = isMolar
			? `${prefix}Разъединение корней и сложное удаление зуба`
			: `${prefix}Атравматичное удаление корня зуба с сохранением лунки`;
		const extPrice = resolveCatalogPrice(extCode, isMolar ? 5200 : 3500, catalog);
		const curPrice = resolveCatalogPrice("A16.07.039.001", 1100, catalog);
		const hemPrice = resolveCatalogPrice("A16.07.095", 800, catalog);
		const sockPrice = resolveCatalogPrice("A16.07.041", 9500, catalog);
		surgeryItems.push(
			makePlanItem(`cbct-ext-${toothFdi}-${now}`, toothFdi, extCode, extTitle, "Хирургия", extPrice, 3, "stage_2_surgery", isMolar ? "Бор Lindemann, элеваторы" : "Люксаторы Hu-Friedy", `КЛКТ: поддесневой перелом корня #${toothFdi} > 80%.`),
			makePlanItem(`cbct-cur-${toothFdi}-${now}`, toothFdi, "A16.07.039.001", `${prefix}Кюретаж лунки зуба и санация периапикального очага`, "Хирургия", curPrice, 3, "stage_2_surgery", "Ложка Фолькмана, хлоргексидин 0.05%", "Санация очага инфекции"),
			makePlanItem(`cbct-hem-${toothFdi}-${now}`, toothFdi, "A16.07.095", `${prefix}Гемостаз и внесение губки Альвожиль в лунку`, "Хирургия", hemPrice, 3, "stage_2_surgery", "Губка Альванес / паста Альвожиль", "Профилактика альвеолита"),
			makePlanItem(`cbct-sock-${toothFdi}-${now}`, toothFdi, "A16.07.041", `${prefix}Консервация костной лунки остеопластиком (Bio-Oss Collagen)`, "Хирургия", sockPrice, 3, "stage_2_surgery", "Geistlich Bio-Oss Collagen 100 мг", "Сохранение контура альвеолярного гребня для отсроченной имплантации"),
		);
	} else if (finding.destructionLevel === "pulpitis" || finding.destructionLevel === "periodontitis_periapical") {
		const canals = finding.rootCanalCount ?? (toothFdi % 10 >= 6 ? 3 : toothFdi % 10 >= 4 ? 2 : 1);
		const prepPrice = resolveCatalogPrice(canals >= 3 ? "A16.07.030.003" : "A16.07.030.001", canals >= 3 ? 7500 : 3500, catalog);
		const obtPrice = resolveCatalogPrice(canals >= 3 ? "A16.07.008.003" : "A16.07.008.001", canals >= 3 ? 6000 : 2900, catalog);
		const bldPrice = resolveCatalogPrice("A16.07.002.001", 4800, catalog);
		therapyItems.push(
			makePlanItem(`cbct-prep-${toothFdi}-${now}`, toothFdi, canals >= 3 ? "A16.07.030.003" : "A16.07.030.001", `${prefix}Машинная обработка ${canals} корневых каналов ProTaper`, "Эндодонтия", prepPrice, 2, "stage_1_therapy", "NiTi ProTaper Gold, NaOCl 3.25%", `КЛКТ-контроль: обработка ${canals} каналов`),
			makePlanItem(`cbct-obt-${toothFdi}-${now}`, toothFdi, canals >= 3 ? "A16.07.008.003" : "A16.07.008.001", `${prefix}3D-обтурация ${canals} корневых каналов гуттаперчей`, "Эндодонтия", obtPrice, 2, "stage_1_therapy", "Штифты ProTaper, силер AH Plus", "Трехмерная герметизация апекса"),
			makePlanItem(`cbct-bld-${toothFdi}-${now}`, toothFdi, "A16.07.002.001", `${prefix}Восстановление культи зуба (билд-ап со штифтом)`, "Терапия", bldPrice, 2, "stage_1_therapy", "Штифт RelyX Fiber, LuxaCore", "Культевая опора под коронку"),
		);
	} else if (finding.destructionLevel === "caries") {
		const cariesPrice = resolveCatalogPrice("A16.07.002.001", 4800, catalog);
		therapyItems.push(
			makePlanItem(`cbct-caries-${toothFdi}-${now}`, toothFdi, "A16.07.002.001", `${prefix}Лечение кариеса и пломба (нанокомпозит Estelite)`, "Терапия", cariesPrice, 2, "stage_1_therapy", "Tokuyama Estelite Sigma Quick", "Восстановление анатомической формы"),
		);
	}

	if (finding.crownRecommendation !== "composite" && finding.destructionLevel !== "caries") {
		const isPrem = tierId === "optimum";
		const isOpt = tierId === "standard";
		if (isPrem) {
			orthoItems.push(
				makePlanItem(`cbct-scn-${toothFdi}-${now}`, toothFdi, "A02.07.010.001", `${prefix}Интраоральное 3D-сканирование (3Shape TRIOS)`, "Ортопедия", resolveCatalogPrice("A02.07.010.001", 4500, catalog), 4, "stage_3_orthopedics", "3Shape TRIOS", "Оптический 3D-слепок"),
				makePlanItem(`cbct-emx-${toothFdi}-${now}`, toothFdi, "A16.07.004.003", `${prefix}Цельнокерамическая коронка IPS e.max Press / Katana UTML`, "Ортопедия", resolveCatalogPrice("A16.07.004.003", 38000, catalog), 4, "stage_3_orthopedics", "IPS e.max Press", "Премиальная эстетика эмали"),
				makePlanItem(`cbct-fxa-${toothFdi}-${now}`, toothFdi, "A16.07.004.005", `${prefix}Адгезивная фиксация RelyX Ultimate`, "Ортопедия", resolveCatalogPrice("A16.07.004.005", 2500, catalog), 4, "stage_3_orthopedics", "RelyX Ultimate", "Монолитная фиксация"),
			);
		} else if (isOpt) {
			orthoItems.push(
				makePlanItem(`cbct-imp-${toothFdi}-${now}`, toothFdi, "A02.07.010", `${prefix}Прецизионный слепок А-силиконом (Elite HD+)`, "Ортопедия", resolveCatalogPrice("A02.07.010", 2500, catalog), 4, "stage_3_orthopedics", "Elite HD+", "Точный слепок уступа"),
				makePlanItem(`cbct-zr-${toothFdi}-${now}`, toothFdi, "A16.07.004.003", `${prefix}Анатомическая коронка ZrO2 Katana ML 1200 МПа`, "Ортопедия", resolveCatalogPrice("A16.07.004.003", 26000, catalog), 4, "stage_3_orthopedics", "ZrO2 Katana ML", "Прочность и градиент цвета"),
				makePlanItem(`cbct-fxz-${toothFdi}-${now}`, toothFdi, "A16.07.004.005", `${prefix}Фиксация циркониевой коронки на цемент Fuji PLUS`, "Ортопедия", resolveCatalogPrice("A16.07.004.005", 2000, catalog), 4, "stage_3_orthopedics", "GC Fuji PLUS", "Надежное краевое прилегание"),
			);
		} else {
			orthoItems.push(
				makePlanItem(`cbct-imp-e-${toothFdi}-${now}`, toothFdi, "A02.07.010", `${prefix}Анатомический слепок для металлокерамики`, "Ортопедия", resolveCatalogPrice("A02.07.010", 2200, catalog), 4, "stage_3_orthopedics", "С-силикон / А-силикон", "Анатомический оттиск"),
				makePlanItem(`cbct-mc-${toothFdi}-${now}`, toothFdi, "A16.07.004.001", `${prefix}Металлокерамическая коронка Vita VM13 Co-Cr`, "Ортопедия", resolveCatalogPrice("A16.07.004.001", 16000, catalog), 4, "stage_3_orthopedics", "Co-Cr, Vita VM13", "Восстановление жевания"),
				makePlanItem(`cbct-fxm-${toothFdi}-${now}`, toothFdi, "A16.07.004.002", `${prefix}Фиксация металлокерамики на цемент Fuji I`, "Ортопедия", resolveCatalogPrice("A16.07.004.002", 1500, catalog), 4, "stage_3_orthopedics", "GC Fuji I", "Долговременная фиксация"),
			);
		}
	}

	return { emergencyItems, therapyItems, surgeryItems, orthoItems };
}

// ─── 6. ГЕНЕРАТОР 3 СЦЕНАРИЕВ С 4 ЭТАПАМИ (ЭКОНОМ, ОПТИМУМ, ПРЕМИУМ) ─────────

const TIER_METAS: Record<TreatmentPlanTierId, {
	title: string;
	subtitle: string;
	badge: string;
	badgeClass: string;
	borderClass: string;
	isRecommended: boolean;
	warrantyYears: string;
	materialsHeadline: string;
	materialsList: readonly string[];
	keyAdvantages: readonly string[];
}> = {
	economy: {
		title: "Эконом (Базовые проверенные решения)",
		subtitle: "Проверенные решения: имплантаты Osstem/MIS, металлокерамика Co-Cr и базовая санация",
		badge: "Эконом",
		badgeClass: "bg-muted/40 text-muted-foreground border-border",
		borderClass: "border-border hover:border-foreground/40",
		isRecommended: false,
		warrantyYears: "1 год",
		materialsHeadline: "Имплантаты Osstem TS-III / MIS, металлокерамика Co-Cr Vita VM13, микрогибридные композиты",
		materialsList: [
			"Дентальная имплантация Osstem TS-III / MIS V3",
			"Металлокерамические коронки с нанесением керамики Vita",
			"Базовая терапевтическая санация и коффердам",
			"Гарантия клиники 1 год",
		],
		keyAdvantages: [
			"Минимальная стоимость надежного восстановления зубов",
			"Проверенные временем протоколы и сплавы",
			"Поэтапная оплата по графику 30/40/30",
		],
	},
	standard: {
		title: "★ Оптимум (Рекомендуемый клинический стандарт)",
		subtitle: "Клинический золотой стандарт: Dentium SuperLine / Osstem, коронки из многослойного диоксида циркония ZrO2",
		badge: "★ Оптимум — Выбор врачей",
		badgeClass: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30",
		borderClass: "border-[var(--teal,var(--brand-primary))]/50 hover:border-[var(--teal,var(--brand-primary))] shadow-md",
		isRecommended: true,
		warrantyYears: "3 года",
		materialsHeadline: "Имплантаты Dentium SuperLine / Osstem, диоксид циркония Katana ML, остеопластика Bio-Oss",
		materialsList: [
			"Имплантаты Dentium SuperLine SLA с высокой первичной стабильностью",
			"Безметалловые коронки из многослойного диоксида циркония Katana ML 1200 МПа",
			"Прецизионный транскрестальный / открытый синус-лифтинг Geistlich Bio-Oss",
			"Анатомический билд-ап со стекловолоконным штифтом RelyX",
			"Гарантия клиники 3 года",
		],
		keyAdvantages: [
			"Идеальное сочетание прочности, биосовместимости и долговечности",
			"Отсутствие синюшности десны за счет безметаллового циркония",
			"Надежная остеоинтеграция 98.8% по данным КЛКТ",
			"Возможность беспроцентной рассрочки 0% на 12 месяцев",
		],
	},
	optimum: {
		title: "Премиум (Топовые системы и эстетика высшего класса)",
		subtitle: "Швейцарские имплантаты Straumann Roxolid SLActive / Nobel Biocare, индивидуальные абатменты и керамика E.max",
		badge: "Премиум — Превосходство",
		badgeClass: "bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-400/60 font-bold",
		borderClass: "border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10",
		isRecommended: false,
		warrantyYears: "Пожизненная (5 лет клиника)",
		materialsHeadline: "Имплантаты Straumann Roxolid SLActive / Nobel Biocare, индивидуальный Ti-Base абатмент, керамика IPS e.max Press",
		materialsList: [
			"Премиальные швейцарские имплантаты Straumann SLActive (ускоренное приживление за 3-4 нед)",
			"Индивидуальный титано-циркониевый абатмент для безупречного десневого края",
			"Высокоэстетичные цельнокерамические коронки IPS e.max Press / Katana UTML",
			"Интраоральное цифровое 3D-сканирование 3Shape TRIOS без снятия слепков",
			"Пожизненная международная гарантия производителя на имплантаты",
		],
		keyAdvantages: [
			"Бескомпромиссная надежность при минимальной толщине кости",
			"Естественная эстетика живого зуба со светопроницаемостью",
			"Индивидуальное сопровождение куратора лечения",
			"Максимальный налоговый вычет 13% со всей суммы без лимита (Код 02)",
		],
	},
};

export function generateCbctAutoPlanScenarios(
	findings: CbctAutoPlanFindingsInput,
	catalog?: readonly CatalogServiceLookupItem[] | undefined,
	discountPercent: number = 0,
): [TreatmentPlanTier, TreatmentPlanTier, TreatmentPlanTier] {
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));

	function buildTier(tierId: TreatmentPlanTierId): TreatmentPlanTier {
		const meta = TIER_METAS[tierId];
		const s1: TreatmentPlanItem[] = [];
		const s2: TreatmentPlanItem[] = [];
		const s3: TreatmentPlanItem[] = [];
		const s4: TreatmentPlanItem[] = [];

		// КЛКТ диагностика
		const cbctPrice = resolveCatalogPrice("A06.07.012", 3800, catalog);
		s1.push(
			makePlanItem(
				`cbct-diag-${tierId}-${Date.now()}`,
				undefined,
				"A06.07.012",
				"3D Компьютерная томография (КЛКТ) челюстно-лицевой области (обе челюсти)",
				"Диагностика",
				cbctPrice,
				1,
				"stage_1_therapy",
				"Конусно-лучевой компьютерный томограф (КЛКТ)",
				"3D-оценка плотности кости по Misch, нижнечелюстного канала и гайморовых пазух",
			),
		);

		if (findings.toothDestructions && findings.toothDestructions.length > 0) {
			for (const td of findings.toothDestructions) {
				const b = buildDestructionAndProstheticsItems(td, tierId, catalog);
				s1.push(...b.emergencyItems);
				s2.push(...b.therapyItems);
				s3.push(...b.surgeryItems);
				s4.push(...b.orthoItems);
			}
		}

		if (findings.boneDefects && findings.boneDefects.length > 0) {
			for (const bd of findings.boneDefects) {
				s3.push(...buildBoneAugmentationItems(bd, tierId, catalog));
			}
		}

		if (findings.implants && findings.implants.length > 0) {
			for (const imp of findings.implants) {
				const effectiveImp: CbctImplantFinding = findings.tierBrands?.[tierId]
					? { ...imp, brand: findings.tierBrands[tierId], implantSpec: imp.implantSpec ? { ...imp.implantSpec, brand: findings.tierBrands[tierId]! } : undefined }
					: imp;
				s3.push(...buildImplantSurgicalPackageItems(effectiveImp, tierId, catalog));

				if (
					imp.needsSinusLift ||
					(imp.ridgeHeightMm !== null && imp.ridgeHeightMm !== undefined && imp.ridgeHeightMm < 8.0 && [14, 15, 16, 17, 24, 25, 26, 27].includes(imp.toothFdi))
				) {
					s3.push(
						...buildBoneAugmentationItems(
							{
								toothFdi: imp.toothFdi,
								region: "maxilla_sinus",
								defectType: "sinus_pneumatization",
								residualHeightMm: imp.ridgeHeightMm ?? 6.0,
								recommendedAugmentation: (imp.ridgeHeightMm ?? 6.0) >= 5.0 ? "closed_sinus_lift" : "open_sinus_lift",
							},
							tierId,
							catalog,
						),
					);
				}

				const ob = buildDestructionAndProstheticsItems(
					{
						toothFdi: imp.toothFdi,
						destructionLevel: "missing",
						crownRecommendation: tierId === "optimum" ? "emax" : tierId === "standard" ? "zirconia" : "metalloceramic",
					},
					tierId,
					catalog,
				);
				s4.push(...ob.orthoItems);
			}
		}

		function makeStage(
			stageNum: number,
			stageTitle: string,
			subtitleText: string,
			goal: string,
			stageKind: "stage_1_therapy" | "stage_2_surgery" | "stage_3_orthopedics",
			items: TreatmentPlanItem[],
		): TreatmentPlanStage {
			const itemsWithDisc = items.map((it) => ({
				...it,
				discountRub: Math.round(((it.priceRub * it.quantity) * validDiscountPct) / 100),
			}));
			const totalRub = itemsWithDisc.reduce((acc, it) => acc + (it.priceRub * it.quantity - it.discountRub), 0);
			return {
				stageNumber: stageNum,
				stageKind,
				title: stageTitle,
				subtitle: subtitleText,
				clinicalGoal: goal,
				items: itemsWithDisc,
				totalRub,
				totalKopecks: parseKopecks(totalRub),
				estimatedVisits: Math.max(1, Math.ceil(items.length / 2)),
				estimatedWeeks: stageNum === 3 ? 16 : stageNum === 4 ? 4 : 2,
				order804nCodes: Array.from(new Set(items.map((i) => i.code804n))),
			};
		}

		const stages: [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] = [
			makeStage(1, "Этап I: Неотложная помощь и купирование воспаления", "Диагностика КЛКТ 3D и купирование острой боли", "Устранение воспалительных очагов и подготовка челюсти", "stage_1_therapy", s1),
			makeStage(2, "Этап II: Терапевтическая санация и эндодонтия", "Лечение кариеса, нанокомпозиты и обтурация каналов", "Полное оздоровление сохранившихся зубов", "stage_1_therapy", s2),
			makeStage(3, "Этап III: Хирургический этап и дентальная имплантация", "Атравматичные удаления, синус-лифтинг и имплантация", "Восстановление объема челюстной кости и остеоинтеграция опор", "stage_2_surgery", s3),
			makeStage(4, "Этап IV: Ортопедическая реабилитация и протезирование", "Прецизионные оттиски/сканы, коронки и фиксация в прикусе", "Эстетическое и функциональное восстановление улыбки", "stage_3_orthopedics", s4),
		];

		const allItems = stages.flatMap((s) => s.items);
		const totalKopecks = sumKopecks(stages.map((s) => s.totalKopecks));
		const totalRub = Math.round(totalKopecks / 100);

		const ndflBreakdown = calculatePlanTaxDeductionBreakdown(allItems);
		const isHighCost = ndflBreakdown.hasCode02ExpensiveServices;
		const ndflDetails: NdflDeductionResult = {
			code: isHighCost ? "02" : "01",
			codeDescription: isHighCost
				? "Код 02 — Дорогостоящее лечение (дентальная имплантация, синус-лифтинг, остеопластика) — налоговый вычет 13% со всей суммы без ограничений"
				: "Код 01 — Обычное медицинское лечение — налоговый вычет 13% с лимитом базы 150 000 ₽",
			isHighCostCode02: isHighCost,
			baseKopecks: (isHighCost ? totalKopecks : Math.min(totalKopecks, parseKopecks(150000))) as Kopecks,
			refundKopecks: parseKopecks(ndflBreakdown.grandTotalRefund13Rub),
			refundRub: ndflBreakdown.grandTotalRefund13Rub,
			finalPriceWithRefundRub: ndflBreakdown.netPriceWithRefundRub,
			annualLimitRub: isHighCost ? undefined : 150000,
		};

		const installments = computeTierInstallments(totalKopecks);
		const stagedSchedule = calculateStaged304030Schedule(totalKopecks, true);
		const estimatedWeeks = stages.reduce((acc, s) => acc + s.estimatedWeeks, 0);
		const estimatedVisits = stages.reduce((acc, s) => acc + s.estimatedVisits, 0);

		return {
			tierId,
			title: meta.title,
			subtitle: meta.subtitle,
			badge: meta.badge,
			badgeClass: meta.badgeClass,
			borderClass: meta.borderClass,
			isRecommended: meta.isRecommended,
			totalRub,
			totalKopecks,
			durationWeeks: estimatedWeeks,
			durationVisits: estimatedVisits,
			warrantyYears: meta.warrantyYears,
			materialsHeadline: meta.materialsHeadline,
			materialsList: meta.materialsList,
			keyAdvantages: meta.keyAdvantages,
			stages,
			itemsCount: allItems.length,
			ndflRefundRub: ndflDetails.refundRub,
			priceWithNdflRefundRub: ndflDetails.finalPriceWithRefundRub,
			monthlyInstallment12Rub: installments[12]?.monthlyPaymentRub ?? 0,
			installments,
			ndflDetails,
			stagedSchedule,
		};
	}

	return [buildTier("economy"), buildTier("standard"), buildTier("optimum")];
}

// ─── 7. ИЗВЛЕЧЕНИЕ НАХОДОК ИЗ ОДОНТОГРАММЫ И ХРАНИЛИЩА ───────────────────────

export function extractCbctFindingsFromOdontogramAndStorage(
	patientId?: string | undefined,
	teethData?: readonly ToothData[] | undefined,
): CbctAutoPlanFindingsInput {
	const implants: CbctImplantFinding[] = [];
	const boneDefects: CbctBoneDefectFinding[] = [];
	const toothDestructions: CbctToothDestructionFinding[] = [];

	if (patientId) {
		const savedItems = loadPersistedCustomPlanItems(patientId);
		for (const it of savedItems) {
			if (it.toothNumber && it.code804n.startsWith("A16.07.054")) {
				implants.push({
					toothFdi: it.toothNumber,
					brand: "dentium",
					diameterMm: 4.0,
					lengthMm: 10.0,
					angulationDeg: 0,
					ridgeHeightMm: 11.5,
					ridgeWidthMm: 7.2,
					meanHU: 720,
					mischClass: "D2",
					nerveClearanceMm: 4.2,
					recommendedTorqueNcm: "35-45 Н·см",
				});
			}
		}
	}

	if (teethData && teethData.length > 0) {
		for (const tooth of teethData) {
			const rawNum =
				tooth.toothNumber ??
				(typeof (tooth as any).id === "number"
					? (tooth as any).id
					: Number.parseInt(String((tooth as any).id), 10));
			if (!rawNum || Number.isNaN(rawNum)) continue;
			const num = rawNum;
			const state = ((tooth as any).state || (tooth as any).status || "").toLowerCase();

			if (state.includes("implant") || state.includes("planned_implant")) {
				if (!implants.some((i) => i.toothFdi === num)) {
					implants.push({
						toothFdi: num,
						brand: num === 46 || num === 48 ? "dentium" : "osstem",
						diameterMm: num % 10 >= 6 ? 4.5 : 4.0,
						lengthMm: 10.0,
						angulationDeg: 0,
						ridgeHeightMm: num === 48 ? 10.2 : 12.0,
						ridgeWidthMm: 6.8,
						meanHU: 680,
						mischClass: "D2",
						nerveClearanceMm: num >= 44 && num <= 48 ? 3.5 : null,
						recommendedTorqueNcm: ">= 35 Н·см",
						needsSinusLift: [15, 16, 17, 25, 26, 27].includes(num),
					});
				}
			} else if (state.includes("missing") || state.includes("absent")) {
				if (!implants.some((i) => i.toothFdi === num)) {
					const isUpperMolar = [14, 15, 16, 17, 24, 25, 26, 27].includes(num);
					implants.push({
						toothFdi: num,
						brand: "dentium",
						diameterMm: num % 10 >= 6 ? 4.5 : 4.0,
						lengthMm: 10.0,
						ridgeHeightMm: isUpperMolar ? 6.5 : 11.0,
						ridgeWidthMm: 6.5,
						mischClass: isUpperMolar ? "D3" : "D2",
						needsSinusLift: isUpperMolar,
						sinusLiftType: isUpperMolar ? "closed" : undefined,
						nerveClearanceMm: num >= 45 && num <= 48 ? 3.8 : null,
					});

					if (isUpperMolar) {
						boneDefects.push({
							toothFdi: num,
							region: "maxilla_sinus",
							defectType: "sinus_pneumatization",
							residualHeightMm: 6.5,
							recommendedAugmentation: "closed_sinus_lift",
							notes: `Пневматизация синуса в проекции зуба #${num}`,
						});
					}
				}
			} else if (state.includes("pulpitis") || state.includes("periodontitis") || state.includes("caries")) {
				toothDestructions.push({
					toothFdi: num,
					destructionLevel: state.includes("periodontitis")
						? "periodontitis_periapical"
						: state.includes("pulpitis")
							? "pulpitis"
							: "caries",
					rootCanalCount: num % 10 >= 6 ? 3 : num % 10 >= 4 ? 2 : 1,
					crownRecommendation: num % 10 >= 4 ? "zirconia" : "composite",
				});
			} else if (state.includes("root") || state.includes("fracture") || state.includes("hopeless")) {
				toothDestructions.push({
					toothFdi: num,
					destructionLevel: "subgingival_fracture_hopeless",
					isHopelessForExtraction: true,
					crownRecommendation: "zirconia",
				});
			}
		}
	}

	if (implants.length === 0 && toothDestructions.length === 0) {
		implants.push({
			toothFdi: 46,
			brand: "dentium",
			diameterMm: 4.5,
			lengthMm: 10.0,
			angulationDeg: 2.0,
			ridgeHeightMm: 12.4,
			ridgeWidthMm: 7.5,
			meanHU: 750,
			mischClass: "D2",
			nerveClearanceMm: 4.5,
			recommendedTorqueNcm: "35-45 Н·см",
			drillingProtocol: "Пилот 2.0 -> Сверло 3.4 -> Формирующее 4.0",
		});
		toothDestructions.push({
			toothFdi: 47,
			destructionLevel: "caries",
			crownRecommendation: "composite",
		});
	}

	return {
		patientId,
		implants,
		boneDefects,
		toothDestructions,
		generalFindings: ["КЛКТ челюстно-лицевой области 0.2 мм"],
		maxillaSinusPneumatization: boneDefects.some((d) => d.region === "maxilla_sinus"),
		mandibleAtrophy: implants.some((i) => i.ridgeHeightMm !== null && i.ridgeHeightMm !== undefined && i.ridgeHeightMm < 9.0),
	};
}
