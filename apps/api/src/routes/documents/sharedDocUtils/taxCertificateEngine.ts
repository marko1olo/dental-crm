import { createHash } from "node:crypto";
import type {
	ClinicProfile,
	GeneratedDocument,
	Patient,
	Payment,
	TaxPaymentSnapshot,
	TaxXmlSourceSnapshot,
	FnsIdentityDocument,
	FnsKinshipCode,
	FnsTaxPayload,
} from "@dental/shared";
import {
	buildFnsKnd1151156Xml as sharedBuildFnsKnd1151156Xml,
	cleanDigits,
	generateFnsFileNameAndId as sharedGenerateFnsFileNameAndId,
	kopecksToNumericString,
	parseFio,
	parseKopecks,
	preflightValidatePayload,
	sumKopecks,
	validateFnsNdflXmlStructure,
	FNS_ORDER_824_NAME,
	FNS_XSD_VERSION_501,
	KND_1151156,
	KND_1184043,
} from "@dental/shared";
import { repairMojibakeText } from "../../../text/repairMojibake.js";
import { getDocumentsByPatientId } from "../../../db/documentQuery.js";
import {
	paymentIdsForTaxDocument,
	receiptKeysForTaxDocument,
	taxDocumentDuplicateSensitive,
	taxPaymentSnapshotTotalRub,
	taxPaymentsForDocumentScope,
} from "../../../documents/taxPaymentSnapshot.js";
import {
	normalizeTaxApplicationRelationship,
	normalizedDocumentChainValue,
	type TaxCertificateAnnualTaxpayerScope,
} from "./types.js";

export function normalizedTaxpayerInn(
	value: string | null | undefined,
): string {
	return (value ?? "").replace(/\D+/g, "");
}

function paymentAnnualTaxpayerScope(
	payment: Payment,
): TaxCertificateAnnualTaxpayerScope {
	const relationship =
		normalizeTaxApplicationRelationship(payment.payerRelationship) ??
		normalizedDocumentChainValue(payment.payerRelationship);
	return {
		inn: normalizedTaxpayerInn(payment.payerInn),
		identityKey: [
			normalizedDocumentChainValue(payment.payerFullName),
			normalizedDocumentChainValue(payment.payerBirthDate),
			normalizedDocumentChainValue(payment.payerIdentityDocument),
			relationship,
		].join("|"),
	};
}

function annualTaxpayerScopesForDocument(
	document: GeneratedDocument,
): TaxCertificateAnnualTaxpayerScope[] {
	const scopes = new Map<string, TaxCertificateAnnualTaxpayerScope>();
	const addScope = (scope: TaxCertificateAnnualTaxpayerScope) => {
		const key = scope.inn
			? `inn:${scope.inn}`
			: `identity:${scope.identityKey}`;
		if (scope.inn || scope.identityKey.replace(/\|/g, ""))
			scopes.set(key, scope);
	};

	for (const payment of taxPaymentsForDocumentScope(document, [])) {
		addScope(paymentAnnualTaxpayerScope(payment));
	}

	const documentInn =
		normalizedTaxpayerInn(document.taxPayerInn) ||
		normalizedTaxpayerInn(document.taxPaymentSnapshot?.taxPayerInn);
	if (documentInn) {
		addScope({ inn: documentInn, identityKey: "" });
	}

	return [...scopes.values()];
}

function annualTaxpayerScopesOverlap(
	left: readonly TaxCertificateAnnualTaxpayerScope[],
	right: readonly TaxCertificateAnnualTaxpayerScope[],
): boolean {
	for (const leftScope of left) {
		for (const rightScope of right) {
			if (leftScope.inn && rightScope.inn && leftScope.inn === rightScope.inn)
				return true;
			if (
				leftScope.identityKey &&
				rightScope.identityKey &&
				leftScope.identityKey === rightScope.identityKey
			)
				return true;
		}
	}
	return false;
}

