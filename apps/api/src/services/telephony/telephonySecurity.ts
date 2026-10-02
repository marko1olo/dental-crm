import { createHash, createHmac } from "node:crypto";
import * as dns from "node:dns/promises";
import { URL } from "node:url";
import type { FastifyReply, FastifyRequest } from "fastify";
import { namedDevelopmentModeActive } from "../../accessGuard.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";
export interface TelephonyWebhookPayload {
	event?: string | undefined;
	notification_name?: string | undefined;
	event_type?: string | undefined;
	from?: string | undefined;
	caller_id?: string | undefined;
	caller_number?: string | undefined;
	CallerIdNum?: string | undefined;
	from_number?: string | undefined;
	to?: string | undefined;
	called_did?: string | undefined;
	called_number?: string | undefined;
	CalledIdNum?: string | undefined;
	to_number?: string | undefined;
	call_id?: string | undefined;
	call_session_id?: string | undefined;
	CallId?: string | undefined;
	uniqueid?: string | undefined;
	entry_id?: string | undefined;
	recording_url?: string | undefined;
	record_url?: string | undefined;
	RecUrl?: string | undefined;
	link?: string | undefined;
	duration?: number | string | undefined;
	duration_seconds?: number | string | undefined;
	billsec?: number | string | undefined;
	talk_time?: number | string | undefined;
	timestamp?: number | string | undefined;
	call_start?: number | string | undefined;
	call_end?: number | string | undefined;
	call_duration?: number | string | undefined;
	api_key?: string | undefined;
	vpbx_api_key?: string | undefined;
	sign?: string | undefined;
	signature?: string | undefined;
}

export const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
	const cleanDigits = raw.replace(/\D/g, "");

	if (cleanDigits.length < 7) {
		return { raw, cleanDigits, e164: raw, national10: cleanDigits, isValid: false };
	}

	let national10 = "";
	let e164 = "";

	if (cleanDigits.length === 11) {
		if (cleanDigits.startsWith("7") || cleanDigits.startsWith("8")) {
			national10 = cleanDigits.slice(1);
			e164 = `+7${national10}`;
		} else {
			national10 = cleanDigits.slice(-10);
			e164 = `+${cleanDigits}`;
		}
	} else if (cleanDigits.length === 10) {
		national10 = cleanDigits;
		e164 = `+7${national10}`;
	} else if (cleanDigits.length > 11) {
		national10 = cleanDigits.slice(-10);
		e164 = `+${cleanDigits}`;
	} else {
		national10 = cleanDigits;
		e164 = `+7${cleanDigits}`;
	}

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

export function extractQueryParam(request: FastifyRequest, name: string): string | null {
	const query = request.query as Record<string, unknown> | undefined;
	const val = query?.[name];
	return typeof val === "string" && val.trim() ? val.trim() : null;
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

	const primarySecret =
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
	const hAuth = extractHeader(request, "authorization");

	if (hDente) candidateTokens.push(hDente);
	if (hWebhook) candidateTokens.push(hWebhook);
	if (hApiKey) candidateTokens.push(hApiKey);
	if (hPbx) candidateTokens.push(hPbx);

	if (hAuth) {
		if (hAuth.startsWith("Bearer ")) {
			candidateTokens.push(hAuth.slice(7).trim());
		} else if (hAuth.startsWith("Basic ")) {
			candidateTokens.push(hAuth.slice(6).trim());
		} else {
			candidateTokens.push(hAuth.trim());
		}
	}

	const qSecret = extractQueryParam(request, "secret");
	const qToken = extractQueryParam(request, "token");
	const qApiKey =
		extractQueryParam(request, "api_key") || extractQueryParam(request, "key");
	const qSignature =
		extractQueryParam(request, "signature") || extractQueryParam(request, "sign");

	if (qSecret) candidateTokens.push(qSecret);
	if (qToken) candidateTokens.push(qToken);
	if (qApiKey) candidateTokens.push(qApiKey);

	if (payload.api_key) candidateTokens.push(payload.api_key);
	if (payload.vpbx_api_key) candidateTokens.push(payload.vpbx_api_key);

	// Mango Office Check: sign = sha256(api_key + json + api_salt)
	const mangoSign =
		payload.sign || extractHeader(request, "x-mango-signature") || qSignature;
	const mangoKey = payload.vpbx_api_key || payload.api_key;
	const mangoSalt = process.env.MANGO_API_SALT?.trim() || primarySecret;

	if (mangoSign && mangoKey && mangoSalt) {
		const rawBodyStr =
			typeof request.body === "string"
				? request.body
				: JSON.stringify(request.body);
		const expectedMangoSign = createHash("sha256")
			.update(`${mangoKey}${rawBodyStr}${mangoSalt}`)
			.digest("hex");

		if (timingSafeSecretEqual(mangoSign, expectedMangoSign)) {
			return true;
		}
	}

	// Zadarma MD5/SHA1 Check
	const zadarmaSign =
		payload.signature || extractHeader(request, "signature") || qSignature;
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

	if (primarySecret) {
		for (const candidate of candidateTokens) {
			if (timingSafeSecretEqual(candidate, primarySecret)) {
				return true;
			}
		}
	}

	if (!primarySecret) {
		request.log.error(
			{ organizationId, channel: "telephony" },
			"PBX webhook rejected: TELEPHONY_WEBHOOK_SECRET is not configured on the server.",
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

	if (isForbiddenPrivateIp(hostname)) {
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
}): MarketingAttributionResult {
	let detectedChannel = "telephony";
	let detectedLabel = "Прямой звонок / ВАТС";

	const utmRaw = `${params.utm_source || ""} ${params.utm_campaign || ""} ${params.utm_medium || ""}`
		.trim()
		.toLowerCase();

	if (utmRaw) {
		if (/yandex|direct|директ|рся|rsya/i.test(utmRaw)) {
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
		if (/direct|яндекс|yandex/i.test(ch)) {
			detectedChannel = "yandex_direct";
			detectedLabel = "Яндекс.Директ";
		} else if (/2gis|2гис/i.test(ch)) {
			detectedChannel = "gis_2";
			detectedLabel = "2ГИС Карты";
		} else if (/prodoc/i.test(ch)) {
			detectedChannel = "prodoctorov";
			detectedLabel = "ПроДокторов";
		} else if (/napopr/i.test(ch)) {
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

	if (detectedChannel === "telephony" && params.targetRaw) {
		const trLower = params.targetRaw.toLowerCase();
		if (/direct|yandex|директ/i.test(trLower)) {
			detectedChannel = "yandex_direct";
			detectedLabel = "Яндекс.Директ";
		} else if (/2gis|2гис/i.test(trLower)) {
			detectedChannel = "gis_2";
			detectedLabel = "2ГИС Карты";
		} else if (/prodoc/i.test(trLower)) {
			detectedChannel = "prodoctorov";
			detectedLabel = "ПроДокторов";
		}
	}

	return {
		channel: detectedChannel,
		channelLabel: detectedLabel,
	};
}
