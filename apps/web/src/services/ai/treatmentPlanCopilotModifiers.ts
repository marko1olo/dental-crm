/**
 * treatmentPlanCopilotModifiers.ts — Clinical modifiers: Bridge replacement, Bone Grafting (Bio-Oss), Anesthesia & Isolation.
 *
 * Mandate 8s (SSOT & Anti-Bloat)
 */

import type {
	TreatmentPlanItem,
	TreatmentPlanStage,
} from "../../components/treatment-plans/types";
import {
	type CopilotModificationAuditItem,
	type CopilotModificationResult,
	type CopilotOptimizationOptions,
	recalculateStage,
} from "./treatmentPlanCopilotTypes";

/**
 * Определение анатомически корректных соседних зубов по стандарту FDI ISO 3950
 */
export function getAdjacentFdiTeeth(toothNumber: number): { mesial: number; distal: number } {
	// Резцы на срединной линии
	if (toothNumber === 11) return { mesial: 21, distal: 12 };
	if (toothNumber === 21) return { mesial: 11, distal: 22 };
	if (toothNumber === 31) return { mesial: 41, distal: 32 };
	if (toothNumber === 41) return { mesial: 31, distal: 42 };

	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;

	const mesialPos = pos > 1 ? pos - 1 : 1;
	const distalPos = pos < 8 ? pos + 1 : 7;

	return {
		mesial: quadrant * 10 + mesialPos,
		distal: quadrant * 10 + distalPos,
	};
}

/**
 * Замена имплантации на мостовидный протез
 */
