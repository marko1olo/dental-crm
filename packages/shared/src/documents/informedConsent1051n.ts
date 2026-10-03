import { z } from "zod";
import { CLINICAL_DOCUMENT_PRINT_STYLES } from "./clinicalHtmlRenderers.js";
import {
	BASE_INFORMED_CONSENT_PRESET,
	CLINICAL_CONSENT_PRESETS,
	MEDICAL_REFUSAL_COMPLICATIONS_PRESET,
	type ProcedureSpecificConsentProcedure,
} from "../legal/legalContractsAndConsents.js";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ЕДИНЫЙ КАНОНИЧЕСКИЙ SSOT ИДС (ПРИКАЗ МИНЗДРАВА РФ № 1051н, СТ. 20 323-ФЗ)
 * Single Source of Truth for Informed Voluntary Consent across DENTE Monorepo
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const DEFAULT_CLINIC_LICENSE_NUMBER = "ЛО41-01137-77/00368421";
export const DEFAULT_CLINIC_LICENSE_DATE = "12.10.2021";
export const DEFAULT_CLINIC_LICENSE_ISSUER = "Департамент здравоохранения города Москвы";

function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export const informedConsentTypeSchema = z.enum([
	"general_primary",
	"local_anesthesia",
	"therapy_endo_restoration",
	"surgery_extraction",
	"implantation_bone_graft",
	"prosthetics",
	"orthodontics",
	"hygiene_whitening",
	"periodontology",
	"custom",
]);
export type InformedConsentType = z.infer<typeof informedConsentTypeSchema>;

export const informedConsent1051nPayloadSchema = z.object({
	consentType: informedConsentTypeSchema.default("general_primary"),
	consentTitle: z.string().trim().min(1).max(240).default("ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО"),
	clinicLegalName: z.string().trim().min(1).max(240).default('ООО "Денте Клиник"'),
	clinicAddress: z.string().trim().max(240).default(""),
	clinicOgrn: z.string().trim().max(32).default("1234567890123"),
	clinicInn: z.string().trim().max(16).default(""),
	medicalLicenseNumber: z.string().trim().max(64).default(DEFAULT_CLINIC_LICENSE_NUMBER),
	medicalLicenseDate: z.string().trim().max(32).default(DEFAULT_CLINIC_LICENSE_DATE),
	patientFullName: z.string().trim().min(1).max(160),
	patientBirthDate: z.string().trim().min(10).max(32),
	patientPassport: z.string().trim().max(120).default(""),
	patientAddress: z.string().trim().max(240).default(""),
	patientPhone: z.string().trim().max(64).default(""),
	patientSnils: z.string().trim().max(32).nullable().optional(),
	representativeFullName: z.string().trim().max(160).nullable().optional(),
	representativePassport: z.string().trim().max(120).nullable().optional(),
	representativeRelation: z.string().trim().max(80).nullable().optional(),
	attendingDoctorFullName: z.string().trim().max(160).default(""),
	attendingDoctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог-терапевт"),
	diagnosisOrIndication: z.string().trim().min(1).max(300),
	interventionName: z.string().trim().min(1).max(300),
	plannedAnesthesia: z.string().trim().max(300).nullable().optional(),
	materialsAndSystems: z.string().trim().max(500).nullable().optional(),
	explainedRisks: z.array(z.string().trim()).min(1),
	alternatives: z.array(z.string().trim()).min(1),
	aftercareRequirements: z.array(z.string().trim()).min(1),
	confirmedVoluntary: z.boolean().default(true),
	questionsAnswered: z.boolean().default(true),
	consentDate: z.string().trim().min(10).max(32).default(() => new Date().toISOString().slice(0, 10)),
	isClosed: z.boolean().optional(),
	isDraft: z.boolean().optional(),
	isSigned: z.boolean().optional(),
	watermarkText: z.string().optional(),
});
export type InformedConsent1051nPayload = z.infer<typeof informedConsent1051nPayloadSchema>;

/**
 * Опции для формирования Информированного добровольного согласия (ИДС) по Приказу Минздрава РФ № 1051н.
 */
export interface InformedConsent1051nOptions {
	readonly patientFullName?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly patientPassport?: string | null | undefined;
	readonly patientAddress?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly patientSnils?: string | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinicLicense?: string | null | undefined;
	readonly interventionType?: "therapy" | "surgery" | "anesthesia" | "general" | string | undefined;
	readonly toothNumbers?: string | null | undefined;
	readonly diagnosisIcd?: string | null | undefined;
	readonly consentDate?: string | null | undefined;
	readonly isClosed?: boolean | undefined;
	readonly isDraft?: boolean | undefined;
	readonly isSigned?: boolean | undefined;
	readonly status?: string | undefined;
	readonly watermarkText?: string | undefined;
}

/**
 * Генератор пресета ИДС по Приказу Минздрава РФ № 1051н для конкретной процедуры.
 */
