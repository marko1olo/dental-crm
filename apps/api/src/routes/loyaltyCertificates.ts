import {
	generateLuhn16Certificate,
	validateLuhn16Certificate,
} from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireOrganizationId } from "../security/identity.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
	giftCertificates,
	patientInvoices,
	patients,
	payments,
} from "../db/schema.js";

const issueCertificateSchema = z.object({
	purchaserPatientId: z.string().uuid().optional().nullable(),
	purchaserName: z.string().optional().nullable(),
	recipientPatientId: z.string().uuid().optional().nullable(),
	recipientName: z.string().optional().nullable(),
	recipientPhone: z.string().optional().nullable(),
	nominalRub: z.number().positive(),
	expiresInDays: z.number().int().positive().optional().default(365),
	notes: z.string().optional().nullable(),
});

const redeemCertificateSchema = z.object({
	serialNumber: z.string().min(16),
	invoiceId: z.string().uuid().optional().nullable(),
	invoiceAmountRub: z.number().positive(),
	amountToRedeemRub: z.number().positive().optional(),
	patientId: z.string().uuid().optional().nullable(),
	description: z.string().optional(),
});

export async function registerLoyaltyCertificateRoutes(app: FastifyInstance) {
	/**
	 * Выпуск нового подарочного сертификата клиники (16-значный Luhn-серийный номер)
	 * Фискализация аванса по 54-ФЗ (тег 1214) при указании покупателя
	 */
	app.post("/api/loyalty/certificates/issue", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = issueCertificateSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				message: "Некорректные параметры выпуска сертификата",
				errors: parsed.error.format(),
			});
		}

		const {
			purchaserPatientId,
			purchaserName,
			recipientPatientId,
			recipientName,
			recipientPhone,
			nominalRub,
			expiresInDays,
			notes,
		} = parsed.data;

		return withTenantCtx(orgId, async () => {
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + expiresInDays);

			const serialNumber = generateLuhn16Certificate();

			const result = await db.transaction(async (tx) => {
				let resolvedPurchaserName = purchaserName;
				if (purchaserPatientId && !resolvedPurchaserName) {
					const [p] = await tx
						.select({ fullName: patients.fullName })
						.from(patients)
						.where(and(eq(patients.organizationId, orgId), eq(patients.id, purchaserPatientId)))
						.limit(1);
					if (p) resolvedPurchaserName = p.fullName;
				}

				let paymentId: string | null = null;
				if (purchaserPatientId) {
					const [payment] = await tx
						.insert(payments)
						.values({
							organizationId: orgId,
							patientId: purchaserPatientId,
							amountRub: nominalRub,
							method: "card",
							status: "paid",
							paidAt: new Date(),
							note: `Продажа подарочного сертификата ${serialNumber} (тег 1214: Аванс)`,
						})
						.returning({ id: payments.id });
					paymentId = payment?.id ?? null;
				}

				const [created] = await tx
					.insert(giftCertificates)
					.values({
						organizationId: orgId,
						serialNumber,
						nominalRub: String(nominalRub),
						initialBalanceRub: String(nominalRub),
						currentBalanceRub: String(nominalRub),
						purchaserPatientId: purchaserPatientId || null,
						purchaserName: resolvedPurchaserName || null,
						recipientPatientId: recipientPatientId || null,
						recipientName: recipientName || null,
						recipientPhone: recipientPhone || null,
						status: "active",
						expiresAt,
						notes: notes || `Подарочный сертификат на сумму ${nominalRub.toLocaleString("ru-RU")} ₽`,
						relatedPaymentId: paymentId || null,
					})
					.returning();

				return created;
			});

			if (!result) {
				return reply.status(500).send({ message: "Не удалось выпустить сертификат" });
			}

			return reply.status(201).send({
				success: true,
				certificate: {
					id: result.id,
					serialNumber: result.serialNumber,
					nominalRub: Number(result.nominalRub),
					initialBalanceRub: Number(result.initialBalanceRub),
					currentBalanceRub: Number(result.currentBalanceRub),
					nominalKop: Math.round(Number(result.nominalRub) * 100),
					initialBalanceKop: Math.round(Number(result.initialBalanceRub) * 100),
					currentBalanceKop: Math.round(Number(result.currentBalanceRub) * 100),
					purchaserPatientId: result.purchaserPatientId,
					purchaserName: result.purchaserName,
					recipientPatientId: result.recipientPatientId,
					recipientName: result.recipientName,
					recipientPhone: result.recipientPhone,
					status: result.status,
					issuedAtIso: result.issuedAt.toISOString(),
					expiresAtIso: result.expiresAt.toISOString(),
					notes: result.notes,
					relatedPaymentId: result.relatedPaymentId,
				},
			});
		});
	});

	/**
	 * Проверка подлинности и текущего остатка подарочного сертификата
	 */
	app.get("/api/loyalty/certificates/verify/:serial", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const { serial } = request.params as { serial: string };
		const formattedSerial = serial.trim();

		if (!validateLuhn16Certificate(formattedSerial)) {
			return reply.status(400).send({
				valid: false,
				message: "Недействительный 16-значный номер сертификата (ошибка контрольной суммы Luhn)",
			});
		}

		return withTenantCtx(orgId, async () => {
			const cleaned = formattedSerial.replace(/[\s-]/g, "");
			const canonicalFormatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}`;

			const [cert] = await db
				.select()
				.from(giftCertificates)
				.where(
					and(
						eq(giftCertificates.organizationId, orgId),
						sql`REPLACE(REPLACE(${giftCertificates.serialNumber}, '-', ''), ' ', '') = ${cleaned}`,
					),
				)
				.limit(1);

			if (!cert) {
				return reply.status(404).send({
					valid: false,
					message: "Сертификат с указанным номером не найден в базе данных клиники",
				});
			}

			let effectiveStatus = cert.status;
			const isExpired = new Date() > cert.expiresAt;
			if (isExpired && cert.status === "active") {
				effectiveStatus = "expired";
				await db
					.update(giftCertificates)
					.set({ status: "expired", updatedAt: new Date() })
					.where(eq(giftCertificates.id, cert.id));
			}

			return reply.send({
				valid: true,
				certificate: {
					id: cert.id,
					serialNumber: canonicalFormatted,
					nominalRub: Number(cert.nominalRub),
					currentBalanceRub: Number(cert.currentBalanceRub),
					nominalKop: Math.round(Number(cert.nominalRub) * 100),
					currentBalanceKop: Math.round(Number(cert.currentBalanceRub) * 100),
					status: effectiveStatus,
					issuedAtIso: cert.issuedAt.toISOString(),
					expiresAtIso: cert.expiresAt.toISOString(),
					purchaserName: cert.purchaserName,
					recipientName: cert.recipientName,
					recipientPhone: cert.recipientPhone,
					notes: cert.notes,
				},
			});
		});
	});

	/**
	 * Списание средств с подарочного сертификата в счет оплаты лечения
	 * Фискальный зачёт аванса по 54-ФЗ (тег 1215)
	 */
	app.post("/api/loyalty/certificates/redeem", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = redeemCertificateSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				message: "Некорректные параметры списания сертификата",
				errors: parsed.error.format(),
			});
		}

		const {
			serialNumber,
			invoiceId,
			invoiceAmountRub,
			amountToRedeemRub,
			patientId,
			description,
		} = parsed.data;

		if (!validateLuhn16Certificate(serialNumber)) {
			return reply.status(400).send({
				message: "Недействительный номер сертификата (ошибка контрольной суммы Luhn)",
			});
		}

		return withTenantCtx(orgId, async () => {
			const cleaned = serialNumber.replace(/[\s-]/g, "");

			const result = await db.transaction(async (tx) => {
				const [cert] = await tx
					.select()
					.from(giftCertificates)
					.where(
						and(
							eq(giftCertificates.organizationId, orgId),
							sql`REPLACE(REPLACE(${giftCertificates.serialNumber}, '-', ''), ' ', '') = ${cleaned}`,
						),
					)
					.limit(1)
					.for("update");

				if (!cert) {
					return { notFound: true as const, message: "Сертификат не найден" };
				}

				if (cert.status === "depleted") {
					return { error: true as const, message: "Баланс сертификата полностью исчерпан", code: 400 };
				}
				if (cert.status === "cancelled") {
					return { error: true as const, message: "Сертификат аннулирован администрацией клиники", code: 400 };
				}
				if (new Date() > cert.expiresAt) {
					return {
						error: true as const,
						message: `Срок действия сертификата истек ${cert.expiresAt.toISOString().slice(0, 10)}`,
						code: 400,
					};
				}

				const currentBalance = Number(cert.currentBalanceRub);
				if (currentBalance <= 0) {
					return { error: true as const, message: "Баланс сертификата равен 0 ₽", code: 400 };
				}

				const requestedDeduction = amountToRedeemRub !== undefined ? amountToRedeemRub : invoiceAmountRub;
				const redeemedRub = Number(Math.min(currentBalance, requestedDeduction, invoiceAmountRub).toFixed(2));
				const newBalanceRub = Number((currentBalance - redeemedRub).toFixed(2));
				const newStatus = newBalanceRub <= 0 ? "depleted" : "active";

				await tx
					.update(giftCertificates)
					.set({
						currentBalanceRub: String(newBalanceRub),
						status: newStatus,
						updatedAt: new Date(),
					})
					.where(eq(giftCertificates.id, cert.id));

				let paymentId: string | null = null;
				let invoicePaid = false;

				if (invoiceId) {
					const targetPatientId = patientId || cert.recipientPatientId || cert.purchaserPatientId || orgId;
					const [payRecord] = await tx
						.insert(payments)
						.values({
							organizationId: orgId,
							patientId: targetPatientId,
							documentId: invoiceId,
							amountRub: redeemedRub,
							method: "other",
							status: "paid",
							paidAt: new Date(),
							note: description || `Зачёт аванса: подарочный сертификат ${cert.serialNumber} (тег 1215: ${redeemedRub} ₽)`,
						})
						.returning({ id: payments.id });

					paymentId = payRecord?.id ?? null;

					const existingPayments = await tx
						.select({ amountRub: payments.amountRub })
						.from(payments)
						.where(
							and(
								eq(payments.organizationId, orgId),
								eq(payments.documentId, invoiceId),
								eq(payments.status, "paid"),
							),
						);

					const totalPaid = existingPayments.reduce((acc, p) => acc + Number(p.amountRub), 0);
					if (totalPaid >= invoiceAmountRub) {
						await tx
							.update(patientInvoices)
							.set({ status: "paid", paidAt: new Date() })
							.where(and(eq(patientInvoices.organizationId, orgId), eq(patientInvoices.id, invoiceId)));
						invoicePaid = true;
					}
				}

				return {
					success: true as const,
					certificateId: cert.id,
					serialNumber: cert.serialNumber,
					previousBalanceRub: currentBalance,
					redeemedAmountRub: redeemedRub,
					newBalanceRub,
					remainingInvoiceAmountRub: Number(Math.max(0, invoiceAmountRub - redeemedRub).toFixed(2)),
					status: newStatus,
					paymentId,
					invoicePaid,
					fiscal54FzSplit: {
						tag1215AdvanceOffsetKop: Math.round(redeemedRub * 100),
						tag1081ElectronicKop: Math.round(Math.max(0, invoiceAmountRub - redeemedRub) * 100),
					},
				};
			});

			if ("notFound" in result) {
				return reply.status(404).send({ message: result.message });
			}
			if ("error" in result) {
				return reply.status(result.code ?? 400).send({ message: result.message });
			}

			return reply.status(200).send(result);
		});
	});

	/**
	 * Журнал выпущенных подарочных сертификатов клиники
	 */
	app.get("/api/loyalty/certificates/list", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		return withTenantCtx(orgId, async () => {
			const rows = await db
				.select()
				.from(giftCertificates)
				.where(eq(giftCertificates.organizationId, orgId))
				.orderBy(desc(giftCertificates.createdAt))
				.limit(100);

			return reply.send({
				certificates: rows.map((r) => ({
					id: r.id,
					serialNumber: r.serialNumber,
					nominalRub: Number(r.nominalRub),
					currentBalanceRub: Number(r.currentBalanceRub),
					nominalKop: Math.round(Number(r.nominalRub) * 100),
					currentBalanceKop: Math.round(Number(r.currentBalanceRub) * 100),
					purchaserName: r.purchaserName,
					recipientName: r.recipientName,
					recipientPhone: r.recipientPhone,
					status: r.status,
					issuedAtIso: r.issuedAt.toISOString(),
					expiresAtIso: r.expiresAt.toISOString(),
					notes: r.notes,
				})),
			});
		});
	});
}
