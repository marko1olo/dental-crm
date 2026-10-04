/**
 * TelegramBotBillingService.ts — B2B SaaS-тарифы, учет расхода сообщений, квоты и CITO-приоритет для клиник DENTE.
 *
 * МАНДАТЫ БИЛЛИНГА:
 * 1. 3 Тарифных плана: Free (0 ₽/мес), Pro Clinic (990 ₽/мес), Enterprise Network (2 490 ₽/мес).
 * 2. Учет отправленных сообщений за расчетный месяц (monthlyUsageCount, quotaLimit).
 * 3. Автоматическое предупреждение администратора при достижении 80% и 100% лимита сообщений.
 * 4. ЖИЗНЕННЫЙ МЕДИЦИНСКИЙ ПРИОРИТЕТ: Экстренные оповещения об осложнениях и острой боли CITO
 *    пропускаются ВСЕГДА, даже при 100% исчерпании квоты тарифа Free!
 */

export type TelegramBotSaasTierId = "free" | "pro" | "enterprise";

export interface TelegramBotTierFeature {
	key: string;
	title: string;
	included: boolean;
	description?: string;
}

export interface TelegramBotSaasTier {
	id: TelegramBotSaasTierId;
	name: string;
	nameRu: string;
	priceRubMonth: number;
	maxBotsPerClinic: number;
	monthlyMessageQuota: number | null; // null = безлимит
	isUnlimited: boolean;
	badgeText?: string;
	description: string;
	features: TelegramBotTierFeature[];
}

/**
 * Каталог официальных SaaS-тарифов сервиса Telegram-ботов для клиник DENTE.
 */