export function replaceImplantationWithBridge(
	stages: readonly TreatmentPlanStage[],
	options: CopilotOptimizationOptions = {},
): CopilotModificationResult {
	const oldTotalRub = stages.reduce((acc, s) => acc + s.totalRub, 0);
	const auditTrail: CopilotModificationAuditItem[] = [];

	// 1. Определение целевых зубов
	let targetTeeth: number[] = [];
	if (options.replaceToothNumbers && options.replaceToothNumbers.length > 0) {
		targetTeeth = Array.from(new Set(options.replaceToothNumbers));
	} else {
		stages.forEach((stage) => {
			stage.items.forEach((item) => {
				if (
					(item.code804n.startsWith("A16.07.054") || /имплант/i.test(item.name)) &&
					typeof item.toothNumber === "number"
				) {
					targetTeeth.push(item.toothNumber);
				}
			});
		});
	}

	if (targetTeeth.length === 0) {
		targetTeeth = [36];
	} else {
		targetTeeth = Array.from(new Set(targetTeeth)).sort((a, b) => a - b);
	}

	const targetSet = new Set(targetTeeth);

	const updatedStages: TreatmentPlanStage[] = stages.map((stage) => {
		// Удаляем хирургические позиции имплантации для указанных зубов из Этапа 2
		if (stage.stageNumber === 2) {
			const filteredItems = stage.items.filter((item) => {
				const isImplant =
					item.code804n.startsWith("A16.07.054") ||
					item.code804n.startsWith("A16.07.041") ||
					/имплант|синус|костн.*пласт/i.test(item.name);

				const matchesTooth =
					typeof item.toothNumber === "number" ? targetSet.has(item.toothNumber) : true;

				if (isImplant && matchesTooth) {
					auditTrail.push({
						action: "removed",
						description: `Исключена хирургическая операция: ${item.name}`,
						stageNumber: 2,
						oldPriceRub: item.priceRub,
						newPriceRub: 0,
						code804n: item.code804n,
						...(item.toothNumber !== undefined ? { toothNumber: item.toothNumber } : {}),
					});
					return false;
				}
				return true;
			});

			return recalculateStage({
				...stage,
				items: filteredItems,
			});
		}

		// Добавляем мостовидный протез в Этап 3 (Ортопедия)
		if (stage.stageNumber === 3) {
			const existingItems = [...stage.items];

			// Если передан диапазон зубов (например 34-36)
			if (targetTeeth.length >= 2 && targetTeeth[targetTeeth.length - 1]! - targetTeeth[0]! <= 3) {
				const minTooth = targetTeeth[0]!;
				const maxTooth = targetTeeth[targetTeeth.length - 1]!;
				const adjLeft = getAdjacentFdiTeeth(minTooth).mesial;
				const adjRight = getAdjacentFdiTeeth(maxTooth).distal;
				const totalUnits = targetTeeth.length + 2;
				const unitPrice = 19000;
				const bridgePrice = totalUnits * unitPrice;

				const bridgePrep1: TreatmentPlanItem = {
					id: `copilot-bridge-prep-${minTooth}`,
					toothNumber: adjLeft,
					code804n: "A16.07.004.001",
					name: `Препарирование опорного зуба ${adjLeft} под мостовидный протез с уступом`,
					category: "Ортопедия",
					priceRub: 4500,
					unitPriceRub: 4500,
					discountRub: 0,
					quantity: 1,
					phase: 3,
					stageKind: "stage_3_orthopedics",
					materials: "Алмазные боры NTI / Ретракционная нить Ultrapack",
					clinicalRationale: "Подготовка опорного зуба для фиксации несъемного мостовидного протеза",
				};

				const bridgePrep2: TreatmentPlanItem = {
					id: `copilot-bridge-prep-${maxTooth}`,
					toothNumber: adjRight,
					code804n: "A16.07.004.001",
					name: `Препарирование опорного зуба ${adjRight} под мостовидный протез с уступом`,
					category: "Ортопедия",
					priceRub: 4500,
					unitPriceRub: 4500,
					discountRub: 0,
					quantity: 1,
					phase: 3,
					stageKind: "stage_3_orthopedics",
					materials: "Алмазные боры NTI / Ретракционная нить Ultrapack",
					clinicalRationale: "Подготовка опорного зуба для фиксации несъемного мостовидного протеза",
				};

				const bridgeUnitItem: TreatmentPlanItem = {
					id: `copilot-bridge-units-span-${minTooth}-${maxTooth}`,
					toothNumber: minTooth,
					code804n: "A16.07.004.002",
					name: `Несъемный мостовидный протез из диоксида циркония (${totalUnits} единиц: зубы ${adjLeft}-${targetTeeth.join("-")}-${adjRight})`,
					category: "Ортопедия",
					priceRub: bridgePrice,
					unitPriceRub: unitPrice,
					discountRub: 0,
					quantity: totalUnits,
					phase: 3,
					stageKind: "stage_3_orthopedics",
					materials: "Диоксид циркония Katana STML multi-layer / цемент RelyX U200",
					clinicalRationale: `Восстановление целостности зубного ряда в области зубов ${targetTeeth.join(", ")} несъемным мостовидным протезом`,
				};

				existingItems.push(bridgePrep1, bridgePrep2, bridgeUnitItem);

				auditTrail.push({
					action: "added",
					description: `Добавлено несъемное мостовидное протезирование (${totalUnits} ед.) в области зубов ${adjLeft}-${targetTeeth.join("-")}-${adjRight}`,
					stageNumber: 3,
					oldPriceRub: 0,
					newPriceRub: bridgePrice + 9000,
					code804n: "A16.07.004.002",
					toothNumber: minTooth,
				});
			} else {
				// Одиночные зубы
				targetTeeth.forEach((missingTooth) => {
					const adj = getAdjacentFdiTeeth(missingTooth);
					const adjLeft = adj.mesial;
					const adjRight = adj.distal;

					const bridgeItem1: TreatmentPlanItem = {
						id: `copilot-bridge-prep-${missingTooth}-1`,
						toothNumber: adjLeft,
						code804n: "A16.07.004.001",
						name: `Препарирование опорного зуба ${adjLeft} под мостовидный протез с уступом`,
						category: "Ортопедия",
						priceRub: 4500,
						unitPriceRub: 4500,
						discountRub: 0,
						quantity: 1,
						phase: 3,
						stageKind: "stage_3_orthopedics",
						materials: "Алмазные боры NTI / Ретракционная нить Ultrapack",
						clinicalRationale: "Подготовка опорного зуба для фиксации несъемного мостовидного протеза",
					};

					const bridgeItem2: TreatmentPlanItem = {
						id: `copilot-bridge-prep-${missingTooth}-2`,
						toothNumber: adjRight,
						code804n: "A16.07.004.001",
						name: `Препарирование опорного зуба ${adjRight} под мостовидный протез с уступом`,
						category: "Ортопедия",
						priceRub: 4500,
						unitPriceRub: 4500,
						discountRub: 0,
						quantity: 1,
						phase: 3,
						stageKind: "stage_3_orthopedics",
						materials: "Алмазные боры NTI / Ретракционная нить Ultrapack",
						clinicalRationale: "Подготовка опорного зуба для фиксации несъемного мостовидного протеза",
					};

					const bridgeUnitItem: TreatmentPlanItem = {
						id: `copilot-bridge-units-${missingTooth}`,
						toothNumber: missingTooth,
						code804n: "A16.07.004.002",
						name: `Несъемный мостовидный протез из диоксида циркония (3 единицы: зубы ${adjLeft}-${missingTooth}-${adjRight})`,
						category: "Ортопедия",
						priceRub: 57000,
						unitPriceRub: 19000,
						discountRub: 0,
						quantity: 3,
						phase: 3,
						stageKind: "stage_3_orthopedics",
						materials: "Диоксид циркония Katana STML multi-layer / цемент RelyX U200",
						clinicalRationale: `Восстановление целостности зубного ряда в области отсутствующего зуба ${missingTooth} несъемным мостовидным протезом`,
					};

					existingItems.push(bridgeItem1, bridgeItem2, bridgeUnitItem);

					auditTrail.push({
						action: "added",
						description: `Добавлено несъемное мостовидное протезирование (3 ед.) в области зубов ${adjLeft}-${missingTooth}-${adjRight}`,
						stageNumber: 3,
						oldPriceRub: 0,
						newPriceRub: 66000,
						code804n: "A16.07.004.002",
						toothNumber: missingTooth,
					});
				});
			}

			return recalculateStage({
				...stage,
				items: existingItems,
			});
		}

		return stage;
	});

	const newTotalRub = updatedStages.reduce((acc, s) => acc + s.totalRub, 0);
	const deltaRub = newTotalRub - oldTotalRub;

	return {
		success: true,
		commandType: "implant_to_bridge",
		commandTitle: "Заменить имплантацию на мостовидный протез",
		explanation: `Хирургический этап имплантации (зубы ${targetTeeth.join(", ")}) успешно заменен на несъемный мостовидный протез из диоксида циркония с опорой на соседние зубы. Срок реабилитации сокращен с 16-24 недель до 2-3 недель. Хирургические риски исключены.`,
		stages: updatedStages,
		auditTrail,
		oldTotalRub,
		newTotalRub,
		deltaRub,
	};
}

