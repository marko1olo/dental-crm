import type { CatalogServiceLookupItem } from "../treatmentPlanStagesEngine";
import type { TreatmentPlanItem, TreatmentPlanTierId } from "../types";
import { makePlanItem, resolveCatalogPrice } from "./implantBrandDefaults";
import type { CbctToothDestructionFinding, DestructionPlanBreakdown } from "./types";

function buildTherapyAndExtractionItems(
	finding: CbctToothDestructionFinding,
	catalog?: readonly CatalogServiceLookupItem[] | undefined,
): { surgeryItems: TreatmentPlanItem[]; therapyItems: TreatmentPlanItem[] } {
	const toothFdi = finding.toothFdi;
	const prefix = `[Зуб ${toothFdi}] `;
	const now = Date.now();
	const surgeryItems: TreatmentPlanItem[] = [];
	const therapyItems: TreatmentPlanItem[] = [];

	if (finding.isHopelessForExtraction || finding.destructionLevel === "subgingival_fracture_hopeless") {
		const isMolar = toothFdi % 10 >= 6 || toothFdi % 10 === 8;
		const extCode = isMolar ? "A16.07.001.003" : "A16.07.001.001";
		const extTitle = isMolar
			? `${prefix}Разъединение корней и сложное удаление зуба`
			: `${prefix}Атравматичное удаление корня зуба с сохранением лунки`;
		const extPrice = resolveCatalogPrice(extCode, isMolar ? 5200 : 3500, catalog);
		surgeryItems.push(
			makePlanItem(`cbct-ext-${toothFdi}-${now}`, toothFdi, extCode, extTitle, "Хирургия", extPrice, 3, "stage_2_surgery", isMolar ? "Бор Lindemann, элеваторы" : "Люксаторы Hu-Friedy", `КЛКТ: поддесневой перелом корня #${toothFdi} > 80%.`),
			makePlanItem(`cbct-cur-${toothFdi}-${now}`, toothFdi, "A16.07.039.001", `${prefix}Кюретаж лунки зуба и санация периапикального очага`, "Хирургия", resolveCatalogPrice("A16.07.039.001", 1100, catalog), 3, "stage_2_surgery", "Ложка Фолькмана, хлоргексидин 0.05%", "Санация очага инфекции"),
			makePlanItem(`cbct-hem-${toothFdi}-${now}`, toothFdi, "A16.07.095", `${prefix}Гемостаз и внесение губки Альвожиль в лунку`, "Хирургия", resolveCatalogPrice("A16.07.095", 800, catalog), 3, "stage_2_surgery", "Губка Альванес / паста Альвожиль", "Профилактика альвеолита"),
			makePlanItem(`cbct-sock-${toothFdi}-${now}`, toothFdi, "A16.07.041", `${prefix}Консервация костной лунки остеопластиком (Bio-Oss Collagen)`, "Хирургия", resolveCatalogPrice("A16.07.041", 9500, catalog), 3, "stage_2_surgery", "Geistlich Bio-Oss Collagen 100 мг", "Сохранение контура альвеолярного гребня для отсроченной имплантации"),
		);
	} else if (finding.destructionLevel === "pulpitis" || finding.destructionLevel === "periodontitis_periapical") {
		const canals = finding.rootCanalCount ?? (toothFdi % 10 >= 6 ? 3 : toothFdi % 10 >= 4 ? 2 : 1);
		const prepPrice = resolveCatalogPrice(canals >= 3 ? "A16.07.030.003" : "A16.07.030.001", canals >= 3 ? 7500 : 3500, catalog);
		const obtPrice = resolveCatalogPrice(canals >= 3 ? "A16.07.008.003" : "A16.07.008.001", canals >= 3 ? 6000 : 2900, catalog);
		therapyItems.push(
			makePlanItem(`cbct-prep-${toothFdi}-${now}`, toothFdi, canals >= 3 ? "A16.07.030.003" : "A16.07.030.001", `${prefix}Машинная обработка ${canals} корневых каналов ProTaper`, "Эндодонтия", prepPrice, 2, "stage_1_therapy", "NiTi ProTaper Gold, NaOCl 3.25%", `КЛКТ-контроль: обработка ${canals} каналов`),
			makePlanItem(`cbct-obt-${toothFdi}-${now}`, toothFdi, canals >= 3 ? "A16.07.008.003" : "A16.07.008.001", `${prefix}3D-обтурация ${canals} корневых каналов гуттаперчей`, "Эндодонтия", obtPrice, 2, "stage_1_therapy", "Штифты ProTaper, силер AH Plus", "Трехмерная герметизация апекса"),
			makePlanItem(`cbct-bld-${toothFdi}-${now}`, toothFdi, "A16.07.002.001", `${prefix}Восстановление культи зуба (билд-ап со штифтом)`, "Терапия", resolveCatalogPrice("A16.07.002.001", 4800, catalog), 2, "stage_1_therapy", "Штифт RelyX Fiber, LuxaCore", "Культевая опора под коронку"),
		);
	} else if (finding.destructionLevel === "caries") {
		therapyItems.push(
			makePlanItem(`cbct-caries-${toothFdi}-${now}`, toothFdi, "A16.07.002.001", `${prefix}Лечение кариеса и пломба (нанокомпозит Estelite)`, "Терапия", resolveCatalogPrice("A16.07.002.001", 4800, catalog), 2, "stage_1_therapy", "Tokuyama Estelite Sigma Quick", "Восстановление анатомической формы"),
		);
	}

	return { surgeryItems, therapyItems };
}

