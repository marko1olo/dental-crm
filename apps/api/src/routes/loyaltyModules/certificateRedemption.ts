/**
 * apps/api/src/routes/loyaltyModules/certificateRedemption.ts
 *
 * Statutory 54-FZ Gift Certificate Redemption & Journal Listing.
 * Mandate 8b Sweet Spot Architecture (<= 250 lines).
 */

import {
	parseKopecks,
	kopecksToNumericString,
	kopecksToRubles,
	rublesToKopecks,
	toExactKopecks,
	type RedeemCertificateBody,
} from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import type { TenantDb } from "../../db/rls.js";
import {
	cashBoxes,
	cashOperations,
	fiscalReceiptQueue,
	giftCertificates,
	patientInvoices,
	payments,
} from "../../db/schema.js";
import type { FormattedCertificateDto, RedeemCertificateResult } from "./certificateTypes.js";

function isPgUniqueViolation(err: unknown): boolean {
	const candidate = err as { code?: unknown; cause?: unknown };
	if (candidate?.code === "23505") return true;
	if (candidate?.cause) return isPgUniqueViolation(candidate.cause);
	return false;
}

/**
 * Списание средств с подарочного сертификата в счет оплаты лечения.
 * Фискальный зачёт аванса по 54-ФЗ (тег 1215). Метод оплаты: "certificate".
 */
