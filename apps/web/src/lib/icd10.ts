export const ICD10_DICTIONARY = [
	// Кариес K02
	{ code: "K02.0", label: "Кариес эмали", group: "Кариес" },
	{ code: "K02.1", label: "Кариес дентина", group: "Кариес" },
	{ code: "K02.2", label: "Кариес цемента", group: "Кариес" },
	{ code: "K02.3", label: "Приостановившийся кариес", group: "Кариес" },
	{ code: "K02.8", label: "Другой уточнённый кариес", group: "Кариес" },
	// Болезни пульпы K04
	{ code: "K04.0", label: "Пульпит", group: "Пульпа" },
	{ code: "K04.01", label: "Начальный (гиперемия) пульпит", group: "Пульпа" },
	{ code: "K04.1", label: "Некроз пульпы", group: "Пульпа" },
	{ code: "K04.2", label: "Дегенерация пульпы", group: "Пульпа" },
	{ code: "K04.3", label: "Патологическая резорбция корня", group: "Пульпа" },
	{
		code: "K04.4",
		label: "Острый апикальный периодонтит",
		group: "Периапикал",
	},
	{
		code: "K04.5",
		label: "Хронический апикальный периодонтит",
		group: "Периапикал",
	},
	{
		code: "K04.6",
		label: "Периапикальный абсцесс со свищом",
		group: "Периапикал",
	},
	{
		code: "K04.7",
		label: "Периапикальный абсцесс без свища",
		group: "Периапикал",
	},
	{ code: "K04.8", label: "Корневая киста", group: "Периапикал" },
	// Гингивит / Пародонт K05
	{ code: "K05.0", label: "Острый гингивит", group: "Пародонт" },
	{ code: "K05.1", label: "Хронический гингивит", group: "Пародонт" },
	{ code: "K05.2", label: "Острый пародонтит", group: "Пародонт" },
	{ code: "K05.3", label: "Хронический пародонтит", group: "Пародонт" },
	{ code: "K05.4", label: "Пародонтоз", group: "Пародонт" },
	// Болезни зубов K03
	{ code: "K03.0", label: "Повышенное стирание зубов", group: "Другое" },
	{ code: "K03.2", label: "Эрозия зубов", group: "Другое" },
	{ code: "K03.3", label: "Патологическая резорбция", group: "Другое" },
	// Аномалии K07
	{ code: "K07.3", label: "Аномалии положения зубов", group: "Ортодонтия" },
	{
		code: "K07.4",
		label: "Аномалии прикуса неуточнённые",
		group: "Ортодонтия",
	},
	// Ретинированный зуб
	{ code: "K01.1", label: "Ретинированный зуб", group: "Хирургия" },
	// Потеря зубов K08
	{ code: "K08.1", label: "Потеря зуба / Удаление зуба", group: "Хирургия" },
	{ code: "K08.2", label: "Атрофия альвеолярного отростка", group: "Хирургия" },
	// Профилактика / Консультация Z
	{
		code: "Z01.2",
		label: "Стоматологическое обследование",
		group: "Консультация",
	},
	{
		code: "Z29.8",
		label: "Профилактика кариеса (герметики, фторирование)",
		group: "Консультация",
	},
	{
		code: "Z51.8",
		label: "Ортопедическое/плановое лечение",
		group: "Консультация",
	},
];

export const ICD_GROUP_COLORS: Record<string, string> = {
	Кариес: "bg-red-500/10 text-red-400 border-red-500/25",
	Пульпа: "bg-amber-500/10 text-amber-400 border-amber-500/25",
	Периапикал: "bg-orange-500/10 text-orange-400 border-orange-500/25",
	Пародонт: "bg-purple-500/10 text-purple-400 border-purple-500/25",
	Ортодонтия: "bg-blue-500/10 text-blue-400 border-blue-500/25",
	Хирургия: "bg-rose-500/10 text-rose-400 border-rose-500/25",
	Другое: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25",
	Консультация: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
};

export function getIcdColor(code: string): string {
	const entry = ICD10_DICTIONARY.find((i) => i.code === code);
	return (
		ICD_GROUP_COLORS[entry?.group ?? "Другое"] ??
		"bg-zinc-500/10 text-zinc-400 border-zinc-500/25"
	);
}