/**
 * Включение костной пластики Geistlich Bio-Oss + мембрана Bio-Gide (НКР)
 */
export function addBoneGraftingBioOss(
	stages: readonly TreatmentPlanStage[],
	options: CopilotOptimizationOptions = {},
): CopilotModificationResult {
	const oldTotalRub = stages.reduce((acc, s) => acc + s.totalRub, 0);
	const auditTrail: CopilotModificationAuditItem[] = [];

	const targetTeeth = options.replaceToothNumbers && options.replaceToothNumbers.length > 0
		? options.replaceToothNumbers
		: [16];

	const graftPrice = 28000;

	const updatedStages: TreatmentPlanStage[] = stages.map((stage) => {
		if (stage.stageNumber === 2) {
			const existingCodes = new Set(stage.items.map((it) => it.code804n));
			const alreadyHasGraft =
				existingCodes.has("A16.07.041") ||
				stage.items.some((it) => /bio-oss|костн.*пласт|синус.*лифт/i.test(it.name));

			if (!alreadyHasGraft) {
				const primaryTooth = targetTeeth[0];
				const graftItem: TreatmentPlanItem = {
					id: `copilot-bone-graft-bio-oss-${primaryTooth || "general"}`,
					toothNumber: primaryTooth,
					code804n: "A16.07.041",
					name: primaryTooth
						? `Костная пластика челюстно-лицевой области (НКР) в области зуба ${primaryTooth} материалом Geistlich Bio-Oss и мембраной Bio-Gide`
						: "Костная пластика челюстно-лицевой области (направленная костная регенерация материалом Geistlich Bio-Oss и мембраной Bio-Gide)",
					category: "Хирургия",
					priceRub: graftPrice,
					unitPriceRub: graftPrice,
					discountRub: 0,
					quantity: 1,
					phase: 2,
					stageKind: "stage_2_surgery",
					materials: "Ксеногенный костный материал Geistlich Bio-Oss (0.5г/1.0г, Швейцария) + резорбируемая коллагеновая мембрана Geistlich Bio-Gide (25x25мм) + титановые пины",
					clinicalRationale: "Направленная костная регенерация (НКР) для создания достаточного объема альвеолярного гребня по ширине и высоте перед имплантацией",
				};

				const newItems = [...stage.items, graftItem];
				auditTrail.push({
					action: "added",
					description: `Добавлена костная пластика материалом Geistlich Bio-Oss и мембраной Bio-Gide в Этап 2`,
					stageNumber: 2,
					oldPriceRub: 0,
					newPriceRub: graftPrice,
					code804n: "A16.07.041",
					...(primaryTooth !== undefined ? { toothNumber: primaryTooth } : {}),
				});

				return recalculateStage({
					...stage,
					items: newItems,
				});
			}
		}

		return stage;
	});

	const newTotalRub = updatedStages.reduce((acc, s) => acc + s.totalRub, 0);
	const deltaRub = newTotalRub - oldTotalRub;

	return {
		success: true,
		commandType: "bone_graft_bio_oss",
		commandTitle: "Включить костную пластику Bio-Oss",
		explanation: `Направленная костная регенерация (НКР) материалом Geistlich Bio-Oss и коллагеновой мембраной Bio-Gide (код услуги: A16.07.041) успешно включена в хирургический этап. Общая стоимость: ${newTotalRub.toLocaleString("ru-RU")} ₽.`,
		stages: updatedStages,
		auditTrail,
		oldTotalRub,
		newTotalRub,
		deltaRub,
	};
}

