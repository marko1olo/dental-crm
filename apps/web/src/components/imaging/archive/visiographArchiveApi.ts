/**
 * visiographArchiveApi.ts — API запросы для работы с архивом снимков пациента
 * Mandate 8b: строго <= 120 строк.
 */

import { actionFailureToast } from "../../../lib/panelStateText.js";
import { logger } from "../../../utils/logger.js";
import { showToast } from "../../GlobalToast.js";
import type { XrayScan } from "../VisiographScanHelpers.js";

export async function fetchFullXrayScan(
	scanId: string,
	headers: Record<string, string>,
): Promise<{ data?: XrayScan | undefined; error?: string | undefined }> {
	try {
		const res = await fetch(`/api/xray/scans/${encodeURIComponent(scanId)}`, { headers });
		if (!res.ok) {
			logger.error(`[useVisiographArchive] полный снимок не открыт, ${res.status}`);
			const msg = res.status === 404
				? "Снимок не найден в карте. Обновите архив."
				: res.status === 403
					? "Нет доступа к полному снимку."
					: `Полный снимок не загружен (ответ ${res.status}).`;
			return { error: msg };
		}
		const full: XrayScan = await res.json();
		return {
			data: full,
			error: full.imageDataUri ? undefined : "Сервер отдал карточку снимка без изображения.",
		};
	} catch (err) {
		showToast(actionFailureToast("Ошибка выполнения операции", (err as { status?: number })?.status ?? null), "error");
		logger.error("[useVisiographArchive] запрос полного снимка не выполнен", err);
		return { error: "Нет связи с сервером — полный снимок не загружен." };
	}
}

export async function deleteXrayScanApi(
	scanId: string,
	headers: Record<string, string>,
): Promise<{ success: boolean; error?: string }> {
	try {
		const res = await fetch(`/api/xray/scans/${encodeURIComponent(scanId)}`, {
			method: "DELETE",
			headers,
		});
		if (!res.ok) {
			let message = `Снимок не удалён (ответ ${res.status}).`;
			try {
				const body = await res.json();
				if (body?.message) message = body.message.trim();
				else if (body?.error) message = body.error.trim();
			} catch {}
			return { success: false, error: message };
		}
		return { success: true };
	} catch (err) {
		showToast(actionFailureToast("Ошибка выполнения операции", (err as { status?: number })?.status ?? null), "error");
		logger.error("[useVisiographArchive] scan delete failed", err);
		return { success: false, error: "Снимок не удалён: нет связи с сервером." };
	}
}
