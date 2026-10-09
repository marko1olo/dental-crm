/**
 * ============================================================================
 * CHAIRSIDE CONSENT ENGINE - STORAGE BRIDGE & SIGNING PROTOCOLS (LAYER 2)
 * Подписание документов: ПЭП 63-ФЗ, Бумажный носитель 323-ФЗ, Стилус, Личное согласие
 * ============================================================================
 */

import type {
	ChairsideConsentPackage,
	ChairsidePepSignatureRecord,
	ChairsideSmsOtpState,
} from "./types.js";
import {
	generateDocumentPackageIntegrityHash,
	generateLegalPepStamp,
	generateSha256,
} from "./consentCryptoFingerprint.js";
import {
	formatRussianDateTime,
	generateChairsideSmsOtp,
	maskRussianPhone,
	verifyChairsideSmsOtp,
} from "./consentSignatureCapture.js";

/**
 * Отправка реального СМС-кода через бэкенд телефонии / портала
 */
export async function sendChairsideBackendSmsOtp(
	phone: string,
): Promise<{ success: boolean; maskedPhone?: string; error?: string }> {
	try {
		const res = await fetch("/api/portal/auth/send-otp", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ phone }),
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			return { success: false, error: data.error || `Ошибка отправки СМС (${res.status})` };
		}
		const data = await res.json();
		return { success: true, maskedPhone: data.maskedPhone || maskRussianPhone(phone) };
	} catch (err: unknown) {
		return { success: false, error: err instanceof Error ? err.message : "Сетевая ошибка отправки СМС" };
	}
}

/**
 * Проверка введенного СМС-кода через бэкенд
 */
export async function verifyChairsideBackendSmsOtp(
	phone: string,
	code: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const res = await fetch("/api/portal/auth/verify-otp", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ phone, code }),
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			return { success: false, error: data.error || "Неверный проверочный код СМС" };
		}
		return { success: true };
	} catch (err: unknown) {
		return { success: false, error: err instanceof Error ? err.message : "Ошибка проверки СМС" };
	}
}

/**
 * Отправка СМС-кода пациенту и перевод пакета в статус "sms_sent" (63-ФЗ)
 */
export function sendChairsideSmsOtpToPatient(
	pkg: ChairsideConsentPackage,
	customPhone?: string,
	explicitOtpCode?: string,
): ChairsideConsentPackage {
	const targetPhone = customPhone || pkg.patient.phone || "";
	const smsOtp = generateChairsideSmsOtp(targetPhone, explicitOtpCode);

	return {
		...pkg,
		patient: {
			...pkg.patient,
			phone: targetPhone,
		},
		smsOtp,
		status: "sms_sent",
	};
}

/**
 * Подписание пакета документов простой электронной подписью (ПЭП) по СМС-коду (63-ФЗ)
 */
export function signPackageWithSmsPep(
	pkg: ChairsideConsentPackage,
	params: {
		inputCode: string;
		form043uChartNumber?: string;
		signedAtIso?: string;
		nowMs?: number;
	},
): {
	success: boolean;
	signedPackage?: ChairsideConsentPackage;
	error?: string;
} {
	const verification = verifyChairsideSmsOtp(params.inputCode, pkg.smsOtp, params.nowMs);
	if (!verification.isValid) {
		if (pkg.smsOtp) {
			pkg.smsOtp.attemptsCount += 1;
		}
		return { success: false, error: verification.reason || "Неверный СМС-код подтверждения" };
	}

	const signedAtIso = params.signedAtIso || new Date().toISOString();
	const timestamp = new Date(signedAtIso).getTime();
	const signedAtFormatted = formatRussianDateTime(signedAtIso);

	const targetPhone = pkg.smsOtp?.phone || pkg.patient.phone || "";
	const phoneMasked = pkg.smsOtp?.phoneMasked || maskRussianPhone(targetPhone);

	const integrity = generateDocumentPackageIntegrityHash(
		pkg,
		params.inputCode.trim(),
		targetPhone,
		signedAtIso,
	);

	const cardNum = params.form043uChartNumber || pkg.patient.cardNumber || ("043/у-" + pkg.packageId.slice(-6));
	const legalStampText = generateLegalPepStamp({
		otpCode: params.inputCode.trim(),
		hash: integrity.hash,
		phoneMasked,
		signedAtFormatted,
	});

	const docsDigest = pkg.documents.map((d) => d.code).join("; ");

	const signatureRecord: ChairsidePepSignatureRecord = {
		verificationMethod: "sms_63fz_pep",
		phone: targetPhone,
		phoneMasked,
		otpCodeConfirmed: "****",
		timestamp,
		signedAtIso,
		signedAtFormatted,
		signedByFullName: pkg.patient.fullName,
		form043uRecordId: cardNum,
		integrityHash: integrity.hash,
		legalStampText,
		legalBasis: "Федеральный закон от 06.04.2011 № 63-ФЗ, ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ, Приказ Минздрава РФ от 12.11.2021 № 1051н",
		documentsDigest: docsDigest,
	};

	const updatedDocs = pkg.documents.map((doc) => ({
		...doc,
		isSigned: true,
		signedAt: signedAtIso,
		integrityHash: integrity.hash,
	}));

	const updatedOtp: ChairsideSmsOtpState = {
		...(pkg.smsOtp || generateChairsideSmsOtp(targetPhone, params.inputCode.trim())),
		isVerified: true,
	};

	const signedPackage: ChairsideConsentPackage = {
		...pkg,
		patient: {
			...pkg.patient,
			phone: targetPhone,
			cardNumber: cardNum,
		},
		documents: updatedDocs,
		smsOtp: updatedOtp,
		signature: signatureRecord,
		status: "signed",
	};

	return {
		success: true,
		signedPackage,
	};
}

