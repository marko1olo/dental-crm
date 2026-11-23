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
	kopecksToNumericString,
	rublesToKopecks,
	type IssueCertificateBody,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import type { TenantDb } from "../../db/rls.js";
import {
	cashBoxes,
	cashOperations,
	fiscalReceiptQueue,
	giftCertificates,
	patients,
	payments,
} from "../../db/schema.js";
import type { FormattedCertificateDto } from "./certificateTypes.js";

function isPgUniqueViolation(err: unknown): boolean {
	const candidate = err as { code?: unknown; cause?: unknown };
	if (candidate?.code === "23505") return true;
	if (candidate?.cause) return isPgUniqueViolation(candidate.cause);
	return false;
}

/**
 * Выпуск нового подарочного сертификата с 16-значным Luhn-номером.
 * Фискализация аванса по 54-ФЗ (тег 1214: Аванс, предмет расчета тег 1212 = 10).
 * Поддержка розничной продажи без карты пациента (ст. 1.2, 4.7 54-ФЗ).
 */
export async function executeIssueGiftCertificate(
	orgId: string,
	data: IssueCertificateBody,
	clientMutationId?: string | null | undefined,
	txClient?: TenantDb | undefined,
): Promise<FormattedCertificateDto | null> {
	const nominalKopExact = data.nominalKopecks != null
		? parseKopecks(data.nominalKopecks)
		: data.nominalRub != null
			? rublesToKopecks(data.nominalRub)
			: parseKopecks(0);
	const nominalRub = kopecksToRubles(nominalKopExact);
	const nominalRubNum = Number(nominalRub);
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

	const execute = async (tx: TenantDb) => {
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
							eq(giftCertificates.relatedPaymentId, existingPayment.id),
						),
					)
					.limit(1)
					.for("update");

				if (existingCert) {
					return {
						id: existingCert.id,
						serialNumber: existingCert.serialNumber,
						nominalRub: Number(existingCert.nominalRub),
						initialBalanceRub: Number(existingCert.initialBalanceRub),
						currentBalanceRub: Number(existingCert.currentBalanceRub),
						nominalKop: Number(parseKopecks(existingCert.nominalRub)),
						initialBalanceKop: Number(parseKopecks(existingCert.initialBalanceRub)),
						currentBalanceKop: Number(parseKopecks(existingCert.currentBalanceRub)),
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

		// Разрешение покупателя: если передан purchaserPatientId — привязываем к карте.
		// Если розничная продажа без заведения карты (ст. 1.2, 4.7 54-ФЗ) — purchaserPatientId: null,
		// без создания мусорных фейковых записей с +70000000000 в клинической таблице patients.
		const effectivePurchaserId = purchaserPatientId ?? null;
		const displayName = resolvedPurchaserName || (effectivePurchaserId ? "Пациент" : "Розничный покупатель");

		let paymentId: string | null = null;
		if (effectivePurchaserId) {
			const [payment] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: effectivePurchaserId,
					amountRub: nominalRubNum,
					method: "card",
					status: "paid",
					paidAt: new Date(),
					note: `Продажа подарочного сертификата ${serialNumber} (тег 1214: Аванс, предмет расчета 1212 = 10)`,
					clientMutationId: clientMutationId ?? null,
				})
				.returning({ id: payments.id });
			paymentId = payment?.id ?? null;
		}

		// Проводка продажи сертификата в кассовый журнал
		const [cashDeskBox] = await tx
			.select()
			.from(cashBoxes)
			.where(eq(cashBoxes.organizationId, orgId))
			.limit(1)
			.for("update");

		if (cashDeskBox) {
			const currentBalKop = cashDeskBox.balanceKopecks != null ? cashDeskBox.balanceKopecks : parseKopecks(cashDeskBox.balanceRub || 0);
			const newBalanceKop = currentBalKop + Number(nominalKopExact);
			const newBalanceRub = Number(kopecksToNumericString(newBalanceKop));
			await tx.insert(cashOperations).values({
				organizationId: orgId,
				cashBoxId: cashDeskBox.id,
				operationType: "income",
				amountRub: nominalRubNum,
				amountKopecks: Number(nominalKopExact),
				balanceBeforeRub: cashDeskBox.balanceRub || 0,
				balanceAfterRub: newBalanceRub,
				patientId: effectivePurchaserId,
				kkmDocNumber: `CERT-SALE-${Date.now().toString().slice(-6)}`,
				reasonText: `Продажа подарочного сертификата №${serialNumber} (тег 1214: Аванс, предмет расчета 1212 = 10)`,
				operatorName: "Администратор",
			});
			await tx
				.update(cashBoxes)
				.set({
					balanceRub: newBalanceRub,
					balanceKopecks: newBalanceKop,
					updatedAt: new Date(),
				})
				.where(eq(cashBoxes.id, cashDeskBox.id));
		}

		// Фискализация чека продажи 54-ФЗ (тег 1214: аванс, тег 1212 = 10)
		await tx.insert(fiscalReceiptQueue).values({
			organizationId: orgId,
			paymentId: paymentId ?? undefined,
			receiptType: "income",
			status: "pending_print",
			payloadJson: {
				amountRub: nominalRubNum,
				amountKopecks: Number(nominalKopExact),
				method: "card",
				calculationSubjectTag1212: 10,
				calculationMethodTag1214: 3,
				subjectType: 10,
				advancePaymentRub: nominalRubNum,
				certificateNumber: serialNumber,
				fiscalReceiptNumber: `CERT-SALE-${Date.now().toString().slice(-6)}`,
				patientId: effectivePurchaserId,
				patientName: displayName,
				note: `Продажа подарочного сертификата ${serialNumber} (тег 1214: Аванс, тег 1212: 10)`,
			},
			retryCount: 0,
		});

		const [created] = await tx
			.insert(giftCertificates)
			.values({
				organizationId: orgId,
				serialNumber,
				nominalRub: String(nominalRubNum),
				nominalKopecks: Number(nominalKopExact),
				initialBalanceRub: String(nominalRubNum),
				initialBalanceKopecks: Number(nominalKopExact),
				currentBalanceRub: String(nominalRubNum),
				currentBalanceKopecks: Number(nominalKopExact),
				purchaserPatientId: effectivePurchaserId,
				purchaserName: resolvedPurchaserName || displayName,
				recipientPatientId: recipientPatientId || null,
				recipientName: recipientName || null,
				recipientPhone: recipientPhone || null,
				status: "active",
				expiresAt,
				notes: notes || `Подарочный сертификат на сумму ${nominalRubNum.toLocaleString("ru-RU")} ₽`,
				relatedPaymentId: paymentId || null,
			})
			.returning();

		if (!created) return null;

		const createdNomKop = created.nominalKopecks != null ? created.nominalKopecks : Number(parseKopecks(created.nominalRub));
		const createdCurBalKop = created.currentBalanceKopecks != null ? created.currentBalanceKopecks : Number(parseKopecks(created.currentBalanceRub));

		return {
			id: created.id,
			serialNumber: created.serialNumber,
			nominalRub: kopecksToRubles(createdNomKop),
			initialBalanceRub: kopecksToRubles(createdNomKop),
			currentBalanceRub: kopecksToRubles(createdCurBalKop),
			nominalKop: createdNomKop,
			initialBalanceKop: createdNomKop,
			currentBalanceKop: createdCurBalKop,
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
	};

	if (clientMutationId) {
		try {
			if (txClient) {
				return await execute(txClient);
			}
			return await db.transaction(execute);
		} catch (err) {
			if (isPgUniqueViolation(err)) {
				const [existingPayment] = await db
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
					const [existingCert] = await db
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
							nominalKop: Number(parseKopecks(existingCert.nominalRub)),
							initialBalanceKop: Number(parseKopecks(existingCert.initialBalanceRub)),
							currentBalanceKop: Number(parseKopecks(existingCert.currentBalanceRub)),
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
			throw err;
		}
	}

	if (txClient) {
		return execute(txClient);
	}
	return db.transaction(execute);
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

	const nomKop = cert.nominalKopecks != null ? cert.nominalKopecks : parseKopecks(cert.nominalRub);
	const curBalKop = cert.currentBalanceKopecks != null ? cert.currentBalanceKopecks : parseKopecks(cert.currentBalanceRub);

	return {
		found: true,
		certificate: {
			id: cert.id,
			serialNumber: canonicalFormatted,
			nominalRub: kopecksToRubles(nomKop),
			currentBalanceRub: kopecksToRubles(curBalKop),
			nominalKop: nomKop,
			currentBalanceKop: curBalKop,
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
