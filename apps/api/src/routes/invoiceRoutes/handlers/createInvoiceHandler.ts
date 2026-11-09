import { randomUUID } from "node:crypto";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { withTenantCtx } from "../../../db/rls.js";
import { patientInvoices } from "../../../db/schema/billing.js";
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

	// Проверяем существование пациента
	const [patient] = await db
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
		return reply.code(404).send({
			error: "PatientNotFound",
			message: `Пациент с ID '${data.patientId}' не найден в текущей организации.`,
		});
	}

	// Идемпотентность: проверяем наличие открытого счёта по visitId
	if (effectiveVisitId) {
		const [existingInvoice] = await db
			.select()
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.organizationId, orgId),
					eq(patientInvoices.visitId, effectiveVisitId),
					inArray(patientInvoices.status, ["draft", "issued"]),
				),
			)
			.limit(1);

		if (existingInvoice) {
			const year = existingInvoice.createdAt
				? new Date(existingInvoice.createdAt).getFullYear()
				: new Date().getFullYear();
			const invoiceNumber = `СЧ-${year}-${existingInvoice.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

			const existingTreatmentItems = await db
				.select()
				.from(treatmentItems)
				.where(
					and(
						eq(treatmentItems.organizationId, orgId),
						or(
							effectiveVisitId ? eq(treatmentItems.visitId, effectiveVisitId) : sql`FALSE`,
							sql`${treatmentItems.notes} LIKE ${`%${existingInvoice.id}%`}`,
						),
					),
				);

			const existingItems = existingTreatmentItems.map((it) => ({
				id: it.id,
				serviceId: it.serviceId,
				serviceCode: it.serviceId || undefined,
				code: it.serviceId || undefined,
				toothCode: it.toothCode,
				toothNumber: it.toothCode ? Number(it.toothCode) || undefined : undefined,
				title: it.title,
				name: it.title,
				quantity: Number(it.quantity) || 1,
				unitPriceRub: Number(it.unitPriceRub) || Number(it.priceRub) || 0,
				priceRub: Number(it.priceRub) || 0,
				discountRub: Number(it.discountRub) || 0,
				totalAmountRub: Number(it.priceRub) || 0,
			}));

			return reply.code(200).send({
				success: true,
				idempotent: true,
				invoice: {
					id: existingInvoice.id,
					number: invoiceNumber,
					invoiceNumber,
					patientId: existingInvoice.patientId,
					patientName: patient.fullName,
					visitId: existingInvoice.visitId,
					totalAmountRub: Number(existingInvoice.totalAmountRub),
					status: existingInvoice.status,
					issuedAt: existingInvoice.issuedAt?.toISOString() || null,
					createdAt: existingInvoice.createdAt.toISOString(),
					items: existingItems,
				},
				items: existingItems,
				itemsCount: existingItems.length,
			});
		}
	}

	// Расчёт позиций и итоговой суммы строго в целочисленных копейках
	let totalItemsNetKopecks = BigInt(0);
	const preparedItems = data.items.map((item, idx) => {
		const qty = Math.max(1, Math.round(item.quantity ?? 1));
		let unitKopecks = BigInt(0);

		if (item.priceKopecks !== null && item.priceKopecks !== undefined) {
			unitKopecks = BigInt(Math.max(0, item.priceKopecks));
		} else if (item.unitPriceRub !== null && item.unitPriceRub !== undefined) {
			unitKopecks = BigInt(Math.max(0, Math.round(item.unitPriceRub * 100)));
		} else if (item.priceRub !== null && item.priceRub !== undefined) {
			unitKopecks = BigInt(Math.max(0, Math.round(item.priceRub * 100)));
		}

		const grossLineKopecks = unitKopecks * BigInt(qty);
		let itemDiscountKopecks = BigInt(0);

		if (item.discountPercent && item.discountPercent > 0) {
			const pctClamped = Math.min(100, Math.max(0, item.discountPercent));
			itemDiscountKopecks = (grossLineKopecks * BigInt(Math.round(pctClamped * 100))) / BigInt(10000);
		} else if (item.discountRub && item.discountRub > 0) {
			itemDiscountKopecks = BigInt(Math.max(0, Math.round(item.discountRub * 100)));
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
			toothCode,
			title,
			quantity: qty,
			unitPriceRub: Number((Number(unitKopecks) / 100).toFixed(2)),
			discountRub: Number((Number(itemDiscountKopecks) / 100).toFixed(2)),
			priceRub: Number((Number(netLineKopecks) / 100).toFixed(2)),
		};
	});

	let finalNetKopecks = BigInt(0);
	if (data.totalAmountKopecks !== undefined && data.totalAmountKopecks !== null) {
		finalNetKopecks = BigInt(Math.max(0, data.totalAmountKopecks));
	} else if (data.totalAmountRub !== undefined && data.totalAmountRub !== null) {
		finalNetKopecks = BigInt(Math.max(0, Math.round(data.totalAmountRub * 100)));
	} else if (preparedItems.length > 0) {
		finalNetKopecks = totalItemsNetKopecks;
	}

	const totalAmountRub = Number((Number(finalNetKopecks) / 100).toFixed(2));
	const invoiceId = randomUUID();
	const invoiceStatus = data.status ?? "issued";
	const now = new Date();

	await withTenantCtx(orgId, async (tx) => {
		await tx.insert(patientInvoices).values({
			id: invoiceId,
			organizationId: orgId,
			patientId: data.patientId,
			visitId: effectiveVisitId,
			totalRub: String(totalAmountRub),
			totalAmountRub,
			status: invoiceStatus,
			issuedAt: now,
			createdAt: now,
		});

		if (preparedItems.length > 0) {
			for (const it of preparedItems) {
				const itemNotes = data.notes
					? `${data.notes} | Счёт ${invoiceId}`
					: `Счёт ${invoiceId}`;
				await tx.insert(treatmentItems).values({
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
					status: "completed",
					plannedDoctorUserId: data.doctorId ?? null,
					notes: itemNotes,
				});
			}
		}
	});

	const year = now.getFullYear();
	const generatedNumber = formatInvoiceNumber(data.documentType ?? "invoice", data.patientId);
	const invoiceNumber = generatedNumber || `СЧ-${year}-${invoiceId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

	const returnedItems = preparedItems.map((it, idx) => ({
		id: `inv-item-${invoiceId.slice(0, 8)}-${idx + 1}`,
		serviceId: it.serviceId,
		serviceCode: it.serviceId || undefined,
		code: it.serviceId || undefined,
		toothCode: it.toothCode,
		toothNumber: it.toothCode ? Number(it.toothCode) || undefined : undefined,
		title: it.title,
		name: it.title,
		quantity: it.quantity,
		unitPriceRub: it.unitPriceRub,
		priceRub: it.priceRub,
		discountRub: it.discountRub,
		totalAmountRub: it.priceRub,
	}));

	try {
		wsBroker.broadcastToOrganization(orgId, {
			type: "INVOICE_CREATED",
			payload: {
				invoiceId,
				invoiceNumber,
				patientId: data.patientId,
				patientName: patient.fullName,
				visitId: effectiveVisitId,
				totalAmountRub,
				status: invoiceStatus,
			},
		});
	} catch (wsErr) {
		request.log.warn({ err: wsErr }, "WebSocket broadcast failed for INVOICE_CREATED");
	}

	return reply.code(201).send({
		success: true,
		invoice: {
			id: invoiceId,
			number: invoiceNumber,
			invoiceNumber,
			patientId: data.patientId,
			patientName: patient.fullName,
			visitId: effectiveVisitId,
			totalAmountRub,
			status: invoiceStatus,
			issuedAt: now.toISOString(),
			createdAt: now.toISOString(),
			items: returnedItems,
		},
		items: returnedItems,
		itemsCount: returnedItems.length,
	});
}
