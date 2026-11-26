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
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import {
	cashBoxes,
	cashOperations,
	fiscalReceiptQueue,
	giftCertificates,
	patients,
	payments,
} from "../../db/schema.js";
import type { FormattedCertificateDto } from "./certificateTypes.js";
import { addCashBoxShiftDelta } from "./shiftLedgerSync.js";

function isPgUniqueViolation(err: unknown): boolean {
	const candidate = err as { code?: unknown; cause?: unknown };
	if (candidate?.code === "23505") return true;
	if (candidate?.cause) return isPgUniqueViolation(candidate.cause);
	return false;
}

function formatIssuedCertificateDto(
	cert: typeof giftCertificates.$inferSelect,
): FormattedCertificateDto {
	const nomKop = Number(cert.nominalKopecks ?? 0);
	const initBalKop = Number(cert.initialBalanceKopecks ?? 0);
	const curBalKop = Number(cert.currentBalanceKopecks ?? 0);
	return {
		id: cert.id,
		serialNumber: cert.serialNumber,
		nominalRub: kopecksToRubles(nomKop),
		initialBalanceRub: kopecksToRubles(initBalKop),
		currentBalanceRub: kopecksToRubles(curBalKop),
		nominalKop: nomKop,
		initialBalanceKop: initBalKop,
		currentBalanceKop: curBalKop,
		purchaserPatientId: cert.purchaserPatientId,
		purchaserName: cert.purchaserName,
		recipientPatientId: cert.recipientPatientId,
		recipientName: cert.recipientName,
		recipientPhone: cert.recipientPhone,
		status: cert.status,
		issuedAtIso: cert.issuedAt.toISOString(),
		expiresAtIso: cert.expiresAt.toISOString(),
		notes: cert.notes,
		relatedPaymentId: cert.relatedPaymentId,
	};
}

