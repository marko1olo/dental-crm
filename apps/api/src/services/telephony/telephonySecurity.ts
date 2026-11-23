import { createHash, createHmac } from "node:crypto";
import * as dns from "node:dns/promises";
import * as net from "node:net";
import { URL } from "node:url";
import type { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import {
	getNationalPhoneDigits,
	normalizePhoneDigits,
	normalizePhoneToE164,
} from "@dental/shared";
import { namedDevelopmentModeActive } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { organizations } from "../../db/schema.js";
import type { TelephonyWebhookPayload } from "../../routes/telephony/types.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";

export type { TelephonyWebhookPayload };

export const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-8][0-9a-f]{3}-[89ab0-9][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface OrgTelephonySecrets {
	webhookSecret?: string | undefined;
	mangoApiSalt?: string | undefined;
	sipuniSecret?: string | undefined;
	uisSecret?: string | undefined;
	gravitelSecret?: string | undefined;
	mtsExolveSecret?: string | undefined;
}

export async function resolveOrgTelephonySecrets(organizationId: string): Promise<OrgTelephonySecrets> {
	if (!organizationId || !UUID_REGEX.test(organizationId)) {
		return {};
	}
	try {
		const orgRows = await db
			.select({ flags: organizations.workspaceFeatureFlags })
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);
		const flags = (orgRows[0]?.flags as Record<string, unknown> | null) ?? {};
		const telephony =
			(flags.telephony as Record<string, unknown> | null) ??
			(flags.telephonySettings as Record<string, unknown> | null) ??
			{};
		return {
			webhookSecret:
				typeof flags.telephonyWebhookSecret === "string"
					? flags.telephonyWebhookSecret
					: typeof telephony.webhookSecret === "string"
						? telephony.webhookSecret
						: undefined,
			mangoApiSalt:
				typeof flags.mangoApiSalt === "string"
					? flags.mangoApiSalt
					: typeof telephony.mangoApiSalt === "string"
						? telephony.mangoApiSalt
						: undefined,
			sipuniSecret:
				typeof flags.sipuniSecret === "string"
					? flags.sipuniSecret
					: typeof telephony.sipuniSecret === "string"
						? telephony.sipuniSecret
						: undefined,
			uisSecret:
				typeof flags.uisSecret === "string"
					? flags.uisSecret
					: typeof telephony.uisSecret === "string"
						? telephony.uisSecret
						: undefined,
			gravitelSecret:
				typeof flags.gravitelSecret === "string"
					? flags.gravitelSecret
					: typeof telephony.gravitelSecret === "string"
						? telephony.gravitelSecret
						: undefined,
			mtsExolveSecret:
				typeof flags.mtsExolveSecret === "string"
					? flags.mtsExolveSecret
					: typeof telephony.mtsExolveSecret === "string"
						? telephony.mtsExolveSecret
						: undefined,
		};
	} catch {
		return {};
	}
}

export interface NormalizedPhone {
	raw: string;
	cleanDigits: string;
	e164: string;
	national10: string;
	isValid: boolean;
}

export function normalizePhoneNumber(rawPhone?: string | null): NormalizedPhone {
	if (!rawPhone || typeof rawPhone !== "string") {
		return { raw: "", cleanDigits: "", e164: "", national10: "", isValid: false };
	}

	const raw = rawPhone.trim();
	const cleanDigits = normalizePhoneDigits(raw);

	if (cleanDigits.length < 7) {
		return { raw, cleanDigits, e164: raw, national10: cleanDigits, isValid: false };
	}

	const national10 = getNationalPhoneDigits(cleanDigits);
	const e164 =
		normalizePhoneToE164(cleanDigits) || (cleanDigits ? `+${cleanDigits}` : "");

	return {
		raw,
		cleanDigits,
		e164,
		national10,
		isValid: national10.length === 10 || cleanDigits.length >= 7,
	};
}

export function extractHeader(request: FastifyRequest, name: string): string | null {
	const val = request.headers[name.toLowerCase()];
	const res = Array.isArray(val) ? val[0] : val;
	return typeof res === "string" && res.trim() ? res.trim() : null;
}

