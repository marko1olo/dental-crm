import type { TreatmentPlanTierId } from "../types";

export interface TierMeta {
	readonly title: string;
	readonly subtitle: string;
	readonly badge: string;
	readonly badgeClass: string;
	readonly borderClass: string;
	readonly isRecommended: boolean;
	readonly warrantyYears: string;
	readonly materialsHeadline: string;
	readonly materialsList: readonly string[];
	readonly keyAdvantages: readonly string[];
}

export const TIER_METAS: Record<TreatmentPlanTierId, TierMeta> = {
	economy: {
		title: "Эконом (Базовые проверенные решения)",
		subtitle: "Проверенные решения: имплантаты Osstem/MIS, металлокерамика Co-Cr и базовая санация",
		badge: "Эконом",
		badgeClass: "bg-muted/40 text-muted-foreground border-border",
		borderClass: "border-border hover:border-foreground/40",
		isRecommended: false,
		warrantyYears: "1 год",
		materialsHeadline: "Имплантаты Osstem TS-III / MIS, металлокерамика Co-Cr Vita VM13, микрогибридные композиты",
		materialsList: [
			"Дентальная имплантация Osstem TS-III / MIS V3",
			"Металлокерамические коронки с нанесением керамики Vita",
			"Базовая терапевтическая санация и коффердам",
			"Гарантия клиники 1 год",
		],
		keyAdvantages: [
			"Минимальная стоимость надежного восстановления зубов",
			"Проверенные временем протоколы и сплавы",
			"Поэтапная оплата по графику 30/40/30",
		],
	},
	standard: {
		title: "Оптимум (Рекомендуемый клинический стандарт)",
		subtitle: "Клинический золотой стандарт: Dentium SuperLine / Osstem, коронки из многослойного диоксида циркония ZrO2",
		badge: "Оптимум — Выбор врачей",
		badgeClass: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30",
		borderClass: "border-[var(--teal,var(--brand-primary))]/50 hover:border-[var(--teal,var(--brand-primary))] shadow-md",
		isRecommended: true,
		warrantyYears: "3 года",
		materialsHeadline: "Имплантаты Dentium SuperLine / Osstem, диоксид циркония Katana ML, остеопластика Bio-Oss",
		materialsList: [
			"Имплантаты Dentium SuperLine SLA с высокой первичной стабильностью",
			"Безметалловые коронки из многослойного диоксида циркония Katana ML 1200 МПа",
			"Прецизионный транскрестальный / открытый синус-лифтинг Geistlich Bio-Oss",
			"Анатомический билд-ап со стекловолоконным штифтом RelyX",
			"Гарантия клиники 3 года",
		],
		keyAdvantages: [
			"Идеальное сочетание прочности, биосовместимости и долговечности",
			"Отсутствие синюшности десны за счет безметаллового циркония",
			"Надежная остеоинтеграция 98.8% по данным КЛКТ",
			"Возможность беспроцентной рассрочки 0% на 12 месяцев",
		],
	},
	optimum: {
		title: "Премиум (Топовые системы и эстетика высшего класса)",
		subtitle: "Швейцарские имплантаты Straumann Roxolid SLActive / Nobel Biocare, индивидуальные абатменты и керамика E.max",
		badge: "Премиум — Превосходство",
		badgeClass: "bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-400/60 font-bold",
		borderClass: "border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10",
		isRecommended: false,
		warrantyYears: "Пожизненная (5 лет клиника)",
		materialsHeadline: "Имплантаты Straumann Roxolid SLActive / Nobel Biocare, индивидуальный Ti-Base абатмент, керамика IPS e.max Press",
		materialsList: [
			"Премиальные швейцарские имплантаты Straumann SLActive (ускоренное приживление за 3-4 нед)",
			"Индивидуальный титано-циркониевый абатмент для безупречного десневого края",
			"Высокоэстетичные цельнокерамические коронки IPS e.max Press / Katana UTML",
			"Интраоральное цифровое 3D-сканирование 3Shape TRIOS без снятия слепков",
			"Пожизненная международная гарантия производителя на имплантаты",
		],
		keyAdvantages: [
			"Бескомпромиссная надежность при минимальной толщине кости",
			"Естественная эстетика живого зуба со светопроницаемостью",
			"Индивидуальное сопровождение куратора лечения",
			"Максимальный налоговый вычет 13% со всей суммы без лимита (Код 02)",
		],
	},
};
