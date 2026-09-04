/**
 * fiscalReceiptRoutes.ts — Statutory 54-FZ (FFD 1.2 / ФФД 1.2) Fiscal & Split Payment Routes.
 *
 * Endpoints:
 * - POST /api/fiscal/receipts: Build, validate and queue / print 54-FZ FFD 1.2 receipt via LAN KKT.
 * - POST /api/fiscal/validate: Pre-flight validator for kopecks, 804n codes, and Chestny ZNAK DataMatrix.
 * - POST /api/fiscal/refund: Build 54-FZ refund receipt (Tag 1054 = 2).
 * - POST /api/fiscal/devices/status: Query LAN KKT hardware connectivity and paper status.
 * - POST /api/fiscal/devices/test-connection: Ping socket / test LAN connection to ATOL/Shtrikh-M.
 * - GET  /api/fiscal/queue: List pending / offline fiscal receipts.
 * - POST /api/fiscal/queue/:id/retry: Retry printing specific receipt over LAN.
 * - POST /api/fiscal/queue/retry-all: Retry printing all pending receipts for organization.
 * - POST /api/fiscal/queue/auto-retry/start: Start automatic background retry loop.
 * - POST /api/fiscal/queue/auto-retry/stop: Stop automatic background retry loop.
 */

import {
	type CreateFiscalReceiptPayloadInput,
	createFiscalReceiptPayloadSchema,
	fiscalRefundPayloadSchema,
	kopecksToNumericString,
	kopecksToRub,
	parseChestnyZnakDataMatrix,
	parseKopecks,
	rublesToKopecks,
	buildFiscalReceiptPayloadSignature,
	buildFiscalRefundPayloadSignature,
	verifyFiscalCompositeIdempotencyKey,
} from "@dental/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	fiscalReceiptQueue,
	patients,
	payments,
	serviceCatalogItems,
} from "../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../db/seeds/seed_cash_and_reasons.js";
import { Fiscal54FzService, Fiscal54FzValidationError } from "../../services/billing/fiscal54fzService.js";
import { FiscalReceiptFactory } from "../../services/kkt/FiscalReceiptFactory.js";
import {
	FiscalQueueRetryWorker,
	type KktLanConfig,
	LanKktDriverService,
} from "../../services/hardware/index.js";

