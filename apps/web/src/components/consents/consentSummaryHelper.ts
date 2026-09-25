import {
	type ConsentPackageKey,
	type ConsentTemplateKey,
	getConsentPackage,
	getConsentTemplate,
} from "./consentTemplates.js";
import type { SignatureVectorData } from "./signaturePadMath.js";

export interface SignedConsentPayload {
	templateKey: ConsentTemplateKey;
	code: string;
	title: string;
	fullTextContent: string;
	patientName: string;
	birthDate: string;
	passport: string;
	doctorName: string;
	clinicName: string;
	diagnosisIcd: string;
	toothNumbers: string;
	signatureSvg: string;
	signaturePngBase64: string;
	vectorData: SignatureVectorData;
	integrityHash: string;
	signedAt: string;
	verificationMethod: "tablet_stylus" | "sms_otp" | "paper_physical";
	smsOtpCode?: string | null;
	attachedToForm043u: boolean;
	paperOriginalStored?: boolean;
	statusText?: string;
	note?: string;
}

export interface PatientConsentSummaryParams {
	activeMode: "packages" | "single";
	patientName?: string | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	clinicLegalName?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	toothNumbers?: string | null | undefined;
	customDiagnosis?: string | null | undefined;
	diagnosisIcd?: string | null | undefined;
	packageKey?: ConsentPackageKey | undefined;
	templateKey?: ConsentTemplateKey | undefined;
	integrityHash?: string | undefined;
}

/**
 * Формирует выжимку согласия и памятку для пациента без эмодзи (Мандаты 8d п. 7, 8e п. 5, 8i, 8k, 8n).
 * Готова для 1-клик отправки в WhatsApp / Telegram / SMS.
 */
export function buildPatientConsentSummary(params: PatientConsentSummaryParams): string {
	const effectivePatientName = (params.patientName || "Пациент").trim();
	const effectiveDoctorName = (
		params.doctorName ||
		(params.doctorSpecialty ? `Врач-стоматолог (${params.doctorSpecialty})` : null) ||
		"Лечащий врач"
	).trim();
	const effectiveClinicName = (params.clinicName || params.clinicLegalName || "ООО «Стоматологическая клиника ДЕНТЕ»").trim();
	const effectiveClinicPhone = (params.clinicPhone || "").trim();
	const effectiveTeeth = (params.toothNumbers || "").trim();
	const hashPrefix = (params.integrityHash || "0000000000000000").slice(0, 16);

	if (params.activeMode === "packages") {
		const pkg = getConsentPackage(params.packageKey || "PACKAGE_PRIMARY_VISIT");
		const docList = pkg.templateKeys
			.map((key) => {
				const tpl = getConsentTemplate(key);
				return `${tpl.title} (${tpl.code})`;
			})
			.join(", ");

		const memoLines = [
			`Информированные согласия на лечение (клиника «${effectiveClinicName}»):`,
			`Пациент: ${effectivePatientName}`,
			`Пакет: ${pkg.title}`,
			`Документы: ${docList}`,
			`Врач: ${effectiveDoctorName}`,
			`Область лечения: ${effectiveTeeth || "По плану лечения"}`,
			`Хеш целостности SHA-256: ${hashPrefix}...`,
		];
		if (effectiveClinicPhone) {
			memoLines.push(`Памятка: перед приёмом ознакомьтесь с противопоказаниями. При возникновении вопросов звоните в клинику: ${effectiveClinicPhone}.`);
		} else {
			memoLines.push(`Памятка: перед приёмом ознакомьтесь с противопоказаниями.`);
		}
		return memoLines.join("\n");
	}

	const tpl = getConsentTemplate(params.templateKey || "CONSENT_THERAPY");
	const effectiveDiagnosis = (params.customDiagnosis || params.diagnosisIcd || "По плану лечения").trim();

	const memoLines = [
		`Информированное добровольное согласие (клиника «${effectiveClinicName}»):`,
		`Пациент: ${effectivePatientName}`,
		`Медицинское вмешательство: ${tpl.title} (${tpl.code})`,
		`Врач: ${effectiveDoctorName}`,
		`Область лечения: ${effectiveTeeth || "По показаниям"}`,
		`Диагноз МКБ: ${effectiveDiagnosis}`,
		`Ключевые риски и памятка: после вмешательства возможно появление локальной болезненности, отёка и чувствительности (1-3 дня). Строго соблюдайте назначения лечащего врача.`,
		`Хеш целостности SHA-256: ${hashPrefix}...`,
	];
	if (effectiveClinicPhone) {
		memoLines.push(`Телефон клиники: ${effectiveClinicPhone}.`);
	}
	return memoLines.join("\n");
}