export const TELEGRAM_BOT_SAAS_TIERS: Record<TelegramBotSaasTierId, TelegramBotSaasTier> = {
	free: {
		id: "free",
		name: "Free",
		nameRu: "Базовый (Free)",
		priceRubMonth: 0,
		maxBotsPerClinic: 1,
		monthlyMessageQuota: 300,
		isUnlimited: false,
		badgeText: "Старт без бюджета",
		description: "1 бот на клинику, 300 сообщений/мес, базовые шаблоны визита, 5 пресетов.",
		features: [
			{ key: "bots_count", title: "1 Telegram-бот на клинику", included: true },
			{ key: "message_quota", title: "300 сообщений в месяц", included: true },
			{ key: "visit_templates", title: "Базовые шаблоны визита и напоминания", included: true },
			{ key: "presets_5", title: "5 клинических пресетов", included: true },
			{ key: "patient_linking", title: "Привязка карты пациента по коду/QR", included: true },
			{ key: "cito_emergency_unlimited", title: "Экстренный CITO-триаж (всегда без ограничений)", included: true, description: "Жизненный приоритет пациента" },
			{ key: "staff_bot", title: "Бот для персонала и интерком-вызовы", included: false },
			{ key: "webapp_miniapp", title: "Telegram WebApp Mini-App", included: false },
			{ key: "photo_intake", title: "Прием и распознавание фото жалоб", included: false },
			{ key: "whisper_voice", title: "Голосовой прием Whisper", included: false },
			{ key: "telemonitoring", title: "Авто-телемониторинг осложнений", included: false },
		],
	},
	pro: {
		id: "pro",
		name: "Pro Clinic",
		nameRu: "Оптимальный (Pro Clinic)",
		priceRubMonth: 990,
		maxBotsPerClinic: 2,
		monthlyMessageQuota: null,
		isUnlimited: true,
		badgeText: "Выбор 85% клиник",
		description: "2 бота (пациентский + персонал), безлимитные сообщения, WebApp Mini-App, триаж острой боли CITO, прием фото, калькулятор стоимости.",
		features: [
			{ key: "bots_count", title: "2 бота (пациентский + персонал)", included: true },
			{ key: "message_quota", title: "Безлимитные сообщения", included: true },
			{ key: "visit_templates", title: "Все шаблоны визитов, смет и документов", included: true },
			{ key: "all_presets", title: "Полная библиотека клинических пресетов", included: true },
			{ key: "patient_linking", title: "Привязка пациентов + семейный кабинет", included: true },
			{ key: "staff_bot", title: "Бот персонала с 1-tap Intercom подтверждением", included: true },
			{ key: "webapp_miniapp", title: "Интерактивный WebApp Mini-App в Telegram", included: true },
			{ key: "cito_triage", title: "Интерактивный триаж острой боли CITO", included: true },
			{ key: "photo_intake", title: "Прием фото зубов и интеграция в ЭМК", included: true },
			{ key: "cost_calculator", title: "Калькулятор стоимости процедур в боте", included: true },
			{ key: "whisper_voice", title: "Голосовой прием Whisper", included: false },
			{ key: "telemonitoring", title: "Авто-телемониторинг осложнений", included: false },
		],
	},
	enterprise: {
		id: "enterprise",
		name: "Enterprise Network",
		nameRu: "Сеть клиник (Enterprise Network)",
		priceRubMonth: 2490,
		maxBotsPerClinic: 10,
		monthlyMessageQuota: null,
		isUnlimited: true,
		badgeText: "Максимальная мощность",
		description: "До 10 ботов, мульти-филиальность, голосовой прием (Whisper), авто-телемониторинг после операций с детектором осложнений и приоритетным SLA.",
		features: [
			{ key: "bots_count", title: "До 10 ботов для филиалов и отделений", included: true },
			{ key: "message_quota", title: "Безлимитные сообщения", included: true },
			{ key: "multi_branch", title: "Мульти-филиальная маршрутизация", included: true },
			{ key: "whisper_voice", title: "Голосовой прием аудио-жалоб (Whisper AI)", included: true },
			{ key: "telemonitoring", title: "Авто-телемониторинг осложнений после операций", included: true },
			{ key: "priority_sla", title: "Приоритетный SLA и персональный менеджер 24/7", included: true },
			{ key: "custom_branding", title: "Кастомный брендинг и фирменный стиль", included: true },
			{ key: "webapp_miniapp", title: "Полный WebApp Mini-App с расписанием филиалов", included: true },
			{ key: "photo_intake", title: "Прием фото с автоматическим сопоставлением с зубом", included: true },
			{ key: "cost_calculator", title: "Мульти-прайсовый калькулятор со скидками клиники", included: true },
		],
	},
};

export type WarningTriggerStatus = "ok" | "warning_80" | "exceeded_100";

export interface OrganizationBillingRecord {
	organizationId: string;
	planId: TelegramBotSaasTierId;
	planActivatedAt: string;
	currentPeriodKey: string; // YYYY-MM
	monthlyUsageCount: number;
	emergencyCitoCount: number;
	lastWarningTriggered: WarningTriggerStatus | null;
	lastWarningTimestamp?: string | null;
	updatedAt: string;
}

export interface BillingUsageSummary {
	organizationId: string;
	tier: TelegramBotSaasTierId;
	plan: TelegramBotSaasTier;
	periodKey: string;
	periodStart: string;
	periodEnd: string;
	monthlyUsageCount: number;
	emergencyCitoCount: number;
	quotaLimit: number | null; // null = unlimited
	remainingMessages: number | null;
	usagePercent: number; // 0..100+
	warningStatus: WarningTriggerStatus;
	warningMessage: string | null;
	activeBotsCount: number;
	maxBotsAllowed: number;
	citoPriorityBypassActive: boolean;
}

export interface QuotaAuthorizationResult {
	allowed: boolean;
	reason:
		| "WITHIN_QUOTA"
		| "UNLIMITED_PLAN"
		| "CITO_PRIORITY_BYPASS"
		| "QUOTA_EXCEEDED"
		| "BOTS_LIMIT_EXCEEDED";
	message?: string;
	isEmergency?: boolean;
	remainingMessages?: number | null;
	quotaLimit?: number | null;
	currentUsage?: number;
}

