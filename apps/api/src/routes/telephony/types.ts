import { z } from "zod";

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

export type TelephonyProvider =
	| "mango"
	| "domru"
	| "uis"
	| "megafon"
	| "zadarma"
	| "asterisk"
	| "generic";

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

export type TelephonySmsWebhookPayload = z.infer<typeof telephonySmsWebhookPayloadSchema>;
