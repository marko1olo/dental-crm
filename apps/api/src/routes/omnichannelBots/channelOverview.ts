import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	denteMaxBotConfigs,
	denteTelegramAccountConfigs,
	denteTelegramBotConfigs,
	denteVkBotConfigs,
	denteVkUserAccounts,
	denteWhatsappBotConfigs,
} from "../../db/schema.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import { OmnichannelTokenVault } from "../../services/bots/OmnichannelTokenVault.js";
import { testConnectionSchema } from "./schemas.js";

const logger = createApiLogger("messengersOverview");
const PROBE_TIMEOUT_MS = 8000;

type ProbeTarget =
	| { kind: "unconfigured"; label: string; reason: string }
	| { kind: "error"; label: string; reason: string }
	| { kind: "telegram_bot"; label: string; token: string }
	| { kind: "vk_group"; label: string; token: string; groupId: string }
	| { kind: "vk_account"; label: string; token: string; vkUserId?: string | null }
	| { kind: "wa_green_api"; label: string; instanceId: string; token: string }
	| { kind: "wa_waba"; label: string; phoneNumberId: string; token: string }
	| { kind: "max_bot"; label: string; token: string };

function safeResolveToken(
	raw: string | null | undefined,
	orgId: string,
	channelLabel: string,
): { ok: true; token: string | null } | { ok: false; reason: string } {
	if (!raw || !raw.trim()) {
		return { ok: true, token: null };
	}
	try {
		return { ok: true, token: OmnichannelTokenVault.resolveToken(raw, orgId) };
	} catch (err) {
		logger.warn({ err: safeLogError(err), orgId, channelLabel }, "Token decryption failed during connection test");
		return {
			ok: false,
			reason: `Не удалось расшифровать токен канала ${channelLabel}. Пересохраните токен в настройках.`,
		};
	}
}