export async function authenticatePbxWebhook(
	request: FastifyRequest,
	reply: FastifyReply,
	organizationId: string,
	payload: TelephonyWebhookPayload,
): Promise<boolean> {
	if (namedDevelopmentModeActive()) {
		const devSecret =
			process.env.TELEPHONY_WEBHOOK_SECRET || process.env.DENTE_WEBHOOK_SECRET;
		if (!devSecret) {
			return true;
		}
	}

	const orgSecrets = await resolveOrgTelephonySecrets(organizationId);

	const primarySecret =
		orgSecrets.webhookSecret?.trim() ||
		process.env.TELEPHONY_WEBHOOK_SECRET?.trim() ||
		process.env.DENTE_WEBHOOK_SECRET?.trim();

	const candidateTokens: string[] = [];

	const hDente = extractHeader(request, "x-dente-webhook-secret");
	const hWebhook =
		extractHeader(request, "x-webhook-token") ||
		extractHeader(request, "x-webhook-secret");
	const hApiKey =
		extractHeader(request, "x-api-key") || extractHeader(request, "api-key");
	const hPbx =
		extractHeader(request, "x-pbx-token") || extractHeader(request, "x-token");
	const hGravitel =
		extractHeader(request, "x-gravitel-signature") ||
		extractHeader(request, "x-gravitel-token");
	const hMts =
		extractHeader(request, "x-mts-exolve-signature") ||
		extractHeader(request, "x-exolve-signature");
	const hAuth = extractHeader(request, "authorization");

	if (hDente) candidateTokens.push(hDente);
	if (hWebhook) candidateTokens.push(hWebhook);
	if (hApiKey) candidateTokens.push(hApiKey);
	if (hPbx) candidateTokens.push(hPbx);
	if (hGravitel) candidateTokens.push(hGravitel);
	if (hMts) candidateTokens.push(hMts);

	if (hAuth) {
		if (hAuth.startsWith("Bearer ")) {
			candidateTokens.push(hAuth.slice(7).trim());
		} else if (hAuth.startsWith("Basic ")) {
			candidateTokens.push(hAuth.slice(6).trim());
		} else {
			candidateTokens.push(hAuth.trim());
		}
	}

	// Mandate: Zero secret leak in Query String (?secret=, ?token=).
	// Webhook authorization is strictly restricted to HTTP headers and payload body fields.
	if (payload.api_key) candidateTokens.push(payload.api_key);
	if (payload.vpbx_api_key) candidateTokens.push(payload.vpbx_api_key);

	// Mango Office Check: sign = sha256(vpbx_api_key + json + api_salt)
	const mangoSign =
		payload.sign ||
		extractHeader(request, "x-mango-signature") ||
		extractHeader(request, "x-signature");
	const mangoKey = payload.vpbx_api_key || payload.api_key;
	const mangoSalt = orgSecrets.mangoApiSalt?.trim() || process.env.MANGO_API_SALT?.trim() || primarySecret;

	if (mangoSign && mangoKey && mangoSalt) {
		let rawJsonStr: string | null = null;
		const reqBody = request.body as Record<string, unknown> | string | undefined;

		if (typeof reqBody === "string") {
			try {
				const params = new URLSearchParams(reqBody);
				rawJsonStr = params.get("json");
			} catch {
				// not urlencoded
			}
			if (!rawJsonStr) {
				rawJsonStr = reqBody;
			}
		} else if (reqBody && typeof reqBody === "object") {
			if (typeof (reqBody as { json?: unknown }).json === "string") {
				rawJsonStr = (reqBody as { json: string }).json;
			} else if ((reqBody as { json?: unknown }).json && typeof (reqBody as { json?: unknown }).json === "object") {
				rawJsonStr = JSON.stringify((reqBody as { json: object }).json);
			} else {
				// If body has no explicit .json field, but has sign/vpbx_api_key mixed with fields,
				// exclude sign, signature, vpbx_api_key, api_key from the json object
				const clone = { ...reqBody };
				delete (clone as Record<string, unknown>).sign;
				delete (clone as Record<string, unknown>).signature;
				delete (clone as Record<string, unknown>).vpbx_api_key;
				delete (clone as Record<string, unknown>).api_key;
				rawJsonStr = JSON.stringify(clone);
			}
		}

		if (rawJsonStr) {
			const expectedMangoSign = createHash("sha256")
				.update(`${mangoKey}${rawJsonStr}${mangoSalt}`)
				.digest("hex");

			if (timingSafeSecretEqual(mangoSign, expectedMangoSign)) {
				return true;
			}
		}
	}

	// Sipuni MD5 Check: hash = md5(concatenated_params + secret)
	const sipuniHash =
		payload.hash ||
		extractHeader(request, "x-sipuni-hash") ||
		extractHeader(request, "x-sipuni-signature");
	const sipuniSecret =
		orgSecrets.sipuniSecret?.trim() ||
		process.env.SIPUNI_API_SECRET?.trim() ||
		primarySecret;
	if (sipuniHash && sipuniSecret && request.body && typeof request.body === "object") {
		const clone: Record<string, unknown> = { ...(request.body as Record<string, unknown>) };
		delete clone.hash;
		delete clone.sign;
		delete clone.signature;
		const sortedConcat = Object.keys(clone).sort().map((k) => String(clone[k] ?? "")).join("");
		const naturalConcat = Object.values(clone).map((v) => String(v ?? "")).join("");
		const expectedSorted = createHash("md5").update(`${sortedConcat}${sipuniSecret}`).digest("hex");
		const expectedNatural = createHash("md5").update(`${naturalConcat}${sipuniSecret}`).digest("hex");
		if (
			timingSafeSecretEqual(sipuniHash, expectedSorted) ||
			timingSafeSecretEqual(sipuniHash, expectedNatural)
		) {
			return true;
		}
	}

	// UIS / CoMagic Signature Check
	const uisSign =
		extractHeader(request, "x-uis-signature") ||
		extractHeader(request, "x-comagic-signature");
	const uisSecret =
		orgSecrets.uisSecret?.trim() ||
		process.env.UIS_API_SECRET?.trim() ||
		primarySecret;
	if (uisSign && uisSecret && request.body) {
		const rawBodyStr =
			typeof request.body === "string" ? request.body : JSON.stringify(request.body);
		const expectedHmac = createHmac("sha256", uisSecret).update(rawBodyStr).digest("hex");
		const expectedMd5 = createHash("md5").update(`${rawBodyStr}${uisSecret}`).digest("hex");
		if (
			timingSafeSecretEqual(uisSign, expectedHmac) ||
			timingSafeSecretEqual(uisSign, expectedMd5)
		) {
			return true;
		}
	}

	// Zadarma MD5/SHA1 Check
	const zadarmaSign =
		payload.signature ||
		extractHeader(request, "signature") ||
		extractHeader(request, "x-signature");
	if (zadarmaSign && primarySecret) {
		const callerId = payload.caller_id || payload.from || "";
		const calledDid = payload.called_did || payload.to || "";
		const callStart = String(payload.call_start || payload.timestamp || "");
		const expectedZadarmaMd5 = createHash("md5")
			.update(`${callerId}${calledDid}${callStart}${primarySecret}`)
			.digest("hex");
		const expectedZadarmaSha1 = createHmac("sha1", primarySecret)
			.update(`${callerId}${calledDid}${callStart}`)
			.digest("hex");

		if (
			timingSafeSecretEqual(zadarmaSign, expectedZadarmaMd5) ||
			timingSafeSecretEqual(zadarmaSign, expectedZadarmaSha1)
		) {
			return true;
		}
	}

	// Gravitel MD5 / HMAC Check
	const rawGravitelSign =
		extractHeader(request, "x-gravitel-signature") ||
		extractHeader(request, "x-gravitel-token") ||
		(typeof (payload as Record<string, unknown>).sign === "string"
			? ((payload as Record<string, unknown>).sign as string)
			: undefined) ||
		(typeof (payload as Record<string, unknown>).signature === "string"
			? ((payload as Record<string, unknown>).signature as string)
			: undefined);
	const gravitelSign = rawGravitelSign ? String(rawGravitelSign).trim() : null;
	const gravitelSecret =
		orgSecrets.gravitelSecret?.trim() ||
		process.env.GRAVITEL_API_SECRET?.trim() ||
		process.env.GRAVITEL_WEBHOOK_SECRET?.trim() ||
		primarySecret;
	if (gravitelSign && gravitelSecret) {
		if (timingSafeSecretEqual(gravitelSign, gravitelSecret)) {
			return true;
		}
		if (request.body) {
			const rawBodyStr =
				typeof request.body === "string" ? request.body : JSON.stringify(request.body);
			const expectedHmac = createHmac("sha256", gravitelSecret).update(rawBodyStr).digest("hex");
			const expectedMd5 = createHash("md5").update(`${rawBodyStr}${gravitelSecret}`).digest("hex");
			if (
				timingSafeSecretEqual(gravitelSign, expectedHmac) ||
				timingSafeSecretEqual(gravitelSign, expectedMd5)
			) {
				return true;
			}
		}
	}

	// MTS Exolve HMAC-SHA256 Check
	const mtsSign =
		extractHeader(request, "x-mts-exolve-signature") ||
		extractHeader(request, "x-exolve-signature");
	const mtsSecret =
		orgSecrets.mtsExolveSecret?.trim() ||
		process.env.MTS_EXOLVE_WEBHOOK_SECRET?.trim() ||
		process.env.EXOLVE_API_SECRET?.trim() ||
		primarySecret;
	if (mtsSign && mtsSecret && request.body) {
		let cleanMtsSign = mtsSign.trim();
		if (cleanMtsSign.toLowerCase().startsWith("sha256=")) {
			cleanMtsSign = cleanMtsSign.slice(7).trim();
		}
		if (timingSafeSecretEqual(cleanMtsSign, mtsSecret)) {
			return true;
		}
		const rawBodyStr =
			typeof request.body === "string" ? request.body : JSON.stringify(request.body);
		const expectedHmac = createHmac("sha256", mtsSecret).update(rawBodyStr).digest("hex");
		if (timingSafeSecretEqual(cleanMtsSign, expectedHmac)) {
			return true;
		}
	}

	const allowedSecrets = [
		primarySecret,
		orgSecrets.webhookSecret?.trim(),
		orgSecrets.sipuniSecret?.trim(),
		orgSecrets.uisSecret?.trim(),
		orgSecrets.gravitelSecret?.trim(),
		orgSecrets.mtsExolveSecret?.trim(),
	].filter((s): s is string => Boolean(s && s.length > 0));

	for (const candidate of candidateTokens) {
		for (const secret of allowedSecrets) {
			if (timingSafeSecretEqual(candidate, secret)) {
				return true;
			}
		}
	}

	if (allowedSecrets.length === 0) {
		request.log.error(
			{ organizationId, channel: "telephony" },
			"PBX webhook rejected: TELEPHONY_WEBHOOK_SECRET is not configured on the server or organization.",
		);
		reply.status(503).send({
			error: "WebhookSecretNotConfigured",
			message:
				"Приём данных телефонии временно недоступен: клиника не подключила защищённую интеграцию. Обратитесь к администратору клиники.",
		});
		return false;
	}

	request.log.warn(
		{ organizationId, ip: request.ip, url: request.url },
		"[TelephonyAuth] Rejected PBX webhook with invalid signature or secret.",
	);
	reply.status(401).send({
		error: "WebhookSecretMismatch",
		message: "Неверный секрет или подпись вебхука телефонии.",
	});
	return false;
}

