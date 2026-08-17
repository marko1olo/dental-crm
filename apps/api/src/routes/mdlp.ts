import crypto from "node:crypto";
import {
	type DentalAnestheticInfo,
	type MdlpParsedBarcode,
	type MdlpSchema10560Document,
	generateMdlpSchema10560Payload,
	parseMdlpDataMatrix,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { patients, visits } from "../db/schema.js";

// ─── Data Types & State ─────────────────────────────────────────────────────

export interface MdlpItemRecord {
	id: string;
	organizationId: string;
	sgtin: string;
	gtin: string;
	serialNumber: string;
	cryptoKey: string;
	cryptoSignature: string;
	rawBarcode: string;
	tradeName: string;
	tradeNameLatin: string;
	inn: string;
	innLatin: string;
	activeSubstance: string;
	concentrationPct: number;
	vasoconstrictor: string;
	carpuleVolumeMl: number;
	manufacturer: string;
	atxCode: string;
	series: string | null;
	lot: string | null;
	expirationDate: string | null;
	isExpired: boolean;
	status: "in_stock" | "disposed";
	scannedAt: string;
	disposedAt: string | null;
	patientId: string | null;
	patientName: string | null;
	visitId: string | null;
	doctorId: string | null;
	docNum: string | null;
	docDate: string | null;
	schema10560Xml: string | null;
	schema10560Json: Record<string, unknown> | null;
	costRub: number | null;
	notes: string | null;
}

// In-memory tenant store partitioned by organizationId
const mdlpStoreByOrg = new Map<string, Map<string, MdlpItemRecord>>();

function getOrgLedger(organizationId: string): Map<string, MdlpItemRecord> {
	let ledger = mdlpStoreByOrg.get(organizationId);
	if (!ledger) {
		ledger = new Map<string, MdlpItemRecord>();
		mdlpStoreByOrg.set(organizationId, ledger);
	}
	return ledger;
}

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

// ─── Helper Functions ───────────────────────────────────────────────────────

function createItemRecordFromParsed(
	orgId: string,
	parsed: MdlpParsedBarcode,
	notes?: string | null,
): MdlpItemRecord {
	const now = new Date().toISOString();
	const drug: Partial<DentalAnestheticInfo> = parsed.recognizedDrug ?? {};

	return {
		id: crypto.randomUUID(),
		organizationId: orgId,
		sgtin: parsed.sgtin,
		gtin: parsed.gtin,
		serialNumber: parsed.serialNumber,
		cryptoKey: parsed.cryptoKey,
		cryptoSignature: parsed.cryptoSignature,
		rawBarcode: parsed.rawBarcode,
		tradeName: drug.tradeName ?? "Неизвестный медицинский препарат",
		tradeNameLatin: drug.tradeNameLatin ?? "Unknown medication",
		inn: drug.inn ?? "Не указано",
		innLatin: drug.innLatin ?? "Not specified",
		activeSubstance: drug.activeSubstance ?? "Не указано",
		concentrationPct: drug.concentrationPct ?? 0,
		vasoconstrictor: drug.vasoconstrictor ?? "none",
		carpuleVolumeMl: drug.carpuleVolumeMl ?? 1.7,
		manufacturer: drug.manufacturer ?? "Не указан",
		atxCode: drug.atxCode ?? "N01BB",
		series: parsed.series,
		lot: parsed.lot,
		expirationDate: parsed.expirationDate,
		isExpired: parsed.isExpired,
		status: "in_stock",
		scannedAt: now,
		disposedAt: null,
		patientId: null,
		patientName: null,
		visitId: null,
		doctorId: null,
		docNum: null,
		docDate: null,
		schema10560Xml: null,
		schema10560Json: null,
		costRub: null,
		notes: notes ?? null,
	};
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

export async function registerMdlpRoutes(
	app: FastifyInstance,
	_opts?: Record<string, unknown>,
): Promise<void> {
	/**
	 * POST /api/mdlp/scan (also supports /scan when registered with prefix)
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
		const { searchHint, autoRegister } = parsedBody.data;
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

		const ledger = getOrgLedger(orgId);
		let existing = ledger.get(parsed.sgtin);

		if (!existing && autoRegister) {
			existing = createItemRecordFromParsed(orgId, parsed);
			ledger.set(parsed.sgtin, existing);
		}

		const isRegistered = Boolean(existing);
		const isDisposed = existing?.status === "disposed";

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
			item: existing ?? null,
		});
	};

	/**
	 * POST /api/mdlp/dispose (also supports /dispose when registered with prefix)
	 * Record medicine disposal under official MDLP Schema 10560
	 * (Medical care write-off / "Вывод из оборота для оказания медицинской помощи").
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

		// 2. Check if already disposed
		const ledger = getOrgLedger(orgId);
		let item = ledger.get(sgtin);

		if (item && item.status === "disposed") {
			return reply.status(409).send({
				error: "MedicationAlreadyDisposed",
				message: `Препарат с SGTIN ${sgtin} уже был ранее выведен из оборота (${item.disposedAt}).`,
				item,
			});
		}

		// 3. Resolve Patient and Visit Details
		let patientName: string | null = null;
		if (input.patientId) {
			const [patientRow] = await db
				.select({
					fullName: patients.fullName,
				})
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, orgId),
						eq(patients.id, input.patientId),
					),
				)
				.limit(1);

			if (patientRow) {
				patientName = patientRow.fullName;
			}
		}

		const now = new Date();
		const docNum =
			input.docNum ??
			(input.visitId
				? `VI-${input.visitId.slice(0, 8).toUpperCase()}`
				: `MED-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
		const docDate =
			input.docDate ?? now.toISOString().slice(0, 10);

		// 4. Generate Schema 10560 XML & JSON Document
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
					gtin: gtin ?? (item ? item.gtin : sgtin.slice(0, 14)),
					serialNumber: serial ?? (item ? item.serialNumber : sgtin.slice(14)),
					series: series ?? item?.series ?? null,
					lot: series ?? item?.lot ?? null,
					expirationDate: expirationDate ?? item?.expirationDate ?? null,
					costRub: input.costRub ?? item?.costRub ?? null,
				},
			],
		});

		// 5. Update or Register item in Ledger
		if (!item) {
			if (parsedBarcode && parsedBarcode.isValid) {
				item = createItemRecordFromParsed(orgId, parsedBarcode, input.reason);
			} else {
				item = {
					id: crypto.randomUUID(),
					organizationId: orgId,
					sgtin,
					gtin: gtin ?? sgtin.slice(0, 14),
					serialNumber: serial ?? sgtin.slice(14),
					cryptoKey: "",
					cryptoSignature: "",
					rawBarcode: rawCode ?? sgtin,
					tradeName: "Анестетик / Медикамент (МДЛП)",
					tradeNameLatin: "Medication (MDLP)",
					inn: "Артикаин / Мепивакаин",
					innLatin: "Articaine / Mepivacaine",
					activeSubstance: "Раствор для инъекций",
					concentrationPct: 4.0,
					vasoconstrictor: "1:100000",
					carpuleVolumeMl: 1.7,
					manufacturer: "Фармацевтический производитель",
					atxCode: "N01BB",
					series: series ?? null,
					lot: series ?? null,
					expirationDate,
					isExpired: false,
					status: "in_stock",
					scannedAt: now.toISOString(),
					disposedAt: null,
					patientId: null,
					patientName: null,
					visitId: null,
					doctorId: null,
					docNum: null,
					docDate: null,
					schema10560Xml: null,
					schema10560Json: null,
					costRub: input.costRub ?? null,
					notes: input.reason ?? null,
				};
			}
		}

		item.status = "disposed";
		item.disposedAt = now.toISOString();
		item.patientId = input.patientId ?? item.patientId;
		item.patientName = patientName ?? item.patientName;
		item.visitId = input.visitId ?? item.visitId;
		item.doctorId = input.doctorId ?? item.doctorId;
		item.docNum = docNum;
		item.docDate = docDate;
		item.schema10560Xml = schema10560Doc.xmlContent;
		item.schema10560Json = schema10560Doc.jsonContent;
		item.costRub = input.costRub ?? item.costRub;
		item.notes = input.reason ?? item.notes;

		ledger.set(sgtin, item);

		return reply.send({
			success: true,
			message:
				"Медикамент успешно списан по схеме 10560 (оказание медицинской помощи).",
			sgtin,
			disposalDocument: schema10560Doc,
			item,
		});
	};

	/**
	 * GET /api/mdlp/items (also supports /items when registered with prefix)
	 * List scanned and tracked medications for the clinic with status, SGTIN, expiration and disposal info.
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
		const ledger = getOrgLedger(orgId);
		let list = Array.from(ledger.values());

		// Filter by status
		if (status && status !== "all") {
			list = list.filter((it) => it.status === status);
		}

		// Filter by patientId
		if (patientId) {
			list = list.filter((it) => it.patientId === patientId);
		}

		// Filter by visitId
		if (visitId) {
			list = list.filter((it) => it.visitId === visitId);
		}

		// Search query filter
		if (search && search.length > 0) {
			const q = search.toLowerCase();
			list = list.filter((it) => {
				return (
					it.sgtin.toLowerCase().includes(q) ||
					it.gtin.toLowerCase().includes(q) ||
					it.serialNumber.toLowerCase().includes(q) ||
					it.tradeName.toLowerCase().includes(q) ||
					it.inn.toLowerCase().includes(q) ||
					(it.series && it.series.toLowerCase().includes(q)) ||
					(it.lot && it.lot.toLowerCase().includes(q)) ||
					(it.patientName && it.patientName.toLowerCase().includes(q)) ||
					(it.docNum && it.docNum.toLowerCase().includes(q))
				);
			});
		}

		// Sort by scannedAt desc
		list.sort((a, b) => {
			return new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime();
		});

		const total = list.length;
		const paginated = list.slice(offset, offset + limit);

		return reply.send({
			success: true,
			total,
			items: paginated,
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
