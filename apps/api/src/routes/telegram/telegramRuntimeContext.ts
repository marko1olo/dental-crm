import type { FastifyRequest, FastifyReply } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { db } from "../../db/client.js";
import { denteTelegramBotConfigs } from "../../db/schema.js";
import { hydrateDomainStateFromDb } from "../../db/domainStateHydration.js";
import {
	upsertDenteTelegramChatLink,
} from "../../telegram/chatLinks.js";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
	unguardedBypassAllowed,
} from "../../accessGuard.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";
import { TelegramTokenVault } from "../../services/telegram/TelegramTokenVault.js";
import type {
	DenteTelegramBotSettings,
	DenteTelegramChatLink,
	DenteTelegramVisualCardUrls,
	DenteTelegramPostVisitCheckupDelayHoursByTopic,
} from "@dental/shared";
import type {
	DomainState,
	DenteTelegramOutboxRuntimeScope,
} from "../../services/telegram/telegramLegacyMemoryStore.js";
import {
	safeDenteTelegramPublicHttpsUrl,
	getDenteTelegramBotSettings,
	updateDenteTelegramBotSettings,
} from "../../services/telegram/telegramLegacyMemoryStore.js";
import type {
	UnknownRecord,
	TelegramClinicBotEnvConfig,
	TelegramRuntimeSettingsResolution,
	TelegramRuntimeContext,
	TelegramResolvedOutboxRuntime,
} from "./types.js";
import {
	isRecord,
	stringFromUnknown,
	firstTelegramQueryValue,
} from "./telegramUtils.js";

export const telegramSecretHeader = "x-telegram-bot-api-secret-token";
export const denteAdminSecretHeader = "x-dente-admin-secret";
export const telegramLinkCodeRateLimitWindowMs = 10 * 60_000;
export const telegramLinkCodeRejectedAttemptLimit = 5;

