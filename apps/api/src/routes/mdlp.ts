import { getAllAnesthetics } from "@dental/shared";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { mdlpDisposalService, mdlpQueueService } from "../services/mdlp/index.js";

// ─── Input Validation Schemas ───────────────────────────────────────────────

const mdlpScanBodySchema = z.object({
	rawBarcode: z.string().trim().optional(),
	barcode: z.string().trim().optional(),
	searchHint: z.string().trim().optional().nullable(),
	autoRegister: z.boolean().optional().default(true),
}).refine((data) => Boolean(data.rawBarcode || data.barcode), {
	message: "Строка штрихкода DataMatrix (rawBarcode или barcode) обязательна для сканирования.",
});

const mdlpDisposeBodySchema = z.object({
	sgtin: z.string().trim().optional().nullable(),
	rawBarcode: z.string().trim().optional().nullable(),
	barcode: z.string().trim().optional().nullable(),
	gtin: z.string().trim().optional().nullable(),
	serialNumber: z.string().trim().optional().nullable(),
	series: z.string().trim().optional().nullable(),
	lot: z.string().trim().optional().nullable(),
	patientId: z.string().uuid("Некорректный UUID пациента.").optional().nullable(),
	patientName: z.string().trim().optional().nullable(),
	visitId: z.string().uuid("Некорректный UUID приёма/визита.").optional().nullable(),
	doctorId: z.string().uuid("Некорректный UUID врача.").optional().nullable(),
	doctorName: z.string().trim().optional().nullable(),
	docNum: z.string().trim().optional().nullable(),
	docDate: z.string().trim().optional().nullable(),
	costRub: z.number().finite().nonnegative().optional().nullable(),
	reason: z.string().trim().optional().nullable(),
});

const mdlpBatchDisposeBodySchema = z.object({
	docNum: z.string().trim().optional().nullable(),
	docDate: z.string().trim().optional().nullable(),
	patientId: z.string().uuid().optional().nullable(),
	patientName: z.string().trim().optional().nullable(),
	visitId: z.string().uuid().optional().nullable(),
	doctorId: z.string().uuid().optional().nullable(),
	doctorName: z.string().trim().optional().nullable(),
	reason: z.string().trim().optional().nullable(),
	useQueue: z.boolean().optional().default(false),
	items: z.array(mdlpDisposeBodySchema).optional(),
});

const mdlpQueueAddBodySchema = z.object({
	rawBarcode: z.string().trim().min(1, "Штрихкод DataMatrix обязателен."),
	costRub: z.number().finite().nonnegative().optional().nullable(),
	patientId: z.string().uuid().optional().nullable(),
	patientName: z.string().trim().optional().nullable(),
	visitId: z.string().uuid().optional().nullable(),
	doctorId: z.string().uuid().optional().nullable(),
	doctorName: z.string().trim().optional().nullable(),
	cabinetId: z.string().trim().optional().nullable(),
});

const mdlpQueueRemoveBodySchema = z.object({
	itemId: z.string().trim().min(1, "Идентификатор позиции в очереди обязателен."),
});

const mdlpActGenerateBodySchema = z.object({
	actNumber: z.string().trim().optional(),
	actDate: z.string().trim().optional(),
	organizationName: z.string().trim().optional(),
	organizationInn: z.string().trim().optional(),
	organizationAddress: z.string().trim().optional(),
	departmentName: z.string().trim().optional(),
	cabinetName: z.string().trim().optional(),
	seniorNurseName: z.string().trim().optional(),
	chiefDoctorName: z.string().trim().optional(),
	dentistName: z.string().trim().optional(),
	crptReceiptNumber: z.string().trim().optional(),
	notes: z.string().trim().optional(),
	useQueue: z.boolean().optional().default(true),
	items: z.array(z.any()).optional(),
});

const mdlpItemsQuerySchema = z.object({
	status: z.enum(["in_stock", "disposed", "all"]).optional().default("all"),
	search: z.string().trim().optional().nullable(),
	patientId: z.string().uuid().optional().nullable(),
	visitId: z.string().uuid().optional().nullable(),
	limit: z.coerce.number().int().min(1).max(200).optional().default(50),
	offset: z.coerce.number().int().min(0).optional().default(0),
});

// ─── Route Registration ─────────────────────────────────────────────────────