async function resolveProbeTarget(orgId: string, channelId: string): Promise<ProbeTarget> {
	return withTenantCtx(orgId, async (tx): Promise<ProbeTarget> => {
		if (channelId === "tg_bot" || channelId === "telegram") {
			const label = "Telegram";
			const rows = await tx
				.select()
				.from(denteTelegramBotConfigs)
				.where(eq(denteTelegramBotConfigs.organizationId, orgId));
			const cfg = rows.find((c) => c.botConfigId !== "tg_account" && c.botConfigId !== "account") ?? rows[0];
			if (!cfg || cfg.mode === "disabled" || !cfg.tokenSecretRef) {
				return {
					kind: "unconfigured",
					label,
					reason: "Канал Telegram еще не настроен. Нажмите «Настроить», чтобы ввести токен бота.",
				};
			}
			const resolved = safeResolveToken(cfg.tokenSecretRef, orgId, label);
			if (!resolved.ok) return { kind: "error", label, reason: resolved.reason };
			if (!resolved.token) {
				return { kind: "unconfigured", label, reason: "Токен Telegram-бота не задан." };
			}
			return { kind: "telegram_bot", label, token: resolved.token };
		}

		if (channelId === "tg_account") {
			const label = "Telegram Аккаунт";
			const [acc] = await tx
				.select()
				.from(denteTelegramAccountConfigs)
				.where(eq(denteTelegramAccountConfigs.organizationId, orgId))
				.limit(1);
			if (!acc || !acc.isActive || !acc.sessionStringEncrypted) {
				return {
					kind: "unconfigured",
					label,
					reason: "Личный аккаунт Telegram не подключен. Для MTProto-подключения требуются TELEGRAM_API_ID и TELEGRAM_API_HASH.",
				};
			}
			if (!process.env.TELEGRAM_API_ID?.trim() || !process.env.TELEGRAM_API_HASH?.trim()) {
				return {
					kind: "error",
					label,
					reason: "MTProto-шлюз не настроен на сервере (отсутствуют TELEGRAM_API_ID / TELEGRAM_API_HASH).",
				};
			}
			return {
				kind: "error",
				label,
				reason: "Живая проверка MTProto-сессии недоступна без активного MTProto-клиента.",
			};
		}

		if (channelId === "vk_group" || channelId === "vk") {
			const label = "ВКонтакте";
			const rows = await tx
				.select()
				.from(denteVkBotConfigs)
				.where(eq(denteVkBotConfigs.organizationId, orgId));
			const cfg = rows.find((c) => c.botConfigId !== "vk_account" && c.botConfigId !== "account") ?? rows[0];
			if (!cfg || (!cfg.groupToken && !cfg.tokenSecretRef) || !cfg.groupId) {
				return {
					kind: "unconfigured",
					label,
					reason: "Канал ВКонтакте еще не настроен. Нажмите «Настроить», чтобы указать ID группы и токен.",
				};
			}
			const resolved = safeResolveToken(cfg.tokenSecretRef || cfg.groupToken, orgId, label);
			if (!resolved.ok) return { kind: "error", label, reason: resolved.reason };
			if (!resolved.token) {
				return { kind: "unconfigured", label, reason: "Токен сообщества ВКонтакте не задан." };
			}
			return { kind: "vk_group", label, token: resolved.token, groupId: cfg.groupId };
		}

		if (channelId === "vk_account") {
			const label = "VK Аккаунт";
			const [acc] = await tx
				.select()
				.from(denteVkUserAccounts)
				.where(eq(denteVkUserAccounts.organizationId, orgId))
				.limit(1);
			if (!acc || !acc.isActive || (!acc.accessToken && !acc.tokenSecretRef)) {
				return {
					kind: "unconfigured",
					label,
					reason: "Канал VK Аккаунт еще не настроен. Нажмите «Настроить», чтобы ввести токен или отсканировать QR.",
				};
			}
			const resolved = safeResolveToken(acc.tokenSecretRef || acc.accessToken, orgId, label);
			if (!resolved.ok) return { kind: "error", label, reason: resolved.reason };
			if (!resolved.token) {
				return { kind: "unconfigured", label, reason: "Токен личного аккаунта ВКонтакте не задан." };
			}
			return { kind: "vk_account", label, token: resolved.token, vkUserId: acc.vkUserId };
		}

		if (channelId === "wa_phone" || channelId === "wa_waba" || channelId === "whatsapp") {
			const label = "WhatsApp";
			const rows = await tx
				.select()
				.from(denteWhatsappBotConfigs)
				.where(eq(denteWhatsappBotConfigs.organizationId, orgId));
			const waPhone = rows.find((c) => c.provider === "green_api" || Boolean(c.greenApiInstanceId));
			const waWaba =
				rows.find((c) => c.provider === "cloud_api" || (!c.greenApiInstanceId && Boolean(c.phoneNumberId))) ??
				rows[0];
			const cfg = channelId === "wa_phone" ? waPhone : channelId === "wa_waba" ? waWaba : (waWaba ?? waPhone);
			if (!cfg) {
				return {
					kind: "unconfigured",
					label,
					reason: "Канал WhatsApp еще не настроен. Нажмите «Настроить», чтобы ввести параметры подключения.",
				};
			}
			if (channelId === "wa_phone" || cfg.provider === "green_api") {
				const resolved = safeResolveToken(cfg.greenApiToken || cfg.tokenSecretRef, orgId, label);
				if (!resolved.ok) return { kind: "error", label, reason: resolved.reason };
				if (!cfg.greenApiInstanceId || !resolved.token) {
					return {
						kind: "unconfigured",
						label,
						reason: "Канал WhatsApp (Green-API) еще не настроен.",
					};
				}
				return {
					kind: "wa_green_api",
					label,
					instanceId: cfg.greenApiInstanceId,
					token: resolved.token,
				};
			}
			const resolved = safeResolveToken(cfg.accessToken || cfg.tokenSecretRef, orgId, label);
			if (!resolved.ok) return { kind: "error", label, reason: resolved.reason };
			if (!cfg.phoneNumberId || !resolved.token) {
				return {
					kind: "unconfigured",
					label,
					reason: "Канал WhatsApp WABA еще не настроен.",
				};
			}
			return {
				kind: "wa_waba",
				label,
				phoneNumberId: cfg.phoneNumberId,
				token: resolved.token,
			};
		}

		if (channelId === "max_bot" || channelId === "max") {
			const label = "MAX";
			const [cfg] = await tx
				.select()
				.from(denteMaxBotConfigs)
				.where(eq(denteMaxBotConfigs.organizationId, orgId))
				.limit(1);
			if (!cfg || (!cfg.maxBotToken && !cfg.tokenSecretRef)) {
				return {
					kind: "unconfigured",
					label,
					reason: "Канал MAX еще не настроен. Нажмите «Настроить», чтобы ввести токен бота.",
				};
			}
			const resolved = safeResolveToken(cfg.maxBotToken || cfg.tokenSecretRef, orgId, label);
			if (!resolved.ok) return { kind: "error", label, reason: resolved.reason };
			if (!resolved.token) {
				return { kind: "unconfigured", label, reason: "Токен MAX-бота не задан." };
			}
			return { kind: "max_bot", label, token: resolved.token };
		}

		return {
			kind: "unconfigured",
			label: channelId,
			reason: `Неизвестный канал ${channelId}.`,
		};
	});
}

