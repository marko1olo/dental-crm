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
	subtitle: "Лечение под оптическим увеличением, циркониевые коронки, двухэтапная имплантация",
	badge: "Оптимальный (Стандарт)",
	badgeClass: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30",
	borderClass: "border-[var(--teal,var(--brand-primary))]/50 hover:border-[var(--teal,var(--brand-primary))] shadow-md",
	isRecommended: false,
	warrantyYears: 2,
	serviceLifeYears: "15–20 лет",
	materialsHeadline: "Лечение под оптическим увеличением, циркониевые коронки, имплантация с титановыми абатментами",
	materialsList: [
		"Лечение корневых каналов под операционным дентальным микроскопом",
		"Керамические вкладки и анатомические коронки из диоксида циркония",
		"Дентальная имплантация с микроструктурированной поверхностью и титановыми абатментами",
		"Комплексная профессиональная гигиена и деликатная полировка глицином",
		"Гарантия клиники 2 года",
	],
	keyAdvantages: [
		"Идеальный баланс долговечности, биосовместимости и эстетики",
		"Коронки из монолитного диоксида циркония и прочные вкладки",
		"Надежная остеоинтеграция дентальных имплантатов свыше 98.8%",
		"Прецизионное лечение каналов под увеличением операционного микроскопа",
	],
};

export const OPTIMUM_TIER_META: TierPresetMeta = {
	title: "Премиум (Комплексный)",
	subtitle: "Эстетическая реабилитация, керамические виниры, премиум-имплантация, прозрачные каппы",
	badge: "Премиум (Комплексный)",
	badgeClass: "bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-400/60 font-bold",
	borderClass: "border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10",
	isRecommended: true,
	warrantyYears: "5+ лет (пожизненно)",
	serviceLifeYears: "25+ лет (пожизненно)",
	materialsHeadline: "Эстетическая реабилитация, ультратонкие виниры, премиум-имплантация, каппы элайнеров",
	materialsList: [
		"Эстетическая реабилитация прессованными керамическими винирами и рефрактором",
		"Дентальная имплантация премиум-класса с гидрофильной остеокондуктивной поверхностью",
		"Ортодонтическое выравнивание зубных рядов прозрачными элайнерами",
		"Прецизионная микроскопная эндодонтия со сложной анатомией",
		"Гарантия клиники 5+ лет, пожизненная сервисная карта на имплантаты",
	],
	keyAdvantages: [
		"Безупречная эстетика натуральной улыбки с ультратонкими керамическими винирами",
		"Премиальная имплантация с ускоренной остеоинтеграцией и пожизненной гарантией",
		"Комфортная коррекция прикуса прозрачными каппами элайнеров без брекетов",
		"Прецизионная точность навигационного 3D-шаблона CAD/CAM",
		"Персональное кураторское сопровождение пациента",
	],
};
