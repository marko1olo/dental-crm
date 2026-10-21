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
	title: "Базовый / Эконом (Терапевтическая санация)",
	subtitle: "Базовая санация, световые пломбы, функциональный фокус и базовая терапия композитами",
	badge: "Базовый / Эконом",
	badgeClass: "bg-muted/40 text-muted-foreground border-border",
	borderClass: "border-border hover:border-foreground/40",
	isRecommended: false,
	warrantyYears: 1,
	serviceLifeYears: "до 5–7 лет",
	materialsHeadline: "Световые микрогибридные композиты Gradia / Charisma, базовая УЗ-гигиена, функциональный фокус",
	materialsList: [
		"Базовая санация полости рта и световые композиты (GC Gradia / Heraeus Charisma)",
		"Терапевтическое устранение кариеса и очагов воспаления",
		"Ультразвуковое снятие наддесневого камня и первичная гигиена",
		"Гарантия клиники 1 год",
	],
	keyAdvantages: [
		"Минимальная стоимость старта лечения (функциональный фокус)",
		"Быстрое устранение очагов инфекции и острой боли",
		"Возможность поэтапной оплаты за каждый визит",
	],
};

export const STANDARD_TIER_META: TierPresetMeta = {
	title: "Оптимальный (Комплексная реабилитация)",
	subtitle: "Керамические вкладки, эндодонтия под микроскопом, биологическая герметизация и коронки Prettau",
	badge: "Оптимальный",
	badgeClass: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30",
	borderClass: "border-[var(--teal,var(--brand-primary))]/50 hover:border-[var(--teal,var(--brand-primary))] shadow-md",
	isRecommended: false,
	warrantyYears: 2,
	serviceLifeYears: "15–20 лет",
	materialsHeadline: "Керамические вкладки IPS e.max CAD, монолитный диоксид циркония Prettau, эндодонтия Leica",
	materialsList: [
		"Лечение каналов под дентальным микроскопом Leica M320 и биологическая герметизация",
		"Керамические ультранирные вкладки IPS e.max CAD и анатомические коронки Prettau",
		"Эндодонтическое восстановление: стекловолоконный штифт и анатомический билд-ап",
		"Комплексная швейцарская гигиена Air-Flow Plus с глициновым порошком",
		"Гарантия клиники 2 года",
	],
	keyAdvantages: [
		"Идеальный баланс долговечности, биологической герметизации и эстетики",
		"Керамические прецизионные вкладки E.max CAD и монолитный диоксид циркония",
		"Надежная фиксация со стекловолоконным штифтом и сохранение корня",
		"Эндодонтия под оптическим увеличением микроскопа",
	],
};

export const OPTIMUM_TIER_META: TierPresetMeta = {
	title: "Премиум (Прецизионная реконструкция)",
	subtitle: "Циркониевые коронки, имплантация Straumann/Osstem, индивидуальные абатменты и микроскоп Carl Zeiss",
	badge: "Премиум — Выбор клиники",
	badgeClass: "bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-400/60 font-bold",
	borderClass: "border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10",
	isRecommended: true,
	warrantyYears: "5+ лет (пожизненно)",
	serviceLifeYears: "25+ лет (пожизненно)",
	materialsHeadline: "Швейцарские имплантаты Straumann SLActive / Osstem TS-III, коронки из циркония, 3D-шаблон CAD/CAM",
	materialsList: [
		"Дентальная имплантация Straumann Roxolid BLX / SLActive и Osstem TS-III по 3D-шаблону",
		"Высокоэстетичные коронки из многослойного диоксида циркония с индивидуальными абатментами",
		"Эндодонтическое перелечивание под микроскопом Carl Zeiss OPMI PROergo",
		"Направленная костная регенерация (GBR) биомембранами Geistlich Bio-Gide",
		"Премиальная SPA-профгигиена Clinpro + фотопротокол",
		"Гарантия клиники 5+ лет, пожизненная международная гарантия на имплантаты",
	],
	keyAdvantages: [
		"Максимальная надежность: швейцарская имплантация Straumann и цирконий",
		"Прецизионная точность навигационного 3D-шаблона CAD/CAM",
		"Ускоренная остеоинтеграция имплантатов за счет гидрофильной поверхности SLActive",
		"Безупречная эстетика натурального зуба с послойной керамикой",
		"Персональное кураторское сопровождение пациента",
	],
};