async function runExternalConnectionProbe(
	target: Exclude<ProbeTarget, { kind: "unconfigured" } | { kind: "error" }>,
): Promise<{ ok: boolean; message: string }> {
	const signal = AbortSignal.timeout(PROBE_TIMEOUT_MS);

	switch (target.kind) {
		case "telegram_bot": {
			const res = await fetch(`https://api.telegram.org/bot${target.token}/getMe`, { signal });
			const json = (await res.json().catch(() => null)) as {
				ok?: boolean;
				description?: string;
				result?: { username?: string };
			} | null;
			if (!res.ok || !json?.ok) {
				return {
					ok: false,
					message: json?.description
						? `Telegram Bot API отклонил токен: ${json.description}`
						: `Telegram Bot API ответил HTTP ${res.status}`,
				};
			}
			const botName = json.result?.username ? `@${json.result.username}` : "бот";
			return {
				ok: true,
				message: `Связь с Telegram (${botName}) подтверждена. HTTP ${res.status} OK.`,
			};
		}

		case "vk_group": {
			const params = new URLSearchParams({
				group_id: target.groupId.replace(/^club|^public/, ""),
				access_token: target.token,
				v: "5.199",
			});
			const res = await fetch(`https://api.vk.com/method/groups.getById?${params.toString()}`, { signal });
			const json = (await res.json().catch(() => null)) as {
				error?: { error_code?: number; error_msg?: string };
				response?: unknown;
			} | null;
			if (!res.ok || json?.error || !json?.response) {
				const errText = json?.error?.error_msg || `HTTP ${res.status}`;
				return {
					ok: false,
					message: `Проверка ВКонтакте не пройдена: ${errText}`,
				};
			}
			return {
				ok: true,
				message: `Связь с ВКонтакте подтверждена. HTTP ${res.status} OK.`,
			};
		}

		case "vk_account": {
			const params = new URLSearchParams({
				access_token: target.token,
				v: "5.199",
			});
			if (target.vkUserId) {
				params.set("user_ids", target.vkUserId.replace(/^id/, ""));
			}
			const res = await fetch(`https://api.vk.com/method/users.get?${params.toString()}`, { signal });
			const json = (await res.json().catch(() => null)) as {
				error?: { error_msg?: string };
				response?: unknown[];
			} | null;
			if (!res.ok || json?.error || !Array.isArray(json?.response) || json.response.length === 0) {
				return {
					ok: false,
					message: `Проверка личного аккаунта ВКонтакте не пройдена: ${json?.error?.error_msg || `HTTP ${res.status}`}`,
				};
			}
			return {
				ok: true,
				message: `Связь с личным аккаунтом ВКонтакте подтверждена. HTTP ${res.status} OK.`,
			};
		}

		case "wa_green_api": {
			const res = await fetch(
				`https://api.green-api.com/waInstance${encodeURIComponent(target.instanceId)}/getStateInstance/${encodeURIComponent(target.token)}`,
				{ signal },
			);
			const json = (await res.json().catch(() => null)) as { stateInstance?: string; message?: string } | null;
			if (!res.ok) {
				return {
					ok: false,
					message: json?.message || `Green-API вернул HTTP ${res.status}`,
				};
			}
			if (json?.stateInstance && json.stateInstance !== "authorized") {
				return {
					ok: false,
					message: `Инстанс WhatsApp не авторизован (состояние: ${json.stateInstance}).`,
				};
			}
			return {
				ok: true,
				message: `Связь с WhatsApp (Green-API) подтверждена. HTTP ${res.status} OK.`,
			};
		}

		case "wa_waba": {
			const res = await fetch(
				`https://graph.facebook.com/v20.0/${encodeURIComponent(target.phoneNumberId)}?fields=id,display_phone_number`,
				{
					headers: { Authorization: `Bearer ${target.token}` },
					signal,
				},
			);
			const json = (await res.json().catch(() => null)) as {
				id?: string;
				error?: { message?: string };
			} | null;
			if (!res.ok || json?.error || !json?.id) {
				return {
					ok: false,
					message: `WhatsApp Cloud API вернул ошибку: ${json?.error?.message || `HTTP ${res.status}`}`,
				};
			}
			return {
				ok: true,
				message: `Связь с WhatsApp Cloud API подтверждена. HTTP ${res.status} OK.`,
			};
		}

		case "max_bot": {
			const res = await fetch("https://platform-api2.max.ru/me", {
				headers: { authorization: target.token },
				signal,
			});
			const json = (await res.json().catch(() => null)) as { message?: string; name?: string } | null;
			if (!res.ok) {
				return {
					ok: false,
					message: `MAX API отклонил запрос: ${json?.message || `HTTP ${res.status}`}`,
				};
			}
			return {
				ok: true,
				message: `Связь с MAX подтверждена. HTTP ${res.status} OK.`,
			};
		}
	}
}

