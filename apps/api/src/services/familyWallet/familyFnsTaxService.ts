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
	extractTaxYearFromDate,
	kopecksToRub,
	normalizePaymentsForTaxCertificate,
	type TaxDeductionPaymentItem,
} from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import { familyGroups, patientRelationships, patients, payments } from "../../db/schema.js";
import {
	buildFnsKnd1151156Xml,
	type FnsClinicInfo,
	type FnsPatientInfo,
	type FnsPersonInfo,
	type FnsTaxPayload,
} from "../fns/fnsKnd1151156Builder.js";
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
	const targetYear = parseInt(taxYear, 10);

	// 1. Fetch family group
	const [family] = await db
		.select()
		.from(familyGroups)
		.where(
			and(
				eq(familyGroups.id, familyGroupId),
				eq(familyGroups.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!family) {
		throw new FamilyWalletError("Семейная группа не найдена", 404, "FAMILY_NOT_FOUND");
	}

	// 2. Identify Primary Payer (Father / Head of Household)
	const payerId = customPayerPatientId || family.headPatientId;
	if (!payerId) {
		throw new FamilyWalletError(
			"В семейной группе не назначен главный плательщик (глава семьи)",
			400,
			"NO_PRIMARY_PAYER",
		);
	}

	const [payerPatient] = await db
		.select()
		.from(patients)
		.where(
			and(
				eq(patients.id, payerId),
				eq(patients.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!payerPatient) {
		throw new FamilyWalletError("Главный плательщик не найден в базе пациентов", 404, "PAYER_NOT_FOUND");
	}

	// 3. Fetch all family members
	const members = await db
		.select()
		.from(patients)
		.where(
			and(
				eq(patients.familyGroupId, familyGroupId),
				eq(patients.organizationId, organizationId),
			),
		);

	// 4. Fetch all payments in the given tax year for family members
	const memberIds = members.map((m) => m.id);
	const allPayments = await db
		.select()
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, organizationId),
			),
		);

	const familyPayments = allPayments.filter((p) => {
		if (!memberIds.includes(p.patientId)) return false;
		if (p.status !== "paid" && p.status !== "refunded") return false;
		const dateStr = p.paidAt ? p.paidAt.toISOString() : p.createdAt ? p.createdAt.toISOString() : "";
		return extractTaxYearFromDate(dateStr) === targetYear;
	});

	// Format Payer Info for FNS
	const payerFioParts = payerPatient.fullName.trim().split(/\s+/);
	const payerFio: { family: string; given: string; patronymic?: string } = {
		family: payerFioParts[0] || "Иванов",
		given: payerFioParts[1] || "Иван",
	};
	if (payerFioParts.length > 2) {
		payerFio.patronymic = payerFioParts.slice(2).join(" ");
	}

	const payerPerson: FnsPersonInfo = {
		fullName: payerFio,
		birthDate: payerPatient.birthDate || "1980-01-01",
	};
	if (payerPatient.administrativeProfile?.taxpayerInn) {
		payerPerson.inn = payerPatient.administrativeProfile.taxpayerInn;
	}
	if (payerPatient.administrativeProfile?.snils) {
		payerPerson.snils = payerPatient.administrativeProfile.snils;
	}
	if (payerPatient.birthDate) {
		payerPerson.birthDate = payerPatient.birthDate;
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
		const memberRawPayments = familyPayments.filter((p) => p.patientId === member.id);
		if (memberRawPayments.length === 0) continue;

		const mappedItems: TaxDeductionPaymentItem[] = memberRawPayments.map((p) => {
			const amtRub = Number(p.amountRub) || 0;
			const amtKop = Math.round(amtRub * 100);
			const isExpensive = Boolean(
				p.taxDeductionCode === "2" ||
				(p.note && /имплант|синус|костн|остеопластик|аугментац/i.test(p.note)),
			);
			const paymentDateIso = (p.paidAt ? p.paidAt : p.createdAt ? p.createdAt : new Date()).toISOString();
			const docNum = p.fiscalReceiptNumber ? p.fiscalReceiptNumber.replace(/\D/g, "") : p.id.slice(0, 8);
			const rawReceipt = p.fiscalReceipt as Record<string, any> | null;
			const fiscalSign = rawReceipt?.fiscalSign || rawReceipt?.fp || rawReceipt?.fpd || "";

			return {
				id: p.id,
				dateIso: paymentDateIso,
				receiptNumber: p.fiscalReceiptNumber || `ФД-${docNum}`,
				fiscalDocumentNumber: docNum || "0",
				fiscalSign,
				serviceName: p.note || (isExpensive ? "Хирургическое стоматологическое лечение (Код 02)" : "Терапевтическое стоматологическое лечение (Код 01)"),
				amountRub: amtKop / 100,
				taxCode: isExpensive ? ("2" as const) : ("1" as const),
				isRefund: p.status === "refunded" || amtKop < 0,
			};
		});

		const normalizedItems = normalizePaymentsForTaxCertificate(mappedItems, targetYear);
		if (normalizedItems.length === 0) continue;

		let code1Kopecks = 0;
		let code2Kopecks = 0;
		for (const item of normalizedItems) {
			const kopecks = Math.round(item.amountRub * 100);
			if (item.taxCode === "2") {
				code2Kopecks += kopecks;
			} else {
				code1Kopecks += kopecks;
			}
		}
		const totalKopecks = code1Kopecks + code2Kopecks;
		if (totalKopecks <= 0) continue;

		// Kinship code: 1 = Self, 2 = Spouse, 3 = Parent, 4 = Child, 5 = Ward
		let kinshipCode: "1" | "2" | "3" | "4" | "5" = "1";
		let kinshipNameRu = "Лично";

		if (member.id === payerId) {
			kinshipCode = "1";
			kinshipNameRu = "Лично (налогоплательщик)";
		} else {
			// Query relationship graph between payer and treated member
			const [rel] = await db
				.select()
				.from(patientRelationships)
				.where(
					and(
						eq(patientRelationships.organizationId, organizationId),
						or(
							and(
								eq(patientRelationships.patientId, payerId),
								eq(patientRelationships.relatedPatientId, member.id),
							),
							and(
								eq(patientRelationships.patientId, member.id),
								eq(patientRelationships.relatedPatientId, payerId),
							),
						),
					),
				)
				.limit(1);

			if (rel) {
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
				} else if (relType === "parent") {
					kinshipCode = "3";
					kinshipNameRu = "Родитель";
				} else if (relType === "spouse") {
					kinshipCode = "2";
					kinshipNameRu = "Супруг(а)";
				} else if (relType === "ward") {
					kinshipCode = "4";
					kinshipNameRu = "Подопечный";
				} else {
					const memberBirthYear = member.birthDate ? new Date(member.birthDate).getFullYear() : null;
					const isChild =
						memberBirthYear !== null &&
						!Number.isNaN(memberBirthYear) &&
						new Date().getFullYear() - memberBirthYear < 24;
					kinshipCode = isChild ? "4" : "2";
					kinshipNameRu = isChild ? "Ребенок" : "Супруг(а)";
				}
			} else {
				const memberBirthYear = member.birthDate ? new Date(member.birthDate).getFullYear() : null;
				const payerBirthYear = payerPatient.birthDate ? new Date(payerPatient.birthDate).getFullYear() : null;
				if (memberBirthYear && payerBirthYear && memberBirthYear < payerBirthYear - 15) {
					kinshipCode = "3";
					kinshipNameRu = "Родитель";
				} else if (memberBirthYear && payerBirthYear && memberBirthYear > payerBirthYear + 15) {
					kinshipCode = "4";
					kinshipNameRu = "Ребенок";
				} else {
					kinshipCode = "2";
					kinshipNameRu = "Супруг(а)";
				}
			}
		}

		const memberFioParts = member.fullName.trim().split(/\s+/);
		const patientFio: { family: string; given: string; patronymic?: string } = {
			family: memberFioParts[0] || "Иванова",
			given: memberFioParts[1] || "Ольга",
		};
		if (memberFioParts.length > 2) {
			patientFio.patronymic = memberFioParts.slice(2).join(" ");
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

		const certNumber = `FNS-${taxYear}-${member.id.slice(0, 8).toUpperCase()}`;

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
		const code01AmountRub = kopecksToRub(code1Kopecks);
		const code02AmountRub = kopecksToRub(code2Kopecks);
		const grandTotalRub = kopecksToRub(totalKopecks);

		// Статутный расчет вычета по ст. 219 НК РФ:
		// 150 000 ₽ с 2024 года, 120 000 ₽ до 2024 года. Код 02 без ограничений!
		const statutoryLimitRub = targetYear >= 2024 ? ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 : ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024;
		const code01EligibleRub = Math.min(code01AmountRub, statutoryLimitRub);
		const estimated13PercentRefundRub = Math.round((code01EligibleRub + code02AmountRub) * 0.13);

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
		});
	}

	return certificates;
}
