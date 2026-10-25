/**
 * @dental/shared/anesthesia/calculator/somaticAdjusterModules/somaticAllergyCheck.ts
 * Cross-checks allergies and absolute epinephrine block (Mandate 8b, <= 120 lines)
 */

import type { AnesthesiaDrugDefinition, AnesthesiaDrugKey, AnesthesiaSomaticAlert, SomaticRiskProfile } from "../types.js";

export function checkAllergiesAndEpiBlock(
	drug: AnesthesiaDrugDefinition,
	somatic: SomaticRiskProfile,
	isEpinephrineBlocked: boolean,
): { alerts: AnesthesiaSomaticAlert[]; recommendedDrugKey: AnesthesiaDrugKey | null; hasContraindications: boolean } {
	const alerts: AnesthesiaSomaticAlert[] = [];
	let recommendedDrugKey: AnesthesiaDrugKey | null = null;
	let hasContraindications = false;

	if (somatic.hasArticaineAllergy && (drug.key === "ultracain_ds_forte" || drug.key === "ultracain_ds" || drug.key === "septanest_100")) {
		hasContraindications = true;
		recommendedDrugKey = somatic.hasMepivacaineAllergy ? "lidocaine_2" : "scandonest_3";
		alerts.push({
			id: "articaine_allergy_contraindication",
			severity: "danger",
			title: "⛔ АЛЛЕРГИЯ НА АРТИКАИН (УЛЬТРАКАИН)",
			message: "У пациента зарегистрирована аллергическая реакция на артикаин. Препарат категорически противопоказан! Препарат выбора — Скандонест 3% (Мепивакаин).",
			recommendedDrugKey,
			recommendedAction: "Заменить на Скандонест 3% (Мепивакаин)",
		});
	}

	if (somatic.hasMepivacaineAllergy && drug.key === "scandonest_3") {
		hasContraindications = true;
		recommendedDrugKey = somatic.hasArticaineAllergy ? "ultracain_ds" : "scandonest_3";
		alerts.push({
			id: "mepivacaine_allergy_contraindication",
			severity: "danger",
			title: "⛔ АЛЛЕРГИЯ НА МЕПИВАКАИН (СКАНДОНЕСТ)",
			message: "У пациента аллергия на мепивакаин. Препарат Скандонест 3% категорически противопоказан!",
			recommendedDrugKey,
			recommendedAction: "Заменить на Артикаин или Лидокаин 2%",
		});
	}

	if (somatic.hasLidocaineAllergy && drug.key === "lidocaine_2") {
		hasContraindications = true;
		recommendedDrugKey = somatic.hasMepivacaineAllergy ? "ultracain_ds" : "scandonest_3";
		alerts.push({
			id: "lidocaine_allergy_contraindication",
			severity: "danger",
			title: "⛔ АЛЛЕРГИЯ НА ЛИДОКАИН",
			message: "У пациента аллергия на лидокаин. Препарат Лидокаин 2% категорически противопоказан!",
			recommendedDrugKey,
			recommendedAction: "Заменить на Скандонест 3% (Мепивакаин)",
		});
	}

	if (isEpinephrineBlocked) {
		if (!drug.isAdrenalineFree) {
			hasContraindications = true;
			recommendedDrugKey = "scandonest_3";
			const reasonStr = somatic.hasThyrotoxicosis
				? "тиреотоксикоз / гипертиреоз (E05)"
				: somatic.takesBetaBlockers
					? "прием бета-адреноблокаторов"
					: "тяжелая артериальная гипертензия III стадии / кризовое течение";
			alerts.push({
				id: "epinephrine_absolute_block_contraindication",
				severity: "danger",
				title: "⛔ АБСОЛЮТНЫЙ ЗАПРЕТ АДРЕНАЛИНА (ЭПИНЕФРИНА)",
				message: `У пациента выявлены критические соматические риски: ${reasonStr}! Вазоконстрикторы противопоказаны. Разрешены анестетики без адреналина.`,
				recommendedDrugKey: "scandonest_3",
				recommendedAction: "Использовать Скандонест 3% без вазоконстриктора",
			});
		} else {
			alerts.push({
				id: "epinephrine_block_safe_plain",
				severity: "safe",
				title: "Разрешено: препарат без адреналина",
				message: "Препарат не содержит вазоконстриктора. Безопасен при тиреотоксикозе, приеме бета-блокаторов и кризовой гипертонии.",
			});
		}
	}

	return { alerts, recommendedDrugKey, hasContraindications };
}
