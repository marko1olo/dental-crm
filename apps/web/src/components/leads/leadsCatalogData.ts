/**
 * apps/web/src/components/leads/leadsCatalogData.ts
 *
 * Канонический SSOT каталог и структуры данных воронки первичных обращений (Leads & CRM Funnel).
 * Спроектировано по Мандатам 8b/8zi (Sweet Spot 300–350 строк), 8e (Автономия врача), 8n (Соло и 1–5 кресел).
 * Без симуляций и мокапов: строгие типы, 5 стадий воронки, 6 каналов трафика РФ и быстрые клинические теги.
 */

export type FunnelStageId = "new" | "contacted" | "consult_booked" | "showed_up" | "rejected";
export type TrafficChannelId = "yandex_maps" | "twogis" | "prodoctorov" | "referral" | "website" | "messengers";
export type ClinicalNeedTag = "Острая боль" | "Имплантация" | "Брекеты" | "Чистка" | "Детский приём";

export interface FunnelStageDef {
	readonly id: FunnelStageId;
	readonly label: string;
	readonly shortLabel: string;
	readonly description: string;
	readonly colorToken: string;
	readonly badgeClass: string;
	readonly stepNumber: number;
}

export interface TrafficChannelDef {
	readonly id: TrafficChannelId;
	readonly name: string;
	readonly icon: string;
	readonly color: string;
	readonly avgCacRub: number;
	readonly defaultSharePct: number;
}

export interface LeadItem {
	id: string;
	name: string;
	phone: string;
	channelId: TrafficChannelId;
	stageId: FunnelStageId;
	needTag: ClinicalNeedTag;
	potentialRevenueRub: number;
	notes: string;
	createdAt: string;
	updatedAt: string;
	assignedDoctorName?: string;
	isConverted?: boolean;
	convertedPatientId?: string;
}

export interface TrafficChannelStats {
	readonly channelId: TrafficChannelId;
	readonly name: string;
	readonly leadCount: number;
	readonly totalRevenueRub: number;
	readonly conversionToArrivedPct: number;
	readonly activeLeadsCount: number;
}

export interface FunnelSummaryStats {
	readonly totalLeads: number;
	readonly activeLeads: number;
	readonly totalPipelineRevenueRub: number;
	readonly closedWonRevenueRub: number;
	readonly overallConversionPct: number;
	readonly avgDealCheckRub: number;
	readonly stagesCount: Record<FunnelStageId, number>;
}

/** 5 канонических стадий воронки первичных пациентов стоматологии РФ */
export const FUNNEL_STAGES: readonly FunnelStageDef[] = [
	{
		id: "new",
		label: "Новый лид",
		shortLabel: "Новые",
		description: "Входящее обращение, неотвеченный звонок или заявка",
		colorToken: "var(--teal)",
		badgeClass: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
		stepNumber: 1,
	},
	{
		id: "contacted",
		label: "Квалифицирован / Звонок",
		shortLabel: "Квалификация",
		description: "Связь установлена, жалоба и потребность пациента определены",
		colorToken: "var(--primary)",
		badgeClass: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
		stepNumber: 2,
	},
	{
		id: "consult_booked",
		label: "Записан на консультацию",
		shortLabel: "Записан",
		description: "Забронирован слот в расписании, назначен лечащий врач",
		colorToken: "var(--amber, #f59e0b)",
		badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
		stepNumber: 3,
	},
	{
		id: "showed_up",
		label: "Дошел / Приём",
		shortLabel: "Дошел",
		description: "Пациент явился в клинику, первичный осмотр проведен",
		colorToken: "var(--emerald, #10b981)",
		badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
		stepNumber: 4,
	},
	{
		id: "rejected",
		label: "Отказ / Нецелевой",
		shortLabel: "Отказ",
		description: "Не ответил на 3+ звонка, не сошлись по цене, спам или не наш профиль",
		colorToken: "var(--muted)",
		badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
		stepNumber: 5,
	},
] as const;

/** 6 канонических каналов трафика частной стоматологии РФ */
export const TRAFFIC_CHANNELS: readonly TrafficChannelDef[] = [
	{ id: "yandex_maps", name: "Яндекс Карты", icon: "MapPin", color: "#fc3f1d", avgCacRub: 1450, defaultSharePct: 32 },
	{ id: "twogis", name: "2ГИС", icon: "Compass", color: "#00a651", avgCacRub: 1250, defaultSharePct: 24 },
	{ id: "prodoctorov", name: "ПроДокторов", icon: "Award", color: "#2563eb", avgCacRub: 2100, defaultSharePct: 18 },
	{ id: "referral", name: "Сарафанное радио", icon: "Users", color: "#8b5cf6", avgCacRub: 350, defaultSharePct: 14 },
	{ id: "website", name: "Сайт", icon: "Globe", color: "#0d9488", avgCacRub: 1600, defaultSharePct: 8 },
	{ id: "messengers", name: "Telegram/WhatsApp", icon: "MessageSquare", color: "#06b6d4", avgCacRub: 900, defaultSharePct: 4 },
] as const;

