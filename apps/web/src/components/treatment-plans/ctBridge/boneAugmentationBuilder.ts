import type { CatalogServiceLookupItem } from "../treatmentPlanStagesEngine";
import type { TreatmentPlanItem, TreatmentPlanTierId } from "../types";
import { makePlanItem, resolveCatalogPrice } from "./implantBrandDefaults";
import type { CbctBoneDefectFinding } from "./types";

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
