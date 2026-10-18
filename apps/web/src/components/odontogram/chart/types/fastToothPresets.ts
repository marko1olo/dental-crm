export interface FastToothPreset {
	id: string;
	title: string;
	shortTitle: string;
	description: string;
	badge: string;
	icd10?: string;
	code804n?: string;
}

export const FAST_TOOTH_PRESETS: readonly FastToothPreset[] = [
	{
		id: "intact_dentition",
		title: "Интактный зубной ряд (Все зубы здоровы / норма)",
		shortTitle: "Интактный (Норма)",
		description: "Все 32 зуба отмечаются здоровыми (медосмотр, военкомат, бассейн, санация)",
		badge: "Норма",
		icd10: "Z01.2",
	},
	{
		id: "pro_hygiene_done",
		title: "Профгигиена выполнена (Ультразвук + Air-Flow + полировка)",
		shortTitle: "Профгигиена (УЗ + Air-Flow)",
		description: "Снятие зубных отложений УЗ + Air-Flow + полировка Detartrine + фторирование Bifluorid",
		badge: "В дневник",
		icd10: "Z01.2",
		code804n: "A16.07.051",
	},
	{
		id: "fast_caries_k021",
		title: "Быстрая пломба / кариес дентина (K02.1)",
		shortTitle: "Пломба/Кариес (K02.1)",
		description: "Препарирование кариозной полости, медобработка, адгезивный протокол, пломба светового отверждения",
		badge: "K02.1",
		icd10: "K02.1",
		code804n: "A16.07.002.001",
	},
	{
		id: "wisdom_missing",
		title: "Адентия 8-ок (18, 28, 38, 48)",
		shortTitle: "Без 8-ок",
		description: "Зубы мудрости 18, 28, 38, 48 помечаются отсутствующими / удаленными",
		badge: "K08.1",
		icd10: "K08.1",
	},
	{
		id: "fast_pulpitis_turnkey",
		title: "Пульпит под ключ (K04.0: анестезия + каналы + обтурация + пломба)",
		shortTitle: "Пульпит под ключ (K04.0)",
		description: "Эндодонтическое лечение: анестезия, коффердам, обработка и пломбирование каналов, световая пломба",
		badge: "K04.0",
		icd10: "K04.0",
		code804n: "A16.07.030",
	},
	{
		id: "fast_extraction_turnkey",
		title: "Удаление зуба под ключ (K08.1: анестезия + удаление + гемостаз + шов)",
		shortTitle: "Удаление зуба (K08.1)",
		description: "Хирургический протокол: анестезия, периотомия, атравматичное удаление, ревизия, кюретаж, шов",
		badge: "K08.1",
		icd10: "K08.1",
		code804n: "A16.07.001",
	},
] as const;
