import { logger } from "../../utils/logger";
import {
	type VisiographWindowPreset,
	VISIOGRAPH_WINDOW_PRESETS,
} from "./VisiographWindowPresets";

export interface ClinicalSnapshotPayload {
	patientId: string;
	imageDataUri: string;
	viewKind?:
		| "mpr_axial"
		| "mpr_sagittal"
		| "mpr_coronal"
		| "panoramic_mpr"
		| "visiograph_3d"
		| undefined;
	fdiToothCode?: string | undefined;
	preset?: VisiographWindowPreset | undefined;
	nerveDistanceMm?: number | undefined;
	boneDensity?:
		| {
				averageHU: number;
				classification: string;
		  }
		| undefined;
	implantDetails?:
		| {
				diameterMm: number;
				lengthMm: number;
				system?: string | undefined;
		  }
		| undefined;
	aiProtocolLog?: string | undefined;
	clinicalNote?: string | undefined;
}

export interface ClinicalExportOutcome {
	success: boolean;
	scanId?: string | undefined;
	message: string;
	protocol043Text: string;
}

/**
 * Builds standard clinical protocol text for insertion into patient Form 043/u (Медицинская карта стоматологического больного).
 */
export function buildForm043ProtocolText(payload: ClinicalSnapshotPayload): string {
	const lines: string[] = [];
	lines.push("--- ПРОТОКОЛ ЛУЧЕВОГО ОБСЛЕДОВАНИЯ И 3D-ПЛАНИРОВАНИЯ (ФОРМА № 043/У) ---");
	lines.push(`Дата и время: ${new Date().toLocaleString("ru-RU")}`);

	if (payload.fdiToothCode) {
		lines.push(`Область зуба (FDI): № ${payload.fdiToothCode}`);
	}

	const preset = payload.preset ?? VISIOGRAPH_WINDOW_PRESETS.bone;
	lines.push(
		`Режим контрастирования (HU): ${preset.label} (Окно WW: ${preset.windowWidth} HU, Уровень WL: ${preset.windowCenter} HU)`,
	);

	if (payload.boneDensity) {
		lines.push(
			`Плотность костной ткани (Misch): ${payload.boneDensity.classification} (среднее значение: ${Math.round(payload.boneDensity.averageHU)} HU)`,
		);
	}

	if (payload.implantDetails) {
		lines.push(
			`Параметры планируемого имплантата: Ø ${payload.implantDetails.diameterMm.toFixed(1)} мм × L ${payload.implantDetails.lengthMm.toFixed(1)} мм${
				payload.implantDetails.system ? ` (Система: ${payload.implantDetails.system})` : ""
			}`,
		);
	}

	if (payload.nerveDistanceMm !== undefined && Number.isFinite(payload.nerveDistanceMm)) {
		const isDanger = payload.nerveDistanceMm < 2.0;
		lines.push(
			`Дистанция до нижнечелюстного канала (N. alveolaris inferior): ${payload.nerveDistanceMm.toFixed(1)} мм ${
				isDanger ? "⚠️ [ВНИМАНИЕ: ОПАСНАЯ ЗОНА < 2.0 ММ! ВЫСОКИЙ РИСК ТРАВМАТИЗАЦИИ НЕРВА]" : "✓ [Безопасный коридор ≥ 2.0 мм]"
			}`,
		);
	}

	if (payload.aiProtocolLog) {
		lines.push(`Заключение ИИ-анализа: ${payload.aiProtocolLog}`);
	}

	if (payload.clinicalNote) {
		lines.push(`Клинические примечания врача: ${payload.clinicalNote}`);
	}

	lines.push("Снимок и протокол прикреплены к электронной медицинской карте 043/у.");
	return lines.join("\n");
}

/**
 * Exports a visual 3D MPR / Panoramic snapshot to the patient's electronic medical record (Form 043/u).
 */
export async function exportSnapshotToClinicalRecord(
	payload: ClinicalSnapshotPayload,
	authHeaders: Record<string, string> = {},
): Promise<ClinicalExportOutcome> {
	const protocol043 = buildForm043ProtocolText(payload);

	if (!payload.patientId) {
		return {
			success: false,
			message: "Пациент не выбран. Выберите пациента для прикрепления снимка к амбулаторной карте 043/у.",
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
		const res = await fetch("/api/xray/scans", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
			},
			body: JSON.stringify({
				patientId: payload.patientId,
				imageBase64: payload.imageDataUri,
				originalFilename: `snapshot_3d_mpr_${payload.fdiToothCode || "jaw"}_${Date.now()}.jpg`,
				mimeType: "image/jpeg",
				kind: payload.viewKind || "periapical",
				toothCode: payload.fdiToothCode || null,
				aiReport: protocol043,
				aiSummary: `3D MPR Снимок зуба ${payload.fdiToothCode || "дуги"} — Form 043/u`,
				status: "done",
			}),
		});

		if (!res.ok) {
			const errText = await res.text().catch(() => "");
			logger.error(
				`[VisiographExportService] Ошибка сохранения снимка в карту (${res.status}): ${errText}`,
			);
			return {
				success: false,
				message: `Сервер вернул ошибку (${res.status}) при сохранении снимка в карту 043/у.`,
				protocol043Text: protocol043,
			};
		}

		const data = (await res.json()) as { id?: string };
		return {
			success: true,
			scanId: data.id,
			message: "Снимок 3D MPR и протокол успешно сохранены в карту 043/у пациента.",
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

/**
 * Downloads the snapshot directly to local disk if clinician needs a portable file.
 */
export function downloadSnapshotLocally(
	imageDataUri: string,
	filename = "mpr_snapshot_043.jpg",
): void {
	if (typeof window === "undefined") return;
	const link = document.createElement("a");
	link.href = imageDataUri;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}