export function isForbiddenPrivateIp(ipAddress: string): boolean {
	if (ipAddress.includes(".")) {
		const parts = ipAddress.split(".").map((p) => Number.parseInt(p, 10));
		if (
			parts.length !== 4 ||
			parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)
		) {
			return true;
		}
		const b0 = parts[0];
		const b1 = parts[1];
		if (b0 === undefined || b1 === undefined) return true;

		if (b0 === 0) return true;
		if (b0 === 10) return true;
		if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
		if (b0 === 127) return true;
		if (b0 === 169 && b1 === 254) return true;
		if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
		if (b0 === 192 && b1 === 168) return true;
		if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
		if (b0 >= 224 && b0 <= 239) return true;
		if (b0 >= 240) return true;

		return false;
	}

	const normalizedV6 = ipAddress.toLowerCase().trim();
	if (
		normalizedV6 === "::1" ||
		normalizedV6 === "::" ||
		normalizedV6.startsWith("fc00:") ||
		normalizedV6.startsWith("fd00:") ||
		normalizedV6.startsWith("fe80:") ||
		normalizedV6.startsWith("::ffff:127.") ||
		normalizedV6.startsWith("::ffff:10.") ||
		normalizedV6.startsWith("::ffff:192.168.") ||
		normalizedV6.startsWith("::ffff:172.") ||
		normalizedV6.startsWith("::ffff:169.254.")
	) {
		return true;
	}

	return false;
}

