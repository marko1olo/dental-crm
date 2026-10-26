/**
 * @dental/shared/anesthesia/calculator/somaticAdjusterModules/somaticCardioCheck.ts
 * Cross-checks cardio risk, asthma/sulfites and pregnancy (Mandate 8b, <= 120 lines)
 */

import { CARDIO_MAX_EPINEPHRINE_MG } from "../drugCatalog.js";
import type { AnesthesiaDrugDefinition, AnesthesiaDrugKey, AnesthesiaSomaticAlert, SomaticRiskProfile } from "../types.js";

export function checkCardioAsthmaPregnancy(
	drug: AnesthesiaDrugDefinition,
	somatic: SomaticRiskProfile,
	params: { hasCardio: boolean; hasAsthmaOrSulfite: boolean; isPregnant: boolean; totalEpinephrineMg: number; maxCardioCarpules: number | null },
): { alerts: AnesthesiaSomaticAlert[]; recommendedDrugKey: AnesthesiaDrugKey | null; hasContraindications: boolean } {
	const alerts: AnesthesiaSomaticAlert[] = [];
	let recommendedDrugKey: AnesthesiaDrugKey | null = null;
	let hasContraindications = false;

	if (params.hasAsthmaOrSulfite) {
		if (drug.containsSulfites) {
			hasContraindications = true;
			recommendedDrugKey = "scandonest_3";
			alerts.push({
				id: "sulfite_asthma_contraindication",
				severity: "danger",
				title: "ПРОТИВОПОКАЗАНО: Содержит сульфиты (риск бронхоспазма)",
				message: `У пациента ${somatic.hasBronchialAsthma ? "бронхиальная астма" : "аллергия на сульфиты"}! Препарат «${drug.commercialName}» содержит метабисульфит натрия (высокий риск бронхоспазма). Показан анестетик без вазоконстриктора и сульфитов (Скандонест 3% или Лидокаин 2%).`,
				recommendedDrugKey: "scandonest_3",
				recommendedAction: "Заменить на Скандонест 3% (без сульфитов и адреналина)",
			});
		} else {
			alerts.push({
				id: "sulfite_asthma_safe",
				severity: "safe",
				title: "Безопасно при астме и аллергии на сульфиты",
				message: "Препарат не содержит метабисульфита натрия и консервантов. Разрешён пациентам с бронхиальной астмой.",
			});
		}
	}

	if (params.hasCardio) {
		if (drug.key === "ultracain_ds_forte" || drug.key === "septanest_100") {
			if (!recommendedDrugKey) recommendedDrugKey = "scandonest_3";
			alerts.push({
				id: "cardio_high_vaso_alert",
				severity: "danger",
				title: "Высокий кардиоваскулярный риск (Адреналин 1:100 000)",
				message: "У пациента сердечно-сосудистая патология (I10–I15). Концентрация адреналина 1:100 000 повышает риск криза. Препарат выбора — Скандонест 3%. При адреналине лимит <= 2 карпулы.",
				recommendedDrugKey: "scandonest_3",
				recommendedAction: "Переключить на Скандонест 3% без вазоконстриктора",
			});
		} else if (drug.key === "ultracain_ds") {
			alerts.push({
				id: "cardio_low_vaso_caution",
				severity: "warning",
				title: "Кардиоваскулярный риск: контроль дозы адреналина (1:200 000)",
				message: "Ультракаин Д-С (1:200 000) допустим с осторожностью (лимит: <= 4 карпул / 0.034 мг). При нестабильном давлении рекомендуется Скандонест 3%.",
				recommendedDrugKey: "scandonest_3",
				recommendedAction: "При повышенном давлении рекомендован Скандонест 3%",
			});
		} else if (drug.isAdrenalineFree) {
			alerts.push({
				id: "cardio_safe_plain",
				severity: "safe",
				title: "Препарат выбора для кардиологических пациентов",
				message: "Препарат не содержит адреналина. Не вызывает тахикардии и подъема АД. Оптимален при гипертонии и ИБС.",
			});
		}

		if (!drug.isAdrenalineFree && params.totalEpinephrineMg > CARDIO_MAX_EPINEPHRINE_MG) {
			hasContraindications = true;
			alerts.push({
				id: "cardio_epinephrine_overdose",
				severity: "danger",
				title: "ПРЕВЫШЕН КАРДИОЛИМИТ АДРЕНАЛИНА!",
				message: `Суммарная доза адреналина (${params.totalEpinephrineMg} мг) превышает кардиологический порог (0.04 мг / макс. ${params.maxCardioCarpules} карп.).`,
			});
		}
	}

	if (params.isPregnant) {
		if (drug.key === "ultracain_ds") {
			alerts.push({
				id: "pregnancy_preferred_choice",
				severity: "safe",
				title: "Препарат выбора при беременности и лактации",
				message: "Ультракаин Д-С (1:200 000) обладает максимальным связыванием с белками (~95%) и быстрым T1/2 (~20 мин).",
			});
		} else if (drug.key === "ultracain_ds_forte" || drug.key === "septanest_100") {
			if (!params.hasAsthmaOrSulfite) recommendedDrugKey = "ultracain_ds";
			alerts.push({
				id: "pregnancy_high_vaso_warning",
				severity: "warning",
				title: "Высокая концентрация адреналина при беременности",
				message: "Концентрация 1:100 000 не рекомендована при беременности из-за риска снижения маточно-плацентарного кровотока. Рекомендуется Ультракаин Д-С (1:200 000).",
				recommendedDrugKey: "ultracain_ds",
				recommendedAction: "Переключить на Ультракаин Д-С (1:200 000)",
			});
		} else if (drug.key === "scandonest_3" || drug.key === "lidocaine_2") {
			if (!params.hasAsthmaOrSulfite) {
				recommendedDrugKey = "ultracain_ds";
				const alertId = drug.key === "scandonest_3" ? "pregnancy_mepivacaine_caution" : "pregnancy_lidocaine_caution";
				alerts.push({
					id: alertId,
					severity: "caution",
					title: `Особенности применения ${drug.commercialName} при беременности`,
					message: "При отсутствии аллергии на сульфиты препаратом выбора при беременности является Артикаин 1:200 000.",
					recommendedDrugKey: "ultracain_ds",
					recommendedAction: "Предпочтителен Артикаин 1:200 000",
				});
			}
		}
	}

	return { alerts, recommendedDrugKey, hasContraindications };
}
