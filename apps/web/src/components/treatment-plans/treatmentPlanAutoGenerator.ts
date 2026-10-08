/**
 * treatmentPlanAutoGenerator.ts — автоматическая 1-Click генерация этапов плана лечения по одонтограмме.
 *
 * Формирует 3 клинических этапа по Приказу Минздрава РФ № 804н:
 * - Этап 1: Неотложная терапия и санация (кариес, эндодонтия по числу каналов, коффердам, билдап, пародонтология SRP, профгигиена, КЛКТ).
 * - Этап 2: Хирургия и дентальная имплантация (удаление корней, костная пластика, навигационный шаблон, имплантаты, All-on-4, остеоинтеграция 3–6 мес).
 * - Этап 3: Ортопедическая реабилитация (3D-сканирование, коронки E.max / диоксид циркония, мостовидные протезы).
 */

import { type Kopecks, parseKopecks, sumKopecks } from "@dental/shared";
import type { ToothData, ToothState } from "../odontogram/ToothChart";
import type { TreatmentPlanItem, TreatmentPlanStage } from "./types";
import type { CatalogServiceLookupItem } from "./treatmentPlanPricingEngine";
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

export const DEMO_SHOWCASE_TEETH: readonly ToothData[] = [
	{ toothNumber: 16, state: "Caries", notes: "Глубокий кариес жевательной поверхности" },
	{ toothNumber: 36, state: "Missing", notes: "Отсутствует зуб, показана дентальная имплантация" },
	{ toothNumber: 46, state: "Pulpitis", notes: "Острый очаговый пульпит, эндодонтическое лечение" },
	{ toothNumber: 11, state: "Crown", notes: "Разрушение коронковой части, показана ортопедия" },
	{ toothNumber: 24, state: "Caries", notes: "Кариес контактной поверхности" },
];

import {
	isDemoShowcaseMode as isCentralDemoShowcaseMode,
	setRuntimeDemoMode as setCentralDemoShowcaseMode,
} from "../../lib/demoMode";

export function setDemoShowcaseMode(enabled: boolean | null): void {
	setCentralDemoShowcaseMode(enabled);
}

export function isDemoShowcaseMode(explicitOverride?: boolean): boolean {
	return isCentralDemoShowcaseMode(explicitOverride);
}

