import {
	dicomWorkstationReadinessRequestSchema,
	dicomViewerWorkbenchManifestRequestSchema,
	dicomLocalFolderDiscoveryRequestSchema,
	localImagingOrganizerRequestSchema,
	dicomFolderSeriesPreviewRequestSchema,
} from "@dental/shared";
import {
	buildDicomWorkstationReadiness,
	buildDicomViewerWorkbenchManifest,
} from "./workstationReadiness.js";
import { discoverLocalDicomFolders } from "./localFolderDiscovery.js";
import {
	organizeLocalImagingSources,
	buildDicomFolderSeriesPreview,
} from "./localImagingOrganizer.js";
import type { FastifyInstance } from "fastify";
import {
	dicomSeriesPreviewRequestSchema,
	dicomSeriesPreviewResponseSchema,
	dicomViewerToolStateBundleRequestSchema,
	dicomViewerToolStateBundleResponseSchema,
	dicomRenderCachePlanRequestSchema,
	dicomRenderCachePlanResponseSchema,
	saveDicomWorkbenchBundleRequestSchema,
	dicomWorkbenchBundleResponseSchema,
	dicomWorkbenchBundleListResponseSchema,
	dicomFirstFramePreviewRequestSchema,
	dicomFirstFramePreviewResponseSchema,
	dicomFolderWorkupPlanRequestSchema,
	dicomFolderWorkupPlanResponseSchema,
} from "@dental/shared";
import {
	getImagingOrganizationId,
	parseImagingPayload,
	runAbortableImagingScan,
} from "./imagingHelpers.js";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { parseDicomSeriesManifest } from "./dicomSeries.js";
import { buildDicomViewerToolStateBundle } from "./viewerToolState.js";
import { buildDicomRenderCachePlan } from "./renderCachePlan.js";
import { buildDicomFirstFramePreview } from "./dicomPreview.js";
import { buildDicomFolderWorkupPlan } from "./localImagingOrganizer.js";
import {
	saveDicomWorkbenchBundle,
	listDicomWorkbenchBundles,
} from "../../db/imagingQuery.js";

export async function registerCbctRoutes(app: FastifyInstance) {
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
		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return;
		return parseDicomSeriesManifest(orgId, input);
	});


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
			return reply;
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
		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return reply;
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
			return reply;
		const query = request.query as { limit?: string | number | undefined };
		const requestedLimit = Number(query.limit ?? 8);
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return reply;
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
			const previewOrgId = getImagingOrganizationId(request, reply);
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
		const workupOrgId = getImagingOrganizationId(request, reply);
		if (!workupOrgId) return;
		const input = parsed.data;
		return runAbortableImagingScan(request, reply, (options) =>
			buildDicomFolderWorkupPlan(input, options, workupOrgId),
		);
	});

}
