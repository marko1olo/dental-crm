import { createHash, createHmac } from "node:crypto";
import * as dns from "node:dns/promises";
import * as http from "node:http";
import * as https from "node:https";
import { URL } from "node:url";
import { and, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	namedDevelopmentModeActive,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import {
	clinics,
	communicationEvents,
	crmLeads,
	patients,
} from "../db/schema.js";
import { verifyWebhookSecret } from "../security/webhookAuth.js";
import { wsBroker } from "../services/websocketBroker.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const telephonyCallEventSchema = z.enum([
	"ringing",
	"call_started",
	"dial-in",
	"answered",
	"connected",
	"ended",
	"hangup",
	"call_ended",
	"cdr",
	"record_ready",
]);

export type TelephonyCallEvent = z.infer<typeof telephonyCallEventSchema>;

export const telephonyWebhookPayloadSchema = z.object({
	event: z.string().optional(),
	notification_name: z.string().optional(),
	event_type: z.string().optional(),
	from: z.string().optional(),
	caller_id: z.string().optional(),
	caller_number: z.string().optional(),
	CallerIdNum: z.string().optional(),
	from_number: z.string().optional(),
	to: z.string().optional(),
	called_did: z.string().optional(),
	called_number: z.string().optional(),
	CalledIdNum: z.string().optional(),
	to_number: z.string().optional(),
	call_id: z.string().optional(),
	call_session_id: z.string().optional(),
	CallId: z.string().optional(),
	uniqueid: z.string().optional(),
	entry_id: z.string().optional(),
	recording_url: z.string().optional(),
	record_url: z.string().optional(),
	RecUrl: z.string().optional(),
	link: z.string().optional(),
	duration: z.union([z.number(), z.string()]).optional(),
	duration_seconds: z.union([z.number(), z.string()]).optional(),
	billsec: z.union([z.number(), z.string()]).optional(),
	talk_time: z.union([z.number(), z.string()]).optional(),
	timestamp: z.union([z.number(), z.string()]).optional(),
	call_start: z.union([z.number(), z.string()]).optional(),
	api_key: z.string().optional(),
	vpbx_api_key: z.string().optional(),
	sign: z.string().optional(),
	signature: z.string().optional(),
});

export type TelephonyWebhookPayload = z.infer<typeof telephonyWebhookPayloadSchema>;

export const telephonySmsWebhookPayloadSchema = z.object({
	from: z.string().optional(),
	sender: z.string().optional(),
	phone: z.string().optional(),
	to: z.string().optional(),
	message: z.string().optional(),
	text: z.string().optional(),
	sms_id: z.string().optional(),
	call_id: z.string().optional(),
	id: z.string().optional(),
	timestamp: z.union([z.number(), z.string()]).optional(),
});

export type TelephonySmsWebhookPayload = z.infer<
	typeof telephonySmsWebhookPayloadSchema
>;

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

function extractHeader(request: FastifyRequest, name: string): string | null {
	const val = request.headers[name.toLowerCase()];
	const res = Array.isArray(val) ? val[0] : val;
	return typeof res === "string" && res.trim() ? res.trim() : null;
}

function extractQueryParam(request: FastifyRequest, name: string): string | null {
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
				"Вебхук телефонии не настроен: задайте TELEPHONY_WEBHOOK_SECRET в окружении сервера.",
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
	} catch (dnsErr) {
		return { valid: false, error: `DNS lookup failed for host ${hostname}` };
	}

	return { valid: true, parsedUrl };
}

