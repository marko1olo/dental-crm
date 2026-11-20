/**
 * apps/api/src/routes/loyaltyModules/certificateRedemption.ts
 *
 * Statutory 54-FZ Gift Certificate Redemption & Journal Listing.
 * Mandate 8b Sweet Spot Architecture (<= 250 lines).
 */

import {
	parseKopecks,
	kopecksToNumericString,
	type RedeemCertificateBody,
} from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	cashBoxes,
	cashOperations,
	fiscalReceiptQueue,
	giftCertificates,
	patientInvoices,
	payments,
} from "../../db/schema.js";
import type { FormattedCertificateDto, RedeemCertificateResult } from "./certificateTypes.js";

/**
 * Списание средств с подарочного сертификата в счет оплаты лечения.
 * Фискальный зачёт аванса по 54-ФЗ (тег 1215). Метод оплаты: "certificate".
 */
export async function executeRedeemGiftCertificate(
	orgId: string,
	data: RedeemCertificateBody,
): Promise<RedeemCertificateResult> {
	const {
		serialNumber,
		invoiceId,
		invoiceAmountRub,
		amountToRedeemRub,
		amountKopecks,
		patientId,
		description,
	} = data;

	const cleaned = serialNumber.replace(/[\s-]/g, "");

	return db.transaction(async (tx) => {
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
			return { notFound: true, message: "Сертификат не найден" };
		}

		if (cert.status === "depleted") {
			return { error: true, message: "Баланс сертификата полностью исчерпан", code: 400 };
		}
		if (cert.status === "cancelled") {
			return { error: true, message: "Сертификат аннулирован администрацией клиники", code: 400 };
		}
		if (new Date() > cert.expiresAt) {
			return {
				error: true,
				message: `Срок действия сертификата истек ${cert.expiresAt.toISOString().slice(0, 10)}`,
				code: 400,
			};
		}

		const currentBalanceKop = parseKopecks(cert.currentBalanceRub);
		if (currentBalanceKop <= 0) {
			return { error: true, message: "Баланс сертификата равен 0 ₽", code: 400 };
		}

		const invoiceAmountKop = parseKopecks(invoiceAmountRub);
		const requestedDeductionKop =
			amountKopecks !== undefined
				? amountKopecks
				: amountToRedeemRub !== undefined
					? parseKopecks(amountToRedeemRub)
					: invoiceAmountKop;

		const redeemedKop = Math.min(currentBalanceKop, requestedDeductionKop, invoiceAmountKop);
		const redeemedRub = Number(kopecksToNumericString(redeemedKop));
		const newBalanceKop = Math.max(0, currentBalanceKop - redeemedKop);
		const newBalanceStr = kopecksToNumericString(newBalanceKop);
		const newBalanceRub = Number(newBalanceStr);
		const newStatus = newBalanceKop <= 0 ? "depleted" : "active";

		await tx
			.update(giftCertificates)
			.set({
				currentBalanceRub: newBalanceStr,
				status: newStatus,
				updatedAt: new Date(),
			})
			.where(eq(giftCertificates.id, cert.id));

		let paymentId: string | null = null;
		let invoicePaid = false;

		if (invoiceId) {
			let targetPatientId = patientId || cert.recipientPatientId || cert.purchaserPatientId || null;
			if (!targetPatientId) {
				const [invoice] = await tx
					.select({ patientId: patientInvoices.patientId })
					.from(patientInvoices)
					.where(and(eq(patientInvoices.organizationId, orgId), eq(patientInvoices.id, invoiceId)))
					.limit(1);
				if (invoice?.patientId) {
					targetPatientId = invoice.patientId;
				}
			}

			if (!targetPatientId) {
				return {
					error: true,
					message: "Не удалось определить пациента для проведения платежа по счёту",
					code: 400,
				};
			}

			// Проводка платежа: метод строго канонический "certificate" (SEV-1)
			const [payRecord] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: targetPatientId,
					documentId: invoiceId,
					amountRub: redeemedRub,
					method: "certificate",
					status: "paid",
					paidAt: new Date(),
					note: description || `Зачёт аванса: подарочный сертификат ${cert.serialNumber} (тег 1215: ${redeemedRub} ₽)`,
				})
				.returning({ id: payments.id });

			paymentId = payRecord?.id ?? null;

			// Проводка зачета аванса по сертификату в кассовый журнал
			const [cashDeskBox] = await tx
				.select()
				.from(cashBoxes)
				.where(eq(cashBoxes.organizationId, orgId))
				.limit(1);

			if (cashDeskBox) {
				await tx.insert(cashOperations).values({
					organizationId: orgId,
					cashBoxId: cashDeskBox.id,
					operationType: "income",
					amountRub: redeemedRub,
					balanceBeforeRub: cashDeskBox.balanceRub || 0,
					balanceAfterRub: cashDeskBox.balanceRub || 0,
					patientId: targetPatientId,
					kkmDocNumber: `CERT-${Date.now().toString().slice(-6)}`,
					reasonText: `Зачёт аванса (сертификат №${cert.serialNumber}): оплата стоматологических услуг`,
					operatorName: "Администратор",
				});
			}

			// Фискализация чека 54-ФЗ (тег 1215: зачет аванса, метод "certificate", SEV-1)
			await tx.insert(fiscalReceiptQueue).values({
				organizationId: orgId,
				paymentId: payRecord?.id,
				receiptType: "income",
				status: "pending_print",
				payloadJson: {
					amountRub: redeemedRub,
					amountKopecks: Number(redeemedKop),
					method: "certificate",
					advanceOffsetRub: redeemedRub,
					certificateOffsetRub: redeemedRub,
					certificateNumber: cert.serialNumber,
					fiscalReceiptNumber: `CERT-${Date.now().toString().slice(-6)}`,
					patientId: targetPatientId,
					invoiceId: invoiceId || null,
					note: `Зачёт аванса: подарочный сертификат ${cert.serialNumber} (тег 1215)`,
				},
				retryCount: 0,
			});

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

			const totalPaidKop = existingPayments.reduce((acc, p) => acc + parseKopecks(p.amountRub), 0);
			if (totalPaidKop >= invoiceAmountKop) {
				await tx
					.update(patientInvoices)
					.set({ status: "paid", paidAt: new Date() })
					.where(and(eq(patientInvoices.organizationId, orgId), eq(patientInvoices.id, invoiceId)));
				invoicePaid = true;
			}
		}

		const remainingInvoiceKop = Math.max(0, invoiceAmountKop - redeemedKop);
		const remainingInvoiceAmountRub = Number(kopecksToNumericString(remainingInvoiceKop));

		return {
			success: true,
			certificateId: cert.id,
			serialNumber: cert.serialNumber,
			previousBalanceRub: Number(kopecksToNumericString(currentBalanceKop)),
			redeemedAmountRub: redeemedRub,
			newBalanceRub,
			remainingInvoiceAmountRub,
			status: newStatus,
			paymentId,
			invoicePaid,
			fiscal54FzSplit: {
				tag1215AdvanceOffsetKop: redeemedKop,
				tag1081ElectronicKop: remainingInvoiceKop,
			},
		};
	});
}

/**
 * Получение списка выпущенных сертификатов клиники.
 */
export async function listGiftCertificates(orgId: string): Promise<readonly FormattedCertificateDto[]> {
	const rows = await db
		.select()
		.from(giftCertificates)
		.where(eq(giftCertificates.organizationId, orgId))
		.orderBy(desc(giftCertificates.createdAt))
		.limit(100);

	return rows.map((r) => ({
		id: r.id,
		serialNumber: r.serialNumber,
		nominalRub: Number(r.nominalRub),
		currentBalanceRub: Number(r.currentBalanceRub),
		nominalKop: parseKopecks(r.nominalRub),
		currentBalanceKop: parseKopecks(r.currentBalanceRub),
		purchaserName: r.purchaserName,
		recipientName: r.recipientName,
		recipientPhone: r.recipientPhone,
		status: r.status,
		issuedAtIso: r.issuedAt.toISOString(),
		expiresAtIso: r.expiresAt.toISOString(),
		notes: r.notes,
	}));
}