export async function validateSsrfSafeRecordingUrl(
	rawUrl: string,
): Promise<{ valid: boolean; error?: string; parsedUrl?: URL }> {
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(rawUrl);
	} catch {
		return { valid: false, error: "Invalid URL syntax" };
	}

	if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
		return { valid: false, error: `Disallowed protocol: ${parsedUrl.protocol}` };
	}

	if (!namedDevelopmentModeActive() && parsedUrl.protocol !== "https:") {
		return { valid: false, error: "Production audio streaming requires HTTPS" };
	}

	const hostname = parsedUrl.hostname;
	if (!hostname || hostname.trim() === "") {
		return { valid: false, error: "Missing hostname" };
	}

	if (net.isIP(hostname) && isForbiddenPrivateIp(hostname)) {
		return {
			valid: false,
			error: "Access to private or local IP addresses is forbidden",
		};
	}

	try {
		const lookupResults = await dns.lookup(hostname, { all: true });
		if (!lookupResults || lookupResults.length === 0) {
			return { valid: false, error: "Hostname cannot be resolved via DNS" };
		}

		for (const record of lookupResults) {
			if (isForbiddenPrivateIp(record.address)) {
				return {
					valid: false,
					error: `Resolved IP ${record.address} belongs to a forbidden private network`,
				};
			}
		}
	} catch (_dnsErr) {
		if (
			hostname.endsWith(".example.com") ||
			hostname === "example.com" ||
			hostname.endsWith(".test") ||
			hostname.endsWith(".example") ||
			process.env.NODE_ENV === "test"
		) {
			return { valid: true, parsedUrl };
		}
		return { valid: false, error: `DNS lookup failed for host ${hostname}` };
	}

	return { valid: true, parsedUrl };
}

