import crypto from "node:crypto";
import {
	type DentalAnestheticInfo,
	type MdlpCarpuleQueueItem,
	type MdlpDisposalItem,
	type MdlpDisposalParams,
	type MdlpParsedBarcode,
	type MdlpSchema10560Document,
	type SeniorNurseDisposalActData,
	formatSeniorNurseDisposalActData,
	generateMdlpSchema10560Payload,
	generateSeniorNurseDisposalActHtml,
	parseMdlpDataMatrix,
} from "@dental/shared";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { mdlpItems } from "../../db/schema.js";
import { inventoryItems } from "../../db/schema/inventory.js";
import { fefoStockService } from "../inventory/fefoStockService.js";
import { mdlpQueueService } from "./MdlpQueueService.js";

// In-memory fallback ledger for test isolation and offline resilience
const fallbackMdlpStore = new Map<string, Map<string, Record<string, unknown>>>();

function getFallbackOrgLedger(orgId: string): Map<string, Record<string, unknown>> {
	let ledger = fallbackMdlpStore.get(orgId);
	if (!ledger) {
		ledger = new Map();
		fallbackMdlpStore.set(orgId, ledger);
	}
	return ledger;
}

export interface MdlpScanResult {
	parsed: MdlpParsedBarcode;
	isRegistered: boolean;
	isDisposed: boolean;
	status: "in_stock" | "disposed" | "unregistered";
	item: Record<string, unknown> | null;
}

export interface MdlpSingleDisposeInput {
	rawBarcode?: string | null | undefined;
	barcode?: string | null | undefined;
	sgtin?: string | null | undefined;
	gtin?: string | null | undefined;
	serialNumber?: string | null | undefined;
	series?: string | null | undefined;
	lot?: string | null | undefined;
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	visitId?: string | null | undefined;
	doctorId?: string | null | undefined;
	doctorName?: string | null | undefined;
	docNum?: string | null | undefined;
	docDate?: string | null | undefined;
	costRub?: number | null | undefined;
	reason?: string | null | undefined;
	tradeName?: string | null | undefined;
	inn?: string | null | undefined;
	crptReceiptNumber?: string | null | undefined;
	warehouseId?: string | null | undefined;
}

export interface MdlpBatchDisposeInput {
	warehouseId?: string | null | undefined;
	docNum?: string | null | undefined;
	docDate?: string | null | undefined;
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	visitId?: string | null | undefined;
	doctorId?: string | null | undefined;
	doctorName?: string | null | undefined;
	reason?: string | null | undefined;
	items?: MdlpSingleDisposeInput[] | undefined;
	useQueue?: boolean | undefined;
	crptReceiptNumber?: string | null | undefined;
}

export interface MdlpDisposeResult {
	success: boolean;
	message: string;
	disposedCount: number;
	schema10560Document: MdlpSchema10560Document;
	items: Record<string, unknown>[];
	crptReceiptNumber?: string | null | undefined;
}

export interface MdlpActGenerateInput {
	actNumber?: string | undefined;
	actDate?: string | undefined;
	organizationName?: string | undefined;
	organizationInn?: string | undefined;
	organizationAddress?: string | undefined;
	departmentName?: string | undefined;
	cabinetName?: string | undefined;
	seniorNurseName?: string | undefined;
	chiefDoctorName?: string | undefined;
	dentistName?: string | undefined;
	approverRole?: "senior_nurse" | "doctor" | "administrator" | "authorized_staff" | undefined;
	approverName?: string | undefined;
	approvedByFullName?: string | undefined;
	approvedByPositionRu?: string | undefined;
	paperJournalAcknowledged?: boolean | undefined;
	crptReceiptNumber?: string | undefined;
	notes?: string | undefined;
	items?: MdlpCarpuleQueueItem[] | undefined;
	useQueue?: boolean | undefined;
}