export function generateStatutoryConsent1051nPayload(params: {
	consentType: InformedConsentType;
	patient: {
		fullName: string;
		birthDate: string;
		passport?: string | null;
		address?: string | null;
		phone?: string | null;
		snils?: string | null;
	};
	doctor: {
		fullName: string;
		specialty?: string | null;
	};
	clinic?: {
		legalName?: string;
		address?: string;
		ogrn?: string;
		inn?: string;
		medicalLicenseNumber?: string;
	};
	representative?: {
		fullName?: string | null;
		passport?: string | null;
		relation?: string | null;
	} | null;
	customNotes?: string | null;
}): InformedConsent1051nPayload {
	const c = params.clinic;
	const p = params.patient;
	const d = params.doctor;
	const rep = params.representative;

	let title = "ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО (ПРИКАЗ МЗ РФ № 1051н)";
	let intervention: string = BASE_INFORMED_CONSENT_PRESET.intervention;
	let diagnosis: string = BASE_INFORMED_CONSENT_PRESET.diagnosisOrIndication;
	let anesthesia: string | null | undefined = BASE_INFORMED_CONSENT_PRESET.plannedAnesthesia;
	let materials: string | null | undefined = BASE_INFORMED_CONSENT_PRESET.materialOrMedicationNotes;
	let risks: readonly string[] = BASE_INFORMED_CONSENT_PRESET.explainedRisks;
	let alternatives: readonly string[] = BASE_INFORMED_CONSENT_PRESET.alternatives;
	let aftercare: readonly string[] = BASE_INFORMED_CONSENT_PRESET.aftercareRequirements;

	if (params.consentType in CLINICAL_CONSENT_PRESETS) {
		const preset = CLINICAL_CONSENT_PRESETS[params.consentType as ProcedureSpecificConsentProcedure];
		if (preset) {
			title = `ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ: ${preset.procedureName.toUpperCase()}`;
			intervention = preset.procedureName;
			diagnosis = preset.diagnosisOrIndication;
			anesthesia = preset.plannedAnesthesia;
			materials = preset.materialsAndSystems;
			risks = preset.procedureSpecificRisks;
			alternatives = preset.alternatives;
			aftercare = preset.aftercareAndLimits;
		}
	}

	return {
		consentType: params.consentType,
		consentTitle: title,
		clinicLegalName: c?.legalName || 'ООО "Денте Клиник"',
		clinicAddress: c?.address || "",
		clinicOgrn: c?.ogrn || "1234567890123",
		clinicInn: c?.inn || "",
		medicalLicenseNumber: c?.medicalLicenseNumber || DEFAULT_CLINIC_LICENSE_NUMBER,
		medicalLicenseDate: DEFAULT_CLINIC_LICENSE_DATE,
		patientFullName: p.fullName,
		patientBirthDate: p.birthDate,
		patientPassport: p.passport || "Паспорт гражданина РФ",
		patientAddress: p.address || "г. Москва",
		patientPhone: p.phone || "+7 (999) 000-00-00",
		patientSnils: p.snils || null,
		representativeFullName: rep?.fullName || null,
		representativePassport: rep?.passport || null,
		representativeRelation: rep?.relation || null,
		attendingDoctorFullName: d.fullName,
		attendingDoctorSpecialty: d.specialty || "Врач-стоматолог",
		diagnosisOrIndication: diagnosis,
		interventionName: intervention,
		plannedAnesthesia: anesthesia,
		materialsAndSystems: materials,
		explainedRisks: [...risks],
		alternatives: [...alternatives],
		aftercareRequirements: [...aftercare],
		confirmedVoluntary: true,
		questionsAnswered: true,
		consentDate: new Date().toISOString().slice(0, 10),
	};
}

/**
 * Генерация структурированного текста официального бланка ИДС (Приказ № 1051н).
 */
export function generateInformedConsent1051nText(
	options: InformedConsent1051nOptions,
): string {
	const clinic =
		options.clinicName || "Стоматологическая клиника «DENTE» (ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»)";
	const license =
		options.clinicLicense ||
		"№ ЛО41-01137-77/00368421 от 14.02.2023 г. выдана Департаментом здравоохранения города Москвы";
	const patient = options.patientFullName || "________________________________________";
	const birthDate = options.patientBirthDate || "____.____.________";
	const passport = options.patientPassport || "документ, удостоверяющий личность: ____________________";
	const doctor = options.doctorFullName || "________________________________________";
	const date = options.consentDate || new Date().toLocaleDateString("ru-RU");
	const diagnosis = options.diagnosisIcd ? ` по поводу: ${options.diagnosisIcd}` : "";
	const teeth = options.toothNumbers ? ` в области зубов: ${options.toothNumbers}` : "";

	return `ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО
(в соответствии со статьей 20 Федерального закона от 21.11.2011 № 323-ФЗ и Приказом Минздрава России от 12.11.2021 № 1051н)

Медицинская организация: ${clinic}
Лицензия: ${license}

1. Я, ${patient}, дата рождения: ${birthDate} (${passport}), даю информированное добровольное согласие на проведение комплекса медицинских вмешательств${teeth}${diagnosis} лечащему врачу ${doctor}.
2. Мне в доступной форме разъяснены цели, методы оказания медицинской помощи, связанный с ними риск, возможные варианты медицинских вмешательств, их последствия, в том числе вероятность развития осложнений, а также предполагаемые результаты оказания медицинской помощи.
3. Согласие дано на следующие виды стоматологических вмешательств:
   - Местная инфильтрационная, проводниковая или аппликационная анестезия;
   - Препарирование твердых тканей зубов, медикаментозная обработка кариозных полостей и корневых каналов;
   - Эндодонтическое и терапевтическое лечение, постановка светоотверждаемых пломб и реставраций;
   - Хирургические манипуляции (при необходимости: удаление зубов, наложение швов, кюретаж лунки);
   - Рентгенологические исследования (прицельная радиовизиография, ОПТГ, КЛКТ).
4. Я подтверждаю, что сообщил(а) лечащему врачу полную информацию о наличии соматических заболеваний, аллергических реакций на лекарственные препараты и постоянном приеме медикаментов.
5. Я поставлен(а) в известность о необходимости строгого соблюдения назначенного режима лечения, послеоперационного ухода и явки на контрольные осмотры.

Дата оформления: ${date}

Пациент (законный представитель): _________________________ / ${patient}
(подпись)

Врач-стоматолог: _________________________ / ${doctor}
(подпись)

М.П. Клиники`;
}

/**
 * Генерация HTML-разметки официального печатного бланка ИДС А4 (Приказ № 1051н).
 */
