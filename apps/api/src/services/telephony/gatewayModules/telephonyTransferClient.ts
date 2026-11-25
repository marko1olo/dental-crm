import { createHash } from "node:crypto";
import * as net from "node:net";
import { safeLogError } from "../../../observability/logger.js";
import { wsBroker } from "../../websocketBroker.js";
import { defaultStructuredLogger } from "./telephonyGatewayConfig.js";

export async function dispatchAsteriskTransfer(params: {
	callId: string;
	host: string;
	port: number;
	username: string;
	secret: string;
	channel: string;
	exten: string;
	context: string;
	transferType: "blind" | "attended";
}): Promise<{ success: boolean }> {
	return new Promise<{ success: boolean }>((resolve, reject) => {
		const socket = new net.Socket();
		let loggedIn = false;
		let actionSent = false;
		let settled = false;

		const cleanup = (err?: Error) => {
			if (settled) return;
			settled = true;
			socket.destroy();
			if (err) reject(err);
			else resolve({ success: true });
		};

		socket.setTimeout(4000);
		socket.once("timeout", () =>
			cleanup(new Error("Asterisk AMI transfer timeout")),
		);
		socket.once("error", (err) => cleanup(err));

		socket.connect(params.port, params.host, () => {
			socket.write(
				`Action: Login\r\nUsername: ${params.username}\r\nSecret: ${params.secret}\r\n\r\n`,
			);
		});

		socket.on("data", (chunk) => {
			const data = chunk.toString("utf8");
			if (!loggedIn) {
				if (
					data.includes("Response: Success") ||
					data.includes("Message: Authentication accepted")
				) {
					loggedIn = true;
					actionSent = true;
					const amiAction =
						params.transferType === "attended" ? "Atxfer" : "Redirect";
					socket.write(
						`Action: ${amiAction}\r\n` +
							`Channel: ${params.channel}\r\n` +
							`Exten: ${params.exten}\r\n` +
							`Context: ${params.context}\r\n` +
							`Priority: 1\r\n` +
							`ActionID: ${params.callId}\r\n\r\n`,
					);
					return;
				}
				if (data.includes("Response: Error")) {
					cleanup(
						new Error(`Asterisk AMI authentication error: ${data.trim()}`),
					);
				}
				return;
			}
			if (actionSent) {
				if (data.includes("Response: Success")) {
					socket.write("Action: Logoff\r\n\r\n");
					cleanup();
				} else if (data.includes("Response: Error")) {
					cleanup(new Error(`Asterisk AMI transfer rejected: ${data.trim()}`));
				}
			}
		});
	});
}

