export interface ToothExpressAnesthesiaOption {
	readonly id: string;
	readonly title: string;
	readonly subtitle: string;
	readonly tag: string;
	readonly badgeClass: string;
	readonly buildDiaryText: (toothNumber: number) => string;
}

export const TOOTH_EXPRESS_ANESTHESIA_OPTIONS: readonly ToothExpressAnesthesiaOption[] = [
	{
		id: "articaine_1_100k",
		title: "Артикаин 1:100 000 (1 карп. 1.7 мл)",
		subtitle: "Инфильтрация/проводниковая, эпинефрин 1:100 000, аспирация (-)",
		tag: "Стандарт",
		badgeClass: "text-blue-500 bg-blue-500/10 border-blue-500/30",
		buildDiaryText: (tooth) =>
			`Анестезия зуба ${tooth}: инфильтрационная/проводниковая Sol. Articaini 4% с эпинефрином 1:100 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое, аллергических реакций нет.`,
	},
	{
		id: "ultracain_1_200k",
		title: "Ультракаин Д-С 1:200 000 (1 карп.)",
		subtitle: "Sol. Ultracaini D-S, мягкий эпинефрин 1:200 000, аспирация (-)",
		tag: "Терапия",
		badgeClass: "text-teal-500 bg-teal-500/10 border-teal-500/30",
		buildDiaryText: (tooth) =>
			`Анестезия зуба ${tooth}: инфильтрационная Sol. Ultracaini D-S 1:200 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое.`,
	},
	{
		id: "scandonest_cardio",
		title: "Скандонест 3% для кардио (1 карп.)",
		subtitle: "Мепивакаин 3% БЕЗ адреналина (кардио-риск, гипертония, пожилые)",
		tag: "Кардио",
		badgeClass: "text-amber-500 bg-amber-500/10 border-amber-500/30",
		buildDiaryText: (tooth) =>
			`Анестезия зуба ${tooth}: Sol. Scandonest 3% (Мепивакаин без вазоконстриктора) — 1.7 мл (1 карпула). Кардио-протокол. Аспирационная проба отрицательная. Гемодинамика стабильна.`,
	},
	{
		id: "septanest_1_100k",
		title: "Септанест 1.7 мл",
		subtitle: "Sol. Septanest 1:100 000 (Артикаин 4% с адреналином), аспирация (-)",
		tag: "Хирургия",
		badgeClass: "text-purple-500 bg-purple-500/10 border-purple-500/30",
		buildDiaryText: (tooth) =>
			`Анестезия зуба ${tooth}: инфильтрационная Sol. Septanest 1:100 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое.`,
	},
	{
		id: "topical_application",
		title: "Аппликационная анестезия (гель)",
		subtitle: "Лидоксор / Дисилан 20% гель на десну, экспозиция 2 мин",
		tag: "Поверхностная",
		badgeClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
		buildDiaryText: (tooth) =>
			`Анестезия зуба ${tooth}: аппликационная анестезия переходной складки гелем (Лидоксор / Дисилан 20%), экспозиция 2 мин. Обезболивание места вкола иглы достигнуто.`,
	},
];
