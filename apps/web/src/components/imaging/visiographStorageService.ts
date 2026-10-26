/**
 * visiographStorageService.ts — Сервис сохранения и обновления снимков визиографа на сервере
 * Mandate 8b: строго <= 120 строк.
 */

import { logger } from "../../utils/logger.js";
import type { XrayScan } from "./VisiographScanHelpers.js";

export async function saveVisiographScanToServer(
	patientId: string,
	dataUrl: string,
	file: File,
	headers: Record<string, string>,
	toothCode?: string,
	visitId?: string,
): Promise<{ saved?: XrayScan; failure?: string }> {
	try {
		const isUuid = (str?: string) =>
			Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

		const payload: Record<string, unknown> = {
			patientId,
			imageBase64: dataUrl,
			originalFilename: file.name,
			mimeType: file.type || "image/jpeg",
			kind: "periapical",
			status: "done",
		};
		if (toothCode) payload.toothCode = toothCode;
		if (visitId && isUuid(visitId)) payload.visitId = visitId;

		const res = await fetch("/api/xray/scans", {
			method: "POST",
			headers,
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			logger.error(`[VisiographAnalyzer] снимок не сохранён, ответ ${res.status}`);
			return {
				failure: res.status === 413
					? "Снимок слишком тяжёлый для базы данных."
					: "Не удалось сохранить снимок в карту пациента на сервере.",
			};
		}
		const saved: XrayScan = await res.json();
		return { saved };
	} catch (saveErr) {
		logger.error("[VisiographAnalyzer] запись снимка в карту не выполнена", saveErr);
		return { failure: "Сервер не ответил на сохранение снимка в карту." };
	}
}

export function updateVisiographScanMeta(
	scanId: string,
	payload: Record<string, unknown>,
	headers: Record<string, string>,
): void {
	if (!scanId || scanId.startsWith("local-")) return;
	fetch(`/api/xray/scans/${encodeURIComponent(scanId)}`, {
		method: "PUT",
		headers,
		body: JSON.stringify(payload),
	}).catch((e) => logger.warn("[VisiographAnalyzer] Background scan update error:", e));
}
