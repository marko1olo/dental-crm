/**
 * DENTE Dental CRM — Universal Status Badge Clinical Matrix
 * Codes, colors, and clinical descriptions for all tooth states.
 * Mandate 8b <= 120 lines.
 */

export interface ToothStatusBadgeInfo {
	code: string;
	title: string;
	bg: string;
	border: string;
	text: string;
}

export const TOOTH_STATUS_MATRIX: Record<string, ToothStatusBadgeInfo> = {
	// 1. Норма
	intact: { code: "✓", title: "Интактный / Здоров", bg: "#64748b", border: "#94a3b8", text: "#ffffff" },
	missing: { code: "О", title: "Отсутствует (удален / адентия)", bg: "#334155", border: "#475569", text: "#ffffff" },

	// 2. Кариес
	caries: { code: "C", title: "Кариес I класса (фиссурный)", bg: "#ef4444", border: "#b91c1c", text: "#ffffff" },
	caries_class2_mo: { code: "MO", title: "Кариес II класса (мезиально-окклюзионный)", bg: "#ef4444", border: "#b91c1c", text: "#ffffff" },
	caries_class2_do: { code: "DO", title: "Кариес II класса (дистально-окклюзионный)", bg: "#ef4444", border: "#b91c1c", text: "#ffffff" },
	caries_class2_mod: { code: "MOD", title: "Кариес II класса (сквозной МОД)", bg: "#ef4444", border: "#b91c1c", text: "#ffffff" },
	caries_class5: { code: "C5", title: "Кариес V класса (пришеечный)", bg: "#ef4444", border: "#b91c1c", text: "#ffffff" },
	caries_white_spot: { code: "Cs", title: "Кариес в стадии пятна (in situ)", bg: "#f87171", border: "#ef4444", text: "#ffffff" },
	caries_acute: { code: "Ко", title: "Острый глубокий кариес", bg: "#dc2626", border: "#991b1b", text: "#ffffff" },
	caries_chronic: { code: "Кх", title: "Хронический пигментированный кариес", bg: "#991b1b", border: "#450a0a", text: "#ffffff" },

	// 3. Пломбы и микропротезы
	composite: { code: "П", title: "Пломба состоятельная", bg: "#0284c7", border: "#0369a1", text: "#ffffff" },
	composite_defective: { code: "Пд", title: "Пломба дефектная (вторичный кариес)", bg: "#0369a1", border: "#dc2626", text: "#ffffff" },
	restoration_inlay: { code: "Вк", title: "Керамическая вкладка Inlay", bg: "#0284c7", border: "#38bdf8", text: "#ffffff" },
	restoration_onlay: { code: "Нк", title: "Керамическая накладка Onlay", bg: "#0284c7", border: "#38bdf8", text: "#ffffff" },

	// 4. Пульпит и периодонтит
	pulpitis: { code: "P", title: "Острый пульпит", bg: "#f97316", border: "#c2410c", text: "#ffffff" },
	periodontitis: { code: "Pt", title: "Верхушечный периодонтит", bg: "#9333ea", border: "#7e22ce", text: "#ffffff" },
	cyst: { code: "Кс", title: "Радикулярная киста", bg: "#9333ea", border: "#581c87", text: "#ffffff" },
	resorption: { code: "Рз", title: "Апикальная резорбция корня", bg: "#9333ea", border: "#581c87", text: "#ffffff" },

	// 5. Каналы и эндодонтия
	endodontics: { code: "Э", title: "Обтурация каналов гуттаперчей", bg: "#10b981", border: "#047857", text: "#ffffff" },
	underfill: { code: "Эн", title: "Недопломбировка корневых каналов", bg: "#f59e0b", border: "#d97706", text: "#ffffff" },
	overfill: { code: "Эп", title: "Выведение силера за апекс (Puff)", bg: "#f59e0b", border: "#d97706", text: "#ffffff" },
	broken_file: { code: "Ин", title: "Отломок инструмента в канале", bg: "#ef4444", border: "#991b1b", text: "#ffffff" },
	resorcinol_formalin: { code: "РФ", title: "Резорцин-формалиновый зуб", bg: "#e11d48", border: "#9f1239", text: "#ffffff" },
	calcium_hydroxide: { code: "Са", title: "Временный гидроксид кальция Ca(OH)2", bg: "#06b6d4", border: "#0891b2", text: "#ffffff" },
	root_perforation: { code: "Пр", title: "Перфорация корня / бифуркации", bg: "#ef4444", border: "#7f1d1d", text: "#ffffff" },
	canal_ledge: { code: "Ст", title: "Ступенька в корневом канале", bg: "#f59e0b", border: "#b45309", text: "#ffffff" },
	vertical_root_fracture: { code: "Тк", title: "Вертикальная трещина корня (VRF)", bg: "#ef4444", border: "#450a0a", text: "#ffffff" },

	// 6. Ортопедия
	crown: { code: "К", title: "Искусственная коронка (Цирконий)", bg: "#d97706", border: "#b45309", text: "#ffffff" },
	crown_defective: { code: "Кд", title: "Коронка дефектная (скол керамики)", bg: "#d97706", border: "#dc2626", text: "#ffffff" },
	crown_pfm: { code: "МК", title: "Металлокерамическая коронка PFM", bg: "#d97706", border: "#78350f", text: "#ffffff" },
	crown_pfm_defective: { code: "МКд", title: "Металлокерамика (скол до металла)", bg: "#d97706", border: "#dc2626", text: "#ffffff" },
	crown_emax: { code: "Em", title: "Керамическая коронка E-Max", bg: "#d97706", border: "#fde68a", text: "#ffffff" },
	crown_emax_defective: { code: "Emд", title: "E-Max коронка со сколом", bg: "#d97706", border: "#dc2626", text: "#ffffff" },
	crown_gold: { code: "Au", title: "Золотая цельнолитая коронка", bg: "#eab308", border: "#a16207", text: "#ffffff" },
	crown_gold_defective: { code: "Auд", title: "Золотая коронка с дефектом", bg: "#eab308", border: "#dc2626", text: "#ffffff" },
	crown_metal: { code: "Me", title: "Цельнометаллическая коронка CoCr", bg: "#64748b", border: "#334155", text: "#ffffff" },
	crown_metal_defective: { code: "Meд", title: "Металлическая коронка со сквозным истиранием", bg: "#64748b", border: "#dc2626", text: "#ffffff" },
	crown_pmma: { code: "Кв", title: "Временная пластмассовая коронка PMMA", bg: "#d97706", border: "#fbbf24", text: "#ffffff" },
	crown_pmma_defective: { code: "Квд", title: "Временная коронка (трещина / скол)", bg: "#d97706", border: "#dc2626", text: "#ffffff" },
	postCore: { code: "СВШ", title: "Стекловолоконный штифт с билдапом", bg: "#0284c7", border: "#38bdf8", text: "#ffffff" },
	postCore_cast: { code: "КШВ", title: "Литая культевая вкладка", bg: "#475569", border: "#64748b", text: "#ffffff" },

	// 7. Имплантология
	implant: { code: "И", title: "Дентальный имплантат (внутрикостный)", bg: "#6366f1", border: "#4f46e5", text: "#ffffff" },
	implant_healing_abutment: { code: "ФД", title: "Формирователь десны", bg: "#6366f1", border: "#818cf8", text: "#ffffff" },
	implant_crown: { code: "Ик", title: "Коронка на имплантате", bg: "#6366f1", border: "#d97706", text: "#ffffff" },
	implant_crown_screw: { code: "Ив", title: "Винтовая фиксация на имплантате", bg: "#6366f1", border: "#c026d3", text: "#ffffff" },
	implant_temporary: { code: "Ив", title: "Временная коронка на имплантате", bg: "#6366f1", border: "#f59e0b", text: "#ffffff" },

	// 8. Некариозные и пародонтология
	abfraction: { code: "Кл", title: "Клиновидный дефект (Abfraction)", bg: "#854d0e", border: "#a16207", text: "#ffffff" },
	pathological_attrition: { code: "Ст", title: "Патологическая стираемость эмали и дентина", bg: "#854d0e", border: "#a16207", text: "#ffffff" },
	calculus: { code: "Км", title: "Зубной камень (над- и поддесневой)", bg: "#78350f", border: "#92400e", text: "#ffffff" },
	crack: { code: "Тр", title: "Трещина эмали (Infraction)", bg: "#dc2626", border: "#b91c1c", text: "#ffffff" },
};
