/**
 * remdDentalDictionaries.ts — FDI Tooth Formula, Statuses & 804n / ICD-10 Registries
 */

export const FDI_ADULT_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
	48, 47, 46, 45, 44, 43, 42, 41,
	31, 32, 33, 34, 35, 36, 37, 38,
] as const;

export const FDI_CHILD_TEETH = [
	55, 54, 53, 52, 51,
	61, 62, 63, 64, 65,
	85, 84, 83, 82, 81,
	71, 72, 73, 74, 75,
] as const;

export const ALL_FDI_TEETH = [...FDI_ADULT_TEETH, ...FDI_CHILD_TEETH] as const;

export const DENTAL_TOOTH_STATUS_DICTIONARY: Record<
	string,
	{ code: string; labelRu: string; shortSymbol: string; color: string; egiszCode: string }
> & {
	Healthy: { code: string; labelRu: string; shortSymbol: string; color: string; egiszCode: string };
	Caries: { code: string; labelRu: string; shortSymbol: string; color: string; egiszCode: string };
	Pulpitis: { code: string; labelRu: string; shortSymbol: string; color: string; egiszCode: string };
	Periodontitis: { code: string; labelRu: string; shortSymbol: string; color: string; egiszCode: string };
	Filling: { code: string; labelRu: string; shortSymbol: string; color: string; egiszCode: string };
	Crown: { code: string; labelRu: string; shortSymbol: string; color: string; egiszCode: string };
	Artificial: { code: string; labelRu: string; shortSymbol: string; color: string; egiszCode: string };
	Implant: { code: string; labelRu: string; shortSymbol: string; color: string; egiszCode: string };
	Extracted: { code: string; labelRu: string; shortSymbol: string; color: string; egiszCode: string };
	Root: { code: string; labelRu: string; shortSymbol: string; color: string; egiszCode: string };
	Retained: { code: string; labelRu: string; shortSymbol: string; color: string; egiszCode: string };
	Dystopic: { code: string; labelRu: string; shortSymbol: string; color: string; egiszCode: string };
} = {
	Healthy: { code: "Healthy", labelRu: "Здоров / Интактен", shortSymbol: "З", color: "#10b981", egiszCode: "0" },
	Caries: { code: "Caries", labelRu: "Кариес", shortSymbol: "C", color: "#ef4444", egiszCode: "1" },
	Pulpitis: { code: "Pulpitis", labelRu: "Пульпит", shortSymbol: "P", color: "#dc2626", egiszCode: "2" },
	Periodontitis: { code: "Periodontitis", labelRu: "Периодонтит", shortSymbol: "Pt", color: "#b91c1c", egiszCode: "3" },
	Filling: { code: "Filling", labelRu: "Пломбирован", shortSymbol: "П", color: "#3b82f6", egiszCode: "4" },
	Crown: { code: "Crown", labelRu: "Искусственная коронка", shortSymbol: "К", color: "#8b5cf6", egiszCode: "5" },
	Artificial: { code: "Artificial", labelRu: "Искусственный зуб (мост)", shortSymbol: "И", color: "#6366f1", egiszCode: "6" },
	Implant: { code: "Implant", labelRu: "Имплантат", shortSymbol: "Imp", color: "#06b6d4", egiszCode: "7" },
	Extracted: { code: "Extracted", labelRu: "Отсутствует / Удален", shortSymbol: "О", color: "#64748b", egiszCode: "8" },
	Root: { code: "Root", labelRu: "Корень (подлежит удалению)", shortSymbol: "R", color: "#991b1b", egiszCode: "9" },
	Retained: { code: "Retained", labelRu: "Ретинированный зуб", shortSymbol: "Рет", color: "#d97706", egiszCode: "10" },
	Dystopic: { code: "Dystopic", labelRu: "Дистопированный зуб", shortSymbol: "Дис", color: "#eab308", egiszCode: "11" },
};

export const DENTAL_SURFACES = [
	{ code: "O", labelRu: "Окклюзионная (Жевательная)", shortName: "Оккл" },
	{ code: "M", labelRu: "Медиальная (Апроксимальная)", shortName: "Мед" },
	{ code: "D", labelRu: "Дистальная (Апроксимальная)", shortName: "Дист" },
	{ code: "V", labelRu: "Вестибулярная (Щечная / Губная)", shortName: "Вест" },
	{ code: "L", labelRu: "Язычная / Нёбная", shortName: "Языч" },
	{ code: "Cerv", labelRu: "Пришеечная область", shortName: "Шейка" },
] as const;

export const COMMON_DENTAL_ICD10 = [
	{ code: "K02.0", name: "Кариес эмали (включая белое пятно)", category: "Кариес" },
	{ code: "K02.1", name: "Кариес дентина", category: "Кариес" },
	{ code: "K02.2", name: "Кариес цемента", category: "Кариес" },
	{ code: "K02.8", name: "Другой кариес зубов", category: "Кариес" },
	{ code: "K04.0", name: "Пульпит (острый / хронический)", category: "Пульпит" },
	{ code: "K04.1", name: "Некроз пульпы (гангрена)", category: "Пульпит" },
	{ code: "K04.4", name: "Острый апикальный периодонтит", category: "Периодонтит" },
	{ code: "K04.5", name: "Хронический апикальный периодонтит", category: "Периодонтит" },
	{ code: "K05.0", name: "Острый гингивит", category: "Пародонт" },
	{ code: "K05.1", name: "Хронический гингивит", category: "Пародонт" },
	{ code: "K05.3", name: "Хронический пародонтит", category: "Пародонт" },
	{ code: "K08.1", name: "Потеря зубов вследствие болезни", category: "Ортопедия" },
	{ code: "K00.6", name: "Нарушения прорезывания зубов", category: "Хирургия" },
	{ code: "Z01.2", name: "Стоматологическое обследование", category: "Осмотр" },
] as const;

export const COMMON_804N_DENTAL_SERVICES = [
	{ code: "B01.065.001", name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный" },
	{ code: "B01.065.002", name: "Прием (осмотр, консультация) врача-стоматолога-терапевта повторный" },
	{ code: "B01.066.001", name: "Прием (осмотр, консультация) врача-стоматолога-ортопеда первичный" },
	{ code: "B01.067.001", name: "Прием (осмотр, консультация) врача-стоматолога-хирурга первичный" },
	{ code: "A16.07.002.001", name: "Восстановление зуба пломбой с нарушением формы I, V, VI класс" },
	{ code: "A16.07.002.002", name: "Восстановление зуба пломбой II, III класс с светоотверждаемыми материалами" },
	{ code: "A16.07.030.001", name: "Инструментальная и медикаментозная обработка корневого канала" },
	{ code: "A16.07.008.002", name: "Пломбирование корневого канала зуба гуттаперчевыми штифтами" },
	{ code: "A16.07.001.001", name: "Удаление постоянного зуба простое" },
	{ code: "A16.07.001.002", name: "Удаление постоянного зуба сложное с разъединением корней" },
	{ code: "A16.07.006", name: "Профессиональная гигиена полости рта и зубов (Air-Flow)" },
	{ code: "A16.07.004", name: "Восстановление зуба коронкой постоянной металлокерамической / диоксид циркония" },
] as const;
