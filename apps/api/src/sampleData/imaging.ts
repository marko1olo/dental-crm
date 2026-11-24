/**
 * @file imaging.ts
 * @description Layer 2: Imaging studies, DICOM workbench manifests, viewer sessions, sanitation.
 */
import { createHash } from "node:crypto";

const shortHash = (value: string): string =>
	createHash("sha256").update(value).digest("hex").slice(0, 16);
const uniqueStrings = (values: string[]): string[] =>
	Array.from(new Set(values.filter(Boolean)));

import type {
	DicomViewerWorkbenchManifestResponse,
	DicomWorkbenchBundle,
	ImagingStudy,
	ImagingViewerSession,
} from "@dental/shared";
import { organizationId, marinaPatientId, alexeyPatientId, activeVisitId } from "./fixtureIds.js";

export const imagingStudies: ImagingStudy[] = [
	{
		id: "fbe3704c-9b37-4149-ae4b-e99e46d7599f",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		kind: "periapical",
		title: "Прицельный 36",
		toothCode: "36",
		region: "нижняя челюсть слева",
		capturedAt: "2026-05-12T08:42:00+04:00",
		sourceKind: "sensor_bridge",
		sourceName: "RVG-датчик",
		status: "available",
		aiSummary: "Черновик: область 36, контроль кариозной полости. Требует проверки врача.",
		previewUrl: "/api/imaging/studies/fbe3704c-9b37-4149-ae4b-e99e46d7599f/preview.svg",
		viewerUrl: "/api/imaging/studies/fbe3704c-9b37-4149-ae4b-e99e46d7599f/preview.svg",
	},
	{
		id: "b0b5961f-4d64-45a6-88e9-a77e87d7ec51",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		kind: "opg",
		title: "ОПТГ контроль",
		toothCode: null,
		region: "обе челюсти",
		capturedAt: "2026-05-10T15:20:00+04:00",
		sourceKind: "dicom_file",
		sourceName: "Импорт ОПТГ/снимков",
		status: "needs_review",
		aiSummary: "Черновик: панорамный обзор, проверить 36/46 и ретинированные восьмые зубы.",
		previewUrl: "/api/imaging/studies/b0b5961f-4d64-45a6-88e9-a77e87d7ec51/preview.svg",
		viewerUrl: "/api/imaging/studies/b0b5961f-4d64-45a6-88e9-a77e87d7ec51/preview.svg",
	},
	{
		id: "e0d93a8c-5f3b-49d6-bc21-0b5ab45eb6fa",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		kind: "ceph",
		title: "ТРГ боковая",
		toothCode: null,
		region: "профиль черепа",
		capturedAt: "2026-05-10T15:24:00+04:00",
		sourceKind: "dicom_file",
		sourceName: "Импорт ТРГ/снимков",
		status: "needs_review",
		aiSummary:
			"Черновик: телерентгенограмма добавлена для ортодонтического анализа. Разметку и вывод проверяет врач.",
		previewUrl:
			"/api/imaging/studies/e0d93a8c-5f3b-49d6-bc21-0b5ab45eb6fa/preview.svg",
		viewerUrl:
			"/api/imaging/studies/e0d93a8c-5f3b-49d6-bc21-0b5ab45eb6fa/preview.svg",
	},
	{
		id: "eb7bc26d-70df-4996-89db-ccbb910f82d0",
		organizationId,
		patientId: alexeyPatientId,
		visitId: null,
		kind: "cbct",
		title: "КТ имплантация 46",
		toothCode: "46",
		region: "нижняя челюсть справа",
		capturedAt: "2026-05-09T11:30:00+04:00",
		sourceKind: "pacs",
		sourceName: "Архив снимков клиники",
		status: "available",
		aiSummary:
			"Черновик: КЛКТ/КТ-серия подключена, полноценный 3D-просмотрщик будет отдельным модулем.",
		previewUrl:
			"/api/imaging/studies/eb7bc26d-70df-4996-89db-ccbb910f82d0/preview.svg",
		viewerUrl:
			"/api/imaging/studies/eb7bc26d-70df-4996-89db-ccbb910f82d0/preview.svg",
	},
];

const imagingViewerSessions: ImagingViewerSession[] = [];
const dicomWorkbenchBundles: DicomWorkbenchBundle[] = [];

function isLocalDicomPath(value: string): boolean {
	return (
		/^[A-Za-z]:[\\/]/.test(value) ||
		value.startsWith("\\\\") ||
		value.startsWith("/") ||
		value.includes("::") ||
		/[\\/]/.test(value)
	);
}

function redactLocalDicomPath(value: string | null): string | null {
	if (!value) return null;
	if (!isLocalDicomPath(value)) return value;
	return `redacted-local-dicom-path:${shortHash(value)}`;
}

