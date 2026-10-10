/**
 * @file imaging.ts
 * @description Layer 2: Imaging studies, DICOM workbench manifests, viewer sessions, sanitation.
 */
import { createHash, randomUUID } from "node:crypto";
import { recordAuditEvent } from "./audit.js";

const shortHash = (value: string): string =>
	createHash("sha256").update(value).digest("hex").slice(0, 16);
const uniqueStrings = (values: string[]): string[] =>
	Array.from(new Set(values.filter(Boolean)));

import type {
	DicomViewerWorkbenchManifestResponse,
	DicomWorkbenchBundle,
	ImagingSourceKind,
	ImagingStudy,
	ImagingStudyKind,
	ImagingViewerAnnotation,
	ImagingViewerMode,
	ImagingViewerSession,
	ImagingViewerSessionState,
	SaveDicomWorkbenchBundleRequest,
	SaveImagingViewerSessionRequest,
} from "@dental/shared";
import { repairMojibakeDeep, repairMojibakeText } from "../text/repairMojibake.js";
import { persistMutableState } from "./stateNotifier.js";
import { nullableTrimmed } from "./types.js";
import { organizationId, marinaPatientId, alexeyPatientId, activeVisitId, doctorUserId } from "./fixtureIds.js";

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


const imagingKindTitles: Record<ImagingStudyKind, string> = {
	periapical: "Прицельный снимок",
	bitewing: "Интерпроксимальный снимок",
	opg: "ОПТГ",
	ceph: "ТРГ / цефалометрия",
	cbct: "КЛКТ / КТ",
	photo: "Фото",
	other: "Снимок",
};

function viewerModeForImagingKind(kind: ImagingStudyKind): ImagingViewerMode {
	if (kind === "cbct") return "mpr";
	if (kind === "photo") return "photo";
	return "two_d";
}

function defaultViewerStateForStudy(
	study: ImagingStudy,
): ImagingViewerSessionState {
	return {
		mode: viewerModeForImagingKind(study.kind),
		activeTool: "window_level",
		activeQuickActionId: null,
		windowPreset:
			study.kind === "cbct"
				? "bone"
				: study.kind === "photo"
					? "photo"
					: "endo",
		windowCenter: null,
		windowWidth: null,
		brightness: 1,
		contrast: study.kind === "photo" ? 1 : 1.08,
		inverted: false,
		rotationDeg: 0,
		flipHorizontal: false,
		zoom: 1,
		panX: 0,
		panY: 0,
		sliceIndex: null,
		projection: study.kind === "cbct" ? "axial" : null,
		axisDeg: 0,
		slabMm: 1,
		crosshair: study.kind === "cbct",
		linkedPlanes: study.kind === "cbct",
		implantPlan: null,
	};
}

function normalizeViewerAnnotations(
	annotations: ImagingViewerAnnotation[],
): ImagingViewerAnnotation[] {
	const now = new Date().toISOString();
	return annotations.slice(0, 200).map((annotation) => ({
		...annotation,
		id: annotation.id || randomUUID(),
		label: annotation.label.trim(),
		toothCode: annotation.toothCode?.trim() || null,
		note: annotation.note?.trim() || null,
		createdByUserId: annotation.createdByUserId ?? doctorUserId,
		createdAt: annotation.createdAt || now,
		updatedAt: annotation.updatedAt || now,
	}));
}

function _getOrCreateImagingViewerSession(
	study: ImagingStudy,
): ImagingViewerSession {
	const existing = imagingViewerSessions.find(
		(session) => session.studyId === study.id,
	);
	if (existing) return existing;

	const now = new Date().toISOString();
	const session: ImagingViewerSession = {
		id: randomUUID(),
		organizationId,
		studyId: study.id,
		patientId: study.patientId,
		visitId: study.visitId ?? null,
		state: defaultViewerStateForStudy(study),
		annotations: [],
		clientSavedAt: null,
		serverSavedAt: now,
		createdAt: now,
		updatedAt: now,
		warnings: [
			"Состояние просмотра сохраняется отдельно от исходного снимка; исходный снимок не изменяется.",
			study.kind === "cbct"
				? "Настройки КЛКТ/КТ-срезов являются навигацией врача, а не подписанным рентгенологическим заключением."
				: "2D-измерения требуют калибровки сенсора перед клиническим применением.",
		],
	};
	imagingViewerSessions.unshift(session);
	persistMutableState();
	return session;
}