export async function findIssuedDuplicateTaxCertificate(
	document: GeneratedDocument,
	_payments: import("@dental/shared").Payment[],
): Promise<GeneratedDocument | null> {
	const allDocuments = await getDocumentsByPatientId(
		document.organizationId,
		document.patientId,
	);
	if (!taxDocumentDuplicateSensitive(document.kind) || !document.taxYear)
		return null;
	const targetAnnualScopes = annualTaxpayerScopesForDocument(document);
	const targetReceiptKeys = receiptKeysForTaxDocument(document, []);
	const targetPaymentIds = paymentIdsForTaxDocument(document, []);
	if (
		!targetAnnualScopes.length &&
		!targetReceiptKeys.size &&
		!targetPaymentIds.size
	)
		return null;

	for (const candidate of allDocuments) {
		if (candidate.patientId !== document.patientId) continue;
		if (candidate.taxYear !== document.taxYear) continue;
		if (candidate.status !== "issued") continue;
		if (candidate.kind !== document.kind) continue;
		if (candidate.organizationId !== document.organizationId) continue;
		if (candidate.id === document.id) continue;

		const candidateAnnualScopes = annualTaxpayerScopesForDocument(candidate);
		if (annualTaxpayerScopesOverlap(targetAnnualScopes, candidateAnnualScopes))
			return candidate;

		const candidateReceiptKeys = receiptKeysForTaxDocument(candidate, []);
		let hasReceiptKey = false;
		for (const key of candidateReceiptKeys) {
			if (targetReceiptKeys.has(key)) {
				hasReceiptKey = true;
				break;
			}
		}
		if (hasReceiptKey) return candidate;

		const candidatePaymentIds = paymentIdsForTaxDocument(candidate, []);
		let hasPaymentId = false;
		for (const id of candidatePaymentIds) {
			if (targetPaymentIds.has(id)) {
				hasPaymentId = true;
				break;
			}
		}
		if (hasPaymentId) return candidate;
	}

	return null;
}

export function taxSnapshotDocument(
	document: GeneratedDocument,
	snapshot: TaxPaymentSnapshot | null,
): GeneratedDocument {
	if (!snapshot) return document;
	return {
		...document,
		totalAmountRub: taxPaymentSnapshotTotalRub(snapshot),
		taxPaymentSnapshot: snapshot,
	};
}

function cloneSnapshotValue<T>(value: T): T {
	return structuredClone(value);
}

export function taxXmlSourceSnapshotSha256(
	snapshot: TaxXmlSourceSnapshot | null | undefined,
): string | null {
	if (!snapshot) return null;
	return createHash("sha256")
		.update(JSON.stringify(snapshot), "utf8")
		.digest("hex");
}

export function taxXmlSourceSnapshotForIssue(
	document: GeneratedDocument,
	patient: Patient,
	snapshot: TaxPaymentSnapshot | null,
	issuedAt: string,
	clinicProfile?: ClinicProfile | null,
): TaxXmlSourceSnapshot | null {
	if (document.kind !== "tax_deduction_certificate" || !snapshot) return null;
	const profile: ClinicProfile = clinicProfile
		? cloneSnapshotValue(clinicProfile)
		: {
				organizationId: document.organizationId,
				clinicName: "Клиника DENTE",
				legalName: null,
				inn: null,
				kpp: null,
				ogrn: null,
				address: null,
				phone: null,
				email: null,
				website: null,
				timezone: "Europe/Moscow",
				medicalLicenseNumber: null,
				medicalLicenseIssuedAt: null,
				mode: "small_clinic",
				defaultVisitMinutes: 30,
				scheduleDefaults: {
					workdayStart: "09:00",
					workdayEnd: "18:00",
					workingDays: [1, 2, 3, 4, 5, 6, 7],
					appointmentBufferMinutes: 0,
				},
				networkEnabled: false,
				egiszEnabled: false,
				updatedAt: new Date().toISOString(),
			};
	return {
		createdAt: issuedAt,
		patient: cloneSnapshotValue(patient),
		clinicProfile: profile,
		payments: snapshot.payments.map((payment) => cloneSnapshotValue(payment)),
	};
}

export function frozenTaxXmlPatient(
	document: GeneratedDocument,
	fallbackPatient: Patient,
): Patient {
	return document.taxXmlSourceSnapshot?.patient ?? fallbackPatient;
}