export function generateInformedConsent1051nHtml(
	options: InformedConsent1051nOptions,
): string {
	const clinic =
		options.clinicName || "Стоматологическая клиника «DENTE» (ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»)";
	const license =
		options.clinicLicense ||
		"№ ЛО41-01137-77/00368421 от 14.02.2023 г. выдана Департаментом здравоохранения города Москвы";
	const patient = options.patientFullName || "—";
	const birthDate = options.patientBirthDate || "—";
	const passport = options.patientPassport || "Паспорт гражданина РФ: _________________________";
	const address = options.patientAddress || "__________________________________________________";
	const doctor = options.doctorFullName || "—";
	const specialty = options.doctorSpecialty || "Врач-стоматолог";
	const date = options.consentDate || new Date().toLocaleDateString("ru-RU");
	const diagnosis = options.diagnosisIcd ? ` по диагнозу: ${options.diagnosisIcd}` : "";
	const teeth = options.toothNumbers ? ` в области зубов: ${options.toothNumbers}` : "";

	const isClosedOrSigned = Boolean(
		options.isSigned ||
		options.isClosed ||
		options.status === "closed" ||
		options.status === "signed" ||
		options.status === "completed" ||
		options.status === "issued",
	);
	const effectiveWatermark =
		options.watermarkText ||
		(isClosedOrSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК");
	const stampColor = isClosedOrSigned ? "#059669" : "#64748b";

	return `<div class="informed-consent-a4-sheet" style="position: relative; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #ffffff; padding: 24px; max-width: 72ch; margin: 0 auto; line-height: 1.5; font-size: 12px;">
	<div class="watermark-draft" style="position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 52pt; font-weight: 900; color: rgba(0, 0, 0, 0.04); text-transform: uppercase; letter-spacing: 4pt; pointer-events: none; z-index: 0; user-select: none;" aria-hidden="true">${effectiveWatermark}</div>
	<div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
		<div>
			<div style="font-size: 15px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: normal; word-break: normal; overflow-wrap: break-word; hyphens: none;">${clinic}</div>
			<div style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 2px;">Лицензия: ${license}</div>
			<div style="font-size: 10px; color: #64748b;">119048, г. Москва, ул. Стоматологическая, д. 24, корп. 1 • Тел: +7 (495) 777-88-99</div>
		</div>
		<div style="text-align: right; font-size: 11px; shrink: 0;">
			<div style="margin-bottom: 4px;">
				<span class="watermark-stamp" style="display: inline-block; border: 1.5pt solid ${stampColor}; color: ${stampColor}; padding: 1.5pt 5pt; border-radius: 2.5pt; font-size: 7pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;" aria-hidden="true">${effectiveWatermark}</span>
			</div>
			<div style="font-weight: 700; color: #0f172a;">Приказ Минздрава РФ № 1051н</div>
			<div style="color: #64748b;">Ст. 20 323-ФЗ</div>
			<div style="font-weight: 600; color: #0f766e; margin-top: 2px;">Дата: ${date}</div>
		</div>
	</div>

	<div style="text-align: center; margin-bottom: 16px;">
		<h1 style="font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a; letter-spacing: 0.02em;">
			Информированное добровольное согласие на медицинское вмешательство
		</h1>
		<div style="font-size: 10px; color: #64748b; margin-top: 4px;">
			(в соответствии со статьей 20 Федерального закона от 21.11.2011 № 323-ФЗ и Приказом Минздрава России от 12.11.2021 № 1051н)
		</div>
	</div>

	<table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; border: 1px solid #cbd5e1; page-break-inside: avoid; break-inside: avoid;">
		<tbody>
			<tr style="border-bottom: 1px solid #cbd5e1;">
				<td style="padding: 6px 8px; font-weight: 700; background: #f8fafc; width: 25%; border-right: 1px solid #cbd5e1;">Пациент (ФИО):</td>
				<td style="padding: 6px 8px; font-weight: 700; color: #0f172a; width: 40%; border-right: 1px solid #cbd5e1;">${patient}</td>
				<td style="padding: 6px 8px; font-weight: 700; background: #f8fafc; width: 15%; border-right: 1px solid #cbd5e1;">Дата рождения:</td>
				<td style="padding: 6px 8px; width: 20%;">${birthDate}</td>
			</tr>
			<tr style="border-bottom: 1px solid #cbd5e1;">
				<td style="padding: 6px 8px; font-weight: 700; background: #f8fafc; border-right: 1px solid #cbd5e1;">Паспортные данные:</td>
				<td style="padding: 6px 8px; border-right: 1px solid #cbd5e1;">${passport}</td>
				<td style="padding: 6px 8px; font-weight: 700; background: #f8fafc; border-right: 1px solid #cbd5e1;">Адрес проживания:</td>
				<td style="padding: 6px 8px;">${address}</td>
			</tr>
			<tr>
				<td style="padding: 6px 8px; font-weight: 700; background: #f8fafc; border-right: 1px solid #cbd5e1;">Лечащий врач:</td>
				<td style="padding: 6px 8px; font-weight: 600; border-right: 1px solid #cbd5e1;" colspan="3">${doctor} (${specialty})</td>
			</tr>
		</tbody>
	</table>

	<div style="text-align: justify; font-size: 11px; color: #1e293b; max-width: 68ch; margin: 0 auto; page-break-inside: avoid; break-inside: avoid;">
		<p style="margin: 0 0 8px 0;">
			<strong>1.</strong> Я, вышеуказанный(ая) пациент(ка) (или законный представитель), даю информированное добровольное согласие на проведение стоматологического медицинского вмешательства${teeth}${diagnosis} врачу ${doctor} в клинике «${clinic}».
		</p>
		<p style="margin: 0 0 8px 0;">
			<strong>2.</strong> Мне в доступной форме разъяснены цели, методы оказания медицинской помощи, связанный с ними риск, возможные варианты медицинских вмешательств, их последствия, в том числе вероятность развития осложнений, а также предполагаемые результаты оказания медицинской помощи.
		</p>
		<p style="margin: 0 0 8px 0;">
			<strong>3.</strong> Медицинское вмешательство включает: местную анестезию (инфильтрационная/проводниковая), препарирование твердых тканей, терапевтическое/эндодонтическое лечение, реставрацию зубов композитными материалами, хирургические процедуры (удаление зубов/кюретаж при показаниях) и рентгенодиагностику.
		</p>
		<p style="margin: 0 0 8px 0;">
			<strong>4.</strong> Я подтверждаю, что сообщил(а) врачу достоверные сведения о перенесенных заболеваниях, аллергических реакциях и принимаемых лекарствах. Я обязуюсь соблюдать предписанный режим лечения и гигиены.
		</p>
	</div>

	<div style="margin-top: 24px; padding-top: 14px; border-top: 1.5px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; page-break-inside: avoid; break-inside: avoid;">
		<div>
			<div style="font-weight: 700; color: #0f172a;">Пациент (законный представитель):</div>
			<div style="margin-top: 24px;">_________________________ / ${patient}</div>
			<div style="font-size: 9px; color: #64748b; margin-top: 2px;">(подпись и расшифровка)</div>
		</div>

		<div style="width: 70px; height: 70px; border: 1.5px dashed #94a3b8; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">
			<span>М.П.</span>
			<span style="font-size: 8px; font-weight: 400;">Клиники</span>
		</div>

		<div style="text-align: right;">
			<div style="font-weight: 700; color: #0f172a;">Врач-стоматолог:</div>
			<div style="margin-top: 24px;">_________________________ / ${doctor}</div>
			<div style="font-size: 9px; color: #64748b; margin-top: 2px;">(подпись и личная печать)</div>
		</div>
	</div>
</div>`;
}

/**
 * Рендерер Информированного добровольного согласия (ИДС) по Приказу Минздрава № 1051н
 */
export function renderInformedConsent1051nHtml(payload: InformedConsent1051nPayload | InformedConsent1051nOptions | any): string {
	// Если переданы компактные опции визита (без детального реестра рисков) — рендерим А4-бланк
	if (!payload.explainedRisks && (payload.toothNumbers !== undefined || payload.isClosed !== undefined || payload.watermarkText !== undefined || payload.diagnosisIcd !== undefined)) {
		return generateInformedConsent1051nHtml(payload as InformedConsent1051nOptions);
	}

	const clinicName = payload.clinicLegalName || payload.clinicName || payload.organization?.fullName || 'ООО "Денте Клиник"';
	const clinicAddress = payload.clinicAddress || payload.organization?.address || "г. Москва";
	const clinicOgrn = payload.clinicOgrn || payload.organization?.ogrn || "—";
	const clinicInn = payload.clinicInn || payload.organization?.inn || "—";
	const medLic = payload.medicalLicenseNumber || payload.clinicLicense || DEFAULT_CLINIC_LICENSE_NUMBER;
	const medLicDate = payload.medicalLicenseDate || DEFAULT_CLINIC_LICENSE_DATE;

	const patientName = payload.patientFullName || payload.patient?.fullName || "—";
	const patientBirth = payload.patientBirthDate || payload.patient?.birthDate || "—";
	const patientPassport = payload.patientPassport || payload.patient?.passport || "Паспорт гражданина РФ";
	const patientAddress = payload.patientAddress || payload.patient?.address || "—";
	const patientPhone = payload.patientPhone || payload.patient?.phone || "—";
	const patientSnils = payload.patientSnils || payload.patient?.snils || "—";

	const repName = payload.representativeFullName;
	const repPassport = payload.representativePassport;
	const repRelation = payload.representativeRelation;

	const doctorName = payload.attendingDoctorFullName || payload.doctorFullName || "Врач-стоматолог";
	const doctorSpecialty = payload.attendingDoctorSpecialty || payload.doctorSpecialty || "Врач-стоматолог";
	const consentDate = payload.consentDate || new Date().toISOString().slice(0, 10);

	const title = payload.consentTitle || "ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО";
	const diagnosis = payload.diagnosisOrIndication || payload.diagnosisIcd || "Стоматологическое обследование и лечение";
	const intervention = payload.interventionName || "Стоматологическое вмешательство";
	const anesthesia = payload.plannedAnesthesia || "Местная инфильтрационная / проводниковая анестезия";
	const materials = payload.materialsAndSystems || "Сертифицированные стоматологические материалы";

	const risks: string[] = payload.explainedRisks || [
		"Вероятность аллергических реакций на местный анестетик и антисептики",
		"Болевые ощущения и отек мягких тканей в раннем послеоперационном периоде",
	];
	const alternatives: string[] = payload.alternatives || [
		"Отказ от вмешательства с прогрессированием патологического процесса",
	];
	const aftercare: string[] = payload.aftercareRequirements || [
		"Соблюдение рекомендаций лечащего врача и явки на контрольные осмотры",
	];

	const risksList = risks.map((r) => `<li style="margin-bottom:3px;">${escapeHtml(r)}</li>`).join("");
	const alternativesList = alternatives.map((a) => `<li style="margin-bottom:3px;">${escapeHtml(a)}</li>`).join("");
	const aftercareList = aftercare.map((ac) => `<li style="margin-bottom:3px;">${escapeHtml(ac)}</li>`).join("");

	const isClosedOrSigned = Boolean(
		payload.isSigned ||
		payload.isClosed ||
		payload.status === "closed" ||
		payload.status === "signed" ||
		payload.status === "completed" ||
		payload.status === "issued",
	);
	const watermark = payload.watermarkText || (isClosedOrSigned ? "ПОДПИСАНО ВРАЧОМ" : payload.isDraft ? "ЧЕРНОВИК" : undefined);
	const watermarkHtml = watermark
		? `<div style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 48pt; font-weight: 900; color: rgba(0, 0, 0, 0.04); text-transform: uppercase; letter-spacing: 4pt; pointer-events: none; z-index: 0;" aria-hidden="true">${escapeHtml(watermark)}</div>`
		: "";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
${CLINICAL_DOCUMENT_PRINT_STYLES}
<style>
  .consent-block {
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 6px 8px;
    margin-bottom: 6px;
    background: #ffffff;
    font-size: 8.5pt;
    line-height: 1.35;
  }
  .consent-subtitle {
    font-weight: bold;
    font-size: 9pt;
    color: #0f172a;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 2px;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  ul.consent-list {
    margin: 3px 0 3px 18px;
    padding: 0;
  }
</style>
</head>
<body>
<div class="doc-container" style="position: relative;">
  ${watermarkHtml}
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>Адрес: ${escapeHtml(clinicAddress)} | ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)}</div>
      <div>Лицензия на осуществление медицинской деятельности: <strong>№ ${escapeHtml(medLic)}</strong> от ${escapeHtml(medLicDate)} г.</div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">МИНЗДРАВ РОССИИ</div>
      <div>Приказ МЗ РФ от 12.11.2021 № 1051н</div>
      <div>ст. 20 Федерального закона № 323-ФЗ</div>
      <div style="font-weight:bold; color:#0f172a;">ИДС на медвмешательство</div>
    </div>
  </div>

  <div class="doc-title-block" style="margin: 6px 0;">
    <h1 class="doc-main-title" style="font-size:10.5pt; line-height:1.2;">${escapeHtml(title)}</h1>
    <p class="doc-sub-title">Дата оформления: <strong>${escapeHtml(consentDate)}</strong> | Лечащий врач: <strong>${escapeHtml(doctorName)}</strong></p>
  </div>

  <div class="consent-block">
    <div class="consent-subtitle">1. Сведения о пациенте и законном представителе</div>
    <div>Я, гражданин(ка) <strong>${escapeHtml(repName ? `${repName} (законный представитель)` : patientName)}</strong>,
    ${repName ? `действующий(ая) в интересах пациента <strong>${escapeHtml(patientName)}</strong> (дата рождения: ${escapeHtml(patientBirth)}), документ: ${escapeHtml(repPassport || "—")}, отношение: ${escapeHtml(repRelation || "родитель / опекун")},` : `дата рождения: <strong>${escapeHtml(patientBirth)}</strong>, документ: <strong>${escapeHtml(patientPassport)}</strong>,`}
    зарегистрированный(ая) по адресу: <strong>${escapeHtml(patientAddress)}</strong>, тел: <strong>${escapeHtml(patientPhone)}</strong>, СНИЛС: <strong>${escapeHtml(patientSnils)}</strong>,
    настоящим даю информированное добровольное согласие на медицинское вмешательство в клинике <strong>${escapeHtml(clinicName)}</strong>.</div>
  </div>

  <div class="consent-block">
    <div class="consent-subtitle">2. Клинический диагноз, цели и характер вмешательства</div>
    <div><strong>Клинический диагноз / показания:</strong> <span style="color:#0369a1; font-weight:bold;">${escapeHtml(diagnosis)}</span></div>
    <div style="margin-top:2px;"><strong>Планируемое медицинское вмешательство:</strong> <strong>${escapeHtml(intervention)}</strong></div>
    <div style="margin-top:2px;"><strong>Вид планируемого обезболивания:</strong> ${escapeHtml(anesthesia)}</div>
    ${materials ? `<div style="margin-top:2px;"><strong>Применяемые материалы, препараты и системы:</strong> ${escapeHtml(materials)}</div>` : ""}
  </div>

  <div class="consent-block">
    <div class="consent-subtitle">3. Возможные риски, клинические осложнения и последствия вмешательства</div>
    <div style="font-size:8pt; color:#334155; margin-bottom:2px;">Мне в доступной и понятной форме разъяснено, что любое медицинское вмешательство сопряжено с вероятностью развития непредвиденных реакций организма:</div>
    <ul class="consent-list" style="font-size:8pt;">
      ${risksList}
    </ul>
  </div>

  <div class="consent-block">
    <div class="consent-subtitle">4. Альтернативные методы лечения и последствия отказа</div>
    <ul class="consent-list" style="font-size:8pt;">
      ${alternativesList}
    </ul>
  </div>

  <div class="consent-block">
    <div class="consent-subtitle">5. Режим после вмешательства и обязанности пациента</div>
    <ul class="consent-list" style="font-size:8pt;">
      ${aftercareList}
    </ul>
  </div>

  <div class="consent-block" style="background:#f8fafc;">
    <div style="font-size:8pt; line-height:1.35;">
      1. Я подтверждаю, что сообщил(а) врачу все достоверные сведения о состоянии своего здоровья, перенесенных заболеваниях, аллергических реакциях и принимаемых препаратах.<br>
      2. Мне предоставлена возможность задать все интересующие меня вопросы, на которые я получил(а) исчерпывающие и понятные ответы.<br>
      3. Решение о проведении медицинского вмешательства принято мною добровольно и осознанно.
    </div>
  </div>

  <div class="signature-row" style="margin-top:12px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Пациент (Законный представитель): <strong>${escapeHtml(repName || patientName)}</strong></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Лечащий врач: <strong>${escapeHtml(doctorName)}</strong> <span class="stamp-seal">М.П.</span></div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * СТАТУТНЫЙ ОТКАЗ ОТ МЕДИЦИНСКОГО ВМЕШАТЕЛЬСТВА (ПРИКАЗ МЗ РФ № 1051н, ПРИЛОЖЕНИЕ № 2)
 * Single Source of Truth for Medical Intervention Refusal (Part 3 Art. 20 323-FZ)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type MedicalRefusalPresetKey = keyof typeof MEDICAL_REFUSAL_COMPLICATIONS_PRESET;

