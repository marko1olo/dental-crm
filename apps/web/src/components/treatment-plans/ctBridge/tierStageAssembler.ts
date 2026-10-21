import { parseKopecks } from "@dental/shared";
import type { CatalogServiceLookupItem } from "../treatmentPlanStagesEngine";
import type { TreatmentPlanItem, TreatmentPlanStage, TreatmentPlanTierId } from "../types";
import { buildBoneAugmentationItems } from "./boneAugmentationBuilder";
import { buildDestructionAndProstheticsItems } from "./destructionProstheticsBuilder";
import { makePlanItem, resolveCatalogPrice } from "./implantBrandDefaults";
import { buildImplantSurgicalPackageItems } from "./implantPackageBuilder";
import type { CbctAutoPlanFindingsInput, CbctImplantFinding } from "./types";

export function assembleTierStages(
	findings: CbctAutoPlanFindingsInput,
	tierId: TreatmentPlanTierId,
	catalog?: readonly CatalogServiceLookupItem[] | undefined,
	validDiscountPct: number = 0,
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	const s1: TreatmentPlanItem[] = [];
	const s2: TreatmentPlanItem[] = [];
	const s3: TreatmentPlanItem[] = [];
	const s4: TreatmentPlanItem[] = [];

	const cbctPrice = resolveCatalogPrice("A06.07.012", 3800, catalog);
	s1.push(
		makePlanItem(`cbct-diag-${tierId}-${Date.now()}`, undefined, "A06.07.012", "3D Компьютерная томография (КЛКТ) челюстно-лицевой области (обе челюсти)", "Диагностика", cbctPrice, 1, "stage_1_therapy", "Конусно-лучевой компьютерный томограф (КЛКТ)", "3D-оценка плотности кости по Misch, нижнечелюстного канала и гайморовых пазух"),
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

			if (imp.needsSinusLift || (imp.ridgeHeightMm !== null && imp.ridgeHeightMm !== undefined && imp.ridgeHeightMm < 8.0 && [14, 15, 16, 17, 24, 25, 26, 27].includes(imp.toothFdi))) {
				s3.push(...buildBoneAugmentationItems({ toothFdi: imp.toothFdi, region: "maxilla_sinus", defectType: "sinus_pneumatization", residualHeightMm: imp.ridgeHeightMm ?? 6.0, recommendedAugmentation: (imp.ridgeHeightMm ?? 6.0) >= 5.0 ? "closed_sinus_lift" : "open_sinus_lift" }, tierId, catalog));
			}

			const ob = buildDestructionAndProstheticsItems({ toothFdi: imp.toothFdi, destructionLevel: "missing", crownRecommendation: tierId === "optimum" ? "emax" : tierId === "standard" ? "zirconia" : "metalloceramic" }, tierId, catalog);
			s4.push(...ob.orthoItems);
		}
	}

	function makeStage(stageNum: number, stageTitle: string, subtitleText: string, goal: string, stageKind: "stage_1_therapy" | "stage_2_surgery" | "stage_3_orthopedics", items: TreatmentPlanItem[]): TreatmentPlanStage {
		const itemsWithDisc = items.map((it) => ({ ...it, discountRub: Math.round(((it.priceRub * it.quantity) * validDiscountPct) / 100) }));
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
			serviceCatalogCodes: Array.from(new Set(items.map((i) => i.code804n))),
			order804nCodes: Array.from(new Set(items.map((i) => i.code804n))),
		};
	}

	return [
		makeStage(1, "Этап I: Неотложная помощь и купирование воспаления", "Диагностика КЛКТ 3D и купирование острой боли", "Устранение воспалительных очагов и подготовка челюсти", "stage_1_therapy", s1),
		makeStage(2, "Этап II: Терапевтическая санация и эндодонтия", "Лечение кариеса, нанокомпозиты и обтурация каналов", "Полное оздоровление сохранившихся зубов", "stage_1_therapy", s2),
		makeStage(3, "Этап III: Хирургический этап и дентальная имплантация", "Атравматичные удаления, синус-лифтинг и имплантация", "Восстановление объема челюстной кости и остеоинтеграция опор", "stage_2_surgery", s3),
		makeStage(4, "Этап IV: Ортопедическая реабилитация и протезирование", "Прецизионные оттиски/сканы, коронки и фиксация в прикусе", "Эстетическое и функциональное восстановление улыбки", "stage_3_orthopedics", s4),
	];
}
