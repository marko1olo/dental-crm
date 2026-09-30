/**
 * treatmentPlanTierStagesGenerator.ts — генератор этапов по тарифам («Эконом», «Стандарт», «Оптимальный»).
 */

import { parseKopecks, sumKopecks } from "@dental/shared";
import type { ToothData, ToothState } from "../odontogram/ToothChart";
import type { TreatmentPlanItem, TreatmentPlanStage, TreatmentPlanTierId } from "./types";
import type { CatalogServiceLookupItem } from "./treatmentPlanPricingEngine";
import {
	DEMO_SHOWCASE_TEETH,
	isDemoShowcaseMode,
	generateTreatmentPlanStages,
} from "./treatmentPlanAutoGenerator";
import {
	ORDER_804N_DICTIONARY,
	UPPER_ARCH_TEETH,
	LOWER_ARCH_TEETH,
	isDeciduousTooth,
	extractCanalCount,
	getEndoPreparationProcedure,
	getEndoObturationProcedure,
	isMolarOrPremolar,
} from "./treatmentPlanNomenclature804n";
import { createPlanItem, makeEmptyStage } from "./treatmentPlanItemFactory";

export function generateTierPlanStages(
	tierId: TreatmentPlanTierId,
	teeth: readonly ToothData[],
	catalog?: readonly CatalogServiceLookupItem[],
	discountPercent: number = 0,
	options?: { isDemoMode?: boolean },
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	const isDemo = isDemoShowcaseMode(options?.isDemoMode);
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));


	const effectiveTeeth =
		isDemo && (!teeth || teeth.length === 0 || !teeth.some((t) => (t.state && t.state !== "Healthy" && t.state !== "Filled") || Boolean(t.boneLossLevel && t.boneLossLevel > 0)))
			? DEMO_SHOWCASE_TEETH
			: teeth;

	// Для тарифа Стандарт используем базовый генератор
	if (tierId === "standard") {
		return generateTreatmentPlanStages(effectiveTeeth, catalog, discountPercent, { isDemoMode: isDemo });
	}

	const hasPathology = effectiveTeeth.some((t) => {
		const s = t.state || "Healthy";
		return (
			(s !== "Healthy" && s !== "Filled") ||
			Boolean(t.boneLossLevel && t.boneLossLevel > 0) ||
			Boolean(t.mobility && t.mobility > 0) ||
			Boolean(t.furcationGrade && t.furcationGrade > 0)
		);
	});

	if (!hasPathology) {
		return [
			makeEmptyStage(1, "stage_1_therapy", "Этап 1: Неотложная терапия и санация", "Санация полости рта."),
			makeEmptyStage(2, "stage_2_surgery", "Этап 2: Хирургия и имплантация", "Хирургическая санация."),
			makeEmptyStage(3, "stage_3_orthopedics", "Этап 3: Ортопедическая реабилитация", "Ортопедическая реабилитация."),
		];
	}

	const stage1Items: TreatmentPlanItem[] = [];
	const stage2Items: TreatmentPlanItem[] = [];
	const stage3Items: TreatmentPlanItem[] = [];

	let hasImplants = false;

	// КЛКТ диагностика и гигиена
	const defCT = ORDER_804N_DICTIONARY.DiagnosticsCT!;
	stage1Items.push(
		createPlanItem("s1-ct-diag", 1, "stage_1_therapy", defCT, undefined, catalog, validDiscountPct, { isDemoMode: isDemo }),
	);

	const defHygiene = ORDER_804N_DICTIONARY.HygieneComplex!;
	stage1Items.push(
		createPlanItem(
			"s1-hygiene",
			1,
			"stage_1_therapy",
			defHygiene,
			undefined,
			catalog,
			validDiscountPct,
			{
				customTitle:
					tierId === "optimum"
						? "Премиальная гигиена Air-Flow Plus с глицином + фторирование Clinpro"
						: "Базовая профессиональная гигиена и снятие зубного камня",
				isDemoMode: isDemo,
			},
		),
	);

	const missingUpper: number[] = [];
	const missingLower: number[] = [];

	for (const tooth of effectiveTeeth) {
		const num = tooth.toothNumber;
		const state: ToothState | string = tooth.state || "Healthy";
		const isDeciduous = isDeciduousTooth(num);

		if (isDeciduous) {
			if (state === "Caries") {
				const defPed = ORDER_804N_DICTIONARY.PediatricCariesTherapy!;
				stage1Items.push(createPlanItem("s1-ped-" + num, 1, "stage_1_therapy", defPed, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			} else if (state === "Pulpitis") {
				const defPulp = ORDER_804N_DICTIONARY.PediatricPulpitisPulpotomy!;
				stage1Items.push(createPlanItem("s1-ped-pulp-" + num, 1, "stage_1_therapy", defPulp, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
				const defCrown = ORDER_804N_DICTIONARY.PediatricCrownSSC!;
				stage3Items.push(createPlanItem("s3-ped-crown-" + num, 3, "stage_3_orthopedics", defCrown, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			} else if (state === "Periodontitis" || state === "Root" || state === "Impacted") {
				const defExt = ORDER_804N_DICTIONARY.PediatricExtraction!;
				stage2Items.push(createPlanItem("s2-ped-ext-" + num, 2, "stage_2_surgery", defExt, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			}
			continue;
		}

		if (state === "Missing") {
			const quadrant = Math.floor(num / 10);
			if (quadrant === 1 || quadrant === 2) missingUpper.push(num);
			else missingLower.push(num);
			continue;
		}

		if (state === "Root") {
			const defExt = ORDER_804N_DICTIONARY.SimpleExtraction!;
			stage2Items.push(
				createPlanItem(
					"s2-root-" + num,
					2,
					"stage_2_surgery",
					defExt,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Атравматичное удаление корня зуба №" + num,
						isDemoMode: isDemo,
					},
				),
			);
			const quadrant = Math.floor(num / 10);
			if (quadrant === 1 || quadrant === 2) missingUpper.push(num);
			else missingLower.push(num);
			continue;
		}

		if (state === "Impacted") {
			const defComplexExt = ORDER_804N_DICTIONARY.ComplexExtraction!;
			stage2Items.push(createPlanItem("s2-impacted-" + num, 2, "stage_2_surgery", defComplexExt, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			continue;
		}

		if (state === "Caries") {
			if (tierId === "economy") {
				const defCarEco = ORDER_804N_DICTIONARY.CariesTherapyEconomy!;
				stage1Items.push(
					createPlanItem(
						"s1-caries-eco-" + num,
						1,
						"stage_1_therapy",
						defCarEco,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Пломбирование зуба №" + num + " базовым световым композитом Gradia",
							isDemoMode: isDemo,
						},
					),
				);
			} else {
				// optimum: керамическая вкладка / накладка IPS e.max CAD в этап 3 (ортопедия)
				const defInlay = ORDER_804N_DICTIONARY.InlayOnlay!;
				stage3Items.push(
					createPlanItem(
						"s3-inlay-opt-" + num,
						3,
						"stage_3_orthopedics",
						defInlay,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Керамическая вкладка / накладка IPS e.max CAD на зуб №" + num,
							isDemoMode: isDemo,
						},
					),
				);
			}
		} else if (state === "Pulpitis" || state === "Periodontitis") {
			// Коффердам + Эндодонтия
			const defCofferdam = ORDER_804N_DICTIONARY.CofferdamIsolation!;
			stage1Items.push(createPlanItem("s1-cofferdam-" + num, 1, "stage_1_therapy", defCofferdam, num, catalog, validDiscountPct, { isDemoMode: isDemo }));

			const canalCount = extractCanalCount(tooth);
			const defPrep = getEndoPreparationProcedure(canalCount);
			stage1Items.push(
				createPlanItem(
					"s1-prep-" + num,
					1,
					"stage_1_therapy",
					defPrep,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle:
							tierId === "optimum"
								? "Обработка корневых каналов зуба №" + num + " под микроскопом Zeiss (" + canalCount + " кан.)"
								: "Инструментальная обработка каналов зуба №" + num + " (" + canalCount + " кан.)",
						isDemoMode: isDemo,
					},
				),
			);

			const defObt = getEndoObturationProcedure(canalCount);
			stage1Items.push(
				createPlanItem(
					"s1-obt-" + num,
					1,
					"stage_1_therapy",
					defObt,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "3D-обтурация каналов зуба №" + num + " горячей гуттаперчей (" + canalCount + " кан.)",
						isDemoMode: isDemo,
					},
				),
			);

			const defBuildup = ORDER_804N_DICTIONARY.BuildupFiberPost!;
			stage1Items.push(createPlanItem("s1-buildup-" + num, 1, "stage_1_therapy", defBuildup, num, catalog, validDiscountPct, { isDemoMode: isDemo }));

			// Коронка на депульпированный моляр/премоляр
			if (isMolarOrPremolar(num)) {
				if (tierId === "economy") {
					const defMKK = ORDER_804N_DICTIONARY.CrownMetalCeramic!;
					stage3Items.push(
						createPlanItem(
							"s3-crown-mk-" + num,
							3,
							"stage_3_orthopedics",
							defMKK,
							num,
							catalog,
							validDiscountPct,
							{
								customTitle: "Металлокерамическая коронка на зуб №" + num,
								isDemoMode: isDemo,
							},
						),
					);
				} else {
					// optimum
					const defEmax = ORDER_804N_DICTIONARY.CrownEmaxCeramic!;
					stage3Items.push(
						createPlanItem(
							"s3-crown-emax-" + num,
							3,
							"stage_3_orthopedics",
							defEmax,
							num,
							catalog,
							validDiscountPct,
							{
								customTitle: "Премиальная керамическая коронка IPS e.max Press на зуб №" + num,
								isDemoMode: isDemo,
							},
						),
					);
				}
			}
		} else if (state === "Crown" || state === "CrownNeeded") {
			if (tierId === "economy") {
				const defMK = ORDER_804N_DICTIONARY.CrownMetalCeramic!;
				stage3Items.push(createPlanItem("s3-crown-" + num, 3, "stage_3_orthopedics", defMK, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			} else {
				const defEmax = ORDER_804N_DICTIONARY.CrownEmaxCeramic!;
				stage3Items.push(createPlanItem("s3-crown-" + num, 3, "stage_3_orthopedics", defEmax, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			}
		}
	}

	// Обработка адентии по тарифам
	function processTierMissingTeeth(jawSeq: readonly number[], missingList: number[], jawLabel: "верхней" | "нижней") {
		const missingSet = new Set(missingList);
		if (missingSet.size === 0) return;

		// Тотальная адентия (>10 зубов)
		if (missingSet.size > 10) {
			if (tierId === "economy") {
				// Эконом: Съемный пластиночный / бюгельный протез
				const defClasp = ORDER_804N_DICTIONARY.ClaspProsthesisEconomy!;
				stage3Items.push(
					createPlanItem(
						"s3-full-clasp-" + jawLabel,
						3,
						"stage_3_orthopedics",
						defClasp,
						undefined,
						catalog,
						validDiscountPct,
						{
							customTitle: "Полный съемный пластиночный протез (" + jawLabel + " челюсть)",
							isDemoMode: isDemo,
						},
					),
				);
			} else {
				// Оптимум: Протокол All-on-6 на швейцарских Straumann + циркониевый мост на балке
				hasImplants = true;
				const defGuide = ORDER_804N_DICTIONARY.AllOn4SurgicalGuide!;
				stage2Items.push(
					createPlanItem(
						"s2-allon6-guide-" + jawLabel,
						2,
						"stage_2_surgery",
						defGuide,
						undefined,
						catalog,
						validDiscountPct,
						{
							customTitle: "Прецизионный навигационный 3D-шаблон All-on-6 (" + jawLabel + " челюсть)",
							isDemoMode: isDemo,
						},
					),
				);

				const defAllOn6 = ORDER_804N_DICTIONARY.AllOn6Implantation!;
				stage2Items.push(
					createPlanItem(
						"s2-allon6-implants-" + jawLabel,
						2,
						"stage_2_surgery",
						defAllOn6,
						undefined,
						catalog,
						validDiscountPct,
						{
							customTitle: "Установка 6 премиальных имплантатов Straumann SLActive All-on-6 (" + jawLabel + " челюсть)",
							isDemoMode: isDemo,
						},
					),
				);

				const defMultiUnit = ORDER_804N_DICTIONARY.MultiUnitAbutment!;
				stage2Items.push(
					createPlanItem(
						"s2-allon6-multiunit-" + jawLabel,
						2,
						"stage_2_surgery",
						defMultiUnit,
						undefined,
						catalog,
						validDiscountPct,
						{
							customTitle: "Установка мультиюнит-абатментов Straumann (6 шт, " + jawLabel + " челюсть)",
							quantity: 6,
							isDemoMode: isDemo,
						},
					),
				);

				const defAllOn6Prosth = ORDER_804N_DICTIONARY.AllOn6Prosthesis!;
				stage3Items.push(
					createPlanItem(
						"s3-allon6-prosthesis-" + jawLabel,
						3,
						"stage_3_orthopedics",
						defAllOn6Prosth,
						undefined,
						catalog,
						validDiscountPct,
						{
							customTitle: "Высокоэстетичный циркониевый протез All-on-6 на титановой балке (" + jawLabel + " челюсть)",
							isDemoMode: isDemo,
						},
					),
				);
			}
			return;
		}

		// Локальная адентия
		const handled = new Set<number>();
		let i = 0;
		while (i < jawSeq.length) {
			const tNum = jawSeq[i]!;
			if (missingSet.has(tNum) && !handled.has(tNum)) {
				const currentSpan: number[] = [tNum];
				let j = i + 1;
				while (j < jawSeq.length && missingSet.has(jawSeq[j]!) && !handled.has(jawSeq[j]!)) {
					currentSpan.push(jawSeq[j]!);
					j++;
				}

				if (tierId === "economy") {
					// Эконом: удаление корня / подготовка лунки + мостовидные металлокерамические протезы
					for (const missingT of currentSpan) {
						handled.add(missingT);
						const defExt = ORDER_804N_DICTIONARY.SimpleExtraction!;
						stage2Items.push(
							createPlanItem(
								"s2-eco-ext-" + missingT,
								2,
								"stage_2_surgery",
								defExt,
								missingT,
								catalog,
								validDiscountPct,
								{
									customTitle: "Удаление разрушенного корня / подготовка альвеолы зуба №" + missingT,
									isDemoMode: isDemo,
								},
							),
						);
						const defEcoBridge = ORDER_804N_DICTIONARY.BridgeProsthesisEconomy!;
						stage3Items.push(
							createPlanItem(
								"s3-eco-bridge-" + missingT,
								3,
								"stage_3_orthopedics",
								defEcoBridge,
								missingT,
								catalog,
								validDiscountPct,
								{
									customTitle: "Восстановление дефекта зуба №" + missingT + " металлокерамическим мостовидным протезом",
									isDemoMode: isDemo,
								},
							),
						);
					}
					i = j;
					continue;
				}

				// Оптимум (Премиум):
				if (currentSpan.length === 3) {
					hasImplants = true;
					const [tooth1, tooth2, tooth3] = currentSpan as [number, number, number];
					handled.add(tooth1);
					handled.add(tooth2);
					handled.add(tooth3);

					const defGuide = ORDER_804N_DICTIONARY.SurgicalNavigationGuide!;
					stage2Items.push(
						createPlanItem("s2-guide-" + tooth1, 2, "stage_2_surgery", defGuide, tooth1, catalog, validDiscountPct, { isDemoMode: isDemo }),
					);

					const defImpPrem = ORDER_804N_DICTIONARY.DentalImplantationPremium!;
					stage2Items.push(
						createPlanItem(
							"s2-imp-opt-" + tooth1,
							2,
							"stage_2_surgery",
							defImpPrem,
							tooth1,
							catalog,
							validDiscountPct,
							{
								customTitle: "Имплантация Straumann Roxolid SLActive в области зуба №" + tooth1,
								isDemoMode: isDemo,
							},
						),
					);
					stage2Items.push(
						createPlanItem(
							"s2-imp-opt-" + tooth3,
							2,
							"stage_2_surgery",
							defImpPrem,
							tooth3,
							catalog,
							validDiscountPct,
							{
								customTitle: "Имплантация Straumann Roxolid SLActive в области зуба №" + tooth3,
								isDemoMode: isDemo,
							},
						),
					);

					const defBridge = ORDER_804N_DICTIONARY.BridgeProsthesis!;
					stage3Items.push(
						createPlanItem(
							"s3-bridge-opt-" + tooth1 + "-" + tooth3,
							3,
							"stage_3_orthopedics",
							defBridge,
							tooth1,
							catalog,
							validDiscountPct,
							{
								customTitle: "Премиальный мостовидный протез E.max / Katana UTML на 2 имплантатах Straumann (№" + tooth1 + ", №" + tooth2 + ", №" + tooth3 + ")",
								relatedToothNumbers: [tooth1, tooth2, tooth3],
								isDemoMode: isDemo,
							},
						),
					);
					i = j;
					continue;
				}

				// Одиночные дефекты в Оптимум: Straumann + Ti-Base абатмент + коронка Katana/E.max
				for (const missingT of currentSpan) {
					hasImplants = true;
					handled.add(missingT);

					const defGuide = ORDER_804N_DICTIONARY.SurgicalNavigationGuide!;
					stage2Items.push(
						createPlanItem("s2-guide-" + missingT, 2, "stage_2_surgery", defGuide, missingT, catalog, validDiscountPct, { isDemoMode: isDemo }),
					);

					const defImpPrem = ORDER_804N_DICTIONARY.DentalImplantationPremium!;
					stage2Items.push(
						createPlanItem(
							"s2-imp-opt-" + missingT,
							2,
							"stage_2_surgery",
							defImpPrem,
							missingT,
							catalog,
							validDiscountPct,
							{
								customTitle: "Имплантация Straumann Roxolid SLActive в области зуба №" + missingT,
								isDemoMode: isDemo,
							},
						),
					);

					const defImpCrownPrem = ORDER_804N_DICTIONARY.ImplantCrownPremium!;
					stage3Items.push(
						createPlanItem(
							"s3-imp-crown-opt-" + missingT,
							3,
							"stage_3_orthopedics",
							defImpCrownPrem,
							missingT,
							catalog,
							validDiscountPct,
							{
								customTitle: "Протезирование на имплантате: индивидуальный Ti-Base абатмент + коронка Katana/E.max (№" + missingT + ")",
								isDemoMode: isDemo,
							},
						),
					);
				}
				i = j;
				continue;
			}
			i++;
		}
	}

	processTierMissingTeeth(UPPER_ARCH_TEETH, missingUpper, "верхней");
	processTierMissingTeeth(LOWER_ARCH_TEETH, missingLower, "нижней");

	// 3D-сканирование в Этап 3
	if (stage3Items.length > 0) {
		const defScan = ORDER_804N_DICTIONARY.IntraoralScanning3D!;
		stage3Items.unshift(createPlanItem("s3-scan", 3, "stage_3_orthopedics", defScan, undefined, catalog, validDiscountPct, { isDemoMode: isDemo }));
	}

	const s1TotalKopecks = sumKopecks(stage1Items.map((it) => parseKopecks(it.priceRub)));
	const s1Total = Math.round(s1TotalKopecks / 100);
	const s2TotalKopecks = sumKopecks(stage2Items.map((it) => parseKopecks(it.priceRub)));
	const s2Total = Math.round(s2TotalKopecks / 100);
	const s3TotalKopecks = sumKopecks(stage3Items.map((it) => parseKopecks(it.priceRub)));
	const s3Total = Math.round(s3TotalKopecks / 100);

	const stage1: TreatmentPlanStage = {
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		title: "Этап 1: Неотложная терапия и санация",
		subtitle:
			tierId === "optimum"
				? "Лечение под микроскопом Leica, КЛКТ 3D-диагностика, швейцарская гигиена Air-Flow и реставрации."
				: "Базовая терапия, устранение боли, гигиена и пломбирование.",
		clinicalGoal: "Устранение очагов воспаления и санация кариозных поражений.",
		items: stage1Items,
		totalRub: s1Total,
		totalKopecks: s1TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage1Items.length / 2)),
		estimatedWeeks: 2,
		order804nCodes: Array.from(new Set(stage1Items.map((i) => i.code804n))),
	};

	const stage2: TreatmentPlanStage = {
		stageNumber: 2,
		stageKind: "stage_2_surgery",
		title: "Этап 2: Хирургия и имплантация",
		subtitle: hasImplants
			? "Дентальная имплантация по 3D-шаблону. Включает период остеоинтеграции (3–6 месяцев)."
			: "Хирургическая санация полости рта.",
		clinicalGoal: "Установка дентальных имплантатов и подготовка костного ложа.",
		items: stage2Items,
		totalRub: s2Total,
		totalKopecks: s2TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage2Items.length / 2)),
		estimatedWeeks: hasImplants ? 16 : 2,
		order804nCodes: Array.from(new Set(stage2Items.map((i) => i.code804n))),
	};

	const stage3: TreatmentPlanStage = {
		stageNumber: 3,
		stageKind: "stage_3_orthopedics",
		title: "Этап 3: Ортопедическая реабилитация",
		subtitle:
			tierId === "optimum"
				? "Цифровой 3D-скан TRIOS, индивидуальные Ti-Base абатменты и премиальные коронки IPS e.max / Katana."
				: "Ортопедическое восстановление зубов и мостовидных протезов.",
		clinicalGoal: "Анатомическое протезирование и окклюзионная реабилитация.",
		items: stage3Items,
		totalRub: s3Total,
		totalKopecks: s3TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage3Items.length / 2)),
		estimatedWeeks: 4,
		order804nCodes: Array.from(new Set(stage3Items.map((i) => i.code804n))),
	};

	return [stage1, stage2, stage3];
}
