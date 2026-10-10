import {
	MEDICAL_REFUSAL_COMPLICATIONS_PRESET,
} from "../../legal/legalContractsAndConsents.js";
import {
	DEFAULT_CLINIC_LICENSE_NUMBER,
	DEFAULT_REFUSAL_ALTERNATIVES,
	DEFAULT_REFUSAL_RISKS,
	DEFAULT_REFUSAL_WARNING_SIGNS,
	escapeHtml,
} from "./constants.js";
import type {
	MedicalInterventionRefusal1051nOptions,
	MedicalRefusalPresetKey,
} from "./types.js";

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
		patientPassport: p.passport || "",
		patientAddress: p.address || "",
		patientPhone: p.phone || "",
		patientSnils: p.snils || null,
		clinicLegalName: c?.legalName || 'ООО "Денте Клиник"',
		clinicAddress: c?.address || "",
		clinicOgrn: c?.ogrn || "",
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
	const passport = options.patientPassport || "_________________________";
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
		: DEFAULT_REFUSAL_RISKS;
	const alternatives = options.alternativesOffered && options.alternativesOffered.length > 0
		? options.alternativesOffered
		: DEFAULT_REFUSAL_ALTERNATIVES;
	const warnings = options.urgentWarningSigns && options.urgentWarningSigns.length > 0
		? options.urgentWarningSigns
		: DEFAULT_REFUSAL_WARNING_SIGNS;

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
			${options.clinicAddress ? `<div style="font-size: 9.5px; color: #64748b;">${escapeHtml(options.clinicAddress)}</div>` : ""}
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