export function frozenTaxXmlClinicProfile(
	document: GeneratedDocument,
	fallbackClinicProfile: ClinicProfile,
): ClinicProfile {
	return document.taxXmlSourceSnapshot?.clinicProfile ?? fallbackClinicProfile;
}

export function frozenTaxXmlPayments(
	document: GeneratedDocument,
	fallbackPayments: Payment[],
): Payment[] {
	return document.taxXmlSourceSnapshot?.payments ?? fallbackPayments;
}

export function configuredTaxOfficeCode(): string | null {
	return (
		process.env.DENTE_FNS_TAX_OFFICE_CODE?.trim() ||
		process.env.FNS_TAX_OFFICE_CODE?.trim() ||
		null
	);
}


export type Knd1151156XmlContext = {
	clinicProfile: ClinicProfile;
	payments: Payment[];
	taxOfficeCode: string | null;
};

export type Knd1151156XmlResult =
	| { ok: true; fileName: string; xml: string; warnings: string[] }
	| { ok: false; statusCode: 409; error: string };

export const KND_1151156_PRINT_FORM_CODE = KND_1151156;
export const FNS_MEDICAL_EXPENSE_XML_KND = KND_1184043;
export const FNS_MEDICAL_EXPENSE_XML_VERSION = FNS_XSD_VERSION_501;
export const FNS_MEDICAL_EXPENSE_ORDER = FNS_ORDER_824_NAME;

export { preflightValidatePayload };

export function buildFnsKnd1151156Xml(
	payload: FnsTaxPayload,
	customUuid?: string,
) {
	return sharedBuildFnsKnd1151156Xml(
		{
			...payload,
			filePrefix: payload.filePrefix || "UT_SVOPLMEDUSL",
		},
		customUuid,
	);
}

export function generateFnsFileNameAndId(
	taxOfficeCode: string,
	senderInn: string,
	senderKpp: string | undefined | null,
	dateStr: string,
	customUuid?: string,
	filePrefix: string = "UT_SVOPLMEDUSL",
): { fileName: string; fileId: string; uuid: string } {
	return sharedGenerateFnsFileNameAndId(
		taxOfficeCode,
		senderInn,
		senderKpp,
		dateStr,
		customUuid,
		filePrefix,
	);
}

type ExtendedClinicProfile = Partial<ClinicProfile> & {
	signatoryName?: string | null;
	directorName?: string | null;
	signatorySnils?: string | null;
	licenseNumber?: string | null;
	medicalLicenseNumber?: string | null;
	licenseDate?: string | null;
	medicalLicenseIssuedAt?: string | null;
};

type ExtendedTaxPayment = Partial<Payment> & {
	code1AmountKopecks?: number;
	code2AmountKopecks?: number;
	code1AmountRub?: number;
	code2AmountRub?: number;
	items?: Array<{
		name?: string;
		amountRub?: number;
		amountKopecks?: number;
		code804n?: string;
		category?: string;
	}>;
	fiscalReceipt?: {
		items?: Array<{
			name?: string;
			amountRub?: number;
			amountKopecks?: number;
			code804n?: string;
			category?: string;
		}>;
	} | null;
	amountKopecks?: number;
	amount?: number | string;
	serviceName?: string;
	note?: string;
	code804n?: string;
	payerSnils?: string | null;
};