export async function registerMdlpRoutes(
	app: FastifyInstance,
	_opts?: Record<string, unknown>,
): Promise<void> {
	/**
	 * POST /api/mdlp/scan
	 * Verify GS1 DataMatrix barcode, check checksum, registration, expiration, and recognize drug.
	 */
	const handleScan = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"mdlp barcode scan",
		);
		if (!orgId) return;

		const parsedBody = mdlpScanBodySchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры сканирования DataMatrix",
				details: parsedBody.error.format(),
			});
		}

		const barcodeStr = parsedBody.data.rawBarcode ?? parsedBody.data.barcode ?? "";
		const { autoRegister } = parsedBody.data;

		try {
			const result = await mdlpDisposalService.scanBarcode(orgId, barcodeStr, autoRegister);
			return reply.send({
				success: true,
				parsed: result.parsed,
				isRegistered: result.isRegistered,
				isDisposed: result.isDisposed,
				status: result.status,
				item: result.item,
			});
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка валидации DataMatrix";
			return reply.status(422).send({
				success: false,
				error: "InvalidDataMatrixBarcode",
				message,
			});
		}
	};

	/**
	 * POST /api/mdlp/dispose
	 * Record single medicine disposal under official MDLP Schema 10560.
	 */
	const handleDispose = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"mdlp medication disposal",
		);
		if (!orgId) return;

		const parsedBody = mdlpDisposeBodySchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные данные для списания медикамента по схеме 10560.",
				details: parsedBody.error.format(),
			});
		}

		try {
			const result = await mdlpDisposalService.disposeSingle(orgId, parsedBody.data);
			return reply.send({
				success: true,
				message: result.message,
				sgtin: parsedBody.data.sgtin ?? result.schema10560Document.items[0]?.sgtin,
				disposalDocument: result.schema10560Document,
				item: result.items[0] ?? null,
				crptReceiptNumber: result.crptReceiptNumber,
			});
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка списания по схеме 10560";
			return reply.status(400).send({
				error: "DisposalError",
				message,
			});
		}
	};

	/**
	 * POST /api/mdlp/dispose-batch
	 * Batch write-off under Schema 10560 (from explicit array or from current queue).
	 */
	const handleDisposeBatch = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"mdlp batch medication disposal",
		);
		if (!orgId) return;

		const parsedBody = mdlpBatchDisposeBodySchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры группового списания по схеме 10560.",
				details: parsedBody.error.format(),
			});
		}

		try {
			const result = await mdlpDisposalService.disposeBatch(orgId, parsedBody.data);
			return reply.send({
				success: true,
				message: result.message,
				disposedCount: result.disposedCount,
				disposalDocument: result.schema10560Document,
				items: result.items,
				crptReceiptNumber: result.crptReceiptNumber,
			});
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка пакетного списания";
			return reply.status(400).send({
				error: "BatchDisposalError",
				message,
			});
		}
	};

	/**
	 * GET /api/mdlp/queue
	 * Get current carpule disposal queue for organization.
	 */
	const handleGetQueue = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "mdlp get queue");
		if (!orgId) return;

		const result = mdlpQueueService.getQueue(orgId);
		return reply.send({
			success: true,
			...result,
		});
	};

	/**
	 * POST /api/mdlp/queue/add
	 * Add scanned carpule to queue.
	 */
	const handleQueueAdd = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "mdlp queue add");
		if (!orgId) return;

		const parsedBody = mdlpQueueAddBodySchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры добавления в очередь.",
				details: parsedBody.error.format(),
			});
		}

		const result = mdlpQueueService.addToQueue(orgId, parsedBody.data);
		return reply.send(result);
	};

	/**
	 * POST /api/mdlp/queue/remove
	 * Remove carpule from queue.
	 */
	const handleQueueRemove = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "mdlp queue remove");
		if (!orgId) return;

		const parsedBody = mdlpQueueRemoveBodySchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры удаления из очереди.",
			});
		}

		const result = mdlpQueueService.removeFromQueue(orgId, parsedBody.data.itemId);
		return reply.send(result);
	};

	/**
	 * POST /api/mdlp/queue/clear
	 * Clear entire queue for organization.
	 */
	const handleQueueClear = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "mdlp queue clear");
		if (!orgId) return;

		const result = mdlpQueueService.clearQueue(orgId);
		return reply.send(result);
	};

	/**
	 * GET /api/mdlp/catalog/anesthetics
	 * Returns full dental anesthetics catalog.
	 */
	const handleGetAnestheticsCatalog = async (_request: FastifyRequest, reply: FastifyReply) => {
		return reply.send({
			success: true,
			catalog: getAllAnesthetics(),
		});
	};

	/**
	 * POST /api/mdlp/disposal-act
	 * Generates printable Senior Nurse Medication Disposal Act HTML & structured data.
	 */
	const handleGenerateAct = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "mdlp generate act");
		if (!orgId) return;

		const parsedBody = mdlpActGenerateBodySchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры акта списания.",
				details: parsedBody.error.format(),
			});
		}

		const result = mdlpDisposalService.generateDisposalAct(orgId, parsedBody.data);
		return reply.send({
			success: true,
			actData: result.actData,
			html: result.html,
		});
	};

	/**
	 * GET /api/mdlp/items
	 * List scanned and tracked medications from database.
	 */
	const handleItems = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"mdlp items list",
		);
		if (!orgId) return;

		const queryParsed = mdlpItemsQuerySchema.safeParse(request.query);
		if (!queryParsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры фильтрации списка медикаментов.",
				details: queryParsed.error.format(),
			});
		}

		const { total, items } = await mdlpDisposalService.listItems(orgId, queryParsed.data);
		return reply.send({
			success: true,
			total,
			items,
			limit: queryParsed.data.limit,
			offset: queryParsed.data.offset,
		});
	};

	// Register absolute paths
	app.post("/api/mdlp/scan", handleScan);
	app.post("/api/mdlp/dispose", handleDispose);
	app.post("/api/mdlp/dispose-batch", handleDisposeBatch);
	app.get("/api/mdlp/queue", handleGetQueue);
	app.post("/api/mdlp/queue/add", handleQueueAdd);
	app.post("/api/mdlp/queue/remove", handleQueueRemove);
	app.post("/api/mdlp/queue/clear", handleQueueClear);
	app.get("/api/mdlp/catalog/anesthetics", handleGetAnestheticsCatalog);
	app.post("/api/mdlp/disposal-act", handleGenerateAct);
	app.get("/api/mdlp/items", handleItems);

	// Also support relative paths if mounted under prefix
	app.post("/scan", handleScan);
	app.post("/dispose", handleDispose);
	app.post("/dispose-batch", handleDisposeBatch);
	app.get("/queue", handleGetQueue);
	app.post("/queue/add", handleQueueAdd);
	app.post("/queue/remove", handleQueueRemove);
	app.post("/queue/clear", handleQueueClear);
	app.get("/catalog/anesthetics", handleGetAnestheticsCatalog);
	app.post("/disposal-act", handleGenerateAct);
	app.get("/items", handleItems);
}

export const mdlpRoutes: FastifyPluginAsync = registerMdlpRoutes;