export async function transferCall(params: {
	organizationId: string;
	callId: string;
	targetExtensionOrPhone: string;
	transferType: "blind" | "attended";
	initiatedByUserId?: string | undefined;
	logger?: {
		warn: (obj: unknown, msg?: string) => void;
		error: (obj: unknown, msg?: string) => void;
	} | undefined;
}): Promise<{
	success: boolean;
	statusCode?: number;
	error?: string;
	message?: string;
	callId: string;
	target: string;
	transferType: "blind" | "attended";
	status: "transferred" | "initiated" | "failed";
	provider?: string;
	timestamp: string;
}> {
	const now = new Date().toISOString();
	const cleanTarget = params.targetExtensionOrPhone.trim();
	const cleanCallId = params.callId.trim();
	const log = params.logger || defaultStructuredLogger;

	const amiSecret = process.env.ASTERISK_AMI_SECRET?.trim();
	const amiHost =
		process.env.ASTERISK_AMI_HOST?.trim() || process.env.ASTERISK_HOST?.trim();
	const mangoKey =
		process.env.MANGO_API_KEY?.trim() ||
		process.env.MANGO_VPBX_API_KEY?.trim();
	const mangoSalt =
		process.env.MANGO_API_SALT?.trim() ||
		process.env.TELEPHONY_WEBHOOK_SECRET?.trim();
	const uisKey =
		process.env.UIS_API_KEY?.trim() || process.env.COMAGIC_API_KEY?.trim();

	let activeProvider: "asterisk" | "mango" | "uis" | null = null;
	if (amiSecret && amiHost) {
		activeProvider = "asterisk";
	} else if (mangoKey && mangoSalt) {
		activeProvider = "mango";
	} else if (uisKey) {
		activeProvider = "uis";
	}

	if (!activeProvider) {
		return {
			success: false,
			statusCode: 422,
			error: "TelephonyTransferNotConfigured",
			message:
				"Шлюз перевода звонков АТС (Asterisk AMI / Mango / UIS) не настроен в клинике.",
			callId: cleanCallId,
			target: cleanTarget,
			transferType: params.transferType,
			status: "failed",
			timestamp: now,
		};
	}

	try {
		if (activeProvider === "asterisk" && amiHost && amiSecret) {
			const channel = cleanCallId.includes("/")
				? cleanCallId
				: `${process.env.ASTERISK_DEFAULT_CHANNEL || "PJSIP/101"}-${cleanCallId}`;
			await dispatchAsteriskTransfer({
				callId: cleanCallId,
				host: amiHost,
				port: Number.parseInt(process.env.ASTERISK_AMI_PORT || "5038", 10) || 5038,
				username: process.env.ASTERISK_AMI_USER?.trim() || "admin",
				secret: amiSecret,
				channel,
				exten: cleanTarget,
				context: process.env.ASTERISK_OUTBOUND_CONTEXT || "from-internal",
				transferType: params.transferType,
			});
		} else if (activeProvider === "mango" && mangoKey && mangoSalt) {
			const jsonPayload = JSON.stringify({
				command_id: `transfer-${cleanCallId}-${Date.now()}`,
				call_id: cleanCallId,
				method: params.transferType === "attended" ? "consult" : "blind",
				to_number: cleanTarget,
			});
			const sign = createHash("sha256")
				.update(`${mangoKey}${jsonPayload}${mangoSalt}`)
				.digest("hex");
			const body = new URLSearchParams({
				vpbx_api_key: mangoKey,
				sign,
				json: jsonPayload,
			});
			const response = await fetch(
				"https://app.mango-office.ru/vpbx/commands/transfer",
				{
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					body: body.toString(),
					signal: AbortSignal.timeout(5000),
				},
			);
			if (!response.ok) {
				const text = await response.text().catch(() => "");
				throw new Error(
					`Mango HTTP ${response.status}: ${text || response.statusText}`,
				);
			}
		} else if (activeProvider === "uis" && uisKey) {
			const response = await fetch("https://dataapi.uiscom.ru/v2.0", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: cleanCallId,
					method: "transfer_call",
					params: {
						access_token: uisKey,
						call_session_id: cleanCallId,
						destination: cleanTarget,
						is_attended: params.transferType === "attended",
					},
				}),
				signal: AbortSignal.timeout(5000),
			});
			if (!response.ok) {
				const text = await response.text().catch(() => "");
				throw new Error(
					`UIS HTTP ${response.status}: ${text || response.statusText}`,
				);
			}
			const data = (await response.json().catch(() => ({}))) as {
				error?: { message?: string };
			};
			if (data?.error) {
				throw new Error(
					`UIS API error: ${data.error.message || JSON.stringify(data.error)}`,
				);
			}
		}
	} catch (err) {
		const errMsg = err instanceof Error ? err.message : String(err);
		log.error(
			{ err: safeLogError(err), provider: activeProvider, callId: cleanCallId },
			"[TelephonyGatewayService] Call transfer command failed",
		);
		return {
			success: false,
			statusCode: 502,
			error: "TelephonyTransferFailed",
			message: `Не удалось выполнить перевод вызова через ${activeProvider}: ${errMsg}`,
			callId: cleanCallId,
			target: cleanTarget,
			transferType: params.transferType,
			status: "failed",
			provider: activeProvider,
			timestamp: now,
		};
	}

	wsBroker.broadcastToOrganization(params.organizationId, {
		type: "TELEPHONY_CALL_TRANSFERRED",
		payload: {
			callId: cleanCallId,
			target: cleanTarget,
			transferType: params.transferType,
			initiatedByUserId: params.initiatedByUserId || null,
			provider: activeProvider,
			timestamp: now,
		},
	});

	return {
		success: true,
		callId: cleanCallId,
		target: cleanTarget,
		transferType: params.transferType,
		status: params.transferType === "blind" ? "transferred" : "initiated",
		provider: activeProvider,
		timestamp: now,
	};
}