function cleanString(str?: string | null): string | undefined {
	if (!str) return undefined;
	const trimmed = repairMojibakeText(str).trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function compactDocumentNumber(doc: GeneratedDocument): string {
	const docRecord = doc as Record<string, unknown>;
	const candidate =
		typeof docRecord.number === "string"
			? docRecord.number
			: typeof docRecord.documentNumber === "string"
				? docRecord.documentNumber
				: doc.id;
	const raw = cleanDigits(candidate);
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
	return "1";
}

function parseIdentityDoc(raw?: string | null): FnsIdentityDocument | undefined {
	if (!raw) return undefined;
	const clean = cleanString(raw);
	if (!clean) return undefined;

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

	const cleanTaxOffice = cleanDigits(context.taxOfficeCode);
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

	const clinicProfileAny = context.clinicProfile as ExtendedClinicProfile;

	const clinicInn = cleanDigits(clinicProfileAny.inn);
	if (clinicInn.length !== 10 && clinicInn.length !== 12) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Для XML-выгрузки по форме КНД 1151156 нужен корректный ИНН клиники (10 знаков для юрлица или 12 знаков для ИП).",
		};
	}

	const scopedPayments = taxPaymentsForDocumentScope(document, context.payments);
	if (!scopedPayments.length) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Для XML-выгрузки по форме КНД 1151156 нужен хотя бы один оплаченный платеж за указанный налоговый год.",
		};
	}

	const invalidCodePayment = scopedPayments.find(
		(p) => p.taxDeductionCode && p.taxDeductionCode !== "1" && p.taxDeductionCode !== "2",
	);
	if (invalidCodePayment) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Для XML КНД 1151156 каждый платеж должен иметь код услуги 1 или 2.",
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

	const isSelfPayer =
		!firstPayment.payerFullName ||
		firstPayment.payerRelationship === "self" ||
		firstPayment.payerRelationship === "patient";

	const payerFullNameStr = cleanString(firstPayment.payerFullName) || cleanString(patient.fullName);
	if (!payerFullNameStr) {
		return {
			ok: false,
			statusCode: 409,
			error: "Не указано ФИО налогоплательщика. Формирование официальной справки ФНС невозможно.",
		};
	}
	const payerFio = parseFio(payerFullNameStr);
	const payerInn = cleanString(firstPayment.payerInn) || (isSelfPayer && firstPayment.payerInn === undefined ? cleanString(patient.administrativeProfile?.taxpayerInn) : undefined);
	const payerBirthDate = cleanString(firstPayment.payerBirthDate) || cleanString(patient.birthDate);
	if (!payerBirthDate) {
		return {
			ok: false,
			statusCode: 409,
			error: "Не указана дата рождения налогоплательщика. Поле обязательно для формата ФНС КНД 1151156.",
		};
	}
	const payerIdentity = parseIdentityDoc(firstPayment.payerIdentityDocument) || (isSelfPayer && firstPayment.payerIdentityDocument === undefined ? parseIdentityDoc(patient.administrativeProfile?.identityDocument) : undefined);
	if (!payerInn && !payerIdentity) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Для XML КНД 1151156 нужны ФИО, дата рождения и 12-значный ИНН либо документ личности налогоплательщика с датой выдачи.",
		};
	}

	const kinshipCode = mapRelationshipToKinshipCode(firstPayment.payerRelationship);

	const patientFullNameStr = cleanString(patient.fullName);
	if (!patientFullNameStr) {
		return {
			ok: false,
			statusCode: 409,
			error: "Не указано ФИО пациента. Формирование официальной справки ФНС невозможно.",
		};
	}
	const patientFio = parseFio(patientFullNameStr);
	const patientBirthDate = cleanString(patient.birthDate);
	if (!patientBirthDate) {
		return {
			ok: false,
			statusCode: 409,
			error: "Не указана дата рождения пациента. Поле обязательно для формата ФНС КНД 1151156.",
		};
	}
	const patientInn = cleanString(patient.administrativeProfile?.taxpayerInn);
	const patientIdentity = parseIdentityDoc(patient.administrativeProfile?.identityDocument);

	if (!isSelfPayer && !patientInn && !patientIdentity) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Если налогоплательщик и пациент разные, для XML КНД 1151156 нужны ФИО, дата рождения и 12-значный ИНН либо документ личности пациента с датой выдачи.",
		};
	}

	// Точный подсчет в копейках с поддержкой смешанных чеков (DOC-07 Fix)
	let code1Kopecks = 0;
	let code2Kopecks = 0;

	for (const p of scopedPayments) {
		const pAny = p as ExtendedTaxPayment;

		const rawAmountKop = typeof pAny.amountKopecks === "number"
			? pAny.amountKopecks
			: pAny.amountRub != null
				? parseKopecks(pAny.amountRub)
				: pAny.amount != null
					? parseKopecks(pAny.amount)
					: 0;

		const c1Explicit = pAny.code1AmountKopecks ?? (pAny.code1AmountRub != null ? parseKopecks(pAny.code1AmountRub) : undefined);
		const c2Explicit = pAny.code2AmountKopecks ?? (pAny.code2AmountRub != null ? parseKopecks(pAny.code2AmountRub) : undefined);
		const items = pAny.items || pAny.fiscalReceipt?.items || [];

		if (c1Explicit !== undefined || c2Explicit !== undefined) {
			code1Kopecks += c1Explicit ?? Math.max(0, rawAmountKop - (c2Explicit ?? 0));
			code2Kopecks += c2Explicit ?? Math.max(0, rawAmountKop - (c1Explicit ?? 0));
		} else if (items.length > 0) {
			for (const it of items) {
				const itKop = typeof it.amountKopecks === "number"
					? it.amountKopecks
					: it.amountRub != null
						? parseKopecks(it.amountRub)
						: 0;
				if (itKop <= 0) continue;
				if (it.code804n?.startsWith("A16.07.054") || it.name?.toLowerCase().includes("имплант") || it.name?.toLowerCase().includes("синус")) {
					code2Kopecks += itKop;
				} else {
					code1Kopecks += itKop;
				}
			}
		} else if (pAny.taxDeductionCode === "2") {
			code2Kopecks += rawAmountKop;
		} else {
			code1Kopecks += rawAmountKop;
		}
	}

	const clinicKpp = cleanDigits(clinicProfileAny.kpp) || undefined;
	const clinicOgrn = cleanDigits(clinicProfileAny.ogrn) || undefined;
	if (!clinicOgrn || (clinicOgrn.length !== 13 && clinicOgrn.length !== 15)) {
		return {
			ok: false,
			statusCode: 409,
			error: "Для XML КНД 1151156 укажите корректный ОГРН клиники (13 знаков для юрлица или 15 знаков для ИП) в настройках организации.",
		};
	}

	const clinicLegalName = cleanString(clinicProfileAny.legalName) || cleanString(clinicProfileAny.clinicName);
	if (!clinicLegalName) {
		return {
			ok: false,
			statusCode: 409,
			error: "Для XML КНД 1151156 укажите наименование клиники в настройках организации.",
		};
	}

	const clinicDirector = cleanString(clinicProfileAny.signatoryName) || cleanString(clinicProfileAny.directorName);
	if (!clinicDirector) {
		return {
			ok: false,
			statusCode: 409,
			error: "Для XML КНД 1151156 укажите ФИО руководителя / подписанта клиники в настройках организации.",
		};
	}

	const clinicLicenseNumber = cleanString(clinicProfileAny.licenseNumber) || cleanString(clinicProfileAny.medicalLicenseNumber);
	const clinicLicenseDate = cleanString(clinicProfileAny.licenseDate) || cleanString(clinicProfileAny.medicalLicenseIssuedAt);

	const firstPaymentAny = firstPayment as ExtendedTaxPayment | undefined;

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
			ogrn: clinicOgrn || "",
			name: clinicLegalName,
			isIndividualEntrepreneur: clinicInn.length === 12,
			directorName: clinicDirector,
			directorSnils: cleanString(clinicProfileAny.signatorySnils),
			license: clinicLicenseNumber
				? {
						number: clinicLicenseNumber,
						date: clinicLicenseDate || "",
					}
				: undefined,
		},
		payer: {
			fullName: payerFio,
			inn: payerInn,
			birthDate: payerBirthDate,
			identityDocument: payerIdentity,
			snils: cleanString(firstPaymentAny?.payerSnils),
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
			fullName: parseFio(clinicDirector),
			snils: cleanString(clinicProfileAny.signatorySnils),
		},
	};

	// Предварительная валидация через канонический валидатор shared
	const preflightIssues = preflightValidatePayload(payload);
	const preflightWarnings = preflightIssues
		.filter((issue) => issue.severity === "warning")
		.map((issue) => `[Предупреждение ФНС]: ${issue.field} — ${issue.message}`);

	const xmlResult = sharedBuildFnsKnd1151156Xml(payload);
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
			...preflightWarnings,
		],
	};
}
