import type { ImplantBrandKey } from "../../radiology/implantSafetyEngine";
import type { CatalogServiceLookupItem } from "../treatmentPlanStagesEngine";
import type { TreatmentPlanItem, TreatmentPlanTierId } from "../types";
import { BRAND_DEFAULTS, makePlanItem, resolveCatalogPrice } from "./implantBrandDefaults";
import type { CbctImplantFinding } from "./types";

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
