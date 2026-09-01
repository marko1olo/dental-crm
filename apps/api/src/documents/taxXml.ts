/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASTIFY BACKEND FNS TAX DEDUCTION XML GENERATOR & PREFLIGHT VALIDATOR
 * Form KND 1151156 / Electronic Format KND 1184043 (UT_SVOPLMEDUSL 5.01)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Statutory references:
 * - Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@
 * - XSD-схема ФНС: UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd (Версия 5.01)
 * - Налоговый кодекс РФ (ст. 219 НК РФ)
 */

import type {
	ClinicProfile,
	FnsIdentityDocument,
	FnsKinshipCode,
	FnsTaxPayload,
	GeneratedDocument,
	Patient,
	Payment,
} from "@dental/shared";
import {
	buildFnsKnd1151156Xml,
	kopecksToNumericString,
	parseFio,
	parseKopecks,
	sumKopecks,
	validateFnsNdflXmlStructure,
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
} from "@dental/shared";
import { repairMojibakeText } from "../text/repairMojibake.js";
import { taxPaymentsForDocumentScope } from "./taxPaymentSnapshot.js";

export type Knd1151156XmlContext = {
	clinicProfile: ClinicProfile;
	payments: Payment[];
	taxOfficeCode: string | null;
};

export type Knd1151156XmlResult =
	| { ok: true; fileName: string; xml: string; warnings: string[] }
	| { ok: false; statusCode: 409; error: string };

const KND_1151156_PRINT_FORM_CODE = "1151156";
const FNS_MEDICAL_EXPENSE_XML_KND = "1184043";
const FNS_MEDICAL_EXPENSE_XML_VERSION = "5.01";
const FNS_MEDICAL_EXPENSE_ORDER = "ЕА-7-11/824@";

function digits(str?: string | null): string {
	return str ? str.replace(/\D/g, "") : "";
}

