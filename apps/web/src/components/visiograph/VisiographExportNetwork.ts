/**
 * VisiographExportNetwork.ts
 * Attaches snapshots and radiological protocols to the patient electronic record via API.
 */

import { logger } from "../../utils/logger";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import type { ClinicalExportOutcome, ClinicalSnapshotPayload } from "./VisiographExportTypes";
import { buildForm043ProtocolText } from "./VisiographExportProtocolText";

export async function exportSnapshotToClinicalRecord(
	payload: ClinicalSnapshotPayload,
	authHeaders: Record<string, string> = {},
): Promise<ClinicalExportOutcome> {
	const protocol043 = buildForm043ProtocolText(payload);
	const tooth = payload.fdiToothCode || payload.toothCode;

	if (!payload.patientId) {
		return {
			success: false,
			message: "Пациент не выбран. Выберите пациента для прикрепления снимка к медицинской карте.",
			protocol043Text: protocol043,
		};
	}

	if (!payload.imageDataUri || !payload.imageDataUri.startsWith("data:image/")) {
		return {
			success: false,
			message: "Не удалось получить графический снимок из области просмотра.",
			protocol043Text: protocol043,
		};
	}

	try {
		const summaryTitle = tooth ? `Снимок зуба ${tooth} — Form 043/u` : "Рентгенологический снимок — Form 043/u";
		const res = await fetch("/api/xray/scans", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				...authHeaders,
			}),
			body: JSON.stringify({
				patientId: payload.patientId,
				imageBase64: payload.imageDataUri,
				originalFilename: `snapshot_${payload.viewKind || "xray"}_${tooth || "jaw"}_${Date.now()}.jpg`,
				mimeType: "image/jpeg",
				kind: payload.viewKind || "periapical",
				toothCode: tooth || null,
				aiReport: protocol043,
				aiSummary: summaryTitle,
				status: "done",
			}),
		});

		if (!res.ok) {
			const errText = await res.text().catch(() => "");
			logger.error(`[VisiographExportService] Ошибка сохранения снимка в карту (${res.status}): ${errText}`);
			return {
				success: false,
				message: `Сервер вернул ошибку (${res.status}) при сохранении снимка в медицинскую карту.`,
				protocol043Text: protocol043,
			};
		}

		const data = (await res.json()) as { id?: string };
		return {
			success: true,
			scanId: data.id,
			message: "Снимок и протокол лучевого обследования успешно прикреплены к медицинской карте пациента.",
			protocol043Text: protocol043,
		};
	} catch (err) {
		logger.error("[VisiographExportService] Исключение при экспорте снимка:", err);
		return {
			success: false,
			message: "Сетевой сбой при отправке снимка в амбулаторную карту пациента.",
			protocol043Text: protocol043,
		};
	}
}