/**
 * Подписание и оформление пакета документов на бумажном носителе (ст. 20 323-ФЗ, 152-ФЗ, ПП РФ № 736)
 * Обеспечивает полную автономность врача и клиники без блокировок по СМС.
 */
export function signPackageWithPaperPhysical(
	pkg: ChairsideConsentPackage,
	options?: {
		signedAtIso?: string;
		form043uChartNumber?: string;
	},
): ChairsideConsentPackage {
	const signedAtIso = options?.signedAtIso || new Date().toISOString();
	const timestamp = new Date(signedAtIso).getTime();
	const signedAtFormatted = formatRussianDateTime(signedAtIso);

	const targetPhone = pkg.smsOtp?.phone || pkg.patient.phone || "";
	const phoneMasked = targetPhone ? maskRussianPhone(targetPhone) : "Не указан";
	const cardNum =
		options?.form043uChartNumber || pkg.patient.cardNumber || ("043/у-" + pkg.packageId.slice(-6));

	const docsDigests = pkg.documents
		.map((d) => `${d.type}:${d.code}:${generateSha256(d.title + d.sections.map((s) => s.content).join(""))}`)
		.join(";");

	const estimateDigest = pkg.treatmentItems
		.map((it) => `${it.serviceCode}:${it.toothNumber || ""}:${it.quantity}:${it.totalKopecks}`)
		.join(";");

	const canonicalLines = [
		"=== CANONICAL DENTAL CHAIRSIDE PAPER CONSENT RECORD (323-FZ / 152-FZ / 736-PP) ===",
		"PACKAGE_ID: " + pkg.packageId,
		"TIMESTAMP_ISO: " + signedAtIso,
		"PATIENT_FULL_NAME: " + pkg.patient.fullName.trim().toUpperCase(),
		"PATIENT_BIRTH_DATE: " + pkg.patient.birthDate.trim(),
		"PATIENT_PASSPORT: " + (pkg.patient.passport || "").trim(),
		"PATIENT_PHONE: " + targetPhone.trim(),
		"FORM_043U_CARD: " + cardNum.trim(),
		"DOCTOR_FULL_NAME: " + pkg.doctor.fullName.trim().toUpperCase(),
		"CLINIC_OGRN: " + pkg.clinic.ogrn.trim(),
		"CLINIC_INN: " + pkg.clinic.inn.trim(),
		"DOCUMENTS_DIGEST: " + docsDigests,
		"ESTIMATE_TOTAL_KOPECKS: " + pkg.totalEstimateKopecks,
		"ESTIMATE_DIGEST: " + estimateDigest,
		"VERIFICATION_METHOD: PAPER_PHYSICAL",
		"======================================================================",
	];

	const canonicalData = canonicalLines.join("\n");
	const integrityHash = generateSha256(canonicalData);

	const legalStampText =
		"ДОКУМЕНТЫ ОФОРМЛЕНЫ НА БУМАГЕ (ст. 20 323-ФЗ, 152-ФЗ, ПП РФ № 736). Личная подпись пациента подшита в карту 043/у";

	const docsDigest = pkg.documents.map((d) => d.code).join("; ");

	const signatureRecord: ChairsidePepSignatureRecord = {
		verificationMethod: "paper_physical",
		phone: targetPhone,
		phoneMasked,
		otpCodeConfirmed: "БУМАЖНЫЙ_НОСИТЕЛЬ",
		timestamp,
		signedAtIso,
		signedAtFormatted,
		signedByFullName: pkg.patient.fullName,
		form043uRecordId: cardNum,
		integrityHash,
		legalStampText,
		legalBasis:
			"ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ, Федеральный закон от 27.07.2006 № 152-ФЗ, Постановление Правительства РФ от 11.05.2023 № 736",
		documentsDigest: docsDigest,
	};

	const updatedDocs = pkg.documents.map((doc) => ({
		...doc,
		isSigned: true,
		signedAt: signedAtIso,
		integrityHash,
	}));

	return {
		...pkg,
		patient: {
			...pkg.patient,
			cardNumber: cardNum,
		},
		documents: updatedDocs,
		signature: signatureRecord,
		status: "signed",
	};
}

