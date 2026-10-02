/**
 * xray.ts — маршруты для 2D-снимков (визиографов) с AI-анализом.
 *
 * POST /api/xray/scans          — загрузить снимок (base64), создать запись
 * POST /api/xray/scans/:id/analyze — запустить AI-анализ для конкретного скана
 * GET  /api/xray/scans          — список сканов пациента (?patientId=...)
 * GET  /api/xray/scans/:id      — один скан со всеми результатами
 * PUT  /api/xray/scans/:id      — сохранить заключение врача (aiReport/notes)
 * DELETE /api/xray/scans/:id    — удалить скан
 *
 * ФОРМА ОТВЕТА: КОД СТАВИМ, ЗНАЧЕНИЕ ВОЗВРАЩАЕМ.
 *
 * Ни один обработчик здесь не пишет `return reply.code(N).send(x)`. Причина не
 * стилистическая. server.ts (хук onRoute) оборачивает КАЖДЫЙ обработчик в
 * withTenantCtx, то есть в транзакцию, и ждёт разрешения промиса обработчика,
 * прежде чем зафиксировать её. А `reply` — thenable: `Reply.prototype.then`
 * (fastify/lib/reply.js:466) разрешается только по `eos(reply.raw)`, то есть
 * когда ответ уже УШЁЛ клиенту. Поэтому `return reply.send(...)` откладывал
 * COMMIT на момент ПОСЛЕ ответа: замерено поллером pg_stat_activity на живом
 * сервере, дельта «коммит минус заголовки» = +0,6…+1,9 мс, три прогона из трёх.
 *
 * Чем это плохо именно здесь: VisiographAnalyzer.tsx сразу после POST
 * /api/xray/scans читает GET /api/xray/scans/:id. Докоммитный ответ означает
 * гонку «записал → прочитал» на глазах у врача. Хуже того, при отказе на самом
 * COMMIT (отложенное ограничение) fastify уже отправил 201 и может только
 * записать ошибку в журнал (lib/wrap-thenable.js:63) — врач видит «снимок
 * сохранён» при нуле строк в базе. Воспроизведено детерминированно.
 *
 * Возврат значения этого не даёт: fastify зовёт `reply.send(payload)` уже ПОСЛЕ
 * разрешения промиса (lib/wrap-thenable.js:14), то есть после COMMIT. Заголовки
 * и код, выставленные через `reply.code()/header()/type()` до возврата,
 * сохраняются — они живут на объекте ответа, а не в аргументах `send`.
 *
 * НЕ ПЕРЕВЕДЕНО и переводить нельзя: `reply.code(204).send()` в DELETE — у
 * 204 нет тела, и возврат значения его бы туда положил.
 */

import { existsSync, promises as fs } from "node:fs";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { xrayScans } from "../db/schema.js";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../accessGuard.js";
import { analyzeVisiographImage } from "../ai/visiograph.js";
import { db, transactionStorage } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
	getRequestIdentity,
	requireOrganizationId,
} from "../security/identity.js";
import { auditMedicalAccessFromRequest } from "../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../security/medicalSecrecyWarden.js";
import { LocalPacsStorageService } from "../services/imaging/localPacsStorageService.js";

export {
	createXrayScanSchema,
	_xrayScanResponseSchema,
	xrayIntFromEnv,
	xrayAnalysisDeadlineMs,
	xrayAnalysisStaleMs,
	XrayAnalysisDeadlineError,
	type XrayAnalysisJob,
	type XrayAnalysisPatch,
	persistXrayAnalysisOutcome,
	analyzeWithDeadline,
	executeXrayAnalysisJob,
	startDetachedXrayAnalysis,
	scanToResponse,
	extractSummary,
} from "./xraySchemas.js";

import {
	createXrayScanSchema,
	xrayAnalysisStaleMs,
	startDetachedXrayAnalysis,
	scanToResponse,
	extractSummary,
} from "./xraySchemas.js";

// Route registration