async function findIssuedCertificateByMutationId(
	tx: TenantDb,
	orgId: string,
	clientMutationId: string,
	lockRows: boolean,
): Promise<typeof giftCertificates.$inferSelect | null> {
	const paymentQuery = tx
		.select()
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, orgId),
				eq(payments.clientMutationId, clientMutationId),
			),
		)
		.limit(1);
	const [existingPayment] = lockRows ? await paymentQuery.for("update") : await paymentQuery;

	if (existingPayment) {
		const certQuery = tx
			.select()
			.from(giftCertificates)
			.where(
				and(
					eq(giftCertificates.organizationId, orgId),
					eq(giftCertificates.relatedPaymentId, existingPayment.id),
				),
			)
			.limit(1);
		const [existingCert] = lockRows ? await certQuery.for("update") : await certQuery;
		if (existingCert) return existingCert;
	}

	const [existingOp] = await tx
		.select({ metadata: cashOperations.metadata })
		.from(cashOperations)
		.where(
			and(
				eq(cashOperations.organizationId, orgId),
				sql`${cashOperations.metadata}->>'idempotencyKey' = ${clientMutationId}`,
			),
		)
		.limit(1);
	const opMeta = existingOp?.metadata as { serialNumber?: unknown } | null | undefined;
	if (typeof opMeta?.serialNumber === "string" && opMeta.serialNumber.length > 0) {
		const [certByOp] = await tx
			.select()
			.from(giftCertificates)
			.where(
				and(
					eq(giftCertificates.organizationId, orgId),
					eq(giftCertificates.serialNumber, opMeta.serialNumber),
				),
			)
			.limit(1);
		if (certByOp) return certByOp;
	}

	const [existingQueue] = await tx
		.select({ payloadJson: fiscalReceiptQueue.payloadJson })
		.from(fiscalReceiptQueue)
		.where(
			and(
				eq(fiscalReceiptQueue.organizationId, orgId),
				sql`${fiscalReceiptQueue.payloadJson}->>'clientMutationId' = ${clientMutationId}`,
			),
		)
		.limit(1);
	const queuePayload = existingQueue?.payloadJson as { certificateNumber?: unknown } | null | undefined;
	if (typeof queuePayload?.certificateNumber === "string" && queuePayload.certificateNumber.length > 0) {
		const [certByQueue] = await tx
			.select()
			.from(giftCertificates)
			.where(
				and(
					eq(giftCertificates.organizationId, orgId),
					eq(giftCertificates.serialNumber, queuePayload.certificateNumber),
				),
			)
			.limit(1);
		if (certByQueue) return certByQueue;
	}

	return null;
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
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cert_issue:' || ${clientMutationId}))`,
			);
			const existingCert = await findIssuedCertificateByMutationId(
				tx,
				orgId,
				clientMutationId,
				true,
			);
			if (existingCert) {
				return formatIssuedCertificateDto(existingCert);
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
					amountKopecks: BigInt(nominalKopExact),
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
			const kopBal = Number(cashDeskBox.balanceKopecks ?? 0);
			const rubKopBal = parseKopecks(cashDeskBox.balanceRub || 0);
			const currentBalKop = kopBal !== 0 || rubKopBal === 0 ? kopBal : rubKopBal;
			const newBalanceKop = currentBalKop + Number(nominalKopExact);
			const newBalanceRub = Number(kopecksToNumericString(newBalanceKop));
			const shiftId = await addCashBoxShiftDelta({
				tx,
				organizationId: orgId,
				cashBoxId: cashDeskBox.id,
				kind: "income",
				deltaKopecks: Number(nominalKopExact),
			});
			await tx.insert(cashOperations).values({
				organizationId: orgId,
				cashBoxId: cashDeskBox.id,
				shiftId,
				operationType: "income",
				amountRub: nominalRubNum,
				amountKopecks: Number(nominalKopExact),
				balanceBeforeRub: kopecksToRubles(currentBalKop),
				balanceBeforeKopecks: BigInt(currentBalKop),
				balanceAfterRub: newBalanceRub,
				balanceAfterKopecks: BigInt(newBalanceKop),
				patientId: effectivePurchaserId,
				kkmDocNumber: `CERT-SALE-${Date.now().toString().slice(-6)}`,
				reasonText: `Продажа подарочного сертификата №${serialNumber} (тег 1214: Аванс, предмет расчета 1212 = 10)`,
				operatorName: "Администратор",
				metadata: {
					tenderType: "certificate_sale",
					serialNumber,
					...(clientMutationId ? { idempotencyKey: clientMutationId } : {}),
				},
			});
			await tx
				.update(cashBoxes)
				.set({
					balanceRub: newBalanceRub,
					balanceKopecks: newBalanceKop,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxes.id, cashDeskBox.id), eq(cashBoxes.organizationId, orgId)));
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
				clientMutationId: clientMutationId ?? null,
				note: `Продажа подарочного сертификата ${serialNumber} (тег 1214: Аванс, тег 1212: 10)`,
			},
			retryCount: 0,
		});

		const [created] = await tx
			.insert(giftCertificates)
			.values({
				organizationId: orgId,
				serialNumber,
				nominalKopecks: Number(nominalKopExact),
				initialBalanceKopecks: Number(nominalKopExact),
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
		return formatIssuedCertificateDto(created);
	};

	const execTenant = () => (txClient ? execute(txClient) : withTenantCtx(orgId, execute));

	if (clientMutationId) {
		try {
			return await execTenant();
		} catch (err) {
			if (isPgUniqueViolation(err)) {
				const lookupReplay = async (tx: TenantDb) => {
					const existingCert = await findIssuedCertificateByMutationId(
						tx,
						orgId,
						clientMutationId,
						false,
					);
					return existingCert ? formatIssuedCertificateDto(existingCert) : null;
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
 * Проверка и поиск сертификата по номеру с авто-обновлением статуса при истечении срока.
 */
export async function lookupGiftCertificateBySerial(
	orgId: string,
	rawSerial: string,
	txClient?: TenantDb | undefined,
): Promise<{ readonly found: boolean; readonly certificate?: FormattedCertificateDto | undefined }> {
	const cleaned = rawSerial.replace(/[\s-]/g, "");
	const canonicalFormatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}`;

	const run = async (tx: TenantDb) => {
		const [cert] = await tx
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
			await tx
				.update(giftCertificates)
				.set({ status: "expired", updatedAt: new Date() })
				.where(and(eq(giftCertificates.id, cert.id), eq(giftCertificates.organizationId, orgId)));
		}

		const nomKop = Number(cert.nominalKopecks ?? 0);
		const curBalKop = Number(cert.currentBalanceKopecks ?? 0);

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
	};

	return txClient ? run(txClient) : withTenantCtx(orgId, run);
}