function _saveImagingViewerSession(
	studyId: string,
	input: SaveImagingViewerSessionRequest,
): ImagingViewerSession {
	const study = imagingStudies.find((candidate) => candidate.id === studyId);
	if (!study) throw new Error("Исследование не найдено");
	if (study.patientId !== input.patientId)
		throw new Error("Пациент в просмотре не совпадает с пациентом снимка");

	const now = new Date().toISOString();
	const existingIndex = imagingViewerSessions.findIndex(
		(session) => session.studyId === study.id,
	);
	const previous =
		existingIndex >= 0 ? imagingViewerSessions[existingIndex] : null;
	const annotations = normalizeViewerAnnotations(input.annotations ?? []);
	const warnings = [
		"Состояние просмотра сохраняется отдельно от исходного снимка; исходный снимок не изменяется.",
		study.kind === "cbct"
			? "Настройки КЛКТ/КТ-срезов являются навигацией врача, а не подписанным рентгенологическим заключением."
			: "2D-измерения требуют калибровки сенсора перед клиническим применением.",
		input.state.mode === "mpr" && study.kind !== "cbct"
			? "КТ-срезы доступны только для КЛКТ/КТ-серий; это исследование остается 2D-просмотром."
			: null,
		annotations.length >= 200
			? "Достигнут лимит разметки; архивируйте старые отметки перед добавлением новых."
			: null,
	].filter((warning): warning is string => Boolean(warning));
	const session: ImagingViewerSession = {
		id: previous?.id ?? randomUUID(),
		organizationId,
		studyId: study.id,
		patientId: study.patientId,
		visitId: input.visitId ?? study.visitId ?? null,
		state: input.state,
		annotations,
		clientSavedAt: input.clientSavedAt ?? null,
		serverSavedAt: now,
		createdAt: previous?.createdAt ?? now,
		updatedAt: now,
		warnings,
	};

	if (existingIndex >= 0)
		imagingViewerSessions.splice(existingIndex, 1, session);
	else imagingViewerSessions.unshift(session);

	if (!previous || previous.annotations.length !== annotations.length) {
		recordAuditEvent({
			entityType: "imaging_viewer_session",
			entityId: session.id,
			action: previous
				? "imaging_viewer_annotations_saved"
				: "imaging_viewer_session_created",
			reason: `${study.title}: ${annotations.length} saved annotation(s), mode ${input.state.mode}.`,
		});
	} else {
		persistMutableState();
	}

	return session;
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

function dicomWorkbenchWarnings(
	manifest: DicomViewerWorkbenchManifestResponse,
): string[] {
	return uniqueStrings([
		"Серверный пакет хранит только метаданные, состояние просмотрщика, разметку и план запуска/предварительной подготовки; исходные снимки остаются в архиве снимков, локальной папке или устройстве.",
		"Серверный пакет скрывает локальные пути снимков; перед открытием серии переподключите папку или устройство на рабочей станции.",
		"Пакет КЛКТ/КТ-срезов является восстанавливаемым состоянием рабочего места, а не подписанным заключением рентгенолога.",
		manifest.readiness.shouldUseExternalViewer
			? "Тяжелую КЛКТ/КТ-серию на этой станции нужно передать во внешний или настольный КТ-просмотрщик; CRM хранит восстанавливаемое состояние."
			: "",
		manifest.readiness.canOpenInBrowser
			? ""
			: "Браузер пока не может открыть всю серию целиком; сохраните метаданные и используйте внешний просмотр.",
		...manifest.warnings,
	]).slice(0, 16);
}

const dicomRenderTextureStrategyAuditLabels: Record<
	DicomViewerWorkbenchManifestResponse["renderCachePlan"]["textureStrategy"],
	string
> = {
	metadata_only: "только список серии",
	stack_2d_textures: "послойный 2D-просмотр",
	single_3d_texture: "объемный просмотр",
	bricked_3d_textures: "объемный просмотр по частям",
	external_viewer: "внешний просмотр",
};

function _saveDicomWorkbenchBundle(
	input: SaveDicomWorkbenchBundleRequest,
): DicomWorkbenchBundle {
	const now = new Date().toISOString();
	const manifest = cloneDicomWorkbenchManifestForServerStorage(input.manifest);
	const ref = manifest.toolStateBundle.seriesRef;
	const seriesKey =
		input.seriesKey?.trim() || dicomWorkbenchSeriesKeyFromManifest(manifest);
	const existingIndex = dicomWorkbenchBundles.findIndex(
		(bundle) => bundle.seriesKey === seriesKey,
	);
	const previous =
		existingIndex >= 0 ? dicomWorkbenchBundles[existingIndex] : null;
	const bundle: DicomWorkbenchBundle = {
		id: previous?.id ?? randomUUID(),
		organizationId,
		seriesKey,
		patientId: null,
		studyInstanceUid:
			ref.studyInstanceUid ?? manifest.launchManifest.studyInstanceUid,
		seriesInstanceUid:
			ref.seriesInstanceUid ?? manifest.launchManifest.seriesInstanceUid,
		sourceName: ref.sourceName,
		sourceKind: ref.sourceKind,
		pixelPolicy: "metadata_and_tool_state_only_no_pixels",
		manifest,
		clientSavedAt: input.clientSavedAt ?? null,
		serverSavedAt: now,
		createdAt: previous?.createdAt ?? now,
		updatedAt: now,
		warnings: dicomWorkbenchWarnings(manifest),
	};

	if (existingIndex >= 0)
		dicomWorkbenchBundles.splice(existingIndex, 1, bundle);
	else dicomWorkbenchBundles.unshift(bundle);
	dicomWorkbenchBundles.splice(30);

	recordAuditEvent({
		entityType: "dicom_workbench_bundle",
		entityId: bundle.id,
		action: previous
			? "dicom_workbench_bundle_updated"
			: "dicom_workbench_bundle_saved",
		reason: `${bundle.sourceName}: готовность ${manifest.readiness.readinessScore}%, режим ${dicomRenderTextureStrategyAuditLabels[manifest.renderCachePlan.textureStrategy]}, снимки не копировались в пакет.`,
	});
	return bundle;
}

function _listDicomWorkbenchBundles(limit = 8): DicomWorkbenchBundle[] {
	const normalizedLimit = Math.max(1, Math.min(limit, 30));
	return dicomWorkbenchBundles
		.slice()
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
		.slice(0, normalizedLimit);
}

function _createImagingStudy(input: {
	patientId: string;
	visitId?: string | null | undefined;
	kind: ImagingStudyKind;
	title: string;
	toothCode?: string | null | undefined;
	region?: string | null | undefined;
	sourceKind: ImagingSourceKind;
	sourceName: string;
	storagePath?: string | null | undefined;
	dicomStudyUid?: string | null | undefined;
	capturedAt?: string | undefined;
	aiSummary?: string | null | undefined;
}): ImagingStudy {
	const id = randomUUID();
	const title = input.title.trim() || imagingKindTitles[input.kind];
	const sourceName = input.sourceName.trim() || "manual";
	const study: ImagingStudy = {
		id,
		organizationId,
		patientId: input.patientId,
		visitId: input.visitId ?? null,
		kind: input.kind,
		title: title.length > 180 ? title.slice(0, 180) : title,
		toothCode: nullableTrimmed(input.toothCode),
		region: nullableTrimmed(input.region),
		capturedAt: input.capturedAt ?? new Date().toISOString(),
		sourceKind: input.sourceKind,
		sourceName: sourceName.length > 160 ? sourceName.slice(0, 160) : sourceName,
		storagePath: nullableTrimmed(input.storagePath),
		dicomStudyUid: nullableTrimmed(input.dicomStudyUid),
		status: "needs_review",
		aiSummary:
			nullableTrimmed(input.aiSummary) ??
			"Черновик: снимок добавлен, требуется проверка врача.",
		previewUrl: `/api/imaging/studies/${id}/preview.svg`,
		viewerUrl: `/api/imaging/studies/${id}/preview.svg`,
	};
	imagingStudies.unshift(study);
	recordAuditEvent({
		entityType: "imaging_study",
		entityId: study.id,
		action: "imaging_created",
		reason: `${study.title} добавлен в карту пациента.`,
	});
	return study;
}


export { dicomWorkbenchBundles, imagingViewerSessions, sanitizeDicomWorkbenchBundleForServerStorage };