/**
 * GET /api/messengers/overview
 * Обзорный статус всех каналов мессенджеров клиники.
 * Все токены гарантированно маскируются через OmnichannelTokenVault.
 */
export async function getMessengersOverviewHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply, "messengers overview read");
	if (!orgId) return;

	const [tgConfigs, vkConfigs, waConfigs, maxConfigs] = await withTenantCtx(orgId, async (tx) =>
		Promise.all([
			tx
				.select()
				.from(denteTelegramBotConfigs)
				.where(eq(denteTelegramBotConfigs.organizationId, orgId)),
			tx
				.select()
				.from(denteVkBotConfigs)
				.where(eq(denteVkBotConfigs.organizationId, orgId)),
			tx
				.select()
				.from(denteWhatsappBotConfigs)
				.where(eq(denteWhatsappBotConfigs.organizationId, orgId)),
			tx
				.select()
				.from(denteMaxBotConfigs)
				.where(eq(denteMaxBotConfigs.organizationId, orgId)),
		]),
	);

	const tgBot = tgConfigs.find((c) => c.botConfigId !== "tg_account" && c.botConfigId !== "account") || tgConfigs[0];
	const tgAccount = tgConfigs.find((c) => c.botConfigId === "tg_account" || c.botConfigId === "account");

	const vkGroup = vkConfigs.find((c) => c.botConfigId !== "vk_account" && c.botConfigId !== "account") || vkConfigs[0];
	const vkAccount = vkConfigs.find((c) => c.botConfigId === "vk_account" || c.botConfigId === "account");

	const waPhone = waConfigs.find((c) => c.provider === "green_api" || Boolean(c.greenApiInstanceId));
	const waWaba = waConfigs.find((c) => c.provider === "cloud_api" || (!c.greenApiInstanceId && Boolean(c.phoneNumberId))) || waConfigs[0];

	const mxBot = maxConfigs[0];

	const channels = [
		// 1. Telegram Бот
		{
			id: "tg_bot",
			title: "Telegram Бот",
			shortBadge: "TG Бот",
			channel: "telegram" as const,
			type: "bot" as const,
			status: (tgBot && tgBot.mode !== "disabled" && Boolean(tgBot.tokenSecretRef))
				? ("connected" as const)
				: ("unconfigured" as const),
			statusText: (tgBot && tgBot.mode !== "disabled" && Boolean(tgBot.tokenSecretRef))
				? "Подключен"
				: "Не настроен",
			statusColor: (tgBot && tgBot.mode !== "disabled" && Boolean(tgBot.tokenSecretRef))
				? ("green" as const)
				: ("gray" as const),
			details: tgBot?.botUsername ? `@${tgBot.botUsername}` : (tgBot?.tokenSecretRef ? "Токен привязан" : "Ожидает токен BotFather"),
			tokenMasked: OmnichannelTokenVault.maskToken(tgBot?.tokenSecretRef),
			configTab: "telegram",
			updatedAt: tgBot?.updatedAt?.toISOString() || null,
		},
		// 2. Telegram Личный Аккаунт
		{
			id: "tg_account",
			title: "Telegram Аккаунт",
			shortBadge: "TG Аккаунт",
			channel: "telegram" as const,
			type: "account" as const,
			status: (tgAccount && tgAccount.isActive && Boolean(tgAccount.tokenSecretRef))
				? ("connected" as const)
				: (tgAccount?.tokenSecretRef ? ("pending_qr" as const) : ("unconfigured" as const)),
			statusText: (tgAccount && tgAccount.isActive && Boolean(tgAccount.tokenSecretRef))
				? "Подключен"
				: (tgAccount?.tokenSecretRef ? "Ожидает код" : "Не настроен"),
			statusColor: (tgAccount && tgAccount.isActive && Boolean(tgAccount.tokenSecretRef))
				? ("green" as const)
				: (tgAccount?.tokenSecretRef ? ("yellow" as const) : ("gray" as const)),
			details: tgAccount?.isActive ? "Личный профиль врача активен" : "Подключение по номеру телефона / QR",
			tokenMasked: OmnichannelTokenVault.maskToken(tgAccount?.tokenSecretRef),
			configTab: "telegram",
			updatedAt: tgAccount?.updatedAt?.toISOString() || null,
		},
		// 3. VK Группа
		{
			id: "vk_group",
			title: "VK Группа (Сообщество)",
			shortBadge: "VK Группа",
			channel: "vk" as const,
			type: "group" as const,
			status: (vkGroup && (vkGroup.isActive ?? vkGroup.isEnabled) && Boolean(vkGroup.groupId) && Boolean(vkGroup.groupToken || vkGroup.tokenSecretRef))
				? ("connected" as const)
				: (vkGroup?.groupId ? ("pending_qr" as const) : ("unconfigured" as const)),
			statusText: (vkGroup && (vkGroup.isActive ?? vkGroup.isEnabled) && Boolean(vkGroup.groupId) && Boolean(vkGroup.groupToken || vkGroup.tokenSecretRef))
				? "Подключен"
				: (vkGroup?.groupId ? "Ожидает Callback API" : "Не настроен"),
			statusColor: (vkGroup && (vkGroup.isActive ?? vkGroup.isEnabled) && Boolean(vkGroup.groupId) && Boolean(vkGroup.groupToken || vkGroup.tokenSecretRef))
				? ("green" as const)
				: (vkGroup?.groupId ? ("yellow" as const) : ("gray" as const)),
			details: vkGroup?.groupId ? `ID группы: ${vkGroup.groupId}` : "Ожидает токен группы",
			tokenMasked: OmnichannelTokenVault.maskToken(vkGroup?.groupToken || vkGroup?.tokenSecretRef),
			configTab: "vk",
			updatedAt: vkGroup?.updatedAt?.toISOString() || null,
		},
		// 4. VK Личный Аккаунт
		{
			id: "vk_account",
			title: "VK Аккаунт",
			shortBadge: "VK Аккаунт",
			channel: "vk" as const,
			type: "account" as const,
			status: (vkAccount && (vkAccount.isActive ?? vkAccount.isEnabled) && Boolean(vkAccount.groupToken || vkAccount.tokenSecretRef))
				? ("connected" as const)
				: ("unconfigured" as const),
			statusText: (vkAccount && (vkAccount.isActive ?? vkAccount.isEnabled) && Boolean(vkAccount.groupToken || vkAccount.tokenSecretRef))
				? "Подключен"
				: "Не настроен",
			statusColor: (vkAccount && (vkAccount.isActive ?? vkAccount.isEnabled) && Boolean(vkAccount.groupToken || vkAccount.tokenSecretRef))
				? ("green" as const)
				: ("gray" as const),
			details: vkAccount?.groupId ? `VK ID: ${vkAccount.groupId}` : "Личный диалог врача/администратора",
			tokenMasked: OmnichannelTokenVault.maskToken(vkAccount?.groupToken || vkAccount?.tokenSecretRef),
			configTab: "vk",
			updatedAt: vkAccount?.updatedAt?.toISOString() || null,
		},
		// 5. WhatsApp Телефон (Green-API / QR)
		{
			id: "wa_phone",
			title: "WhatsApp Телефон",
			shortBadge: "WA Телефон",
			channel: "whatsapp" as const,
			type: "phone" as const,
			status: (waPhone && (waPhone.isActive ?? waPhone.isEnabled) && Boolean(waPhone.greenApiInstanceId) && Boolean(waPhone.greenApiToken || waPhone.tokenSecretRef))
				? ("connected" as const)
				: (waPhone?.greenApiInstanceId ? ("pending_qr" as const) : ("unconfigured" as const)),
			statusText: (waPhone && (waPhone.isActive ?? waPhone.isEnabled) && Boolean(waPhone.greenApiInstanceId) && Boolean(waPhone.greenApiToken || waPhone.tokenSecretRef))
				? "Подключен"
				: (waPhone?.greenApiInstanceId ? "Ожидает QR/код" : "Не настроен"),
			statusColor: (waPhone && (waPhone.isActive ?? waPhone.isEnabled) && Boolean(waPhone.greenApiInstanceId) && Boolean(waPhone.greenApiToken || waPhone.tokenSecretRef))
				? ("green" as const)
				: (waPhone?.greenApiInstanceId ? ("yellow" as const) : ("gray" as const)),
			details: waPhone?.greenApiInstanceId ? `Инстанс ${waPhone.greenApiInstanceId}` : "Прямой номер WhatsApp через QR",
			tokenMasked: OmnichannelTokenVault.maskToken(waPhone?.greenApiToken || waPhone?.tokenSecretRef),
			configTab: "whatsapp",
			updatedAt: waPhone?.updatedAt?.toISOString() || null,
		},
		// 6. WhatsApp Cloud API (WABA)
		{
			id: "wa_waba",
			title: "WhatsApp WABA (Cloud)",
			shortBadge: "WA WABA",
			channel: "whatsapp" as const,
			type: "waba" as const,
			status: (waWaba && (waWaba.isActive ?? waWaba.isEnabled) && Boolean(waWaba.phoneNumberId) && Boolean(waWaba.accessToken || waWaba.tokenSecretRef))
				? ("connected" as const)
				: (waWaba?.phoneNumberId ? ("pending_qr" as const) : ("unconfigured" as const)),
			statusText: (waWaba && (waWaba.isActive ?? waWaba.isEnabled) && Boolean(waWaba.phoneNumberId) && Boolean(waWaba.accessToken || waWaba.tokenSecretRef))
				? "Подключен"
				: (waWaba?.phoneNumberId ? "Ожидает токен Meta" : "Не настроен"),
			statusColor: (waWaba && (waWaba.isActive ?? waWaba.isEnabled) && Boolean(waWaba.phoneNumberId) && Boolean(waWaba.accessToken || waWaba.tokenSecretRef))
				? ("green" as const)
				: (waWaba?.phoneNumberId ? ("yellow" as const) : ("gray" as const)),
			details: waWaba?.phoneNumberId ? `Phone ID: ${waWaba.phoneNumberId}` : "Официальный Meta Business API",
			tokenMasked: OmnichannelTokenVault.maskToken(waWaba?.accessToken || waWaba?.tokenSecretRef),
			configTab: "whatsapp",
			updatedAt: waWaba?.updatedAt?.toISOString() || null,
		},
		// 7. MAX (1C)
		{
			id: "max_bot",
			title: "MAX by 1C",
			shortBadge: "MAX",
			channel: "max" as const,
			type: "bot" as const,
			status: (mxBot && (mxBot.isActive ?? mxBot.isEnabled) && Boolean(mxBot.botId) && Boolean(mxBot.maxBotToken || mxBot.tokenSecretRef))
				? ("connected" as const)
				: ("unconfigured" as const),
			statusText: (mxBot && (mxBot.isActive ?? mxBot.isEnabled) && Boolean(mxBot.botId) && Boolean(mxBot.maxBotToken || mxBot.tokenSecretRef))
				? "Подключен"
				: "Не настроен",
			statusColor: (mxBot && (mxBot.isActive ?? mxBot.isEnabled) && Boolean(mxBot.botId) && Boolean(mxBot.maxBotToken || mxBot.tokenSecretRef))
				? ("green" as const)
				: ("gray" as const),
			details: mxBot?.botId ? `Бот: ${mxBot.botId}` : "Корпоративный мессенджер MAX",
			tokenMasked: OmnichannelTokenVault.maskToken(mxBot?.maxBotToken || mxBot?.tokenSecretRef),
			configTab: "max",
			updatedAt: mxBot?.updatedAt?.toISOString() || null,
		},
	];

	const connectedCount = channels.filter((c) => c.status === "connected").length;
	const pendingCount = channels.filter((c) => c.status === "pending_qr").length;
	const unconfiguredCount = channels.filter((c) => c.status === "unconfigured").length;

	return reply.send({
		summary: {
			total: channels.length,
			connectedCount,
			pendingCount,
			unconfiguredCount,
			healthStatus: connectedCount > 0 ? "operational" : "pending_setup",
		},
		channels,
	});
}

