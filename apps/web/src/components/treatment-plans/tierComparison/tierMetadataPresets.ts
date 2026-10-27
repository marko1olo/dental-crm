export interface TierPresetMeta {
	readonly title: string;
	readonly subtitle: string;
	readonly badge: string;
	readonly badgeClass: string;
	readonly borderClass: string;
	readonly isRecommended: boolean;
	readonly warrantyYears: number | string;
	readonly serviceLifeYears: number | string;
	readonly materialsHeadline: string;
	readonly materialsList: readonly string[];
	readonly keyAdvantages: readonly string[];
}

export const ECONOMY_TIER_META: TierPresetMeta = {
	title: "Базовый (Эконом)",
	subtitle: "Санация, металлокерамика, частичный съемный протез",
	badge: "Базовый (Эконом)",
	badgeClass: "bg-muted/40 text-muted-foreground border-border",
	borderClass: "border-border hover:border-foreground/40",
	isRecommended: false,
	warrantyYears: 1,
	serviceLifeYears: "до 5–7 лет",
	materialsHeadline: "Санация, металлокерамика CoCr, частичный съемный протез",
	materialsList: [
		"Базовая санация полости рта, световые композиты и устранение кариеса",
		"Восстановление металлокерамическими коронками CoCr",
		"Частичный съемный пластиночный или бюгельный протез с кламмерами",
		"Гарантия клиники 1 год",
	],
	keyAdvantages: [
		"Минимальная стоимость старта лечения (функциональный фокус)",
		"Быстрое устранение очагов инфекции и острой боли",
		"Возможность поэтапной оплаты за каждый визит",
	],
};

export const STANDARD_TIER_META: TierPresetMeta = {
	title: "Оптимальный (Стандарт)",
	subtitle: "Лечение под увеличением, циркониевые коронки, имплантация Osstem/Hiossen",
	badge: "Оптимальный (Стандарт)",
	badgeClass: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30",
	borderClass: "border-[var(--teal,var(--brand-primary))]/50 hover:border-[var(--teal,var(--brand-primary))] shadow-md",
	isRecommended: false,
	warrantyYears: 2,
	serviceLifeYears: "15–20 лет",
	materialsHeadline: "Лечение под увеличением, циркониевые коронки, имплантация Osstem/Hiossen",
	materialsList: [
		"Лечение каналов под увеличением (дентальный микроскоп Leica M320)",
		"Керамические вкладки IPS e.max CAD и анатомические коронки Prettau",
		"Дентальная имплантация Osstem TS III / Hiossen с титановыми абатментами",
		"Комплексная швейцарская гигиена Air-Flow Plus с глициновым порошком",
		"Гарантия клиники 2 года",
	],
	keyAdvantages: [
		"Идеальный баланс долговечности, биосовместимости и эстетики",
		"Коронки из монолитного диоксида циркония и ультранирные вкладки",
		"Надежная остеоинтеграция имплантатов Osstem/Hiossen свыше 98.8%",
		"Лечение каналов под оптическим увеличением микроскопа",
	],
};

export const OPTIMUM_TIER_META: TierPresetMeta = {
	title: "Премиум (Комплексный)",
	subtitle: "Эстетическая реабилитация, виниры E.max, имплантация Straumann/Nobel, каппы элайнеров",
	badge: "Премиум (Комплексный)",
	badgeClass: "bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-400/60 font-bold",
	borderClass: "border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10",
	isRecommended: true,
	warrantyYears: "5+ лет (пожизненно)",
	serviceLifeYears: "25+ лет (пожизненно)",
	materialsHeadline: "Эстетическая реабилитация, виниры E.max, имплантация Straumann/Nobel, каппы элайнеров",
	materialsList: [
		"Эстетическая реабилитация керамическими винирами IPS e.max",
		"Дентальная имплантация премиум-класса Straumann BLX / Nobel Biocare",
		"Ортодонтическое выравнивание зубных рядов прозрачными каппами элайнеров",
		"Эндодонтическое перелечивание под микроскопом Carl Zeiss OPMI PROergo",
		"Гарантия клиники 5+ лет, пожизненная международная гарантия на имплантаты",
	],
	keyAdvantages: [
		"Безупречная эстетика натуральной улыбки с ультратонкими винирами E.max",
		"Швейцарская и шведская имплантация Straumann/Nobel с пожизненной гарантией",
		"Комфортная коррекция прикуса каппами элайнеров без брекетов",
		"Прецизионная точность навигационного 3D-шаблона CAD/CAM",
		"Персональное кураторское сопровождение пациента",
	],
};
