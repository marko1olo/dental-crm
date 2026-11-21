/**
 * apps/api/src/routes/loyaltyModules/certificateIssuance.ts
 *
 * Statutory 54-FZ Gift Certificate Issuance & Luhn-16 Verification Engine.
 * Mandate 8b Sweet Spot Architecture (<= 250 lines).
 */

import {
	generateLuhn16Certificate,
	parseKopecks,
	kopecksToRubles,
	type IssueCertificateBody,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	cashBoxes,
	cashOperations,
	fiscalReceiptQueue,
	giftCertificates,
	patients,
	payments,
} from "../../db/schema.js";
import type { FormattedCertificateDto } from "./certificateTypes.js";

/**
 * Выпуск нового подарочного сертификата с 16-значным Luhn-номером.
 * Фискализация аванса по 54-ФЗ (тег 1214: Аванс, предмет расчета тег 1212 = 10).
 * Поддержка розничной продажи без карты пациента (ст. 1.2, 4.7 54-ФЗ).
 */
export async function executeIssueGiftCertificate(
	orgId: string,
	data: IssueCertificateBody,
	clientMutationId?: string | null,
): Promise<FormattedCertificateDto | null> {
	const nominalRub = data.nominalRub ?? (data.nominalKopecks ? kopecksToRubles(data.nominalKopecks) : 0);
	const expiresInDays = data.expiresInDays ?? 365;
	const {
		purchaserPatientId,
		purchaserName,
		recipientPatientId,
		recipientName,
		recipientPhone,
		notes,
	} = data;

	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + expiresInDays);

	const serialNumber = generateLuhn16Certificate();

	return db.transaction(async (tx) => {
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
				.limit(1);

			if (existingPayment) {
				const [existingCert] = await tx
					.select()
					.from(giftCertificates)
					.where(
						and(
							eq(giftCertificates.organizationId, orgId),
							eq(giftCertificates.relatedPaymentId, existingPayment.id),
						),
					)
					.limit(1);

				if (existingCert) {
					return {
						id: existingCert.id,
						serialNumber: existingCert.serialNumber,
						nominalRub: Number(existingCert.nominalRub),
						initialBalanceRub: Number(existingCert.initialBalanceRub),
						currentBalanceRub: Number(existingCert.currentBalanceRub),
						nominalKop: parseKopecks(existingCert.nominalRub),
						initialBalanceKop: parseKopecks(existingCert.initialBalanceRub),
						currentBalanceKop: parseKopecks(existingCert.currentBalanceRub),
						purchaserPatientId: existingCert.purchaserPatientId,
						purchaserName: existingCert.purchaserName,
						recipientPatientId: existingCert.recipientPatientId,
						recipientName: existingCert.recipientName,
						recipientPhone: existingCert.recipientPhone,
						status: existingCert.status,
						issuedAtIso: existingCert.issuedAt.toISOString(),
						expiresAtIso: existingCert.expiresAt.toISOString(),
						notes: existingCert.notes,
						relatedPaymentId: existingCert.relatedPaymentId,
					};
				}
			}
		}

		let resolvedPurchaserName = purchaserName ?? null;
		if (purchaserPatientId && !resolvedPurchaserName) {
			const [p] = await tx
				.select({ fullName: patients.fullName })
				.from(patients)
				.where(and(eq(patients.organizationId, orgId), eq(patients.id, purchaserPatientId)))
				.limit(1);
			if (p) resolvedPurchaserName = p.fullName;
		}

		// Разрешение эффективного ID пациента для фискализации 54-ФЗ
		let effectivePurchaserId = purchaserPatientId ?? null;
		if (!effectivePurchaserId) {
			// Розничная продажа физлицу без заведения медицинской карты (ст. 1.2, 4.7 54-ФЗ)
			const [existingRetail] = await tx
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, orgId),
						eq(patients.fullName, resolvedPurchaserName || "Розничный покупатель"),
					),
				)
				.limit(1);

			if (existingRetail) {
				effectivePurchaserId = existingRetail.id;
				if (!resolvedPurchaserName) resolvedPurchaserName = existingRetail.fullName || "Розничный покупатель";
			} else {
				const [createdRetail] = await tx
					.insert(patients)
					.values({
						organizationId: orgId,
						fullName: resolvedPurchaserName || "Розничный покупатель",
						phone: "+70000000000",
						notes: "Системный профиль для розничных расчетов у стойки администратора без медицинской карты (ст. 1.2, 4.7 54-ФЗ)",
					})
					.returning({ id: patients.id, fullName: patients.fullName });
				effectivePurchaserId = createdRetail?.id ?? null;
				if (!resolvedPurchaserName) resolvedPurchaserName = createdRetail?.fullName || "Розничный покупатель";
			}
		}

		let paymentId: string | null = null;
		if (effectivePurchaserId) {
			const [payment] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: effectivePurchaserId,
					amountRub: nominalRub,
					method: "card",
					status: "paid",
					paidAt: new Date(),
					note: `Продажа подарочного сертификата ${serialNumber} (тег 1214: Аванс, предмет расчета 1212 = 10)`,
					clientMutationId: clientMutationId ?? null,
				})
				.returning({ id: payments.id });
			paymentId = payment?.id ?? null;

			// Проводка продажи сертификата в кассовый журнал
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
					amountRub: nominalRub,
					balanceBeforeRub: cashDeskBox.balanceRub || 0,
					balanceAfterRub: cashDeskBox.balanceRub || 0,
					patientId: effectivePurchaserId,
					kkmDocNumber: `CERT-SALE-${Date.now().toString().slice(-6)}`,
					reasonText: `Продажа подарочного сертификата №${serialNumber} (тег 1214: Аванс, предмет расчета 1212 = 10)`,
					operatorName: "Администратор",
				});
			}

			// Фискализация чека продажи 54-ФЗ (тег 1214: аванс, тег 1212 = 10)
			const nominalKop = parseKopecks(nominalRub);
			await tx.insert(fiscalReceiptQueue).values({
				organizationId: orgId,
				paymentId: paymentId ?? undefined,
				receiptType: "income",
				status: "pending_print",
				payloadJson: {
					amountRub: nominalRub,
					amountKopecks: Number(nominalKop),
					method: "card",
					calculationSubjectTag1212: 10,
					calculationMethodTag1214: 3,
					subjectType: 10,
					advancePaymentRub: nominalRub,
					certificateNumber: serialNumber,
					fiscalReceiptNumber: `CERT-SALE-${Date.now().toString().slice(-6)}`,
					patientId: effectivePurchaserId,
					patientName: resolvedPurchaserName || "Розничный покупатель",
					note: `Продажа подарочного сертификата ${serialNumber} (тег 1214: Аванс, тег 1212: 10)`,
				},
				retryCount: 0,
			});
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

		if (!created) return null;

		return {
			id: created.id,
			serialNumber: created.serialNumber,
			nominalRub: Number(created.nominalRub),
			initialBalanceRub: Number(created.initialBalanceRub),
			currentBalanceRub: Number(created.currentBalanceRub),
			nominalKop: parseKopecks(created.nominalRub),
			initialBalanceKop: parseKopecks(created.initialBalanceRub),
			currentBalanceKop: parseKopecks(created.currentBalanceRub),
			purchaserPatientId: created.purchaserPatientId,
			purchaserName: created.purchaserName,
			recipientPatientId: created.recipientPatientId,
			recipientName: created.recipientName,
			recipientPhone: created.recipientPhone,
			status: created.status,
			issuedAtIso: created.issuedAt.toISOString(),
			expiresAtIso: created.expiresAt.toISOString(),
			notes: created.notes,
			relatedPaymentId: created.relatedPaymentId,
		};
	});
}

/**
 * Проверка и поиск сертификата по номеру с авто-обновлением статуса при истечении срока.
 */
export async function lookupGiftCertificateBySerial(
	orgId: string,
	rawSerial: string,
): Promise<{ readonly found: boolean; readonly certificate?: FormattedCertificateDto | undefined }> {
	const cleaned = rawSerial.replace(/[\s-]/g, "");
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
		return { found: false };
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

	return {
		found: true,
		certificate: {
			id: cert.id,
			serialNumber: canonicalFormatted,
			nominalRub: Number(cert.nominalRub),
			currentBalanceRub: Number(cert.currentBalanceRub),
			nominalKop: parseKopecks(cert.nominalRub),
			currentBalanceKop: parseKopecks(cert.currentBalanceRub),
			status: effectiveStatus,
			issuedAtIso: cert.issuedAt.toISOString(),
			expiresAtIso: cert.expiresAt.toISOString(),
			purchaserName: cert.purchaserName,
			recipientName: cert.recipientName,
			recipientPhone: cert.recipientPhone,
			notes: cert.notes,
		},
	};
}