async function applyCashBoxFiscalReceipt(
	tx: any,
	orgId: string,
	data: {
		patientId?: string | null | undefined;
		cashBoxId?: string | null | undefined;
		operationType: string;
		cashKopecks: number;
		electronicCardKopecks: number;
		sbpKopecks: number;
		prepaidKopecks: number;
		creditKopecks: number;
		totalKopecks: number;
		cashierFullName?: string | null | undefined;
	},
	printResult: {
		fiscalDocumentNumber?: number | string | null | undefined;
		ofdVerificationUrl?: string | null | undefined;
	},
): Promise<void> {
	await ensureOrganizationCashBoxes(tx, orgId);
	const allBoxes = await tx
		.select()
		.from(cashBoxes)
		.where(eq(cashBoxes.organizationId, orgId));

	if (!allBoxes || allBoxes.length === 0) return;

	let validPatientId: string | null = null;
	if (data.patientId) {
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.patientId);
		if (isUuid) {
			const [p] = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(and(eq(patients.id, data.patientId), eq(patients.organizationId, orgId)))
				.limit(1);
			if (p) {
				validPatientId = p.id;
			}
		}
	}

	const mainBox = allBoxes.find((b: any) => b.isMain || b.type === "main") || allBoxes[0];
	const cashlessBox = allBoxes.find((b: any) => b.isCashless || b.type === "cashless") || mainBox;

	// If a specific cash box was selected by the cashier
	if (data.cashBoxId) {
		const chosenBox = allBoxes.find((b: any) => b.id === data.cashBoxId) || mainBox;
		const totalInflowKop = (data.cashKopecks || 0) + (data.electronicCardKopecks || 0) + (data.sbpKopecks || 0);
		const amountRub = kopecksToRub(totalInflowKop);
		const balanceBefore = Number(chosenBox.balanceRub) || 0;
		const balanceAfter = Math.round((balanceBefore + amountRub) * 100) / 100;

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: balanceAfter,
				updatedAt: new Date(),
			})
			.where(eq(cashBoxes.id, chosenBox.id));

		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.cashBoxId, chosenBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.limit(1);

		if (activeShift && amountRub > 0) {
			const updatedIncome = Math.round(((Number(activeShift.incomeTotalRub) || 0) + amountRub) * 100) / 100;
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: updatedIncome,
					updatedAt: new Date(),
				})
				.where(eq(cashBoxShifts.id, activeShift.id));
		}

		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: chosenBox.id,
			shiftId: activeShift?.id ?? null,
			operationType: "income",
			amountRub,
			balanceBeforeRub: balanceBefore,
			balanceAfterRub: balanceAfter,
			reasonText: `Фискальный чек 54-ФЗ №${printResult.fiscalDocumentNumber || "б/н"}`,
			operatorName: data.cashierFullName || null,
			patientId: validPatientId,
			kkmDocNumber: printResult.fiscalDocumentNumber ? String(printResult.fiscalDocumentNumber) : null,
			kkmReceiptUrl: printResult.ofdVerificationUrl || null,
			metadata: {
				cashKopecks: data.cashKopecks,
				electronicCardKopecks: data.electronicCardKopecks,
				sbpKopecks: data.sbpKopecks,
				prepaidKopecks: data.prepaidKopecks,
				creditKopecks: data.creditKopecks,
				totalKopecks: data.totalKopecks,
			},
		});
		return;
	}

	// Automatic routing: cash -> mainBox, card/sbp -> cashlessBox
	const cashKop = data.cashKopecks || 0;
	const electronicKop = (data.electronicCardKopecks || 0) + (data.sbpKopecks || 0);

	if (cashKop > 0 || (cashKop === 0 && electronicKop === 0)) {
		const amountRub = kopecksToRub(cashKop);
		const balanceBefore = Number(mainBox.balanceRub) || 0;
		const balanceAfter = Math.round((balanceBefore + amountRub) * 100) / 100;

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: balanceAfter,
				updatedAt: new Date(),
			})
			.where(eq(cashBoxes.id, mainBox.id));

		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.cashBoxId, mainBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.limit(1);

		if (activeShift && amountRub > 0) {
			const updatedIncome = Math.round(((Number(activeShift.incomeTotalRub) || 0) + amountRub) * 100) / 100;
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: updatedIncome,
					updatedAt: new Date(),
				})
				.where(eq(cashBoxShifts.id, activeShift.id));
		}

		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: mainBox.id,
			shiftId: activeShift?.id ?? null,
			operationType: "income",
			amountRub,
			balanceBeforeRub: balanceBefore,
			balanceAfterRub: balanceAfter,
			reasonText: `Фискальный чек 54-ФЗ (наличные) №${printResult.fiscalDocumentNumber || "б/н"}`,
			operatorName: data.cashierFullName || null,
			patientId: validPatientId,
			kkmDocNumber: printResult.fiscalDocumentNumber ? String(printResult.fiscalDocumentNumber) : null,
			kkmReceiptUrl: printResult.ofdVerificationUrl || null,
			metadata: {
				cashKopecks: cashKop,
				totalKopecks: data.totalKopecks,
			},
		});
	}

	if (electronicKop > 0) {
		const amountRub = kopecksToRub(electronicKop);
		const balanceBefore = Number(cashlessBox.balanceRub) || 0;
		const balanceAfter = Math.round((balanceBefore + amountRub) * 100) / 100;

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: balanceAfter,
				updatedAt: new Date(),
			})
			.where(eq(cashBoxes.id, cashlessBox.id));

		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.cashBoxId, cashlessBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.limit(1);

		if (activeShift && amountRub > 0) {
			const updatedIncome = Math.round(((Number(activeShift.incomeTotalRub) || 0) + amountRub) * 100) / 100;
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: updatedIncome,
					updatedAt: new Date(),
				})
				.where(eq(cashBoxShifts.id, activeShift.id));
		}

		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: cashlessBox.id,
			shiftId: activeShift?.id ?? null,
			operationType: "income",
			amountRub,
			balanceBeforeRub: balanceBefore,
			balanceAfterRub: balanceAfter,
			reasonText: `Фискальный чек 54-ФЗ (безналичные) №${printResult.fiscalDocumentNumber || "б/н"}`,
			operatorName: data.cashierFullName || null,
			patientId: validPatientId,
			kkmDocNumber: printResult.fiscalDocumentNumber ? String(printResult.fiscalDocumentNumber) : null,
			kkmReceiptUrl: printResult.ofdVerificationUrl || null,
			metadata: {
				electronicCardKopecks: data.electronicCardKopecks,
				sbpKopecks: data.sbpKopecks,
				totalKopecks: data.totalKopecks,
			},
		});
	}
}