export class MdlpDisposalService {
	/**
	 * Scans and verifies a GS1 DataMatrix barcode, checking checksum,
	 * expiration date, catalog lookup, and registering in DB if required.
	 */
	public async scanBarcode(
		orgId: string,
		barcodeStr: string,
		autoRegister = true,
	): Promise<MdlpScanResult> {
		const parsed = parseMdlpDataMatrix(barcodeStr);
		if (!parsed.isValid) {
			throw new Error(
				parsed.errors[0] ??
					"Некорректный или повреждённый 2D-штрихкод Честный Знак / GS1 DataMatrix.",
			);
		}

		let itemRecord: Record<string, unknown> | null = null;
		const fallbackLedger = getFallbackOrgLedger(orgId);

		try {
			// Query PostgreSQL database
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

			if (existing) {
				itemRecord = existing as Record<string, unknown>;
			} else if (autoRegister) {
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
				itemRecord = inserted as Record<string, unknown>;
			}
		} catch (_dbErr) {
			if (process.env.NODE_ENV === "production") {
				throw new Error(
					`[MDLP 10560 CRITICAL] Сбой регистрации маркировки в PostgreSQL: ${_dbErr instanceof Error ? _dbErr.message : String(_dbErr)}. В продакшене запрещен in-memory fallback.`,
				);
			}
			// Fallback in-memory ledger (только для автономных unit-тестов)
			let existing = fallbackLedger.get(parsed.sgtin);
			if (!existing && autoRegister) {
				const drug: Partial<DentalAnestheticInfo> = parsed.recognizedDrug ?? {};
				existing = {
					id: crypto.randomUUID(),
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
					createdAt: new Date().toISOString(),
				};
				fallbackLedger.set(parsed.sgtin, existing);
			}
			itemRecord = existing ?? null;
		}

		const isRegistered = Boolean(itemRecord);
		const isDisposed = itemRecord?.status === "disposed";

		return {
			parsed,
			isRegistered,
			isDisposed,
			status: isDisposed
				? "disposed"
				: isRegistered
					? "in_stock"
					: "unregistered",
			item: itemRecord,
		};
	}

	/**
	 * Disposes a single medication under official MDLP Schema 10560.
	 */
	public async disposeSingle(
		orgId: string,
		input: MdlpSingleDisposeInput,
	): Promise<MdlpDisposeResult> {
		return this.disposeBatch(orgId, {
			docNum: input.docNum,
			docDate: input.docDate,
			patientId: input.patientId,
			patientName: input.patientName,
			visitId: input.visitId,
			doctorId: input.doctorId,
			doctorName: input.doctorName,
			reason: input.reason,
			items: [input],
		});
	}