/**
 * Подписание согласий стилусом на экране планшета (touch_tablet_signature, 63-ФЗ)
 */
export function signPackageWithTouchSignature(
	pkg: ChairsideConsentPackage,
	options: {
		signatureDataUrl?: string;
		form043uChartNumber?: string;
		signedAtIso?: string;
	},
): ChairsideConsentPackage {
	const signedAtIso = options?.signedAtIso || new Date().toISOString();
	const timestamp = new Date(signedAtIso).getTime();
	const signedAtFormatted = formatRussianDateTime(signedAtIso);

	const targetPhone = pkg.smsOtp?.phone || pkg.patient.phone || "";
	const phoneMasked = targetPhone ? maskRussianPhone(targetPhone) : "Не указан";
	const cardNum =
		options?.form043uChartNumber || pkg.patient.cardNumber || ("043/у-" + pkg.packageId.slice(-6));

	const docsDigests = pkg.documents
		.map((d) => `${d.type}:${d.code}:${generateSha256(d.title + d.sections.map((s) => s.content).join(""))}`)
		.join(";");

	const estimateDigest = pkg.treatmentItems
		.map((it) => `${it.serviceCode}:${it.toothNumber || ""}:${it.quantity}:${it.totalKopecks}`)
		.join(";");

	const canonicalLines = [
		"=== CANONICAL DENTAL CHAIRSIDE TOUCH SIGNATURE RECORD (63-FZ / 323-FZ / 1051N) ===",
		"PACKAGE_ID: " + pkg.packageId,
		"TIMESTAMP_ISO: " + signedAtIso,
		"PATIENT_FULL_NAME: " + pkg.patient.fullName.trim().toUpperCase(),
		"PATIENT_BIRTH_DATE: " + pkg.patient.birthDate.trim(),
		"FORM_043U_CARD: " + cardNum.trim(),
		"DOCTOR_FULL_NAME: " + pkg.doctor.fullName.trim().toUpperCase(),
		"CLINIC_OGRN: " + pkg.clinic.ogrn.trim(),
		"CLINIC_INN: " + pkg.clinic.inn.trim(),
		"DOCUMENTS_DIGEST: " + docsDigests,
		"ESTIMATE_TOTAL_KOPECKS: " + pkg.totalEstimateKopecks,
		"ESTIMATE_DIGEST: " + estimateDigest,
		"SIGNATURE_VECTOR_HASH: " + generateSha256(options.signatureDataUrl || "TOUCH_SCREEN_STYLUS"),
		"VERIFICATION_METHOD: TOUCH_TABLET_SIGNATURE",
		"==================================================================================",
	];

	const canonicalData = canonicalLines.join("\n");
	const integrityHash = generateSha256(canonicalData);

	const legalStampText =
		"ПОДПИСАНО НА ПЛАНШЕТЕ ВРАЧА (стилус / сенсорный экран, 63-ФЗ, 323-ФЗ, Приказ МЗ РФ № 1051н)";

	const docsDigest = pkg.documents.map((d) => d.code).join("; ");

	const signatureRecord: ChairsidePepSignatureRecord = {
		verificationMethod: "touch_tablet_signature",
		phone: targetPhone,
		phoneMasked,
		otpCodeConfirmed: "TOUCH_TABLET_SIGNATURE",
		timestamp,
		signedAtIso,
		signedAtFormatted,
		signedByFullName: pkg.patient.fullName,
		form043uRecordId: cardNum,
		integrityHash,
		legalStampText,
		legalBasis:
			"ст. 2, 6 Федерального закона от 06.04.2011 № 63-ФЗ, ст. 20 323-ФЗ, Приказ Минздрава РФ от 12.11.2021 № 1051н",
		documentsDigest: docsDigest,
	};

	const updatedDocs = pkg.documents.map((doc) => ({
		...doc,
		isSigned: true,
		signedAt: signedAtIso,
		integrityHash,
	}));

	return {
		...pkg,
		patient: {
			...pkg.patient,
			cardNumber: cardNum,
		},
		documents: updatedDocs,
		signature: signatureRecord,
		status: "signed",
	};
}