export interface MedicalInterventionRefusal1051nOptions {
	readonly patientFullName?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly patientPassport?: string | null | undefined;
	readonly patientAddress?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly patientSnils?: string | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinicLicense?: string | null | undefined;
	readonly clinicAddress?: string | null | undefined;
	readonly clinicOgrn?: string | null | undefined;
	readonly clinicInn?: string | null | undefined;
	readonly refusedIntervention?: string | null | undefined;
	readonly clinicalIndication?: string | null | undefined;
	readonly toothNumbers?: string | null | undefined;
	readonly patientReason?: string | null | undefined;
	readonly explainedRisks?: readonly string[] | undefined;
	readonly alternativesOffered?: readonly string[] | undefined;
	readonly urgentWarningSigns?: readonly string[] | undefined;
	readonly refusalDate?: string | null | undefined;
	readonly isClosed?: boolean | undefined;
	readonly isDraft?: boolean | undefined;
	readonly isSigned?: boolean | undefined;
	readonly status?: string | undefined;
	readonly watermarkText?: string | undefined;
	readonly representativeFullName?: string | null | undefined;
	readonly representativePassport?: string | null | undefined;
	readonly representativeRelation?: string | null | undefined;
}

/**
 * Генератор пресета Отказа от медицинского вмешательства (Приказ МЗ РФ № 1051н, Приложение № 2).
 */
