/**
 * anesthesiaCarpulePresets.ts
 * Passive 1..3 carpule selection for chairside doctor autonomy (Mandate 8e).
 * Eliminates pharmacological paranoia and procedural canvas clutter.
 */

export interface CarpulePreset {
	readonly carpules: number;
	readonly label: string;
	readonly description: string;
	readonly isDefault?: boolean;
}

export const CARPULE_1_CLICK_PRESETS: readonly CarpulePreset[] = [
	{
		carpules: 1.0,
		label: "1 карпула (1.7 мл)",
		description: "Стандартная инфильтрация / проводниковая для 1 зуба",
		isDefault: true,
	},
	{
		carpules: 1.5,
		label: "1.5 карпулы (2.5 мл)",
		description: "Пролонгированная анестезия моляров или глубокий кариес",
	},
	{
		carpules: 2.0,
		label: "2 карпулы (3.4 мл)",
		description: "Сложное эндодонтическое лечение или множественное препарирование",
	},
	{
		carpules: 3.0,
		label: "3 карпулы (5.1 мл)",
		description: "Хирургическое удаление / сложная костная пластика",
	},
];

export function resolvePassiveCarpuleText(
	drugName: string,
	carpules: number,
	isCardio = false,
): string {
	const volumeMl = (carpules * 1.7).toFixed(1);
	const cardioTag = isCardio ? " [Кардиопротокол: без адреналина]" : "";
	return `Обезболивание: «${drugName}», ${volumeMl} мл (${carpules} карп.)${cardioTag}. Аспирационная проба отрицательная. Анестезия глубокая, без осложнений.`;
}
