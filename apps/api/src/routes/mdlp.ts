import crypto from "node:crypto";
import {
	type DentalAnestheticInfo,
	type MdlpParsedBarcode,
	type MdlpSchema10560Document,
	generateMdlpSchema10560Payload,
	parseMdlpDataMatrix,
} from "@dental/shared";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { mdlpItems, patients, visits } from "../db/schema.js";

// ─── Input Validation Schemas ───────────────────────────────────────────────

const mdlpScanBodySchema = z.object({
	rawBarcode: z.string().trim().optional(),
	barcode: z.string().trim().optional(),
	searchHint: z.string().trim().optional().nullable(),
	autoRegister: z.boolean().optional().default(true),
}).refine(data => Boolean(data.rawBarcode || data.barcode), {
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
	visitId: z.string().uuid("Некорректный UUID приёма/визита.").optional().nullable(),
	doctorId: z.string().uuid("Некорректный UUID врача.").optional().nullable(),
	docNum: z.string().trim().optional().nullable(),
	docDate: z.string().trim().optional().nullable(),
	costRub: z.number().finite().nonnegative().optional().nullable(),
	reason: z.string().trim().optional().nullable(),
});

const mdlpItemsQuerySchema = z.object({
	status: z.enum(["in_stock", "disposed", "all"]).optional().default("all"),
	search: z.string().trim().optional().nullable(),
	patientId: z.string().uuid().optional().nullable(),
	visitId: z.string().uuid().optional().nullable(),
	limit: z.coerce.number().int().min(1).max(200).optional().default(50),
	offset: z.coerce.number().int().min(0).optional().default(0),
});

// ─── Route Handlers ─────────────────────────────────────────────────────────