/**
 * POST /api/messengers/test-connection
 * Честная HTTP-проверка связи с выбранным шлюзом мессенджера (токен расшифровывается короткой TX, HTTP-запрос идёт строго вне PG TX).
 */
export async function handleTestConnection(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply, "messengers test connection");
	if (!orgId) return;

	const parse = testConnectionSchema.safeParse(request.body);
	if (!parse.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Укажите идентификатор канала для проверки связи.",
		});
	}

	const { channelId } = parse.data;
	const target = await resolveProbeTarget(orgId, channelId);

	if (target.kind === "unconfigured") {
		return reply.send({
			ok: false,
			channelId,
			status: "unconfigured",
			latencyMs: null,
			message: target.reason,
			testedAt: new Date().toISOString(),
		});
	}

	if (target.kind === "error") {
		return reply.send({
			ok: false,
			channelId,
			status: "error",
			latencyMs: null,
			message: target.reason,
			testedAt: new Date().toISOString(),
		});
	}

	const pingStartTime = performance.now();
	try {
		const probe = await runExternalConnectionProbe(target);
		const latencyMs = Math.max(1, Math.round(performance.now() - pingStartTime));
		return reply.send({
			ok: probe.ok,
			channelId,
			status: probe.ok ? "connected" : "error",
			latencyMs,
			message: probe.message,
			testedAt: new Date().toISOString(),
		});
	} catch (err) {
		const latencyMs = Math.max(1, Math.round(performance.now() - pingStartTime));
		logger.warn({ err: safeLogError(err), orgId, channelId }, "Messenger gateway HTTP probe failed");
		return reply.send({
			ok: false,
			channelId,
			status: "error",
			latencyMs,
			message: `Не удалось подключиться к шлюзу ${target.label}: ${err instanceof Error ? err.message : String(err)}`,
			testedAt: new Date().toISOString(),
		});
	}
}