export function generateStatutoryRefusal1051nPayload(params: {
	presetKey?: MedicalRefusalPresetKey | undefined;
	refusedIntervention?: string | undefined;
	clinicalIndication?: string | undefined;
	patient: {
		fullName: string;
		birthDate: string;
		passport?: string | null;
		address?: string | null;
		phone?: string | null;
		snils?: string | null;
	};
	doctor: {
		fullName: string;
		specialty?: string | null;
	};
	clinic?: {
		legalName?: string;
		address?: string;
		ogrn?: string;
		inn?: string;
		medicalLicenseNumber?: string;
	};
	representative?: {
		fullName?: string | null;
		passport?: string | null;
		relation?: string | null;
	} | null;
	toothNumbers?: string | null;
	patientReason?: string | null;
	customRisks?: readonly string[];
	customAlternatives?: readonly string[];
	customWarningSigns?: readonly string[];
	refusalDate?: string;
}) {
	const c = params.clinic;
	const p = params.patient;
	const d = params.doctor;
	const rep = params.representative;
	const preset = params.presetKey ? MEDICAL_REFUSAL_COMPLICATIONS_PRESET[params.presetKey] : MEDICAL_REFUSAL_COMPLICATIONS_PRESET.caries_endo_refusal;

	const intervention = params.refusedIntervention || preset.refusedIntervention;
	const indication = params.clinicalIndication || preset.clinicalIndication;
	const risks = params.customRisks || preset.explainedRisks;
	const alternatives = params.customAlternatives || preset.alternativesOffered;
	const warnings = params.customWarningSigns || preset.urgentWarningSigns;

	return {
		refusedIntervention: intervention,
		clinicalIndication: indication,
		patientReason: params.patientReason || null,
		explainedRisks: [...risks],
		alternativesOffered: [...alternatives],
		urgentWarningSigns: [...warnings],
		doctorFullName: d.fullName,
		doctorSpecialty: d.specialty || "Врач-стоматолог",
		patientFullName: p.fullName,
		patientBirthDate: p.birthDate,
		patientPassport: p.passport || "Паспорт гражданина РФ",
		patientAddress: p.address || "",
		patientPhone: p.phone || "",
		patientSnils: p.snils || null,
		clinicLegalName: c?.legalName || 'ООО "Денте Клиник"',
		clinicAddress: c?.address || "",
		clinicOgrn: c?.ogrn || "1234567890123",
		clinicInn: c?.inn || "",
		medicalLicenseNumber: c?.medicalLicenseNumber || DEFAULT_CLINIC_LICENSE_NUMBER,
		representativeFullName: rep?.fullName || null,
		representativePassport: rep?.passport || null,
		representativeRelation: rep?.relation || null,
		toothNumbers: params.toothNumbers || null,
		refusalConfirmedAt: params.refusalDate || new Date().toISOString().slice(0, 10),
		patientUnderstandsConsequences: true as const,
		secondOpinionOffered: true as const,
		emergencyCareExplained: true as const,
	};
}

