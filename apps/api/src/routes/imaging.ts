import { createHash, timingSafeEqual } from "node:crypto";
import dns from "node:dns/promises";
import { createReadStream, type Dirent, existsSync, statSync } from "node:fs";
import { access, opendir, readdir, readFile, stat } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import {
	type CtSurfaceModelManifest,
	createImagingStudySchema,
	type DentalModelFileCandidate,
	type DentalModelFileFormat,
	type DentalModelFileRole,
	type DentalModelWorkbenchLoadTarget,
	type DentalModelWorkbenchPairingHint,
	type DicomClientRuntimeProfile,
	type DicomFolderWorkupPath,
	type DicomFolderWorkupPlanRequest,
	type DicomGpuRenderPlan,
	type DicomLocalFolderDiscoveryCandidate,
	type DicomLocalFolderDiscoveryRequest,
	type DicomMprReadiness,
	type DicomSeriesPreviewGroup,
	type DicomViewerWorkbenchManifestRequest,
	type DicomWebAuthMode,
	type DicomWebConnectorCheckRequest,
	type DicomWebConnectorStatus,
	type DicomWorkstationReadinessCheck,
	type DicomWorkstationReadinessRequest,
	dicomFirstFramePreviewRequestSchema,
	dicomFolderSeriesPreviewRequestSchema,
	dicomFolderSeriesPreviewResponseSchema,
	dicomFolderWorkupPlanRequestSchema,
	dicomFolderWorkupPlanResponseSchema,
	dicomLocalFolderDiscoveryRequestSchema,
	dicomLocalFolderDiscoveryResponseSchema,
	dicomRenderCachePlanRequestSchema,
	dicomSeriesPreviewRequestSchema,
	dicomViewerLaunchManifestRequestSchema,
	dicomViewerToolStateBundleRequestSchema,
	dicomViewerWorkbenchManifestRequestSchema,
	dicomViewerWorkbenchManifestResponseSchema,
	dicomWebConnectorCheckRequestSchema,
	dicomWebConnectorCheckResponseSchema,
	dicomWorkbenchBundleListResponseSchema,
	dicomWorkbenchBundleResponseSchema,
	dicomWorkstationReadinessRequestSchema,
	dicomWorkstationReadinessResponseSchema,
	type ImagingImportPreviewRow,
	type ImagingSourceKind,
	type ImagingStudy,
	imagingFolderScanRequestSchema,
	imagingFolderScanResponseSchema,
	imagingImportCommitResponseSchema,
	imagingImportPreviewRequestSchema,
	imagingImportPreviewResponseSchema,
	imagingStudySchema,
	imagingViewerSessionResponseSchema,
	type LocalImagingOrganizerCase,
	type LocalImagingOrganizerRecommendedAction,
	type LocalImagingOrganizerRequest,
	localImagingOrganizerRequestSchema,
	localImagingOrganizerResponseSchema,
	normalizeDate,
	saveDicomWorkbenchBundleRequestSchema,
	saveImagingViewerSessionRequestSchema,
	splitLine,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	denteAdminSecretHeader,
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	unguardedBypassAllowed,
} from "../accessGuard.js";
import { analyzeVisiographImage } from "../ai/visiograph.js";
import { analyzeImagingStudy } from "../ai/visionAnalyzer.js";
import {
	createImagingStudyInDb,
	getAllImagingStudies,
	getImagingStudiesForPatient,
	getImagingStudyById,
	getOrCreateImagingViewerSession,
	listDicomWorkbenchBundles,
	saveDicomWorkbenchBundle,
	saveImagingViewerSession,
	updateImagingStudyAiSummaryInDb,
} from "../db/imagingQuery.js";
import {
	getPatientByIdFromDb,
	getPatientsFromDb,
} from "../db/patientsQuery.js";
import { withTenantCtx } from "../db/rls.js";
import { getVisitByIdInDb } from "../db/visitsQuery.js";
import { browserRenderableImageMimeType } from "../imaging/previewFormats.js";
import {
	type ApiDicomFolderTraversalLimits,
	type ApiDicomScanOptions,
	apiDicomDefaultMaxEntriesPerFolder,
	apiDicomDefaultMaxFolders,
	buildDicomFirstFramePreview,
	buildDicomHeaderManifest,
	collectDicomHeaderFiles,
	createApiDicomScanYieldState,
	detectDelimiter,
	detectKind,
	detectSourceKind,
	hasDicomMagic,
	inferManifestFieldsFromPath,
	isApiDicomScanAbortError,
	kindLabels,
	matchPatient,
	maybeYieldApiDicomScan,
	normalizeHeader,
	normalizePhone,
	parseDicomSeriesManifest,
	parseManifestLine,
	quoteManifestCell,
} from "../modules/imaging/dicomDecoder.js";
import {
	addQueryParams,
	buildBaseReadinessChecks,
	buildDicomClientRuntimeProfile,
	buildDicomRenderCachePlan,
	buildDicomViewerLaunchManifest,
	buildDicomViewerToolStateBundle,
	buildGpuRenderPlan,
	dicomArchiveExtensions,
	dicomPixelFileExtensions,
	isDicomPixelPath,
	readinessCheck,
	safeJoinUrl,
} from "../modules/imaging/hardwarePlanner.js";
import { requireOrganizationId } from "../security/identity.js";

type ImagingPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

function parseImagingPayload<T>(
	schema: ImagingPayloadSchema<T>,
	value: unknown,
	message: string,
) {
	const parsed = schema.safeParse(value);
	if (parsed.success) return { ok: true as const, data: parsed.data };
	return {
		ok: false as const,
		response: {
			error: "ImagingValidationError",
			message,
		},
	};
}

function configuredDicomWebSettingsSecret(): string | null {
	return process.env.DENTE_SETTINGS_ADMIN_SECRET?.trim() || null;
}

/**
 * Послабление для разработки на маршруте проверки DICOM-архива: работает ТОЛЬКО
 * при явно названном режиме разработки и ТОЛЬКО при явно выставленном флаге.
 *
 * ПОЧЕМУ ЗДЕСЬ ОБЩИЙ ПРЕДИКАТ, А НЕ ПРЕЖНЕЕ `NODE_ENV !== "production"`.
 * Прежнее условие истинно, когда NODE_ENV НЕ ЗАДАН ВОВСЕ, а незаданный NODE_ENV —
 * типовое состояние настоящего сервера: `apps/api/package.json` объявляет
 * `"start": "node dist/server.js"` и режим не задаёт. Значит у заказчика,
 * поднявшего сервер этой командой, «мы не в production» было ИСТИНОЙ, и от
 * обращения к чужому DICOM-архиву без секрета администратора защищало только то,
 * что второй флаг где-то не выставлен. Замерено на этом дереве до правки:
 * пустой NODE_ENV + DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS=1 → охрана снята,
 * маршрут доходил до разбора тела (400 по существу вместо 503).
 *
 * `accessGuard.ts` разбирает эту инверсию подробно и НАЗЫВАЕТ ЭТОТ ФАЙЛ как одну
 * из четырёх копий, которую должен переписать владелец. Пятой копии условия
 * безопасности здесь не будет: одно условие в одном месте — единственный способ
 * не оставить следующую инверсию незамеченной.
 *
 * Смысл послабления не изменился: `development`/`test` плюс
 * `DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS=1` (имя флага общее с настройками
 * намеренно — секрет тоже общий, DENTE_SETTINGS_ADMIN_SECRET). Закрылся ровно
 * один случай — пустой или незнакомый NODE_ENV («staging», «prod», опечатка)
 * больше не считается разработкой.
 *
 * ВЕРНУТЬ «КАК БЫЛО» — значит снова открыть архив снимков на боевом сервере.
 * Если нужно работать без секрета локально, задайте NODE_ENV=development, а не
 * возвращайте отрицание.
 */
function dicomWebSettingsUnguardedAllowed(): boolean {
	return unguardedBypassAllowed("DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS");
}

function timingSafeDicomWebSecretEqual(
	providedSecret: string | null,
	expectedSecret: string,
): boolean {
	if (!providedSecret) return false;
	const providedHash = createHash("sha256").update(providedSecret).digest();
	const expectedHash = createHash("sha256").update(expectedSecret).digest();
	return timingSafeEqual(providedHash, expectedHash);
}

