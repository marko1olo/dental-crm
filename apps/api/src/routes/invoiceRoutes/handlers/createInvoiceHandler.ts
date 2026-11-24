import { randomUUID } from "node:crypto";
import {
	basisPointsFromPercent,
	kopecksToRubles,
	percentageOfKopecks,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { invoiceItems, patientInvoices } from "../../../db/schema/billing.js";
import { treatmentItems } from "../../../db/schema/clinical.js";
import { patients } from "../../../db/schema/patients.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { formatInvoiceNumber } from "../invoiceCalculationHelpers.js";
import { createInvoiceSchema, type CreateInvoiceInput } from "../types.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/invoices, /api/v1/billing/invoices, /api/visits/:visitId/invoice
 * Создание счёта по факту завершённого клинического приёма с сохранением в PostgreSQL 18.
 */
export async function handleCreateInvoice(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	if (reply.sent) return;
	const context = await requireClinicalMutationContext(
		request,
		reply,
		"create invoice",
	);
	if (!context) return;
	const orgId = context.organizationId;

	const params = (request.params as { visitId?: string } | undefined) ?? {};
	const body = (request.body as Record<string, unknown> | undefined) ?? {};

	const visitIdFromParam = params.visitId && UUID_PATTERN.test(params.visitId.trim())
		? params.visitId.trim()
		: undefined;
	if (params.visitId !== undefined && !visitIdFromParam) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор приёма (ожидается UUID).",
		});
	}

	const parsed = createInvoiceSchema.safeParse({
		...body,
		visitId: body.visitId ?? visitIdFromParam,
	});

	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры создания счёта.",
			details: parsed.error.issues,
		});
	}

	const data: CreateInvoiceInput = parsed.data;
	const effectiveVisitId = data.visitId ?? visitIdFromParam ?? null;

	// Расчёт позиций и итоговой суммы строго в целочисленных копейках
	let totalItemsNetKopecks = BigInt(0);
	const preparedItems = data.items.map((item, idx) => {
		const qty = Math.max(1, Math.round(item.quantity ?? 1));
		let unitKopecks = BigInt(0);

		if (item.priceKopecks !== null && item.priceKopecks !== undefined) {
			unitKopecks = BigInt(Math.max(0, item.priceKopecks));
		} else if (item.unitPriceRub !== null && item.unitPriceRub !== undefined) {
			unitKopecks = BigInt(Math.max(0, rublesToKopecks(item.unitPriceRub)));
		} else if (item.priceRub !== null && item.priceRub !== undefined) {
			unitKopecks = BigInt(Math.max(0, rublesToKopecks(item.priceRub)));
		}

		const grossLineKopecks = unitKopecks * BigInt(qty);
		let itemDiscountKopecks = BigInt(0);

		if (item.discountPercent && item.discountPercent > 0) {
			const basisPoints = basisPointsFromPercent(Math.min(100, Math.max(0, item.discountPercent)));
			itemDiscountKopecks = BigInt(percentageOfKopecks(Number(grossLineKopecks), basisPoints));
		} else if (item.discountRub && item.discountRub > 0) {
			itemDiscountKopecks = BigInt(Math.max(0, rublesToKopecks(item.discountRub)));
		}

		if (itemDiscountKopecks > grossLineKopecks) {
			itemDiscountKopecks = grossLineKopecks;
		}

		const netLineKopecks = grossLineKopecks - itemDiscountKopecks;
		totalItemsNetKopecks += netLineKopecks;

		const title =
			item.serviceName?.trim() ||
			item.title?.trim() ||
			item.nameRu?.trim() ||
			`Стоматологическая услуга #${idx + 1}`;

		const toothCode =
			item.toothCode?.trim() ||
			(item.toothNumber !== null && item.toothNumber !== undefined
				? String(item.toothNumber).trim()
				: null);

		const serviceId =
			item.serviceId && UUID_PATTERN.test(item.serviceId.trim())
				? item.serviceId.trim()
				: null;

		return {
			serviceId,
			serviceCode: item.serviceCode?.trim() || item.code804n?.trim() || serviceId || null,
			toothCode,
			title,
			quantity: qty,
			unitKopecks: Number(unitKopecks),
			netLineKopecks: Number(netLineKopecks),
			discountPercent: item.discountPercent ?? 0,
			unitPriceRub: kopecksToRubles(unitKopecks),
			discountRub: kopecksToRubles(itemDiscountKopecks),
			priceRub: kopecksToRubles(netLineKopecks),
		};
	});

	let finalNetKopecks = BigInt(0);
	if (data.totalAmountKopecks !== undefined && data.totalAmountKopecks !== null) {
		finalNetKopecks = BigInt(Math.max(0, data.totalAmountKopecks));
	} else if (data.totalAmountRub !== undefined && data.totalAmountRub !== null) {
		finalNetKopecks = BigInt(Math.max(0, rublesToKopecks(data.totalAmountRub)));
	} else if (preparedItems.length > 0) {
		let invoiceDiscountKopecks = BigInt(0);
		if (data.discountPercent > 0) {
			const basisPoints = basisPointsFromPercent(Math.min(100, Math.max(0, data.discountPercent)));
			invoiceDiscountKopecks = BigInt(percentageOfKopecks(Number(totalItemsNetKopecks), basisPoints));
		} else if (data.discountRub > 0) {
			invoiceDiscountKopecks = BigInt(Math.max(0, rublesToKopecks(data.discountRub)));
		}
		finalNetKopecks =
			totalItemsNetKopecks > invoiceDiscountKopecks
				? totalItemsNetKopecks - invoiceDiscountKopecks
				: BigInt(0);
	}

	const totalAmountRub = kopecksToRubles(finalNetKopecks);
	const invoiceId = randomUUID();
	const invoiceStatus = data.status ?? "issued";
	const now = new Date();

	// Устранение TOCTOU-гонки: единая транзакция с advisory lock по visitId
	const result = await withTenantCtx(orgId, async (tx) => {
		if (effectiveVisitId) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':invoice_visit:' || ${effectiveVisitId}))`,
			);
		}

		// 1. Проверяем существование пациента
		const [patient] = await tx
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(
				and(
					eq(patients.id, data.patientId),
					eq(patients.organizationId, orgId),
				),
			)
			.limit(1);

		if (!patient) {
			return { kind: "patient_not_found" as const };
		}

		// 2. Идемпотентность: проверяем наличие открытого счёта по visitId
		if (effectiveVisitId) {
			const [existingInvoice] = await tx
				.select()
				.from(patientInvoices)
				.where(
					and(
						eq(patientInvoices.organizationId, orgId),
						eq(patientInvoices.visitId, effectiveVisitId),
						inArray(patientInvoices.status, ["draft", "issued"]),
					),
				)
				.for("update")
				.limit(1);

			if (existingInvoice) {
				const year = existingInvoice.createdAt
					? new Date(existingInvoice.createdAt).getFullYear()
					: new Date().getFullYear();
				const invoiceNumber = `СЧ-${year}-${existingInvoice.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

				const existingItemsRows = await tx
					.select()
					.from(invoiceItems)
					.where(
						and(
							eq(invoiceItems.organizationId, orgId),
							eq(invoiceItems.invoiceId, existingInvoice.id),
						),
					);

				const existingItems = existingItemsRows.map((it) => ({
					id: it.id,
					serviceId: it.priceListItemId || it.serviceCode || undefined,
					serviceCode: it.serviceCode || undefined,
					code: it.serviceCode || undefined,
					toothCode: it.toothCode,
					toothNumber: it.toothCode ? Number(it.toothCode) || undefined : undefined,
					title: it.name,
					name: it.name,
					quantity: Number(it.quantity) || 1,
					unitPriceRub: kopecksToRubles(it.unitPriceKopecks),
					priceRub: kopecksToRubles(it.totalPriceKopecks),
					discountRub: 0,
					totalAmountRub: kopecksToRubles(it.totalPriceKopecks),
				}));

				return {
					kind: "idempotent_existing" as const,
					invoice: existingInvoice,
					invoiceNumber,
					patientName: patient.fullName,
					items: existingItems,
				};
			}
		}

		// 3. Создаем новый счет
		await tx.insert(patientInvoices).values({
			id: invoiceId,
			organizationId: orgId,
			patientId: data.patientId,
			visitId: effectiveVisitId,
			totalRub: String(totalAmountRub),
			totalAmountRub,
			totalPriceKopecks: finalNetKopecks,
			status: invoiceStatus,
			issuedAt: now,
			createdAt: now,
		});

		let insertedItems: Array<typeof invoiceItems.$inferSelect> = [];
		if (preparedItems.length > 0) {
			const itemsToInsert = preparedItems.map((it) => ({
				organizationId: orgId,
				invoiceId: invoiceId,
				priceListItemId: it.serviceId || null,
				name: it.title,
				quantity: String(it.quantity),
				unitPriceKopecks: it.unitKopecks,
				discountPercent: String(it.discountPercent),
				totalPriceKopecks: it.netLineKopecks,
				serviceCode: it.serviceCode || it.serviceId || null,
				toothCode: it.toothCode || null,
			}));

			insertedItems = await tx.insert(invoiceItems).values(itemsToInsert).returning();

			if (effectiveVisitId) {
				const itemNotes = data.notes
					? `${data.notes} | Счёт ${invoiceId}`
					: `Счёт ${invoiceId}`;
				const treatmentItemsToInsert = preparedItems.map((it) => ({
					organizationId: orgId,
					patientId: data.patientId,
					visitId: effectiveVisitId,
					serviceId: it.serviceId,
					toothCode: it.toothCode,
					title: it.title,
					quantity: String(it.quantity),
					unitPriceRub: it.unitPriceRub,
					priceRub: it.priceRub,
					discountRub: it.discountRub,
					status: invoiceStatus === "draft" ? ("proposed" as const) : ("completed" as const),
					plannedDoctorUserId: data.doctorId ?? null,
					notes: itemNotes,
				}));
				await tx.insert(treatmentItems).values(treatmentItemsToInsert);
			}
		}

		return {
			kind: "created" as const,
			patientName: patient.fullName,
			insertedItems,
		};
	});

	if (result.kind === "patient_not_found") {
		return reply.code(404).send({
			error: "PatientNotFound",
			message: `Пациент с ID '${data.patientId}' не найден в текущей организации.`,
		});
	}

	if (result.kind === "idempotent_existing") {
		const responsePayload = {
			success: true,
			idempotent: true,
			invoice: {
				id: result.invoice.id,
				number: result.invoiceNumber,
				invoiceNumber: result.invoiceNumber,
				patientId: result.invoice.patientId,
				patientName: result.patientName,
				visitId: result.invoice.visitId,
				totalAmountRub: Number(result.invoice.totalAmountRub),
				status: result.invoice.status,
				issuedAt: result.invoice.issuedAt?.toISOString() || null,
				createdAt: result.invoice.createdAt.toISOString(),
				items: result.items,
			},
			items: result.items,
			itemsCount: result.items.length,
		};

		return reply.code(200).send(responsePayload);
	}

	const year = now.getFullYear();
	const generatedNumber = formatInvoiceNumber(data.documentType ?? "invoice", data.patientId);
	const invoiceNumber = generatedNumber || `СЧ-${year}-${invoiceId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

	const returnedItems = result.insertedItems.map((it, idx) => {
		const prep = preparedItems[idx];
		return {
			id: it.id,
			serviceId: it.priceListItemId || it.serviceCode || prep?.serviceId || undefined,
			serviceCode: it.serviceCode || prep?.serviceId || undefined,
			code: it.serviceCode || prep?.serviceId || undefined,
			toothCode: it.toothCode ?? prep?.toothCode ?? null,
			toothNumber: it.toothCode
				? Number(it.toothCode) || undefined
				: prep?.toothCode
					? Number(prep.toothCode) || undefined
					: undefined,
			title: it.name,
			name: it.name,
			quantity: Number(it.quantity) || prep?.quantity || 1,
			unitPriceRub: kopecksToRubles(it.unitPriceKopecks),
			priceRub: kopecksToRubles(it.totalPriceKopecks),
			discountRub: prep?.discountRub ?? 0,
			totalAmountRub: kopecksToRubles(it.totalPriceKopecks),
		};
	});

	try {
		wsBroker.broadcastToOrganization(orgId, {
			type: "INVOICE_CREATED",
			payload: {
				invoiceId,
				invoiceNumber,
				patientId: data.patientId,
				patientName: result.patientName,
				visitId: effectiveVisitId,
				totalAmountRub,
				status: invoiceStatus,
			},
		});
	} catch (wsErr) {
		request.log.warn({ err: wsErr }, "WebSocket broadcast failed for INVOICE_CREATED");
	}

	const responsePayload = {
		success: true,
		invoice: {
			id: invoiceId,
			number: invoiceNumber,
			invoiceNumber,
			patientId: data.patientId,
			patientName: result.patientName,
			visitId: effectiveVisitId,
			totalAmountRub,
			totalAmountKopecks: Number(finalNetKopecks),
			status: invoiceStatus,
			issuedAt: now.toISOString(),
			createdAt: now.toISOString(),
			items: returnedItems,
		},
		items: returnedItems,
		itemsCount: returnedItems.length,
	};

	return reply.code(201).send(responsePayload);
}