/**
 * Генерация структурированного текста официального бланка Отказа от медицинского вмешательства (Приказ № 1051н).
 */
export function generateMedicalInterventionRefusal1051nText(
	options: MedicalInterventionRefusal1051nOptions,
): string {
	const clinic = options.clinicName || "Стоматологическая клиника «DENTE» (ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»)";
	const license = options.clinicLicense || "№ ЛО41-01137-77/00368421 от 14.02.2023 г. выдана Департаментом здравоохранения города Москвы";
	const patient = options.patientFullName || "________________________________________";
	const birthDate = options.patientBirthDate || "____.____.________";
	const passport = options.patientPassport || "документ, удостоверяющий личность: ____________________";
	const doctor = options.doctorFullName || "________________________________________";
	const date = options.refusalDate || new Date().toLocaleDateString("ru-RU");
	const intervention = options.refusedIntervention || "стоматологическое вмешательство";
	const indication = options.clinicalIndication ? ` по показаниям: ${options.clinicalIndication}` : "";
	const teeth = options.toothNumbers ? ` в области зубов: ${options.toothNumbers}` : "";
	const rep = options.representativeFullName ? ` через законного представителя: ${options.representativeFullName}` : "";

	return `ОТКАЗ ОТ МЕДИЦИНСКОГО ВМЕШАТЕЛЬСТВА
(в соответствии с ч. 3 ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ и Приказом Минздрава России от 12.11.2021 № 1051н, Приложение № 2)

Медицинская организация: ${clinic}
Лицензия: ${license}

1. Я, ${patient}, дата рождения: ${birthDate} (${passport})${rep}, заявляю об отказе от предложенного медицинского вмешательства: ${intervention}${teeth}${indication} лечащего врача ${doctor}.
2. Мне в доступной для меня форме разъяснены цели, характер предложенного медицинского вмешательства, а также возможные последствия отказа от него, включая прогрессирование имеющегося заболевания, риск развития гнойно-септических осложнений, потерю зуба, распространение воспаления на окружающие ткани и ухудшение общего состояния здоровья.
3. Мне предложены альтернативные методы медицинской помощи и варианты консультаций.
4. Мне разъяснены тревожные признаки (острая нарастающая боль, отек лица, повышение температуры, тризм), требующие немедленного обращения за неотложной медицинской помощью.
5. Мне разъяснено право повторно обратиться за медицинской помощью в любое время.
6. Решение об отказе от медицинского вмешательства принято мною добровольно и осознанно.

Дата оформления: ${date}

Пациент (законный представитель): _________________________ / ${patient}
(подпись)

Врач: _________________________ / ${doctor}
(подпись)

М.П. Клиники`;
}