export interface RecordMessageSentResult {
	success: boolean;
	newUsageCount: number;
	quotaLimit: number | null;
	isEmergency: boolean;
	warningTriggered: WarningTriggerStatus | null;
	warningMessage: string | null;
}

/**
 * Сервис управления B2B-тарифами, расходом сообщений и безопасными квотами для Telegram-ботов.
 */
export class TelegramBotBillingService {
	private static billingStore = new Map<string, OrganizationBillingRecord>();

	/**
	 * Получение текущего ключа расчетного периода (год-месяц).
	 */
	static getCurrentPeriodKey(date = new Date()): string {
		const year = date.getUTCFullYear();
		const month = String(date.getUTCMonth() + 1).padStart(2, "0");
		return `${year}-${month}`;
	}

	/**
	 * Вычисление границ текущего расчетного периода (ISO строки).
	 */
	static getPeriodBoundaries(periodKey = this.getCurrentPeriodKey()): {
		startIso: string;
		endIso: string;
	} {
		const [yearStr, monthStr] = periodKey.split("-");
		const year = Number.parseInt(yearStr ?? "2026", 10);
		const month = Number.parseInt(monthStr ?? "10", 10) - 1;

		const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
		const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

		return {
			startIso: start.toISOString(),
			endIso: end.toISOString(),
		};
	}

	/**
	 * Получение или инициализация биллинговой записи клиники.
	 */
	static getOrInitBillingRecord(organizationId: string): OrganizationBillingRecord {
		const trimmedOrgId = organizationId.trim();
		const currentPeriod = this.getCurrentPeriodKey();

		let record = this.billingStore.get(trimmedOrgId);
		if (!record) {
			record = {
				organizationId: trimmedOrgId,
				planId: "free",
				planActivatedAt: new Date().toISOString(),
				currentPeriodKey: currentPeriod,
				monthlyUsageCount: 0,
				emergencyCitoCount: 0,
				lastWarningTriggered: null,
				updatedAt: new Date().toISOString(),
			};
			this.billingStore.set(trimmedOrgId, record);
			return record;
		}

		// Автоматический сброс счетчика при наступлении нового расчетного месяца
		if (record.currentPeriodKey !== currentPeriod) {
			record.currentPeriodKey = currentPeriod;
			record.monthlyUsageCount = 0;
			record.emergencyCitoCount = 0;
			record.lastWarningTriggered = null;
			record.lastWarningTimestamp = null;
			record.updatedAt = new Date().toISOString();
		}

		return record;
	}

	/**
	 * Получение полной статистики использования тарифа и квот для клиники.
	 */
	static getBillingUsage(
		organizationId: string,
		activeBotsCount = 1,
	): BillingUsageSummary {
		const record = this.getOrInitBillingRecord(organizationId);
		const plan = TELEGRAM_BOT_SAAS_TIERS[record.planId] ?? TELEGRAM_BOT_SAAS_TIERS.free;
		const { startIso, endIso } = this.getPeriodBoundaries(record.currentPeriodKey);

		const quota = plan.monthlyMessageQuota;
		const usage = record.monthlyUsageCount;

		let usagePercent = 0;
		let remaining: number | null = null;
		let warningStatus: WarningTriggerStatus = "ok";
		let warningMessage: string | null = null;

		if (quota !== null) {
			usagePercent = Math.min(100, Math.round((usage / quota) * 100));
			remaining = Math.max(0, quota - usage);

			if (usage >= quota) {
				warningStatus = "exceeded_100";
				warningMessage = `Квота сообщений тарифа ${plan.nameRu} исчерпана (${usage}/${quota}). Обычные рассылки приостановлены. Экстренные CITO оповещения работают без ограничений.`;
			} else if (usage >= quota * 0.8) {
				warningStatus = "warning_80";
				warningMessage = `Использовано ${usagePercent}% лимита сообщений (${usage}/${quota}). Рекомендуется переход на тариф Pro Clinic.`;
			}
		}

		return {
			organizationId: record.organizationId,
			tier: record.planId,
			plan,
			periodKey: record.currentPeriodKey,
			periodStart: startIso,
			periodEnd: endIso,
			monthlyUsageCount: usage,
			emergencyCitoCount: record.emergencyCitoCount,
			quotaLimit: quota,
			remainingMessages: remaining,
			usagePercent,
			warningStatus,
			warningMessage,
			activeBotsCount,
			maxBotsAllowed: plan.maxBotsPerClinic,
			citoPriorityBypassActive: quota !== null && usage >= quota,
		};
	}

