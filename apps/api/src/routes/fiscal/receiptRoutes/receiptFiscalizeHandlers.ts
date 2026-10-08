/**
 * receiptFiscalizeHandlers.ts — Layer 2: 54-FZ Fiscal Receipt Printing, LAN KKT Execution & Cash Register Ledger.
 *
 * Handles:
 * - Direct LAN KKT communication (ATOL / Shtrikh-M)
 * - Composite Idempotency-Key (<uuid>#<sha256(payload)>) with atomic PostgreSQL advisory locking
 * - 100% warranty discount / 0.00 ₽ internal warranty acts (Mandate 8e)
 * - Hardware offline buffering into fiscalReceiptQueue without blocking clinical checkout
 * - Cash box balance and shift totals mutation
 */

import {
	buildFiscalReceiptPayloadSignature,
	createFiscalReceiptPayloadSchema,
	kopecksToNumericString,
	kopecksToRub,
	parseKopecks,
	verifyFiscalCompositeIdempotencyKey,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	fiscalReceiptQueue,
	patients,
} from "../../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../../db/seeds/seed_cash_and_reasons.js";
import { FiscalReceiptFactory } from "../../../services/kkt/FiscalReceiptFactory.js";
import { LanKktDriverService } from "../../../services/hardware/index.js";
import type { ApplyCashBoxReceiptParams, PrintResultMetadata } from "./types.js";
import { verifyAndEnforceCatalogPrices } from "./receiptDraftHandlers.js";