function buildCrownOrthoItems(
	finding: CbctToothDestructionFinding,
	tierId: TreatmentPlanTierId,
	catalog?: readonly CatalogServiceLookupItem[] | undefined,
): TreatmentPlanItem[] {
	if (finding.crownRecommendation === "composite" || finding.destructionLevel === "caries") return [];
	const toothFdi = finding.toothFdi;
	const prefix = `[Зуб ${toothFdi}] `;
	const now = Date.now();

	if (tierId === "optimum") {
		return [
			makePlanItem(`cbct-scn-${toothFdi}-${now}`, toothFdi, "A02.07.010.001", `${prefix}Интраоральное 3D-сканирование (3Shape TRIOS)`, "Ортопедия", resolveCatalogPrice("A02.07.010.001", 4500, catalog), 4, "stage_3_orthopedics", "3Shape TRIOS", "Оптический 3D-слепок"),
			makePlanItem(`cbct-emx-${toothFdi}-${now}`, toothFdi, "A16.07.004.003", `${prefix}Цельнокерамическая коронка IPS e.max Press / Katana UTML`, "Ортопедия", resolveCatalogPrice("A16.07.004.003", 38000, catalog), 4, "stage_3_orthopedics", "IPS e.max Press", "Премиальная эстетика эмали"),
			makePlanItem(`cbct-fxa-${toothFdi}-${now}`, toothFdi, "A16.07.004.005", `${prefix}Адгезивная фиксация RelyX Ultimate`, "Ортопедия", resolveCatalogPrice("A16.07.004.005", 2500, catalog), 4, "stage_3_orthopedics", "RelyX Ultimate", "Монолитная фиксация"),
		];
	}
	if (tierId === "standard") {
		return [
			makePlanItem(`cbct-imp-${toothFdi}-${now}`, toothFdi, "A02.07.010", `${prefix}Прецизионный слепок А-силиконом (Elite HD+)`, "Ортопедия", resolveCatalogPrice("A02.07.010", 2500, catalog), 4, "stage_3_orthopedics", "Elite HD+", "Точный слепок уступа"),
			makePlanItem(`cbct-zr-${toothFdi}-${now}`, toothFdi, "A16.07.004.003", `${prefix}Анатомическая коронка ZrO2 Katana ML 1200 МПа`, "Ортопедия", resolveCatalogPrice("A16.07.004.003", 26000, catalog), 4, "stage_3_orthopedics", "ZrO2 Katana ML", "Прочность и градиент цвета"),
			makePlanItem(`cbct-fxz-${toothFdi}-${now}`, toothFdi, "A16.07.004.005", `${prefix}Фиксация циркониевой коронки на цемент Fuji PLUS`, "Ортопедия", resolveCatalogPrice("A16.07.004.005", 2000, catalog), 4, "stage_3_orthopedics", "GC Fuji PLUS", "Надежное краевое прилегание"),
		];
	}
	return [
		makePlanItem(`cbct-imp-e-${toothFdi}-${now}`, toothFdi, "A02.07.010", `${prefix}Анатомический слепок для металлокерамики`, "Ортопедия", resolveCatalogPrice("A02.07.010", 2200, catalog), 4, "stage_3_orthopedics", "С-силикон / А-силикон", "Анатомический оттиск"),
		makePlanItem(`cbct-mc-${toothFdi}-${now}`, toothFdi, "A16.07.004.001", `${prefix}Металлокерамическая коронка Vita VM13 Co-Cr`, "Ортопедия", resolveCatalogPrice("A16.07.004.001", 16000, catalog), 4, "stage_3_orthopedics", "Co-Cr, Vita VM13", "Восстановление жевания"),
		makePlanItem(`cbct-fxm-${toothFdi}-${now}`, toothFdi, "A16.07.004.002", `${prefix}Фиксация металлокерамики на цемент Fuji I`, "Ортопедия", resolveCatalogPrice("A16.07.004.002", 1500, catalog), 4, "stage_3_orthopedics", "GC Fuji I", "Долговременная фиксация"),
	];
}

export function buildDestructionAndProstheticsItems(
	finding: CbctToothDestructionFinding,
	tierId: TreatmentPlanTierId,
	catalog?: readonly CatalogServiceLookupItem[] | undefined,
): DestructionPlanBreakdown {
	const { surgeryItems, therapyItems } = buildTherapyAndExtractionItems(finding, catalog);
	const orthoItems = buildCrownOrthoItems(finding, tierId, catalog);
	return { emergencyItems: [], therapyItems, surgeryItems, orthoItems };
}