	/**
	 * Авторизация отправки сообщения с проверкой квоты и ЖИЗНЕННЫМ ПРИОРИТЕТОМ CITO.
	 *
	 * ПРАВИЛО CITO:
	 * Экстренные оповещения об осложнениях и острой боли пропускаются ВСЕГДА,
	 * независимо от превышения лимитов бесплатного тарифа!
	 */
	static checkQuotaAndAuthorizeSend(params: {
		organizationId: string;
		isCitoEmergency?: boolean;
	}): QuotaAuthorizationResult {
		const record = this.getOrInitBillingRecord(params.organizationId);
		const plan = TELEGRAM_BOT_SAAS_TIERS[record.planId] ?? TELEGRAM_BOT_SAAS_TIERS.free;

		// 1. ЖИЗНЕННЫЙ МЕДИЦИНСКИЙ ПРИОРИТЕТ CITO
		if (params.isCitoEmergency) {
			return {
				allowed: true,
				reason: "CITO_PRIORITY_BYPASS",
				isEmergency: true,
				quotaLimit: plan.monthlyMessageQuota,
				currentUsage: record.monthlyUsageCount,
			};
		}

		// 2. Безлимитные тарифы (Pro Clinic, Enterprise Network)
		if (plan.isUnlimited || plan.monthlyMessageQuota === null) {
			return {
				allowed: true,
				reason: "UNLIMITED_PLAN",
				quotaLimit: null,
				currentUsage: record.monthlyUsageCount,
			};
		}

		// 3. Тариф с лимитом (Free)
		const quota = plan.monthlyMessageQuota;
		if (record.monthlyUsageCount >= quota) {
			return {
				allowed: false,
				reason: "QUOTA_EXCEEDED",
				message: `Лимит сообщений тарифа ${plan.nameRu} исчерпан (${record.monthlyUsageCount}/${quota} сообщений в текущем месяце). Для снятия лимита перейдите на тариф Pro Clinic (990 ₽/мес). Экстренные CITO оповещения об осложнениях продолжают доставляться.`,
				quotaLimit: quota,
				currentUsage: record.monthlyUsageCount,
				remainingMessages: 0,
			};
		}

		return {
			allowed: true,
			reason: "WITHIN_QUOTA",
			quotaLimit: quota,
			currentUsage: record.monthlyUsageCount,
			remainingMessages: quota - record.monthlyUsageCount,
		};
	}