export async function applyCashBoxFiscalReceipt(
	tx: any,
	orgId: string,
	data: ApplyCashBoxReceiptParams,
	printResult: PrintResultMetadata,
): Promise<void> {
	await ensureOrganizationCashBoxes(tx, orgId);
	const allBoxes = await tx
		.select()
		.from(cashBoxes)
		.where(eq(cashBoxes.organizationId, orgId))
		.for("update");

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
		const balanceBeforeKop = parseKopecks(chosenBox.balanceRub);
		const balanceAfterKop = balanceBeforeKop + totalInflowKop;
		const balanceBefore = kopecksToRub(balanceBeforeKop);
		const balanceAfter = kopecksToRub(balanceAfterKop);

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: sql`round((${cashBoxes.balanceRub} + ${amountRub})::numeric, 2)`,
				updatedAt: new Date(),
			})
			.where(and(eq(cashBoxes.id, chosenBox.id), eq(cashBoxes.organizationId, orgId)));

		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.organizationId, orgId),
					eq(cashBoxShifts.cashBoxId, chosenBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.for("update")
			.limit(1);

		if (activeShift && amountRub > 0) {
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: sql`round((${cashBoxShifts.incomeTotalRub} + ${amountRub})::numeric, 2)`,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
		}

		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: chosenBox.id,
			shiftId: activeShift?.id ?? null,
			operationType: "income",
			amountRub,
			balanceBeforeRub: balanceBefore,
			balanceAfterRub: balanceAfter,
			reasonText:
				data.totalKopecks === 0
					? "Акт гарантийного обслуживания / списания услуг (скидка 100%, 0.00 ₽)"
					: `Фискальный чек 54-ФЗ №${printResult.fiscalDocumentNumber || "б/н"}`,
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
		const balanceBeforeKop = parseKopecks(mainBox.balanceRub);
		const balanceAfterKop = balanceBeforeKop + cashKop;
		const balanceBefore = kopecksToRub(balanceBeforeKop);
		const balanceAfter = kopecksToRub(balanceAfterKop);

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: sql`round((${cashBoxes.balanceRub} + ${amountRub})::numeric, 2)`,
				updatedAt: new Date(),
			})
			.where(and(eq(cashBoxes.id, mainBox.id), eq(cashBoxes.organizationId, orgId)));

		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.organizationId, orgId),
					eq(cashBoxShifts.cashBoxId, mainBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.for("update")
			.limit(1);

		if (activeShift && amountRub > 0) {
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: sql`round((${cashBoxShifts.incomeTotalRub} + ${amountRub})::numeric, 2)`,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
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
		const balanceBeforeKop = parseKopecks(cashlessBox.balanceRub);
		const balanceAfterKop = balanceBeforeKop + electronicKop;
		const balanceBefore = kopecksToRub(balanceBeforeKop);
		const balanceAfter = kopecksToRub(balanceAfterKop);

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: sql`round((${cashBoxes.balanceRub} + ${amountRub})::numeric, 2)`,
				updatedAt: new Date(),
			})
			.where(and(eq(cashBoxes.id, cashlessBox.id), eq(cashBoxes.organizationId, orgId)));

		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.organizationId, orgId),
					eq(cashBoxShifts.cashBoxId, cashlessBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.for("update")
			.limit(1);

		if (activeShift && amountRub > 0) {
			await tx
				.update(cashBoxShifts)
				.set({
					incomeTotalRub: sql`round((${cashBoxShifts.incomeTotalRub} + ${amountRub})::numeric, 2)`,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
		}

		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: cashlessBox.id,
			shiftId: activeShift?.id ?? null,
			operationType: "income",
			amountRub,
			balanceBeforeRub: balanceBefore,
			balanceAfterRub: balanceAfter,
			reasonText:
				data.totalKopecks === 0
					? "Акт гарантийного обслуживания / списания услуг (скидка 100%, 0.00 ₽)"
					: `Фискальный чек 54-ФЗ (безналичные) №${printResult.fiscalDocumentNumber || "б/н"}`,
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

/**
 * POST /api/fiscal/receipts & POST /api/finance/receipts
 * Creates, validates, and prints 54-FZ FFD 1.2 receipt via direct LAN KKT.
 * Enforces composite Idempotency-Key (<uuid>#<sha256(payload)>) to guarantee strictly single execution in PostgreSQL.
 * If KKT is offline or out of paper, buffers receipt in fiscal_receipt_queue without blocking checkout.
 */
export async function handleFiscalReceipt(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
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

	const verification = await verifyAndEnforceCatalogPrices(orgId, data.items);
	if (!verification.success) {
		return reply.status(verification.statusCode).send(verification.response);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 54-FZ & FFD 1.2: 100% WARRANTY DISCOUNT / 0.00 ₽ INTERNAL ACT (MANDATE 8E)
	// Zero-total receipts must NEVER be sent to physical KKT (causes hardware errors).
	// An internal statutory warranty/write-off act is generated instead.
	// ─────────────────────────────────────────────────────────────────────────
	if (data.totalKopecks === 0) {
		const now = new Date();
		const actNumber = `АКТ-ГАР-${now.getFullYear()}-${Date.now().toString().slice(-4)}`;
		const compiled = FiscalReceiptFactory.buildFfd12Receipt(data);
		const payloadToStore: Record<string, unknown> = {
			...compiled,
			clientMutationId: data.clientMutationId ?? null,
			isWarrantyZeroAct: true,
			warrantyActNumber: actNumber,
			receiptNumber: actNumber,
			fnSerial: "0000000000000000",
			fiscalDocumentNumber: "0",
			fiscalSign: "0000000000",
			ofdVerificationUrl: "",
			qrString: null,
			receiptIssuedAt: now.toISOString(),
		};

		return await withTenantCtx(orgId, async (tx) => {
			if (data.clientMutationId && data.clientMutationId.trim().length > 0) {
				const mutationId = data.clientMutationId.trim();
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
					return reply.status(200).send({
						success: true,
						replayed: true,
						isWarrantyZeroAct: true,
						warrantyActNumber: (storedPayload["warrantyActNumber"] as string) || actNumber,
						queueId: existingRow.id,
						status: existingRow.status,
						fnSerial: "0000000000000000",
						fiscalDocumentNumber: "0",
						fiscalSign: "0000000000",
						receiptIssuedAt: existingRow.printedAt
							? existingRow.printedAt.toISOString()
							: existingRow.createdAt.toISOString(),
						ofdVerificationUrl: "",
						qrString: null,
						compiledReceipt: storedPayload,
						hardwareWarning: null,
					});
				}
			}

			const [queueRow] = await tx
				.insert(fiscalReceiptQueue)
				.values({
					organizationId: orgId,
					visitId: data.visitId || null,
					receiptType: "warranty_act",
					status: "printed",
					payloadJson: payloadToStore,
					lastError: null,
					retryCount: 0,
					printedAt: now,
				})
				.returning();

			await applyCashBoxFiscalReceipt(tx, orgId, data, {
				fiscalDocumentNumber: "0",
				ofdVerificationUrl: "",
			});

			return reply.status(201).send({
				success: true,
				replayed: false,
				isWarrantyZeroAct: true,
				warrantyActNumber: actNumber,
				queueId: queueRow?.id,
				status: "printed",
				fnSerial: "0000000000000000",
				fiscalDocumentNumber: "0",
				fiscalSign: "0000000000",
				receiptIssuedAt: now.toISOString(),
				ofdVerificationUrl: "",
				qrString: null,
				compiledReceipt: compiled,
				hardwareWarning: null,
			});
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// IDEMPOTENCY CHECK (<UUID>#<SHA256(PAYLOAD)>) WITH ATOMIC ADVISORY LOCK
	// ─────────────────────────────────────────────────────────────────────────
	if (data.clientMutationId && data.clientMutationId.trim().length > 0) {
		const mutationId = data.clientMutationId.trim();

		return await withTenantCtx(orgId, async (tx) => {
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

	return await withTenantCtx(orgId, async (tx) => {
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
}