export async function executeRedeemGiftCertificate(
	orgId: string,
	data: RedeemCertificateBody,
	clientMutationId?: string | null | undefined,
	txClient?: TenantDb | undefined,
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

	const execute = async (tx: TenantDb): Promise<RedeemCertificateResult> => {
		if (clientMutationId) {
			const [existingPayment] = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.clientMutationId, clientMutationId),
					),
				)
				.limit(1)
				.for("update");

			if (existingPayment) {
				const [existingCert] = await tx
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

				if (existingCert) {
					const existingRedeemedKop = parseKopecks(existingPayment.amountRub);
					const existingRedeemedRub = kopecksToRubles(existingRedeemedKop);
					const currentBalKop = existingCert.currentBalanceKopecks != null
						? existingCert.currentBalanceKopecks
						: parseKopecks(existingCert.currentBalanceRub);
					const currentBalRub = kopecksToRubles(currentBalKop);
					const invoiceAmountKop = invoiceAmountRub !== undefined ? parseKopecks(invoiceAmountRub) : existingRedeemedKop;
					const remainingInvoiceKop = Math.max(0, invoiceAmountKop - existingRedeemedKop);
					const remainingInvoiceAmountRub = kopecksToRubles(remainingInvoiceKop);
					return {
						success: true as const,
						replayed: true as const,
						certificateId: existingCert.id,
						serialNumber: existingCert.serialNumber,
						previousBalanceRub: kopecksToRubles(currentBalKop + existingRedeemedKop),
						redeemedAmountRub: existingRedeemedRub,
						newBalanceRub: currentBalRub,
						remainingInvoiceAmountRub,
						status: existingCert.status,
						paymentId: existingPayment.id,
						invoicePaid: remainingInvoiceKop <= 0,
						fiscal54FzSplit: {
							tag1215AdvanceOffsetKop: existingRedeemedKop,
							tag1081ElectronicKop: remainingInvoiceKop,
						},
					};
				}
			}
		}

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

		const currentBalanceKop = cert.currentBalanceKopecks != null
			? Number(cert.currentBalanceKopecks)
			: parseKopecks(cert.currentBalanceRub);
		if (currentBalanceKop <= 0) {
			return { error: true, message: "Баланс сертификата равен 0 ₽", code: 400 };
		}

		const invoiceAmountKop = invoiceAmountRub !== undefined ? parseKopecks(invoiceAmountRub) : 0;
		const requestedDeductionKop =
			amountKopecks !== undefined
				? amountKopecks
				: amountToRedeemRub !== undefined
					? parseKopecks(amountToRedeemRub)
					: (invoiceAmountKop > 0 ? invoiceAmountKop : currentBalanceKop);

		const maxAllowedKop = invoiceAmountKop > 0 ? Math.min(currentBalanceKop, invoiceAmountKop) : currentBalanceKop;
		const redeemedKop = Math.min(maxAllowedKop, requestedDeductionKop);
		const redeemedRub = kopecksToRubles(redeemedKop);
		const newBalanceKop = Math.max(0, currentBalanceKop - redeemedKop);
		const newBalanceStr = kopecksToNumericString(newBalanceKop);
		const newBalanceRub = kopecksToRubles(newBalanceKop);
		const newStatus = newBalanceKop <= 0 ? "depleted" : "active";

		await tx
			.update(giftCertificates)
			.set({
				currentBalanceRub: newBalanceStr,
				currentBalanceKopecks: newBalanceKop,
				status: newStatus,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(giftCertificates.id, cert.id),
					eq(giftCertificates.organizationId, orgId),
				),
			);

		let paymentId: string | null = null;
		let invoicePaid = false;

		let targetPatientId = patientId || cert.recipientPatientId || cert.purchaserPatientId || null;
		if (invoiceId && !targetPatientId) {
			const [invoice] = await tx
				.select({ patientId: patientInvoices.patientId })
				.from(patientInvoices)
				.where(and(eq(patientInvoices.organizationId, orgId), eq(patientInvoices.id, invoiceId)))
				.limit(1);
			if (invoice?.patientId) {
				targetPatientId = invoice.patientId;
			}
		}

		if (invoiceId && !targetPatientId) {
			return {
				error: true,
				message: "Не удалось определить пациента для проведения платежа по счёту",
				code: 400,
			};
		}

		if (targetPatientId) {
			// Проводка платежа: метод строго канонический "certificate" (SEV-1)
			const [payRecord] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: targetPatientId,
					documentId: invoiceId || null,
					amountRub: redeemedRub,
					amountKopecks: BigInt(redeemedKop),
					method: "certificate",
					status: "paid",
					paidAt: new Date(),
					note: description || `Зачёт аванса: подарочный сертификат ${cert.serialNumber} (тег 1215: ${redeemedRub} ₽)`,
					clientMutationId: clientMutationId ?? null,
				})
				.returning({ id: payments.id });

			paymentId = payRecord?.id ?? null;

			// Проводка зачета аванса по сертификату в кассовый журнал со строгим enum кассы (income)
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
					amountKopecks: Number(redeemedKop),
					balanceBeforeRub: cashDeskBox.balanceRub || 0,
					balanceAfterRub: cashDeskBox.balanceRub || 0,
					patientId: targetPatientId,
					kkmDocNumber: `CERT-${Date.now()}`,
					reasonText: `Зачёт аванса (сертификат №${cert.serialNumber}): оплата стоматологических услуг`,
					operatorName: "Администратор",
					metadata: {
						tenderType: "certificate",
						isAdvanceOffset: true,
						certificateNumber: cert.serialNumber,
						tag1215AdvanceKopecks: Number(redeemedKop),
					},
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
					fiscalReceiptNumber: `CERT-${Date.now()}`,
					patientId: targetPatientId,
					invoiceId: invoiceId || null,
					note: `Зачёт аванса: подарочный сертификат ${cert.serialNumber} (тег 1215)`,
				},
				retryCount: 0,
			});

			if (invoiceId) {
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
		}

		const remainingInvoiceKop = Math.max(0, invoiceAmountKop - redeemedKop);
		const remainingInvoiceAmountRub = kopecksToRubles(remainingInvoiceKop);

		return {
			success: true as const,
			certificateId: cert.id,
			serialNumber: cert.serialNumber,
			previousBalanceRub: kopecksToRubles(currentBalanceKop),
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
	};

	if (clientMutationId) {
		try {
			if (txClient) {
				return await execute(txClient);
			}
			return await db.transaction(execute);
		} catch (err) {
			if (isPgUniqueViolation(err)) {
				const queryClient = txClient ?? db;
				const [existingPayment] = await queryClient
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, orgId),
							eq(payments.clientMutationId, clientMutationId),
						),
					)
					.limit(1);

				if (existingPayment) {
					const [existingCert] = await queryClient
						.select()
						.from(giftCertificates)
						.where(
							and(
								eq(giftCertificates.organizationId, orgId),
								sql`REPLACE(REPLACE(${giftCertificates.serialNumber}, '-', ''), ' ', '') = ${cleaned}`,
							),
						)
						.limit(1);

					if (existingCert) {
						const existingRedeemedKop = parseKopecks(existingPayment.amountRub);
						const existingRedeemedRub = kopecksToRubles(existingRedeemedKop);
						const currentBalKop = existingCert.currentBalanceKopecks != null
							? existingCert.currentBalanceKopecks
							: parseKopecks(existingCert.currentBalanceRub);
						const currentBalRub = kopecksToRubles(currentBalKop);
						const invoiceAmountKop = invoiceAmountRub !== undefined ? parseKopecks(invoiceAmountRub) : existingRedeemedKop;
						const remainingInvoiceKop = Math.max(0, invoiceAmountKop - existingRedeemedKop);
						const remainingInvoiceAmountRub = kopecksToRubles(remainingInvoiceKop);
						return {
							success: true as const,
							replayed: true as const,
							certificateId: existingCert.id,
							serialNumber: existingCert.serialNumber,
							previousBalanceRub: kopecksToRubles(currentBalKop + existingRedeemedKop),
							redeemedAmountRub: existingRedeemedRub,
							newBalanceRub: currentBalRub,
							remainingInvoiceAmountRub,
							status: existingCert.status,
							paymentId: existingPayment.id,
							invoicePaid: remainingInvoiceKop <= 0,
							fiscal54FzSplit: {
								tag1215AdvanceOffsetKop: existingRedeemedKop,
								tag1081ElectronicKop: remainingInvoiceKop,
							},
						};
					}
				}
			}
			throw err;
		}
	}

	if (txClient) {
		return execute(txClient);
	}
	return db.transaction(execute);
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

	return rows.map((r) => {
		const nomKop = Number(r.nominalKopecks != null ? r.nominalKopecks : parseKopecks(r.nominalRub));
		const curBalKop = Number(r.currentBalanceKopecks != null ? r.currentBalanceKopecks : parseKopecks(r.currentBalanceRub));
		return {
			id: r.id,
			serialNumber: r.serialNumber,
			nominalRub: kopecksToRubles(nomKop),
			currentBalanceRub: kopecksToRubles(curBalKop),
			nominalKop: nomKop,
			currentBalanceKop: curBalKop,
			purchaserName: r.purchaserName,
			recipientName: r.recipientName,
			recipientPhone: r.recipientPhone,
			status: r.status,
			issuedAtIso: r.issuedAt.toISOString(),
			expiresAtIso: r.expiresAt.toISOString(),
			notes: r.notes,
		};
	});
}