/**
 * Генерация HTML-разметки официального печатного бланка Отказа от медицинского вмешательства А4 (Приказ № 1051н, Приложение № 2).
 */
export function generateMedicalInterventionRefusal1051nHtml(
	options: MedicalInterventionRefusal1051nOptions,
): string {
	const clinic = options.clinicName || "Стоматологическая клиника «DENTE» (ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»)";
	const license = options.clinicLicense || "№ ЛО41-01137-77/00368421 от 14.02.2023 г.";
	const patient = options.patientFullName || "—";
	const birthDate = options.patientBirthDate || "—";
	const passport = options.patientPassport || "Паспорт гражданина РФ: _________________________";
	const address = options.patientAddress || "__________________________________________________";
	const doctor = options.doctorFullName || "—";
	const specialty = options.doctorSpecialty || "Врач-стоматолог";
	const date = options.refusalDate || new Date().toLocaleDateString("ru-RU");
	const intervention = options.refusedIntervention || "Стоматологическое лечение";
	const indication = options.clinicalIndication || "Клинические показания по плану лечения";
	const teeth = options.toothNumbers ? ` (область зубов: ${escapeHtml(options.toothNumbers)})` : "";
	const reason = options.patientReason ? options.patientReason : "Пациент причину не указал";

	const repName = options.representativeFullName;
	const repPassport = options.representativePassport;
	const repRelation = options.representativeRelation;

	const risks = options.explainedRisks && options.explainedRisks.length > 0
		? options.explainedRisks
		: [
			"Прогрессирование патологического процесса и разрушение твердых тканей зуба",
			"Переход воспаления в периапикальные ткани и кость челюсти",
			"Развитие одонтогенных гнойно-септических осложнений (периостит, флегмона, остеомиелит)",
			"Необратимая потеря зуба и деструкция костной ткани",
		];
	const alternatives = options.alternativesOffered && options.alternativesOffered.length > 0
		? options.alternativesOffered
		: [
			"Консервативное лечение по утвержденным клиническим протоколам",
			"Консультация другого специалиста / заведующего отделением (второе мнение)",
		];
	const warnings = options.urgentWarningSigns && options.urgentWarningSigns.length > 0
		? options.urgentWarningSigns
		: [
			"Нарастание отека лица, щеки или шеи",
			"Повышение температуры тела выше 37.5 °C",
			"Затрудненное открывание рта или глотание",
			"Острая пульсирующая боль",
		];

	const isClosedOrSigned = Boolean(
		options.isSigned ||
		options.isClosed ||
		options.status === "closed" ||
		options.status === "signed" ||
		options.status === "completed" ||
		options.status === "issued",
	);
	const effectiveWatermark =
		options.watermarkText ||
		(isClosedOrSigned ? "ПОДПИСАНО ВРАЧОМ / ПАЦИЕНТОМ" : "ЧЕРНОВИК");
	const stampColor = isClosedOrSigned ? "#059669" : "#64748b";

	const risksList = risks.map((r) => `<li style="margin-bottom: 2px;">${escapeHtml(r)}</li>`).join("");
	const alternativesList = alternatives.map((a) => `<li style="margin-bottom: 2px;">${escapeHtml(a)}</li>`).join("");
	const warningsList = warnings.map((w) => `<li style="margin-bottom: 2px;">${escapeHtml(w)}</li>`).join("");

	return `<div class="medical-refusal-a4-sheet" style="position: relative; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #ffffff; padding: 24px; max-width: 72ch; margin: 0 auto; line-height: 1.45; font-size: 11.5px;">
	<div class="watermark-draft" style="position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 48pt; font-weight: 900; color: rgba(0, 0, 0, 0.04); text-transform: uppercase; letter-spacing: 4pt; pointer-events: none; z-index: 0; user-select: none;" aria-hidden="true">${escapeHtml(effectiveWatermark)}</div>
	<div style="border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
		<div>
			<div style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #0f172a;">${escapeHtml(clinic)}</div>
			<div style="font-size: 10.5px; font-weight: 600; color: #475569; margin-top: 2px;">Лицензия: ${escapeHtml(license)}</div>
			<div style="font-size: 9.5px; color: #64748b;">${escapeHtml(options.clinicAddress || "г. Москва")}</div>
		</div>
		<div style="text-align: right; font-size: 10.5px; shrink: 0;">
			<div style="margin-bottom: 4px;">
				<span class="watermark-stamp" style="display: inline-block; border: 1.5pt solid ${stampColor}; color: ${stampColor}; padding: 1.5pt 5pt; border-radius: 2.5pt; font-size: 7pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;" aria-hidden="true">${escapeHtml(effectiveWatermark)}</span>
			</div>
			<div style="font-weight: 700; color: #0f172a;">Приказ Минздрава РФ № 1051н</div>
			<div style="color: #64748b;">Приложение № 2 • ч. 3 ст. 20 323-ФЗ</div>
			<div style="font-weight: 600; color: #b45309; margin-top: 2px;">Дата: ${escapeHtml(date)}</div>
		</div>
	</div>

	<div style="text-align: center; margin-bottom: 12px;">
		<h1 style="font-size: 13.5px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a; letter-spacing: 0.02em;">
			Отказ от медицинского вмешательства
		</h1>
		<div style="font-size: 9.5px; color: #64748b; margin-top: 3px;">
			(в соответствии с ч. 3 ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ и Приказом Минздрава России от 12.11.2021 № 1051н)
		</div>
	</div>

	<table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10.5px; border: 1px solid #cbd5e1; page-break-inside: avoid; break-inside: avoid;">
		<tbody>
			<tr style="border-bottom: 1px solid #cbd5e1;">
				<td style="padding: 5px 8px; font-weight: 700; background: #f8fafc; width: 25%; border-right: 1px solid #cbd5e1;">Пациент (ФИО):</td>
				<td style="padding: 5px 8px; font-weight: 700; color: #0f172a; width: 40%; border-right: 1px solid #cbd5e1;">${escapeHtml(patient)}</td>
				<td style="padding: 5px 8px; font-weight: 700; background: #f8fafc; width: 15%; border-right: 1px solid #cbd5e1;">Дата рождения:</td>
				<td style="padding: 5px 8px; width: 20%;">${escapeHtml(birthDate)}</td>
			</tr>
			<tr style="border-bottom: 1px solid #cbd5e1;">
				<td style="padding: 5px 8px; font-weight: 700; background: #f8fafc; border-right: 1px solid #cbd5e1;">Паспортные данные:</td>
				<td style="padding: 5px 8px; border-right: 1px solid #cbd5e1;">${escapeHtml(passport)}</td>
				<td style="padding: 5px 8px; font-weight: 700; background: #f8fafc; border-right: 1px solid #cbd5e1;">Адрес:</td>
				<td style="padding: 5px 8px;">${escapeHtml(address)}</td>
			</tr>
			${repName ? `
			<tr style="border-bottom: 1px solid #cbd5e1;">
				<td style="padding: 5px 8px; font-weight: 700; background: #f8fafc; border-right: 1px solid #cbd5e1;">Законный представитель:</td>
				<td style="padding: 5px 8px;" colspan="3">${escapeHtml(repName)} (${escapeHtml(repRelation || "представитель")}, документ: ${escapeHtml(repPassport || "—")})</td>
			</tr>` : ""}
			<tr>
				<td style="padding: 5px 8px; font-weight: 700; background: #f8fafc; border-right: 1px solid #cbd5e1;">Лечащий врач:</td>
				<td style="padding: 5px 8px; font-weight: 600; border-right: 1px solid #cbd5e1;" colspan="3">${escapeHtml(doctor)} (${escapeHtml(specialty)})</td>
			</tr>
		</tbody>
	</table>

	<div style="font-size: 10.5px; color: #1e293b; max-width: 68ch; margin: 0 auto; page-break-inside: avoid; break-inside: avoid;">
		<div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 4px; padding: 6px 8px; margin-bottom: 8px;">
			<div style="font-weight: 700; color: #92400e;">1. Предложенное медицинское вмешательство:</div>
			<div style="margin-top: 2px;"><strong>${escapeHtml(intervention)}</strong>${teeth}</div>
			<div style="margin-top: 2px; color: #475569;">Клиническое показание / диагноз: <strong>${escapeHtml(indication)}</strong></div>
			<div style="margin-top: 2px; color: #64748b; font-size: 9.5px;">Причина отказа со слов пациента: <em>${escapeHtml(reason)}</em></div>
		</div>

		<p style="margin: 0 0 6px 0; text-align: justify;">
			<strong>2.</strong> Я, вышеуказанный(ая) гражданин(ка) (или законный представитель), в соответствии с частью 3 статьи 20 Федерального закона от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в РФ» и Приказом Минздрава России от 12.11.2021 № 1051н, заявляю об отказе от проведения вышеуказанного медицинского вмешательства.
		</p>
		<p style="margin: 0 0 6px 0; text-align: justify;">
			<strong>3. Разъяснение возможных последствий отказа:</strong> Мне в доступной для меня форме разъяснены возможные последствия отказа от медицинского вмешательства, включая риск прогрессирования заболевания:
		</p>
		<ul style="margin: 0 0 6px 18px; padding: 0; font-size: 10px;">
			${risksList}
		</ul>

		<p style="margin: 0 0 6px 0; text-align: justify;">
			<strong>4. Предложенные альтернативы:</strong>
		</p>
		<ul style="margin: 0 0 6px 18px; padding: 0; font-size: 10px;">
			${alternativesList}
		</ul>

		<p style="margin: 0 0 6px 0; text-align: justify;">
			<strong>5. Тревожные признаки (немедленно обратиться за экстренной помощью):</strong>
		</p>
		<ul style="margin: 0 0 6px 18px; padding: 0; font-size: 10px;">
			${warningsList}
		</ul>

		<p style="margin: 0 0 6px 0; text-align: justify;">
			<strong>6. Волеизъявление:</strong> Мне разъяснено право повторно обратиться за медицинской помощью в любое время. Я подтверждаю, что последствия отказа от медицинского вмешательства мне полностью понятны, решение принято мною добровольно и осознанно. Медицинская организация и лечащий врач освобождаются от ответственности за прогрессирование патологического процесса, вызванное данным отказом.
		</p>
	</div>

	<div style="margin-top: 18px; padding-top: 12px; border-top: 1.5px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10.5px; page-break-inside: avoid; break-inside: avoid;">
		<div>
			<div style="font-weight: 700; color: #0f172a;">Пациент (законный представитель):</div>
			<div style="margin-top: 20px;">_________________________ / ${escapeHtml(repName || patient)}</div>
			<div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">(подпись и расшифровка)</div>
		</div>

		<div style="width: 60px; height: 60px; border: 1.5px dashed #94a3b8; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">
			<span>М.П.</span>
			<span style="font-size: 7.5px; font-weight: 400;">Клиники</span>
		</div>

		<div style="text-align: right;">
			<div style="font-weight: 700; color: #0f172a;">Врач, проводивший разъяснение:</div>
			<div style="margin-top: 20px;">_________________________ / ${escapeHtml(doctor)}</div>
			<div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">(подпись и личная печать)</div>
		</div>
	</div>
</div>`;
}

/**
 * Рендерер Отказа от медицинского вмешательства по Приказу Минздрава № 1051н (Приложение № 2)
 */
export function renderMedicalInterventionRefusal1051nHtml(payload: MedicalInterventionRefusal1051nOptions | any): string {
	return generateMedicalInterventionRefusal1051nHtml(payload);
}