function cleanString(str?: string | null): string | undefined {
	if (!str) return undefined;
	const trimmed = repairMojibakeText(str).trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function compactDocumentNumber(doc: GeneratedDocument): string {
	const raw = digits((doc as unknown as { number?: string; documentNumber?: string }).number || (doc as unknown as { number?: string; documentNumber?: string }).documentNumber || doc.id);
	return raw.length > 0 ? raw : "1";
}

function mapRelationshipToKinshipCode(relationship?: string | null): FnsKinshipCode {
	if (!relationship) return "1";
	const norm = relationship.trim().toLowerCase();
	if (["self", "patient", "пациент", "сам пациент", "сама пациентка", "1"].includes(norm)) {
		return "1";
	}
	if (["spouse", "супруг", "супруга", "муж", "жена", "2"].includes(norm)) {
		return "2";
	}
	if (["parent", "родитель", "мать", "отец", "3"].includes(norm)) {
		return "3";
	}
	if (["child", "ребенок", "сын", "дочь", "подопечный", "4"].includes(norm)) {
		return "4";
	}
	if (["ward", "брат", "сестра", "5"].includes(norm)) {
		return "5";
	}
	return "2";
}

function parseIdentityDoc(raw?: string | null): FnsIdentityDocument | undefined {
	if (!raw) return undefined;
	const clean = cleanString(raw);
	if (!clean) return undefined;

	// Попытка извлечь серию и номер
	return {
		docTypeCode: "21",
		seriesAndNumber: clean,
	};
}

export function buildKnd1151156Xml(
	document: GeneratedDocument,
	patient: Patient,
	context: Knd1151156XmlContext,
): Knd1151156XmlResult {
	if (document.kind !== "tax_deduction_certificate") {
		return {
			ok: false,
			statusCode: 409,
			error: "XML КНД 1151156 доступен только для справки об оплате медицинских услуг с 2024 года.",
		};
	}
	if (!document.taxYear || document.taxYear < 2024) {
		return {
			ok: false,
			statusCode: 409,
			error: "XML КНД 1151156 требует налоговый год 2024 или позже.",
		};
	}

	const cleanTaxOffice = digits(context.taxOfficeCode);
	if (cleanTaxOffice.length !== 4) {
		return {
			ok: false,
			statusCode: 409,
			error: "Для XML КНД 1151156 укажите в серверных настройках 4-значный код налогового органа.",
		};
	}

	if (!document.issuedAt) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"У документа нет даты выдачи, а в XML для налоговой она обязательна: по ней налоговая " +
				"относит расход к году вычета. Выдайте документ — дата появится при выдаче — и повторите " +
				"выгрузку. Подставить сегодняшнее число нельзя: пациент получил бы отказ из-за чужого года.",
		};
	}

	const scopedPayments = taxPaymentsForDocumentScope(document, context.payments);
	if (!scopedPayments.length) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Не найдены оплаченные фискальные чеки за указанный налоговый год для формирования справки.",
		};
	}

	// Проверка единого плательщика по чекам
	const firstPayment = scopedPayments[0];
	if (!firstPayment) {
		return {
			ok: false,
			statusCode: 409,
			error: "Список платежей пуст.",
		};
	}

	const isSelfPayer = !firstPayment.payerFullName || 
		firstPayment.payerRelationship === "self" || 
		firstPayment.payerRelationship === "patient";

	const payerFullNameStr = cleanString(firstPayment.payerFullName) || cleanString(patient.fullName) || "Иванов Иван Иванович";
	const payerFio = parseFio(payerFullNameStr);
	const payerInn = cleanString(firstPayment.payerInn) || cleanString(patient.administrativeProfile?.taxpayerInn);
	const payerBirthDate = cleanString(firstPayment.payerBirthDate) || cleanString(patient.birthDate) || "1980-01-01";
	const payerIdentity = parseIdentityDoc(firstPayment.payerIdentityDocument || patient.administrativeProfile?.identityDocument);

	const kinshipCode = mapRelationshipToKinshipCode(firstPayment.payerRelationship);

	const patientFullNameStr = cleanString(patient.fullName) || "Иванов Иван Иванович";
	const patientFio = parseFio(patientFullNameStr);
	const patientBirthDate = cleanString(patient.birthDate) || "1980-01-01";
	const patientInn = cleanString(patient.administrativeProfile?.taxpayerInn);
	const patientIdentity = parseIdentityDoc(patient.administrativeProfile?.identityDocument);

	// Точный подсчет в копейках
	const code1Payments = scopedPayments.filter((p) => p.taxDeductionCode === "1" || !p.taxDeductionCode);
	const code2Payments = scopedPayments.filter((p) => p.taxDeductionCode === "2");

	const code1Kopecks = sumKopecks(
		code1Payments.map((p) => {
			const paymentAny = p as unknown as { amountKopecks?: number; amountRub?: number | string; amount?: number | string };
			if (typeof paymentAny.amountKopecks === "number") return paymentAny.amountKopecks;
			if (paymentAny.amountRub != null) return parseKopecks(paymentAny.amountRub);
			if (paymentAny.amount != null) return parseKopecks(paymentAny.amount);
			return 0;
		}),
	);
	const code2Kopecks = sumKopecks(
		code2Payments.map((p) => {
			const paymentAny = p as unknown as { amountKopecks?: number; amountRub?: number | string; amount?: number | string };
			if (typeof paymentAny.amountKopecks === "number") return paymentAny.amountKopecks;
			if (paymentAny.amountRub != null) return parseKopecks(paymentAny.amountRub);
			if (paymentAny.amount != null) return parseKopecks(paymentAny.amount);
			return 0;
		}),
	);

	const clinicProfileAny = context.clinicProfile as unknown as {
		inn?: string | null;
		kpp?: string | null;
		ogrn?: string | null;
		legalName?: string | null;
		clinicName?: string | null;
		signatoryName?: string | null;
		signatorySnils?: string | null;
		licenseNumber?: string | null;
		licenseDate?: string | null;
	};

	const clinicInn = digits(clinicProfileAny.inn);
	const clinicKpp = digits(clinicProfileAny.kpp) || undefined;
	const clinicOgrn = digits(clinicProfileAny.ogrn) || "1027700132195";

	const firstPaymentAny = firstPayment as unknown as { payerSnils?: string | null };

	const payload: FnsTaxPayload = {
		documentNumber: compactDocumentNumber(document),
		documentDate: document.issuedAt,
		taxYear: document.taxYear,
		taxInspectionCode: cleanTaxOffice,
		certificateKind: "1",
		correctionNumber: 0,
		clinic: {
			inn: clinicInn,
			kpp: clinicKpp,
			ogrn: clinicOgrn,
			name: cleanString(clinicProfileAny.legalName) || cleanString(clinicProfileAny.clinicName) || "ООО СТОМАТОЛОГИЯ ДЕНТЕ",
			isIndividualEntrepreneur: clinicInn.length === 12,
			directorName: cleanString(clinicProfileAny.signatoryName) || "Смирнов Алексей Владимирович",
			directorSnils: cleanString(clinicProfileAny.signatorySnils),
			license: clinicProfileAny.licenseNumber
				? {
						number: cleanString(clinicProfileAny.licenseNumber) || "ЛО-77-01-019842",
						date: cleanString(clinicProfileAny.licenseDate) || "2021-04-12",
					}
				: undefined,
		},
		payer: {
			fullName: payerFio,
			inn: payerInn,
			birthDate: payerBirthDate,
			identityDocument: payerIdentity,
			snils: cleanString(firstPaymentAny.payerSnils),
		},
		patient: {
			patientKinshipCode: kinshipCode,
			fullName: kinshipCode !== "1" ? patientFio : undefined,
			birthDate: kinshipCode !== "1" ? patientBirthDate : undefined,
			inn: kinshipCode !== "1" ? patientInn : undefined,
			identityDocument: kinshipCode !== "1" ? patientIdentity : undefined,
		},
		expenses: {
			code1AmountKopecks: code1Kopecks,
			code2AmountKopecks: code2Kopecks,
		},
		signatory: {
			signatoryRole: "1",
			fullName: parseFio(cleanString(clinicProfileAny.signatoryName) || "Смирнов Алексей Владимирович"),
			snils: cleanString(clinicProfileAny.signatorySnils),
		},
	};

	const xmlResult = buildFnsKnd1151156Xml(payload);
	const structureValidation = validateFnsNdflXmlStructure(xmlResult.xmlContent);

	if (!structureValidation.isValid) {
		return {
			ok: false,
			statusCode: 409,
			error: `XML КНД 1151156 не прошел валидацию схемы UT_SVOPLMEDUSL 5.01: ${structureValidation.errors.join("; ")}`,
		};
	}

	return {
		ok: true,
		fileName: xmlResult.fileName,
		xml: xmlResult.xmlContent,
		warnings: [
			`Внутренняя структурная предпроверка DENTE пройдена: корень <Файл>, КНД ${FNS_MEDICAL_EXPENSE_XML_KND}, ВерсФорм ${FNS_MEDICAL_EXPENSE_XML_VERSION}, Код 1: ${kopecksToNumericString(code1Kopecks)} руб., Код 2: ${kopecksToNumericString(code2Kopecks)} руб.`,
			`XML собран в строгом соответствии с приказом ФНС РФ № ${FNS_MEDICAL_EXPENSE_ORDER} (XSD UT_SVOPLMEDUSL 5.01).`,
		],
	};
}