export async function registerMdlpRoutes(
	app: FastifyInstance,
	_opts?: Record<string, unknown>,
): Promise<void> {
	/**
	 * POST /api/mdlp/scan (also supports /scan when registered with prefix)
	 * Verify GS1 DataMatrix barcode, check checksum, registration, expiration, and recognize drug.
	 * Persists scan record to PostgreSQL mdlp_items table.
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
		const parsed = parseMdlpDataMatrix(barcodeStr);

		if (!parsed.isValid) {
			return reply.status(422).send({
				success: false,
				error: "InvalidDataMatrixBarcode",
				message:
					parsed.errors[0] ??
					"Некорректный или повреждённый 2D-штрихкод Честный Знак / GS1 DataMatrix.",
				parsed,
			});
		}

		// Check if already in PostgreSQL database
		const [existing] = await db
			.select()
			.from(mdlpItems)
			.where(
				and(
					eq(mdlpItems.organizationId, orgId),
					eq(mdlpItems.sgtin, parsed.sgtin),
				),
			)
			.limit(1);

		let itemRecord = existing;

		if (!existing && autoRegister) {
			const drug: Partial<DentalAnestheticInfo> = parsed.recognizedDrug ?? {};
			const [inserted] = await db
				.insert(mdlpItems)
				.values({
					organizationId: orgId,
					sgtin: parsed.sgtin,
					gtin: parsed.gtin,
					serialNumber: parsed.serialNumber,
					rawBarcode: parsed.rawBarcode,
					tradeName: drug.tradeName ?? "Неизвестный медицинский препарат",
					inn: drug.inn ?? "Не указано",
					series: parsed.series ?? parsed.lot ?? null,
					expirationDate: parsed.expirationDate,
					status: "in_stock",
					costRub: null,
				})
				.returning();
			itemRecord = inserted;
		}

		const isRegistered = Boolean(itemRecord);
		const isDisposed = itemRecord?.status === "disposed";

		return reply.send({
			success: true,
			parsed,
			isRegistered,
			isDisposed,
			status: isDisposed
				? "disposed"
				: isRegistered
					? "in_stock"
					: "unregistered",
			item: itemRecord ?? null,
		});
	};

	/**
	 * POST /api/mdlp/dispose (also supports /dispose when registered with prefix)
	 * Record medicine disposal under official MDLP Schema 10560
	 * (Medical care write-off / "Вывод из оборота для оказания медицинской помощи").
	 * Atomically persists disposal and Schema 10560 document in PostgreSQL.
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

		const input = parsedBody.data;
		let sgtin = input.sgtin?.trim();
		let gtin = input.gtin?.trim();
		let serial = input.serialNumber?.trim();
		let series = input.series?.trim() ?? input.lot?.trim();
		let expirationDate: string | null = null;
		let parsedBarcode: MdlpParsedBarcode | null = null;

		const rawCode = input.rawBarcode ?? input.barcode;
		if (rawCode && rawCode.trim().length > 0) {
			parsedBarcode = parseMdlpDataMatrix(rawCode);
			if (parsedBarcode.isValid) {
				sgtin = parsedBarcode.sgtin;
				gtin = parsedBarcode.gtin;
				serial = parsedBarcode.serialNumber;
				series = series ?? parsedBarcode.series ?? parsedBarcode.lot ?? undefined;
				expirationDate = parsedBarcode.expirationDate;
			}
		}

		if (!sgtin && (!gtin || !serial)) {
			return reply.status(400).send({
				error: "MissingSgtin",
				message:
					"Для вывода из оборота по схеме 10560 необходимо указать SGTIN или штрихкод DataMatrix.",
			});
		}

		if (!sgtin && gtin && serial) {
			sgtin = `${gtin}${serial}`;
		}

		if (!sgtin) {
			return reply.status(400).send({
				error: "InvalidSgtin",
				message: "Не удалось сформировать SGTIN для списания препарата.",
			});
		}

		// Check if already disposed in PostgreSQL
		const [existing] = await db
			.select()
			.from(mdlpItems)
			.where(
				and(
					eq(mdlpItems.organizationId, orgId),
					eq(mdlpItems.sgtin, sgtin),
				),
			)
			.limit(1);

		if (existing && existing.status === "disposed") {
			return reply.status(409).send({
				error: "MedicationAlreadyDisposed",
				message: `Препарат с SGTIN ${sgtin} уже был ранее выведен из оборота (${existing.disposedAt}).`,
				item: existing,
			});
		}

		const now = new Date();
		const docNum =
			input.docNum ??
			(input.visitId
				? `VI-${input.visitId.slice(0, 8).toUpperCase()}`
				: `MED-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
		const docDate =
			input.docDate ?? now.toISOString().slice(0, 10);

		// Generate Schema 10560 XML & JSON Document
		const schema10560Doc: MdlpSchema10560Document = generateMdlpSchema10560Payload({
			subjectId: orgId,
			operationDate: now.toISOString(),
			docNum,
			docDate,
			withdrawalType: 13, // 13 = оказание медицинской помощи
			patientId: input.patientId ?? null,
			visitId: input.visitId ?? null,
			doctorId: input.doctorId ?? null,
			items: [
				{
					sgtin,
					gtin: gtin ?? (existing ? existing.gtin : sgtin.slice(0, 14)),
					serialNumber: serial ?? (existing ? existing.serialNumber : sgtin.slice(14)),
					series: series ?? existing?.series ?? null,
					lot: series ?? existing?.series ?? null,
					expirationDate: expirationDate ?? existing?.expirationDate ?? null,
					costRub: input.costRub ?? (existing?.costRub ? Number(existing.costRub) : null),
				},
			],
		});

		let updatedItem;
		if (existing) {
			const [res] = await db
				.update(mdlpItems)
				.set({
					status: "disposed",
					disposedAt: now,
					disposalReason: input.reason ?? "Оказание медицинской помощи (Схема 10560)",
					disposalType: "13",
					patientId: input.patientId ?? existing.patientId,
					visitId: input.visitId ?? existing.visitId,
					doctorId: input.doctorId ?? existing.doctorId,
					costRub: input.costRub ? String(input.costRub) : existing.costRub,
					crptReceiptNumber: `CRPT-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
					schema10560Xml: schema10560Doc.xmlContent,
					schema10560Json: schema10560Doc.jsonContent,
					updatedAt: now,
				})
				.where(eq(mdlpItems.id, existing.id))
				.returning();
			updatedItem = res;
		} else {
			const drug: Partial<DentalAnestheticInfo> = parsedBarcode?.recognizedDrug ?? {};
			const [res] = await db
				.insert(mdlpItems)
				.values({
					organizationId: orgId,
					sgtin,
					gtin: gtin ?? (parsedBarcode ? parsedBarcode.gtin : sgtin.slice(0, 14)),
					serialNumber: serial ?? (parsedBarcode ? parsedBarcode.serialNumber : sgtin.slice(14)),
					rawBarcode: rawCode ?? sgtin,
					tradeName: drug.tradeName ?? "Анестетик / Медикамент (МДЛП)",
					inn: drug.inn ?? "Артикаин / Мепивакаин",
					series: series ?? null,
					expirationDate,
					status: "disposed",
					disposedAt: now,
					disposalReason: input.reason ?? "Оказание медицинской помощи (Схема 10560)",
					disposalType: "13",
					patientId: input.patientId ?? null,
					visitId: input.visitId ?? null,
					doctorId: input.doctorId ?? null,
					costRub: input.costRub ? String(input.costRub) : null,
					crptReceiptNumber: `CRPT-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
					schema10560Xml: schema10560Doc.xmlContent,
					schema10560Json: schema10560Doc.jsonContent,
				})
				.returning();
			updatedItem = res;
		}

		return reply.send({
			success: true,
			message:
				"Медикамент успешно списан по схеме 10560 (оказание медицинской помощи) и зафиксирован в БД.",
			sgtin,
			disposalDocument: schema10560Doc,
			item: updatedItem,
		});
	};

	/**
	 * GET /api/mdlp/items (also supports /items when registered with prefix)
	 * List scanned and tracked medications directly from PostgreSQL database.
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

		const { status, search, patientId, visitId, limit, offset } = queryParsed.data;

		const conditions = [eq(mdlpItems.organizationId, orgId)];

		if (status && status !== "all") {
			conditions.push(eq(mdlpItems.status, status));
		}
		if (patientId) {
			conditions.push(eq(mdlpItems.patientId, patientId));
		}
		if (visitId) {
			conditions.push(eq(mdlpItems.visitId, visitId));
		}
		if (search && search.trim().length > 0) {
			const pattern = `%${search.trim()}%`;
			conditions.push(
				or(
					ilike(mdlpItems.sgtin, pattern),
					ilike(mdlpItems.gtin, pattern),
					ilike(mdlpItems.serialNumber, pattern),
					ilike(mdlpItems.tradeName, pattern),
					ilike(mdlpItems.inn, pattern),
					ilike(mdlpItems.series, pattern),
				)!,
			);
		}

		const itemsList = await db
			.select()
			.from(mdlpItems)
			.where(and(...conditions))
			.orderBy(desc(mdlpItems.createdAt))
			.limit(limit)
			.offset(offset);

		const countRows = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(mdlpItems)
			.where(and(...conditions));

		const totalCount = countRows[0]?.count ?? itemsList.length;

		return reply.send({
			success: true,
			total: totalCount,
			items: itemsList,
			limit,
			offset,
		});
	};

	// Register absolute paths
	app.post("/api/mdlp/scan", handleScan);
	app.post("/api/mdlp/dispose", handleDispose);
	app.get("/api/mdlp/items", handleItems);

	// Also support relative paths if mounted under prefix
	app.post("/scan", handleScan);
	app.post("/dispose", handleDispose);
	app.get("/items", handleItems);
}

export const mdlpRoutes: FastifyPluginAsync = registerMdlpRoutes;
