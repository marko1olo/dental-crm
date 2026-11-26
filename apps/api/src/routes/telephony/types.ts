import { z } from "zod";

import type { TelephonyProvider } from "@dental/shared";

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
	"missed",
	"no-answer",
	"no_answer",
	"busy",
	"cancel",
	"lost_call",
]);

export type TelephonyCallEvent = z.infer<typeof telephonyCallEventSchema>;

export type NormalizedCallAction = "ringing" | "answered" | "ended" | "missed";

export type { TelephonyProvider };

export function escapeLikePattern(raw: string): string {
	return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export const telephonyOutboundCallBodySchema = z
	.object({
		phone: z.string().trim().min(1).max(64),
		patientId: z.string().uuid().optional(),
		patientName: z.string().trim().max(200).optional(),
	})
	.strict();

export const telephonyCallUpdateBodySchema = z
	.object({
		note: z.string().max(4000).optional(),
		clinicalNote: z.string().max(4000).optional(),
		message: z.string().max(4000).optional(),
		patientId: z.string().uuid().optional(),
		callerPhone: z.string().max(64).optional(),
		phone: z.string().max(64).optional(),
		direction: z.enum(["inbound", "outbound"]).optional(),
	})
	.strict();

export const telephonyAnswerCallBodySchema = z
	.object({
		callId: z.string().trim().min(1).max(200),
		phone: z.string().trim().min(1).max(64),
		patientId: z.string().uuid().optional(),
		lineId: z.union([z.literal(1), z.literal(2)]).optional(),
		utm_source: z.string().max(200).optional(),
		utm_campaign: z.string().max(200).optional(),
		utm_medium: z.string().max(200).optional(),
		advertising_channel: z.string().max(200).optional(),
		virtualNumber: z.string().max(64).optional(),
	})
	.strict();

export const telephonyEndCallBodySchema = z
	.object({
		callId: z.string().trim().min(1).max(200),
		phone: z.string().trim().min(1).max(64),
		patientId: z.string().uuid().optional(),
		direction: z.enum(["inbound", "outbound"]).optional(),
		durationSeconds: z.coerce.number().finite().min(0).max(86400 * 7).optional(),
		recordingUrl: z.string().max(2000).optional(),
		outcome: z.string().max(200).optional(),
		notes: z.string().max(4000).optional(),
		utm_source: z.string().max(200).optional(),
		utm_campaign: z.string().max(200).optional(),
		utm_medium: z.string().max(200).optional(),
		advertising_channel: z.string().max(200).optional(),
		virtualNumber: z.string().max(64).optional(),
	})
	.strict();

export const telephonySipCredentialsBodySchema = z
	.object({
		extension: z.string().trim().min(1).max(64).optional(),
		staffFullName: z.string().trim().max(200).optional(),
	})
	.strict();

export const telephonySipFailoverBodySchema = z
	.object({
		forceCloudFallback: z.boolean(),
	})
	.strict();

export const telephonySipTransferBodySchema = z
	.object({
		callId: z.string().trim().min(1).max(200),
		targetExtensionOrPhone: z.string().trim().min(1).max(64),
		transferType: z.enum(["blind", "attended"]).optional().default("blind"),
	})
	.strict();

export const asteriskAmiEventBodySchema = z
	.object({
		event: z.string().trim().min(1).max(120),
		channel: z.string().max(200).optional(),
		callerIdNum: z.string().max(64).optional(),
		callerIdName: z.string().max(200).optional(),
		exten: z.string().max(64).optional(),
		uniqueid: z.string().max(200).optional(),
		linkedid: z.string().max(200).optional(),
		duration: z.union([z.number(), z.string()]).optional(),
		billsec: z.union([z.number(), z.string()]).optional(),
		recordingUrl: z.string().max(2000).optional(),
	})
	.strict();

export const telephonyWebhookPayloadSchema = z.object({
	event: z.string().optional(),
	notification_name: z.string().optional(),
	event_type: z.string().optional(),
	cmd: z.string().optional(),
	type: z.string().optional(),
	from: z.string().optional(),
	caller_id: z.string().optional(),
	caller_number: z.string().optional(),
	CallerIdNum: z.string().optional(),
	from_number: z.string().optional(),
	caller: z.string().optional(),
	client: z.string().optional(),
	to: z.string().optional(),
	called_did: z.string().optional(),
	called_number: z.string().optional(),
	CalledIdNum: z.string().optional(),
	to_number: z.string().optional(),
	called: z.string().optional(),
	call_id: z.string().optional(),
	call_session_id: z.string().optional(),
	CallId: z.string().optional(),
	callid: z.string().optional(),
	uniqueid: z.string().optional(),
	entry_id: z.string().optional(),
	recording_url: z.string().optional(),
	record_url: z.string().optional(),
	RecUrl: z.string().optional(),
	link: z.string().optional(),
	duration: z.union([z.number(), z.string()]).optional(),
	duration_seconds: z.union([z.number(), z.string()]).optional(),
	wait_time: z.union([z.number(), z.string()]).optional(),
	waiting_duration: z.union([z.number(), z.string()]).optional(),
	billsec: z.union([z.number(), z.string()]).optional(),
	talk_time: z.union([z.number(), z.string()]).optional(),
	timestamp: z.union([z.number(), z.string()]).optional(),
	call_start: z.union([z.number(), z.string()]).optional(),
	call_end: z.union([z.number(), z.string()]).optional(),
	call_duration: z.union([z.number(), z.string()]).optional(),
	api_key: z.string().optional(),
	vpbx_api_key: z.string().optional(),
	crm_token: z.string().optional(),
	sign: z.string().optional(),
	signature: z.string().optional(),
	hash: z.string().optional(),
	user: z.string().optional(),
	utm_source: z.string().optional(),
	utm_medium: z.string().optional(),
	utm_campaign: z.string().optional(),
	utm_content: z.string().optional(),
	utm_term: z.string().optional(),
	advertising_channel: z.string().optional(),
	virtual_number: z.string().optional(),
	channel: z.string().optional(),
	transcript: z.string().optional(),
	transcription: z.string().optional(),
	transcription_snippet: z.string().optional(),
	ai_summary: z.string().optional(),
	sentiment: z.string().optional(),
	gravitel_call_id: z.string().optional(),
	voice_call_id: z.string().optional(),
	provider: z.string().optional(),
});

export type TelephonyWebhookPayload = z.infer<typeof telephonyWebhookPayloadSchema>;

export const telephonyTranscriptBodySchema = z
	.object({
		callId: z.string().trim().min(1).max(200).optional(),
		patientPhone: z.string().trim().max(40).optional(),
		durationSeconds: z.number().int().min(0).max(86400 * 7).optional(),
		transcript: z.string().trim().min(1).max(50000),
		sentiment: z.enum(["neutral", "positive", "negative"]).optional(),
		aiSummary: z.string().trim().max(4000).optional(),
	})
	.strict();

export type TelephonyTranscriptBody = z.infer<typeof telephonyTranscriptBodySchema>;

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

export type TelephonySmsWebhookPayload = z.infer<typeof telephonySmsWebhookPayloadSchema>;