/** 5 экспресс-тегов клинических потребностей для быстрого назначения за 5 секунд */
export const CLINICAL_NEED_TAGS: readonly {
	tag: ClinicalNeedTag;
	defaultRevenueRub: number;
	recommendedDoctor: string;
	urgencyDays: number;
}[] = [
	{ tag: "Острая боль", defaultRevenueRub: 9500, recommendedDoctor: "Дежурный терапевт", urgencyDays: 0 },
	{ tag: "Имплантация", defaultRevenueRub: 95000, recommendedDoctor: "Хирург-имплантолог", urgencyDays: 3 },
	{ tag: "Брекеты", defaultRevenueRub: 185000, recommendedDoctor: "Врач-ортодонт", urgencyDays: 7 },
	{ tag: "Чистка", defaultRevenueRub: 6500, recommendedDoctor: "Гигиенист / Терапевт", urgencyDays: 5 },
	{ tag: "Детский приём", defaultRevenueRub: 8000, recommendedDoctor: "Детский стоматолог", urgencyDays: 2 },
] as const;

/** Реалистичный образцовый реестр лидов (SSOT для соло-врача и клиники 1–5 кресел) */
export const INITIAL_LEADS_DATA: readonly LeadItem[] = [
	{
		id: "lead-dente-101",
		name: "Волкова Елена Сергеевна",
		phone: "+7 (916) 432-11-22",
		channelId: "yandex_maps",
		stageId: "new",
		needTag: "Острая боль",
		potentialRevenueRub: 12500,
		notes: "Пульсирующая боль в зубе 4.6 со вчерашнего вечера, просит срочный приём",
		createdAt: "2026-10-31T09:15:00.000Z",
		updatedAt: "2026-10-31T09:15:00.000Z",
	},
	{
		id: "lead-dente-102",
		name: "Михайлов Артем Павлович",
		phone: "+7 (925) 777-88-99",
		channelId: "prodoctorov",
		stageId: "new",
		needTag: "Имплантация",
		potentialRevenueRub: 145000,
		notes: "Отсутствуют зубы 3.6 и 3.7, есть свежее КЛКТ на флешке",
		createdAt: "2026-10-31T09:40:00.000Z",
		updatedAt: "2026-10-31T09:40:00.000Z",
	},
	{
		id: "lead-dente-103",
		name: "Соколова Анна Дмитриевна",
		phone: "+7 (903) 123-45-67",
		channelId: "twogis",
		stageId: "contacted",
		needTag: "Брекеты",
		potentialRevenueRub: 210000,
		notes: "Консультация ортодонта, интересны самолигирующие керамические брекеты",
		createdAt: "2026-10-30T14:20:00.000Z",
		updatedAt: "2026-10-31T10:00:00.000Z",
		assignedDoctorName: "Д-р Кузнецова В.А.",
	},
	{
		id: "lead-dente-104",
		name: "Григорьев Максим Юрьевич",
		phone: "+7 (985) 987-65-43",
		channelId: "referral",
		stageId: "contacted",
		needTag: "Чистка",
		potentialRevenueRub: 7500,
		notes: "Пришел по рекомендации от пациента Григорьевой Н.И., профгигиена AirFlow",
		createdAt: "2026-10-30T16:45:00.000Z",
		updatedAt: "2026-10-31T10:15:00.000Z",
		assignedDoctorName: "Д-р Новиков И.С.",
	},
	{
		id: "lead-dente-105",
		name: "Романова Мария Владимировна",
		phone: "+7 (926) 333-22-11",
		channelId: "website",
		stageId: "consult_booked",
		needTag: "Имплантация",
		potentialRevenueRub: 98000,
		notes: "Записана на консультацию хирурга на завтра в 11:30, кресло 1",
		createdAt: "2026-10-29T11:00:00.000Z",
		updatedAt: "2026-10-30T12:00:00.000Z",
		assignedDoctorName: "Д-р Соколов А.В.",
	},
	{
		id: "lead-dente-106",
		name: "Кузьмина Дарья Андреевна",
		phone: "+7 (915) 555-44-33",
		channelId: "messengers",
		stageId: "consult_booked",
		needTag: "Детский приём",
		potentialRevenueRub: 8500,
		notes: "Ребенок 6 лет, кариес молочных зубов, первый визит к стоматологу",
		createdAt: "2026-10-29T17:30:00.000Z",
		updatedAt: "2026-10-30T15:20:00.000Z",
		assignedDoctorName: "Д-р Смирнова О.П.",
	},
	{
		id: "lead-dente-107",
		name: "Лебедев Денис Олегович",
		phone: "+7 (905) 666-77-88",
		channelId: "yandex_maps",
		stageId: "showed_up",
		needTag: "Острая боль",
		potentialRevenueRub: 16000,
		notes: "Приём завершен, купирован пульпит 2.5, составлен план лечения",
		createdAt: "2026-10-28T08:30:00.000Z",
		updatedAt: "2026-10-31T11:00:00.000Z",
		assignedDoctorName: "Д-р Соколов А.В.",
		isConverted: true,
		convertedPatientId: "pat-lebedev-107",
	},
	{
		id: "lead-dente-108",
		name: "Петров Кирилл Васильевич",
		phone: "+7 (916) 111-22-33",
		channelId: "twogis",
		stageId: "rejected",
		needTag: "Чистка",
		potentialRevenueRub: 5000,
		notes: "Не ответил на 3 звонка администратора, передумал делать процедуру",
		createdAt: "2026-10-27T10:00:00.000Z",
		updatedAt: "2026-10-29T18:00:00.000Z",
	},
];

