import type { AnesthesiaCalculationInput } from "./anesthesiaEngineTypes.js";

export function collectCardioRiskReasons(
	input: AnesthesiaCalculationInput,
): string[] {
	const reasons: (string | false | undefined)[] = [
		input.hasCardiovascularRisk && "сердечно-сосудистая патология",
		input.hasIschemicHeartDisease && "ИБС",
		input.hasMyocardialInfarctionHistory && "инфаркт миокарда в анамнезе",
		input.hasHypertension && "артериальная гипертония",
		(input.bpSystolic ?? 0) >= 140 &&
			`систолическое АД ${input.bpSystolic} мм рт. ст.`,
		(input.bpDiastolic ?? 0) >= 90 && `ДАД ${input.bpDiastolic} мм рт. ст.`,
		input.hasCardiacArrhythmia && "аритмия",
		(input.heartRateBpm ?? 0) > 90 && `тахикардия ${input.heartRateBpm} уд/мин`,
		input.takesBetaBlockers && "прием бета-блокаторов",
		input.takesTricyclicAntidepressants && "прием ТЦА",
		input.asaStatus === "asa_3" && "статус ASA III",
		input.asaStatus === "asa_4" && "статус ASA IV",
	];
	return reasons.filter((r): r is string => Boolean(r));
}