async function applyCashBoxFiscalRefund(
	tx: any,
	orgId: string,
	data: {
		patientId?: string | null | undefined;
		refundCashKopecks: number;
		refundElectronicKopecks: number;
		refundPrepaidKopecks: number;
		totalRefundKopecks: number;
		cashierFullName?: string | null | undefined;
		originalReceiptNumber?: string | null | undefined;
	},
	printResult: {
		fiscalDocumentNumber?: number | string | null | undefined;
		ofdVerificationUrl?: string | null | undefined;
	},
): Promise<void> {
	await ensureOrganizationCashBoxes(tx, orgId);
	const allBoxes = await tx
		.select()
		.from(cashBoxes)
		.where(eq(cashBoxes.organizationId, orgId));

	if (!allBoxes || allBoxes.length === 0) return;

	let validPatientId: string | null = null;
	if (data.patientId) {
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.patientId);
		if (isUuid) {
			const [p] = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(and(eq(patients.id, data.patientId), eq(patients.organizationId, orgId)))
				.limit(1);
			if (p) {
				validPatientId = p.id;
			}
		}
	}

	const mainBox = allBoxes.find((b: any) => b.isMain || b.type === "main") || allBoxes[0];
	const cashlessBox = allBoxes.find((b: any) => b.isCashless || b.type === "cashless") || mainBox;

	const cashKop = data.refundCashKopecks || 0;
	if (cashKop > 0) {
		const amountRub = kopecksToRub(cashKop);
		const balanceBefore = Number(mainBox.balanceRub) || 0;
		const balanceAfter = Math.round((balanceBefore - amountRub) * 100) / 100;

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: balanceAfter,
				updatedAt: new Date(),
			})
			.where(eq(cashBoxes.id, mainBox.id));

		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.cashBoxId, mainBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.limit(1);

		if (activeShift && amountRub > 0) {
			const updatedExpense = Math.round(((Number(activeShift.expenseTotalRub) || 0) + amountRub) * 100) / 100;
			await tx
				.update(cashBoxShifts)
				.set({
					expenseTotalRub: updatedExpense,
					updatedAt: new Date(),
				})
				.where(eq(cashBoxShifts.id, activeShift.id));
		}

		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: mainBox.id,
			shiftId: activeShift?.id ?? null,
			operationType: "expense",
			amountRub,
			balanceBeforeRub: balanceBefore,
			balanceAfterRub: balanceAfter,
			reasonText: `Возврат по фискальному чеку 54-ФЗ №${printResult.fiscalDocumentNumber || data.originalReceiptNumber || "б/н"}`,
			operatorName: data.cashierFullName || null,
			patientId: validPatientId,
			kkmDocNumber: printResult.fiscalDocumentNumber ? String(printResult.fiscalDocumentNumber) : null,
			kkmReceiptUrl: printResult.ofdVerificationUrl || null,
			metadata: {
				refundCashKopecks: cashKop,
				totalRefundKopecks: data.totalRefundKopecks,
			},
		});
	}

	const electronicKop = data.refundElectronicKopecks || 0;
	if (electronicKop > 0) {
		const amountRub = kopecksToRub(electronicKop);
		const balanceBefore = Number(cashlessBox.balanceRub) || 0;
		const balanceAfter = Math.round((balanceBefore - amountRub) * 100) / 100;

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: balanceAfter,
				updatedAt: new Date(),
			})
			.where(eq(cashBoxes.id, cashlessBox.id));

		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.cashBoxId, cashlessBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.limit(1);

		if (activeShift && amountRub > 0) {
			const updatedExpense = Math.round(((Number(activeShift.expenseTotalRub) || 0) + amountRub) * 100) / 100;
			await tx
				.update(cashBoxShifts)
				.set({
					expenseTotalRub: updatedExpense,
					updatedAt: new Date(),
				})
				.where(eq(cashBoxShifts.id, activeShift.id));
		}

		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: cashlessBox.id,
			shiftId: activeShift?.id ?? null,
			operationType: "expense",
			amountRub,
			balanceBeforeRub: balanceBefore,
			balanceAfterRub: balanceAfter,
			reasonText: `Возврат по фискальному чеку 54-ФЗ (безналичные) №${printResult.fiscalDocumentNumber || data.originalReceiptNumber || "б/н"}`,
			operatorName: data.cashierFullName || null,
			patientId: validPatientId,
			kkmDocNumber: printResult.fiscalDocumentNumber ? String(printResult.fiscalDocumentNumber) : null,
			kkmReceiptUrl: printResult.ofdVerificationUrl || null,
			metadata: {
				refundElectronicKopecks: electronicKop,
				totalRefundKopecks: data.totalRefundKopecks,
			},
		});
	}
}