/**
 * 1-клик подтверждение согласий в присутствии пациента у кресла
 */
export function signPackageWithInPersonConfirmation(
	pkg: ChairsideConsentPackage,
	options?: {
		form043uChartNumber?: string;
		signedAtIso?: string;
	},
): ChairsideConsentPackage {
	const signedAtIso = options?.signedAtIso || new Date().toISOString();
	const timestamp = new Date(signedAtIso).getTime();
	const signedAtFormatted = formatRussianDateTime(signedAtIso);

	const targetPhone = pkg.smsOtp?.phone || pkg.patient.phone || "";
	const phoneMasked = targetPhone ? maskRussianPhone(targetPhone) : "Не указан";
	const cardNum =
		options?.form043uChartNumber || pkg.patient.cardNumber || ("043/у-" + pkg.packageId.slice(-6));

	const docsDigests = pkg.documents
		.map((d) => `${d.type}:${d.code}:${generateSha256(d.title + d.sections.map((s) => s.content).join(""))}`)
		.join(";");

	const estimateDigest = pkg.treatmentItems
		.map((it) => `${it.serviceCode}:${it.toothNumber || ""}:${it.quantity}:${it.totalKopecks}`)
		.join(";");

	const canonicalLines = [
		"=== CANONICAL DENTAL CHAIRSIDE IN-PERSON CONFIRMATION (323-FZ / 1051N / DOCTOR AUTONOMY) ===",
		"PACKAGE_ID: " + pkg.packageId,
		"TIMESTAMP_ISO: " + signedAtIso,
		"PATIENT_FULL_NAME: " + pkg.patient.fullName.trim().toUpperCase(),
		"PATIENT_BIRTH_DATE: " + pkg.patient.birthDate.trim(),
		"FORM_043U_CARD: " + cardNum.trim(),
		"DOCTOR_FULL_NAME: " + pkg.doctor.fullName.trim().toUpperCase(),
		"CLINIC_OGRN: " + pkg.clinic.ogrn.trim(),
		"CLINIC_INN: " + pkg.clinic.inn.trim(),
		"DOCUMENTS_DIGEST: " + docsDigests,
		"ESTIMATE_TOTAL_KOPECKS: " + pkg.totalEstimateKopecks,
		"ESTIMATE_DIGEST: " + estimateDigest,
		"VERIFICATION_METHOD: CHAIRSIDE_IN_PERSON_CONFIRMATION",
		"=====================================================================================",
	];

	const canonicalData = canonicalLines.join("\n");
	const integrityHash = generateSha256(canonicalData);

	const legalStampText =
		"ЛИЧНОЕ СОГЛАСИЕ В ПРИСУТСТВИИ ПАЦИЕНТА В КРЕСЛЕ (ст. 20 323-ФЗ, Приказ МЗ РФ № 1051н)";

	const docsDigest = pkg.documents.map((d) => d.code).join("; ");

	const signatureRecord: ChairsidePepSignatureRecord = {
		verificationMethod: "chairside_in_person_confirmation",
		phone: targetPhone,
		phoneMasked,
		otpCodeConfirmed: "IN_PERSON_CONFIRMATION",
		timestamp,
		signedAtIso,
		signedAtFormatted,
		signedByFullName: pkg.patient.fullName,
		form043uRecordId: cardNum,
		integrityHash,
		legalStampText,
		legalBasis:
			"ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ, Приказ Минздрава РФ от 12.11.2021 № 1051н",
		documentsDigest: docsDigest,
	};

	const updatedDocs = pkg.documents.map((doc) => ({
		...doc,
		isSigned: true,
		signedAt: signedAtIso,
		integrityHash,
	}));

	return {
		...pkg,
		patient: {
			...pkg.patient,
			cardNumber: cardNum,
		},
		documents: updatedDocs,
		signature: signatureRecord,
		status: "signed",
	};
}
