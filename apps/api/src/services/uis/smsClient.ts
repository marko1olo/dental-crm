import { z } from "zod";
import { MessageTemplateEngine } from "../communications/MessageTemplateEngine.js";

const uisMessageResponseSchema = z.object({
	id: z.string().optional(),
	status: z.string().optional(),
	error: z.string().optional(),
});

export interface SendSmsParams {
	patientPhone: string;
	message: string;
}

export async function sendSmsViaUis(params: SendSmsParams): Promise<boolean> {
	// 152-ФЗ / 323-ФЗ ст. 13: Аппаратная защита — отказ при наличии врачебной тайны
	const leakCheck = MessageTemplateEngine.detectMedicalSecrecyLeaks(params.message);
	if (leakCheck.hasLeak) {
		throw new Error(
			`UIS SMS dispatch blocked under 323-FZ Art. 13: message contains medical secrecy leaks (${leakCheck.reasons.join("; ")})`,
		);
	}

	const token = process.env.UIS_API_TOKEN;
	const accountId = process.env.UIS_ACCOUNT_ID;
	const channelId = process.env.UIS_SMS_CHANNEL_ID;

	if (!token || !accountId || !channelId) {
		throw new Error(
			"UIS SMS integration is not configured. Missing UIS_API_TOKEN, UIS_ACCOUNT_ID, or UIS_SMS_CHANNEL_ID.",
		);
	}

	const url = "https://chat-integration-api-prod.uiscom.ru/v1/adapter/message";

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			account_id: accountId,
			channel_id: channelId,
			// patientPhone acts as the chat_id in SMS channels
			chat_id: params.patientPhone,
			text: params.message,
			source: "operator",
		}),
	});

	if (!response.ok) {
		const raw = await response.text();
		throw new Error(`UIS API error ${response.status}: ${raw}`);
	}

	const data = await response.json();
	const parsed = uisMessageResponseSchema.safeParse(data);
	if (!parsed.success) {
		throw new Error(`UIS API unexpected response format: ${JSON.stringify(data)}`);
	}
	if (parsed.data.error) {
		throw new Error(`UIS API returned error: ${parsed.data.error}`);
	}

	return true;
}