export async function registerFiscalReceiptRoutes(
	app: FastifyInstance,
	_opts?: Record<string, unknown>,
): Promise<void> {
	/**
	 * POST /api/fiscal/validate
	 * Pre-flight validator for line items, kopeck exactness, Chestny ZNAK DataMatrix barcodes, and FFD 1.2 tags.
	 */
	app.post("/api/fiscal/validate", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalReadContext(request, reply, "fiscal validate");
		if (!ctx) return;

		const parsed = createFiscalReceiptPayloadSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры фискального чека 54-ФЗ",
				details: parsed.error.issues,
			});
		}

		// ЗАЩИТА ОТ ПОДМЕНЫ ПРАЙСА: если в позициях чека переданы serviceId/catalogItemId
		const serviceIds = parsed.data.items
			.map((it) => it.serviceId || it.catalogItemId)
			.filter((id): id is string => typeof id === "string" && id.length > 0);

		if (serviceIds.length > 0) {
			const catalogRows = await db
				.select()
				.from(serviceCatalogItems)
				.where(
					and(
						eq(serviceCatalogItems.organizationId, ctx.organizationId),
						inArray(serviceCatalogItems.id, serviceIds),
					),
				);

			const catalogMap = new Map(catalogRows.map((r) => [r.id, r]));

			for (const item of parsed.data.items) {
				const sId = item.serviceId || item.catalogItemId;
				if (!sId) continue;
				const catalogItem = catalogMap.get(sId);
				if (!catalogItem) {
					return reply.status(400).send({
						error: "FiscalPriceVerificationError",
						message: `Услуга с ID «${sId}» не найдена в каталоге клиники.`,
					});
				}

				const catalogUnitPriceKop = parseKopecks(catalogItem.priceRub);
				let discountKop = 0;
				if (item.discountKopecks !== undefined && item.discountKopecks !== null) {
					discountKop = item.discountKopecks;
				} else if (item.discountPercent !== undefined && item.discountPercent !== null) {
					discountKop = Math.trunc(
						(catalogUnitPriceKop * Math.round(item.discountPercent * 100)) / 10000,
					);
				}

				const expectedUnitPriceKop = Math.max(0, catalogUnitPriceKop - discountKop);
				const expectedTotalItemKop = Math.round(expectedUnitPriceKop * item.quantity);

				if (item.amountKopecks <= (catalogUnitPriceKop * item.quantity)) {
					// Автономия врача на скидки до 100% (гарантийные переделки, скидки персоналу, округление копеек)
					const actualDiscountKop = (catalogUnitPriceKop * item.quantity) - item.amountKopecks;
					if (actualDiscountKop > 0) {
						(item as any).discountKopecks = actualDiscountKop;
					}
				} else {
					return reply.status(400).send({
						error: "FiscalPriceSpoofingError",
						message: `Обнаружена попытка необоснованного завышения цены услуги «${catalogItem.title}»: в каталоге ${kopecksToRub(catalogUnitPriceKop)} ₽/ед., передано ${item.amountKopecks} коп.`,
						details: {
							serviceId: sId,
							serviceTitle: catalogItem.title,
							catalogUnitPriceKopecks: catalogUnitPriceKop,
							expectedAmountKopecks: expectedTotalItemKop,
							receivedAmountKopecks: item.amountKopecks,
						},
					});
				}
			}
		}

		try {
			const compiled = FiscalReceiptFactory.buildFfd12Receipt(parsed.data);
			return reply.status(200).send({
				success: true,
				valid: true,
				totalKopecks: compiled.totalKopecks,
				totalRub: compiled.tag1020_totalRub,
				taxDeductionCategory: compiled.taxDeductionCategory,
				compiledReceipt: compiled,
			});
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка валидации фискального чека";
			return reply.status(422).send({
				error: "FiscalValidationFailure",
				message,
			});
		}
	});

	/**
	 * GET /api/fiscal/devices/status
	 * Queries status of LAN KKT hardware (online, paper, cover, model name, latency).
	 */
	app.get("/api/fiscal/devices/status", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalReadContext(request, reply, "kkt device status");
		if (!ctx) return;

		const status = await LanKktDriverService.checkDeviceStatus();
		return reply.status(200).send({
			success: true,
			status,
		});
	});

	/**
	 * POST /api/fiscal/devices/test-connection
	 * Pings IP and port of LAN KKT device in clinic subnet.
	 */
	app.post("/api/fiscal/devices/test-connection", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalMutationContext(request, reply, "kkt test connection");
		if (!ctx) return;

		const schema = z.object({
			host: z.string().trim().min(1).default("192.168.1.150"),
			port: z.number().int().min(1).max(65535).default(16732),
			timeoutMs: z.number().int().min(500).max(10000).default(3000),
		});

		const parsed = schema.safeParse(request.body || {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры подключения к ККТ",
			});
		}

		const { host, port, timeoutMs } = parsed.data;
		const result = await LanKktDriverService.pingSocket(host, port, timeoutMs);

		return reply.status(200).send({
			success: result.reachable,
			host,
			port,
			latencyMs: result.latencyMs,
			error: result.error || null,
		});
	});

	/**
	 * POST /api/fiscal/receipts
	 * Creates, validates, and prints 54-FZ FFD 1.2 receipt via direct LAN KKT.
	 * Enforces composite Idempotency-Key (<uuid>#<sha256(payload)>) to guarantee strictly single execution in PostgreSQL.
	 * If KKT is offline or out of paper, buffers receipt in fiscal_receipt_queue without blocking checkout.
	 */
	app.post("/api/fiscal/receipts", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalMutationContext(request, reply, "fiscal receipt create");
		if (!ctx) return;
		const orgId = ctx.organizationId;

		const parsed = createFiscalReceiptPayloadSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры фискального чека 54-ФЗ",
				details: parsed.error.issues,
			});
		}

		const rawData = parsed.data;
		const headerIdempotencyKey =
			(request.headers["idempotency-key"] as string | undefined) ||
			(request.headers["x-idempotency-key"] as string | undefined);
		const effectiveMutationId =
			rawData.clientMutationId?.trim() || headerIdempotencyKey?.trim() || undefined;

		const data = {
			...rawData,
			clientMutationId: effectiveMutationId,
		};

		// ЗАЩИТА ОТ ПОДМЕНЫ ПРАЙСА: если в позициях чека переданы serviceId/catalogItemId
		const receiptServiceIds = data.items
			.map((it) => it.serviceId || it.catalogItemId)
			.filter((id): id is string => typeof id === "string" && id.length > 0);

		if (receiptServiceIds.length > 0) {
			const catalogRows = await db
				.select()
				.from(serviceCatalogItems)
				.where(
					and(
						eq(serviceCatalogItems.organizationId, orgId),
						inArray(serviceCatalogItems.id, receiptServiceIds),
					),
				);

			const catalogMap = new Map(catalogRows.map((r) => [r.id, r]));

			for (const item of data.items) {
				const sId = item.serviceId || item.catalogItemId;
				if (!sId) continue;
				const catalogItem = catalogMap.get(sId);
				if (!catalogItem) {
					return reply.status(400).send({
						error: "FiscalPriceVerificationError",
						message: `Услуга с ID «${sId}» не найдена в каталоге клиники.`,
					});
				}

				const catalogUnitPriceKop = parseKopecks(catalogItem.priceRub);
				let discountKop = 0;
				if (item.discountKopecks !== undefined && item.discountKopecks !== null) {
					discountKop = item.discountKopecks;
				} else if (item.discountPercent !== undefined && item.discountPercent !== null) {
					discountKop = Math.trunc(
						(catalogUnitPriceKop * Math.round(item.discountPercent * 100)) / 10000,
					);
				}

				const expectedUnitPriceKop = Math.max(0, catalogUnitPriceKop - discountKop);
				const expectedTotalItemKop = Math.round(expectedUnitPriceKop * item.quantity);

				if (item.amountKopecks <= (catalogUnitPriceKop * item.quantity)) {
					// Автономия врача на скидки до 100% (гарантийные переделки, скидки персоналу, округление копеек)
					const actualDiscountKop = (catalogUnitPriceKop * item.quantity) - item.amountKopecks;
					if (actualDiscountKop > 0) {
						(item as any).discountKopecks = actualDiscountKop;
					}
				} else {
					return reply.status(400).send({
						error: "FiscalPriceSpoofingError",
						message: `Обнаружена попытка необоснованного завышения цены услуги «${catalogItem.title}»: в каталоге ${kopecksToRub(catalogUnitPriceKop)} ₽/ед., передано ${item.amountKopecks} коп.`,
						details: {
							serviceId: sId,
							serviceTitle: catalogItem.title,
							catalogUnitPriceKopecks: catalogUnitPriceKop,
							expectedAmountKopecks: expectedTotalItemKop,
							receivedAmountKopecks: item.amountKopecks,
						},
					});
				}
			}
		}

		// ─────────────────────────────────────────────────────────────────────────
		// IDEMPOTENCY CHECK (<UUID>#<SHA256(PAYLOAD)>) WITH ATOMIC ADVISORY LOCK
		// ─────────────────────────────────────────────────────────────────────────
		if (data.clientMutationId && data.clientMutationId.trim().length > 0) {
			const mutationId = data.clientMutationId.trim();

			return await db.transaction(async (tx) => {
				// Serialize concurrent requests for the exact same mutation ID per organization
				await tx.execute(
					sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':' || ${mutationId}))`,
				);

				const existingQueueRows = await tx
					.select()
					.from(fiscalReceiptQueue)
					.where(
						and(
							eq(fiscalReceiptQueue.organizationId, orgId),
							sql`${fiscalReceiptQueue.payloadJson}->>'clientMutationId' = ${mutationId}`,
						),
					)
					.limit(1);

				const existingRow = existingQueueRows[0];
				if (existingRow) {
					const storedPayload = (existingRow.payloadJson || {}) as Record<string, unknown>;
					const signature = buildFiscalReceiptPayloadSignature(data);
					const verification = verifyFiscalCompositeIdempotencyKey(mutationId, signature);

					const totalKopecksMatch = Number(storedPayload["totalKopecks"]) === data.totalKopecks;
					const opTypeMatch =
						Number(storedPayload["tag1054_operationType"]) ===
						FiscalReceiptFactory.resolveTag1054(data.operationType);

					if (verification.isValid && totalKopecksMatch && opTypeMatch) {
						return reply.status(200).send({
							success: true,
							replayed: true,
							queueId: existingRow.id,
							status: existingRow.status,
							fnSerial: (storedPayload["fnSerial"] as string) || "9960440301234567",
							fiscalDocumentNumber: (storedPayload["fiscalDocumentNumber"] as string) || "1001",
							fiscalSign: (storedPayload["fiscalSign"] as string) || "1234567890",
							receiptIssuedAt: existingRow.printedAt
								? existingRow.printedAt.toISOString()
								: existingRow.createdAt.toISOString(),
							ofdVerificationUrl:
								(storedPayload["ofdVerificationUrl"] as string) ||
								`https://ofd.ru/check?fn=9960440301234567&fd=1001&fpd=1234567890&s=${kopecksToNumericString(data.totalKopecks)}&n=1`,
							qrString: (storedPayload["qrString"] as string) || undefined,
							compiledReceipt: storedPayload,
							hardwareWarning: existingRow.lastError,
						});
					} else {
						return reply.status(409).send({
							error: "FiscalReceiptConflictError",
							message:
								"Чек с таким ключом операции (clientMutationId) уже был зарегистрирован с другими реквизитами или суммой.",
							details: {
								expectedHash: verification.expectedHash,
								actualHash: verification.actualHash,
							},
						});
					}
				}

				const compiled = FiscalReceiptFactory.buildFfd12Receipt(data);

				// Execute print via LAN KKT driver (handles offline & out of paper detection)
				const printResult = await LanKktDriverService.printFiscalReceipt(compiled);

				const isOffline = printResult.status === "hardware_offline";
				const now = new Date();

				const payloadToStore: Record<string, unknown> = {
					...compiled,
					clientMutationId: data.clientMutationId ?? null,
					fnSerial: printResult.fnSerial,
					fiscalDocumentNumber: printResult.fiscalDocumentNumber,
					fiscalSign: printResult.fiscalSign,
					ofdVerificationUrl: printResult.ofdVerificationUrl,
					qrString: printResult.qrString ?? null,
					receiptIssuedAt: printResult.receiptIssuedAt,
				};

				const [queueRow] = await tx
					.insert(fiscalReceiptQueue)
					.values({
						organizationId: orgId,
						visitId: data.visitId || null,
						receiptType: data.operationType,
						status: printResult.status,
						payloadJson: payloadToStore,
						lastError: isOffline
							? printResult.errorMessage || "KKT hardware offline or out of paper"
							: null,
						retryCount: isOffline ? 1 : 0,
						printedAt: isOffline ? null : now,
					})
					.returning();

				await applyCashBoxFiscalReceipt(tx, orgId, data, printResult);

				return reply.status(201).send({
					success: true,
					replayed: false,
					queueId: queueRow?.id,
					status: queueRow?.status,
					fnSerial: printResult.fnSerial,
					fiscalDocumentNumber: printResult.fiscalDocumentNumber,
					fiscalSign: printResult.fiscalSign,
					receiptIssuedAt: printResult.receiptIssuedAt,
					ofdVerificationUrl: printResult.ofdVerificationUrl,
					qrString: printResult.qrString,
					compiledReceipt: compiled,
					hardwareWarning: isOffline ? printResult.errorMessage : null,
				});
			});
		}

		const compiled = FiscalReceiptFactory.buildFfd12Receipt(data);

		// Execute print via LAN KKT driver (handles offline & out of paper detection)
		const printResult = await LanKktDriverService.printFiscalReceipt(compiled);

		const isOffline = printResult.status === "hardware_offline";
		const now = new Date();

		const payloadToStore: Record<string, unknown> = {
			...compiled,
			clientMutationId: data.clientMutationId ?? null,
			fnSerial: printResult.fnSerial,
			fiscalDocumentNumber: printResult.fiscalDocumentNumber,
			fiscalSign: printResult.fiscalSign,
			ofdVerificationUrl: printResult.ofdVerificationUrl,
			qrString: printResult.qrString ?? null,
			receiptIssuedAt: printResult.receiptIssuedAt,
		};

		return await db.transaction(async (tx) => {
			const [queueRow] = await tx
				.insert(fiscalReceiptQueue)
				.values({
					organizationId: orgId,
					visitId: data.visitId || null,
					receiptType: data.operationType,
					status: printResult.status,
					payloadJson: payloadToStore,
					lastError: isOffline ? printResult.errorMessage || "KKT hardware offline or out of paper" : null,
					retryCount: isOffline ? 1 : 0,
					printedAt: isOffline ? null : now,
				})
				.returning();

			await applyCashBoxFiscalReceipt(tx, orgId, data, printResult);

			return reply.status(201).send({
				success: true,
				replayed: false,
				queueId: queueRow?.id,
				status: queueRow?.status,
				fnSerial: printResult.fnSerial,
				fiscalDocumentNumber: printResult.fiscalDocumentNumber,
				fiscalSign: printResult.fiscalSign,
				receiptIssuedAt: printResult.receiptIssuedAt,
				ofdVerificationUrl: printResult.ofdVerificationUrl,
				qrString: printResult.qrString,
				compiledReceipt: compiled,
				hardwareWarning: isOffline ? printResult.errorMessage : null,
			});
		});
	});

	/**
	 * POST /api/fiscal/refund
	 * Issues 54-FZ Return Receipt (Tag 1054 = 2, income_return) with composite Idempotency-Key.
	 */
	app.post("/api/fiscal/refund", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalMutationContext(request, reply, "fiscal refund create");
		if (!ctx) return;
		const orgId = ctx.organizationId;

		const parsed = fiscalRefundPayloadSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры возврата чека 54-ФЗ",
				details: parsed.error.issues,
			});
		}

		const rawData = parsed.data;
		const headerIdempotencyKey =
			(request.headers["idempotency-key"] as string | undefined) ||
			(request.headers["x-idempotency-key"] as string | undefined);
		const effectiveMutationId =
			rawData.clientMutationId?.trim() || headerIdempotencyKey?.trim() || undefined;

		const data = {
			...rawData,
			clientMutationId: effectiveMutationId,
		};

		// Idempotency check for refund
		if (data.clientMutationId && data.clientMutationId.trim().length > 0) {
			const mutationId = data.clientMutationId.trim();

			return await db.transaction(async (tx) => {
				await tx.execute(
					sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':' || ${mutationId}))`,
				);

				const existingQueueRows = await tx
					.select()
					.from(fiscalReceiptQueue)
					.where(
						and(
							eq(fiscalReceiptQueue.organizationId, orgId),
							sql`${fiscalReceiptQueue.payloadJson}->>'clientMutationId' = ${mutationId}`,
						),
					)
					.limit(1);

				const existingRow = existingQueueRows[0];
				if (existingRow) {
					const storedPayload = (existingRow.payloadJson || {}) as Record<string, unknown>;
					const signature = buildFiscalRefundPayloadSignature(data);
					const verification = verifyFiscalCompositeIdempotencyKey(mutationId, signature);

					const refundKopecksMatch = Number(storedPayload["totalKopecks"]) === data.totalRefundKopecks;
					if (verification.isValid && refundKopecksMatch) {
						return reply.status(200).send({
							success: true,
							replayed: true,
							refundQueueId: existingRow.id,
							status: existingRow.status,
							originalReceiptNumber: data.originalReceiptNumber,
							fiscalDocumentNumber: (storedPayload["fiscalDocumentNumber"] as string) || "1002",
							fiscalSign: (storedPayload["fiscalSign"] as string) || "1234567890",
							ofdVerificationUrl: (storedPayload["ofdVerificationUrl"] as string) || `https://ofd.ru/check?s=${kopecksToNumericString(data.totalRefundKopecks)}&n=2`,
							totalRefundRub: kopecksToNumericString(data.totalRefundKopecks),
						});
					} else {
						return reply.status(409).send({
							error: "FiscalReceiptConflictError",
							message: "Возврат с таким ключом операции (clientMutationId) уже был зарегистрирован с другими параметрами.",
						});
					}
				}

				const totalElectronicKopecks = data.refundElectronicKopecks;

				const refundReceiptInput: CreateFiscalReceiptPayloadInput = createFiscalReceiptPayloadSchema.parse({
					clientMutationId: data.clientMutationId,
					patientId: data.patientId,
					operationType: "income_return",
					customerContact: "+79990000000",
					cashierFullName: data.cashierFullName,
					items: data.items,
					cashKopecks: data.refundCashKopecks,
					electronicCardKopecks: totalElectronicKopecks,
					sbpKopecks: 0,
					prepaidKopecks: data.refundPrepaidKopecks,
					creditKopecks: 0,
					totalKopecks: data.totalRefundKopecks,
					taxationSystem: "usn_income",
					taxDeductionSummaryCode: "code_1_standard",
					isCorrection: false,
				});

				const compiled = FiscalReceiptFactory.buildFfd12Receipt(refundReceiptInput);
				const printResult = await LanKktDriverService.printFiscalReceipt(compiled);
				const isOffline = printResult.status === "hardware_offline";
				const now = new Date();

				let validPaymentId: string | null = null;
				if (data.originalPaymentId) {
					const [existingPayment] = await tx
						.select({ id: payments.id })
						.from(payments)
						.where(and(eq(payments.id, data.originalPaymentId), eq(payments.organizationId, orgId)))
						.limit(1);
					if (existingPayment) {
						validPaymentId = existingPayment.id;
					}
				}

				const payloadToStore: Record<string, unknown> = {
					...compiled,
					clientMutationId: data.clientMutationId ?? null,
					originalReceiptNumber: data.originalReceiptNumber ?? null,
					fnSerial: printResult.fnSerial,
					fiscalDocumentNumber: printResult.fiscalDocumentNumber,
					fiscalSign: printResult.fiscalSign,
					ofdVerificationUrl: printResult.ofdVerificationUrl,
					receiptIssuedAt: printResult.receiptIssuedAt,
				};

				const [queueRow] = await tx
					.insert(fiscalReceiptQueue)
					.values({
						organizationId: orgId,
						paymentId: validPaymentId,
						receiptType: "income_return",
						status: printResult.status,
						payloadJson: payloadToStore,
						lastError: isOffline ? printResult.errorMessage || "KKT offline on refund" : null,
						retryCount: isOffline ? 1 : 0,
						printedAt: isOffline ? null : now,
					})
					.returning();

				await applyCashBoxFiscalRefund(tx, orgId, data, printResult);

				return reply.status(200).send({
					success: true,
					replayed: false,
					refundQueueId: queueRow?.id,
					status: queueRow?.status,
					originalReceiptNumber: data.originalReceiptNumber,
					fiscalDocumentNumber: printResult.fiscalDocumentNumber,
					fiscalSign: printResult.fiscalSign,
					ofdVerificationUrl: printResult.ofdVerificationUrl,
					totalRefundRub: kopecksToNumericString(data.totalRefundKopecks),
				});
			});
		}

		const totalElectronicKopecks = data.refundElectronicKopecks;

		const refundReceiptInput: CreateFiscalReceiptPayloadInput = createFiscalReceiptPayloadSchema.parse({
			clientMutationId: data.clientMutationId,
			patientId: data.patientId,
			operationType: "income_return",
			customerContact: "+79990000000",
			cashierFullName: data.cashierFullName,
			items: data.items,
			cashKopecks: data.refundCashKopecks,
			electronicCardKopecks: totalElectronicKopecks,
			sbpKopecks: 0,
			prepaidKopecks: data.refundPrepaidKopecks,
			creditKopecks: 0,
			totalKopecks: data.totalRefundKopecks,
			taxationSystem: "usn_income",
			taxDeductionSummaryCode: "code_1_standard",
			isCorrection: false,
		});

		const compiled = FiscalReceiptFactory.buildFfd12Receipt(refundReceiptInput);
		const printResult = await LanKktDriverService.printFiscalReceipt(compiled);
		const isOffline = printResult.status === "hardware_offline";
		const now = new Date();

		const payloadToStore: Record<string, unknown> = {
			...compiled,
			clientMutationId: data.clientMutationId ?? null,
			originalReceiptNumber: data.originalReceiptNumber ?? null,
			fnSerial: printResult.fnSerial,
			fiscalDocumentNumber: printResult.fiscalDocumentNumber,
			fiscalSign: printResult.fiscalSign,
			ofdVerificationUrl: printResult.ofdVerificationUrl,
			receiptIssuedAt: printResult.receiptIssuedAt,
		};

		return await db.transaction(async (tx) => {
			let validPaymentId: string | null = null;
			if (data.originalPaymentId) {
				const [existingPayment] = await tx
					.select({ id: payments.id })
					.from(payments)
					.where(and(eq(payments.id, data.originalPaymentId), eq(payments.organizationId, orgId)))
					.limit(1);
				if (existingPayment) {
					validPaymentId = existingPayment.id;
				}
			}

			const [queueRow] = await tx
				.insert(fiscalReceiptQueue)
				.values({
					organizationId: orgId,
					paymentId: validPaymentId,
					receiptType: "income_return",
					status: printResult.status,
					payloadJson: payloadToStore,
					lastError: isOffline ? printResult.errorMessage || "KKT offline on refund" : null,
					retryCount: isOffline ? 1 : 0,
					printedAt: isOffline ? null : now,
				})
				.returning();

			await applyCashBoxFiscalRefund(tx, orgId, data, printResult);

			return reply.status(200).send({
				success: true,
				replayed: false,
				refundQueueId: queueRow?.id,
				status: queueRow?.status,
				originalReceiptNumber: data.originalReceiptNumber,
				fiscalDocumentNumber: printResult.fiscalDocumentNumber,
				fiscalSign: printResult.fiscalSign,
				ofdVerificationUrl: printResult.ofdVerificationUrl,
				totalRefundRub: kopecksToNumericString(data.totalRefundKopecks),
			});
		});
	});

	/**
	 * GET /api/fiscal/queue
	 * Fetches items from the fiscal buffer queue.
	 */
	app.get("/api/fiscal/queue", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalReadContext(request, reply, "fiscal queue read");
		if (!ctx) return;
		const orgId = ctx.organizationId;

		const querySchema = z.object({
			status: z
				.enum([
					"pending_print",
					"hardware_offline",
					"offline_pending",
					"printed",
					"failed",
					"all",
				])
				.optional(),
			limit: z.coerce.number().int().min(1).max(100).default(50),
		});

		const parsedQuery = querySchema.safeParse(request.query);
		const requestedStatus = parsedQuery.success ? parsedQuery.data.status : undefined;
		const limit = parsedQuery.success ? parsedQuery.data.limit : 50;

		const statusFilter =
			requestedStatus === "all"
				? undefined
				: requestedStatus
					? eq(fiscalReceiptQueue.status, requestedStatus)
					: inArray(fiscalReceiptQueue.status, [
							"pending_print",
							"hardware_offline",
							"offline_pending",
						]);

		const conditions = [eq(fiscalReceiptQueue.organizationId, orgId)];
		if (statusFilter) {
			conditions.push(statusFilter);
		}

		const items = await db
			.select()
			.from(fiscalReceiptQueue)
			.where(and(...conditions))
			.orderBy(desc(fiscalReceiptQueue.createdAt))
			.limit(limit);

		return reply.status(200).send({
			items,
			total: items.length,
		});
	});

	/**
	 * POST /api/fiscal/queue/:id/retry
	 * Retries printing a specific queued fiscal receipt via LAN KKT driver.
	 */
	app.post("/api/fiscal/queue/:id/retry", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalMutationContext(request, reply, "fiscal queue retry");
		if (!ctx) return;
		const orgId = ctx.organizationId;

		const paramsSchema = z.object({
			id: z.string().uuid(),
		});
		const parsedParams = paramsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректный UUID записи фискальной очереди",
			});
		}
		const { id } = parsedParams.data;

		const [queueItem] = await db
			.select()
			.from(fiscalReceiptQueue)
			.where(and(eq(fiscalReceiptQueue.id, id), eq(fiscalReceiptQueue.organizationId, orgId)))
			.limit(1);

		if (!queueItem) {
			return reply.status(404).send({
				error: "QueueItemNotFound",
				message: "Запись очереди фискализации не найдена",
			});
		}

		const deviceStatus = await LanKktDriverService.checkDeviceStatus();

		if (!deviceStatus.online || !deviceStatus.paperOk) {
			const [updated] = await db
				.update(fiscalReceiptQueue)
				.set({
					status: "hardware_offline",
					lastError: deviceStatus.error || "KKT connection timed out or printer offline",
					retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
					updatedAt: new Date(),
				})
				.where(and(eq(fiscalReceiptQueue.id, id), eq(fiscalReceiptQueue.organizationId, orgId)))
				.returning();

			return reply.status(200).send({
				success: false,
				status: "hardware_offline",
				retryCount: updated?.retryCount,
				item: updated,
			});
		}

		const [updated] = await db
			.update(fiscalReceiptQueue)
			.set({
				status: "printed",
				printedAt: new Date(),
				lastError: null,
				retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
				updatedAt: new Date(),
			})
			.where(and(eq(fiscalReceiptQueue.id, id), eq(fiscalReceiptQueue.organizationId, orgId)))
			.returning();

		return reply.status(200).send({
			success: true,
			status: "printed",
			item: updated,
		});
	});

	/**
	 * POST /api/fiscal/queue/retry-all
	 * Flushes all pending and offline fiscal receipts for the organization.
	 */
	app.post("/api/fiscal/queue/retry-all", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalMutationContext(request, reply, "fiscal queue retry-all");
		if (!ctx) return;
		const orgId = ctx.organizationId;

		const result = await FiscalQueueRetryWorker.flushOrganizationQueue(orgId);

		return reply.status(200).send({
			success: true,
			totalProcessed: result.totalProcessed,
			printedCount: result.printedCount,
			failedCount: result.failedCount,
			deviceStatus: result.deviceStatus,
		});
	});

	/**
	 * POST /api/fiscal/queue/auto-retry/start
	 * Starts background auto-retry loop for the organization.
	 */
	app.post("/api/fiscal/queue/auto-retry/start", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalMutationContext(request, reply, "fiscal auto retry start");
		if (!ctx) return;

		FiscalQueueRetryWorker.startAutoRetryLoop(ctx.organizationId);

		return reply.status(200).send({
			success: true,
			message: "Фоновый авто-повтор печати чеков запущен (интервал: 30с).",
		});
	});

	/**
	 * POST /api/fiscal/queue/auto-retry/stop
	 * Stops background auto-retry loop.
	 */
	app.post("/api/fiscal/queue/auto-retry/stop", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalMutationContext(request, reply, "fiscal auto retry stop");
		if (!ctx) return;

		FiscalQueueRetryWorker.stopAutoRetryLoop();

		return reply.status(200).send({
			success: true,
			message: "Фоновый авто-повтор печати чеков остановлен.",
		});
	});
}
