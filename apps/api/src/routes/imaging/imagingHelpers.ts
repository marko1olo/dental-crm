import { createHash, timingSafeEqual } from "node:crypto";
import { setImmediate as yieldImmediate } from "node:timers/promises";
import type { FastifyReply, FastifyRequest } from "fastify";
import { denteAdminSecretHeader, unguardedBypassAllowed } from "../../accessGuard.js";

export type ImagingPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false; error?: unknown };
};

export function parseImagingPayload<T>(
	schema: ImagingPayloadSchema<T>,
	value: unknown,
	message: string,
) {
	const parsed = schema.safeParse(value);
	if (parsed.success) return { ok: true as const, data: parsed.data };
	return {
		ok: false as const,
		response: {
			error: "ImagingValidationError",
			message,
		},
	};
}

export function configuredDicomWebSettingsSecret(): string | null {
	return process.env.DENTE_SETTINGS_ADMIN_SECRET?.trim() || null;
}

export function dicomWebSettingsUnguardedAllowed(): boolean {
	return unguardedBypassAllowed("DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS");
}

export function timingSafeDicomWebSecretEqual(
	providedSecret: string | null,
	expectedSecret: string,
): boolean {
	if (!providedSecret) return false;
	const providedHash = createHash("sha256").update(providedSecret).digest();
	const expectedHash = createHash("sha256").update(expectedSecret).digest();
	return timingSafeEqual(providedHash, expectedHash);
}

export async function requireDicomWebSettingsAccess(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<boolean> {
	const adminSecret = configuredDicomWebSettingsSecret();
	if (!adminSecret) {
		if (dicomWebSettingsUnguardedAllowed()) return true;
		reply.code(503).send({
			error: "DicomWebSettingsAdminSecretMissing",
			message:
				"На сервере не задан секрет администратора клиники для проверки архива снимков.",
		});
		return false;
	}

	const providedSecret = request.headers[denteAdminSecretHeader];
	const normalizedProvidedSecret = Array.isArray(providedSecret)
		? providedSecret[0]
		: providedSecret;
	if (
		timingSafeDicomWebSecretEqual(
			typeof normalizedProvidedSecret === "string"
				? normalizedProvidedSecret
				: null,
			adminSecret,
		)
	) {
		return true;
	}

	reply.code(403).send({
		error: "DicomWebSettingsAdminSecretRequired",
		message:
			"Для проверки архива снимков нужен действующий секрет администратора клиники.",
	});
	return false;
}

export type ApiDicomScanOptions = {
	signal?: AbortSignal;
};

export type ApiDicomFolderTraversalLimits = {
	maxFolders?: number;
	maxEntriesPerFolder?: number;
};

export type ApiDicomScanYieldState = {
	units: number;
	lastYieldAtMs: number;
};

export const apiDicomScanYieldEveryUnits = 64;
export const apiDicomScanYieldEveryMs = 20;
export const apiDicomDefaultMaxFolders = 900;
export const apiDicomDefaultMaxEntriesPerFolder = 2000;
export const apiDicomScanAbortErrorName = "AbortError";
export const apiDicomScanAbortMessage =
	"Сканирование локальных снимков остановлено: клиент закрыл запрос или отменил действие.";

export function createApiDicomScanYieldState(): ApiDicomScanYieldState {
	return { units: 0, lastYieldAtMs: Date.now() };
}

export function createImagingRequestAbortSignal(request: FastifyRequest): AbortSignal {
	const controller = new AbortController();
	request.raw.once("close", () => {
		if (
			request.raw.destroyed ||
			request.raw.errored ||
			!request.raw.readableEnded
		) {
			controller.abort();
		}
	});
	return controller.signal;
}

export function throwIfApiDicomScanAborted(signal?: AbortSignal) {
	if (!signal?.aborted) return;
	const error = new Error(apiDicomScanAbortMessage);
	error.name = apiDicomScanAbortErrorName;
	throw error;
}

export function isApiDicomScanAbortError(error: unknown) {
	if (error instanceof Error && error.name === apiDicomScanAbortErrorName)
		return true;
	if (error instanceof DOMException && error.name === "TimeoutError")
		return true;
	return false;
}

export async function maybeYieldApiDicomScan(
	state: ApiDicomScanYieldState,
	signal?: AbortSignal,
) {
	throwIfApiDicomScanAborted(signal);
	state.units += 1;
	const now = Date.now();
	if (
		state.units % apiDicomScanYieldEveryUnits !== 0 &&
		now - state.lastYieldAtMs < apiDicomScanYieldEveryMs
	)
		return;
	state.lastYieldAtMs = now;
	await yieldImmediate(undefined, { signal });
	throwIfApiDicomScanAborted(signal);
}

export function sendImagingScanCancelled(reply: FastifyReply) {
	return reply.code(499).send({
		error: "ImagingScanCancelled",
		message:
			"Сканирование локальных снимков остановлено. Повторите действие с более узкой папкой или меньшим лимитом.",
	});
}

export async function runAbortableImagingScan<T>(
	request: FastifyRequest,
	reply: FastifyReply,
	operation: (options: ApiDicomScanOptions) => Promise<T>,
) {
	const requestSignal = createImagingRequestAbortSignal(request);
	const timeoutSignal = AbortSignal.timeout(300_000);
	const signal = AbortSignal.any([requestSignal, timeoutSignal]);

	try {
		return await operation({ signal });
	} catch (error) {
		if (isApiDicomScanAbortError(error)) return sendImagingScanCancelled(reply);
		throw error;
	}
}

export const imagingStudyNotFoundError = "ImagingStudyNotFound" as const;
export const imagingStudyScopeError = "ImagingStudyScopeError" as const;

export function sendImagingStudyNotFound(reply: FastifyReply) {
	return reply.code(404).send({
		error: imagingStudyNotFoundError,
		message: "Снимок не найден.",
	});
}

export function sendImagingStudyScopeError(
	reply: FastifyReply,
	statusCode: 404 | 409,
	message: string,
) {
	return reply.code(statusCode).send({
		error: imagingStudyScopeError,
		message,
	});
}
