/**
 * familyFnsTaxService.ts — FNS Tax Certificate Generation (КНД 1151156) for Family Wallets.
 *
 * Fully compliant with:
 * - Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@ (КНД 1151156 / 1184043, Формат 5.01)
 * - Ст. 219 НК РФ: годовой лимит 150 000 ₽ по Коду 01 с 2024 года (120 000 ₽ до 2024 года), без лимита по Коду 02
 * - Законные представители и граф родственных связей (ст. 20 и 54 № 323-ФЗ)
 */

import {
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	classifyNdflServiceCode,
	classifyTaxDeduction804n,
	extractTaxYearFromDate,
	kopecksToRubles,
	rublesToKopecks,
	normalizePaymentsForTaxCertificate,
	type TaxDeductionPaymentItem,
} from "@dental/shared";
import { and, eq, inArray, or } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { familyGroups, patientRelationships, patients, payments } from "../../db/schema.js";
import {
	buildFnsKnd1151156Xml,
	type FnsClinicInfo,
	type FnsPatientInfo,
	type FnsPersonInfo,
	type FnsTaxPayload,
} from "@dental/shared";
import {
	FamilyWalletError,
	type FnsTaxCertificateSummary,
} from "./familyWalletTypes.js";

export async function generateFnsTaxCertificatesForFamilyLogic(params: {
	readonly organizationId: string;
	readonly familyGroupId: string;
	readonly taxYear: string;
	readonly clinic: FnsClinicInfo;
	readonly signatory: FnsTaxPayload["signatory"];
	readonly customPayerPatientId?: string | undefined;
}): Promise<readonly FnsTaxCertificateSummary[]> {
	const { organizationId, familyGroupId, taxYear, clinic, signatory, customPayerPatientId } = params;
	const trimmedTaxYear = String(taxYear).trim();
	const targetYear = Number.parseInt(trimmedTaxYear, 10);
	if (!/^\d{4}$/.test(trimmedTaxYear) || !Number.isInteger(targetYear) || targetYear < 2000 || targetYear > 2100) {
		throw new FamilyWalletError(
			"Налоговый год должен быть корректным 4-значным числом (2000-2100)",
			400,
			"INVALID_TAX_YEAR",
		);
	}

	const {
		family,
		payerPatient,
		members,
		allPayments,
		relationships,
		payerId,
	} = await withTenantCtx(organizationId, async (tx) => {
		// 1. Fetch family group
		const [familyRow] = await tx
			.select()
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.id, familyGroupId),
					eq(familyGroups.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!familyRow) {
			throw new FamilyWalletError("Семейная группа не найдена", 404, "FAMILY_NOT_FOUND");
		}

		// 2. Identify Primary Payer (Head of Household)
		const resolvedPayerId = customPayerPatientId || familyRow.headPatientId;
		if (!resolvedPayerId) {
			throw new FamilyWalletError(
				"В семейной группе не назначен главный плательщик (глава семьи)",
				400,
				"NO_PRIMARY_PAYER",
			);
		}

		const [payerRow] = await tx
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.id, resolvedPayerId),
					eq(patients.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!payerRow) {
			throw new FamilyWalletError("Главный плательщик не найден в базе пациентов", 404, "PAYER_NOT_FOUND");
		}

		if (payerRow.administrativeProfile?.isAnonymous === true) {
			throw new FamilyWalletError(
				"Анонимный пациент не может выступать налогоплательщиком в справке ФНС (КНД 1151156)",
				422,
				"ANONYMOUS_PATIENT_FORBIDDEN",
			);
		}

		// 3. Fetch all family members
		const memberRows = await tx
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.familyGroupId, familyGroupId),
					eq(patients.organizationId, organizationId),
				),
			);

		const memberIds = memberRows.map((m) => m.id);
		if (memberIds.length === 0) {
			return {
				family: familyRow,
				payerPatient: payerRow,
				members: memberRows,
				allPayments: [] as Array<typeof payments.$inferSelect>,
				relationships: [] as Array<typeof patientRelationships.$inferSelect>,
				payerId: resolvedPayerId,
			};
		}

		// 4. Fetch all payments & kinship graph inside the same tenant transaction
		const paymentRows = await tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					inArray(payments.patientId, memberIds),
				),
			);

		const relationshipRows = await tx
			.select()
			.from(patientRelationships)
			.where(
				and(
					eq(patientRelationships.organizationId, organizationId),
					or(
						and(
							eq(patientRelationships.patientId, resolvedPayerId),
							inArray(patientRelationships.relatedPatientId, memberIds),
						),
						and(
							inArray(patientRelationships.patientId, memberIds),
							eq(patientRelationships.relatedPatientId, resolvedPayerId),
						),
					),
				),
			);

		return {
			family: familyRow,
			payerPatient: payerRow,
			members: memberRows,
			allPayments: paymentRows,
			relationships: relationshipRows,
			payerId: resolvedPayerId,
		};
	});

	void family;
	const memberIds = members.map((m) => m.id);
	if (memberIds.length === 0) {
		return [];
	}

	const familyPayments = allPayments.filter((p) => {
		if (!memberIds.includes(p.patientId)) return false;
		if (p.status !== "paid" && p.status !== "refunded") return false;
		// Исключаем транзакции пополнения/возврата авансового баланса семейного счета,
		// чтобы исключить двойной учет (ст. 219 НК РФ: вычет строго за фактически оказанные медуслуги)
		if (p.documentId === familyGroupId && p.method !== "family_wallet") return false;
		const dateStr = p.paidAt ? p.paidAt.toISOString() : p.createdAt ? p.createdAt.toISOString() : "";
		return extractTaxYearFromDate(dateStr) === targetYear;
	});

	// Format Payer Info for FNS
	const payerFioParts = payerPatient.fullName.trim().split(/\s+/).filter(Boolean);
	const [payerFamily, payerGiven, ...payerPatronymicParts] = payerFioParts;
	if (!payerFamily || !payerGiven) {
		throw new FamilyWalletError(
			"Для формирования справки ФНС укажите полные фамилию и имя плательщика",
			422,
			"INCOMPLETE_PAYER_NAME",
		);
	}
	const payerFio: { family: string; given: string; patronymic?: string } = {
		family: payerFamily,
		given: payerGiven,
	};
	if (payerPatronymicParts.length > 0) {
		payerFio.patronymic = payerPatronymicParts.join(" ");
	}

	const payerPerson: FnsPersonInfo = {
		fullName: payerFio,
		birthDate: payerPatient.birthDate?.trim() || "",
	};
	if (payerPatient.administrativeProfile?.taxpayerInn) {
		payerPerson.inn = payerPatient.administrativeProfile.taxpayerInn;
	}
	if (payerPatient.administrativeProfile?.snils) {
		payerPerson.snils = payerPatient.administrativeProfile.snils;
	}
	if (payerPatient.administrativeProfile?.identityDocument) {
		payerPerson.identityDocument = {
			docTypeCode: "21",
			seriesAndNumber: payerPatient.administrativeProfile.identityDocument,
		};
	}

	const certificates: FnsTaxCertificateSummary[] = [];

	// 5. Generate certificates per treated family member
	for (const member of members) {
		if (member.administrativeProfile?.isAnonymous === true) {
			continue;
		}
		const memberRawPayments = familyPayments.filter((p) => p.patientId === member.id);
		if (memberRawPayments.length === 0) continue;

		const mappedItems: TaxDeductionPaymentItem[] = memberRawPayments.map((p) => {
			const rawAmountKopecks = "amountKopecks" in p ? (p as { amountKopecks?: unknown }).amountKopecks : undefined;
			const hasExplicitKopecks =
				rawAmountKopecks !== null &&
				rawAmountKopecks !== undefined &&
				BigInt(rawAmountKopecks as bigint | number) !== 0n;
			const amountKopecks = hasExplicitKopecks
				? BigInt(rawAmountKopecks as bigint | number)
				: BigInt(rublesToKopecks(Number(p.amountRub || 0)));
			const amtKop = Number(amountKopecks);

			const explicitCode = p.taxDeductionCode === "2" ? "2" : p.taxDeductionCode === "1" ? "1" : null;
			const rawNote = p.note?.trim() || undefined;
			const isExpensive =
				explicitCode !== null
					? explicitCode === "2"
					: Boolean(
							classifyTaxDeduction804n(undefined, rawNote).categoryCode === "2" ||
								classifyNdflServiceCode(rawNote) === "2",
						);
			const paymentDateIso = (p.paidAt ? p.paidAt : p.createdAt ? p.createdAt : new Date()).toISOString();
			const docNum = p.fiscalReceiptNumber ? p.fiscalReceiptNumber.replace(/\D/g, "") : p.id.slice(0, 8);
			const rawReceipt = p.fiscalReceipt as Record<string, unknown> | null;
			const fiscalSign = typeof rawReceipt?.fiscalSign === "string"
				? rawReceipt.fiscalSign
				: typeof rawReceipt?.fp === "string"
					? rawReceipt.fp
					: typeof rawReceipt?.fpd === "string"
						? rawReceipt.fpd
						: "";

			return {
				id: p.id,
				dateIso: paymentDateIso,
				receiptNumber: p.fiscalReceiptNumber || `ФД-${docNum}`,
				fiscalDocumentNumber: docNum || "0",
				fiscalSign,
				serviceName: p.note || (isExpensive ? "Хирургическое стоматологическое лечение (Код 02)" : "Терапевтическая стоматология (Код 01)"),
				amountRub: kopecksToRubles(amtKop),
				amountKopecks: amtKop,
				taxCode: isExpensive ? ("2" as const) : ("1" as const),
				status: p.status === "refunded" ? ("refunded" as const) : ("paid" as const),
				isRefund: amtKop < 0,
			};
		});

		const normalizedItems = normalizePaymentsForTaxCertificate(mappedItems, targetYear);
		if (normalizedItems.length === 0) continue;

		let code1KopecksBi = 0n;
		let code2KopecksBi = 0n;
		for (const item of normalizedItems) {
			const kopecksBi = item.amountKopecks != null
				? BigInt(item.amountKopecks)
				: BigInt(rublesToKopecks(item.amountRub));
			if (item.taxCode === "2") {
				code2KopecksBi += kopecksBi;
			} else {
				code1KopecksBi += kopecksBi;
			}
		}
		const totalKopecksBi = code1KopecksBi + code2KopecksBi;
		if (totalKopecksBi <= 0n) continue;
		const code1Kopecks = Number(code1KopecksBi);
		const code2Kopecks = Number(code2KopecksBi);
		const totalKopecks = Number(totalKopecksBi);

		// Kinship code: 1 = Self, 2 = Spouse, 3 = Parent, 4 = Child, 5 = Ward
		let kinshipCode: "1" | "2" | "3" | "4" | "5" = "1";
		let kinshipNameRu = "Лично";

		if (member.id === payerId) {
			kinshipCode = "1";
			kinshipNameRu = "Лично (налогоплательщик)";
		} else {
			const rel = relationships.find(
				(r) =>
					(r.patientId === payerId && r.relatedPatientId === member.id) ||
					(r.patientId === member.id && r.relatedPatientId === payerId),
			);
			if (!rel) {
				// Без подтвержденной родственной связи в patient_relationships вычет на третье лицо запрещен ст. 219 НК РФ
				continue;
			}

			const isPayerSource = rel.patientId === payerId;
			let relType = rel.relationshipType;
			if (!isPayerSource) {
				if (relType === "parent") relType = "child";
				else if (relType === "child") relType = "parent";
				else if (relType === "guardian") relType = "ward";
				else if (relType === "ward") relType = "guardian";
			}

			if (relType === "child") {
				kinshipCode = "4";
				kinshipNameRu = "Ребенок";
			} else if (relType === "parent" || relType === "guardian") {
				kinshipCode = "3";
				kinshipNameRu = relType === "guardian" ? "Законный представитель / опекун" : "Родитель";
			} else if (relType === "spouse") {
				kinshipCode = "2";
				kinshipNameRu = "Супруг(а)";
			} else if (relType === "ward") {
				kinshipCode = "5";
				kinshipNameRu = "Подопечный";
			} else {
				// Неклассифицированная бытовая связь (relative/other) не дает законного права на налоговый вычет без подтверждения родства
				continue;
			}
		}

		const memberFioParts = member.fullName.trim().split(/\s+/).filter(Boolean);
		const [memberFamily, memberGiven, ...memberPatronymicParts] = memberFioParts;
		if (!memberFamily || !memberGiven) {
			throw new FamilyWalletError(
				"Для формирования справки ФНС укажите полные фамилию и имя пациента",
				422,
				"INCOMPLETE_PATIENT_NAME",
			);
		}
		const patientFio: { family: string; given: string; patronymic?: string } = {
			family: memberFamily,
			given: memberGiven,
		};
		if (memberPatronymicParts.length > 0) {
			patientFio.patronymic = memberPatronymicParts.join(" ");
		}

		const patientInfo: FnsPatientInfo = {
			patientKinshipCode: kinshipCode,
			fullName: patientFio,
		};
		if (member.administrativeProfile?.taxpayerInn) {
			patientInfo.inn = member.administrativeProfile.taxpayerInn;
		}
		if (member.administrativeProfile?.snils) {
			patientInfo.snils = member.administrativeProfile.snils;
		}
		if (member.birthDate) {
			patientInfo.birthDate = member.birthDate;
		}
		if (member.administrativeProfile?.identityDocument) {
			patientInfo.identityDocument = {
				docTypeCode: "21",
				seriesAndNumber: member.administrativeProfile.identityDocument,
			};
		}

		const certNumber = `FNS-${trimmedTaxYear}-${member.id.slice(0, 8).toUpperCase()}`;

		const fnsPayload: FnsTaxPayload = {
			documentNumber: certNumber,
			documentDate: new Date(),
			taxYear,
			certificateKind: "1", // Первичная справка
			clinic,
			payer: payerPerson,
			patient: patientInfo,
			expenses: {
				code1AmountKopecks: code1Kopecks,
				code2AmountKopecks: code2Kopecks,
			},
			signatory,
		};

		const { xmlContent, fileName } = buildFnsKnd1151156Xml(fnsPayload);
		const code01AmountRub = kopecksToRubles(code1Kopecks);
		const code02AmountRub = kopecksToRubles(code2Kopecks);
		const grandTotalRub = kopecksToRubles(totalKopecks);

		// Статутный расчет вычета по ст. 219 НК РФ:
		// 150 000 ₽ с 2024 года, 120 000 ₽ до 2024 года. Код 02 без ограничений!
		const statutoryLimitRub = targetYear >= 2024 ? ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 : ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024;
		const statutoryLimitKopecks = rublesToKopecks(statutoryLimitRub);
		const code01EligibleKopecks = Math.min(code1Kopecks, statutoryLimitKopecks);
		const totalEligibleKopecks = code01EligibleKopecks + code2Kopecks;
		const estimatedRefundKopecks = Number((BigInt(totalEligibleKopecks) * 13n) / 100n);
		const estimated13PercentRefundRub = kopecksToRubles(estimatedRefundKopecks);

		const signatoryFullName = signatory?.fullName
			? [signatory.fullName.family, signatory.fullName.given, signatory.fullName.patronymic].filter(Boolean).join(" ")
			: undefined;

		certificates.push({
			certificateNumber: certNumber,
			taxYear,
			payerPatientId: payerId,
			payerFullName: payerPatient.fullName,
			payerInn: payerPatient.administrativeProfile?.taxpayerInn || undefined,
			patientId: member.id,
			patientFullName: member.fullName,
			kinshipCode,
			kinshipNameRu,
			code01AmountRub,
			code02AmountRub,
			grandTotalRub,
			estimated13PercentRefundRub,
			xmlPayload: xmlContent,
			xmlFileName: fileName,
			signatoryName: signatoryFullName,
		});
	}

	return certificates;
}
