import { logger } from "../../../utils/logger";
import { staffRoleLabels } from "../../../workspaceUiLabels";

export const WIDGET_LOAD_ERROR_MESSAGE =
	"Не удалось загрузить, обновите страницу";

export type WidgetListState<T> =
	| { readonly status: "loading" }
	| { readonly status: "error"; readonly message: string }
	| { readonly status: "ready"; readonly items: readonly T[] };

export type WidgetListResult<T> =
	| { readonly ok: true; readonly items: T[] }
	| { readonly ok: false; readonly message: string };

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

export function parseWidgetListPayload<T>(
	status: number,
	rawBody: string,
	toItem: (row: Record<string, unknown>) => T,
): WidgetListResult<T> {
	if (status < 200 || status >= 300) {
		return { ok: false, message: WIDGET_LOAD_ERROR_MESSAGE };
	}
	const trimmed = rawBody.trim();
	if (trimmed.length === 0) {
		return { ok: false, message: WIDGET_LOAD_ERROR_MESSAGE };
	}
	let payload: unknown;
	try {
		payload = JSON.parse(trimmed);
	} catch {
		return { ok: false, message: WIDGET_LOAD_ERROR_MESSAGE };
	}
	const envelope = asRecord(payload);
	const list = Array.isArray(payload)
		? payload
		: envelope && Array.isArray(envelope.data)
			? (envelope.data as unknown[])
			: null;
	if (!list) {
		return { ok: false, message: WIDGET_LOAD_ERROR_MESSAGE };
	}
	return {
		ok: true,
		items: list.flatMap((row) =>
			// biome-ignore lint/style/noNonNullAssertion: safe assertion after asRecord check
			asRecord(row) ? [toItem(asRecord(row)!)] : [],
		),
	};
}

export async function fetchWidgetList<T>(
	url: string,
	headers: Record<string, string>,
	toItem: (row: Record<string, unknown>) => T,
	signal?: AbortSignal,
): Promise<WidgetListResult<T>> {
	try {
		const response = await fetch(
			url,
			signal ? { headers, signal } : { headers },
		);
		const raw = await response.text();
		return parseWidgetListPayload(response.status, raw, toItem);
	} catch (error) {
		logger.error(`[analytics widget fetch error] ${url}:`, error);
		return { ok: false, message: WIDGET_LOAD_ERROR_MESSAGE };
	}
}

export function textOr(value: unknown, fallback: string): string {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: fallback;
}

export function numberOrNull(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

export const UNKNOWN_VALUE_TEXT = "—";

const ROLE_KEY_ALIASES: Record<string, keyof typeof staffRoleLabels> = {
	admin: "administrator",
	administrator: "administrator",
	doctor: "doctor",
	assistant: "assistant",
	owner: "owner",
	manager: "manager",
};

export function roleLabel(value: unknown, fallback = "роль не указана"): string {
	const raw = typeof value === "string" ? value.trim() : "";
	if (raw.length === 0) return fallback;
	const key = ROLE_KEY_ALIASES[raw.toLowerCase()];
	return key ? staffRoleLabels[key] : raw;
}