/**
 * Пересчет и добавление анестезии и изоляции коффердам
 */
export function recalculateAnesthesiaAndIsolation(
	stages: readonly TreatmentPlanStage[],
	_options: CopilotOptimizationOptions = {},
): CopilotModificationResult {
	const oldTotalRub = stages.reduce((acc, s) => acc + s.totalRub, 0);
	const auditTrail: CopilotModificationAuditItem[] = [];

	const updatedStages: TreatmentPlanStage[] = stages.map((stage) => {
		const newItems = [...stage.items];
		const existingCodes = new Set(stage.items.map((it) => it.code804n));

		// Проверяем наличие анестезии для инвазивных процедур
		const hasInvasiveProcedures = stage.items.some(
			(it) =>
				it.code804n.startsWith("A16.07.001") ||
				it.code804n.startsWith("A16.07.002") ||
				it.code804n.startsWith("A16.07.004") ||
				it.code804n.startsWith("A16.07.006") ||
				it.code804n.startsWith("A16.07.008") ||
				it.code804n.startsWith("A16.07.030") ||
				it.code804n.startsWith("A16.07.054") ||
				it.category === "Ортопедия" ||
				it.category === "Хирургия" ||
				it.category === "Терапия",
		);

		const hasAnesthesia =
			existingCodes.has("A11.07.011") ||
			existingCodes.has("A11.07.012") ||
			stage.items.some((it) => /анестези/i.test(it.name));

		if (hasInvasiveProcedures && !hasAnesthesia) {
			const anesthesiaItem: TreatmentPlanItem = {
				id: `copilot-anesthesia-stage-${stage.stageNumber}`,
				code804n: "A11.07.012",
				name: "Проводниковая / инфильтрационная анестезия (Артикаин с эпинефрином 1:100 000)",
				category: "Анестезиология",
				priceRub: 950,
				unitPriceRub: 950,
				discountRub: 0,
				quantity: Math.max(1, stage.estimatedVisits ?? 1),
				phase: stage.stageNumber,
				stageKind: stage.stageKind,
				materials: "Карпула Артикаин ИНИБСА 1:100 000 (1.8 мл) + игла карпульная 30G",
				clinicalRationale: "Адекватное местное обезболивание операционного поля по протоколу СтАР",
			};

			newItems.unshift(anesthesiaItem);
			auditTrail.push({
				action: "added",
				description: `Добавлена карпульная анестезия (${anesthesiaItem.quantity} карп.) в Этап ${stage.stageNumber}`,
				stageNumber: stage.stageNumber,
				oldPriceRub: 0,
				newPriceRub: anesthesiaItem.priceRub * anesthesiaItem.quantity,
				code804n: "A11.07.012",
			});
		}

		// Проверяем изоляцию коффердам для терапии/эндодонтии в Этапе 1
		if (stage.stageNumber === 1) {
			const hasTherapy = stage.items.some(
				(it) =>
					it.code804n.startsWith("A16.07.002") ||
					it.code804n.startsWith("A16.07.008") ||
					it.code804n.startsWith("A16.07.030") ||
					/кариес|пульпит|периодонтит|пломб|эндо/i.test(it.name),
			);

			const hasRubberDam =
				existingCodes.has("A16.07.051") ||
				stage.items.some((it) => /коффердам|раббердам|изоляц/i.test(it.name));

			if (hasTherapy && !hasRubberDam) {
				const rubberDamItem: TreatmentPlanItem = {
					id: `copilot-rubberdam-stage-1`,
					code804n: "A16.07.002.001",
					name: "Изоляция рабочего поля системой Коффердам (раббердам / Оптрагейт)",
					category: "Терапия",
					priceRub: 850,
					unitPriceRub: 850,
					discountRub: 0,
					quantity: Math.max(1, stage.estimatedVisits ?? 1),
					phase: 1,
					stageKind: "stage_1_therapy",
					materials: "Латексный платок Sanctuary / кламп Sanctuary / рамка",
					clinicalRationale: "Изоляция операционного поля от слюны и влаги дыхания по стандартам СтАР",
				};

				newItems.splice(1, 0, rubberDamItem);
				auditTrail.push({
					action: "added",
					description: `Доложена изоляция системой Коффердам (${rubberDamItem.quantity} шт.) в Этап 1`,
					stageNumber: 1,
					oldPriceRub: 0,
					newPriceRub: rubberDamItem.priceRub * rubberDamItem.quantity,
					code804n: "A16.07.002.001",
				});
			}
		}

		return recalculateStage({
			...stage,
			items: newItems,
		});
	});

	const newTotalRub = updatedStages.reduce((acc, s) => acc + s.totalRub, 0);
	const deltaRub = newTotalRub - oldTotalRub;

	return {
		success: true,
		commandType: "recalculate_anesthesia_isolation",
		commandTitle: "Пересчитать анестезию и коффердам",
		explanation: `Аудит безопасности завершен: во все инвазивные этапы добавлена карпульная анестезия и изоляция рабочего поля системой Коффердам по клиническому стандарту. Добавлено ${auditTrail.length} позиций на сумму ${deltaRub.toLocaleString("ru-RU")} ₽.`,
		stages: updatedStages,
		auditTrail,
		oldTotalRub,
		newTotalRub,
		deltaRub,
	};
}