export const telephonyRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// --------------------------------------------------------------------------
	// PBX Call Webhook (supports /:organizationId/webhook and /:organizationId?/webhook)
	// --------------------------------------------------------------------------
	const handleCallWebhook = async (
		request: FastifyRequest<{ Params: { organizationId?: string } }>,
		reply: FastifyReply,
	) => {
		const rawPayload = request.body;
		if (
			!rawPayload ||
			typeof rawPayload !== "object" ||
			Array.isArray(rawPayload)
		) {
			return reply.status(400).send({
				error: "InvalidPayload",
				message: "Request body must be a JSON object",
			});
		}

		const parsed = telephonyWebhookPayloadSchema.safeParse(rawPayload);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Missing or malformed 'from' phone number in PBX payload",
			});
		}
		const data = parsed.data;

		const rawEvent = (
			data.event ||
			data.notification_name ||
			data.event_type ||
			"ringing"
		).toLowerCase();
		let event: "ringing" | "answered" | "ended" = "ringing";

		if (
			rawEvent.includes("ring") ||
			rawEvent.includes("start") ||
			rawEvent.includes("dial-in")
		) {
			event = "ringing";
		} else if (rawEvent.includes("answer") || rawEvent.includes("connect")) {
			event = "answered";
		} else if (
			rawEvent.includes("end") ||
			rawEvent.includes("hangup") ||
			rawEvent.includes("cdr") ||
			rawEvent.includes("record")
		) {
			event = "ended";
		}

		const callerRaw =
			data.from ||
			data.caller_id ||
			data.caller_number ||
			data.CallerIdNum ||
			data.from_number;
		const targetRaw =
			data.to ||
			data.called_did ||
			data.called_number ||
			data.CalledIdNum ||
			data.to_number;

		const callerPhone = normalizePhoneNumber(callerRaw);
		const targetPhone = normalizePhoneNumber(targetRaw);

		if (!callerPhone.isValid) {
			return reply.status(400).send({
				error: "Missing 'from' phone number",
				message: "Missing or unparseable 'from' caller phone number",
			});
		}

		let resolvedOrgId: string | null = null;
		const routeOrgId = request.params.organizationId;

		if (routeOrgId && UUID_REGEX.test(routeOrgId)) {
			resolvedOrgId = routeOrgId;
		} else if (targetPhone.isValid) {
			const matchedClinic = await withSuperuserBypass(async (tx) => {
				return tx
					.select({ organizationId: clinics.organizationId })
					.from(clinics)
					.where(ilike(clinics.phone, `%${targetPhone.national10}%`))
					.limit(1);
			});
			const clinic = matchedClinic[0];
			if (clinic) {
				resolvedOrgId = clinic.organizationId;
			}
		}

		if (!resolvedOrgId) {
			return reply.status(404).send({
				error: "OrganizationNotFound",
				message: "Could not identify tenant organization for this call webhook",
			});
		}

		const isAuthenticated = await authenticatePbxWebhook(
			request,
			reply,
			resolvedOrgId,
			data,
		);
		if (!isAuthenticated) {
			return reply;
		}

		const rawTs = data.timestamp || data.call_start;
		if (rawTs != null) {
			const numTs =
				typeof rawTs === "number" ? rawTs : Number.parseInt(String(rawTs), 10);
			if (!Number.isNaN(numTs) && numTs > 0) {
				const msgTsSec = numTs > 1e11 ? Math.floor(numTs / 1000) : numTs;
				const nowSec = Math.floor(Date.now() / 1000);
				if (Math.abs(nowSec - msgTsSec) > 300) {
					request.log.warn(
						{ msgTsSec, nowSec, resolvedOrgId },
						"[Telephony] Replay timestamp drift window exceeded (>300s)",
					);
					return reply.status(400).send({
						error: "Timestamp drift window exceeded (>300s)",
					});
				}
			}
		}

		return withTenantCtx(resolvedOrgId, async () => {
			const callId = (
				data.call_id ||
				data.uniqueid ||
				data.CallId ||
				data.entry_id ||
				""
			).trim();
			const recordingUrl = (
				data.recording_url ||
				data.record_url ||
				data.RecUrl ||
				data.link ||
				""
			).trim();

			const rawDuration =
				data.duration ||
				data.duration_seconds ||
				data.billsec ||
				data.talk_time;
			const durationSeconds =
				rawDuration != null
					? Math.max(0, Number.parseInt(String(rawDuration), 10) || 0)
					: 0;

			// Match Patient within this tenant
			const searchPatient = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, resolvedOrgId),
						or(
							eq(patients.phone, callerPhone.e164),
							ilike(patients.phone, `%${callerPhone.national10}%`),
						),
					),
				)
				.limit(1);

			let matchedPatient = searchPatient[0] || null;

			if (event === "ringing") {
				let matchedLead: typeof crmLeads.$inferSelect | null = null;

				if (!matchedPatient && callerPhone.national10.length >= 7) {
					try {
						const existingLeads = await db
							.select()
							.from(crmLeads)
							.where(
								and(
									eq(crmLeads.organizationId, resolvedOrgId),
									or(
										eq(crmLeads.phone, callerPhone.e164),
										ilike(crmLeads.phone, `%${callerPhone.national10}%`),
									),
								),
							)
							.limit(1);

						if (existingLeads.length > 0) {
							matchedLead = existingLeads[0] ?? null;
						} else {
							const insertedLeads = await db
								.insert(crmLeads)
								.values({
									organizationId: resolvedOrgId,
									name: `Входящий звонок ${callerPhone.e164}`,
									patientName: `Звонок ${callerPhone.e164}`,
									phone: callerPhone.e164,
									source: "telephony",
									status: "new",
									notes: `Автоматический лид из входящего звонка АТС (${callId ? `call_id: ${callId}` : "прямой вызов"})`,
								})
								.returning();
							matchedLead = insertedLeads[0] ?? null;
						}
					} catch (leadErr) {
						request.log.warn(
							{ leadErr, resolvedOrgId },
							"[Telephony] Lead creation lock resolution warning",
						);
					}
				}

				const patientDisplayName =
					matchedPatient?.fullName?.trim() ||
					matchedLead?.patientName?.trim() ||
					"Неизвестный номер";

				wsBroker.broadcastToOrganization(resolvedOrgId, {
					type: "TELEPHONY_INCOMING_CALL",
					payload: {
						phone: callerPhone.e164,
						patientId: matchedPatient?.id || null,
						patientName: patientDisplayName,
						callId: callId || null,
						timestamp: new Date().toISOString(),
					},
				});

				return {
					success: true,
					event: "ringing",
					patientId: matchedPatient?.id || null,
				};
			}

			if (event === "ended") {
				if (callId || recordingUrl) {
					const dedupeConditions: SQL[] = [];
					if (callId) {
						dedupeConditions.push(
							ilike(communicationEvents.message, `%${callId}%`),
						);
					}
					if (recordingUrl) {
						dedupeConditions.push(
							eq(communicationEvents.recordingUrl, recordingUrl),
						);
					}

					const existingEvent = await db
						.select({ id: communicationEvents.id })
						.from(communicationEvents)
						.where(
							and(
								eq(communicationEvents.organizationId, resolvedOrgId),
								or(...dedupeConditions),
							),
						)
						.limit(1);

					if (existingEvent.length > 0) {
						request.log.info(
							{ callId, recordingUrl, resolvedOrgId },
							"[Telephony] CDR event already processed (idempotent skip)",
						);
						return { success: true, duplicate: true };
					}
				}

				if (matchedPatient) {
					let verifiedRecUrl: string | null = null;
					if (recordingUrl) {
						const ssrfCheck = await validateSsrfSafeRecordingUrl(recordingUrl);
						if (ssrfCheck.valid) {
							verifiedRecUrl = recordingUrl;
						} else {
							request.log.warn(
								{ recordingUrl, error: ssrfCheck.error },
								"[Telephony] Recording URL blocked by SSRF filter",
							);
						}
					}

					await db.insert(communicationEvents).values({
						organizationId: resolvedOrgId,
						patientId: matchedPatient.id,
						channel: "phone",
						direction: "inbound",
						status: "completed",
						message: callId
							? `Звонок завершён (call_id: ${callId})`
							: "Звонок завершён (запись приложена)",
						recordingUrl: verifiedRecUrl,
						durationSeconds: durationSeconds > 0 ? durationSeconds : null,
					});
				}

				return { success: true, event: "ended", durationSeconds };
			}

			return { success: true, event };
		});
	};

	server.post<{ Params: { organizationId: string } }>(
		"/:organizationId/webhook",
		handleCallWebhook,
	);
	server.post<{ Params: { organizationId?: string } }>(
		"/webhook",
		handleCallWebhook,
	);

	// --------------------------------------------------------------------------
	// SMS Webhook (supports /:organizationId/sms/webhook and /sms/webhook)
	// --------------------------------------------------------------------------
	const handleSmsWebhook = async (
		request: FastifyRequest<{ Params: { organizationId?: string } }>,
		reply: FastifyReply,
	) => {
		const rawPayload = request.body;
		if (
			!rawPayload ||
			typeof rawPayload !== "object" ||
			Array.isArray(rawPayload)
		) {
			return reply.status(400).send({
				error: "InvalidPayload",
				message: "Request body must be a JSON object",
			});
		}

		const parsed = telephonySmsWebhookPayloadSchema.safeParse(rawPayload);
		if (!parsed.success) {
			return reply
				.status(400)
				.send({ error: "Missing 'from' or 'message'" });
		}
		const data = parsed.data;

		const fromRaw = data.from || data.sender || data.phone;
		const messageText = (data.message || data.text || "").trim();

		const callerPhone = normalizePhoneNumber(fromRaw);
		if (!callerPhone.isValid || !messageText) {
			return reply
				.status(400)
				.send({ error: "Missing 'from' or 'message'" });
		}

		let resolvedOrgId: string | null = null;
		const routeOrgId = request.params.organizationId;

		if (routeOrgId && UUID_REGEX.test(routeOrgId)) {
			resolvedOrgId = routeOrgId;
		} else if (data.to) {
			const targetPhone = normalizePhoneNumber(data.to);
			if (targetPhone.isValid) {
				const matchedClinic = await withSuperuserBypass(async (tx) => {
					return tx
						.select({ organizationId: clinics.organizationId })
						.from(clinics)
						.where(ilike(clinics.phone, `%${targetPhone.national10}%`))
						.limit(1);
				});
				const clinic = matchedClinic[0];
				if (clinic) {
					resolvedOrgId = clinic.organizationId;
				}
			}
		}

		if (!resolvedOrgId) {
			return reply.status(404).send({
				error: "OrganizationNotFound",
				message: "Tenant organization could not be resolved",
			});
		}

		const isAuthenticated = await authenticatePbxWebhook(
			request,
			reply,
			resolvedOrgId,
			data as TelephonyWebhookPayload,
		);
		if (!isAuthenticated) {
			return reply;
		}

		const rawSmsTs = data.timestamp;
		if (rawSmsTs != null) {
			const numTs =
				typeof rawSmsTs === "number"
					? rawSmsTs
					: Number.parseInt(String(rawSmsTs), 10);
			if (!Number.isNaN(numTs) && numTs > 0) {
				const msgTsSec = numTs > 1e11 ? Math.floor(numTs / 1000) : numTs;
				const nowSec = Math.floor(Date.now() / 1000);
				if (Math.abs(nowSec - msgTsSec) > 300) {
					return reply.status(400).send({
						error: "Timestamp drift window exceeded (>300s)",
					});
				}
			}
		}

		return withTenantCtx(resolvedOrgId, async () => {
			const smsId = (data.sms_id || data.call_id || data.id || "").trim();

			if (smsId) {
				const existingSms = await db
					.select({ id: communicationEvents.id })
					.from(communicationEvents)
					.where(
						and(
							eq(communicationEvents.organizationId, resolvedOrgId),
							ilike(communicationEvents.message, `%${smsId}%`),
						),
					)
					.limit(1);

				if (existingSms.length > 0) {
					request.log.info(
						{ smsId, resolvedOrgId },
						"[Telephony] SMS webhook duplicate received (idempotent skip)",
					);
					return { success: true, duplicate: true };
				}
			}

			const searchPatient = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, resolvedOrgId),
						or(
							eq(patients.phone, callerPhone.e164),
							ilike(patients.phone, `%${callerPhone.national10}%`),
						),
					),
				)
				.limit(1);

			let patient = searchPatient[0] || null;

			if (!patient) {
				const inserted = await db
					.insert(patients)
					.values({
						organizationId: resolvedOrgId,
						fullName: `SMS User ${callerPhone.e164}`,
						phone: callerPhone.e164,
						notes: "Лид из входящего SMS",
						status: "active",
					})
					.returning();
				patient = inserted[0] || null;
			}

			if (!patient) {
				return reply.status(500).send({
					error: "PatientPersistenceError",
					message: "Failed to persist patient",
				});
			}

			await db.insert(communicationEvents).values({
				organizationId: resolvedOrgId,
				patientId: patient.id,
				channel: "sms",
				direction: "inbound",
				status: "delivered",
				message: smsId ? `${messageText} [sms_id: ${smsId}]` : messageText,
			});

			wsBroker.broadcastToOrganization(resolvedOrgId, {
				type: "INBOX_NEW_MESSAGE",
				payload: {
					channel: "sms",
					patientId: patient.id,
					text: messageText,
				},
			});

			return { success: true };
		});
	};

	server.post<{ Params: { organizationId: string } }>(
		"/:organizationId/sms/webhook",
		handleSmsWebhook,
	);
	server.post<{ Params: { organizationId?: string } }>(
		"/sms/webhook",
		handleSmsWebhook,
	);

	// --------------------------------------------------------------------------
	// Secure Call Recording Streaming Proxy (SSRF, Ownership & Permission Protected)
	// --------------------------------------------------------------------------
	server.get<{
		Params: { eventId: string };
	}>(
		"/recordings/:eventId/stream",
		{
			config: {
				tenantTxSelfManaged: true,
			},
		},
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"stream call recording",
				))
			) {
				return;
			}

			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"stream call recording",
			);
			if (!orgId) return;

			const { eventId } = request.params;
			if (!UUID_REGEX.test(eventId)) {
				return reply
					.status(400)
					.send({ error: "InvalidEventId", message: "Invalid event ID format" });
			}

			const eventRow = await withTenantCtx(orgId, async () => {
				const rows = await db
					.select({
						id: communicationEvents.id,
						recordingUrl: communicationEvents.recordingUrl,
						audioFormat: communicationEvents.audioFormat,
					})
					.from(communicationEvents)
					.where(
						and(
							eq(communicationEvents.id, eventId),
							eq(communicationEvents.organizationId, orgId),
						),
					)
					.limit(1);
				return rows[0] || null;
			});

			if (!eventRow || !eventRow.recordingUrl) {
				return reply.status(404).send({
					error: "NotFound",
					message: "Audio recording not found or inaccessible",
				});
			}

			const ssrfVerification = await validateSsrfSafeRecordingUrl(
				eventRow.recordingUrl,
			);
			if (!ssrfVerification.valid || !ssrfVerification.parsedUrl) {
				request.log.error(
					{
						eventId,
						url: eventRow.recordingUrl,
						reason: ssrfVerification.error,
					},
					"[TelephonyStream] SSRF check rejected recording stream request",
				);
				return reply.status(403).send({
					error: "ForbiddenRecordingUrl",
					message:
						"The requested audio recording URL failed security verification",
				});
			}

			const targetUrl = ssrfVerification.parsedUrl;

			return new Promise<void>((resolve) => {
				const client = targetUrl.protocol === "https:" ? https : http;

				const proxyReq = client.get(
					targetUrl.href,
					{
						timeout: 10000,
						headers: {
							"User-Agent": "DenteDentalCRM-AudioProxy/1.0",
						},
					},
					(proxyRes) => {
						const statusCode = proxyRes.statusCode || 500;
						if (statusCode < 200 || statusCode >= 300) {
							reply.status(502).send({
								error: "BadGateway",
								message: `Upstream PBX audio server returned status ${statusCode}`,
							});
							return resolve();
						}

						const contentType =
							proxyRes.headers["content-type"] ||
							eventRow.audioFormat ||
							"audio/mpeg";

						if (
							!contentType.startsWith("audio/") &&
							!contentType.includes("ogg") &&
							!contentType.includes("octet-stream")
						) {
							reply.status(403).send({
								error: "InvalidContentType",
								message: "Upstream resource is not a valid audio stream",
							});
							return resolve();
						}

						reply.raw.writeHead(200, {
							"Content-Type": contentType,
							"Content-Length": proxyRes.headers["content-length"] || "",
							"Accept-Ranges": "bytes",
							"Cache-Control": "private, no-cache, no-store, must-revalidate",
							"X-Content-Type-Options": "nosniff",
						});

						proxyRes.pipe(reply.raw);

						proxyRes.on("end", () => resolve());
						proxyRes.on("error", (err) => {
							request.log.error(
								err,
								"[TelephonyStream] Error in upstream audio pipe",
							);
							if (!reply.raw.headersSent) {
								reply.status(500).send({
									error: "StreamError",
									message: "Failed to stream audio",
								});
							}
							resolve();
						});
					},
				);

				proxyReq.on("timeout", () => {
					proxyReq.destroy();
					if (!reply.raw.headersSent) {
						reply.status(504).send({
							error: "GatewayTimeout",
							message: "Timeout connecting to PBX audio server",
						});
					}
					resolve();
				});

				proxyReq.on("error", (err) => {
					request.log.error(
						err,
						"[TelephonyStream] Connection error to upstream recording server",
					);
					if (!reply.raw.headersSent) {
						reply.status(502).send({
							error: "BadGateway",
							message: "Unable to connect to PBX audio storage",
						});
					}
					resolve();
				});
			});
		},
	);
};