export async function registerXrayRoutes(app: FastifyInstance) {
	app.post("/api/xray/scans", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(request, reply, "upload xray scan"))
		)
			return;

		const parsed = createXrayScanSchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return {
				error: "XrayScanValidationError",
				message: "Неверный формат запроса загрузки снимка.",
			};
		}

		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const data = parsed.data;

		// Парсим входной base64 и выделяем MIME-тип
		let base64Payload = data.imageBase64;
		let detectedMime = data.mimeType || "image/jpeg";
		if (base64Payload.startsWith("data:")) {
			const commaIndex = base64Payload.indexOf(",");
			if (commaIndex !== -1) {
				const header = base64Payload.slice(5, commaIndex);
				const mimeMatch = header.match(/^([^;]+)/);
				if (mimeMatch?.[1]) {
					detectedMime = mimeMatch[1];
				}
				base64Payload = base64Payload.slice(commaIndex + 1);
			}
		}

		const imageBuffer = Buffer.from(base64Payload, "base64");
		const ext = detectedMime.includes("png")
			? ".png"
			: detectedMime.includes("webp")
				? ".webp"
				: ".jpg";
		const baseName = (data.originalFilename || "xray_scan").replace(
			/[^\w.-]/g,
			"_",
		);
		const fileName = baseName.endsWith(ext) ? baseName : `${baseName}${ext}`;

		// Ликвидируем хранение base64 в PostgreSQL: сохраняем файл в изолированное хранилище PACS на диске
		const storedFile = await LocalPacsStorageService.storeXrayScanFile(
			organizationId,
			fileName,
			imageBuffer,
			detectedMime,
		);

		// Заключение с клиента (синхронный visiograph-ai) — в ту же строку, что и снимок.
		const hasInlineReport =
			typeof data.aiReport === "string" && data.aiReport.trim().length > 0;
		const inlineSummary =
			data.aiSummary !== undefined && data.aiSummary !== null
				? data.aiSummary
				: hasInlineReport
					? // biome-ignore lint/style/noNonNullAssertion: automated suppression
						extractSummary(data.aiReport!)
					: null;
		const createStatus = data.status ?? (hasInlineReport ? "done" : "pending");

		const [inserted] = await db
			.insert(xrayScans)
			.values({
				organizationId,
				patientId: data.patientId,
				visitId: data.visitId ?? null,
				imageDataUri: null, // PostgreSQL WAL и бэкапы чисты от base64 блоата!
				storagePath: storedFile.storagePath,
				fileUrl: `/api/xray/scans/file`,
				fileSizeBytes: storedFile.fileSizeBytes,
				sha256: storedFile.sha256,
				originalFilename: data.originalFilename ?? null,
				mimeType: detectedMime,
				kind: data.kind,
				toothCode: data.toothCode ?? null,
				notes: data.notes ?? null,
				status: createStatus,
				aiReport: data.aiReport ?? null,
				aiSummary: inlineSummary,
				aiToothStates: (data.aiToothStates ?? null) as Record<
					string,
					string
				> | null,
				aiAnalyzedAt: hasInlineReport ? new Date() : null,
			})
			.returning();

		if (!inserted) {
			reply.code(500);
			return { error: "InsertError", message: "Не удалось сохранить снимок." };
		}

		reply.code(201);
		const effectiveDataUri = data.imageBase64.startsWith("data:")
			? data.imageBase64
			: `data:${detectedMime};base64,${data.imageBase64}`;
		return scanToResponse(inserted, true, effectiveDataUri);
	});

	app.post("/api/xray/scans/:id/analyze", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "analyze xray scan")))
			return;

		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const { id } = request.params as { id: string };

		const [scan] = await db
			.select()
			.from(xrayScans)
			.where(
				and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)),
			)
			.limit(1);

		if (!scan) {
			reply.code(404);
			return { error: "XrayScanNotFound", message: "Снимок не найден." };
		}

		if (!scan.imageDataUri && !scan.storagePath) {
			reply.code(400);
			return {
				error: "XrayScanNoImage",
				message: "Снимок не содержит изображения.",
			};
		}

		let analysisImageDataUri = scan.imageDataUri;
		if (
			!analysisImageDataUri &&
			scan.storagePath &&
			existsSync(scan.storagePath)
		) {
			try {
				const buf = await fs.readFile(scan.storagePath);
				analysisImageDataUri = `data:${scan.mimeType || "image/jpeg"};base64,${buf.toString("base64")}`;
			} catch (readErr) {
				request.log.error(
					{ readErr, scanId: id },
					"Не удалось прочитать файл снимка с диска для анализа",
				);
			}
		}

		if (!analysisImageDataUri) {
			reply.code(400);
			return {
				error: "XrayScanNoImage",
				message: "Файл изображения недоступен на диске клиники.",
			};
		}

		/*
		 * БЫЛО: любое `analyzing` давало 409 навсегда. Поскольку фоновая запись
		 * результата терялась (см. разбор выше), снимок из этого состояния уже не
		 * выходил, и врач не мог ни получить заключение, ни повторить разбор.
		 * СТАЛО: 409 отдаётся только пока разбор действительно может идти. Работа
		 * живёт в памяти процесса и перезапуск её не переживает, поэтому брошенное
		 * `analyzing` старше срока считается сиротой и разбор запускается заново.
		 */
		if (scan.status === "analyzing") {
			const startedAgoMs = Date.now() - scan.updatedAt.getTime();
			if (startedAgoMs < xrayAnalysisStaleMs()) {
				reply.code(409);
				return {
					error: "XrayScanAlreadyAnalyzing",
					message: "Анализ уже выполняется.",
				};
			}
			console.warn(
				"[XRay AI] Брошенный разбор подобран заново",
				id,
				`${Math.round(startedAgoMs / 1000)} с`,
			);
		}

		/*
		 * `updatedAt` здесь не косметика: по нему выше считается срок брошенного
		 * разбора. Без него сирота определялась бы по времени последней правки
		 * заключения, то есть как угодно.
		 */
		await db
			.update(xrayScans)
			.set({ status: "analyzing", aiError: null, updatedAt: new Date() })
			.where(
				and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)),
			);

		/*
		 * Задание ставится ДО возврата ответа, а сам ответ уходит после фиксации
		 * транзакции. Порядок именно такой, потому что клиент сразу после 202
		 * опрашивает GET /api/xray/scans/:id и обязан увидеть status = "analyzing":
		 * ответ раньше COMMIT давал первому опросу прежнее значение.
		 *
		 * Обработчик от этого не удлиняется: startDetachedXrayAnalysis только
		 * планирует работу и возвращается немедленно. Устройство задания и причина,
		 * по которой оно обязано покинуть контекст обработчика, описаны у
		 * startDetachedXrayAnalysis выше.
		 */
		startDetachedXrayAnalysis({
			scanId: id,
			organizationId,
			imageDataUri: analysisImageDataUri,
		});

		reply.code(202);
		return { status: "analyzing", id };
	});

	app.get("/api/xray/scans", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "list xray scans")))
			return;

		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		// 152-ФЗ / 323-ФЗ: Рентгенологические снимки — врачебная тайна
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.xray.read",
				role: staffRole,
				message: `Отказ в доступе к рентгенологическим снимкам (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const querySchema = z.object({
			patientId: z.string().uuid({ message: "Параметр patientId должен быть валидным UUID." }),
		});
		const parsedQuery = querySchema.safeParse(request.query);
		if (!parsedQuery.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Параметр patientId должен быть валидным UUID.",
				details: parsedQuery.error.issues,
			};
		}
		const patientId = parsedQuery.data.patientId;

		const scans = await db
			.select()
			.from(xrayScans)
			.where(
				and(
					eq(xrayScans.patientId, patientId),
					eq(xrayScans.organizationId, organizationId),
				),
			)
			.orderBy(xrayScans.capturedAt);

		// 152-ФЗ: Юридически значимый аудит чтения рентгенологических снимков
		if (scans.length > 0) {
			await auditMedicalAccessFromRequest(request, {
				organizationId,
				patientId,
				action: "VIEW_XRAY_SCANS",
				diagnosis: "Рентгенологические снимки пациента",
			});
		}

		return scans.map((s) => scanToResponse(s, false));
	});

	app.get("/api/xray/scans/:id", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "get xray scan")))
			return;

		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		// 152-ФЗ / 323-ФЗ: Рентгенологические снимки — врачебная тайна
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.xray.read",
				role: staffRole,
				message: `Отказ в доступе к рентгенологическому снимку (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { id } = request.params as { id: string };

		const [scan] = await db
			.select()
			.from(xrayScans)
			.where(
				and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)),
			)
			.limit(1);

		if (!scan) {
			reply.code(404);
			return { error: "XrayScanNotFound", message: "Снимок не найден." };
		}

		// 152-ФЗ: Юридически значимый аудит просмотра детального снимка
		await auditMedicalAccessFromRequest(request, {
			organizationId,
			patientId: scan.patientId,
			action: "VIEW_XRAY_SCAN_DETAIL",
			diagnosis: scan.aiReport ?? "Рентгенологический снимок",
		});

		let resolvedImageDataUri = scan.imageDataUri;
		if (
			!resolvedImageDataUri &&
			scan.storagePath &&
			existsSync(scan.storagePath)
		) {
			try {
				const buf = await fs.readFile(scan.storagePath);
				resolvedImageDataUri = `data:${scan.mimeType || "image/jpeg"};base64,${buf.toString("base64")}`;
			} catch (err) {
				request.log.warn(
					{ err, scanId: scan.id },
					"Не удалось сформировать data URI из локального файла снимка",
				);
			}
		}

		return scanToResponse(scan, true, resolvedImageDataUri); // Include image
	});

	app.get("/api/xray/scans/:id/file", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "get xray scan file")))
			return;

		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		// 152-ФЗ / 323-ФЗ: Рентгенологические снимки — врачебная тайна
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.xray.read",
				role: staffRole,
				message: `Отказ в доступе к файлу рентгенологического снимка (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { id } = request.params as { id: string };

		const [scan] = await db
			.select()
			.from(xrayScans)
			.where(
				and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)),
			)
			.limit(1);

		if (!scan) {
			reply.code(404);
			return { error: "XrayScanNotFound", message: "Снимок не найден." };
		}

		// 152-ФЗ: Юридически значимый аудит обращения к файлу снимка
		await auditMedicalAccessFromRequest(request, {
			organizationId,
			patientId: scan.patientId,
			action: "VIEW_XRAY_SCAN_FILE",
			diagnosis: scan.aiReport ?? "Файл рентгенологического снимка",
		});

		// Приоритет 1: быстрое чтение с диска без расхода памяти на base64
		if (scan.storagePath && existsSync(scan.storagePath)) {
			try {
				const buffer = await fs.readFile(scan.storagePath);
				reply.type(scan.mimeType || "image/jpeg");
				reply.header("Content-Length", buffer.length);
				return buffer;
			} catch (_err) {
				reply.code(500);
				return {
					error: "FileReadError",
					message: "Не удалось прочитать файл снимка с диска.",
				};
			}
		}

		// Приоритет 2: обратная совместимость для старых записей с base64 в БД
		if (scan.imageDataUri) {
			const dataUri = scan.imageDataUri;
			const commaIndex = dataUri.indexOf(",");
			const base64Data =
				commaIndex >= 0 ? dataUri.slice(commaIndex + 1) : dataUri;
			const buffer = Buffer.from(base64Data, "base64");
			reply.type(scan.mimeType || "image/jpeg");
			reply.header("Content-Length", buffer.length);
			return buffer;
		}

		reply.code(404);
		return {
			error: "FileNotFound",
			message: "Файл изображения отсутствует в записи снимка.",
		};
	});

	/*
	 * PUT /api/xray/scans/:id — заключение врача / правки AI-отчёта.
	 *
	 * БЫЛО: маршрута не было. VisiographAnalyzer.tsx слал
	 *   PUT /api/xray/scans/:id  { aiReport, notes, status: "done" }
	 * и получал 404. Кнопка «Сохранить заключение» врала успехом на клиенте
	 * или показывала ошибку сети; после F5 текст заключения пропадал.
	 * СТАЛО: org-scoped update только aiReport/notes/status (+ optional toothCode).
	 * imageDataUri и AI-метаданные этим маршрутом не трогаем.
	 */
	const updateXrayScanSchema = z.object({
		aiReport: z.string().max(50000).nullable().optional(),
		/*
		 * UI VisiographAnalyzer шлёт aiSummary + aiToothStates вместе с
		 * aiReport (см. saveConclusion). Без них Zod strip → поля AI после
		 * ручной правки заключения оставались от старого analyze, а summary
		 * в списке снимков врал.
		 */
		aiSummary: z.string().max(2000).nullable().optional(),
		aiToothStates: z.record(z.string(), z.string()).nullable().optional(),
		notes: z.string().max(5000).nullable().optional(),
		status: z.enum(["pending", "analyzing", "done", "error"]).optional(),
		toothCode: z.string().max(16).nullable().optional(),
	});

	app.put("/api/xray/scans/:id", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"update xray scan conclusion",
			))
		)
			return;

		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		// 152-ФЗ / 323-ФЗ: Изменение заключений рентгена разрешено только врачу
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.xray.write",
				role: staffRole,
				message: `Отказ в изменении заключения снимка (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { id } = request.params as { id: string };
		const parsed = updateXrayScanSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			reply.code(400);
			return {
				error: "XrayScanValidationError",
				message: "Неверный формат запроса сохранения заключения.",
			};
		}

		const patch = parsed.data;
		if (
			patch.aiReport === undefined &&
			patch.aiSummary === undefined &&
			patch.aiToothStates === undefined &&
			patch.notes === undefined &&
			patch.status === undefined &&
			patch.toothCode === undefined
		) {
			reply.code(400);
			return {
				error: "XrayScanValidationError",
				message: "Нет полей для обновления.",
			};
		}

		const updateData: {
			aiReport?: string | null;
			aiSummary?: string | null;
			aiToothStates?: Record<string, string> | null;
			notes?: string | null;
			status?: string;
			toothCode?: string | null;
			updatedAt: Date;
		} = { updatedAt: new Date() };
		if (patch.aiReport !== undefined) updateData.aiReport = patch.aiReport;
		if (patch.aiSummary !== undefined) updateData.aiSummary = patch.aiSummary;
		if (patch.aiToothStates !== undefined)
			updateData.aiToothStates = patch.aiToothStates;
		if (patch.notes !== undefined) updateData.notes = patch.notes;
		if (patch.status !== undefined) updateData.status = patch.status;
		if (patch.toothCode !== undefined) updateData.toothCode = patch.toothCode;

		const [updated] = await db
			.update(xrayScans)
			.set(updateData)
			.where(
				and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)),
			)
			.returning();

		if (!updated) {
			reply.code(404);
			return { error: "XrayScanNotFound", message: "Снимок не найден." };
		}

		return scanToResponse(updated, false);
	});

	app.delete("/api/xray/scans/:id", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(request, reply, "delete xray scan"))
		)
			return;

		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		// 152-ФЗ / 323-ФЗ: Безвозвратное удаление рентген-снимков разрешено ТОЛЬКО главному врачу или владельцу клиники
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const allowedDeleteRoles = new Set([
			"chief_doctor",
			"chiefdoctor",
			"head_doctor",
			"owner",
		]);
		if (!staffRole || !allowedDeleteRoles.has(staffRole)) {
			reply.code(403);
			return {
				error: "PermissionDenied",
				permission: "xray.delete",
				role: staffRole,
				message:
					"Безвозвратное удаление рентгенологических снимков разрешено исключительно главному врачу (chief_doctor) или владельцу клиники (owner).",
			};
		}

		const { id } = request.params as { id: string };

		const [deleted] = await db
			.delete(xrayScans)
			.where(
				and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)),
			)
			.returning({ id: xrayScans.id, storagePath: xrayScans.storagePath });

		if (!deleted) {
			reply.code(404);
			return { error: "XrayScanNotFound", message: "Снимок не найден." };
		}

		if (deleted.storagePath && existsSync(deleted.storagePath)) {
			try {
				await fs.unlink(deleted.storagePath);
			} catch (unlinkErr) {
				request.log.warn(
					{ unlinkErr, path: deleted.storagePath },
					"Не удалось физически удалить файл снимка с диска при удалении скана",
				);
			}
		}

		/*
		 * 204 остаётся на `reply.send()` и переводу не подлежит: у ответа без
		 * содержимого тела нет, а возврат значения его бы туда положил (fastify
		 * #5003 — возвращённый null при 204 давал content-length: 4). Записи здесь
		 * уже нет: DELETE выполнен выше, читать после него нечего.
		 */
		return reply.code(204).send();
	});
}

