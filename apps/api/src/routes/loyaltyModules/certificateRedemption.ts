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
	type RedeemCertificateBody,
} from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	fiscalReceiptQueue,
	giftCertificates,
	patientInvoices,
	payments,
} from "../../db/schema.js";
import { reconcileInvoiceBalanceInDb } from "../billingRoutes/invoiceBalanceReconciler.js";
import { resolveCanonicalInvoiceTotalKop } from "./bonusRedemptionUtils.js";
import type { FormattedCertificateDto, RedeemCertificateResult } from "./certificateTypes.js";

function isPgUniqueViolation(err: unknown): boolean {
	const candidate = err as { code?: unknown; cause?: unknown };
	if (candidate?.code === "23505") return true;
	if (candidate?.cause) return isPgUniqueViolation(candidate.cause);
	return false;
}

async function buildCertificateRedeemReplay(
	tx: TenantDb,
	params: {
		orgId: string;
		cleanedSerial: string;
		invoiceId: string | null | undefined;
		fallbackInvoiceAmountRub: number | undefined;
		existingPayment: typeof payments.$inferSelect;
	},
): Promise<RedeemCertificateResult | null> {
	const [existingCert] = await tx
		.select()
		.from(giftCertificates)
		.where(
			and(
				eq(giftCertificates.organizationId, params.orgId),
				sql`REPLACE(REPLACE(${giftCertificates.serialNumber}, '-', ''), ' ', '') = ${params.cleanedSerial}`,
			),
		)
		.limit(1);
	if (!existingCert) return null;

	const existingRedeemedKop =
		params.existingPayment.amountKopecks != null
			? Number(params.existingPayment.amountKopecks)
			: parseKopecks(params.existingPayment.amountRub);
	const existingRedeemedRub = kopecksToRubles(existingRedeemedKop);
	const currentBalKop =
		existingCert.currentBalanceKopecks != null
			? existingCert.currentBalanceKopecks
			: parseKopecks(existingCert.currentBalanceRub);
	const currentBalRub = kopecksToRubles(currentBalKop);

	let remainingInvoiceKop = 0;
	const targetInvoiceId = params.invoiceId ?? params.existingPayment.documentId;
	if (targetInvoiceId) {
		const [inv] = await tx
			.select({
				totalPriceKopecks: patientInvoices.totalPriceKopecks,
				totalAmountRub: patientInvoices.totalAmountRub,
				totalRub: patientInvoices.totalRub,
			})
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.organizationId, params.orgId),
					eq(patientInvoices.id, targetInvoiceId),
				),
			)
			.limit(1);
		if (inv) {
			const invTotalKop = resolveCanonicalInvoiceTotalKop(inv);
			const paidRows = await tx
				.select({ amountKopecks: payments.amountKopecks, amountRub: payments.amountRub })
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, params.orgId),
						eq(payments.documentId, targetInvoiceId),
						eq(payments.status, "paid"),
					),
				);
			const paidKop = paidRows.reduce(
				(acc, r) =>
					acc +
					(r.amountKopecks != null && r.amountKopecks > 0n
						? Number(r.amountKopecks)
						: parseKopecks(r.amountRub)),
				0,
			);
			remainingInvoiceKop = Math.max(0, invTotalKop - paidKop);
		}
	} else {
		const invoiceAmountKop =
			params.fallbackInvoiceAmountRub !== undefined
				? parseKopecks(params.fallbackInvoiceAmountRub)
				: existingRedeemedKop;
		remainingInvoiceKop = Math.max(0, invoiceAmountKop - existingRedeemedKop);
	}

	return {
		success: true as const,
		replayed: true as const,
		certificateId: existingCert.id,
		serialNumber: existingCert.serialNumber,
		previousBalanceRub: kopecksToRubles(currentBalKop + existingRedeemedKop),
		redeemedAmountRub: existingRedeemedRub,
		newBalanceRub: currentBalRub,
		remainingInvoiceAmountRub: kopecksToRubles(remainingInvoiceKop),
		status: existingCert.status,
		paymentId: params.existingPayment.id,
		invoicePaid: remainingInvoiceKop <= 0,
		fiscal54FzSplit: {
			tag1215AdvanceOffsetKop: existingRedeemedKop,
			tag1081ElectronicKop: remainingInvoiceKop,
		},
	};
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
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cert_redeem:' || ${clientMutationId}))`,
			);
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
				const replayed = await buildCertificateRedeemReplay(tx, {
					orgId,
					cleanedSerial: cleaned,
					invoiceId,
					fallbackInvoiceAmountRub: invoiceAmountRub,
					existingPayment,
				});
				if (replayed) return replayed;
			}
		}

		let lockedInvoice: {
			id: string;
			patientId: string;
			status: string;
			totalPriceKopecks: bigint | null;
			totalAmountRub: number | null;
			totalRub: string | null;
		} | null = null;
		let serverInvoiceRemainingKop = 0;

		if (invoiceId) {
			const [inv] = await tx
				.select({
					id: patientInvoices.id,
					patientId: patientInvoices.patientId,
					status: patientInvoices.status,
					totalPriceKopecks: patientInvoices.totalPriceKopecks,
					totalAmountRub: patientInvoices.totalAmountRub,
					totalRub: patientInvoices.totalRub,
				})
				.from(patientInvoices)
				.where(
					and(
						eq(patientInvoices.organizationId, orgId),
						eq(patientInvoices.id, invoiceId),
					),
				)
				.for("update")
				.limit(1);

			if (!inv) {
				return { error: true, message: "Счёт не найден", code: 404 };
			}
			if (patientId && inv.patientId !== patientId) {
				return { error: true, message: "Счёт принадлежит другому пациенту", code: 403 };
			}
			if (
				inv.status === "paid" ||
				inv.status === "refunded" ||
				inv.status === "voided" ||
				inv.status === "cancelled"
			) {
				return { error: true, message: "Счёт уже оплачен или аннулирован", code: 409 };
			}
			lockedInvoice = inv;

			const invoiceTotalKop = resolveCanonicalInvoiceTotalKop(inv);
			const existingPaidRows = await tx
				.select({ amountKopecks: payments.amountKopecks, amountRub: payments.amountRub })
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.documentId, invoiceId),
						eq(payments.status, "paid"),
					),
				);
			const alreadyPaidKop = existingPaidRows.reduce(
				(acc, r) =>
					acc +
					(r.amountKopecks != null && r.amountKopecks > 0n
						? Number(r.amountKopecks)
						: parseKopecks(r.amountRub)),
				0,
			);
			serverInvoiceRemainingKop = Math.max(0, invoiceTotalKop - alreadyPaidKop);
			if (invoiceTotalKop > 0 && serverInvoiceRemainingKop <= 0) {
				return { error: true, message: "Счёт уже полностью оплачен", code: 409 };
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

		const invoiceAmountKop = lockedInvoice
			? serverInvoiceRemainingKop
			: invoiceAmountRub !== undefined
				? parseKopecks(invoiceAmountRub)
				: 0;
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
		let remainingInvoiceKop = Math.max(0, invoiceAmountKop - redeemedKop);

		const targetPatientId =
			patientId ||
			lockedInvoice?.patientId ||
			cert.recipientPatientId ||
			cert.purchaserPatientId ||
			null;

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
				.limit(1)
				.for("update");

			if (cashDeskBox) {
				const kopBal = Number(cashDeskBox.balanceKopecks ?? 0);
				const rubKopBal = parseKopecks(cashDeskBox.balanceRub || 0);
				const deskBalKop = kopBal !== 0 || rubKopBal === 0 ? kopBal : rubKopBal;
				const [openShift] = await tx
					.select({ id: cashBoxShifts.id })
					.from(cashBoxShifts)
					.where(
						and(
							eq(cashBoxShifts.organizationId, orgId),
							eq(cashBoxShifts.cashBoxId, cashDeskBox.id),
							eq(cashBoxShifts.status, "open"),
						),
					)
					.limit(1);
				await tx.insert(cashOperations).values({
					organizationId: orgId,
					cashBoxId: cashDeskBox.id,
					shiftId: openShift?.id ?? null,
					operationType: "income",
					amountRub: redeemedRub,
					amountKopecks: Number(redeemedKop),
					balanceBeforeRub: kopecksToRubles(deskBalKop),
					balanceBeforeKopecks: BigInt(deskBalKop),
					balanceAfterRub: kopecksToRubles(deskBalKop),
					balanceAfterKopecks: BigInt(deskBalKop),
					patientId: targetPatientId,
					invoiceId: invoiceId || null,
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
				const rec = await reconcileInvoiceBalanceInDb(tx, orgId, invoiceId);
				invoicePaid = rec.isFullyPaid;
				remainingInvoiceKop = rec.remainingKopecks;
			}
		}

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

	const execTenant = () => (txClient ? execute(txClient) : withTenantCtx(orgId, execute));

	if (clientMutationId) {
		try {
			return await execTenant();
		} catch (err) {
			if (isPgUniqueViolation(err)) {
				const lookupReplay = async (tx: TenantDb): Promise<RedeemCertificateResult | null> => {
					const [existingPayment] = await tx
						.select()
						.from(payments)
						.where(
							and(
								eq(payments.organizationId, orgId),
								eq(payments.clientMutationId, clientMutationId),
							),
						)
						.limit(1);
					if (!existingPayment) return null;
					return buildCertificateRedeemReplay(tx, {
						orgId,
						cleanedSerial: cleaned,
						invoiceId,
						fallbackInvoiceAmountRub: invoiceAmountRub,
						existingPayment,
					});
				};
				const replayed = await withTenantCtx(orgId, lookupReplay);
				if (replayed) return replayed;
			}
			throw err;
		}
	}

	return execTenant();
}

/**
 * Получение списка выпущенных сертификатов клиники.
 */
export async function listGiftCertificates(
	orgId: string,
	txClient?: TenantDb | undefined,
): Promise<readonly FormattedCertificateDto[]> {
	const run = async (tx: TenantDb) => {
		const rows = await tx
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
	};

	return txClient ? run(txClient) : withTenantCtx(orgId, run);
}