function redactDicomReferenceId(value: string | null): string | null {
	if (!value) return null;
	const prefix = "dicomfile:";
	if (value.toLowerCase().startsWith(prefix)) {
		return `${prefix}${redactLocalDicomPath(value.slice(prefix.length))}`;
	}
	return isLocalDicomPath(value) ? redactLocalDicomPath(value) : value;
}

function redactLocalDicomPathsInText(value: string): string {
	return value
		.replace(
			/[A-Za-z]:[\\/][^\r\n]*(?=:\s|$)/g,
			(match) => redactLocalDicomPath(match) ?? match,
		)
		.replace(
			/\\\\[^\r\n]*(?=:\s|$)/g,
			(match) => redactLocalDicomPath(match) ?? match,
		)
		.replace(
			/dicomfile:([A-Za-z]:[\\/][^\s\r\n]+)/gi,
			(_match, filePath: string) =>
				`dicomfile:${redactLocalDicomPath(filePath) ?? filePath}`,
		);
}

function redactDicomWarningList(warnings: string[]): string[] {
	return uniqueStrings(
		warnings
			.map((warning) => redactLocalDicomPathsInText(warning))
			.filter((warning) => warning.trim()),
	);
}

function cloneDicomWorkbenchManifestForServerStorage(
	manifest: DicomViewerWorkbenchManifestResponse,
): DicomViewerWorkbenchManifestResponse {
	const clone = JSON.parse(
		JSON.stringify(manifest),
	) as DicomViewerWorkbenchManifestResponse;
	clone.toolStateBundle.seriesRef.firstFilePath = redactLocalDicomPath(
		clone.toolStateBundle.seriesRef.firstFilePath,
	);
	clone.toolStateBundle.viewports = clone.toolStateBundle.viewports.map(
		(viewport) => ({
			...viewport,
			referencedImageId: redactDicomReferenceId(viewport.referencedImageId),
		}),
	);
	if (
		clone.launchManifest.viewerUrl &&
		isLocalDicomPath(clone.launchManifest.viewerUrl)
	) {
		clone.launchManifest.viewerUrl = redactLocalDicomPath(
			clone.launchManifest.viewerUrl,
		);
	}
	clone.warnings = redactDicomWarningList(clone.warnings);
	clone.readiness.warnings = redactDicomWarningList(clone.readiness.warnings);
	clone.renderCachePlan.warnings = redactDicomWarningList(
		clone.renderCachePlan.warnings,
	);
	clone.launchManifest.warnings = redactDicomWarningList(
		clone.launchManifest.warnings,
	);
	clone.toolStateBundle.warnings = redactDicomWarningList(
		clone.toolStateBundle.warnings,
	);
	clone.toolStateBundle.annotations = clone.toolStateBundle.annotations.map(
		(annotation) => ({
			...annotation,
			referencedImageId: redactDicomReferenceId(annotation.referencedImageId),
			warnings: redactDicomWarningList(annotation.warnings),
		}),
	);
	return clone;
}

function sanitizeDicomWorkbenchBundleForServerStorage(
	bundle: DicomWorkbenchBundle,
): DicomWorkbenchBundle {
	const manifest = cloneDicomWorkbenchManifestForServerStorage(bundle.manifest);
	const seriesKey = dicomWorkbenchSeriesKeyFromManifest(manifest);
	return {
		...bundle,
		seriesKey,
		manifest,
		pixelPolicy: "metadata_and_tool_state_only_no_pixels",
		warnings: Array.from(
			new Set([
				...redactDicomWarningList(bundle.warnings),
				"Серверный пакет скрывает локальные пути снимков; перед загрузкой пикселей переподключите папку или устройство на рабочей станции.",
			]),
		).slice(0, 16),
	};
}


function dicomWorkbenchSeriesKeyFromManifest(
	manifest: DicomViewerWorkbenchManifestResponse,
): string {
	const ref = manifest.toolStateBundle.seriesRef;
	const sourceIdentity = ref.firstFilePath
		? `file:${shortHash(ref.firstFilePath)}`
		: `${ref.sourceKind}:${shortHash(ref.sourceName)}`;
	return [
		ref.studyInstanceUid ??
			manifest.launchManifest.studyInstanceUid ??
			"no-study",
		ref.seriesInstanceUid ??
			manifest.launchManifest.seriesInstanceUid ??
			"no-series",
		ref.sourceKind,
		ref.sourceName,
		sourceIdentity,
	].join("|");
}

export { dicomWorkbenchBundles, imagingViewerSessions, sanitizeDicomWorkbenchBundleForServerStorage };
