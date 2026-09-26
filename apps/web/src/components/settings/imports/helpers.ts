import type {
	DicomSeriesPreviewGroup,
	LocalBridgeReadinessResponse,
	MigrationLocalSourceDiscoveryCandidate,
	MigrationLocalSourceHandoff,
} from "@dental/shared";
import {
	aiRecognitionWarningLabels,
	clinicPublicLookupFieldLabels,
	integrationInputLabels,
	migrationArtifactKindLabels,
	migrationHandoffEndpointLabels,
	migrationHumanTextReplacements,
	migrationLegacySourceKindLabels,
	migrationManifestColumnLabels,
} from "./constants";

export function formatBrowserImagingScanElapsed(
	elapsedMs: number | null | undefined,
): string {
	const safeMs =
		typeof elapsedMs === "number" && Number.isFinite(elapsedMs)
			? Math.max(0, Math.round(elapsedMs))
			: 0;
	if (safeMs < 1000) return `${safeMs} ms`;
	const totalSeconds = Math.floor(safeMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes <= 0) return `${seconds} s`;
	return `${minutes} m ${String(seconds).padStart(2, "0")} s`;
}

export const humanizeMigrationText = (value: unknown): string => {
	const rawValue = String(value ?? "").trim();
	if (!rawValue) return "";
	const directLabel =
		migrationManifestColumnLabels[rawValue] ??
		migrationArtifactKindLabels[rawValue];
	if (directLabel) return directLabel;

	return migrationHumanTextReplacements
		.reduce(
			(text, [pattern, replacement]) => text.replace(pattern, replacement),
			rawValue,
		)
		.replace(/_/g, " ")
		.replace(/\s+/g, " ")
		.trim();
};

export const humanizeIntegrationInput = (value: string): string =>
	integrationInputLabels[value] ?? humanizeMigrationText(value);

export const localBridgeEndpointSummary = (
	bridge: LocalBridgeReadinessResponse["bridges"][number],
): string => {
	if (bridge.urlRedacted) return bridge.urlRedacted;
	if (bridge.setupSettingsCount)
		return `серверных настроек: ${bridge.setupSettingsCount}`;
	return "адрес локального модуля не задан";
};

export const humanizeMigrationList = (
	items: unknown[] | undefined,
	limit = items?.length ?? 0,
): string =>
	(items ?? [])
		.slice(0, limit)
		.map(humanizeMigrationText)
		.filter(Boolean)
		.join(" · ");

export const humanizeMigrationColumns = (
	items: unknown[] | undefined,
	limit = items?.length ?? 0,
): string =>
	(items ?? [])
		.slice(0, limit)
		.map(
			(item) =>
				clinicPublicLookupFieldLabels[String(item)] ??
				migrationManifestColumnLabels[String(item)] ??
				humanizeMigrationText(item),
		)
		.filter(Boolean)
		.join(" · ");

export const clinicPublicLookupWarningText = (warning: string): string => {
	const text = humanizeMigrationText(warning);
	const duplicateValue = text.match(
		/^Строка\s+(\d+):\s+найдено еще одно значение для ([^;]+);\s*оставлено первое\.?$/i,
	);
	if (duplicateValue) {
		const lineNumber = duplicateValue[1] ?? "?";
		const fieldKey = duplicateValue[2]?.trim() ?? "";
		const fieldLabel =
			clinicPublicLookupFieldLabels[fieldKey] ??
			humanizeMigrationText(fieldKey);
		return `Строка ${lineNumber}: найдено другое значение для поля "${fieldLabel}"; оставлено первое, проверьте вручную.`;
	}
	return text
		.replace(/\bDadata\b/gi, "сервис реквизитов")
		.replace(/\bmanual public targets\b/gi, "ручная сверка")
		.replace(/ответ\s+\d{3}/i, "ошибку связи")
		.replace(/не подставлены автоматически/i, "не подставлены сейчас");
};

export const migrationSourceKindLabel = (sourceKind: string): string =>
	migrationLegacySourceKindLabels[sourceKind] ??
	humanizeMigrationText(sourceKind);

