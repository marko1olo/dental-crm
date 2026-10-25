import type { SynthesizeProtocolParams } from "./types";

export function buildRecommendationsText(params: SynthesizeProtocolParams): string {
	const { bracketSystem, activeAttachmentPreset, alignerSetIssued } = params;

	if (bracketSystem === "aligners" || activeAttachmentPreset) {
		const weeks = alignerSetIssued ? `${Math.round(alignerSetIssued.days / 7)} недель` : "4–6 недель";
		return `• Ношение элайнеров строго не менее 20–22 часов в сутки (снимать только во время приёма пищи и чистки зубов).
• Использование чувисов (жевательных валиков) для плотной посадки капп на зубах.
• Хранение элайнеров в специальном вентилируемом боксе, промывание прохладной водой.
• Следующий плановый приём: через ${weeks}.`;
	}

	if (
		bracketSystem === "removable_plate" ||
		bracketSystem === "marco_rosa" ||
		bracketSystem === "haas_rpe" ||
		bracketSystem === "twin_block"
	) {
		return `• Соблюдение протокола ношения / активации аппарата.
• Активация расширяющего винта ключом строго по схеме (1 раз в 7 дней на 1/4 оборота по стрелке).
• Тщательная гигиена аппарата (ирригатор, ортодонтическая щетка).
• Следующий контрольный приём: через 4 недели.`;
	}

	return `• Строгое соблюдение гигиены (ортодонтическая щетка, монопучок, ершики, ирригатор).
• Использование ортодонтического защитного воска при натирании.
• Исключить из рациона твердую, волокнистую и липкую пищу.
• Следующий плановый приём: через 4–6 недель.`;
}