export function generateTreatmentPlanStages(
	teeth: readonly ToothData[],
	catalog?: readonly CatalogServiceLookupItem[],
	discountPercent: number = 0,
	options?: { isDemoMode?: boolean },
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));
	const isDemo = isDemoShowcaseMode(options?.isDemoMode);

	const effectiveTeeth =
		isDemo && (!teeth || teeth.length === 0 || !teeth.some((t) => (t.state && t.state !== "Healthy" && t.state !== "Filled") || Boolean(t.boneLossLevel && t.boneLossLevel > 0)))
			? DEMO_SHOWCASE_TEETH
			: teeth;

	// Проверка наличия каких-либо патологий: если все зубы Healthy или Filled -> возвращаем пустые этапы!
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
			makeEmptyStage(1, "stage_1_therapy", "Этап 1: Неотложная терапия и санация", "Устранение очагов острой боли, КЛКТ 3D-диагностика, профессиональная гигиена."),
			makeEmptyStage(2, "stage_2_surgery", "Этап 2: Хирургия и имплантация", "Хирургическая санация полости рта."),
			makeEmptyStage(3, "stage_3_orthopedics", "Этап 3: Ортопедическая реабилитация", "Ортопедическое восстановление зубных рядов."),
		];
	}

	const stage1Items: TreatmentPlanItem[] = [];
	const stage2Items: TreatmentPlanItem[] = [];
	const stage3Items: TreatmentPlanItem[] = [];

	let hasPeriodontalNeeds = false;
	let hasImplants = false;

	// 1. Предварительный пародонтологический скрининг
	for (const tooth of effectiveTeeth) {
		const hasBoneLoss = Boolean(tooth.boneLossLevel && tooth.boneLossLevel > 0);
		const hasMobility = Boolean(tooth.mobility && tooth.mobility > 0);
		const hasFurcation = Boolean(tooth.furcationGrade && tooth.furcationGrade > 0);

		if (hasBoneLoss || hasMobility || hasFurcation) {
			hasPeriodontalNeeds = true;
			const defSrp = ORDER_804N_DICTIONARY.PeriodontalScalingSRP!;
			stage1Items.push(
				createPlanItem(
					"s1-perio-srp-" + tooth.toothNumber,
					1,
					"stage_1_therapy",
					defSrp,
					tooth.toothNumber,
					catalog,
					validDiscountPct,
					{
						customTitle: "Скейлинг и пародонтологическая обработка корня зуба №" + tooth.toothNumber + " (SRP)",
						isDemoMode: isDemo,
					},
				),
			);

			if (hasBoneLoss && (tooth.boneLossLevel ?? 0) >= 2) {
				const defCurettage = ORDER_804N_DICTIONARY.PeriodontalClosedCurettage!;
				stage1Items.push(
					createPlanItem(
						"s1-perio-curettage-" + tooth.toothNumber,
						1,
						"stage_1_therapy",
						defCurettage,
						tooth.toothNumber,
						catalog,
						validDiscountPct,
						{
							customTitle: "Закрытый кюретаж пародонтального кармана зуба №" + tooth.toothNumber,
							isDemoMode: isDemo,
						},
					),
				);
			}

			if (hasMobility && (tooth.mobility ?? 0) >= 2) {
				const defSplint = ORDER_804N_DICTIONARY.PeriodontalSplinting!;
				stage1Items.push(
					createPlanItem(
						"s1-perio-splint-" + tooth.toothNumber,
						1,
						"stage_1_therapy",
						defSplint,
						tooth.toothNumber,
						catalog,
						validDiscountPct,
						{
							customTitle: "Шинирование подвижного зуба №" + tooth.toothNumber + " стекловолоконной лентой",
							isDemoMode: isDemo,
						},
					),
				);
			}
		}
	}

	// 2. Базовая гигиена и 3D КЛКТ диагностика в Этап 1
	const defCT = ORDER_804N_DICTIONARY.DiagnosticsCT!;
	stage1Items.unshift(
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
				customTitle: hasPeriodontalNeeds
					? "Комплексная гигиена + пародонтологическая антисептическая обработка (Air-Flow + УЗ)"
					: "Профессиональная гигиена полости рта (Air-Flow + УЗ-скейлинг)",
				isDemoMode: isDemo,
			},
		),
	);

	// 3. Анализ постоянных зубов и паттерн-матчинг
	const missingUpper: number[] = [];
	const missingLower: number[] = [];

	for (const tooth of effectiveTeeth) {
		const num = tooth.toothNumber;
		const state: ToothState | string = tooth.state || "Healthy";
		const isDeciduous = isDeciduousTooth(num);

		// ==========================================
		// ВРЕМЕННЫЙ (МОЛОЧНЫЙ) ПРИКУС
		// ==========================================
		if (isDeciduous) {
			if (state === "Caries") {
				const defPedCaries = ORDER_804N_DICTIONARY.PediatricCariesTherapy!;
				stage1Items.push(
					createPlanItem(
						"s1-ped-caries-" + num,
						1,
						"stage_1_therapy",
						defPedCaries,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Лечение кариеса молочного зуба №" + num + " биосовместимым материалом",
							isDemoMode: isDemo,
						},
					),
				);
			} else if (state === "Pulpitis") {
				const defPulpotomy = ORDER_804N_DICTIONARY.PediatricPulpitisPulpotomy!;
				stage1Items.push(
					createPlanItem(
						"s1-ped-pulpotomy-" + num,
						1,
						"stage_1_therapy",
						defPulpotomy,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Витальная пульпотомия молочного зуба №" + num + " с Biodentine/МТА",
							isDemoMode: isDemo,
						},
					),
				);
				// Защитная коронка SSC для депульпированного молочного зуба
				const defPedCrown = ORDER_804N_DICTIONARY.PediatricCrownSSC!;
				stage3Items.push(
					createPlanItem(
						"s3-ped-crown-" + num,
						3,
						"stage_3_orthopedics",
						defPedCrown,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Защитная коронка на депульпированный молочный зуб №" + num + " (3M SSC / NuSmile)",
							isDemoMode: isDemo,
						},
					),
				);
			} else if (state === "Periodontitis" || state === "Root" || state === "Impacted" || state === "Retained" || state === "Missing") {
				const defPedExt = ORDER_804N_DICTIONARY.PediatricExtraction!;
				stage2Items.push(
					createPlanItem(
						"s2-ped-extract-" + num,
						2,
						"stage_2_surgery",
						defPedExt,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Атравматичное удаление временного зуба №" + num,
							isDemoMode: isDemo,
						},
					),
				);
			}
			continue;
		}

		// ==========================================
		// ПОСТОЯННЫЙ ПРИКУС
		// ==========================================
		if (state === "Missing") {
			const quadrant = Math.floor(num / 10);
			if (quadrant === 1 || quadrant === 2) {
				missingUpper.push(num);
			} else if (quadrant === 3 || quadrant === 4) {
				missingLower.push(num);
			}
			continue;
		}

		if (state === "Root") {
			const defExt = ORDER_804N_DICTIONARY.SimpleExtraction!;
			stage2Items.push(
				createPlanItem(
					"s2-root-extract-" + num,
					2,
					"stage_2_surgery",
					defExt,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Атравматичное удаление разрушенного корня зуба №" + num + " с консервацией лунки",
						isDemoMode: isDemo,
					},
				),
			);
			// После удаления планируется имплантация и коронка
			const quadrant = Math.floor(num / 10);
			if (quadrant === 1 || quadrant === 2) {
				missingUpper.push(num);
			} else {
				missingLower.push(num);
			}
			continue;
		}

		if (state === "Impacted" || state === "Retained") {
			const defComplexExt = ORDER_804N_DICTIONARY.ComplexExtraction!;
			stage2Items.push(
				createPlanItem(
					"s2-impacted-extract-" + num,
					2,
					"stage_2_surgery",
					defComplexExt,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Сложное хирургическое удаление ретенированного/дистопированного зуба №" + num,
						isDemoMode: isDemo,
					},
				),
			);
			continue;
		}

		if (state === "Caries") {
			const defCaries = ORDER_804N_DICTIONARY.CariesTherapy!;
			stage1Items.push(
				createPlanItem(
					"s1-caries-" + num,
					1,
					"stage_1_therapy",
					defCaries,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Лечение кариеса зуба №" + num + " нанокомпозитом Estelite / Filtek",
						isDemoMode: isDemo,
					},
				),
			);
		} else if (state === "Pulpitis" || state === "Periodontitis") {
			// Паттерн депульпированных зубов (Pulpitis/Periodontitis):
			// 1. Коффердам (1 шт)
			const defCofferdam = ORDER_804N_DICTIONARY.CofferdamIsolation!;
			stage1Items.push(
				createPlanItem(
					"s1-cofferdam-" + num,
					1,
					"stage_1_therapy",
					defCofferdam,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Наложение коффердама для изоляции зуба №" + num,
						isDemoMode: isDemo,
					},
				),
			);

			// 2. Инструментальная обработка N каналов
			const canalCount = extractCanalCount(tooth);
			const defPrep = getEndoPreparationProcedure(canalCount);
			stage1Items.push(
				createPlanItem(
					"s1-endo-prep-" + num,
					1,
					"stage_1_therapy",
					defPrep,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Инструментальная и медикаментозная обработка корневых каналов зуба №" + num + " (" + canalCount + (canalCount === 1 ? " канал" : canalCount < 5 ? " канала" : " каналов") + ")",
						isDemoMode: isDemo,
					},
				),
			);

			// 3. 3D-обтурация гуттаперчей N каналов
			const defObt = getEndoObturationProcedure(canalCount);
			stage1Items.push(
				createPlanItem(
					"s1-endo-obt-" + num,
					1,
					"stage_1_therapy",
					defObt,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "3D-обтурация корневых каналов зуба №" + num + " горячей гуттаперчей с биокерамикой (" + canalCount + (canalCount === 1 ? " канал" : canalCount < 5 ? " канала" : " каналов") + ")",
						isDemoMode: isDemo,
					},
				),
			);

			// 4. Восстановление зуба под коронку (билдап со стекловолоконным штифтом)
			const defBuildup = ORDER_804N_DICTIONARY.BuildupFiberPost!;
			stage1Items.push(
				createPlanItem(
					"s1-buildup-" + num,
					1,
					"stage_1_therapy",
					defBuildup,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Восстановление культи зуба №" + num + " под коронку (Build-up со стекловолоконным штифтом)",
						isDemoMode: isDemo,
					},
				),
			);

			// 5. Для моляров и премоляров (жевательная группа): коронка в Этап 3!
			if (isMolarOrPremolar(num)) {
				const defCrown = ORDER_804N_DICTIONARY.CrownZirconia!;
				stage3Items.push(
					createPlanItem(
						"s3-crown-endo-" + num,
						3,
						"stage_3_orthopedics",
						defCrown,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Ортопедическая защита депульпированного зуба №" + num + " коронкой из диоксида циркония",
							isDemoMode: isDemo,
						},
					),
				);
			}
		} else if (state === "Crown" || state === "CrownNeeded") {
			const defCrown = ORDER_804N_DICTIONARY.CrownZirconia!;
			stage3Items.push(
				createPlanItem(
					"s3-crown-" + num,
					3,
					"stage_3_orthopedics",
					defCrown,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Восстановление зуба №" + num + " коронкой из диоксида циркония Prettau",
						isDemoMode: isDemo,
					},
				),
			);
		}
	}

	// 4. Клинический паттерн-матчинг адентии (Хирургия + Ортопедия)
	function processJawMissingTeeth(jawTeethSeq: readonly number[], missingList: number[], jawName: "верхней" | "нижней") {
		const missingSet = new Set(missingList);
		if (missingSet.size === 0) return;

		// Паттерн тотальной / субтотальной адентии (> 10 отсутствующих зубов на челюсти)
		if (missingSet.size > 10) {
			hasImplants = true;
			// 1. Навигационный 3D-шаблон для All-on-4
			const defGuide = ORDER_804N_DICTIONARY.AllOn4SurgicalGuide!;
			stage2Items.push(
				createPlanItem(
					"s2-allon4-guide-" + jawName,
					2,
					"stage_2_surgery",
					defGuide,
					undefined,
					catalog,
					validDiscountPct,
					{
						customTitle: "Хирургический навигационный 3D-шаблон для протокола All-on-4 (" + jawName + " челюсть)",
						isDemoMode: isDemo,
					},
				),
			);

			// 2. Установка 4 имплантатов
			const defAllOn4 = ORDER_804N_DICTIONARY.AllOn4Implantation!;
			stage2Items.push(
				createPlanItem(
					"s2-allon4-implants-" + jawName,
					2,
					"stage_2_surgery",
					defAllOn4,
					undefined,
					catalog,
					validDiscountPct,
					{
						customTitle: "Установка 4 дентальных имплантатов по протоколу All-on-4 (" + jawName + " челюсть)",
						quantity: 1,
						isDemoMode: isDemo,
					},
				),
			);

			// 3. Мультиюнит абатменты (4 шт)
			const defMultiUnit = ORDER_804N_DICTIONARY.MultiUnitAbutment!;
			stage2Items.push(
				createPlanItem(
					"s2-allon4-multiunit-" + jawName,
					2,
					"stage_2_surgery",
					defMultiUnit,
					undefined,
					catalog,
					validDiscountPct,
					{
						customTitle: "Установка мультиюнит-абатментов Multi-Unit (4 шт, " + jawName + " челюсть)",
						quantity: 4,
						isDemoMode: isDemo,
					},
				),
			);

			// 4. Несъемный армированный протез All-on-4 в Этап 3
			const defProsthesis = ORDER_804N_DICTIONARY.AllOn4Prosthesis!;
			stage3Items.push(
				createPlanItem(
					"s3-allon4-prosthesis-" + jawName,
					3,
					"stage_3_orthopedics",
					defProsthesis,
					undefined,
					catalog,
					validDiscountPct,
					{
						customTitle: "Несъемный армированный протез с винтовой фиксацией All-on-4 (" + jawName + " челюсть)",
						quantity: 1,
						isDemoMode: isDemo,
					},
				),
			);
			return;
		}

		// Поиск непрерывных участков адентии (spans) вдоль зубной дуги
		const handledTeeth = new Set<number>();
		let i = 0;
		while (i < jawTeethSeq.length) {
			const tNum = jawTeethSeq[i]!;
			if (missingSet.has(tNum) && !handledTeeth.has(tNum)) {
				const currentSpan: number[] = [tNum];
				let j = i + 1;
				while (j < jawTeethSeq.length && missingSet.has(jawTeethSeq[j]!) && !handledTeeth.has(jawTeethSeq[j]!)) {
					currentSpan.push(jawTeethSeq[j]!);
					j++;
				}

				// Паттерн 3 отсутствующих зуба подряд (например: 34, 35, 36 или 14, 15, 16)
				if (currentSpan.length === 3) {
					hasImplants = true;
					const [tooth1, tooth2, tooth3] = currentSpan as [number, number, number];
					handledTeeth.add(tooth1);
					handledTeeth.add(tooth2);
					handledTeeth.add(tooth3);

					// Хирургия: 2 имплантата на крайние позиции (tooth1 и tooth3), 0 на средний tooth2!
					const defImp = ORDER_804N_DICTIONARY.DentalImplantation!;
					stage2Items.push(
						createPlanItem(
							"s2-implant-span-" + tooth1,
							2,
							"stage_2_surgery",
							defImp,
							tooth1,
							catalog,
							validDiscountPct,
							{
								customTitle: "Дентальная имплантация в области зуба №" + tooth1 + " (крайняя опора моста)",
								isDemoMode: isDemo,
							},
						),
					);
					stage2Items.push(
						createPlanItem(
							"s2-implant-span-" + tooth3,
							2,
							"stage_2_surgery",
							defImp,
							tooth3,
							catalog,
							validDiscountPct,
							{
								customTitle: "Дентальная имплантация в области зуба №" + tooth3 + " (крайняя опора моста)",
								isDemoMode: isDemo,
							},
						),
					);

					// Ортопедия: Мостовидный протез на 3 единицы на 2 имплантатах
					const defBridge = ORDER_804N_DICTIONARY.BridgeProsthesis!;
					stage3Items.push(
						createPlanItem(
							"s3-bridge-span-" + tooth1 + "-" + tooth3,
							3,
							"stage_3_orthopedics",
							defBridge,
							tooth1,
							catalog,
							validDiscountPct,
							{
								customTitle: "Мостовидный протез из диоксида циркония на 2 имплантатах (3 единицы: №" + tooth1 + ", №" + tooth2 + ", №" + tooth3 + ")",
								relatedToothNumbers: [tooth1, tooth2, tooth3],
								quantity: 1,
								isDemoMode: isDemo,
							},
						),
					);
					i = j;
					continue;
				}

				// Одиночные дефекты или участки другой длины: 1 имплантат + 1 коронка на каждый отсутствующий зуб
				for (const missingT of currentSpan) {
					hasImplants = true;
					handledTeeth.add(missingT);

					const toothObj = effectiveTeeth.find((t) => t.toothNumber === missingT);
					if (toothObj?.boneLossLevel && toothObj.boneLossLevel >= 2) {
						const defBone = ORDER_804N_DICTIONARY.BoneGraftingSinusLift!;
						stage2Items.push(
							createPlanItem(
								"s2-bone-graft-" + missingT,
								2,
								"stage_2_surgery",
								defBone,
								missingT,
								catalog,
								validDiscountPct,
								{
									customTitle: "Костная пластика / синус-лифтинг в области зуба №" + missingT,
									isDemoMode: isDemo,
								},
							),
						);
					}

					// Хирургия: подготовка ложа + навигационный шаблон + имплантация
					const defExt = ORDER_804N_DICTIONARY.SimpleExtraction!;
					stage2Items.push(
						createPlanItem(
							"s2-extract-prep-" + missingT,
							2,
							"stage_2_surgery",
							defExt,
							missingT,
							catalog,
							validDiscountPct,
							{
								customTitle: "Подготовка костного ложа / атравматичное удаление корня №" + missingT,
								isDemoMode: isDemo,
							},
						),
					);

					const defGuide = ORDER_804N_DICTIONARY.SurgicalNavigationGuide!;
					stage2Items.push(
						createPlanItem(
							"s2-guide-" + missingT,
							2,
							"stage_2_surgery",
							defGuide,
							missingT,
							catalog,
							validDiscountPct,
							{
								customTitle: "Навигационный хирургический 3D-шаблон (позиция №" + missingT + ")",
								isDemoMode: isDemo,
							},
						),
					);

					const defImp = ORDER_804N_DICTIONARY.DentalImplantation!;
					stage2Items.push(
						createPlanItem(
							"s2-implant-" + missingT,
							2,
							"stage_2_surgery",
							defImp,
							missingT,
							catalog,
							validDiscountPct,
							{
								customTitle: "Дентальная имплантация в области зуба №" + missingT + " (Osstem TS-III / Dentium)",
								isDemoMode: isDemo,
							},
						),
					);

					// Ортопедия: протезирование на имплантате
					const defImpCrown = ORDER_804N_DICTIONARY.ImplantCrownProsthetics!;
					stage3Items.push(
						createPlanItem(
							"s3-implant-crown-" + missingT,
							3,
							"stage_3_orthopedics",
							defImpCrown,
							missingT,
							catalog,
							validDiscountPct,
							{
								customTitle: "Протезирование на имплантате коронкой из диоксида циркония (№" + missingT + ")",
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

	processJawMissingTeeth(UPPER_ARCH_TEETH, missingUpper, "верхней");
	processJawMissingTeeth(LOWER_ARCH_TEETH, missingLower, "нижней");

	// 5. Если в Этапе 3 есть ортопедия — добавляем 3D-сканирование в начало Этапа 3
	if (stage3Items.length > 0) {
		const defScan = ORDER_804N_DICTIONARY.IntraoralScanning3D!;
		stage3Items.unshift(
			createPlanItem(
				"s3-intraoral-scan",
				3,
				"stage_3_orthopedics",
				defScan,
				undefined,
				catalog,
				validDiscountPct,
				{
					customTitle: "Оптическое внутриротовое 3D-сканирование зубных рядов и регистрация прикуса",
					isDemoMode: isDemo,
				},
			),
		);
	}

	// 6. Хронология этапов и фиксация интервала остеоинтеграции (3-6 месяцев)
	const s1TotalKopecks = sumKopecks(stage1Items.map((it) => parseKopecks(it.priceRub)));
	const s1TotalRub = Math.round(s1TotalKopecks / 100);
	const s2TotalKopecks = sumKopecks(stage2Items.map((it) => parseKopecks(it.priceRub)));
	const s2TotalRub = Math.round(s2TotalKopecks / 100);
	const s3TotalKopecks = sumKopecks(stage3Items.map((it) => parseKopecks(it.priceRub)));
	const s3TotalRub = Math.round(s3TotalKopecks / 100);

	const stage1: TreatmentPlanStage = {
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		title: "Этап 1: Неотложная терапия и санация",
		subtitle: "Устранение очагов острой боли, КЛКТ 3D-диагностика, профессиональная гигиена, лечение кариеса и эндодонтия корневых каналов.",
		clinicalGoal: "Ликвидация очагов острой боли и хронической инфекции, антисептическая санация.",
		items: stage1Items,
		totalRub: s1TotalRub,
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
			? "Атравматичное удаление корней, 3D-навигационный шаблон, дентальная имплантация. Включает период остеоинтеграции (3–6 месяцев)."
			: "Хирургическая санация, атравматичное удаление разрушенных зубов и корней с консервацией лунок.",
		clinicalGoal: hasImplants
			? "Восстановление костной опоры и установка дентальных имплантатов с фиксацией периода остеоинтеграции (3–6 месяцев)."
			: "Хирургическая санация и подготовка альвеолярного отростка.",
		items: stage2Items,
		totalRub: s2TotalRub,
		totalKopecks: s2TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage2Items.length / 2)),
		estimatedWeeks: hasImplants ? 16 : 2, // 16 недель = 4 месяца (3–6 мес интервал)
		order804nCodes: Array.from(new Set(stage2Items.map((i) => i.code804n))),
	};

	const stage3: TreatmentPlanStage = {
		stageNumber: 3,
		stageKind: "stage_3_orthopedics",
		title: "Этап 3: Ортопедическая реабилитация",
		subtitle: "Внутриротовое цифровое 3D-сканирование, установка постоянных коронок, мостовидных протезов и конструкций на имплантатах.",
		clinicalGoal: "Восстановление анатомической формы зубного ряда, окклюзии и жевательной эффективности.",
		items: stage3Items,
		totalRub: s3TotalRub,
		totalKopecks: s3TotalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(stage3Items.length / 2)),
		estimatedWeeks: 4,
		order804nCodes: Array.from(new Set(stage3Items.map((i) => i.code804n))),
	};

	return [stage1, stage2, stage3];
}