/** Получение определения стадии по идентификатору */
export function getFunnelStageDef(stageId: FunnelStageId): FunnelStageDef {
	return FUNNEL_STAGES.find((s) => s.id === stageId) || (FUNNEL_STAGES[0] as FunnelStageDef);
}

/** Получение определения канала по идентификатору */
export function getTrafficChannelDef(channelId: TrafficChannelId): TrafficChannelDef {
	return TRAFFIC_CHANNELS.find((c) => c.id === channelId) || (TRAFFIC_CHANNELS[0] as TrafficChannelDef);
}

/** Расчет сводных аналитических показателей воронки */
export function calculateFunnelSummary(leads: readonly LeadItem[]): FunnelSummaryStats {
	const stagesCount: Record<FunnelStageId, number> = {
		new: 0,
		contacted: 0,
		consult_booked: 0,
		showed_up: 0,
		rejected: 0,
	};
	let totalRevenue = 0;
	let closedWonRevenue = 0;

	for (const lead of leads) {
		stagesCount[lead.stageId] = (stagesCount[lead.stageId] || 0) + 1;
		totalRevenue += lead.potentialRevenueRub;
		if (lead.stageId === "showed_up") {
			closedWonRevenue += lead.potentialRevenueRub;
		}
	}

	const totalLeads = leads.length;
	const activeLeads = stagesCount.new + stagesCount.contacted + stagesCount.consult_booked;
	const showedUpCount = stagesCount.showed_up;
	const overallConversionPct = totalLeads > 0 ? Math.round((showedUpCount / totalLeads) * 100) : 0;
	const avgDealCheckRub = totalLeads > 0 ? Math.round(totalRevenue / totalLeads) : 0;

	return {
		totalLeads,
		activeLeads,
		totalPipelineRevenueRub: totalRevenue,
		closedWonRevenueRub: closedWonRevenue,
		overallConversionPct,
		avgDealCheckRub,
		stagesCount,
	};
}

/** Расчет аналитики по каждому из 6 каналов трафика */
export function calculateChannelStats(leads: readonly LeadItem[]): TrafficChannelStats[] {
	return TRAFFIC_CHANNELS.map((ch) => {
		const channelLeads = leads.filter((l) => l.channelId === ch.id);
		const count = channelLeads.length;
		const totalRevenue = channelLeads.reduce((sum, l) => sum + l.potentialRevenueRub, 0);
		const arrivedCount = channelLeads.filter((l) => l.stageId === "showed_up").length;
		const activeCount = channelLeads.filter(
			(l) => l.stageId === "new" || l.stageId === "contacted" || l.stageId === "consult_booked",
		).length;
		const convPct = count > 0 ? Math.round((arrivedCount / count) * 100) : 0;

		return {
			channelId: ch.id,
			name: ch.name,
			leadCount: count,
			totalRevenueRub: totalRevenue,
			conversionToArrivedPct: convPct,
			activeLeadsCount: activeCount,
		};
	});
}

/** Форматирование суммы в рублях без копеек */
export function formatRubles(rub: number): string {
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 0,
	}).format(rub);
}

/** Валидация телефонного номера РФ для экспресс-создания лида */
export function normalizeRuPhone(input: string): string {
	const cleaned = input.replace(/\D/g, "");
	if (cleaned.length === 11 && (cleaned.startsWith("7") || cleaned.startsWith("8"))) {
		return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
	}
	return input.trim();
}
