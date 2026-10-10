import type { FastifyInstance } from "fastify";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { mapRunPhase, stageRunPhase } from "../../migration/phases.js";
import {
	countStagingByStatus,
	enqueueRun,
	findRun,
} from "../../migration/runStore.js";
import { migrationWorkerStatus } from "../../migration/worker.js";
import {
	executeRequestSchema,
	fail,
	failFromPhaseError,
	failSchemaRefusal,
	mapRequestSchema,
} from "./types.js";

/**
 * Обработчики основных фаз прогона миграции:
 * сопоставление (map), стейджинг (stage), постановка на выполнение (execute).
 */
export function registerMigrationRunCoreRoutes(app: FastifyInstance): void {
	/** Сопоставление колонок: правила плюс языковая модель. Быстрая фаза. */
	app.post<{ Params: { runId: string } }>(
		"/api/migration/:runId/map",
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"migration map",
			);
			if (!context) return;

			const parsed = mapRequestSchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return failSchemaRefusal(
					reply,
					parsed.error.issues,
					"Запрос сопоставления не прошёл проверку.",
					"сопоставление колонок",
				);
			}

			try {
				const result = await mapRunPhase({
					runId: request.params.runId,
					organizationId: context.organizationId,
					allowLlm: parsed.data.allowLlm,
					sourceSystem: "legacy",
					...(parsed.data.entityKind === undefined
						? {}
						: { requestedEntityKind: parsed.data.entityKind }),
					...(parsed.data.vendorProfile === undefined
						? {}
						: { requestedVendorProfile: parsed.data.vendorProfile }),
					mappingOverrides: parsed.data.mappingOverrides,
				});

				reply.code(200);
				return {
					runId: request.params.runId,
					mapping: result.mapping,
					profile: result.analyze.profile,
					projectedReady: result.analyze.projectedReady,
					projectedQuarantine: result.analyze.projectedQuarantine,
					qualityFindings: result.analyze.qualityFindings,
					llm: {
						calls: result.llmCalls,
						rejectedSuggestions: result.llmRejected,
					},
					nextStep: "POST /api/migration/:runId/execute",
				};
			} catch (error) {
				return failFromPhaseError(reply, error);
			}
		},
	);

	/**
	 * Укладка в стейджинг отдельным вызовом.
	 *
	 * Обычно её делает воркер внутри выполнения, но отдельный маршрут нужен, чтобы
	 * оператор мог увидеть карантин ДО записи в боевые таблицы: уложить, посмотреть,
	 * что отсеялось, поправить карту и уложить заново.
	 */
	app.post<{ Params: { runId: string } }>(
		"/api/migration/:runId/stage",
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"migration stage",
			);
			if (!context) return;

			try {
				const result = await stageRunPhase({
					runId: request.params.runId,
					organizationId: context.organizationId,
					allowLlm: false,
					sourceSystem: "legacy",
					mappingOverrides: [],
				});
				const counts = await countStagingByStatus(
					request.params.runId,
					context.organizationId,
				);
				reply.code(200);
				return {
					runId: request.params.runId,
					sourceRows: result.sourceRows,
					staging: counts,
					nextStep: "POST /api/migration/:runId/execute",
				};
			} catch (error) {
				return failFromPhaseError(reply, error);
			}
		},
	);

	/**
	 * Постановка выполнения в очередь.
	 *
	 * Отвечает 202 Accepted и идентификатором задачи: загрузка идёт в фоне, а
	 * клиент опрашивает GET /api/migration/:runId. Возвращать 200 здесь было бы
	 * неправдой — работа не выполнена, а только принята.
	 */
	app.post<{ Params: { runId: string } }>(
		"/api/migration/:runId/execute",
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"migration execute",
			);
			if (!context) return;

			const parsed = executeRequestSchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return failSchemaRefusal(
					reply,
					parsed.error.issues,
					"Запрос выполнения не прошёл проверку.",
					"выполнение прогона",
				);
			}

			const run = await findRun(request.params.runId, context.organizationId);
			if (!run) {
				return fail(
					reply,
					404,
					"RunNotFound",
					"Прогон переноса не найден в этой организации.",
				);
			}
			if (!run.mappingJson) {
				return fail(
					reply,
					409,
					"MappingMissing",
					"Карта соответствия не построена. Сначала вызовите фазу сопоставления.",
					{ nextStep: "POST /api/migration/:runId/map" },
				);
			}
			if (run.status === "loading") {
				return fail(
					reply,
					409,
					"RunAlreadyRunning",
					"Прогон уже выполняется.",
					{
						phase: run.phase,
						workerId: run.workerId,
					},
				);
			}
			if (run.status === "queued") {
				return fail(
					reply,
					409,
					"RunAlreadyQueued",
					"Прогон уже стоит в очереди на выполнение.",
				);
			}

			const queued = await enqueueRun(
				request.params.runId,
				context.organizationId,
				parsed.data.dryRun,
			);
			if (!queued) {
				return fail(
					reply,
					409,
					"RunNotQueueable",
					`Прогон в состоянии «${run.status}» нельзя поставить в очередь. Завершённый перенос повторно не выполняется — создайте новый.`,
					{ status: run.status },
				);
			}

			const queuedRun = await findRun(
				request.params.runId,
				context.organizationId,
			);
			reply.code(202);
			return {
				accepted: true,
				runId: request.params.runId,
				status: queuedRun?.status ?? "queued",
				dryRun: parsed.data.dryRun,
				message: parsed.data.dryRun
					? "Сухой прогон принят: боевые таблицы не изменятся."
					: "Выполнение принято. Загрузка идёт в фоне.",
				poll: `GET /api/migration/${request.params.runId}`,
				worker: migrationWorkerStatus(),
			};
		},
	);
}