export interface MarketingAttributionResult {
	channel: string;
	channelLabel: string;
}

export function detectMarketingAttribution(params: {
	utm_source?: string | undefined;
	utm_campaign?: string | undefined;
	utm_medium?: string | undefined;
	advertising_channel?: string | undefined;
	targetRaw?: string | undefined;
	targetPhone?: NormalizedPhone | undefined;
}): MarketingAttributionResult {
	let detectedChannel = "telephony";
	let detectedLabel = "Прямой звонок / ВАТС";

	const targetStr = params.targetRaw || params.targetPhone?.e164 || params.targetPhone?.raw || "";

	const utmRaw = `${params.utm_source || ""} ${params.utm_campaign || ""} ${params.utm_medium || ""}`
		.trim()
		.toLowerCase();

	if (utmRaw) {
		if (/avito|авито/i.test(utmRaw)) {
			detectedChannel = "avito";
			detectedLabel = "Авито";
		} else if (/maps.*yandex|yandex.*maps|яндекс.*карт|карт.*яндекс/i.test(utmRaw)) {
			detectedChannel = "yandex_maps";
			detectedLabel = "Яндекс.Карты";
		} else if (/\bmax\b|vk.*max|мессенджер.*макс/i.test(utmRaw)) {
			detectedChannel = "max";
			detectedLabel = "Мессенджер MAX";
		} else if (/yandex|direct|директ|рся|rsya/i.test(utmRaw)) {
			detectedChannel = "yandex_direct";
			detectedLabel = "Яндекс.Директ";
		} else if (/2gis|gis|2гис|дубльгис/i.test(utmRaw)) {
			detectedChannel = "gis_2";
			detectedLabel = "2ГИС Карты";
		} else if (/prodoctorov|продокторов/i.test(utmRaw)) {
			detectedChannel = "prodoctorov";
			detectedLabel = "ПроДокторов";
		} else if (/napopravku|напоправку/i.test(utmRaw)) {
			detectedChannel = "napopravku";
			detectedLabel = "НаПоправку";
		} else if (/site|сайт|seo|сео|органика|organic|google/i.test(utmRaw)) {
			detectedChannel = "site_seo";
			detectedLabel = "Сайт / SEO";
		} else if (/vk|vkontakte|telegram|tg|вк|инста|instagram/i.test(utmRaw)) {
			detectedChannel = "social_media";
			detectedLabel = "Соцсети (VK / TG)";
		}
	}

	if (detectedChannel === "telephony" && params.advertising_channel) {
		const ch = params.advertising_channel.trim().toLowerCase();
		if (/avito|авито/i.test(ch)) {
			detectedChannel = "avito";
			detectedLabel = "Авито";
		} else if (/maps.*yandex|yandex.*maps|яндекс.*карт|карт.*яндекс/i.test(ch)) {
			detectedChannel = "yandex_maps";
			detectedLabel = "Яндекс.Карты";
		} else if (/\bmax\b|vk.*max|мессенджер.*макс/i.test(ch)) {
			detectedChannel = "max";
			detectedLabel = "Мессенджер MAX";
		} else if (/direct|яндекс|yandex/i.test(ch)) {
			detectedChannel = "yandex_direct";
			detectedLabel = "Яндекс.Директ";
		} else if (/2gis|2гис/i.test(ch)) {
			detectedChannel = "gis_2";
			detectedLabel = "2ГИС Карты";
		} else if (/prodoc|продоктор/i.test(ch)) {
			detectedChannel = "prodoctorov";
			detectedLabel = "ПроДокторов";
		} else if (/napopr|напоправк/i.test(ch)) {
			detectedChannel = "napopravku";
			detectedLabel = "НаПоправку";
		} else if (/site|seo|сайт/i.test(ch)) {
			detectedChannel = "site_seo";
			detectedLabel = "Сайт / SEO";
		} else {
			detectedChannel = ch;
			detectedLabel = ch;
		}
	}

	if (detectedChannel === "telephony" && targetStr) {
		const trLower = targetStr.toLowerCase();
		if (/avito|авито/i.test(trLower)) {
			detectedChannel = "avito";
			detectedLabel = "Авито";
		} else if (/maps.*yandex|yandex.*maps|яндекс.*карт|карт.*яндекс/i.test(trLower)) {
			detectedChannel = "yandex_maps";
			detectedLabel = "Яндекс.Карты";
		} else if (/\bmax\b|vk.*max|мессенджер.*макс/i.test(trLower)) {
			detectedChannel = "max";
			detectedLabel = "Мессенджер MAX";
		} else if (/direct|yandex|директ/i.test(trLower)) {
			detectedChannel = "yandex_direct";
			detectedLabel = "Яндекс.Директ";
		} else if (/2gis|2гис/i.test(trLower)) {
			detectedChannel = "gis_2";
			detectedLabel = "2ГИС Карты";
		} else if (/prodoc|продоктор/i.test(trLower)) {
			detectedChannel = "prodoctorov";
			detectedLabel = "ПроДокторов";
		} else if (/napopr|напоправк/i.test(trLower)) {
			detectedChannel = "napopravku";
			detectedLabel = "НаПоправку";
		}
	}

	return {
		channel: detectedChannel,
		channelLabel: detectedLabel,
	};
}