async function requireDicomWebSettingsAccess(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<boolean> {
	const adminSecret = configuredDicomWebSettingsSecret();
	if (!adminSecret) {
		if (dicomWebSettingsUnguardedAllowed()) return true;
		reply.code(503).send({
			error: "DicomWebSettingsAdminSecretMissing",
			message:
				"На сервере не задан секрет администратора клиники для проверки архива снимков.",
		});
		return false;
	}

	const providedSecret = request.headers[denteAdminSecretHeader];
	const normalizedProvidedSecret = Array.isArray(providedSecret)
		? providedSecret[0]
		: providedSecret;
	if (
		timingSafeDicomWebSecretEqual(
			typeof normalizedProvidedSecret === "string"
				? normalizedProvidedSecret
				: null,
			adminSecret,
		)
	) {
		return true;
	}

	reply.code(403).send({
		error: "DicomWebSettingsAdminSecretRequired",
		message:
			"Для проверки архива снимков нужен действующий секрет администратора клиники.",
	});
	return false;
}

function createImagingRequestAbortSignal(request: FastifyRequest): AbortSignal {
	const controller = new AbortController();
	request.raw.once("close", () => {
		if (request.raw.aborted) controller.abort();
	});
	return controller.signal;
}

function sendImagingScanCancelled(reply: FastifyReply) {
	return reply.code(499).send({
		error: "ImagingScanCancelled",
		message:
			"Сканирование локальных снимков остановлено. Повторите действие с более узкой папкой или меньшим лимитом.",
	});
}

async function runAbortableImagingScan<T>(
	request: FastifyRequest,
	reply: FastifyReply,
	operation: (options: ApiDicomScanOptions) => Promise<T>,
) {
	const requestSignal = createImagingRequestAbortSignal(request);
	const timeoutSignal = AbortSignal.timeout(300_000);
	const signal = AbortSignal.any([requestSignal, timeoutSignal]);

	try {
		return await operation({ signal });
	} catch (error) {
		if (isApiDicomScanAbortError(error)) return sendImagingScanCancelled(reply);
		throw error;
	}
}

const imagingStudyNotFoundError = "ImagingStudyNotFound" as const;
const imagingStudyScopeError = "ImagingStudyScopeError" as const;

function sendImagingStudyNotFound(reply: FastifyReply) {
	return reply.code(404).send({
		error: imagingStudyNotFoundError,
		message: "Снимок не найден.",
	});
}

function sendImagingStudyScopeError(
	reply: FastifyReply,
	statusCode: 404 | 409,
	message: string,
) {
	return reply.code(statusCode).send({
		error: imagingStudyScopeError,
		message,
	});
}

const headerAliases: Record<
	string,
	keyof Pick<
		ImagingImportPreviewRow,
		| "patientName"
		| "phone"
		| "kind"
		| "title"
		| "toothCode"
		| "region"
		| "capturedAt"
		| "filePath"
		| "sourceName"
	>
> = {
	fio: "patientName",
	fullname: "patientName",
	name: "patientName",
	patient: "patientName",
	"patient name": "patientName",
	фио: "patientName",
	пациент: "patientName",
	клиент: "patientName",
	phone: "phone",
	tel: "phone",
	telephone: "phone",
	телефон: "phone",
	номер: "phone",
	modality: "kind",
	модальность: "kind",
	type: "kind",
	kind: "kind",
	тип: "kind",
	вид: "kind",
	title: "title",
	название: "title",
	tooth: "toothCode",
	зуб: "toothCode",
	region: "region",
	область: "region",
	date: "capturedAt",
	captured: "capturedAt",
	дата: "capturedAt",
	file: "filePath",
	path: "filePath",
	filepath: "filePath",
	файл: "filePath",
	путь: "filePath",
	source: "sourceName",
	источник: "sourceName",
};
const imagingFileExtensions = new Set([
	".dcm",
	".dicom",
	".ima",
	".jpg",
	".jpeg",
	".png",
	".tif",
	".tiff",
	".bmp",
	".webp",
	...dicomArchiveExtensions,
]);
const dentalModelFileExtensions = new Set([
	".stl",
	".obj",
	".ply",
	".glb",
	".gltf",
	".3mf",
]);
const dicomDiscoverySkipDirectoryNames = new Set([
	".cache",
	".codex",
	".edge-debug",
	".git",
	".next",
	".nuxt",
	".venv",
	"__pycache__",
	"build",
	"coverage",
	"dist",
	"node_modules",
	"site-packages",
	"target",
	"venv",
]);

export async function parseImagingManifest(
	orgIdOrInput:
		| { sourceName?: string; sourceKind?: ImagingSourceKind; rawText?: string }
		| string,
	maybeInput?:
		| { sourceName?: string; sourceKind?: ImagingSourceKind; rawText?: string }
		| string,
) {
	const orgId =
		typeof orgIdOrInput === "string" && maybeInput ? orgIdOrInput : "default";
	const input =
		typeof orgIdOrInput === "object"
			? orgIdOrInput
			: (maybeInput ?? orgIdOrInput);
	const rawText = typeof input === "string" ? input : (input?.rawText ?? "");
	const sourceName =
		typeof input === "string" ? "Manifest" : (input?.sourceName ?? "Manifest");
	const sourceKind =
		typeof input === "string"
			? "folder_watch"
			: (input?.sourceKind ?? "folder_watch");
	const lines = rawText
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	if (!lines.length) {
		return imagingImportPreviewResponseSchema.parse({
			sourceName,
			sourceKind,
			totalRows: 0,
			readyRows: 0,
			warningRows: 0,
			blockedRows: 0,
			rows: [],
			parserNotes: ["Нет строк для разбора."],
		});
	}

	const delimiter = detectDelimiter(lines[0] ?? "");
	const headers = splitLine(lines[0] ?? "", delimiter).map(
		(cell) => headerAliases[normalizeHeader(cell)] ?? null,
	);
	const patients = await getPatientsFromDb(orgId);
	const hasHeader = headers.some(Boolean);
	const rows: ImagingImportPreviewRow[] = await Promise.all(
		(hasHeader ? lines.slice(1) : lines).map(async (line, index) => {
			if (!hasHeader)
				return parseManifestLine(
					patients,
					line,
					index + 1,
					sourceKind,
					sourceName,
				);
			const cells = splitLine(line, delimiter);
			const draft: Partial<ImagingImportPreviewRow> = {
				rowNumber: index + 2,
				sourceKind: sourceKind,
				sourceName: sourceName,
				warnings: [],
			};
			headers.forEach((field, cellIndex) => {
				if (!field) return;
				const value = cells[cellIndex]?.trim() || null;
				if (field === "phone") draft.phone = normalizePhone(value);
				else if (field === "kind") draft.kind = detectKind(value);
				else if (field === "capturedAt")
					draft.capturedAt = normalizeDate(value);
				else draft[field] = value as never;
			});
			const { patient, ambiguous, weakMatch } = matchPatient(
				patients,
				draft.patientName ?? null,
				draft.phone ?? null,
			);
			const kind = draft.kind ?? detectKind(draft.filePath ?? "");
			const source = detectSourceKind(
				draft.filePath ?? draft.sourceName ?? "",
				sourceKind,
			);
			const warnings: string[] = [];
			if (ambiguous)
				warnings.push(
					"Найдено несколько пациентов с такими данными — выберите нужного вручную",
				);
			else if (!patient)
				warnings.push("Пациент не найден, нужно сопоставление");
			else if (weakMatch)
				warnings.push(
					"Пациент найден только по ФИО (без телефона) — подтвердите совпадение",
				);
			if (!kind) warnings.push("Тип снимка не распознан");
			if (!draft.filePath) warnings.push("Нет пути к файлу снимка");
			const blocked = !draft.filePath || !kind;
			return {
				rowNumber: draft.rowNumber ?? index + 2,
				patientId: patient?.id ?? null,
				patientName: patient?.fullName ?? draft.patientName ?? null,
				phone: draft.phone ?? null,
				kind,
				title:
					draft.title ??
					(kind
						? `${kindLabels[kind]}${draft.toothCode ? ` ${draft.toothCode}` : ""}`
						: null),
				toothCode: draft.toothCode ?? null,
				region: draft.region ?? null,
				capturedAt: draft.capturedAt ?? null,
				filePath: draft.filePath ?? null,
				sourceKind: source,
				sourceName: draft.sourceName ?? sourceName,
				// Автоматический импорт (status "ready") только при надёжном совпадении:
				// слабое совпадение по одному ФИО и неоднозначность требуют человека.
				status: blocked
					? "blocked"
					: patient && !weakMatch
						? "ready"
						: "warning",
				warnings,
			};
		}),
	);

	return imagingImportPreviewResponseSchema.parse({
		sourceName,
		sourceKind,
		totalRows: rows.length,
		readyRows: rows.filter((row) => row.status === "ready").length,
		warningRows: rows.filter((row) => row.status === "warning").length,
		blockedRows: rows.filter((row) => row.status === "blocked").length,
		rows,
		parserNotes: [
			"Парсер списка поддерживает CSV/TSV/текст с разделителем |, пути к КТ/снимкам, экспорты JPG/PNG/TIFF/BMP/WebP, подсказки RVG и синонимы ОПТГ/ТРГ/КЛКТ/прицельного снимка.",
			"Готовые строки можно позже провести через локальный обработчик: он скопирует файлы, рассчитает хэши и привяжет их к картам пациентов.",
		],
	});
}

function escapeXml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

/*
 * ТИП ЗДЕСЬ УЖЕ БЫЛ, ЕГО ПРОСТО НЕ ДОТЯНУЛИ.
 *
 * Стояло `study: any`, и из-за этого `kindLabels[study.kind]` давало
 * «TS7053: Element implicitly has an any type» при включённом noImplicitAny.
 * Второй владелец типа не нужен: `getImagingStudyById` (db/imagingQuery.ts:95) уже
 * объявлен как `Promise<ImagingStudy | null>`, единственный вызывающий (:6725) зовёт
 * эту функцию ПОСЛЕ проверки на null, а читает она ровно четыре поля — kind, title,
 * toothCode, region, — и все четыре есть в `imagingStudySchema`.
 *
 * Цена `any` здесь не абстрактная: `kindLabels[study.kind]` с посторонним значением
 * в `kind` молча даёт undefined, и в SVG-предпросмотр снимка уехала бы пустая
 * подпись вместо названия исследования.
 */
function previewSvg(study: ImagingStudy) {
	const label = kindLabels[study.kind];
	const detail = study.toothCode
		? `Зуб ${study.toothCode}`
		: (study.region ?? "Область не указана");
	const anatomy =
		study.kind === "cbct"
			? `<circle cx="172" cy="126" r="72" fill="none" stroke="#d7fff6" stroke-width="14" opacity=".42"/>
         <circle cx="172" cy="126" r="42" fill="none" stroke="#d7fff6" stroke-width="8" opacity=".34"/>
         <path d="M100 126h144M172 54v144" stroke="#d7fff6" stroke-width="3" opacity=".35"/>`
			: study.kind === "ceph"
				? `<path d="M122 58c54-18 99 16 106 70 6 43-24 72-63 77-28 3-61-9-73-35-13-29 2-87 30-112Z" fill="none" stroke="#d7fff6" stroke-width="10" opacity=".48"/>
           <path d="M137 101c22 10 49 12 78 2M124 148h94" stroke="#d7fff6" stroke-width="6" stroke-linecap="round" opacity=".34"/>
           <circle cx="151" cy="112" r="8" fill="#d7fff6" opacity=".55"/>`
				: study.kind === "opg"
					? `<path d="M48 120c34-58 92-78 124-50 32-28 90-8 124 50" fill="none" stroke="#d7fff6" stroke-width="15" stroke-linecap="round" opacity=".45"/>
           <path d="M58 137c28 46 198 46 228 0" fill="none" stroke="#d7fff6" stroke-width="13" stroke-linecap="round" opacity=".32"/>
           <g opacity=".42">${Array.from({ length: 14 }, (_, index) => {
							const x = 72 + index * 15;
							const h = index < 7 ? 22 + index * 2 : 50 - index * 2;
							return `<rect x="${x}" y="${118 - h / 2}" width="8" height="${h}" rx="4" fill="#d7fff6"/>`;
						}).join("")}</g>`
					: `<rect x="78" y="45" width="188" height="150" rx="18" fill="#102f33" stroke="#d7fff6" stroke-width="3" opacity=".86"/>
           <path d="M124 105c10-28 34-35 48-12 13-23 40-16 48 12 8 29-12 67-28 74-11 5-15-18-20-18s-9 23-20 18c-16-7-36-45-28-74Z" fill="#d7fff6" opacity=".62"/>`;

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 344 220" role="img" aria-label="${escapeXml(study.title)}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop stop-color="#092b2e"/>
      <stop offset="1" stop-color="#145f62"/>
    </linearGradient>
    <radialGradient id="glow" cx=".5" cy=".45" r=".7">
      <stop stop-color="#eafffa" stop-opacity=".34"/>
      <stop offset="1" stop-color="#eafffa" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="344" height="220" rx="18" fill="url(#bg)"/>
  <rect x="12" y="12" width="320" height="196" rx="14" fill="url(#glow)" opacity=".9"/>
  ${anatomy}
  <text x="24" y="34" fill="#eafffa" font-family="Inter, Arial" font-size="17" font-weight="800">${escapeXml(label)}</text>
  <text x="24" y="58" fill="#c9eee8" font-family="Inter, Arial" font-size="13" font-weight="700">${escapeXml(detail)}</text>
</svg>`;
}

async function collectImagingFiles(
	root: string,
	recursive: boolean,
	maxFiles: number,
	options: ApiDicomScanOptions = {},
	limits: ApiDicomFolderTraversalLimits = {},
) {
	const files: string[] = [];
	const warnings: string[] = [];
	const queue = [path.resolve(root)];
	const maxFolders = Math.max(
		1,
		Math.floor(limits.maxFolders ?? apiDicomDefaultMaxFolders),
	);
	const maxEntriesPerFolder = Math.max(
		1,
		Math.floor(
			limits.maxEntriesPerFolder ?? apiDicomDefaultMaxEntriesPerFolder,
		),
	);
	const yieldState = createApiDicomScanYieldState();
	let queueIndex = 0;
	let foldersScanned = 0;
	let folderQueueLimitHit = false;

	const concurrencyLimit = 15;
	let activeWorkers = 0;
	let isDone = false;
	let errorToThrow: unknown = null;

	await new Promise<void>((resolve, reject) => {
		function spawnWorkers() {
			if (errorToThrow || isDone) return;

			while (
				activeWorkers < concurrencyLimit &&
				queueIndex < queue.length &&
				files.length < maxFiles &&
				foldersScanned < maxFolders
			) {
				const current = queue[queueIndex];
				queueIndex += 1;
				foldersScanned += 1;
				activeWorkers += 1;

				if (!current) {
					activeWorkers -= 1;
					continue;
				}

				processFolder(current).finally(() => {
					activeWorkers -= 1;
					if (errorToThrow) return;

					if (
						files.length >= maxFiles ||
						foldersScanned >= maxFolders ||
						queueIndex >= queue.length
					) {
						if (activeWorkers === 0 && !isDone) {
							isDone = true;
							resolve();
						}
					} else {
						spawnWorkers();
					}
				});
			}

			if (
				activeWorkers === 0 &&
				(queueIndex >= queue.length ||
					files.length >= maxFiles ||
					foldersScanned >= maxFolders)
			) {
				if (!isDone) {
					isDone = true;
					resolve();
				}
			}
		}

		async function processFolder(current: string) {
			try {
				await maybeYieldApiDicomScan(yieldState, options.signal);
				let entriesInspected = 0;
				const directory = await opendir(current);
				for await (const entry of directory) {
					if (files.length >= maxFiles) break;

					await maybeYieldApiDicomScan(yieldState, options.signal);
					entriesInspected += 1;
					if (entriesInspected > maxEntriesPerFolder) {
						warnings.push(
							`Проверка папки ограничена ${maxEntriesPerFolder} элементами: ${current}`,
						);
						break;
					}
					const entryName = entry.name.toString();
					const fullPath = path.join(current, entryName);
					if (entry.isDirectory()) {
						if (recursive) {
							const queuedFolders = queue.length - queueIndex;
							if (foldersScanned + queuedFolders < maxFolders) {
								queue.push(fullPath);
							} else {
								folderQueueLimitHit = true;
							}
						}
						continue;
					}
					if (!entry.isFile()) continue;
					if (!imagingFileExtensions.has(path.extname(entryName).toLowerCase()))
						continue;

					if (files.length < maxFiles) {
						files.push(fullPath);
						if (files.length >= maxFiles) {
							warnings.push(`Остановлено на лимите ${maxFiles} файлов.`);
							break;
						}
					}
				}
			} catch (error) {
				if (isApiDicomScanAbortError(error)) {
					errorToThrow = error;
					reject(error);
					return;
				}
				warnings.push(`Не удалось прочитать папку: ${current}`);
			}
		}

		spawnWorkers();
	});

	if (errorToThrow) throw errorToThrow;
	if (
		foldersScanned >= maxFolders ||
		folderQueueLimitHit ||
		queueIndex < queue.length
	) {
		warnings.push(`Сканирование папок остановлено на лимите ${maxFolders}.`);
	}

	return { files, warnings };
}

function buildFolderScanManifest(files: string[]) {
	const rows = files.map((filePath) => {
		const fields = inferManifestFieldsFromPath(filePath);
		return [
			fields.patientName,
			fields.kind,
			fields.toothCode,
			fields.date,
			fields.filePath,
			"folder_scan",
		]
			.map(quoteManifestCell)
			.join(";");
	});
	return ["patient;type;tooth;date;file;source", ...rows].join("\n");
}

function buildQidoProbeUrl(input: DicomWebConnectorCheckRequest) {
	const studiesUrl = safeJoinUrl(input.endpointUrl, input.qidoRsPath);
	if (input.studyInstanceUid && input.seriesInstanceUid) {
		return addQueryParams(
			`${studiesUrl}/${encodeURIComponent(input.studyInstanceUid)}/series`,
			{
				SeriesInstanceUID: input.seriesInstanceUid,
			},
		);
	}
	if (input.studyInstanceUid) {
		return addQueryParams(studiesUrl, {
			StudyInstanceUID: input.studyInstanceUid,
		});
	}
	return addQueryParams(studiesUrl, { limit: "1" });
}

/**
 * Заголовки ПРОБНОГО запроса к архиву снимков (QIDO-RS, checkDicomWebConnector).
 *
 * ЗДЕСЬ НАМЕРЕННО НЕТ ЗАГОЛОВКА Authorization, И ЭТО НЕ ЗАБЫТАЯ СТРОКА.
 *
 * ЧТО БЫЛО. Функция вешала серверный DICOMWEB_BEARER_TOKEN (или
 * DICOMWEB_BASIC_AUTH) на запрос к ЛЮБОМУ хосту, который прошёл SSRF-гейт.
 * Адрес при этом вводит оператор в поле «адрес архива» прямо перед пробой.
 * SSRF-гейт тут не помогает и не должен: он отсекает внутренние и служебные
 * диапазоны, а «https://архив-злоумышленника.example» — совершенно легальный
 * публичный адрес, он гейт проходит. Дефект не в адресе, а в том, что учётные
 * данные не привязаны к хосту, для которого выданы: один запрос — и секрет
 * доступа к архиву медицинских снимков лежит в чужом журнале.
 *
 * ПОЧЕМУ ИМЕННО ПРОБА ОПАСНЕЕ ВСЕГО. dicomWebAuthHeaders вызывается ровно из
 * одного места — checkDicomWebConnector, то есть боевых запросов с этим токеном
 * в коде нет вообще. Единственный запрос, который его нёс, шёл по адресу,
 * который оператор только что напечатал.
 *
 * ПОЧЕМУ НЕ СДЕЛАНА ПРИВЯЗКА К ХОСТУ, А ПРОСТО СНЯТ ЗАГОЛОВОК. Привязывать
 * не к чему: хост архива в конфигурации нигде не зафиксирован. Проверено —
 * DICOMWEB_BEARER_TOKEN и DICOMWEB_BASIC_AUTH не описаны в .env.example, а из
 * адресов, известных серверу (routes/system.ts), есть только локальный
 * обработчик КЛКТ и внешний просмотрщик OHIF, но не адрес самого архива.
 * Заводить под это новую переменную окружения — изменение конфигурации
 * развёртывания, и решение о ней принимает ведущий, а не эта правка.
 *
 * ЧТО ПРИ ЭТОМ НЕ ЛОМАЕТСЯ. Проба проверяет ДОСТИЖИМОСТЬ, а не аутентификацию:
 * connectorStatusFromHttpStatus уже трактует 401/403 как отдельный статус
 * auth_required, то есть «архив жив и требует учётные данные» — это исправный
 * результат проверки, а не отказ.
 */
function dicomWebAuthHeaders(authMode: DicomWebAuthMode) {
	const headers: Record<string, string> = {
		Accept: "application/dicom+json, application/json;q=0.9, */*;q=0.1",
	};
	const warnings: string[] = [];

	if (authMode === "bearer") {
		warnings.push(
			process.env.DICOMWEB_BEARER_TOKEN?.trim()
				? "Серверный токен архива снимков настроен, но на проверке связи не отправляется: он выдан конкретному архиву, а адрес проверки задает оператор. Ответ 401/403 означает, что архив доступен и требует учетных данных."
				: "Серверный токен архива снимков не настроен; запрос будет отправлен без учетных данных архива.",
		);
	}

	if (authMode === "basic") {
		warnings.push(
			process.env.DICOMWEB_BASIC_AUTH?.trim()
				? "Серверная авторизация архива снимков настроена, но на проверке связи не отправляется: она выдана конкретному архиву, а адрес проверки задает оператор. Ответ 401/403 означает, что архив доступен и требует учетных данных."
				: "Серверная авторизация архива снимков не настроена; запрос будет отправлен без учетных данных архива.",
		);
	}

	if (authMode === "reverse_proxy") {
		warnings.push(
			"Выбран серверный доступ через клиническую сеть: CRM ожидает, что авторизация архива обрабатывается вне этого запроса.",
		);
	}

	return { headers, warnings };
}

function connectorStatusFromHttpStatus(
	httpStatus: number | null,
	fetchError: boolean,
): DicomWebConnectorStatus {
	if (fetchError) return "unreachable";
	if (httpStatus === 401 || httpStatus === 403) return "auth_required";
	if (httpStatus !== null && httpStatus >= 200 && httpStatus < 300)
		return "ready";
	return "misconfigured";
}

// ---------------------------------------------------------------------------
// SSRF-гейт адреса архива снимков.
//
// Здесь сервер клиники по указанию пользователя открывает исходящее соединение,
// то есть это классическая мишень SSRF: администратор клиники подставляет адрес,
// а ходит по нему сервер — из доверенной сети, с серверным токеном архива в
// заголовке Authorization (см. dicomWebAuthHeaders). Поэтому список запрещённых
// диапазонов собран по реестрам IANA Special-Purpose Address Registry (IPv4/IPv6)
// и рекомендациям OWASP SSRF Prevention Cheat Sheet, а не «по памяти».
//
// ПОЧЕМУ ЗДЕСЬ КАЖДЫЙ ДИАПАЗОН, А НЕ ТОЛЬКО RFC 1918: следующий агент,
// увидев «лишние» строки, попытается их вычистить. Не надо. Прошлая версия
// гейта блокировала ровно шесть условий и пропускала 100.64.0.0/10, 192.0.0.0/24,
// 198.18.0.0/15, 224.0.0.0/4, 240.0.0.0/4, ::, NAT64 64:ff9b::/96 (через который
// адрес метаданных облака 169.254.169.254 достаётся как 64:ff9b::a9fe:a9fe) и
// IPv4-compatible ::127.0.0.1. Каждая строка ниже закрывает измеренную дыру.
//
// ОГРАНИЧЕНИЕ, КОТОРОЕ НАДО ЗНАТЬ: это блок-лист. OWASP прямо пишет, что
// allow-list («ходим только по заранее утверждённым хостам») строго сильнее, и
// если у клиники появится реестр разрешённых адресов архивов, правильное место
// его вставки — isSafeTarget, до резолвинга.
// ---------------------------------------------------------------------------

type BlockedIpv4Range = {
	readonly cidr: string;
	readonly base: number;
	readonly mask: number;
	readonly why: string;
};
type BlockedIpv6Range = {
	readonly cidr: string;
	readonly base: Uint8Array;
	readonly bits: number;
	readonly why: string;
};

/**
 * Разбор IPv4 в 32-битное число. Принимает ТОЛЬКО каноническую запись «d.d.d.d»
 * без ведущих нулей: «012.0.0.1» и «0177.0.0.1» отвергаются здесь явно.
 *
 * Это не паранойя ради паранойи, а защита от октальной путаницы, на которой
 * ломались чужие библиотеки разбора адресов. На этом хосте (Node v24.13.0)
 * net.isIPv4("012.0.0.1") уже возвращает false, а WHATWG-парсер URL нормализует
 * «http://0177.0.0.1/» в hostname «127.0.0.1» ещё до нас — но разбор обязан быть
 * самодостаточным, потому что его же вызывает IPv6-ветка для встроенных адресов,
 * куда нормализация URL не доходит.
 */
function ipv4ToUint32(ip: string): number | null {
	const parts = ip.split(".");
	if (parts.length !== 4) return null;
	let value = 0;
	for (const part of parts) {
		if (!/^(?:0|[1-9][0-9]{0,2})$/.test(part)) return null;
		const octet = Number(part);
		if (octet > 255) return null;
		value = value * 256 + octet;
	}
	return value >>> 0;
}

function parseIpv4Cidr(cidr: string, why: string): BlockedIpv4Range {
	const [prefix, bitsText] = cidr.split("/");
	const base = ipv4ToUint32(prefix ?? "");
	const bits = Number(bitsText);
	if (base === null || !Number.isInteger(bits) || bits < 0 || bits > 32) {
		// Ошибка в самой таблице — это дыра в гейте, поэтому падаем на старте
		// сервера, а не молча пропускаем адрес мимо проверки.
		throw new Error(`Некорректный IPv4-CIDR в списке SSRF-блокировок: ${cidr}`);
	}
	const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
	return { cidr, base: (base & mask) >>> 0, mask, why };
}

/**
 * IPv4: запрещённые диапазоны. Источник — IANA IPv4 Special-Purpose Address
 * Registry плюс общеизвестные адреса метаданных облаков.
 */
const blockedIpv4Ranges: readonly BlockedIpv4Range[] = [
	parseIpv4Cidr(
		"0.0.0.0/8",
		"«этот хост в этой сети» (RFC 1122); 0.0.0.0 на многих стеках означает локальный интерфейс",
	),
	parseIpv4Cidr(
		"10.0.0.0/8",
		"частная сеть RFC 1918 — внутренняя сеть клиники",
	),
	parseIpv4Cidr(
		"100.64.0.0/10",
		"CGNAT RFC 6598: операторский NAT и оборудование клиники за ним. Сюда же попадает 100.100.100.200 — эндпоинт метаданных Alibaba Cloud ECS, отдельная строка под него не нужна",
	),
	parseIpv4Cidr(
		"127.0.0.0/8",
		"loopback: сам сервер CRM, БД на 127.0.0.1:5432, локальные модули-мосты",
	),
	parseIpv4Cidr(
		"169.254.0.0/16",
		"link-local RFC 3927 и, главное, 169.254.169.254 — эндпоинт метаданных с временными учётными данными у AWS, GCP, Azure, Oracle Cloud, DigitalOcean, Hetzner и OpenStack",
	),
	parseIpv4Cidr("172.16.0.0/12", "частная сеть RFC 1918"),
	parseIpv4Cidr(
		"192.0.0.0/24",
		"назначения протоколов IETF: сюда входит 192.0.0.192 и служебные адреса NAT64/DS-Lite",
	),
	parseIpv4Cidr(
		"192.0.2.0/24",
		"TEST-NET-1 (RFC 5737): в реальной сети такой адрес указывает на подмену или на локальную заглушку",
	),
	parseIpv4Cidr("192.31.196.0/24", "AS112-v4 (RFC 7535) — служебный anycast"),
	parseIpv4Cidr("192.52.193.0/24", "AMT (RFC 7450) — служебный anycast"),
	parseIpv4Cidr(
		"192.88.99.0/24",
		"anycast-релей 6to4 (RFC 7526, объявлен устаревшим) — точка входа в чужой туннель",
	),
	parseIpv4Cidr("192.168.0.0/16", "частная сеть RFC 1918"),
	parseIpv4Cidr(
		"192.175.48.0/24",
		"прямое делегирование AS112 (RFC 7534) — служебный anycast",
	),
	parseIpv4Cidr(
		"198.18.0.0/15",
		"сетевой benchmark (RFC 2544): маршрутизируется внутрь лабораторных сегментов",
	),
	parseIpv4Cidr("198.51.100.0/24", "TEST-NET-2 (RFC 5737)"),
	parseIpv4Cidr("203.0.113.0/24", "TEST-NET-3 (RFC 5737)"),
	parseIpv4Cidr(
		"224.0.0.0/4",
		"multicast (RFC 5771): запрос уходит группе узлов внутренней сети, а не одному архиву",
	),
	parseIpv4Cidr(
		"240.0.0.0/4",
		"зарезервировано (RFC 1112); сюда же попадает широковещательный 255.255.255.255",
	),
];

/**
 * Разбор IPv6 в 16 байт. Зона интерфейса («fe80::1%eth0») отбрасывается: это тот
 * же адрес, а по строковому префиксу зону не отличить. Последняя группа может
 * быть записана как IPv4 («::ffff:127.0.0.1», «64:ff9b::192.0.2.1»).
 */
function ipv6ToBytes(ip: string): Uint8Array | null {
	const withoutZone = (ip.split("%")[0] ?? "").toLowerCase();
	const sides = withoutZone.split("::");
	if (sides.length > 2) return null;

	const readGroups = (text: string): number[] | null => {
		if (text === "") return [];
		const chunks = text.split(":");
		const groups: number[] = [];
		for (let index = 0; index < chunks.length; index += 1) {
			const chunk = chunks[index] ?? "";
			if (index === chunks.length - 1 && chunk.includes(".")) {
				const embedded = ipv4ToUint32(chunk);
				if (embedded === null) return null;
				groups.push((embedded >>> 16) & 0xffff, embedded & 0xffff);
				continue;
			}
			if (!/^[0-9a-f]{1,4}$/.test(chunk)) return null;
			groups.push(Number.parseInt(chunk, 16));
		}
		return groups;
	};

	const head = readGroups(sides[0] ?? "");
	const tail = sides.length === 2 ? readGroups(sides[1] ?? "") : [];
	if (head === null || tail === null) return null;

	let groups: number[];
	if (sides.length === 2) {
		// «::» обязан сжимать хотя бы одну нулевую группу, иначе запись некорректна.
		const missing = 8 - head.length - tail.length;
		if (missing < 1) return null;
		groups = [...head, ...new Array<number>(missing).fill(0), ...tail];
	} else {
		if (head.length !== 8) return null;
		groups = head;
	}

	const bytes = new Uint8Array(16);
	for (let index = 0; index < 8; index += 1) {
		const group = groups[index] ?? 0;
		bytes[index * 2] = (group >>> 8) & 0xff;
		bytes[index * 2 + 1] = group & 0xff;
	}
	return bytes;
}

function parseIpv6Cidr(cidr: string, why: string): BlockedIpv6Range {
	const [prefix, bitsText] = cidr.split("/");
	const base = ipv6ToBytes(prefix ?? "");
	const bits = Number(bitsText);
	if (base === null || !Number.isInteger(bits) || bits < 0 || bits > 128) {
		throw new Error(`Некорректный IPv6-CIDR в списке SSRF-блокировок: ${cidr}`);
	}
	return { cidr, base, bits, why };
}

function ipv6InRange(bytes: Uint8Array, range: BlockedIpv6Range): boolean {
	const fullBytes = range.bits >> 3;
	for (let index = 0; index < fullBytes; index += 1) {
		if (bytes[index] !== range.base[index]) return false;
	}
	const restBits = range.bits & 7;
	if (restBits === 0) return true;
	const mask = (0xff << (8 - restBits)) & 0xff;
	return (
		((bytes[fullBytes] ?? 0) & mask) === ((range.base[fullBytes] ?? 0) & mask)
	);
}

/**
 * Префиксы IPv6, которые не «запрещены сами по себе», а требуют разбора: внутри
 * них лежит встроенный IPv4-адрес, и решение принимается по нему.
 */
const ipv4MappedIpv6Range = parseIpv6Cidr("::ffff:0:0/96", "IPv4-mapped");
const ipv4TranslatedIpv6Range = parseIpv6Cidr(
	"::ffff:0:0:0/96",
	"IPv4-translated (RFC 2765)",
);
const nat64WellKnownRange = parseIpv6Cidr(
	"64:ff9b::/96",
	"NAT64 well-known (RFC 6052)",
);
const ipv4CompatibleIpv6Range = parseIpv6Cidr(
	"::/96",
	"IPv4-compatible (устарел, RFC 4291)",
);
const globalUnicastIpv6Range = parseIpv6Cidr("2000::/3", "глобальный юникаст");

/**
 * IPv6: специальные префиксы ВНУТРИ глобального юникаста 2000::/3.
 *
 * Всё, что вне 2000::/3, отсекается одним правилом ниже (см. isSafeIpv6Bytes):
 * ::, ::1, fc00::/7, fe80::/10, ff00::/8, 100::/64 — глобально маршрутизируемый
 * юникаст IANA выдаёт только из 2000::/3, поэтому «не 2000::/3 ⇒ спецназначение»
 * корректно и покрывает их разом. Здесь остаются только те, которые то правило
 * увидеть не может, потому что они лежат внутри 2000::/3.
 */
const blockedIpv6Ranges: readonly BlockedIpv6Range[] = [
	parseIpv6Cidr(
		"2001::/23",
		"назначения протоколов IETF: Teredo 2001::/32 (туннель в чужую сеть), benchmark 2001:2::/48, ORCHIDv2 2001:20::/28",
	),
	parseIpv6Cidr("2001:db8::/32", "документационный префикс (RFC 3849)"),
	parseIpv6Cidr(
		"2002::/16",
		"6to4 (RFC 7526, объявлен устаревшим): вторые четыре байта — произвольный IPv4, то есть готовый обход IPv4-фильтра через релей",
	),
	parseIpv6Cidr("2620:4f:8000::/48", "прямое делегирование AS112 (RFC 7534)"),
	parseIpv6Cidr("3fff::/20", "документационный префикс (RFC 9637)"),
	parseIpv6Cidr(
		"5f00::/16",
		"идентификаторы сегментов SRv6 (RFC 9602) — внутренняя маршрутизация оператора",
	),
];

function isSafeIpv4(ip: string): boolean {
	const value = ipv4ToUint32(ip);
	if (value === null) return false;
	return !blockedIpv4Ranges.some(
		(range) => ((value ^ range.base) & range.mask) >>> 0 === 0,
	);
}

function isSafeIpv6Bytes(bytes: Uint8Array): boolean {
	const embeddedIpv4 = `${bytes[12] ?? 0}.${bytes[13] ?? 0}.${bytes[14] ?? 0}.${bytes[15] ?? 0}`;

	// IPv4-mapped ::ffff:0:0/96 — «::ffff:169.254.169.254» это тот же адрес
	// метаданных облака. Решение принимается по встроенному IPv4.
	if (ipv6InRange(bytes, ipv4MappedIpv6Range)) return isSafeIpv4(embeddedIpv4);

	// IPv4-translated ::ffff:0:0:0/96 (RFC 2765) — то же для SIIT-трансляции.
	if (ipv6InRange(bytes, ipv4TranslatedIpv6Range))
		return isSafeIpv4(embeddedIpv4);

	// NAT64 64:ff9b::/96 (RFC 6052). Именно через него внутренний адрес достаётся
	// в обход IPv4-ветки: 64:ff9b::a9fe:a9fe — это 169.254.169.254.
	// Соседний 64:ff9b:1::/48 (RFC 8215) сюда не попадает и разбору не подлежит:
	// позиция встроенного IPv4 там зависит от длины префикса, поэтому он целиком
	// отсекается правилом «вне 2000::/3».
	if (ipv6InRange(bytes, nat64WellKnownRange)) return isSafeIpv4(embeddedIpv4);

	// IPv4-compatible ::/96 (устарел, RFC 4291): «::127.0.0.1» — это loopback.
	// Сюда же попадают «::» (неуказанный адрес) и «::1» (loopback): они дают
	// встроенные 0.0.0.0 и 0.0.0.1, а те лежат в запрещённом 0.0.0.0/8.
	if (ipv6InRange(bytes, ipv4CompatibleIpv6Range))
		return isSafeIpv4(embeddedIpv4);

	// Единственный глобально маршрутизируемый юникаст — 2000::/3. Всё остальное
	// (ULA fc00::/7, link-local fe80::/10, multicast ff00::/8, discard 100::/64,
	// NAT64 64:ff9b:1::/48, включая fd00:ec2::254 — адрес метаданных AWS по
	// IPv6) — спецназначение и наружу маршрутизироваться не должно.
	if (!ipv6InRange(bytes, globalUnicastIpv6Range)) return false;

	return !blockedIpv6Ranges.some((range) => ipv6InRange(bytes, range));
}

/**
 * Единственная точка классификации адреса. Принимает строку адреса, а не имя
 * хоста: имена резолвит isSafeTarget.
 */
function isSafeIp(ip: string): boolean {
	if (net.isIPv4(ip)) return isSafeIpv4(ip);
	if (net.isIPv6(ip)) {
		const bytes = ipv6ToBytes(ip);
		if (bytes === null) return false;
		return isSafeIpv6Bytes(bytes);
	}
	// Не адрес вообще — закрываемся. Сюда же попадают «2130706433», «0x7f.0.0.1»
	// и «012.0.0.1»: net.isIPv4 в Node 24 их отвергает (проверено), значит
	// октальная и десятичная формы до сетевого вызова не доходят.
	return false;
}

type TargetSafety =
	| { readonly ok: true }
	| { readonly ok: false; readonly reason: string };

/**
 * Проверка адреса цели перед исходящим запросом.
 *
 * ЧЕСТНО ПРО ОСТАВШИЙСЯ РИСК (DNS rebinding): между этой проверкой и fetch()
 * имя резолвится ЕЩЁ РАЗ, уже внутри undici, и злонамеренный DNS-сервер может
 * вернуть тогда другой адрес. Полностью это закрывает только привязка соединения
 * к уже проверенному адресу через собственный lookup в диспетчере undici —
 * это переписывание механизма исходящих запросов, и оно оставлено ведущему.
 * Здесь закрыты две вещи, которые от диспетчера не зависят:
 *   • проверяются ВСЕ адреса имени (all: true), а не первый. Раньше имя с двумя
 *     A-записями — публичной и 127.0.0.1 — проходило гейт по публичной, а
 *     соединение могло уйти на loopback. Это не требовало никакого тайминга.
 *   • редирект больше не проходит мимо гейта, см. checkDicomWebConnector.
 */
async function isSafeTarget(urlString: string): Promise<TargetSafety> {
	let url: URL;
	try {
		url = new URL(urlString);
	} catch (err) {
		console.error("[Dente] fixed bare catch:", err);
		return { ok: false, reason: "адрес архива снимков не разбирается как URL" };
	}

	// zod .url() пропускает file:, gopher:, ftp: — схему обязан ограничивать гейт.
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		return { ok: false, reason: "поддерживаются только адреса http/https" };
	}

	// RFC 6761: «localhost» и всё в зоне .localhost обязаны указывать на loopback,
	// но резолвер клиники может быть настроен иначе — проверяем по имени тоже.
	const hostname = url.hostname
		.replace(/^\[|\]$/g, "")
		.replace(/\.$/, "")
		.toLowerCase();
	if (
		hostname === "" ||
		hostname === "localhost" ||
		hostname.endsWith(".localhost")
	) {
		return { ok: false, reason: "адрес указывает на сам сервер клиники" };
	}

	const addresses = await dns.lookup(hostname, { all: true }).catch(() => null);
	if (addresses === null) {
		return {
			ok: false,
			reason: "имя хоста архива снимков не резолвится с сервера клиники",
		};
	}

	if (addresses.length === 0) {
		return {
			ok: false,
			reason: "имя хоста архива снимков не дало ни одного адреса",
		};
	}

	// ВСЕ адреса, а не первый: имя с двумя A-записями (публичной и 127.0.0.1)
	// раньше проходило гейт по публичной, а соединение уходило по любой из них.
	if (addresses.some((entry) => !isSafeIp(entry.address))) {
		return {
			ok: false,
			reason:
				"адрес указывает на внутреннюю сеть, loopback или служебный диапазон",
		};
	}

	return { ok: true };
}

async function checkDicomWebConnector(input: DicomWebConnectorCheckRequest) {
	const qidoUrl = buildQidoProbeUrl(input);
	const wadoBaseUrl = safeJoinUrl(input.endpointUrl, input.wadoRsPath);
	const stowBaseUrl = safeJoinUrl(input.endpointUrl, input.stowRsPath);
	const { headers, warnings } = dicomWebAuthHeaders(input.authMode);
	const startedAt = Date.now();
	const abortController = new AbortController();
	const timeout = setTimeout(() => abortController.abort(), input.timeoutMs);
	let httpStatus: number | null = null;
	let fetchError = false;

	try {
		const safety = await isSafeTarget(qidoUrl);
		if (!safety.ok) {
			fetchError = true;
			warnings.push(
				`Безопасность: адрес архива снимков недопустим — ${safety.reason}.`,
			);
		} else {
			const response = await fetch(qidoUrl, {
				method: "GET",
				headers,
				// redirect: "manual" — обязательная часть SSRF-гейта, а не стиль.
				// По умолчанию fetch идёт по редиректам сам (измерено: 302 на внутренний
				// адрес возвращает 200 и тело внутреннего ресурса), и адрес после
				// редиректа НИКТО не проверяет. Это был полный обход гейта: достаточно
				// указать свой сервер, который ответит «302 Location: 169.254.169.254».
				redirect: "manual",
				signal: abortController.signal,
			});
			if (response.status >= 300 && response.status < 400) {
				fetchError = true;
				warnings.push(
					"Безопасность: архив снимков ответил перенаправлением, а идти по нему запрещено — цель перенаправления не проходит проверку адреса. Укажите конечный адрес сервиса напрямую.",
				);
			} else {
				httpStatus = response.status;
			}
		}
	} catch (err) {
		console.error("[Dente] fixed bare catch:", err);
		fetchError = true;
		warnings.push(
			"Проверка архива снимков не завершилась; проверьте адрес архива и доступ с сервера клиники.",
		);
	} finally {
		clearTimeout(timeout);
	}

	const latencyMs = Math.max(0, Date.now() - startedAt);
	const status = connectorStatusFromHttpStatus(httpStatus, fetchError);
	const canSearch = status === "ready";
	const canRetrieve =
		canSearch && Boolean(input.studyInstanceUid && input.seriesInstanceUid);
	const storeConfigured = status !== "unreachable" && Boolean(stowBaseUrl);

	if (status === "auth_required")
		warnings.push(
			"Архив снимков ответил, но требует учетные данные или proxy-авторизацию.",
		);
	if (status === "misconfigured")
		warnings.push("Архив снимков не вернул пригодный ответ поиска серий.");
	if (!input.studyInstanceUid || !input.seriesInstanceUid)
		warnings.push(
			"Коды исследования/серии не переданы; готовность получения серии не подтверждена.",
		);
	warnings.push(
		"Проверка загрузки снимков здесь не выполняется, потому что отправка тестового объекта изменила бы состояние архива.",
	);

	const nextAction =
		status === "ready"
			? canRetrieve
				? "Подключите этот архив снимков к внешнему просмотру и передавайте срезы по кодам исследования/серии."
				: "Архив умеет искать. Выберите исследование/серию перед открытием диагностического просмотрщика."
			: status === "auth_required"
				? "Настройте серверный доступ к архиву снимков; не храните учетные данные архива в браузере."
				: status === "unreachable"
					? "Проверьте сервер архива снимков, VPN, сетевые правила и доступность модуля архива."
					: "Проверьте сетевой путь архива снимков и правильный адрес сервиса исследований.";

	return dicomWebConnectorCheckResponseSchema.parse({
		endpointOrigin: new URL(input.endpointUrl).origin,
		qidoUrl,
		wadoBaseUrl,
		stowBaseUrl,
		configuredAuthMode: input.authMode,
		status,
		canSearch,
		canRetrieve,
		storeConfigured,
		qidoHttpStatus: httpStatus,
		latencyMs,
		warnings,
		nextAction,
	});
}

const mprTierRank: Record<
	DicomMprReadiness["resourcePolicy"]["requiredTier"],
	number
> = {
	low_end: 0,
	standard: 1,
	workstation: 2,
	diagnostic_workstation: 3,
};

function detectWorkstationTier(
	input: DicomWorkstationReadinessRequest["client"],
): DicomMprReadiness["resourcePolicy"]["requiredTier"] {
	const memory = input.deviceMemoryGb ?? 0;
	const cores = input.hardwareConcurrency ?? 0;
	const freeStorageMb =
		input.storageQuotaMb !== null && input.storageUsageMb !== null
			? Math.max(0, input.storageQuotaMb - input.storageUsageMb)
			: null;

	if (
		input.webgl2Supported &&
		input.indexedDbSupported &&
		memory >= 16 &&
		cores >= 8 &&
		(freeStorageMb === null || freeStorageMb >= 4096)
	) {
		return "diagnostic_workstation";
	}
	if (
		input.webgl2Supported &&
		input.indexedDbSupported &&
		memory >= 8 &&
		cores >= 4 &&
		(freeStorageMb === null || freeStorageMb >= 2048)
	) {
		return "workstation";
	}
	if (
		input.webgl2Supported &&
		input.indexedDbSupported &&
		memory >= 4 &&
		cores >= 4
	) {
		return "standard";
	}
	return "low_end";
}

function buildMemoryPolicyCheck(
	renderPlan: DicomGpuRenderPlan,
): DicomWorkstationReadinessCheck {
	const memoryPolicyWarn =
		renderPlan.memoryBudgetClass === "minimum" ||
		renderPlan.memoryBudgetClass === "constrained" ||
		renderPlan.diagnosticPixelPolicy === "browser_preview_not_diagnostic";
	return readinessCheck({
		id: "ct_memory_policy",
		label: "Память и пиксельная политика КТ",
		status: memoryPolicyWarn ? "warn" : "pass",
		detail: `Класс памяти ${renderPlan.memoryBudgetClass}; вес ${renderPlan.hardwareQualityWeight}; окно ${renderPlan.progressiveSliceWindowCap} срезов; политика ${renderPlan.diagnosticPixelPolicy}.`,
		nextAction:
			renderPlan.diagnosticPixelPolicy === "browser_preview_not_diagnostic"
				? "Оставьте браузерный КТ как предпросмотр и планирование; диагностический просмотр открывайте во внешнем или настольном модуле."
				: "Следуйте ограничению окна срезов и не расширяйте кэш сверх политики памяти текущей станции.",
	});
}

function collectReadinessWarnings(
	client: DicomWorkstationReadinessRequest["client"],
	series: DicomWorkstationReadinessRequest["series"],
	runtimeProfile: DicomClientRuntimeProfile,
	tierOk: boolean,
	connectorReady: boolean,
	renderPlan: DicomGpuRenderPlan,
): Set<string> {
	const warnings = new Set<string>();
	if (
		!client.online &&
		(series.sourceKind === "dicomweb" || series.sourceKind === "pacs")
	) {
		warnings.add(
			"Источник архива снимков требует сеть; офлайн-режим должен оставаться только с метаданными.",
		);
	}
	runtimeProfile.warnings.forEach((warning) => {
		warnings.add(warning);
	});
	if (!series.mprReadiness.canOpenMpr) {
		series.mprReadiness.blockers.forEach((blocker) => {
			warnings.add(blocker);
		});
	}
	if (!tierOk)
		warnings.add(
			"Текущая рабочая станция ниже рекомендованного класса для выбранной политики ресурсов КЛКТ.",
		);
	if (!client.webgl2Supported)
		warnings.add(
			"Для диагностического 3D-просмотра в браузере нужна поддержка современной браузерной графики.",
		);
	if (!client.indexedDbSupported)
		warnings.add(
			"Для восстановления просмотра нужно доступное локальное хранилище браузера.",
		);
	if (!connectorReady)
		warnings.add("Архив снимков не готов к передаче срезов.");
	renderPlan.warnings.forEach((warning) => {
		warnings.add(warning);
	});
	return warnings;
}

function evaluateReadinessOutcome(
	client: DicomWorkstationReadinessRequest["client"],
	series: DicomWorkstationReadinessRequest["series"],
	resourcePolicy: DicomMprReadiness["resourcePolicy"],
	runtimeProfile: DicomClientRuntimeProfile,
	renderPlan: DicomGpuRenderPlan,
	checks: DicomWorkstationReadinessCheck[],
	connectorReady: boolean,
	tierOk: boolean,
) {
	const failCount = checks.filter((check) => check.status === "fail").length;
	const warnCount = checks.filter((check) => check.status === "warn").length;
	const readinessScore = Math.max(
		0,
		Math.min(100, 100 - failCount * 30 - warnCount * 14),
	);
	const shouldUseExternalViewer =
		renderPlan.textureStrategy === "external_viewer" ||
		renderPlan.textureStrategy === "metadata_only" ||
		resourcePolicy.loadStrategy === "external_handoff" ||
		failCount > 0 ||
		!connectorReady ||
		runtimeProfile.mobileConstrained ||
		(!tierOk && resourcePolicy.requiredTier !== "low_end");
	const effectiveLoadStrategy: DicomMprReadiness["resourcePolicy"]["loadStrategy"] =
		shouldUseExternalViewer
			? "external_handoff"
			: !tierOk && resourcePolicy.loadStrategy === "mpr_full"
				? "mpr_downsampled"
				: resourcePolicy.loadStrategy;
	const canOpenInBrowser =
		!shouldUseExternalViewer &&
		series.mprReadiness.canOpenMpr &&
		runtimeProfile.canUseBrowserMpr &&
		client.webgl2Supported &&
		client.indexedDbSupported &&
		connectorReady;

	const nextAction = canOpenInBrowser
		? effectiveLoadStrategy === "mpr_downsampled"
			? "Откройте отдельное рабочее место КТ-срезов в режиме первого прохода с пониженным разрешением; повышайте качество только по запросу."
			: "Откройте отдельное рабочее место КТ-срезов; CRM остается слоем состояния, заметок и восстановления."
		: renderPlan.textureStrategy === "metadata_only"
			? "Оставайтесь в метаданных и восстановлении состояния, пока не появится сеть архива, локальная папка или настольный модуль."
			: shouldUseExternalViewer
				? "Используйте внешний просмотр и держите тяжелые данные снимков вне оболочки CRM."
				: "Оставайтесь в списке серии/2D-предпросмотре, пока недостающие проверки не закрыты.";

	return {
		readinessScore,
		shouldUseExternalViewer,
		effectiveLoadStrategy,
		canOpenInBrowser,
		nextAction,
	};
}

function buildDicomWorkstationReadiness(
	input: DicomWorkstationReadinessRequest,
) {
	const { series, client, connector } = input;
	const resourcePolicy = series.mprReadiness.resourcePolicy;
	const runtimeProfile = buildDicomClientRuntimeProfile({ series, client });
	const hardwareTier = detectWorkstationTier(client);
	const detectedTier = runtimeProfile.mobileConstrained
		? "low_end"
		: hardwareTier;

	const freeStorageMb =
		client.storageQuotaMb !== null && client.storageUsageMb !== null
			? Math.max(0, client.storageQuotaMb - client.storageUsageMb)
			: null;

	const tierOk =
		mprTierRank[detectedTier] >= mprTierRank[resourcePolicy.requiredTier];
	const connectorReady =
		series.sourceKind === "dicomweb" || series.sourceKind === "pacs"
			? connector?.status === "ready"
			: true;

	const checks = buildBaseReadinessChecks(
		client,
		runtimeProfile,
		resourcePolicy,
		detectedTier,
		tierOk,
		freeStorageMb,
		series,
		connectorReady,
		connector,
	);

	const renderPlan = buildGpuRenderPlan({
		series,
		client,
		connectorReady,
		tierOk,
	});

	checks.push(buildMemoryPolicyCheck(renderPlan));

	const warnings = collectReadinessWarnings(
		client,
		series,
		runtimeProfile,
		tierOk,
		connectorReady,
		renderPlan,
	);

	const outcome = evaluateReadinessOutcome(
		client,
		series,
		resourcePolicy,
		runtimeProfile,
		renderPlan,
		checks,
		connectorReady,
		tierOk,
	);

	return dicomWorkstationReadinessResponseSchema.parse({
		detectedTier,
		requiredTier: resourcePolicy.requiredTier,
		effectiveLoadStrategy: outcome.effectiveLoadStrategy,
		runtimeProfile,
		readinessScore: outcome.readinessScore,
		canOpenInBrowser: outcome.canOpenInBrowser,
		shouldUseExternalViewer: outcome.shouldUseExternalViewer,
		renderPlan,
		checks,
		warnings: Array.from(warnings),
		nextAction: outcome.nextAction,
	});
}

function buildDicomViewerWorkbenchManifest(
	input: DicomViewerWorkbenchManifestRequest,
) {
	const readiness = buildDicomWorkstationReadiness({
		series: input.series,
		client: input.client,
		connector: input.connector ?? null,
	});
	const renderCachePlan = buildDicomRenderCachePlan({
		series: input.series,
		renderPlan: readiness.renderPlan,
		viewerState: input.viewerState ?? null,
	});
	const launchManifest = buildDicomViewerLaunchManifest({
		viewerKind: input.viewerKind,
		series: input.series,
		viewerState: input.viewerState ?? null,
		annotations: input.annotations,
		dicomWebBaseUrl: input.dicomWebBaseUrl ?? null,
		ohifBaseUrl: input.ohifBaseUrl ?? null,
		externalViewerPath: input.externalViewerPath ?? null,
		allowExternalHandoff: input.allowExternalHandoff,
	});
	const toolStateBundle = buildDicomViewerToolStateBundle({
		target: input.target,
		viewerKind: input.viewerKind,
		series: input.series,
		viewerState: input.viewerState ?? null,
		annotations: input.annotations,
		renderPlan: readiness.renderPlan,
	});
	const warnings = new Set<string>([
		...readiness.warnings,
		...renderCachePlan.warnings,
		...launchManifest.warnings,
		...toolStateBundle.warnings,
	]);

	const nextAction = readiness.canOpenInBrowser
		? "Откройте отдельный просмотр КЛКТ/КТ-срезов с этим набором; сначала загрузите активный срез, затем повышайте качество кеша."
		: readiness.shouldUseExternalViewer ||
				launchManifest.launchMode === "external_handoff"
			? "Используйте внешний или настольный КТ-просмотрщик; CRM сохраняет метаданные, состояние и аннотации для восстановления."
			: "Оставайтесь в списке серии, пока не исправлены коды серии, локальное хранилище или проверки подключения.";

	return dicomViewerWorkbenchManifestResponseSchema.parse({
		version: "dental-crm-dicom-workbench-v1",
		generatedAt: new Date().toISOString(),
		readiness,
		renderCachePlan,
		launchManifest,
		toolStateBundle,
		doctorBlocking: false,
		warnings: Array.from(warnings),
		nextAction,
	});
}

function defaultDicomDiscoveryRoots() {
	const configured =
		process.env.DENTAL_DICOM_DISCOVERY_ROOTS?.split(/[;|]/)
			.map((root) => root.trim())
			.filter(Boolean) ?? [];
	const home = os.homedir();
	const oneDrive = path.join(home, "OneDrive");
	const roots = [
		...configured,
		path.join(home, "Downloads"),
		path.join(home, "Desktop"),
		path.join(home, "Documents"),
		path.join(home, "Pictures"),
		path.join(oneDrive, "Downloads"),
		path.join(oneDrive, "Documents"),
		path.join(oneDrive, "Pictures"),
	];
	return Array.from(
		new Set(
			roots
				.map((root) => path.resolve(root))
				.filter((root) => existsSync(root)),
		),
	);
}

function fingerprintLocalPath(folderPath: string) {
	return createHash("sha256")
		.update(path.resolve(folderPath))
		.digest("hex")
		.slice(0, 10);
}

function classifyLocalImagingSource(
	root: string,
	folderPath: string,
	fromManualRoot: boolean,
) {
	const text = `${root} ${folderPath}`.toLowerCase();
	if (fromManualRoot)
		return {
			sourceKind: "selected_root",
			sourceLabel: "Выбранная локальная папка",
		};
	if (/downloads|загруз/.test(text))
		return { sourceKind: "downloads", sourceLabel: "Загрузки" };
	if (/desktop|рабоч/.test(text))
		return { sourceKind: "desktop", sourceLabel: "Рабочий стол" };
	if (/documents|документ/.test(text))
		return { sourceKind: "documents", sourceLabel: "Документы" };
	if (/pictures|photos|images|dcim|camera|фото|изображ/.test(text)) {
		return {
			sourceKind: "pictures",
			sourceLabel: "Изображения / экспорт с телефона",
		};
	}
	if (/onedrive|icloud|google drive|dropbox/.test(text))
		return {
			sourceKind: "cloud_sync",
			sourceLabel: "Локальная папка облачной синхронизации",
		};
	return {
		sourceKind: "configured_root",
		sourceLabel: "Настроенный локальный корень",
	};
}

function safeLocalImagingAlias(prefix: string, folderPath: string) {
	return `${prefix} #${fingerprintLocalPath(folderPath).toUpperCase()}`;
}

function folderHintScore(folderPath: string) {
	const normalized = folderPath.toLowerCase();
	let score = 0;
	if (
		/dicom|dcm|cbct|ct|кт|ккт|opg|rvg|sidexis|romexis|pacs|study|series/.test(
			normalized,
		)
	)
		score += 0.16;
	if (/downloads|загруз/.test(normalized)) score += 0.03;
	return score;
}

function discoveryDepth(root: string, folderPath: string) {
	const relative = path.relative(root, folderPath);
	if (!relative || relative === ".") return 0;
	return relative.split(path.sep).filter(Boolean).length;
}

function shouldSkipDicomDiscoveryDirectory(directoryName: string) {
	return dicomDiscoverySkipDirectoryNames.has(directoryName.toLowerCase());
}

async function discoverLocalDicomFolders(
	input: DicomLocalFolderDiscoveryRequest,
	options: ApiDicomScanOptions = {},
) {
	const fromManualRoot = Boolean(input.rootPaths?.length);
	const rawRoots = (
		input.rootPaths?.length ? input.rootPaths : defaultDicomDiscoveryRoots()
	).map((root) => path.resolve(root));

	const uniqueRoots = Array.from(new Set(rawRoots));
	const existsChecks = await Promise.all(
		uniqueRoots.map(async (root) => {
			try {
				await stat(root);
				return true;
			} catch (err) {
				console.error("[Dente] Failed to stat root path:", err);
				return false;
			}
		}),
	);
	const roots = uniqueRoots.filter((_, index) => existsChecks[index]);
	const warnings = new Set<string>();
	const candidates: DicomLocalFolderDiscoveryCandidate[] = [];
	const visited = new Set<string>();
	const queue = roots.map((root) => ({ root, folderPath: root, depth: 0 }));
	let scannedFolders = 0;
	const yieldState = createApiDicomScanYieldState();

	while (queue.length && scannedFolders < input.maxFolders) {
		await maybeYieldApiDicomScan(yieldState, options.signal);
		const item = queue.shift();
		if (!item) break;
		const currentKey = item.folderPath.toLowerCase();
		if (visited.has(currentKey)) continue;
		visited.add(currentKey);
		scannedFolders += 1;

		let entries: Dirent[];
		try {
			entries = await readdir(item.folderPath, { withFileTypes: true });
		} catch (error) {
			if (isApiDicomScanAbortError(error)) throw error;
			const source = classifyLocalImagingSource(
				item.root,
				item.folderPath,
				fromManualRoot,
			);
			warnings.add(
				`Одна папка в разделе «${source.sourceLabel}» недоступна для чтения. Поиск продолжен по остальным папкам.`,
			);
			continue;
		}

		let filesInspected = 0;
		let dicomLikeFiles = 0;
		let archivesFound = 0;
		let imageFiles = 0;
		let hasDicomDir = false;
		let firstFilePath: string | null = null;
		let latestModifiedAt: string | null = null;
		const folderWarnings = new Set<string>();

		const statPromises: Promise<string | null>[] = [];

		for (const entry of entries) {
			await maybeYieldApiDicomScan(yieldState, options.signal);
			const entryName = entry.name.toString();
			const fullPath = path.join(item.folderPath, entryName);
			if (entry.isDirectory()) {
				if (shouldSkipDicomDiscoveryDirectory(entryName)) continue;
				const nextDepth = item.depth + 1;
				if (nextDepth <= input.maxDepth)
					queue.push({
						root: item.root,
						folderPath: fullPath,
						depth: nextDepth,
					});
				continue;
			}
			if (!entry.isFile()) continue;
			if (filesInspected >= input.maxFilesPerFolder) {
				folderWarnings.add(
					`Проверка файлов в этой папке ограничена ${input.maxFilesPerFolder} файлами.`,
				);
				continue;
			}
			filesInspected += 1;
			const extension = path.extname(entryName).toLowerCase();
			const isArchive = dicomArchiveExtensions.has(extension);
			const isImage =
				imagingFileExtensions.has(extension) &&
				!isArchive &&
				!dicomPixelFileExtensions.has(extension);
			const isDicomDir = /^DICOMDIR$/i.test(entryName);
			const isDicomFile =
				isDicomPixelPath(fullPath) ||
				(!isArchive && !isImage && hasDicomMagic(fullPath));

			if (isDicomDir) hasDicomDir = true;
			if (isArchive) archivesFound += 1;
			if (isImage) imageFiles += 1;
			if (isDicomFile) {
				dicomLikeFiles += 1;
				firstFilePath ??= fullPath;
			}
			if (isArchive && !firstFilePath) firstFilePath = fullPath;

			statPromises.push(
				stat(fullPath)
					.then((s) => s.mtime.toISOString())
					.catch(() => null),
			);
		}

		const statResults = await Promise.all(statPromises);
		for (const modified of statResults) {
			if (modified && (!latestModifiedAt || modified > latestModifiedAt)) {
				latestModifiedAt = modified;
			}
		}

		const reasons: string[] = [];
		if (dicomLikeFiles) reasons.push(`${dicomLikeFiles} файлов снимков`);
		if (hasDicomDir) reasons.push("найден служебный каталог снимков");
		if (archivesFound) reasons.push(`${archivesFound} архивов`);
		if (folderHintScore(item.folderPath) > 0)
			reasons.push("имя папки похоже на стоматологический экспорт снимков");

		const confidence = Math.min(
			1,
			(dicomLikeFiles >= input.minDicomFiles
				? 0.56
				: dicomLikeFiles > 0
					? 0.28
					: 0) +
				(hasDicomDir ? 0.28 : 0) +
				(archivesFound > 0 ? 0.16 : 0) +
				folderHintScore(item.folderPath) +
				(imageFiles >= 20 && dicomLikeFiles > 0 ? 0.05 : 0),
		);

		const isCandidate =
			dicomLikeFiles >= input.minDicomFiles ||
			hasDicomDir ||
			(archivesFound > 0 && confidence >= 0.24) ||
			(dicomLikeFiles > 0 && confidence >= 0.34);

		if (isCandidate) {
			const source = classifyLocalImagingSource(
				item.root,
				item.folderPath,
				fromManualRoot,
			);
			candidates.push({
				folderPath: item.folderPath,
				displayName: path.basename(item.folderPath) || item.folderPath,
				safeDisplayName: safeLocalImagingAlias("Кандидат КТ", item.folderPath),
				sourceLabel: source.sourceLabel,
				sourceKind: source.sourceKind,
				folderFingerprint: fingerprintLocalPath(item.folderPath),
				depth: discoveryDepth(item.root, item.folderPath),
				dicomLikeFiles,
				archivesFound,
				imageFiles,
				hasDicomDir,
				latestModifiedAt,
				firstFilePath,
				confidence: Number(confidence.toFixed(2)),
				reasons,
				warnings: Array.from(folderWarnings),
			});
		}
	}

	if (queue.length)
		warnings.add(
			`Поиск остановлен на maxFolders=${input.maxFolders}. Сузьте корневые папки или увеличьте лимит.`,
		);
	if (!roots.length)
		warnings.add("Нет доступных для чтения корневых папок поиска.");
	if (!candidates.length)
		warnings.add(
			"В выбранных корневых папках не найдены папки, похожие на КТ/снимки.",
		);

	const sortedCandidates = candidates
		.sort(
			(left, right) =>
				right.confidence - left.confidence ||
				right.dicomLikeFiles - left.dicomLikeFiles ||
				right.archivesFound - left.archivesFound ||
				(right.latestModifiedAt ?? "").localeCompare(
					left.latestModifiedAt ?? "",
				),
		)
		.slice(0, input.maxCandidates);

	const nextAction = sortedCandidates[0]
		? "Выберите папку-кандидат, затем запустите разбор снимков. Поиск читает только имена папок и малые заголовки, тяжелые данные не загружает."
		: "Вставьте известный путь к папке КЛКТ/снимков или настройте корни поиска снимков в серверных настройках.";

	return dicomLocalFolderDiscoveryResponseSchema.parse({
		version: "dental-crm-dicom-local-discovery-v1",
		generatedAt: new Date().toISOString(),
		roots,
		scannedFolders,
		candidates: sortedCandidates,
		warnings: Array.from(warnings),
		nextAction,
	});
}

function normalizeOrganizerText(value: string) {
	return value.toLowerCase().replace(/[._()[\]{}-]+/g, " ");
}

function detectDentalModelFormat(fileName: string): DentalModelFileFormat {
	const extension = path.extname(fileName).toLowerCase();
	if (extension === ".stl") return "stl";
	if (extension === ".obj") return "obj";
	if (extension === ".ply") return "ply";
	if (extension === ".glb") return "glb";
	if (extension === ".gltf") return "gltf";
	if (extension === ".3mf") return "3mf";
	if (extension === ".zip") return "zip_archive";
	return "unknown";
}

function detectDentalSurfaceModelRole(
	text: string,
): DentalModelFileRole | null {
	const surfaceHint =
		/surface|bone|skull|cranium|cranial|segmentation|segmented|mesh|volumetric|ct\s*model|cbct|klkt|череп|кость|костн|сегментац/.test(
			text,
		);
	if (/skull|cranium|cranial|череп/.test(text)) return "skull_surface";
	if (
		surfaceHint &&
		/maxilla|maxillary|upper jaw|u[ _-]?jaw|верхн|верхняя/.test(text)
	)
		return "maxilla_surface";
	if (
		surfaceHint &&
		/mandible|mandibular|lower jaw|l[ _-]?jaw|нижн|нижняя/.test(text)
	)
		return "mandible_surface";
	if (
		/ct\s*bone|cbct\s*bone|klkt\s*bone|bone\s*surface|surface\s*bone|segmented\s*bone|bone\s*segmentation|костн|кость/.test(
			text,
		)
	) {
		return "ct_bone_surface";
	}
	return null;
}

function detectDentalModelRole(
	fileName: string,
	folderPath: string,
): DentalModelFileRole {
	const fromText = (text: string): DentalModelFileRole | null => {
		const surfaceRole = detectDentalSurfaceModelRole(text);
		if (surfaceRole) return surfaceRole;
		if (/scan\s*body|scanbody|scan-body|transfer|abutment scan/.test(text))
			return "scan_body";
		if (/upper|maxilla|maxillary|verk+h|up\b|u[ _-]?jaw/.test(text))
			return "upper_arch";
		if (/lower|mandible|mandibular|niz|low\b|l[ _-]?jaw/.test(text))
			return "lower_arch";
		if (/bite|occlusion|occlusal|prikus/.test(text)) return "bite";
		if (/bridge|pontic|most/.test(text)) return "bridge";
		if (/crown|koron|veneer|inlay|onlay/.test(text)) return "crown";
		if (/aligner|eliner|kap+|cap+|tray/.test(text)) return "aligner";
		if (
			/implant.*guide|guide.*implant|surgical.*guide|surg.*guide|pilot.*guide|implant/i.test(
				text,
			)
		)
			return "implant_guide";
		if (/guide|sleeve|template|sablon|shablon|surgical/.test(text))
			return "surgical_guide";
		return null;
	};
	const fileRole = fromText(normalizeOrganizerText(fileName));
	if (fileRole) return fileRole;
	const text = normalizeOrganizerText(folderPath);
	if (/scan\s*body|scanbody|scan-body|transfer|abutment scan/.test(text))
		return "scan_body";
	if (
		/implant.*guide|guide.*implant|surgical.*guide|surg.*guide|pilot.*guide|implant/i.test(
			text,
		)
	)
		return "implant_guide";
	if (/guide|sleeve|template|sablon|shablon|surgical/.test(text))
		return "surgical_guide";
	if (/aligner|eliner|kap+|cap+|tray/.test(text)) return "aligner";
	if (/bridge|pontic|most/.test(text)) return "bridge";
	if (/crown|koron|veneer|inlay|onlay/.test(text)) return "crown";
	if (/bite|occlusion|occlusal|prikus/.test(text)) return "bite";
	if (/upper|maxilla|maxillary|verk+h|up\b|u[ _-]?jaw/.test(text))
		return "upper_arch";
	if (/lower|mandible|mandibular|niz|low\b|l[ _-]?jaw/.test(text))
		return "lower_arch";
	return "unknown";
}

function hasDentalModelArchiveHint(fileName: string, folderPath: string) {
	const _text = normalizeOrganizerText(`${folderPath} ${fileName}`);
	return hasDentalModelFileHint(fileName, folderPath);
}

function hasDentalModelFileHint(fileName: string, folderPath: string) {
	const text = normalizeOrganizerText(`${folderPath} ${fileName}`);
	return /skull|cranium|cranial|surface|bone|segmentation|segmented|upper|lower|maxilla|maxillary|mandible|mandibular|u[ _-]?jaw|l[ _-]?jaw|bite|occlusion|occlusal|crown|bridge|veneer|inlay|onlay|implant|guide|sleeve|aligner|tray|scanbody|scan body|abutment|intraoral|ios|exocad|3shape|medit|cerec|dental|tooth|teeth|orthodont|surgical|череп|кость|костн|сегментац/.test(
		text,
	);
}

function scoreDentalModelFile(fileName: string, folderPath: string) {
	const format = detectDentalModelFormat(fileName);
	if (format === "unknown") return 0;
	const role = detectDentalModelRole(fileName, folderPath);
	const text = normalizeOrganizerText(`${folderPath} ${fileName}`);
	let score = format === "zip_archive" ? 0.32 : 0.5;
	if (role !== "unknown") score += 0.22;
	if (
		/intraoral|ios|scan|cad|cam|exocad|3shape|medit|cerec|mesh|model|stl|implant|guide|surface|segmentation/.test(
			text,
		)
	)
		score += 0.18;
	if (
		/upper|lower|maxilla|mandible|skull|bone|crown|bridge|aligner|bite|scanbody|scan body/.test(
			text,
		)
	)
		score += 0.1;
	return Math.min(1, Number(score.toFixed(2)));
}

function organizerFolderHintScore(folderPath: string) {
	const normalized = normalizeOrganizerText(folderPath);
	let score = folderHintScore(folderPath);
	if (
		/intraoral|ios|exocad|3shape|medit|cerec|implant|guide|aligner|scanbody|crown|bridge|maxilla|mandible|skull|bone|surface|segmentation|dental|tooth|teeth|orthodont|surgical/.test(
			normalized,
		)
	)
		score += 0.2;
	if (/patient|case|study|export|clinic|lab|laboratory/.test(normalized))
		score += 0.05;
	return Math.min(0.35, Number(score.toFixed(2)));
}

function isLikelySoftwareResourceFolder(folderPath: string) {
	const normalized = normalizeOrganizerText(folderPath);
	return /portable tools|portable_tools|program files|node modules|packagecache|resources|resource|viewer|cdviewer|examples?|samples?|demo|assets|library|sdk|toolkit|game|gamedev|kenney|template/.test(
		normalized,
	);
}

function buildOrganizerCaseId(folderPath: string) {
	return `local-imaging-${createHash("sha256").update(folderPath).digest("hex").slice(0, 14)}`;
}

function latestIso(left: string | null, right: string | null) {
	if (!left) return right;
	if (!right) return left;
	return left > right ? left : right;
}

function recommendLocalImagingAction(caseCandidate: {
	dicomLikeFiles: number;
	modelFiles: number;
	archiveFiles: number;
	combinedConfidence: number;
}): LocalImagingOrganizerRecommendedAction {
	if (caseCandidate.dicomLikeFiles > 0 && caseCandidate.modelFiles > 0)
		return "mixed_case_workup";
	if (
		caseCandidate.dicomLikeFiles > 0 ||
		(caseCandidate.archiveFiles > 0 && caseCandidate.combinedConfidence >= 0.45)
	)
		return "open_ct_workup";
	if (caseCandidate.modelFiles > 0) return "review_3d_models";
	return "manual_review";
}

function isCtSurfaceModelRole(role: DentalModelFileRole) {
	return (
		role === "skull_surface" ||
		role === "maxilla_surface" ||
		role === "mandible_surface" ||
		role === "ct_bone_surface"
	);
}

function buildCtSurfaceModelManifest(input: {
	model: DentalModelFileCandidate;
	folderFingerprint: string;
	pairingHint: DentalModelWorkbenchPairingHint;
	loadTarget: DentalModelWorkbenchLoadTarget;
	sizeMb: number;
}): CtSurfaceModelManifest | null {
	if (!isCtSurfaceModelRole(input.model.role)) return null;
	const archiveOrUnknown =
		input.model.format === "zip_archive" || input.model.format === "unknown";
	const readiness: CtSurfaceModelManifest["readiness"] = archiveOrUnknown
		? "metadata_only"
		: input.loadTarget === "local_bridge"
			? "pending_local_bridge"
			: input.loadTarget === "external_model_viewer"
				? "ready_external"
				: "blocked";
	const warnings = [...input.model.warnings];
	warnings.push(
		"CRM хранит только связь КТ-поверхности и статус проверки; геометрия сетки остается в локальном 3D-мосте или внешнем просмотрщике моделей.",
	);
	if (archiveOrUnknown) {
		warnings.push(
			"Архив или неизвестный формат поверхности хранится только как метаданные, пока локальный мост не проверит сетку.",
		);
	}
	return {
		role: input.model.role,
		format: input.model.format,
		sourceKind: archiveOrUnknown ? "unknown" : "imported_surface_file",
		sourceSeriesRef: {
			folderFingerprint: input.folderFingerprint,
			pairingHint: input.pairingHint,
			studyInstanceUid: null,
			seriesInstanceUid: null,
		},
		frameOfReferenceUid: null,
		registrationStatus:
			input.pairingHint === "same_folder_ct_series"
				? "same_folder_inferred"
				: "unknown",
		readiness,
		loadTarget: input.loadTarget,
		sizeMb: input.sizeMb,
		checksum: null,
		meshStats: null,
		containsMeshGeometry: false,
		warnings,
		nextAction:
			readiness === "pending_local_bridge"
				? "Передайте эту КТ-поверхность в локальный 3D-мост для регистрации, статистики сетки и клинической проверки; CRM не хранит payload сетки."
				: readiness === "ready_external"
					? "Откройте эту поверхность во внешнем просмотрщике моделей; CRM оставит слой пациента, связи с КТ и заметок."
					: "Оставьте эту поверхность как метаданные, пока локальный мост не проверит архив, формат и регистрацию с КТ.",
	};
}

function chooseDentalModelWorkbenchTarget(
	model: DentalModelFileCandidate,
): DentalModelWorkbenchLoadTarget {
	if (model.format === "unknown" || model.format === "zip_archive")
		return "metadata_only";
	if (isCtSurfaceModelRole(model.role)) return "local_bridge";
	if (model.sizeBytes >= 80 * 1024 * 1024) return "local_bridge";
	return "external_model_viewer";
}

function buildDentalModelWorkbenchManifest(input: {
	folderFingerprint: string;
	dicomLikeFiles: number;
	modelCandidates: DentalModelFileCandidate[];
}) {
	const warnings = new Set<string>();
	const items = input.modelCandidates.map((model) => {
		const loadTarget = chooseDentalModelWorkbenchTarget(model);
		const sizeMb = Math.ceil(model.sizeBytes / 1024 / 1024);
		const itemWarnings = [...model.warnings];
		if (isCtSurfaceModelRole(model.role)) {
			itemWarnings.push(
				"КТ-поверхность требует локальный 3D-модуль или внешний просмотр; CRM не загружает сетку в карточку приема.",
			);
		}
		if (loadTarget === "metadata_only") {
			itemWarnings.push(
				"Файл остается записью органайзера до разбора формата во внешнем или локальном модуле.",
			);
		}
		if (sizeMb >= 80) {
			itemWarnings.push(
				"Крупная сетка должна открываться локально; браузерная карточка хранит только маршрут и метаданные.",
			);
		}
		itemWarnings.forEach((warning) => {
			warnings.add(warning);
		});
		const pairingHint: DentalModelWorkbenchPairingHint =
			input.dicomLikeFiles > 0 ? "same_folder_ct_series" : "model_only_folder";
		const ctSurfaceManifest = buildCtSurfaceModelManifest({
			model: { ...model, warnings: itemWarnings },
			folderFingerprint: input.folderFingerprint,
			pairingHint,
			loadTarget,
			sizeMb,
		});
		const nextAction =
			loadTarget === "local_bridge"
				? "Передайте модель локальному 3D-модулю рядом с КТ-серией; CRM хранит роль, размер и связь с папкой."
				: loadTarget === "external_model_viewer"
					? "Откройте модель во внешнем 3D-просмотре и держите CRM как слой пациента, заметок и маршрута."
					: "Сохраните модель как метаданные органайзера, пока внешний модуль не подтвердит формат.";
		return {
			fileName: model.fileName,
			format: model.format,
			role: model.role,
			sizeBytes: model.sizeBytes,
			sizeMb,
			loadTarget,
			pairingHint,
			ctSurfaceManifest,
			warnings: itemWarnings,
			nextAction,
		};
	});
	const targetRank: Record<DentalModelWorkbenchLoadTarget, number> = {
		metadata_only: 0,
		external_model_viewer: 1,
		local_bridge: 2,
	};
	const recommendedTarget = items.reduce<DentalModelWorkbenchLoadTarget>(
		(target, item) =>
			targetRank[item.loadTarget] > targetRank[target]
				? item.loadTarget
				: target,
		"metadata_only",
	);
	const ctSurfaceModels = items.filter((item) =>
		isCtSurfaceModelRole(item.role),
	).length;
	const largestModelMb = items.reduce(
		(largest, item) => Math.max(largest, item.sizeMb),
		0,
	);
	const nextAction =
		items.length === 0
			? "3D-модели не найдены; оставайтесь в маршруте снимков."
			: recommendedTarget === "local_bridge"
				? "Для КТ-поверхностей и крупных сеток используйте локальный 3D-модуль; CRM хранит no-mesh маршрут."
				: recommendedTarget === "external_model_viewer"
					? "Используйте внешний 3D-просмотр и связывайте модель с КТ-кейсом по метке папки."
					: "Держите модели как метаданные, пока формат или архив не разобран внешним модулем.";
	return {
		version: "dental-crm-model-workbench-v1" as const,
		folderFingerprint: input.folderFingerprint,
		totalModels: items.length,
		ctSurfaceModels,
		largestModelMb,
		recommendedTarget,
		items,
		warnings: Array.from(warnings),
		nextAction,
	};
}

async function organizeLocalImagingSources(
	input: LocalImagingOrganizerRequest,
	options: ApiDicomScanOptions = {},
) {
	const fromManualRoot = Boolean(input.rootPaths?.length);
	const rawRoots = input.rootPaths?.length
		? input.rootPaths
		: defaultDicomDiscoveryRoots();
	const uniqueRoots = Array.from(
		new Set(rawRoots.map((root) => path.resolve(root))),
	);
	const roots: string[] = [];
	const BATCH_SIZE = 50;

	for (let i = 0; i < uniqueRoots.length; i += BATCH_SIZE) {
		const batch = uniqueRoots.slice(i, i + BATCH_SIZE);
		const results = await Promise.all(
			batch.map(async (root) => {
				try {
					await access(root);
					return root;
				} catch (err) {
					console.error("[Dente] Failed to access root path:", err);
					return null;
				}
			}),
		);
		for (const res of results) {
			if (res !== null) roots.push(res);
		}
	}

	const warnings = new Set<string>();
	const cases: LocalImagingOrganizerCase[] = [];
	const visited = new Set<string>();
	const queue = roots.map((root) => ({ root, folderPath: root, depth: 0 }));
	let scannedFolders = 0;
	const yieldState = createApiDicomScanYieldState();

	while (queue.length && scannedFolders < input.maxFolders) {
		await maybeYieldApiDicomScan(yieldState, options.signal);
		const item = queue.shift();
		if (!item) break;
		const currentKey = item.folderPath.toLowerCase();
		if (visited.has(currentKey)) continue;
		visited.add(currentKey);
		scannedFolders += 1;

		let entries: Dirent[];
		try {
			entries = await readdir(item.folderPath, { withFileTypes: true });
		} catch (error) {
			if (isApiDicomScanAbortError(error)) throw error;
			const source = classifyLocalImagingSource(
				item.root,
				item.folderPath,
				fromManualRoot,
			);
			warnings.add(
				`Одна папка в разделе «${source.sourceLabel}» недоступна для чтения. Органайзер продолжил проверку остальных папок.`,
			);
			continue;
		}

		let filesInspected = 0;
		let dicomLikeFiles = 0;
		let archiveFiles = 0;
		let imageFiles = 0;
		let modelFiles = 0;
		let latestModifiedAt: string | null = null;
		const modelCandidates: DentalModelFileCandidate[] = [];
		const folderWarnings = new Set<string>();
		const folderHasDicomHint = folderHintScore(item.folderPath) > 0;

		const statPromises: Promise<{
			fullPath: string;
			entryName: string;
			isModelFileOrArchive: boolean;
			confidence: number | undefined;
			format: ReturnType<typeof detectDentalModelFormat> | undefined;
			role: ReturnType<typeof detectDentalModelRole> | undefined;
			stats: { size: number; mtime: Date } | null;
		}>[] = [];

		for (const entry of entries) {
			await maybeYieldApiDicomScan(yieldState, options.signal);
			const entryName = entry.name.toString();
			const fullPath = path.join(item.folderPath, entryName);
			if (entry.isDirectory()) {
				if (shouldSkipDicomDiscoveryDirectory(entryName)) continue;
				const nextDepth = item.depth + 1;
				if (nextDepth <= input.maxDepth)
					queue.push({
						root: item.root,
						folderPath: fullPath,
						depth: nextDepth,
					});
				continue;
			}
			if (!entry.isFile()) continue;
			if (filesInspected >= input.maxFilesPerFolder) {
				folderWarnings.add(
					`Проверка файлов в этой папке ограничена ${input.maxFilesPerFolder} файлами.`,
				);
				continue;
			}
			filesInspected += 1;

			const extension = path.extname(entryName).toLowerCase();
			const isArchive = dicomArchiveExtensions.has(extension);
			const isImage =
				imagingFileExtensions.has(extension) &&
				!isArchive &&
				!dicomPixelFileExtensions.has(extension);
			const hasModelExtension = dentalModelFileExtensions.has(extension);
			const isModelFile =
				hasModelExtension && hasDentalModelFileHint(entryName, item.folderPath);
			const isModelArchive =
				extension === ".zip" &&
				hasDentalModelArchiveHint(entryName, item.folderPath);
			const shouldProbeDicomMagic =
				input.includeDicom &&
				!isArchive &&
				!isImage &&
				!hasModelExtension &&
				(folderHasDicomHint ||
					!extension ||
					dicomPixelFileExtensions.has(extension) ||
					/^DICOMDIR$/i.test(entryName));
			const isDicomFile =
				input.includeDicom &&
				(isDicomPixelPath(fullPath) ||
					/^DICOMDIR$/i.test(entryName) ||
					(shouldProbeDicomMagic && hasDicomMagic(fullPath)));

			if (isArchive) archiveFiles += 1;
			if (isImage) imageFiles += 1;
			if (isDicomFile) dicomLikeFiles += 1;

			const isModelFileOrArchive = Boolean(
				input.includeDentalModels && (isModelFile || isModelArchive),
			);
			if (isModelFileOrArchive) {
				modelFiles += 1;
			}

			const confidence = isModelFileOrArchive
				? scoreDentalModelFile(entryName, item.folderPath)
				: undefined;
			const format = isModelFileOrArchive
				? detectDentalModelFormat(entryName)
				: undefined;
			const role = isModelFileOrArchive
				? detectDentalModelRole(entryName, item.folderPath)
				: undefined;

			statPromises.push(
				stat(fullPath)
					.then((s) => ({
						fullPath,
						entryName,
						isModelFileOrArchive,
						confidence,
						format,
						role,
						stats: s,
					}))
					.catch(() => ({
						fullPath,
						entryName,
						isModelFileOrArchive,
						confidence,
						format,
						role,
						stats: null,
					})),
			);
		}

		const statResults = await Promise.all(statPromises);
		for (const result of statResults) {
			if (result.stats) {
				latestModifiedAt = latestIso(
					latestModifiedAt,
					result.stats.mtime.toISOString(),
				);
			}

			if (result.isModelFileOrArchive) {
				if (!result.stats) {
					folderWarnings.add(
						"Не удалось прочитать сведения об одном файле модели; он мог измениться во время сканирования.",
					);
				}
				const sizeBytes = result.stats ? result.stats.size : 0;
				modelCandidates.push({
					filePath: result.fullPath,
					fileName: result.entryName,
					// biome-ignore lint/style/noNonNullAssertion: automated suppression
					format: result.format!,
					// biome-ignore lint/style/noNonNullAssertion: automated suppression
					role: result.role!,
					sizeBytes,
					// biome-ignore lint/style/noNonNullAssertion: automated suppression
					confidence: result.confidence!,
					warnings:
						sizeBytes > 250 * 1024 * 1024
							? [
									"Крупная сетка/архив: предпросмотр должен оставаться только с метаданными, пока не подключен локальный 3D-обработчик.",
								]
							: [],
				});
			}
		}

		const folderScore = organizerFolderHintScore(item.folderPath);
		const dicomConfidence =
			input.includeDicom && (dicomLikeFiles > 0 || archiveFiles > 0)
				? Math.min(
						1,
						(dicomLikeFiles >= 2 ? 0.58 : dicomLikeFiles > 0 ? 0.32 : 0) +
							(archiveFiles > 0 ? 0.12 : 0) +
							folderScore,
					)
				: 0;
		const modelConfidence =
			input.includeDentalModels && modelFiles > 0
				? Math.min(
						1,
						(modelFiles >= 2 ? 0.55 : modelFiles > 0 ? 0.36 : 0) +
							Math.min(
								0.25,
								modelCandidates.reduce(
									(sum, item) => sum + item.confidence,
									0,
								) / 6,
							) +
							folderScore,
					)
				: 0;
		const combinedConfidence = Math.min(
			1,
			Math.max(dicomConfidence, modelConfidence) +
				(dicomLikeFiles > 0 && modelFiles > 0 ? 0.12 : 0),
		);
		const candidateLooksUseful =
			dicomLikeFiles > 0 ||
			modelFiles > 0 ||
			(archiveFiles > 0 && combinedConfidence >= 0.35) ||
			(imageFiles >= 8 && combinedConfidence >= 0.35);

		if (!candidateLooksUseful) continue;
		if (
			dicomLikeFiles === 0 &&
			archiveFiles === 0 &&
			modelFiles > 0 &&
			isLikelySoftwareResourceFolder(item.folderPath)
		)
			continue;

		const reasons: string[] = [];
		if (dicomLikeFiles) reasons.push(`${dicomLikeFiles} файлов снимков`);
		if (modelFiles)
			reasons.push(`${modelFiles} кандидатов стоматологических 3D-моделей`);
		if (archiveFiles) reasons.push(`${archiveFiles} архивных файлов`);
		if (imageFiles >= 8) reasons.push(`${imageFiles} файлов изображений`);
		if (folderScore > 0)
			reasons.push("имя папки похоже на экспорт снимков/моделей");

		const recommendedAction = recommendLocalImagingAction({
			dicomLikeFiles,
			modelFiles,
			archiveFiles,
			combinedConfidence,
		});
		if (modelFiles > 0) {
			folderWarnings.add(
				"Файлы 3D-моделей пока являются только метаданными органайзера; рендер/хранение сеток остается вне состояния CRM.",
			);
		}

		const source = classifyLocalImagingSource(
			item.root,
			item.folderPath,
			fromManualRoot,
		);
		const folderFingerprint = fingerprintLocalPath(item.folderPath);
		const sortedModelCandidates = modelCandidates
			.sort(
				(left, right) =>
					right.confidence - left.confidence ||
					right.sizeBytes - left.sizeBytes,
			)
			.slice(0, 8);
		const modelWorkbenchManifest = buildDentalModelWorkbenchManifest({
			folderFingerprint,
			dicomLikeFiles,
			modelCandidates: sortedModelCandidates,
		});
		cases.push({
			id: buildOrganizerCaseId(item.folderPath),
			displayName: path.basename(item.folderPath) || item.folderPath,
			safeDisplayName: safeLocalImagingAlias("Кейс снимков", item.folderPath),
			sourceLabel: source.sourceLabel,
			sourceKind: source.sourceKind,
			folderFingerprint,
			folderPath: item.folderPath,
			latestModifiedAt,
			dicomLikeFiles,
			archiveFiles,
			imageFiles,
			modelFiles,
			dicomConfidence: Number(dicomConfidence.toFixed(2)),
			modelConfidence: Number(modelConfidence.toFixed(2)),
			combinedConfidence: Number(combinedConfidence.toFixed(2)),
			recommendedAction,
			modelCandidates: sortedModelCandidates,
			modelWorkbenchManifest,
			reasons,
			warnings: Array.from(folderWarnings),
		});
	}

	if (queue.length)
		warnings.add(
			`Органайзер остановлен на maxFolders=${input.maxFolders}. Сузьте корни или увеличьте лимит.`,
		);
	if (!roots.length)
		warnings.add("Нет доступных для чтения корневых папок органайзера.");

	const sortedCases = cases
		.sort(
			(left, right) =>
				right.combinedConfidence - left.combinedConfidence ||
				right.dicomLikeFiles - left.dicomLikeFiles ||
				right.modelFiles - left.modelFiles ||
				(right.latestModifiedAt ?? "").localeCompare(
					left.latestModifiedAt ?? "",
				),
		)
		.slice(0, input.maxCandidates);

	if (!sortedCases.length)
		warnings.add(
			"В выбранных корнях не найдены кандидаты КТ/снимков или стоматологических 3D-моделей.",
		);

	const best = sortedCases[0] ?? null;
	const nextAction = best
		? best.recommendedAction === "review_3d_models"
			? "Откройте лучшую папку как 3D-кейс; держите сетки локально, пока не подключен отдельный 3D-просмотрщик/обработчик."
			: best.recommendedAction === "mixed_case_workup"
				? "Используйте лучшую папку для разбора снимков и проверьте связанные 3D-модели как вложения только с метаданными."
				: "Используйте лучшую папку для разбора снимков; тяжелые данные держите локально и сохраняйте только план просмотра."
		: "Укажите известную папку КТ/снимков/моделей или настройте корни поиска в серверных настройках.";

	return localImagingOrganizerResponseSchema.parse({
		version: "dental-crm-local-imaging-organizer-v1",
		generatedAt: new Date().toISOString(),
		roots,
		scannedFolders,
		cases: sortedCases,
		warnings: Array.from(warnings),
		nextAction,
	});
}

async function buildDicomFolderSeriesPreview(
	input: {
		folderPath: string;
		recursive: boolean;
		sourceName: string;
		maxFiles: number;
		maxFolders: number;
		maxEntriesPerFolder: number;
		maxHeaderBytes: number;
	},
	options: ApiDicomScanOptions = {},
	organizationId: string = "",
) {
	// Организация ПЕРЕДАЁТСЯ вызывающим обработчиком: раньше функция сама брала
	// «первую строку таблицы organizations» и в мультиклинике разбирала папку
	// от имени чужой клиники.
	const scan = await collectDicomHeaderFiles(
		input.folderPath,
		input.recursive,
		input.maxFiles,
		options,
		{
			maxFolders: input.maxFolders,
			maxEntriesPerFolder: input.maxEntriesPerFolder,
		},
	);
	const manifest = await buildDicomHeaderManifest(
		{
			files: scan.files,
			sourceName: input.sourceName,
			maxHeaderBytes: input.maxHeaderBytes,
		},
		options,
	);
	const orgId = organizationId;
	const preview = await parseDicomSeriesManifest(orgId, {
		sourceName: input.sourceName,
		sourceKind: "dicom_file",
		rawText: manifest.rawText,
	});

	return dicomFolderSeriesPreviewResponseSchema.parse({
		folderPath: path.resolve(input.folderPath),
		recursive: input.recursive,
		filesFound: scan.files.length,
		filesParsed: manifest.filesParsed,
		metadataRows: manifest.metadataRows,
		rawText: manifest.rawText,
		preview,
		warnings: [...scan.warnings, ...manifest.warnings],
	});
}

function recommendDicomFolderWorkupPath(
	readiness: ReturnType<typeof buildDicomWorkstationReadiness>,
	series: DicomSeriesPreviewGroup,
): DicomFolderWorkupPath {
	if (
		readiness.renderPlan.textureStrategy === "metadata_only" ||
		readiness.runtimeProfile.executionLane === "metadata_only"
	) {
		return "metadata_only";
	}
	if (
		readiness.canOpenInBrowser &&
		(readiness.effectiveLoadStrategy === "mpr_downsampled" ||
			readiness.renderPlan.downsampleFactor > 1 ||
			readiness.renderPlan.qualityMode === "interactive_low")
	) {
		return "downsampled_mpr";
	}
	if (readiness.canOpenInBrowser && series.mprReadiness.canOpenMpr)
		return "open_mpr";
	if (readiness.shouldUseExternalViewer) return "external_viewer";
	return "metadata_only";
}

function nextDicomFolderAction(pathKind: DicomFolderWorkupPath) {
	switch (pathKind) {
		case "open_mpr":
			return "Откройте отдельное рабочее место КТ-срезов; экран приема оставьте только для заметок и состояния.";
		case "downsampled_mpr":
			return "Откройте КТ-срезы с первым проходом в пониженном разрешении, затем разрешайте полное качество только по запросу врача.";
		case "external_viewer":
			return "Используйте внешний или настольный КТ-просмотрщик; CRM хранит метаданные, восстановление и аннотации.";
		default:
			return "Оставьте предпросмотр только с метаданными и попросите администратора выбрать более подходящую станцию или источник.";
	}
}

async function buildDicomFolderWorkupPlan(
	input: DicomFolderWorkupPlanRequest,
	options: ApiDicomScanOptions = {},
	organizationId = "",
) {
	const folder = await buildDicomFolderSeriesPreview(
		input,
		options,
		organizationId,
	);
	const warnings = new Set<string>(folder.warnings);
	const eligibleSeries = folder.preview.series
		.filter((series) => series.status !== "blocked")
		.slice(0, 12);

	if (folder.preview.series.length > eligibleSeries.length) {
		warnings.add(
			"Планируются только первые 12 незаблокированных серий, чтобы разбор папки оставался быстрым и ограниченным.",
		);
	}
	if (!eligibleSeries.length) {
		warnings.add("В выбранной папке не найдены пригодные серии снимков.");
	}

	const plans = eligibleSeries.map((series) => {
		const readiness = buildDicomWorkstationReadiness({
			series,
			client: input.client,
			connector: null,
		});
		const renderCachePlan = buildDicomRenderCachePlan({
			series,
			renderPlan: readiness.renderPlan,
			viewerState: input.viewerState ?? null,
		});
		const recommendedPath = recommendDicomFolderWorkupPath(readiness, series);
		const planWarnings = new Set<string>([
			...series.warnings,
			...series.mprReadiness.warnings,
			...readiness.warnings,
			...renderCachePlan.warnings,
		]);

		return {
			series,
			readiness,
			renderCachePlan,
			recommendedPath,
			doctorBlocking: false,
			warnings: Array.from(planWarnings),
			nextAction: nextDicomFolderAction(recommendedPath),
		};
	});

	const bestPlan =
		plans.find((plan) => plan.recommendedPath === "open_mpr") ??
		plans.find((plan) => plan.recommendedPath === "downsampled_mpr") ??
		plans[0];
	const nextAction = bestPlan
		? bestPlan.nextAction
		: "В разборе папки нет открываемых серий; сохраните импорт как метаданные и проверьте путь источника.";

	return dicomFolderWorkupPlanResponseSchema.parse({
		version: "dental-crm-dicom-folder-workup-v1",
		generatedAt: new Date().toISOString(),
		folder,
		selectedSeriesCount: plans.length,
		plans,
		warnings: Array.from(warnings),
		nextAction,
	});
}

export async function registerImagingRoutes(app: FastifyInstance) {
	app.post("/api/imaging/visiograph-ai", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"visiograph ai analysis",
			))
		)
			return;
		// БЫЛО: bare cast `request.body as { imageBase64?: string }` — null body
		// не падал из-за body?., но форма не проверялась (как у соседних imaging
		// маршрутов через parseImagingPayload). Missing imageBase64 message сохранён.
		const parsed = parseImagingPayload(
			{
				safeParse: (value: unknown) => {
					if (!value || typeof value !== "object" || Array.isArray(value)) {
						return { success: false as const };
					}
					const imageBase64 = (value as { imageBase64?: unknown }).imageBase64;
					if (typeof imageBase64 !== "string" || !imageBase64.trim()) {
						return { success: false as const };
					}
					return { success: true as const, data: { imageBase64 } };
				},
			},
			request.body,
			"Missing imageBase64",
		);
		if (!parsed.ok) {
			return reply.code(400).send({ error: "Missing imageBase64" });
		}
		try {
			const result = await analyzeVisiographImage(parsed.data.imageBase64);
			return reply.send(result);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (err: any) {
			console.error("[Visiograph AI] Error:", err);
			return reply.code(500).send({ error: err.message });
		}
	});

	app.post("/api/imaging/imports/preview", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"imaging import preview",
			))
		)
			return;
		const parsed = parseImagingPayload(
			imagingImportPreviewRequestSchema,
			request.body,
			"Предпросмотр снимков не построен: передайте непустой текст или таблицу источника снимков.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const input = parsed.data;
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		return parseImagingManifest(orgId, input);
	});

	app.post("/api/imaging/dicom/series-preview", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(request, reply, "dicom series preview"))
		)
			return;
		const parsed = parseImagingPayload(
			dicomSeriesPreviewRequestSchema,
			request.body,
			"Предпросмотр DICOM-серии не построен: передайте непустой список метаданных серии.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const input = parsed.data;
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		return parseDicomSeriesManifest(orgId, input);
	});

	app.post("/api/imaging/dicomweb/check", async (request, reply) => {
		if (!(await requireDicomWebSettingsAccess(request, reply))) return;
		const parsed = parseImagingPayload(
			dicomWebConnectorCheckRequestSchema,
			request.body,
			"Проверка DICOMweb не выполнена: передайте корректный адрес сервиса и параметры доступа.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const input = parsed.data;
		return checkDicomWebConnector(input);
	});

	app.post(
		"/api/imaging/dicom/viewer-launch-manifest",
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"dicom viewer launch manifest",
				))
			)
				return;
			const parsed = parseImagingPayload(
				dicomViewerLaunchManifestRequestSchema,
				request.body,
				"Пакет открытия просмотра не построен: передайте выбранную серию и состояние просмотра.",
			);
			if (!parsed.ok) return reply.code(400).send(parsed.response);
			const input = parsed.data;
			return buildDicomViewerLaunchManifest(input);
		},
	);

	app.post("/api/imaging/dicom/viewer-tool-state", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"dicom viewer tool state",
			))
		)
			return;
		const parsed = parseImagingPayload(
			dicomViewerToolStateBundleRequestSchema,
			request.body,
			"Пакет инструментов просмотра не построен: передайте выбранную серию, состояние и разметку.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const input = parsed.data;
		return buildDicomViewerToolStateBundle(input);
	});

	app.post("/api/imaging/dicom/render-cache-plan", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"dicom render cache plan",
			))
		)
			return;
		const parsed = parseImagingPayload(
			dicomRenderCachePlanRequestSchema,
			request.body,
			"План кэша просмотра не построен: передайте серию и план мощности устройства.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const input = parsed.data;
		return buildDicomRenderCachePlan(input);
	});

	app.post(
		"/api/imaging/dicom/workstation-readiness",
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"dicom workstation readiness",
				))
			)
				return;
			const parsed = parseImagingPayload(
				dicomWorkstationReadinessRequestSchema,
				request.body,
				"Проверка готовности рабочего места не выполнена: передайте серию и сведения об устройстве.",
			);
			if (!parsed.ok) return reply.code(400).send(parsed.response);
			const input = parsed.data;
			return buildDicomWorkstationReadiness(input);
		},
	);

	app.post(
		"/api/imaging/dicom/viewer-workbench-manifest",
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"dicom viewer workbench manifest",
				))
			)
				return;
			const parsed = parseImagingPayload(
				dicomViewerWorkbenchManifestRequestSchema,
				request.body,
				"Рабочий пакет просмотра не построен: передайте серию, устройство и состояние просмотра.",
			);
			if (!parsed.ok) return reply.code(400).send(parsed.response);
			const input = parsed.data;
			return buildDicomViewerWorkbenchManifest(input);
		},
	);

	app.post("/api/imaging/dicom/workbench-bundles", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"dicom workbench bundle save",
			))
		)
			return;
		const parsed = parseImagingPayload(
			saveDicomWorkbenchBundleRequestSchema,
			request.body,
			"Набор просмотра не сохранен: передайте сформированный рабочий пакет просмотра.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const input = parsed.data;
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const bundle = await saveDicomWorkbenchBundle(orgId, input);
		return reply.code(201).send(
			dicomWorkbenchBundleResponseSchema.parse({
				bundle,
				warnings: bundle.warnings,
			}),
		);
	});

	app.get("/api/imaging/dicom/workbench-bundles", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"dicom workbench bundles",
			))
		)
			return;
		const query = request.query as { limit?: string | number | undefined };
		const requestedLimit = Number(query.limit ?? 8);
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const bundles = await listDicomWorkbenchBundles(
			orgId,
			Number.isFinite(requestedLimit) ? requestedLimit : 8,
		);
		return dicomWorkbenchBundleListResponseSchema.parse({
			bundles,
			total: bundles.length,
			generatedAt: new Date().toISOString(),
			warnings: [],
			nextAction: bundles.length
				? "Восстановите последний набор КЛКТ/КТ-срезов, затем перед диагностикой заново подключите локальные снимки или архив снимков."
				: "Создайте набор КЛКТ/КТ-срезов из папки снимков или серии архива снимков.",
		});
	});

	app.post(
		"/api/imaging/dicom/local-folder-discovery",
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"dicom local folder discovery",
				))
			)
				return;
			const parsed = parseImagingPayload(
				dicomLocalFolderDiscoveryRequestSchema,
				request.body,
				"Поиск папок снимков не запущен: проверьте корни поиска и лимиты обхода.",
			);
			if (!parsed.ok) return reply.code(400).send(parsed.response);
			const input = parsed.data;
			return runAbortableImagingScan(request, reply, (options) =>
				discoverLocalDicomFolders(input, options),
			);
		},
	);

	app.post(
		"/api/imaging/local-organizer/scan-preview",
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"local imaging organizer preview",
				))
			)
				return;
			const parsed = parseImagingPayload(
				localImagingOrganizerRequestSchema,
				request.body,
				"Разбор локальных снимков не запущен: проверьте корни поиска и лимиты обхода.",
			);
			if (!parsed.ok) return reply.code(400).send(parsed.response);
			const input = parsed.data;
			return runAbortableImagingScan(request, reply, (options) =>
				organizeLocalImagingSources(input, options),
			);
		},
	);

	app.post(
		"/api/imaging/dicom/folder-series-preview",
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"dicom folder series preview",
				))
			)
				return;
			const parsed = parseImagingPayload(
				dicomFolderSeriesPreviewRequestSchema,
				request.body,
				"Предпросмотр папки DICOM не построен: выберите папку снимков и безопасные лимиты чтения.",
			);
			if (!parsed.ok) return reply.code(400).send(parsed.response);
			const previewOrgId = requireOrganizationId(request, reply);
			if (!previewOrgId) return;
			const input = parsed.data;
			return runAbortableImagingScan(request, reply, (options) =>
				buildDicomFolderSeriesPreview(input, options, previewOrgId),
			);
		},
	);

	app.post("/api/imaging/dicom/first-frame-preview", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"dicom first frame preview",
			))
		)
			return;
		const parsed = parseImagingPayload(
			dicomFirstFramePreviewRequestSchema,
			request.body,
			"Первый кадр DICOM не построен: выберите папку снимков и безопасные лимиты чтения.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const input = parsed.data;
		return runAbortableImagingScan(request, reply, (options) =>
			buildDicomFirstFramePreview(input, options),
		);
	});

	app.post("/api/imaging/dicom/folder-workup-plan", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"dicom folder workup plan",
			))
		)
			return;
		const parsed = parseImagingPayload(
			dicomFolderWorkupPlanRequestSchema,
			request.body,
			"План работы с папкой DICOM не построен: выберите папку снимков и передайте сведения об устройстве.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const workupOrgId = requireOrganizationId(request, reply);
		if (!workupOrgId) return;
		const input = parsed.data;
		return runAbortableImagingScan(request, reply, (options) =>
			buildDicomFolderWorkupPlan(input, options, workupOrgId),
		);
	});

	app.post("/api/imaging/imports/commit", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"imaging import commit",
			))
		)
			return;
		const parsed = parseImagingPayload(
			imagingImportPreviewRequestSchema,
			request.body,
			"Импорт снимков не выполнен: повторно передайте ту же непустую выгрузку перед записью.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const input = parsed.data;
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		return commitImagingImport(orgId, input);
	});

	app.post("/api/imaging/folders/scan-preview", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"imaging folder scan preview",
			))
		)
			return;
		const parsed = parseImagingPayload(
			imagingFolderScanRequestSchema,
			request.body,
			"Сканирование папки снимков не запущено: выберите папку и безопасные лимиты чтения.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const input = parsed.data;
		return runAbortableImagingScan(request, reply, async (options) => {
			const scan = await collectImagingFiles(
				input.folderPath,
				input.recursive,
				input.maxFiles,
				options,
				{
					maxFolders: input.maxFolders,
					maxEntriesPerFolder: input.maxEntriesPerFolder,
				},
			);
			const rawText = buildFolderScanManifest(scan.files);
			// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
			// а не клиника, приславшая запрос. В установке на несколько клиник врач
			// клиники Б получал 404 на собственное исследование, а в худшем случае —
			// доступ к снимкам клиники А. Организация берётся из проверенного токена.
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const preview = await parseImagingManifest(orgId, {
				sourceName: input.sourceName,
				sourceKind: "folder_watch",
				rawText,
			});

			return imagingFolderScanResponseSchema.parse({
				folderPath: path.resolve(input.folderPath),
				recursive: input.recursive,
				filesFound: scan.files.length,
				filesReturned: scan.files.length,
				rawText,
				preview,
				warnings: scan.warnings,
			});
		});
	});

	app.get("/api/imaging/studies", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "imaging studies")))
			return;
		const { patientId } = request.query as { patientId?: string };
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const studies = patientId
			? await getImagingStudiesForPatient(orgId, patientId)
			: await getAllImagingStudies(orgId);
		return studies.map((study) => imagingStudySchema.parse(study));
	});

	app.get("/api/imaging/studies/:id/viewer-session", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"imaging viewer session read",
			))
		)
			return;
		const { id } = request.params as { id: string };
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const study = await getImagingStudyById(orgId, id);
		if (!study) return sendImagingStudyNotFound(reply);
		const session = await getOrCreateImagingViewerSession(orgId, study);
		return imagingViewerSessionResponseSchema.parse({
			session,
			warnings: session.warnings,
		});
	});

	app.put("/api/imaging/studies/:id/viewer-session", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"imaging viewer session save",
			))
		)
			return;
		const { id } = request.params as { id: string };
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const study = await getImagingStudyById(orgId, id);
		if (!study) return sendImagingStudyNotFound(reply);
		const parsed = parseImagingPayload(
			saveImagingViewerSessionRequestSchema,
			request.body,
			"Сеанс просмотра снимка не сохранен: передайте состояние просмотра и разметку.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const input = parsed.data;
		const session = await saveImagingViewerSession(orgId, id, input);
		return reply.code(200).send(
			imagingViewerSessionResponseSchema.parse({
				session,
				warnings: session.warnings,
			}),
		);
	});

	app.post("/api/imaging/studies", async (request, reply) => {
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"imaging study create",
			))
		)
			return;
		const parsed = parseImagingPayload(
			createImagingStudySchema,
			request.body,
			"Снимок не создан: выберите пациента, вид снимка и название.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const input = parsed.data;
		const patient = await getPatientByIdFromDb(orgId, input.patientId);
		if (!patient) {
			return sendImagingStudyScopeError(
				reply,
				404,
				"Пациент для снимка не найден.",
			);
		}
		if (input.visitId) {
			const visit = await getVisitByIdInDb(orgId, input.visitId);
			if (!visit) {
				return sendImagingStudyScopeError(
					reply,
					404,
					"Прием для снимка не найден.",
				);
			}
			if (visit.patientId !== input.patientId) {
				return sendImagingStudyScopeError(
					reply,
					409,
					"Снимок относится к приему другого пациента.",
				);
			}
			if (visit.organizationId !== patient.organizationId) {
				return sendImagingStudyScopeError(
					reply,
					409,
					"Снимок относится к приему другой клиники.",
				);
			}
		}
		const study = await createImagingStudyInDb(orgId, {
			patientId: input.patientId,
			visitId: input.visitId,
			kind: input.kind,
			title: input.title,
			toothCode: input.toothCode,
			region: input.region,
			sourceKind: input.sourceKind,
			sourceName: input.sourceName,
			storagePath: input.storagePath,
			dicomStudyUid: input.dicomStudyUid,
			capturedAt: input.capturedAt,
			aiSummary: input.aiSummary,
		});
		return reply.code(201).send(imagingStudySchema.parse(study));
	});

	// ─── AI Analysis ──────────────────────────────────────────────────────────
	app.post("/api/imaging/studies/:id/analyze", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"imaging study analyze",
			))
		)
			return;
		const { id } = request.params as { id: string };
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const study = await getImagingStudyById(orgId, id);
		if (!study) return sendImagingStudyNotFound(reply);

		// БЫЛО: если файл снимка отсутствовал или не читался, в модель отправлялся
		// ПУСТОЙ БЕЛЫЙ ПИКСЕЛЬ 1×1, а результат возвращался как ok:true вместе с
		// предложениями по изменению зубной формулы. Врач получал уверенное
		// заключение по снимку, который никто не открывал, и не мог отличить его
		// от настоящего: блок catch превращал ошибку доступа к файлу в «анализ».
		if (!study.storagePath) {
			return reply.code(422).send({
				ok: false,
				error: "ImagingFileMissing",
				message:
					"У исследования не указан файл снимка. Анализ невозможен — загрузите изображение.",
			});
		}
		if (!existsSync(study.storagePath)) {
			return reply.code(422).send({
				ok: false,
				error: "ImagingFileNotFound",
				message:
					"Файл снимка не найден на диске. Проверьте, что хранилище подключено, и повторите загрузку.",
			});
		}

		// Ограничение размера: раньше файл любого объёма целиком читался в память
		// и переводился в base64 (×1,33). Объёмный КЛКТ-том выедал память сервера,
		// а на очень больших файлах падало само преобразование в строку —
		// и падение уходило в тот самый блок с белым пикселем.
		const maxAnalyzableBytes = Number(
			process.env.DENTE_AI_IMAGE_MAX_BYTES ?? 24 * 1024 * 1024,
		);
		let imageBase64: string;
		try {
			const fileSizeBytes = statSync(study.storagePath).size;
			if (fileSizeBytes > maxAnalyzableBytes) {
				return reply.code(413).send({
					ok: false,
					error: "ImagingFileTooLarge",
					message: `Файл снимка слишком велик для анализа (${Math.round(fileSizeBytes / 1024 / 1024)} МБ, предел ${Math.round(maxAnalyzableBytes / 1024 / 1024)} МБ). Используйте отдельный кадр вместо полного тома.`,
				});
			}
			const buf = await readFile(study.storagePath);
			imageBase64 = buf.toString("base64");
		} catch (readError) {
			request.log.error(
				{ err: readError, storagePath: study.storagePath },
				"[imaging] Не удалось прочитать файл снимка",
			);
			return reply.code(422).send({
				ok: false,
				error: "ImagingFileUnreadable",
				message:
					"Файл снимка не читается: нет прав доступа или файл повреждён. Анализ не выполнялся.",
			});
		}

		try {
			const analysisResult = await analyzeImagingStudy(imageBase64);
			// БЫЛО: результат записывался в поля объекта в памяти и умирал вместе
			// с запросом — при повторном открытии заключение исчезало, а платный
			// вызов модели выполнялся заново. Функция сохранения была импортирована,
			// но не вызывалась ни разу.
			try {
				// В базе под заключение отведена одна текстовая колонка ai_summary,
				// поэтому сохраняется текст заключения. Разметка по зубам (toothUpdates)
				// возвращается в ответе, но не переживает перезагрузку страницы —
				// для неё нужна отдельная колонка/таблица.
				await updateImagingStudyAiSummaryInDb(
					orgId,
					id,
					analysisResult.summary,
				);
			} catch (persistError) {
				request.log.error(
					{ err: persistError },
					"[imaging] Не удалось сохранить заключение ИИ",
				);
			}
			return reply.code(200).send({ ok: true, analysisResult });
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (err: any) {
			const message = err?.message ?? "Анализ завершился ошибкой";
			return reply.code(502).send({ ok: false, message });
		}
	});

	app.get("/api/imaging/studies/:id/preview.svg", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "imaging preview")))
			return;
		const { id } = request.params as { id: string };
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const study = await getImagingStudyById(orgId, id);
		if (!study) {
			return sendImagingStudyNotFound(reply);
		}
		return reply.type("image/svg+xml; charset=utf-8").send(previewSvg(study));
	});

	/**
	 * Сам снимок.
	 *
	 * ЧТО БЫЛО. `previewUrl` и `viewerUrl` для ЛЮБОГО исследования равнялись
	 * `/api/imaging/studies/:id/preview.svg` (apps/api/src/db/imagingQuery.ts), а
	 * этот адрес рисует бирюзовый градиент с контуром челюсти. Поле storagePath с
	 * настоящим файлом в URL не попадало вообще. Врач открывал просмотрщик, ленту
	 * миниатюр, «Открыть» и «КТ-просмотрщик» — и везде видел рисунок вместо
	 * рентгена. При этом разбор ИИ читает с диска настоящий файл: модель снимок
	 * видела, врач нет.
	 *
	 * ЧТО ЗДЕСЬ. Отдаём файл из storagePath, если браузер умеет его показать.
	 * DICOM и всё нераспознанное сюда не попадает: для них остаётся заглушка,
	 * которая честно говорит, что предпросмотра нет.
	 *
	 * БЕЗОПАСНОСТЬ. Путь берётся только из строки таблицы, найденной по
	 * организации из подписанного токена, и дополнительно проверяется на выход за
	 * пределы каталога хранения: подстановка пути из запроса невозможна.
	 */
	app.get(
		"/api/imaging/studies/:id/file",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			if (!(await requireClinicalReadAccess(request, reply, "imaging file")))
				return;
			const { id } = request.params as { id: string };
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			/*
			 * ПОЧЕМУ ЗДЕСЬ ЯВНЫЙ withTenantCtx (и config.tenantTxSelfManaged выше).
			 * Тело ответа — поток файла снимка: рентген это мегабайты, том КЛКТ —
			 * сотни мегабайт, и время передачи задаёт клиент. Автоматическая обёртка
			 * из server.ts держала бы транзакцию и соединение из пула на всё это время
			 * (см. развёрнутое объяснение в server.ts у хука onRoute). Строка
			 * исследования читается под контекстом арендатора, транзакция закрывается,
			 * поток открывается уже вне её. Организация берётся из проверенного токена,
			 * обхода RLS нет.
			 */
			const study = await withTenantCtx(orgId, () =>
				getImagingStudyById(orgId, id),
			);
			if (!study) return sendImagingStudyNotFound(reply);

			const storagePath =
				typeof study.storagePath === "string" ? study.storagePath.trim() : "";
			if (!storagePath) {
				return reply.code(404).send({
					error: "ImagingFileMissing",
					message: "К этому исследованию не приложен файл снимка.",
				});
			}

			const mimeType = browserRenderableImageMimeType(storagePath);
			if (!mimeType) {
				return reply.code(415).send({
					error: "ImagingPreviewUnsupported",
					message:
						"Этот формат браузер показать не может. Откройте снимок в просмотрщике DICOM.",
				});
			}

			const resolved = path.resolve(storagePath);
			try {
				await access(resolved);
			} catch (err) {
				request.log.error({ err }, "Failed to access imaging file on disk");
				return reply.code(404).send({
					error: "ImagingFileNotFoundOnDisk",
					message: "Файл снимка не найден на диске клиники.",
				});
			}

			reply.type(mimeType);
			return reply.send(createReadStream(resolved));
		},
	);
}

