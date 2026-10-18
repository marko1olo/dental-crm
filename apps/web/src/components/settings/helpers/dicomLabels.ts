import type { DicomRenderCachePlanResponse, DicomSeriesPreviewGroup, LocalBridgeReadinessResponse } from "@dental/shared";

export const dicomRenderCachePriorityLabels: Record<
	DicomRenderCachePlanResponse["tasks"][number]["priority"],
	string
> = {
	blocking: "обязательно",
	interactive: "для плавного просмотра",
	prefetch: "подготовить заранее",
	background: "фоном",
	deferred: "позже",
};

export const localImagingModelWorkbenchTargetLabels: Record<string, string> = {
	metadata_only: "только метаданные",
	external_model_viewer: "внешний 3D-просмотр",
	local_bridge: "локальный 3D-модуль",
};

export const localBridgeEndpointSummary = (bridge: LocalBridgeReadinessResponse["bridges"][number]) => {
	if (bridge.urlRedacted) return bridge.urlRedacted;
	if (bridge.setupSettingsCount) return `серверных настроек: ${bridge.setupSettingsCount}`;
	return "адрес локального модуля не задан";
};

export const shortDicomSeriesCode = (value: string | null | undefined) => {
	if (!value) return "код серии не указан";
	const trimmed = value.trim();
	return `код серии ${trimmed.length > 18 ? `${trimmed.slice(0, 18)}...` : trimmed}`;
};

export const dicomSeriesDisplayText = (series: DicomSeriesPreviewGroup) =>
	series.seriesDescription ?? series.studyDescription ?? shortDicomSeriesCode(series.seriesInstanceUid);

export const dicomFirstFrameFileFormatLabel = (transferSyntaxUid: string | null | undefined) => {
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

export const dicomFirstFrameImageTypeLabel = (photometricInterpretation: string | null | undefined) => {
	const normalized = photometricInterpretation?.trim().toUpperCase();
	if (!normalized) return "тип изображения не указан";
	if (normalized.startsWith("MONOCHROME")) return "серый снимок";
	if (normalized === "RGB" || normalized === "YBR_FULL" || normalized === "YBR_FULL_422") return "цветной снимок";
	return "тип изображения: особый";
};