export function normalizedTelegramBotUsername(
	value: string | null | undefined,
): string | null {
	const selected = value?.trim() || null;
	const normalized = selected?.replace(/^@/, "") ?? null;
	return normalized &&
		/^[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/.test(normalized)
		? normalized
		: null;
}

export function trimmedEnv(name: string): string | null {
	return process.env[name]?.trim() || null;
}

export function stringFromEnvConfig(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function uuidFromEnvConfig(value: unknown): string | null {
	const candidate = stringFromEnvConfig(value);
	return candidate &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			candidate,
		)
		? candidate
		: null;
}

export function visualCardUrlsFromEnvConfig(
	record: UnknownRecord,
): Partial<DenteTelegramVisualCardUrls> | null {
	const source = isRecord(record.visualCardUrls) ? record.visualCardUrls : {};
	const urls: Partial<DenteTelegramVisualCardUrls> = {};
	const assign = (
		key: keyof DenteTelegramVisualCardUrls,
		value: string | null,
	): void => {
		if (value) urls[key] = value;
	};
	assign(
		"mainMenu",
		safeDenteTelegramPublicHttpsUrl(
			"visualCardUrls.mainMenu",
			stringFromEnvConfig(source.mainMenu) ??
				stringFromEnvConfig(record.mainMenuImageUrl),
		),
	);
	assign(
		"appointment",
		safeDenteTelegramPublicHttpsUrl(
			"visualCardUrls.appointment",
			stringFromEnvConfig(source.appointment) ??
				stringFromEnvConfig(record.appointmentImageUrl),
		),
	);
	assign(
		"documents",
		safeDenteTelegramPublicHttpsUrl(
			"visualCardUrls.documents",
			stringFromEnvConfig(source.documents) ??
				stringFromEnvConfig(record.documentsImageUrl),
		),
	);
	assign(
		"tax",
		safeDenteTelegramPublicHttpsUrl(
			"visualCardUrls.tax",
			stringFromEnvConfig(source.tax) ??
				stringFromEnvConfig(record.taxImageUrl),
		),
	);
	assign(
		"billing",
		safeDenteTelegramPublicHttpsUrl(
			"visualCardUrls.billing",
			stringFromEnvConfig(source.billing) ??
				stringFromEnvConfig(record.billingImageUrl),
		),
	);
	assign(
		"care",
		safeDenteTelegramPublicHttpsUrl(
			"visualCardUrls.care",
			stringFromEnvConfig(source.care) ??
				stringFromEnvConfig(record.careImageUrl),
		),
	);
	assign(
		"review",
		safeDenteTelegramPublicHttpsUrl(
			"visualCardUrls.review",
			stringFromEnvConfig(source.review) ??
				stringFromEnvConfig(record.reviewImageUrl),
		),
	);
	assign(
		"staff",
		safeDenteTelegramPublicHttpsUrl(
			"visualCardUrls.staff",
			stringFromEnvConfig(source.staff) ??
				stringFromEnvConfig(record.staffImageUrl),
		),
	);
	return Object.keys(urls).length ? urls : null;
}

export function postVisitCheckupDelayHoursFromEnvConfig(
	record: UnknownRecord,
): Partial<DenteTelegramPostVisitCheckupDelayHoursByTopic> | null {
	const source: UnknownRecord = isRecord(
		record.postVisitCheckupDelayHoursByTopic,
	)
		? record.postVisitCheckupDelayHoursByTopic
		: isRecord(record.postVisitCheckupDelayHours)
			? record.postVisitCheckupDelayHours
			: {};
	const delays: Partial<DenteTelegramPostVisitCheckupDelayHoursByTopic> = {};
	const assign = (
		key: keyof DenteTelegramPostVisitCheckupDelayHoursByTopic,
		value: unknown,
	): void => {
		const parsed =
			typeof value === "number"
				? value
				: typeof value === "string"
					? Number.parseInt(value, 10)
					: NaN;
		if (Number.isFinite(parsed))
			delays[key] = Math.max(1, Math.min(720, Math.floor(parsed)));
	};
	assign("extraction", source.extraction ?? record.extractionCheckupDelayHours);
	assign(
		"implantation",
		source.implantation ??
			record.implantationCheckupDelayHours ??
			record.implantCheckupDelayHours,
	);
	assign(
		"filling_restoration",
		source.filling_restoration ?? record.fillingCheckupDelayHours,
	);
	assign("endo", source.endo ?? record.endoCheckupDelayHours);
	assign("surgery", source.surgery ?? record.surgeryCheckupDelayHours);
	assign(
		"local_anesthesia",
		source.local_anesthesia ?? record.localAnesthesiaCheckupDelayHours,
	);
	assign("hygiene", source.hygiene ?? record.hygieneCheckupDelayHours);
	assign(
		"prosthetics",
		source.prosthetics ?? record.prostheticsCheckupDelayHours,
	);
	assign(
		"orthodontics",
		source.orthodontics ?? record.orthodonticsCheckupDelayHours,
	);
	assign(
		"periodontology",
		source.periodontology ?? record.periodontologyCheckupDelayHours,
	);
	assign("other", source.other ?? record.otherCheckupDelayHours);
	return Object.keys(delays).length ? delays : null;
}

export function reviewRequestDelayHoursFromEnvConfig(
	record: UnknownRecord,
): number | null {
	const parsed =
		typeof record.reviewRequestDelayHours === "number"
			? record.reviewRequestDelayHours
			: typeof record.reviewRequestDelayHours === "string"
				? Number.parseInt(record.reviewRequestDelayHours, 10)
				: NaN;
	return Number.isFinite(parsed)
		? Math.max(1, Math.min(720, Math.floor(parsed)))
		: null;
}

export function clinicBotEnvConfigs(): TelegramClinicBotEnvConfig[] {
	const raw = trimmedEnv("DENTE_TELEGRAM_CLINIC_BOTS_JSON");
	if (!raw) return [];
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (err) {
		console.error("[Dente] clinicBotEnvConfigs JSON parse failed:", err);
		return [];
	}

	const records: unknown[] = Array.isArray(parsed)
		? parsed
		: isRecord(parsed)
			? Object.entries(parsed).map(([key, value]) =>
					isRecord(value) ? { organizationId: key, ...value } : null,
				)
			: [];

	return records.filter(isRecord).map((record) => ({
		organizationId:
			uuidFromEnvConfig(record.organizationId) ??
			uuidFromEnvConfig(record.orgId),
		clinicId: uuidFromEnvConfig(record.clinicId),
		botConfigId:
			stringFromEnvConfig(record.botConfigId) ??
			stringFromEnvConfig(record.configId),
		botUsername: normalizedTelegramBotUsername(
			stringFromEnvConfig(record.botUsername) ??
				stringFromEnvConfig(record.username),
		),
		botToken:
			stringFromEnvConfig(record.botToken) ?? stringFromEnvConfig(record.token),
		webhookSecret:
			stringFromEnvConfig(record.webhookSecret) ??
			stringFromEnvConfig(record.secret),
		webhookBaseUrl: safeDenteTelegramPublicHttpsUrl(
			"webhookBaseUrl",
			stringFromEnvConfig(record.webhookBaseUrl),
		),
		patientPortalBaseUrl: safeDenteTelegramPublicHttpsUrl(
			"patientPortalBaseUrl",
			stringFromEnvConfig(record.patientPortalBaseUrl),
		),
		welcomeImageUrl: safeDenteTelegramPublicHttpsUrl(
			"welcomeImageUrl",
			stringFromEnvConfig(record.welcomeImageUrl),
		),
		visualCardUrls: visualCardUrlsFromEnvConfig(record),
		postVisitCheckupDelayHoursByTopic:
			postVisitCheckupDelayHoursFromEnvConfig(record),
		reviewRequestDelayHours: reviewRequestDelayHoursFromEnvConfig(record),
		clinicReviewUrl: safeDenteTelegramPublicHttpsUrl(
			"clinicReviewUrl",
			stringFromEnvConfig(record.clinicReviewUrl),
		),
		clinicMapsUrl: safeDenteTelegramPublicHttpsUrl(
			"clinicMapsUrl",
			stringFromEnvConfig(record.clinicMapsUrl),
		),
	}));
}

export function clinicBotEnvConfigForOrganization(
	organizationId: string,
	clinicId: string | null = null,
	botConfigId: string | null = null,
): TelegramClinicBotEnvConfig | null {
	const matchingConfigs = clinicBotEnvConfigs().filter((config) => {
		const tenantMatches =
			config.organizationId === organizationId ||
			config.clinicId === organizationId ||
			(clinicId !== null && config.clinicId === clinicId);
		return tenantMatches;
	});
	if (botConfigId) {
		return (
			matchingConfigs.find((config) => config.botConfigId === botConfigId) ??
			null
		);
	}
	return matchingConfigs.length === 1 ? (matchingConfigs[0] ?? null) : null;
}

export function clinicBotEnvConfigFor(
	settings: DenteTelegramBotSettings,
): TelegramClinicBotEnvConfig | null {
	return clinicBotEnvConfigForOrganization(settings.organizationId);
}

export function runtimeSettingsForRequestedOrganization(
	requestedOrganizationId: string | null | undefined,
	requestedBotConfigId: string | null | undefined = null,
): TelegramRuntimeSettingsResolution | null {
	const currentSettings = getDenteTelegramBotSettings();
	const envConfig = requestedOrganizationId
		? clinicBotEnvConfigForOrganization(
				requestedOrganizationId,
				null,
				requestedBotConfigId ?? null,
			)
		: null;
	if (envConfig?.organizationId) {
		return {
			settings: {
				...currentSettings,
				organizationId: envConfig.organizationId,
				mode: "clinic_owned_bot",
				ownBotUsername: envConfig.botUsername,
				webhookBaseUrl:
					envConfig.webhookBaseUrl ?? currentSettings.webhookBaseUrl,
				patientPortalBaseUrl:
					envConfig.patientPortalBaseUrl ??
					currentSettings.patientPortalBaseUrl,
				welcomeImageUrl:
					envConfig.welcomeImageUrl ?? currentSettings.welcomeImageUrl,
				visualCardUrls: {
					...currentSettings.visualCardUrls,
					...(envConfig.visualCardUrls ?? {}),
				},
				postVisitCheckupDelayHoursByTopic: {
					...currentSettings.postVisitCheckupDelayHoursByTopic,
					...(envConfig.postVisitCheckupDelayHoursByTopic ?? {}),
				},
				reviewRequestDelayHours:
					envConfig.reviewRequestDelayHours ??
					currentSettings.reviewRequestDelayHours,
				clinicReviewUrl:
					envConfig.clinicReviewUrl ?? currentSettings.clinicReviewUrl,
				clinicMapsUrl: envConfig.clinicMapsUrl ?? currentSettings.clinicMapsUrl,
			},
			clinicId: envConfig.clinicId ?? envConfig.organizationId,
			envConfig,
		};
	}

	if (
		!requestedBotConfigId &&
		(!requestedOrganizationId ||
			requestedOrganizationId === currentSettings.organizationId)
	) {
		return {
			settings: currentSettings,
			clinicId: currentSettings.organizationId,
			envConfig: clinicBotEnvConfigFor(currentSettings),
		};
	}

	return null;
}

export function configuredSharedBotUsername(
	settings: DenteTelegramBotSettings,
): string | null {
	return normalizedTelegramBotUsername(
		trimmedEnv("DENTE_TELEGRAM_BOT_USERNAME") || settings.botUsername || null,
	);
}

export function configuredClinicOwnedBotUsername(
	settings: DenteTelegramBotSettings,
): string | null {
	return normalizedTelegramBotUsername(
		clinicBotEnvConfigFor(settings)?.botUsername ||
			trimmedEnv("DENTE_TELEGRAM_OWN_BOT_USERNAME") ||
			trimmedEnv("DENTE_TELEGRAM_CLINIC_BOT_USERNAME") ||
			settings.ownBotUsername ||
			null,
	);
}

export function configuredBotUsername(
	settings: DenteTelegramBotSettings,
): string | null {
	return settings.mode === "clinic_owned_bot"
		? configuredClinicOwnedBotUsername(settings)
		: configuredSharedBotUsername(settings);
}

export function configuredSharedBotToken(): string | null {
	return (
		trimmedEnv("DENTE_TELEGRAM_BOT_TOKEN") || trimmedEnv("TELEGRAM_BOT_TOKEN")
	);
}

export function configuredClinicOwnedBotToken(
	settings: DenteTelegramBotSettings,
): string | null {
	return (
		clinicBotEnvConfigFor(settings)?.botToken ||
		trimmedEnv("DENTE_TELEGRAM_OWN_BOT_TOKEN") ||
		trimmedEnv("DENTE_TELEGRAM_CLINIC_BOT_TOKEN")
	);
}

export function configuredBotToken(settings: DenteTelegramBotSettings): string | null {
	return settings.mode === "clinic_owned_bot"
		? configuredClinicOwnedBotToken(settings)
		: configuredSharedBotToken();
}

export function configuredWebhookSecret(
	settings: DenteTelegramBotSettings,
): string | null {
	if (settings.mode === "clinic_owned_bot") {
		return (
			clinicBotEnvConfigFor(settings)?.webhookSecret ||
			trimmedEnv("DENTE_TELEGRAM_OWN_WEBHOOK_SECRET") ||
			trimmedEnv("DENTE_TELEGRAM_CLINIC_WEBHOOK_SECRET") ||
			trimmedEnv("DENTE_TELEGRAM_WEBHOOK_SECRET")
		);
	}
	return trimmedEnv("DENTE_TELEGRAM_WEBHOOK_SECRET");
}

export function telegramBotConfigId(
	settings: DenteTelegramBotSettings,
	botUsername: string | null,
): string {
	if (settings.mode === "clinic_owned_bot") {
		return `clinic_owned_bot:${settings.organizationId}:${(botUsername ?? "unconfigured").toLowerCase()}`;
	}
	if (settings.mode === "disabled")
		return `disabled:${settings.organizationId}`;
	return `shared_dente_bot:${settings.organizationId}`;
}

export function resolveTelegramRuntimeContext(
	requestedOrganizationId: string | null | undefined = null,
	requestedBotConfigId: string | null | undefined = null,
):
	| { ok: true; context: TelegramRuntimeContext }
	| { ok: false; statusCode: number; error: string; message: string } {
	const runtimeSettings = runtimeSettingsForRequestedOrganization(
		requestedOrganizationId,
		requestedBotConfigId,
	);
	if (!runtimeSettings) {
		return {
			ok: false,
			statusCode: 404,
			error: "TelegramTenantNotFound",
			message: "Telegram webhook относится к другой организации DENTE.",
		};
	}

	const { settings } = runtimeSettings;
	const botUsername =
		settings.mode === "clinic_owned_bot" &&
		runtimeSettings.envConfig?.botUsername
			? runtimeSettings.envConfig.botUsername
			: configuredBotUsername(settings);
	const botToken =
		settings.mode === "clinic_owned_bot" && runtimeSettings.envConfig?.botToken
			? runtimeSettings.envConfig.botToken
			: configuredBotToken(settings);
	const webhookSecret =
		settings.mode === "clinic_owned_bot" &&
		runtimeSettings.envConfig?.webhookSecret
			? runtimeSettings.envConfig.webhookSecret
			: configuredWebhookSecret(settings);
	const tokenConfigured = Boolean(botToken);
	const webhookSecretConfigured = Boolean(webhookSecret);
	const clinicOwnedBotReady =
		settings.mode === "clinic_owned_bot" && Boolean(botUsername && botToken);

	return {
		ok: true,
		context: {
			settings,
			organizationId: settings.organizationId,
			clinicId: runtimeSettings.clinicId,
			botConfigId:
				runtimeSettings.envConfig?.botConfigId ??
				telegramBotConfigId(settings, botUsername),
			botUsername,
			botToken,
			webhookSecret,
			tokenConfigured,
			webhookSecretConfigured,
			webhookReady:
				settings.mode !== "disabled" &&
				tokenConfigured &&
				webhookSecretConfigured,
			clinicOwnedBotReady,
		},
	};
}

export function denteTelegramOutboxRuntimeScope(
	runtime: TelegramRuntimeContext,
): DenteTelegramOutboxRuntimeScope {
	return {
		settings: runtime.settings,
		botTokenConfigured: runtime.tokenConfigured,
		botConfigId: runtime.botConfigId,
		clinicId: runtime.clinicId,
	};
}

type TelegramResolvedOutboxRuntime = {
	context: TelegramRuntimeContext;
	runtimeScope: DenteTelegramOutboxRuntimeScope;
};

export function denteTelegramResolvedOutboxRuntime(
	runtime: TelegramRuntimeContext,
): TelegramResolvedOutboxRuntime {
	return {
		context: runtime,
		runtimeScope: denteTelegramOutboxRuntimeScope(runtime),
	};
}

export function resolveTelegramOutboxRuntimeScopeFromQuery(
	query: unknown,
):
	| { ok: true; runtime: TelegramResolvedOutboxRuntime }
	| { ok: false; statusCode: number; error: string; message: string } {
	const scope = parseTelegramOutboxRuntimeScopeQuery(query);
	const runtimeResult = resolveTelegramRuntimeContext(
		scope.organizationId,
		scope.botConfigId,
	);
	if (!runtimeResult.ok) return runtimeResult;
	return {
		ok: true,
		runtime: denteTelegramResolvedOutboxRuntime(runtimeResult.context),
	};
}

/**
 * Загружает срез клиники из базы (или возвращает in-memory при in-memory режиме)
 * и передает его в построители очереди отправок Telegram.
 */
export async function hydrateTelegramDomainState(
	_request: FastifyRequest,
	organizationId: string,
): Promise<DomainState> {
	try {
		const { state } = await hydrateDomainStateFromDb(organizationId);
		return state;
	} catch (err) {
		if (
			isDbConnectionError(err) &&
			(process.env.NODE_ENV === "test" || !process.env.DATABASE_URL)
		) {
			return inMemoryDomainState;
		}
		throw err;
	}
}

/**
 * Переносит только что созданную связку чата в таблицу `dente_telegram_chat_links`.
 *
 * ЗАЧЕМ ЭТО ВООБЩЕ НУЖНО. Привязка приходит из синхронной реализации, которая
 * держит связки в массиве процесса. Читают же связку из ТАБЛИЦЫ два живых
 * отправителя: `services/notificationWorker.ts` (кому отправлять) и
 * `services/communications/channelRouter.ts` (адрес чата `chatTransportRef`, без
 * которого сообщение не уходит). Без этой записи пациент нажимал `/start` с
 * кодом, получал «привязано» — и оставался невидимым для обоих, а после
 * перезапуска без файла состояния привязка исчезала совсем.
 *
 * Сбой записи НЕ роняет веб-хук: Telegram на 5xx повторяет доставку и в итоге
 * отключает адрес, а код привязки к этому моменту уже использован — повтор всё
 * равно ничего не исправит. Поэтому ошибка попадает в журнал с уровнем error,
 * а не наружу.
 */
export async function persistTelegramChatLinkToDatabase(
	request: FastifyRequest,
	runtime: TelegramRuntimeContext,
	chatLink: DenteTelegramChatLink,
): Promise<void> {
	try {
		await upsertDenteTelegramChatLink({
			organizationId: runtime.organizationId,
			clinicId: chatLink.clinicId ?? runtime.clinicId,
			botConfigId: runtime.botConfigId,
			subjectType: chatLink.subjectType,
			subjectId: chatLink.subjectId,
			chatFingerprint: chatLink.chatFingerprint,
			chatTransportRef: chatLink.chatTransportRef ?? null,
			chatIdLast4: chatLink.chatIdLast4 ?? null,
		});
	} catch (error) {
		request.log.error(
			{
				err: error,
				organizationId: runtime.organizationId,
				subjectType: chatLink.subjectType,
			},
			"[Telegram] Связка чата не записана в базу: напоминания этому пациенту не уйдут",
		);
	}
}

export function configuredTelegramAdminSecret(): string | null {
	return process.env.DENTE_TELEGRAM_ADMIN_SECRET?.trim() || null;
}

/**
 * Послабление для разработки на всей панели управления Telegram — 14 маршрутов,
 * подключённых через `preHandler: requireTelegramControlPlaneAccess`
 * (пересчитано 2026-08-06; цифра гниёт — пересчитывай, прежде чем ссылаться):
 * работает ТОЛЬКО при явно названном режиме разработки и ТОЛЬКО при явно
 * выставленном флаге.
 *
 * ПОЧЕМУ ЗДЕСЬ ОБЩИЙ ПРЕДИКАТ, А НЕ ПРЕЖНЕЕ `NODE_ENV !== "production"`.
 * Прежнее условие истинно, когда NODE_ENV НЕ ЗАДАН ВОВСЕ, а незаданный NODE_ENV —
 * типовое состояние настоящего сервера: `apps/api/package.json` объявляет
 * `"start": "node dist/server.js"` и режим не задаёт. Значит у заказчика,
 * поднявшего сервер этой командой, «мы не в production» было ИСТИНОЙ, и от
 * чтения списка привязанных чатов пациентов, отзыва привязок, правки токена бота
 * и ручной отправки сообщений без секрета администратора защищало только то, что
 * второй флаг где-то не выставлен. Замерено на этом дереве до правки: пустой
 * NODE_ENV + DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE=1 →
 * GET /api/telegram/feature-plan отвечал 200 вместо 503.
 *
 * `accessGuard.ts` разбирает эту инверсию подробно и НАЗЫВАЕТ ЭТОТ ФАЙЛ как одну
 * из четырёх копий, которую должен переписать владелец. Пятой копии условия
 * безопасности здесь не будет: одно условие в одном месте — единственный способ
 * не оставить следующую инверсию незамеченной.
 *
 * Смысл послабления не изменился: `development`/`test` плюс
 * `DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE=1`. Закрылся ровно один случай —
 * пустой или незнакомый NODE_ENV («staging», «prod», опечатка) больше не
 * считается разработкой.
 *
 * ВЕРНУТЬ «КАК БЫЛО» — значит снова открыть переписку клиники с пациентами на
 * боевом сервере. Если нужно работать без секрета локально, задайте
 * NODE_ENV=development, а не возвращайте отрицание.
 */
export function isExplicitlyUnguardedControlPlaneAllowed(): boolean {
	return unguardedBypassAllowed("DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE");
}

export async function requireTelegramControlPlaneAccess(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const adminSecret = configuredTelegramAdminSecret();
	if (!adminSecret) {
		if (isExplicitlyUnguardedControlPlaneAllowed()) {
			return;
		}
		return reply.code(503).send({
			error: "TelegramAdminSecretMissing",
			message:
				"На сервере не задан секрет администратора для управления Telegram. Для локального стенда можно явно включить режим без проверки в серверных настройках.",
		});
	}
	const providedSecret = request.headers[denteAdminSecretHeader];
	const normalizedProvidedSecret = Array.isArray(providedSecret)
		? providedSecret[0]
		: providedSecret;
	if (
		!timingSafeSecretEqual(
			typeof normalizedProvidedSecret === "string"
				? normalizedProvidedSecret
				: null,
			adminSecret,
		)
	) {
		return reply.code(403).send({
			error: "TelegramAdminSecretRequired",
			message:
				"Для управления Telegram нужен действующий секрет администратора клиники.",
		});
	}
}

export function configuredSendTimeoutMs(): number {
	const raw = process.env.DENTE_TELEGRAM_SEND_TIMEOUT_MS?.trim();
	if (!raw) return 12_000;
	const parsed = Number(raw);
	return Number.isFinite(parsed)
		? Math.max(1000, Math.min(60_000, parsed))
		: 12_000;
}