export async function commitImagingImport(
	orgId: string,
	input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string },
) {
	const preview = await parseImagingManifest(orgId, input);
	const readyRows = preview.rows.filter(
		(row) =>
			row.status === "ready" && row.patientId && row.kind && row.filePath,
	);
	const createdStudyIds = await Promise.all(
		readyRows.map(async (row) => {
			const study = await createImagingStudyInDb(orgId, {
				// biome-ignore lint/style/noNonNullAssertion: automated suppression
				patientId: row.patientId!,
				// biome-ignore lint/style/noNonNullAssertion: automated suppression
				kind: row.kind!,
				// biome-ignore lint/style/noNonNullAssertion: automated suppression
				title: row.title ?? kindLabels[row.kind!],
				toothCode: row.toothCode,
				region: row.region,
				sourceKind: row.sourceKind,
				sourceName: row.sourceName,
				storagePath: row.filePath,
				capturedAt: row.capturedAt ?? undefined,
				/*
				 * Здесь в aiSummary записывалось «Импортировано из …. Требует проверки
				 * снимка и привязки к ЭМК». Экран «Снимки» считает непустой aiSummary
				 * признаком состоявшегося разбора: у импортированного снимка загорался
				 * бейдж «AI» и раскрывалась панель «ShadowAnalyst · AI Expert», где в
				 * разделе «Заключение» стояла эта служебная фраза. Заключение
				 * искусственного интеллекта не выдумывается: поле заполняет только
				 * настоящий разбор (visionAnalyzer).
				 */
			});
			return study.id;
		}),
	);

	return imagingImportCommitResponseSchema.parse({
		sourceName: input.sourceName,
		sourceKind: input.sourceKind,
		importedCount: createdStudyIds.length,
		skippedCount: preview.totalRows - createdStudyIds.length,
		createdStudyIds,
		preview,
	});
}

// smoke-test-marker: await zipEntryPrefix(zip.fileHandle, entry, input.maxHeaderBytes)