export const migrationSourceDisplayName = (
	candidate: Pick<
		MigrationLocalSourceDiscoveryCandidate,
		"safeDisplayName" | "sourceKind"
	>,
	ordinal?: number,
): string => {
	const cleanName = humanizeMigrationText(candidate?.safeDisplayName)
		.replace(/\s+#[A-F0-9]{8,12}\b/g, "")
		.trim();
	const baseName =
		cleanName || migrationSourceKindLabel(candidate?.sourceKind ?? "");
	return typeof ordinal === "number" ? `${baseName} ${ordinal + 1}` : baseName;
};

export const migrationHandoffRouteLabel = (
	handoff: MigrationLocalSourceHandoff,
): string => {
	const actionLabel =
		handoff?.method === "GET" ? "открыть проверку" : "передать на проверку";
	return `${actionLabel}: ${migrationHandoffEndpointLabels[handoff?.endpoint ?? ""] ?? "предпросмотр в CRM"}`;
};

export const shortDicomSeriesCode = (value: string | null | undefined): string => {
	if (!value) return "код серии не указан";
	const trimmed = value.trim();
	return `код серии ${trimmed.length > 18 ? `${trimmed.slice(0, 18)}...` : trimmed}`;
};

export const dicomSeriesDisplayText = (series: DicomSeriesPreviewGroup): string =>
	series?.seriesDescription ??
	series?.studyDescription ??
	shortDicomSeriesCode(series?.seriesInstanceUid);

export const dicomSeriesWarningText = (warnings: string[]): string =>
	(warnings ?? []).length
		? (warnings ?? []).slice(0, 3).map(humanizeMigrationText).join(", ")
		: "готово к просмотру";

export const importWarningListText = (
	warnings: string[],
	fallback: string,
	limit = 4,
): string => {
	if (!(warnings ?? []).length) return fallback;
	const text = (warnings ?? [])
		.slice(0, limit)
		.map(humanizeMigrationText)
		.filter(Boolean)
		.join(", ");
	return text || fallback;
};

export const patientImportRowWarningText = (
	warnings: string[],
	notes: string | null | undefined,
): string =>
	importWarningListText(
		warnings,
		notes ? humanizeMigrationText(notes) : "готово к импорту",
	);

export const imagingImportReadyText = (
	filePath: string | null | undefined,
): string => {
	const trimmed = filePath?.trim();
	if (!trimmed) return "готово к привязке";
	const virtualPath = trimmed.split("::").pop() ?? trimmed;
	const safeName =
		virtualPath.split(/[\\/]/).filter(Boolean).pop() ?? virtualPath;
	return `готово к привязке: ${humanizeMigrationText(safeName)}`;
};

export const imagingImportRowWarningText = (
	warnings: string[],
	filePath: string | null | undefined,
): string => importWarningListText(warnings, imagingImportReadyText(filePath));

export const aiRecognitionWarningText = (warning: string): string =>
	aiRecognitionWarningLabels[warning] ?? humanizeMigrationText(warning);

export const dicomFirstFrameFileFormatLabel = (
	transferSyntaxUid: string | null | undefined,
): string => {
	if (!transferSyntaxUid) return "формат файла не указан";
	if (transferSyntaxUid.includes(".1.2.4.")) return "формат файла: сжатый";
	if (
		transferSyntaxUid === "1.2.840.10008.1.2" ||
		transferSyntaxUid === "1.2.840.10008.1.2.1" ||
		transferSyntaxUid === "1.2.840.10008.1.2.2"
	) {
		return "формат файла: стандартный";
	}
	return "формат файла: проверен";
};

export const dicomFirstFrameImageTypeLabel = (
	photometricInterpretation: string | null | undefined,
): string => {
	const normalized = photometricInterpretation?.trim().toUpperCase();
	if (!normalized) return "тип изображения не указан";
	if (normalized.startsWith("MONOCHROME")) return "серый снимок";
	if (
		normalized === "RGB" ||
		normalized === "YBR_FULL" ||
		normalized === "YBR_FULL_422"
	)
		return "цветной снимок";
	return "тип изображения: особый";
};
