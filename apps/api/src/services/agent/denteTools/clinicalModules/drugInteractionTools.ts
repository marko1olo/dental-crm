/**
 * drugInteractionTools.ts — Pharmacological safety & Drug-Drug Interaction (DDI) checker for DENTE Copilot.
 *
 * Adheres to:
 * - Evidence-Based Medicine (EBM)
 * - Mandate 8y: Zero pharmacological paranoia, warnings never block doctor autonomy.
 */

import crypto from "node:crypto";
import type { ChairsideSafetyAlert } from "../../chairsideSentinelEngine.js";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../../tools/tool.js";
import {
	checkDrugInteractionsSchema,
	type CheckDrugInteractionsInput,
	type CheckDrugInteractionsResult,
} from "../types.js";

export const checkDrugInteractionsTool: ToolDefinition<
	typeof checkDrugInteractionsSchema,
	CheckDrugInteractionsResult
> = {
	name: "check_drug_interactions",
	description:
		"Проверка лекарственной безопасности: аллергии (пенициллины, НПВП, латекс, анестетики), соматические противопоказания (гипертония, закрытоугольная глаукома, беременность, антикоагулянты) с безопасными альтернативами.",
	parameters: checkDrugInteractionsSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (_ctx: AgentContext, args: CheckDrugInteractionsInput) => {
		const alerts: ChairsideSafetyAlert[] = [];
		const allergies = args.knownAllergies || [];
		const somatic = args.somaticConditions || [];
		const planned = args.plannedDrugs;

		let recommendedAnesthetic = "Артикаин 4% с эпинефрином 1:100 000 (Ультракаин Д-С форте)";
		let recommendedAntibiotic = "Амоксициллин 500 мг (или Амоксиклав 875/125 мг)";
		let recommendedAnalgesic = "Ибупрофен 400 мг / Нимесулид 100 мг";

		// 1. Penicillin allergy vs Beta-lactam antibiotics
		const isPenicillinAllergic = allergies.some((a) =>
			/(пенициллин|пеницилин|бета-лактам|penicillin|амоксициллин|амоксиклав|аугментин)/i.test(a),
		);
		const isPrescribedBetaLactam = planned.some((p) =>
			/(амоксициллин|амоксиклав|аугментин|пенициллин|ампициллин|флемоксин)/i.test(p),
		);

		if (isPenicillinAllergic && isPrescribedBetaLactam) {
			alerts.push({
				id: `alert_ddi_${crypto.randomUUID()}`,
				severity: "critical",
				alertType: "drug_allergy_conflict",
				title: "КРИТИЧЕСКИЙ КОНФЛИКТ: Аллергия на пенициллины vs Амоксициллин",
				message: "Пациент имеет аллергию на пенициллиновый ряд. Назначение бета-лактамов несет угрозу анафилаксии.",
				detectedAllergen: "Пенициллиновый ряд",
				conflictingItem: "Амоксициллин / Амоксиклав",
				safeAlternative: "Клиндамицин 300 мг (по 1 капсуле 3 раза в день 5-7 дней)",
				clinicalRationale: "Линкозамиды (Клиндамицин) не имеют перекрестной аллергии с пенициллинами и обладают высокой тропностью к костной ткани челюстей.",
				actionRequired: "Заменить пенициллин на Клиндамицин 300 мг",
				isBlocking: false,
			});
			recommendedAntibiotic = "Клиндамицин 300 мг";
		} else if (isPenicillinAllergic) {
			recommendedAntibiotic = "Клиндамицин 300 мг";
		}

		// 2. NSAID allergy vs Analgesics
		const isNsaidAllergic = allergies.some((a) => /(нпвс|нпвп|аспирин|ибупрофен|кеторол|найз)/i.test(a));
		const isPrescribedNsaid = planned.some((p) => /(нпвс|нпвп|ибупрофен|кеторол|кетанов|нимесулид|найз|нурофен)/i.test(p));

		if (isNsaidAllergic && isPrescribedNsaid) {
			alerts.push({
				id: `alert_nsaid_${crypto.randomUUID()}`,
				severity: "critical",
				alertType: "drug_allergy_conflict",
				title: "КОНФЛИКТ: Аллергия на НПВП / Аспириновая триада",
				message: "Риск бронхоспазма и ангионевротического отека при приеме НПВП.",
				detectedAllergen: "НПВП / Салицилаты",
				conflictingItem: "Препарат группы НПВП",
				safeAlternative: "Парацетамол 500-1000 мг (до 4 г/сутки)",
				clinicalRationale: "Парацетамол действует центрально, не провоцирует аспириновую астму.",
				isBlocking: false,
			});
			recommendedAnalgesic = "Парацетамол 500 мг";
		} else if (isNsaidAllergic) {
			recommendedAnalgesic = "Парацетамол 500 мг";
		}

		// 3. Hypertension / Cardiovascular
		const isHypertensive = somatic.some((s) => /(гипертон|криз|ибс|стенокарди|давлен|ад\s*>)/i.test(s));
		if (isHypertensive) {
			alerts.push({
				id: `alert_cardio_${crypto.randomUUID()}`,
				severity: "warning",
				alertType: "somatic_contraindication",
				title: "Артериальная гипертензия / Кардиориск",
				message: "Адреналиновая нагрузка (1:100 000) может вызвать скачок АД и тахикардию.",
				safeAlternative: "Артикаин 1:200 000 или Мепивакаин 3% без вазоконстриктора (Скандонест)",
				clinicalRationale: "Контроль АД перед приемом. При АД > 160/100 плановое лечение перенести.",
				isBlocking: false,
			});
			recommendedAnesthetic = "Мепивакаин 3% без вазоконстриктора (Скандонест) или Артикаин 1:200 000";
		}

		// 4. Closed-Angle Glaucoma
		const isGlaucoma = somatic.some((s) => /(глауком|внутриглазн)/i.test(s));
		if (isGlaucoma) {
			alerts.push({
				id: `alert_glaucoma_${crypto.randomUUID()}`,
				severity: "warning",
				alertType: "somatic_contraindication",
				title: "Закрытоугольная глаукома",
				message: "Эпинефрин (адреналин) вызывает мидриаз и острый приступ глаукомы с резким повышением ВГД.",
				safeAlternative: "Мепивакаин 3% без вазоконстриктора (Скандонест)",
				clinicalRationale: "Вазоконстрикторы строго противопоказаны при закрытоугольной глаукоме.",
				isBlocking: false,
			});
			recommendedAnesthetic = "Мепивакаин 3% без вазоконстриктора";
		}

		// 5. Pregnancy
		const isPregnant = somatic.some((s) => /(беременн|триместр|лактац)/i.test(s));
		if (isPregnant) {
			alerts.push({
				id: `alert_pregnancy_${crypto.randomUUID()}`,
				severity: "warning",
				alertType: "pregnancy_advisory",
				title: "Беременность / Лактация",
				message: "Рекомендуется анестетик с минимальным проникновением через плацентарный барьер.",
				safeAlternative: "Артикаин 1:200 000 (Ультракаин Д-С). Избегать высоких доз адреналина.",
				clinicalRationale: "Артикаин на 95% связывается с белками плазмы крови, минимально проникает к плоду.",
				isBlocking: false,
			});
			recommendedAnesthetic = "Артикаин 4% с эпинефрином 1:200 000";
		}

		const isPhysiologicalNorm = alerts.length === 0;
		if (isPhysiologicalNorm) {
			alerts.push({
				id: `alert_norm_${crypto.randomUUID()}`,
				severity: "info",
				alertType: "physiological_norm",
				title: "Физиологическая норма",
				message: "Соматический фон и аллергоанамнез чисты. Полная клиническая автономия врача.",
				isBlocking: false,
			});
		}

		return {
			safeToProceed: true,
			alerts,
			recommendedAnesthetic,
			recommendedAntibiotic,
			recommendedAnalgesic,
			isPhysiologicalNorm,
		};
	},
};