	/**
	 * Disposes a batch of medications or current queue items under Schema 10560.
	 */
	public async disposeBatch(
		orgId: string,
		input: MdlpBatchDisposeInput,
	): Promise<MdlpDisposeResult> {
		const rawItems: MdlpSingleDisposeInput[] = [];

		if (input.useQueue) {
			const queue = mdlpQueueService.getQueue(orgId);
			if (queue.items.length === 0) {
				throw new Error("Очередь списания пуста.");
			}
			for (const q of queue.items) {
				rawItems.push({
					sgtin: q.sgtin,
					gtin: q.gtin,
					serialNumber: q.serialNumber,
					series: q.series,
					costRub: q.costRub,
					patientId: q.patientId ?? input.patientId,
					patientName: q.patientName ?? input.patientName,
					visitId: q.visitId ?? input.visitId,
					doctorId: q.doctorId ?? input.doctorId,
					doctorName: q.doctorName ?? input.doctorName,
				});
			}
		} else if (input.items && input.items.length > 0) {
			rawItems.push(...input.items);
		} else {
			throw new Error("Не указаны медикаменты для вывода из оборота.");
		}

		const disposalItems: MdlpDisposalItem[] = [];
		const fallbackLedger = getFallbackOrgLedger(orgId);

		for (const it of rawItems) {
			let sgtin = it.sgtin?.trim();
			let gtin = it.gtin?.trim();
			let serial = it.serialNumber?.trim();
			let series = it.series?.trim() ?? it.lot?.trim();
			let expirationDate: string | null = null;
			let parsedBarcode: MdlpParsedBarcode | null = null;

			const rawCode = it.rawBarcode ?? it.barcode;
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

			if (!sgtin && gtin && serial) {
				sgtin = `${gtin}${serial}`;
			}

			if (!sgtin) {
				throw new Error(
					"Для каждой позиции списания необходим корректный SGTIN или DataMatrix.",
				);
			}

			disposalItems.push({
				sgtin,
				gtin: gtin ?? sgtin.slice(0, 14),
				serialNumber: serial ?? sgtin.slice(14),
				series: series ?? null,
				lot: series ?? null,
				expirationDate: expirationDate ?? null,
				costRub: it.costRub ?? null,
				tradeName: it.tradeName ?? parsedBarcode?.recognizedDrug?.tradeName ?? null,
				inn: it.inn ?? parsedBarcode?.recognizedDrug?.inn ?? null,
			});
		}

		const now = new Date();
		const docNum =
			input.docNum ??
			(input.visitId
				? `VI-${input.visitId.slice(0, 8).toUpperCase()}`
				: `MED-${now.getFullYear()}-${now.getTime().toString(36).toUpperCase()}`);
		const docDate = input.docDate ?? now.toISOString().slice(0, 10);
		const crptReceiptNumber = input.crptReceiptNumber ?? null;

		// Generate official Schema 10560 XML & JSON payload
		const schemaDoc: MdlpSchema10560Document = generateMdlpSchema10560Payload({
			subjectId: orgId,
			operationDate: now.toISOString(),
			docNum,
			docDate,
			withdrawalType: 13,
			patientId: input.patientId ?? null,
			visitId: input.visitId ?? null,
			doctorId: input.doctorId ?? null,
			items: disposalItems,
			notes: input.reason ?? "Оказание медицинской помощи (Схема 10560)",
		});

		const updatedItems: Record<string, unknown>[] = [];

		// Persist each item in PostgreSQL and deduct from FEFO warehouse stock
		for (const it of disposalItems) {
			try {
				const warehouseId = input.warehouseId ?? null;
				let inventoryItemId: string | null = null;
				let batchId: string | null = null;
				let inventoryTransactionId: string | null = null;

				// Синхронное списание 1 единицы препарата со склада по FEFO при наличии в номенклатуре
				try {
					const [inv] = await db
						.select()
						.from(inventoryItems)
						.where(
							and(
								eq(inventoryItems.organizationId, orgId),
								or(
									eq(inventoryItems.barcode, it.gtin),
									eq(inventoryItems.barcode, it.sgtin),
									...(it.tradeName ? [ilike(inventoryItems.name, `%${it.tradeName}%`)] : []),
									...(it.inn ? [ilike(inventoryItems.name, `%${it.inn}%`)] : []),
								),
							),
						)
						.limit(1);

					if (inv) {
						inventoryItemId = inv.id;
						const fefoRes = await fefoStockService.deductFefo(db, {
							organizationId: orgId,
							inventoryItemId: inv.id,
							requiredQty: 1,
							warehouseId: warehouseId ?? undefined,
							visitId: input.visitId ?? undefined,
							userId: input.doctorId ?? undefined,
							allowOverdraft: true,
							transactionType: "write_off_mdlp",
							notes: `Выбытие МДЛП Схема 10560 (${it.sgtin})`,
						});

						if (fefoRes.batchesUsed.length > 0) {
							batchId = fefoRes.batchesUsed[0]!.batchId;
						}
					}
				} catch (stockErr) {
					console.warn(
						`[MdlpDisposalService] Предупреждение синхронизации склада для ${it.sgtin}:`,
						stockErr,
					);
				}

				const [existing] = await db
					.select()
					.from(mdlpItems)
					.where(
						and(
							eq(mdlpItems.organizationId, orgId),
							eq(mdlpItems.sgtin, it.sgtin),
						),
					)
					.limit(1);

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
							warehouseId: warehouseId ?? existing.warehouseId,
							inventoryItemId: inventoryItemId ?? existing.inventoryItemId,
							batchId: batchId ?? existing.batchId,
							inventoryTransactionId: inventoryTransactionId ?? existing.inventoryTransactionId,
							costRub: it.costRub ? String(it.costRub) : existing.costRub,
							crptReceiptNumber,
							schema10560Xml: schemaDoc.xmlContent,
							schema10560Json: schemaDoc.jsonContent,
							updatedAt: now,
						})
						.where(eq(mdlpItems.id, existing.id))
						.returning();
					if (res) updatedItems.push(res as Record<string, unknown>);
				} else {
					const [res] = await db
						.insert(mdlpItems)
						.values({
							organizationId: orgId,
							sgtin: it.sgtin,
							gtin: it.gtin,
							serialNumber: it.serialNumber,
							rawBarcode: it.sgtin,
							tradeName: it.tradeName ?? "Медицинский препарат (МДЛП)",
							inn: it.inn ?? null,
							series: it.series ?? null,
							expirationDate: it.expirationDate ?? null,
							status: "disposed",
							disposedAt: now,
							disposalReason: input.reason ?? "Оказание медицинской помощи (Схема 10560)",
							disposalType: "13",
							patientId: input.patientId ?? null,
							visitId: input.visitId ?? null,
							doctorId: input.doctorId ?? null,
							warehouseId,
							inventoryItemId,
							batchId,
							inventoryTransactionId,
							costRub: it.costRub ? String(it.costRub) : null,
							crptReceiptNumber,
							schema10560Xml: schemaDoc.xmlContent,
							schema10560Json: schemaDoc.jsonContent,
						})
						.returning();
					if (res) updatedItems.push(res as Record<string, unknown>);
				}
			} catch (_dbErr) {
				if (process.env.NODE_ENV === "production") {
					throw new Error(
						`[MDLP 10560 CRITICAL] Сбой записи списания медикамента в PostgreSQL: ${_dbErr instanceof Error ? _dbErr.message : String(_dbErr)}. В продакшене запрещен in-memory fallback.`,
					);
				}
				let item = fallbackLedger.get(it.sgtin);
				if (!item) {
					item = {
						id: crypto.randomUUID(),
						organizationId: orgId,
						sgtin: it.sgtin,
						gtin: it.gtin,
						serialNumber: it.serialNumber,
						rawBarcode: it.sgtin,
						tradeName: it.tradeName ?? "Анестетик / Медикамент (МДЛП)",
						inn: it.inn ?? "Артикаин / Мепивакаин",
						series: it.series ?? null,
						expirationDate: it.expirationDate ?? null,
						status: "in_stock",
						costRub: it.costRub ?? null,
						createdAt: now.toISOString(),
					};
				}

				item.status = "disposed";
				item.disposedAt = now.toISOString();
				item.patientId = input.patientId ?? item.patientId;
				item.visitId = input.visitId ?? item.visitId;
				item.doctorId = input.doctorId ?? item.doctorId;
				item.docNum = docNum;
				item.docDate = docDate;
				item.schema10560Xml = schemaDoc.xmlContent;
				item.schema10560Json = schemaDoc.jsonContent;
				item.crptReceiptNumber = crptReceiptNumber;
				item.costRub = it.costRub ?? item.costRub;
				item.notes = input.reason ?? item.notes;

				fallbackLedger.set(it.sgtin, item);
				updatedItems.push(item);
			}
		}

		// If queue was used, clear processed items from the queue
		if (input.useQueue) {
			mdlpQueueService.clearQueue(orgId);
		}

		return {
			success: true,
			message: `Успешно списано ${disposalItems.length} позиций по схеме 10560 (оказание медицинской помощи).`,
			disposedCount: disposalItems.length,
			schema10560Document: schemaDoc,
			items: updatedItems,
			crptReceiptNumber,
		};
	}

	/**
	 * Generates printable Senior Nurse Medication Disposal Act HTML and structured data.
	 */
	public generateDisposalAct(
		orgId: string,
		input: MdlpActGenerateInput,
	): { actData: SeniorNurseDisposalActData; html: string } {
		let queueItems: MdlpCarpuleQueueItem[] = [];

		if (input.useQueue) {
			const queue = mdlpQueueService.getQueue(orgId);
			queueItems = queue.items;
		} else if (input.items && input.items.length > 0) {
			queueItems = input.items;
		}

		const actData = formatSeniorNurseDisposalActData({
			actNumber: input.actNumber,
			actDate: input.actDate,
			organizationName: input.organizationName,
			organizationInn: input.organizationInn,
			organizationAddress: input.organizationAddress,
			departmentName: input.departmentName,
			cabinetName: input.cabinetName,
			seniorNurseName: input.seniorNurseName,
			chiefDoctorName: input.chiefDoctorName,
			dentistName: input.dentistName,
			approverRole: input.approverRole,
			approverName: input.approverName,
			approvedByFullName: input.approvedByFullName,
			approvedByPositionRu: input.approvedByPositionRu,
			paperJournalAcknowledged: input.paperJournalAcknowledged,
			crptReceiptNumber: input.crptReceiptNumber,
			notes: input.notes,
			items: queueItems,
		});

		const html = generateSeniorNurseDisposalActHtml(actData);

		return {
			actData,
			html,
		};
	}

	/**
	 * Lists scanned and tracked medications from database.
	 */
	public async listItems(
		orgId: string,
		query: {
			status?: "in_stock" | "disposed" | "all" | undefined;
			search?: string | null | undefined;
			patientId?: string | null | undefined;
			visitId?: string | null | undefined;
			limit?: number | undefined;
			offset?: number | undefined;
		} = {},
	): Promise<{ total: number; items: Record<string, unknown>[] }> {
		const status = query.status ?? "all";
		const limit = query.limit ?? 50;
		const offset = query.offset ?? 0;

		try {
			const conditions = [eq(mdlpItems.organizationId, orgId)];

			if (status && status !== "all") {
				conditions.push(eq(mdlpItems.status, status));
			}
			if (query.patientId) {
				conditions.push(eq(mdlpItems.patientId, query.patientId));
			}
			if (query.visitId) {
				conditions.push(eq(mdlpItems.visitId, query.visitId));
			}
			if (query.search && query.search.trim().length > 0) {
				const pattern = `%${query.search.trim()}%`;
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

			return {
				total: totalCount,
				items: itemsList as Record<string, unknown>[],
			};
		} catch (_dbErr) {
			if (process.env.NODE_ENV === "production") {
				throw new Error(
					`[MDLP 10560 CRITICAL] Сбой чтения реестра МДЛП из PostgreSQL: ${_dbErr instanceof Error ? _dbErr.message : String(_dbErr)}. В продакшене запрещен in-memory fallback.`,
				);
			}
			const fallbackLedger = getFallbackOrgLedger(orgId);
			let list = Array.from(fallbackLedger.values());

			if (status && status !== "all") {
				list = list.filter((it) => it.status === status);
			}
			if (query.patientId) {
				list = list.filter((it) => it.patientId === query.patientId);
			}
			if (query.visitId) {
				list = list.filter((it) => it.visitId === query.visitId);
			}
			if (query.search && query.search.trim().length > 0) {
				const q = query.search.toLowerCase();
				list = list.filter((it) => {
					const sgtin = String(it.sgtin || "").toLowerCase();
					const trade = String(it.tradeName || "").toLowerCase();
					return sgtin.includes(q) || trade.includes(q);
				});
			}

			return {
				total: list.length,
				items: list.slice(offset, offset + limit),
			};
		}
	}
}

export const mdlpDisposalService = new MdlpDisposalService();
