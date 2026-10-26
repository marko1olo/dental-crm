/**
 * localFallbackStudy.ts — Формирование локального исследования при автономной работе
 * Mandate 8b: строго <= 120 строк.
 */

export function createLocalFallbackStudy(
	file: File,
	options: {
		patientId?: string | null | undefined;
		visitId?: string | null | undefined;
		kind: string;
		title: string;
		toothCode?: string | null | undefined;
		region?: string | null | undefined;
	},
) {
	const localBlobUrl = URL.createObjectURL(file);
	return {
		id: `local_scan_${Date.now()}`,
		patientId: options.patientId,
		visitId: options.visitId || null,
		kind: options.kind,
		title: options.title,
		toothCode: options.toothCode || null,
		region: options.region || null,
		previewUrl: localBlobUrl,
		hasFile: true,
		capturedAt: new Date().toISOString(),
		sourceKind: "browser_local_upload",
		sourceName: file.name,
	};
}