	/**
	 * Учет отправленного сообщения и срабатывание пороговых предупреждений (80% и 100%).
	 */
	static recordMessageSent(params: {
		organizationId: string;
		isCitoEmergency?: boolean;
		messageKind?: string;
	}): RecordMessageSentResult {
		const record = this.getOrInitBillingRecord(params.organizationId);
		const plan = TELEGRAM_BOT_SAAS_TIERS[record.planId] ?? TELEGRAM_BOT_SAAS_TIERS.free;

		record.monthlyUsageCount += 1;
		if (params.isCitoEmergency) {
			record.emergencyCitoCount += 1;
		}
		record.updatedAt = new Date().toISOString();

		let warningTriggered: WarningTriggerStatus | null = null;
		let warningMessage: string | null = null;

		const quota = plan.monthlyMessageQuota;
		if (quota !== null) {
			if (record.monthlyUsageCount >= quota) {
				if (record.lastWarningTriggered !== "exceeded_100") {
					warningTriggered = "exceeded_100";
					warningMessage = `[DENTE SAAS АЛЕРТ] Квота сообщений тарифа ${plan.nameRu} для клиники полностью исчерпана (${record.monthlyUsageCount}/${quota}). Отправка регулярных напоминаний приостановлена. Экстренные CITO оповещения работают без ограничений.`;
					record.lastWarningTriggered = "exceeded_100";
					record.lastWarningTimestamp = new Date().toISOString();
				}
			} else if (record.monthlyUsageCount >= Math.floor(quota * 0.8)) {
				if (
					record.lastWarningTriggered !== "warning_80" &&
					record.lastWarningTriggered !== "exceeded_100"
				) {
					warningTriggered = "warning_80";
					warningMessage = `[DENTE SAAS ПРЕДУПРЕЖДЕНИЕ] Использовано 80% лимита сообщений тарифа ${plan.nameRu} (${record.monthlyUsageCount}/${quota}). Рекомендуется подключение тарифа Pro Clinic.`;
					record.lastWarningTriggered = "warning_80";
					record.lastWarningTimestamp = new Date().toISOString();
				}
			}
		}

		return {
			success: true,
			newUsageCount: record.monthlyUsageCount,
			quotaLimit: quota,
			isEmergency: Boolean(params.isCitoEmergency),
			warningTriggered,
			warningMessage,
		};
	}

	/**
	 * Смена тарифного плана клиники.
	 */
	static changePlan(params: {
		organizationId: string;
		newPlanId: TelegramBotSaasTierId;
	}): BillingUsageSummary {
		const targetPlan = TELEGRAM_BOT_SAAS_TIERS[params.newPlanId];
		if (!targetPlan) {
			throw new Error(`Недопустимый тарифный план: ${params.newPlanId}. Доступны: free, pro, enterprise.`);
		}

		const record = this.getOrInitBillingRecord(params.organizationId);
		record.planId = params.newPlanId;
		record.planActivatedAt = new Date().toISOString();
		record.updatedAt = new Date().toISOString();

		// Если перешли на безлимитный план, сбрасываем состояние тревог
		if (targetPlan.isUnlimited) {
			record.lastWarningTriggered = null;
		}

		return this.getBillingUsage(params.organizationId);
	}

	/**
	 * Сброс состояния для тестов или ручного обнуления квот.
	 */
	static resetUsageForTesting(organizationId?: string): void {
		if (organizationId) {
			this.billingStore.delete(organizationId.trim());
		} else {
			this.billingStore.clear();
		}
	}

	/**
	 * Проверка допустимости добавления дополнительного бота в клинику по текущему тарифу.
	 */
	static canAddBot(
		organizationId: string,
		currentActiveBotsCount: number,
	): { allowed: boolean; maxAllowed: number; currentCount: number; message?: string } {
		const record = this.getOrInitBillingRecord(organizationId);
		const plan = TELEGRAM_BOT_SAAS_TIERS[record.planId] ?? TELEGRAM_BOT_SAAS_TIERS.free;

		if (currentActiveBotsCount >= plan.maxBotsPerClinic) {
			return {
				allowed: false,
				maxAllowed: plan.maxBotsPerClinic,
				currentCount: currentActiveBotsCount,
				message: `Превышен лимит ботов для тарифа ${plan.nameRu} (максимум ${plan.maxBotsPerClinic} бот(а/ов)). Перейдите на тариф Pro Clinic (до 2 ботов) или Enterprise Network (до 10 ботов).`,
			};
		}

		return {
			allowed: true,
			maxAllowed: plan.maxBotsPerClinic,
			currentCount: currentActiveBotsCount,
		};
	}
}
