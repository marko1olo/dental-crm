import { actionFailureToast } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import type { ClipboardItem } from "./clipboardTypes";
import {
	clipboardWriteHeaders,
	loadFailureText,
	writeFailureText,
} from "./clipboardUtils";

export async function fetchClipboardItems(
	headers: Record<string, string>,
): Promise<{ items?: ClipboardItem[]; error?: string }> {
	let response: Response;
	try {
		response = await fetch("/api/schedule/clipboard-items", { headers });
	} catch {
		return {
			error:
				"Сервер клиники не ответил. Проверьте, что программа клиники запущена и есть сеть.",
		};
	}
	const payload = (await response.json().catch((err) => {
		logger.error("[Dente]", err);
		showToast(
			actionFailureToast(
				"Ответ с буфером расписания не прочитан",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	})) as ClipboardItem[] | { message?: string } | null;

	if (!response.ok) {
		const msg =
			payload && !Array.isArray(payload) && typeof payload.message === "string"
				? payload.message
				: null;
		return { error: loadFailureText(response.status, msg) };
	}
	if (!Array.isArray(payload)) {
		return { error: "Сервер ответил, но списка буфера в ответе нет." };
	}
	return { items: payload };
}

export async function deleteClipboardItem(
	id: string,
): Promise<{ ok: boolean; error?: string }> {
	let response: Response;
	try {
		response = await fetch(`/api/schedule/clipboard-items/${id}`, {
			method: "DELETE",
			headers: clipboardWriteHeaders(),
		});
	} catch {
		return { ok: false, error: "Сервер клиники не ответил. Запись в буфере не убрана." };
	}
	if (!response.ok) {
		return { ok: false, error: await writeFailureText(response, "убрать запись из буфера") };
	}
	return { ok: true };
}

export async function pasteClipboardItem(
	id: string,
	startsAtIso: string,
): Promise<{ ok: boolean; error?: string; dashboard?: unknown }> {
	let response: Response;
	try {
		response = await fetch(`/api/schedule/clipboard-items/${id}/paste`, {
			method: "POST",
			headers: clipboardWriteHeaders(),
			body: JSON.stringify({ startsAt: startsAtIso }),
		});
	} catch {
		return {
			ok: false,
			error: "Сервер клиники не ответил. Приём из буфера не вставлен.",
		};
	}
	if (!response.ok) {
		return {
			ok: false,
			error: await writeFailureText(response, "вставить приём из буфера"),
		};
	}
	const dashboard = await response.json().catch((err) => {
		logger.error("[Dente]", err);
		showToast(
			actionFailureToast(
				"Ответ после вставки приёма не прочитан",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	});
	return { ok: true, dashboard };
}
