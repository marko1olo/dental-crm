import { createHash, createHmac, randomBytes } from "node:crypto";
import * as net from "node:net";
import {
	defaultStructuredLogger,
	evaluateTelephonyGatewayStatus,
	type CloudProviderType,
} from "./telephonyGatewayConfig.js";

export async function dispatchMangoCallback(params: {
	callId: string;
	apiKey: string;
	apiSalt: string;
	phone: string;
	extension: string;
}): Promise<{ success: boolean; data?: unknown }> {
	const jsonPayload = JSON.stringify({
		command_id: params.callId,
		from: { extension: params.extension },
		to_number: params.phone,
	});

	const sign = createHash("sha256")
		.update(`${params.apiKey}${jsonPayload}${params.apiSalt}`)
		.digest("hex");

	const body = new URLSearchParams({
		vpbx_api_key: params.apiKey,
		sign,
		json: jsonPayload,
	});

	const response = await fetch(
		"https://app.mango-office.ru/vpbx/commands/callback",
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

	const data = (await response.json().catch(() => ({}))) as unknown;
	return { success: true, data };
}

export async function dispatchZadarmaCallback(params: {
	callId: string;
	apiKey: string;
	apiSecret: string;
	phone: string;
	extension: string;
}): Promise<{ success: boolean; data?: unknown }> {
	const paramsStr = `from=${encodeURIComponent(params.extension)}&to=${encodeURIComponent(params.phone)}`;
	const md5Str = createHash("md5").update(paramsStr).digest("hex");
	const dataToSign = `/v1/request/callback/${paramsStr}${md5Str}`;
	const signature = createHmac("sha1", params.apiSecret)
		.update(dataToSign)
		.digest("base64");

	const response = await fetch("https://api.zadarma.com/v1/request/callback/", {
		method: "POST",
		headers: {
			Authorization: `${params.apiKey}:${signature}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: paramsStr,
		signal: AbortSignal.timeout(5000),
	});

	if (!response.ok) {
		const text = await response.text().catch(() => "");
		throw new Error(
			`Zadarma HTTP ${response.status}: ${text || response.statusText}`,
		);
	}

	const data = (await response.json().catch(() => ({}))) as unknown;
	return { success: true, data };
}

export async function dispatchUisCallback(params: {
	callId: string;
	apiKey: string;
	phone: string;
	extension: string;
}): Promise<{ success: boolean; data?: unknown }> {
	const payload = {
		jsonrpc: "2.0",
		id: params.callId,
		method: "start_employee_call",
		params: {
			access_token: params.apiKey,
			contact: params.phone,
			employee_phone: params.extension,
		},
	};

	const response = await fetch("https://dataapi.uiscom.ru/v2.0", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
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
	return { success: true, data };
}

export async function dispatchAsteriskOriginate(params: {
	callId: string;
	host: string;
	port: number;
	username: string;
	secret: string;
	phone: string;
	channel: string;
	context: string;
	callerId?: string | undefined;
}): Promise<{ success: boolean }> {
	return new Promise<{ success: boolean }>((resolve, reject) => {
		const socket = new net.Socket();
		let loggedIn = false;
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
			cleanup(new Error("Asterisk AMI connection timeout")),
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
					const callerIdHeader = params.callerId
						? `CallerID: ${params.callerId}\r\n`
						: `CallerID: DENTE <${params.phone}>\r\n`;
					socket.write(
						`Action: Originate\r\n` +
							`Channel: ${params.channel}\r\n` +
							`Exten: ${params.phone}\r\n` +
							`Context: ${params.context}\r\n` +
							`Priority: 1\r\n` +
							callerIdHeader +
							`ActionID: ${params.callId}\r\n\r\n`,
					);
					setTimeout(() => {
						if (!settled) {
							socket.write("Action: Logoff\r\n\r\n");
							setTimeout(() => cleanup(), 200);
						}
					}, 300);
				} else if (data.includes("Response: Error")) {
					cleanup(
						new Error(`Asterisk AMI authentication error: ${data.trim()}`),
					);
				}
			}
		});
	});
}

export async function initiateOutboundCall(params: {
	organizationId: string;
	callerPhone: { e164: string; national10: string };
	patientId?: string | null | undefined;
	patientName?: string | undefined;
	staffUserId?: string | null | undefined;
	logger?: {
		warn: (obj: unknown, msg?: string) => void;
		error: (obj: unknown, msg?: string) => void;
	} | undefined;
}): Promise<{
	dispatched: boolean;
	callId: string;
	provider: string;
	error?: string;
}> {
	const callId = `outbound-${Date.now()}-${randomBytes(4).toString("hex")}`;
	const status = await evaluateTelephonyGatewayStatus(params.organizationId);

	const isConfigured =
		status.localPbxOnline ||
		Boolean(
			process.env.MANGO_API_KEY ||
				process.env.MANGO_VPBX_API_KEY ||
				process.env.ZADARMA_API_KEY ||
				process.env.UIS_API_KEY ||
				process.env.ASTERISK_HOST,
		);

	if (!isConfigured) {
		return {
			dispatched: false,
			callId,
			provider: "none",
			error:
				"АТС телефонии не подключена в клинике. Настройте локальный Asterisk или облачную АТС в панели управления.",
		};
	}

	let provider: CloudProviderType = status.localPbxOnline
		? "asterisk"
		: status.fallbackProvider;
	if (
		provider === "mango" &&
		!process.env.MANGO_API_KEY &&
		!process.env.MANGO_VPBX_API_KEY
	) {
		if (process.env.ZADARMA_API_KEY) {
			provider = "zadarma";
		} else if (process.env.UIS_API_KEY || process.env.COMAGIC_API_KEY) {
			provider = "uis";
		}
	}

	const forceLive = process.env.TELEPHONY_FORCE_LIVE_DISPATCH === "1";
	const isTestEnv = process.env.NODE_ENV === "test" && !forceLive;
	const log = params.logger || defaultStructuredLogger;

	if (provider === "mango") {
		const mangoKey =
			process.env.MANGO_API_KEY?.trim() ||
			process.env.MANGO_VPBX_API_KEY?.trim();
		const mangoSalt =
			process.env.MANGO_API_SALT?.trim() ||
			process.env.TELEPHONY_WEBHOOK_SECRET?.trim();

		if (!mangoKey || !mangoSalt) {
			return {
				dispatched: false,
				callId,
				provider: "mango",
				error: "АТС телефонии не подключена в клинике",
			};
		}

		if (!isTestEnv) {
			try {
				await dispatchMangoCallback({
					callId,
					apiKey: mangoKey,
					apiSalt: mangoSalt,
					phone: params.callerPhone.e164,
					extension: process.env.MANGO_DEFAULT_EXTENSION || "101",
				});
			} catch (err) {
				const errMsg = err instanceof Error ? err.message : String(err);
				log.error(
					{ err, provider: "mango" },
					`[Telephony:Mango] Outbound call error: ${errMsg}`,
				);
				return {
					dispatched: false,
					callId,
					provider: "mango",
					error: `Ошибка вызова Mango Office: ${errMsg}`,
				};
			}
		}
	} else if (provider === "zadarma") {
		const zadarmaKey = process.env.ZADARMA_API_KEY?.trim();
		const zadarmaSecret =
			process.env.ZADARMA_API_SECRET?.trim() ||
			process.env.TELEPHONY_WEBHOOK_SECRET?.trim();

		if (!zadarmaKey || !zadarmaSecret) {
			return {
				dispatched: false,
				callId,
				provider: "zadarma",
				error: "АТС телефонии не подключена в клинике",
			};
		}

		if (!isTestEnv) {
			try {
				await dispatchZadarmaCallback({
					callId,
					apiKey: zadarmaKey,
					apiSecret: zadarmaSecret,
					phone: params.callerPhone.e164,
					extension: process.env.ZADARMA_DEFAULT_EXTENSION || "101",
				});
			} catch (err) {
				const errMsg = err instanceof Error ? err.message : String(err);
				log.error(
					{ err, provider: "zadarma" },
					`[Telephony:Zadarma] Outbound call error: ${errMsg}`,
				);
				return {
					dispatched: false,
					callId,
					provider: "zadarma",
					error: `Ошибка вызова Zadarma: ${errMsg}`,
				};
			}
		}
	} else if (provider === "uis") {
		const uisKey =
			process.env.UIS_API_KEY?.trim() || process.env.COMAGIC_API_KEY?.trim();

		if (!uisKey) {
			return {
				dispatched: false,
				callId,
				provider: "uis",
				error: "АТС телефонии не подключена в клинике",
			};
		}

		if (!isTestEnv) {
			try {
				await dispatchUisCallback({
					callId,
					apiKey: uisKey,
					phone: params.callerPhone.e164,
					extension:
						process.env.UIS_DEFAULT_EXTENSION ||
						process.env.COMAGIC_DEFAULT_EXTENSION ||
						"101",
				});
			} catch (err) {
				const errMsg = err instanceof Error ? err.message : String(err);
				log.error(
					{ err, provider: "uis" },
					`[Telephony:UIS] Outbound call error: ${errMsg}`,
				);
				return {
					dispatched: false,
					callId,
					provider: "uis",
					error: `Ошибка вызова UIS/CoMagic: ${errMsg}`,
				};
			}
		}
	} else if (provider === "asterisk") {
		const amiSecret = process.env.ASTERISK_AMI_SECRET?.trim();
		const amiHost =
			process.env.ASTERISK_AMI_HOST?.trim() || process.env.ASTERISK_HOST?.trim();

		if (!amiSecret || !amiHost) {
			return {
				dispatched: false,
				callId,
				provider: "asterisk",
				error: "АТС телефонии не подключена в клинике",
			};
		}

		if (!isTestEnv) {
			try {
				await dispatchAsteriskOriginate({
					callId,
					host: amiHost,
					port:
						Number.parseInt(process.env.ASTERISK_AMI_PORT || "5038", 10) || 5038,
					username: process.env.ASTERISK_AMI_USER?.trim() || "admin",
					secret: amiSecret,
					phone: params.callerPhone.e164,
					channel: process.env.ASTERISK_DEFAULT_CHANNEL || "PJSIP/101",
					context: process.env.ASTERISK_OUTBOUND_CONTEXT || "from-internal",
				});
			} catch (err) {
				const errMsg = err instanceof Error ? err.message : String(err);
				log.error(
					{ err, provider: "asterisk" },
					`[Telephony:Asterisk] Outbound call error: ${errMsg}`,
				);
				return {
					dispatched: false,
					callId,
					provider: "asterisk",
					error: `Ошибка вызова Asterisk AMI: ${errMsg}`,
				};
			}
		}
	} else {
		return {
			dispatched: false,
			callId,
			provider,
			error: "АТС телефонии не подключена в клинике",
		};
	}

	return {
		dispatched: true,
		callId,
		provider,
	};
}
