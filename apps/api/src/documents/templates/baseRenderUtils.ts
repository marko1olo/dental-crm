import {
	type ClinicalToothRow,
	type ClinicProfile,
	type DocumentKind,
	formatKopecksRu,
	type GeneratedDocument,
	kopecksToNumericString,
	parseKopecks,
	type Patient,
	type Payment,
	renderGraphicalDentalFormulaHtml,
	type ServiceCatalogItem,
	type TreatmentPlanItem,
} from "@dental/shared";
import { repairMojibakeText } from "../../text/repairMojibake.js";
import {
	kopecksToWordsRu,
	legalMoneyInWordsFromKopecksRu,
	legalMoneyInWordsRu,
} from "../moneyWordsRu.js";

export type DocumentRenderContext = {
	clinicProfile?: ClinicProfile;
	payments?: Payment[];
	serviceCatalog?: ServiceCatalogItem[];
	treatmentPlanItems?: TreatmentPlanItem[];
};

export function escapeHtml(value: string | null | undefined) {
	if (value === null || value === undefined) return "";
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

/**
 * Целые копейки → рубли числом, для тех мест, где сумма дальше уходит в rub().
 *
 * Через строку numeric(12, 2) намеренно: это единственный способ получить из
 * копеек ровно то же число, которое лежит в денежной колонке базы, не заводя
 * второй способ считать деньги. Арифметика остаётся в @dental/shared.
 */
export function rublesFromKopecks(kopecks: number): number {
	return Number(kopecksToNumericString(kopecks));
}

/**
 * Денежная сумма для печатной формы: «1 500 руб.» и «1 500,50 руб.».
 *
 * Раньше здесь стоял `value.toLocaleString("ru-RU")`, и это давало два дефекта
 * в одной строке. Копеечная сумма печаталась с одним знаком — «600,6 руб.»
 * вместо «600,60 руб.». А сумма, пришедшая из сложения в плавающей точке,
 * молча пряталась: toLocaleString округляет до трёх знаков, поэтому
 * 1110.9999999999995 выглядело как «1 111 руб.», хотя проверки выдачи в этом же
 * файле сравнивали именно исходное дробное значение и документ не выдавали.
 *
 * Теперь сумма приводится к целым копейкам (parseKopecks из @dental/shared) и
 * печатается ровно. Копейки показываются только когда они есть, поэтому для
 * целых рублей вывод не изменился ни на один байт.
 *
 * Нечисловое значение — это не «0 руб.»: оно печатается как «не указана», а эта
 * строка входит в unresolvedPlaceholderPatterns, то есть документ с такой суммой
 * не выдаётся, вместо того чтобы уйти пациенту с «NaN руб.».
 */
export function rub(value: number | null) {
	if (value === null || !Number.isFinite(value)) return "не указана";
	const numeric = kopecksToNumericString(parseKopecks(value));
	const negative = numeric.startsWith("-");
	const [wholeRubles, fractionKopecks] = numeric.replace("-", "").split(".");
	const grouped = Number(wholeRubles).toLocaleString("ru-RU");
	const amount =
		fractionKopecks === "00" ? grouped : `${grouped},${fractionKopecks}`;
	return `${negative ? "-" : ""}${amount} руб.`;
}

export function issuedDate(document: GeneratedDocument) {
	return document.issuedAt
		? new Date(document.issuedAt).toLocaleDateString("ru-RU")
		: "не выдан";
}

export const documentStatusLabels: Record<GeneratedDocument["status"], string> = {
	draft: "черновик",
	issued: "выдан",
	voided: "аннулирован",
};

export function documentStatusBanner(document: GeneratedDocument) {
	const textByStatus: Record<GeneratedDocument["status"], string> = {
		draft: "ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)",
		issued: "ПОДПИСАНО ВРАЧОМ",
		voided: "АННУЛИРОВАНО. НЕ ИСПОЛЬЗОВАТЬ КАК ДЕЙСТВУЮЩИЙ ДОКУМЕНТ",
	};

	return `<div class="document-status-banner status-${document.status}">${escapeHtml(textByStatus[document.status])}</div>`;
}

export const unresolvedPlaceholderPatterns = [
	"заполнить",
	"________",
	"указать врачом",
	"указать по",
	"не указана",
	"не указан",
].map((pattern) => repairMojibakeText(pattern));

export function documentHasUnresolvedPlaceholders(html: string): boolean {
	if (html.includes("[[{") || html.includes("}]]")) return true;
	const htmlWithoutSignatureBlanks = html.replace(
		/<div class="signatures">[\s\S]*?<\/div>/g,
		"",
	);
	const normalized = htmlWithoutSignatureBlanks.toLocaleLowerCase("ru-RU");
	return unresolvedPlaceholderPatterns.some((pattern) =>
		normalized.includes(pattern),
	);
}

export function row(label: string, value: string | null | undefined) {
	return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value ?? "")}</td></tr>`;
}

export function cell(value: string | null | undefined) {
	return `<td>${escapeHtml(present(value) ?? "")}</td>`;
}

export function present(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

export function digitsOnly(value: string | null | undefined): string {
	return (value ?? "").replace(/\D+/g, "");
}

export function hasPersonNameParts(value: string | null | undefined): boolean {
	return (present(value) ?? "").split(/\s+/).filter(Boolean).length >= 2;
}

export function compactParts(parts: Array<string | null | undefined>): string {
	return parts
		.filter((part): part is string => Boolean(part?.trim()))
		.join("; ");
}

export function hasClinicalToothRows(
	value: { clinicalToothRows?: unknown } | null | undefined,
): boolean {
	return (
		Array.isArray(value?.clinicalToothRows) &&
		value.clinicalToothRows.length > 0
	);
}

export function clinicalToothSurfaceLabel(
	value: ClinicalToothRow["surfaces"][number],
): string {
	const labels: Record<ClinicalToothRow["surfaces"][number], string> = {
		occlusal: "окклюзионная",
		mesial: "мезиальная",
		distal: "дистальная",
		buccal: "щечная",
		lingual: "язычная",
		palatal: "небная",
		incisal: "режущий край",
		root: "корень",
		implant_site: "зона имплантации",
		not_applicable: "не применимо",
	};
	return labels[value] ?? value;
}

export function clinicalToothStatusLabel(value: ClinicalToothRow["status"]): string {
	const labels: Record<ClinicalToothRow["status"], string> = {
		sound: "без патологии",
		watch: "наблюдение",
		caries: "кариес",
		pulpitis_periodontitis: "пульпит/периодонтит",
		periodontal: "пародонтологический статус",
		missing: "отсутствует",
		implant: "имплантат",
		prosthetic: "ортопедическая конструкция",
		orthodontic: "ортодонтический статус",
		planned: "запланировано",
		completed: "выполнено",
		other: "иное",
	};
	return labels[value] ?? value;
}

export function clinicalToothRowsTable(rows: readonly ClinicalToothRow[]) {
	const toothRows = rows
		.map(
			(item) =>
				`<tr>${cell(item.toothOrArea)}${cell(item.surfaces.map(clinicalToothSurfaceLabel).join(", "))}${cell(
					clinicalToothStatusLabel(item.status),
				)}${cell(item.diagnosisOrFinding)}${cell(item.indication)}${cell(item.plannedAction)}${cell(item.prognosis)}${cell(
					item.periodontalStatus,
				)}${cell(item.implantOrProstheticNotes)}${cell(item.orthodonticNotes)}</tr>`,
		)
		.join("");

	return `<table>
    <tr>
      <th>Зуб/сегмент</th>
      <th>Поверхности</th>
      <th>Статус</th>
      <th>Диагноз/находка</th>
      <th>Показание</th>
      <th>Действие</th>
      <th>Прогноз</th>
      <th>Пародонт</th>
      <th>Имплант/ортопедия</th>
      <th>Ортодонтия</th>
    </tr>
    ${toothRows}
  </table>`;
}

export function patientAdministrativeProfile(patient: Patient) {
	return patient.administrativeProfile ?? null;
}

export function patientIdentityDocument(patient: Patient): string | null {
	return present(patientAdministrativeProfile(patient)?.identityDocument);
}

export function patientTaxpayerInn(patient: Patient): string | null {
	return present(patientAdministrativeProfile(patient)?.taxpayerInn);
}

export function patientRegistrationAddress(patient: Patient): string | null {
	return present(patientAdministrativeProfile(patient)?.registrationAddress);
}

export function patientResidentialAddress(patient: Patient): string | null {
	return present(patientAdministrativeProfile(patient)?.residentialAddress);
}

export function patientInsurancePolicyNumber(patient: Patient): string | null {
	return present(patientAdministrativeProfile(patient)?.insurancePolicyNumber);
}

export function patientSnils(patient: Patient): string | null {
	return present(patientAdministrativeProfile(patient)?.snils);
}

export function patientDataProcessingBasisNote(patient: Patient): string | null {
	return present(
		patientAdministrativeProfile(patient)?.dataProcessingBasisNote,
	);
}

export function legalRepresentativeName(patient: Patient): string | null {
	return present(
		patientAdministrativeProfile(patient)?.legalRepresentativeFullName,
	);
}

export function legalRepresentativeDocument(patient: Patient): string | null {
	return present(
		patientAdministrativeProfile(patient)?.legalRepresentativeIdentityDocument,
	);
}

export function legalRepresentativeRelationship(patient: Patient): string | null {
	return present(
		patientAdministrativeProfile(patient)?.legalRepresentativeRelationship,
	);
}

export function legalRepresentativePhone(patient: Patient): string | null {
	return present(
		patientAdministrativeProfile(patient)?.legalRepresentativePhone,
	);
}

export function preferredDocumentRecipient(patient: Patient): string | null {
	return present(
		patientAdministrativeProfile(patient)?.preferredDocumentRecipient,
	);
}

export function representativeDisplayLine(patient: Patient): string {
	return (
		compactParts([
			legalRepresentativeName(patient),
			legalRepresentativeDocument(patient)
				? `документ: ${legalRepresentativeDocument(patient)}`
				: null,
		]) || "ФИО: ____________________; документ: ____________________"
	);
}

export function representativeAuthorityLine(patient: Patient): string {
	return (
		compactParts([
			legalRepresentativeRelationship(patient),
			legalRepresentativeDocument(patient)
				? `подтверждение: ${legalRepresentativeDocument(patient)}`
				: null,
		]) || "родитель / опекун / попечитель / доверенность / иное"
	);
}

export function representativeContactLine(patient: Patient): string {
	return legalRepresentativePhone(patient)
		? `телефон: ${legalRepresentativePhone(patient)}`
		: "телефон: ____________________; email: ____________________";
}

export function documentRecipientLine(patient: Patient): string {
	return (
		preferredDocumentRecipient(patient) ||
		legalRepresentativeName(patient) ||
		"пациент / законный представитель / доверенное лицо"
	);
}

export function representativeIdentityLine(patient: Patient): string {
	return (
		compactParts([
			legalRepresentativeName(patient),
			legalRepresentativeDocument(patient),
			legalRepresentativeRelationship(patient),
		]) || "паспорт/доверенность/документ представителя: ____________________"
	);
}

export function clinicDisplayName(profile: ClinicProfile | undefined): string {
	return (
		present(profile?.legalName) ??
		present(profile?.clinicName) ??
		"Профиль клиники не заполнен"
	);
}

export function clinicLicenseLine(profile: ClinicProfile | undefined): string | null {
	const number = present(profile?.medicalLicenseNumber);
	if (!number) return null;
	const issuedAt = present(profile?.medicalLicenseIssuedAt);
	const issuer = present(profile?.medicalLicenseIssuer);
	return compactParts([
		`лицензия ${number}`,
		issuedAt ? `от ${issuedAt}` : null,
		issuer ? `выдана ${issuer}` : null,
	]);
}

export function clinicLegalRequisites(profile: ClinicProfile | undefined): string {
	return (
		compactParts([
			clinicDisplayName(profile),
			present(profile?.inn) ? `ИНН ${present(profile?.inn)}` : null,
			present(profile?.kpp) ? `КПП ${present(profile?.kpp)}` : null,
			present(profile?.ogrn) ? `ОГРН/ОГРНИП ${present(profile?.ogrn)}` : null,
			clinicLicenseLine(profile),
			present(profile?.address) ? `адрес ${present(profile?.address)}` : null,
			present(profile?.phone) ? `тел. ${present(profile?.phone)}` : null,
			present(profile?.email) ? `email ${present(profile?.email)}` : null,
			present(profile?.website) ? `сайт ${present(profile?.website)}` : null,
		]) || "Профиль клиники не заполнен"
	);
}

export function clinicPaymentRequisites(profile: ClinicProfile | undefined): string {
	return (
		compactParts([
			clinicLegalRequisites(profile),
			present(profile?.bankDetails),
		]) || clinicLegalRequisites(profile)
	);
}

export function clinicSignatory(profile: ClinicProfile | undefined): string {
	return (
		compactParts([
			present(profile?.signatoryTitle),
			present(profile?.signatoryName),
		]) || "уполномоченное лицо клиники"
	);
}

export const clinicLegalProfileFieldLabels: Record<string, string> = {
	legalName: "юридическое наименование",
	inn: "ИНН",
	address: "адрес",
	phone: "телефон",
	medicalLicenseNumber: "номер медицинской лицензии",
	medicalLicenseIssuedAt: "дата лицензии",
	medicalLicenseIssuer: "орган, выдавший лицензию",
};

export const clinicLegalProfileOptionalDocumentKinds = new Set<DocumentKind>([
	"patient_intake_questionnaire",
	"post_visit_recommendations",
	"treatment_plan",
	"anesthesia_consent_log",
	"prescription_medication_order",
	"xray_cbct_referral",
	"lab_work_order",
	"warranty_service_memo",
]);

export function documentRequiresClinicLegalProfile(kind: DocumentKind): boolean {
	return !clinicLegalProfileOptionalDocumentKinds.has(kind);
}

export function clinicLegalProfileMissingFields(
	profile: ClinicProfile | undefined,
): string[] {
	if (!profile) return ["clinicProfile"];
	const checks: Array<[string, string | null | undefined]> = [
		["legalName", profile.legalName],
		["inn", profile.inn],
		["address", profile.address],
		["phone", profile.phone],
		["medicalLicenseNumber", profile.medicalLicenseNumber],
		["medicalLicenseIssuedAt", profile.medicalLicenseIssuedAt],
		["medicalLicenseIssuer", profile.medicalLicenseIssuer],
	];
	return checks
		.filter(([, value]) => !present(value))
		.map(([field]) => clinicLegalProfileFieldLabels[field] ?? field);
}

export function documentPayloadBlockReason(
	document: GeneratedDocument,
): string | null {
	if (
		document.kind === "patient_intake_questionnaire" &&
		!document.payload?.patientIntakeQuestionnaire
	) {
		return "Для выдачи анкеты пациента нужны структурированные данные: жалоба, аллергии, препараты, хронические заболевания, беременность/лактация, антикоагулянты и подтверждение пациента.";
	}
	if (
		document.kind === "tax_deduction_application" &&
		!document.payload?.taxDeductionApplication
	) {
		return "Для выдачи заявления на налоговую справку нужны структурированные данные: заявитель, ИНН, дата рождения, документ, родство, год, форма справки, канал выдачи, контакт и проверка дублей.";
	}
	if (
		document.kind === "paid_medical_services_contract" &&
		!document.payload?.paidMedicalServicesContract
	) {
		return "Для выдачи договора платных медицинских услуг нужны структурированные данные: номер и дата договора, сроки, заказчик, основание обращения, состав услуг, сумма, порядок оплаты, изменение цены, уведомление о бесплатной помощи, предупреждение о рекомендациях врача, отказ/возврат, гарантия и подтверждения пациента.";
	}
	if (
		document.kind === "completed_works_act" &&
		!document.payload?.completedWorksAct
	) {
		return "Для выдачи акта выполненных работ нужны структурированные данные: номер и дата акта, договор, период оказания, врач, состав работ, суммы, фискальные чеки, претензии или их отсутствие и подтверждения пациента.";
	}
	if (
		document.kind === "treatment_cost_estimate" &&
		!document.payload?.treatmentCostEstimate
	) {
		return "Для выдачи сметы лечения нужны структурированные данные: номер, дата, пациент или плательщик, основание лечения, состав услуг, сумма, срок действия, правила изменения цены, исключения, условия оплаты, ответственный врач и подтверждения пациента.";
	}
	if (
		document.kind === "payment_invoice" &&
		!document.payload?.paymentInvoice
	) {
		return "Для выдачи счета на оплату нужны структурированные данные: номер и дата счета, плательщик, назначение платежа, состав услуг, сумма, срок оплаты, реквизиты, способы оплаты и подтверждение, что счет не заменяет кассовый чек.";
	}
	if (
		document.kind === "payment_receipt" &&
		!document.payload?.paymentReceipt
	) {
		return "Для выдачи платежной квитанции нужны структурированные данные: номер и дата квитанции, выбранные оплаченные платежи, сумма, плательщик, фискальные чеки, назначение оплаты и подтверждение проверки.";
	}
	if (
		document.kind === "installment_payment_schedule" &&
		!document.payload?.installmentPaymentSchedule
	) {
		return "Для выдачи графика рассрочки нужны структурированные данные: номер и дата графика, базовый договор или план, плательщик, сумма, предоплата, остаток, платежи, правила просрочки, способы оплаты и подтверждения пациента.";
	}
	if (
		document.kind === "minor_legal_representative_consent" &&
		!document.payload?.minorLegalRepresentativeConsent
	) {
		return "Для выдачи согласия законного представителя нужны структурированные данные: представитель, родство, документ личности, основание полномочий, данные несовершеннолетнего, вмешательство, риски, альтернативы, врач и подтверждения проверки.";
	}
	if (
		document.kind === "warranty_service_memo" &&
		!document.payload?.warrantyServiceMemo
	) {
		return "Для выдачи гарантийной памятки нужны структурированные данные: работа, дата завершения, зубы или область, материалы, срок гарантии, контрольные визиты, обязанности пациента, исключения, срочные признаки, связанный акт или договор и подтверждения выдачи.";
	}
	if (
		document.kind === "anesthesia_consent_log" &&
		!document.payload?.anesthesiaConsentLog
	) {
		return "Для выдачи журнала анестезии нужны структурированные данные: метод, препарат, зона, аллергостатус и дозы.";
	}
	if (
		document.kind === "prescription_medication_order" &&
		!document.payload?.prescriptionMedicationOrder
	) {
		return "Для выдачи назначения препаратов нужны структурированные данные: препарат, дозировка, режим, срок и памятка пациенту.";
	}
	if (
		document.kind === "prescription_medication_order" &&
		!hasClinicalToothRows(document.payload?.prescriptionMedicationOrder)
	) {
		return "Для выдачи назначения препаратов нужны клинические строки по зубам или сегментам: зуб/область, поверхности, статус, диагноз/находка, показание и действие.";
	}
	if (document.kind === "lab_work_order" && !document.payload?.labWorkOrder) {
		return "Для выдачи лабораторного заказа нужны структурированные данные: работа, зона, материал, цвет, источник данных и срок.";
	}
	if (
		document.kind === "lab_work_order" &&
		!hasClinicalToothRows(document.payload?.labWorkOrder)
	) {
		return "Для выдачи лабораторного заказа нужны клинические строки по зубам или сегментам: зуб/область, поверхности, статус, диагноз/находка, показание и действие.";
	}
	if (
		document.kind === "photo_video_consent" &&
		!document.payload?.photoVideoConsent
	) {
		return "Для выдачи согласия на фото, видео и снимки нужны структурированные данные: материалы, разрешенные цели, публикация и порядок отзыва.";
	}
	if (
		document.kind === "xray_cbct_referral" &&
		!document.payload?.xrayCbctReferral
	) {
		return "Для выдачи направления на рентген или КЛКТ нужны структурированные данные: вид исследования, область, клинический вопрос, показание, ограничения и ответственный врач.";
	}
	if (
		document.kind === "xray_cbct_referral" &&
		!hasClinicalToothRows(document.payload?.xrayCbctReferral)
	) {
		return "Для выдачи направления на рентген или КЛКТ нужны клинические строки по зубам или сегментам: зуб/область, поверхности, статус, диагноз/находка, показание и действие.";
	}
	if (
		document.kind === "medical_record_extract" &&
		!document.payload?.medicalRecordExtract
	) {
		return "Для выдачи выписки из медицинской карты нужны структурированные данные: период, источники записей, жалобы и анамнез, объективный статус, диагноз, лечение, рекомендации, врач, получатель и проверка данных третьих лиц.";
	}
	if (
		document.kind === "medical_record_extract" &&
		!hasClinicalToothRows(document.payload?.medicalRecordExtract)
	) {
		return "Для выдачи выписки из медицинской карты нужны клинические строки по зубам или сегментам: зуб/область, поверхности, статус, диагноз/находка, показание и действие.";
	}
	if (
		document.kind === "dental_medical_card_043u" &&
		!document.payload?.dentalMedicalCard043u
	) {
		return "Для выдачи медицинской карты 043/у нужны структурированные данные: организация, пациент, номер карты, дата приема, жалобы, анамнез, объективный статус, диагноз, стоматологические строки, лечение и врач.";
	}
	if (
		document.kind === "dental_medical_card_043u" &&
		!hasClinicalToothRows(document.payload?.dentalMedicalCard043u)
	) {
		return "Для выдачи медицинской карты 043/у нужны клинические строки по зубам или сегментам: зуб/область, поверхности, статус, диагноз/находка, показание и действие.";
	}
	if (
		document.kind === "medical_record_copy_request" &&
		!document.payload?.medicalRecordCopyRequest
	) {
		return "Для выдачи запроса копий медицинской документации нужны структурированные данные: состав документов, период, формат, получатель, документ получателя, полномочия, контакт выдачи и проверка лишних данных третьих лиц.";
	}
	if (
		document.kind === "post_visit_recommendations" &&
		!document.payload?.postVisitRecommendations
	) {
		return "Для выдачи рекомендаций после приема нужны структурированные данные: процедура, зона, дата, врач, разрешенные действия, ограничения, назначения, питание, гигиена, тревожные признаки, контакт клиники и краткий текст для Telegram.";
	}
	if (document.kind === "treatment_plan" && !document.payload?.treatmentPlan) {
		return "Для выдачи плана лечения нужны структурированные данные: причина обращения, диагноз, область, цели, этапы, стоимость, альтернативы, риски, прогноз, контроль, врач и подтверждения пациента.";
	}
	if (
		document.kind === "treatment_plan" &&
		!hasClinicalToothRows(document.payload?.treatmentPlan)
	) {
		return "Для выдачи плана лечения нужны клинические строки по зубам или сегментам: зуб/область, поверхности, статус, диагноз/находка, показание и действие.";
	}
	if (
		document.kind === "treatment_plan_acceptance" &&
		!document.payload?.treatmentPlanAcceptance
	) {
		return "Для согласования плана лечения нужны структурированные данные: выбранный вариант, диагноз/цель, зона, этапы, сумма, срок действия сметы, условия оплаты, отклоненные альтернативы, риски, врач и подтверждения пациента.";
	}
	if (
		document.kind === "treatment_plan_acceptance" &&
		!hasClinicalToothRows(document.payload?.treatmentPlanAcceptance)
	) {
		return "Для согласования плана лечения нужны клинические строки по зубам или сегментам: зуб/область, поверхности, статус, диагноз/находка, показание и действие.";
	}
	if (
		document.kind === "visit_attendance_certificate" &&
		!document.payload?.visitAttendanceCertificate
	) {
		return "Для выдачи справки о посещении нужны структурированные данные: время начала и окончания приема, цель выдачи, получатель, дата, подписант и подтверждение, что диагноз не раскрывается.";
	}
	if (
		document.kind === "medical_document_release_receipt" &&
		!document.payload?.medicalDocumentReleaseReceipt
	) {
		return "Для выдачи расписки о передаче медицинских документов нужны структурированные данные: получатель, основание, канал, состав выдачи, дата и защита передачи.";
	}
	if (
		document.kind === "medical_document_release_receipt" &&
		document.payload?.medicalDocumentReleaseReceipt &&
		!document.payload.medicalDocumentReleaseReceipt.sourceRequestDocumentId
	) {
		return "Для расписки о выдаче медицинских документов выберите конкретный выданный запрос пациента или представителя.";
	}
	if (
		document.kind === "payment_refund_correction_request" &&
		!document.payload?.paymentRefundCorrection
	) {
		return "Для выдачи заявления на возврат или коррекцию оплаты нужны структурированные данные: действие, сумма, основание, способ, получатель, исходный чек и решение ответственного.";
	}
	if (
		document.kind === "informed_consent" &&
		!document.payload?.informedConsent
	) {
		return "Для выдачи информированного согласия нужны структурированные данные: вмешательство, область, показание, ожидаемая польза, риски, альтернативы, рекомендации после вмешательства, врач и подтверждения пациента.";
	}
	if (
		document.kind === "procedure_specific_consent_packet" &&
		!document.payload?.procedureSpecificConsent
	) {
		return "Для выдачи процедурного согласия нужны структурированные данные: вид процедуры, область, показание, анестезия, материалы, персональные риски пациента, процедурные риски, альтернативы, ограничения после процедуры, врач и подтверждения пациента.";
	}
	if (
		document.kind === "procedure_specific_consent_packet" &&
		!hasClinicalToothRows(document.payload?.procedureSpecificConsent)
	) {
		return "Для выдачи процедурного согласия нужны клинические строки по зубам или сегментам: зуб/область, поверхности, статус, диагноз/находка, показание и действие.";
	}
	if (
		document.kind === "personal_data_processing_consent" &&
		!document.payload?.personalDataProcessingConsent
	) {
		return "Для выдачи согласия на обработку персональных данных нужны структурированные данные: оператор, ИНН, адрес, цели, категории данных, действия обработки, правила передачи третьим лицам, срок хранения, отзыв согласия и подтверждение обработки медицинских данных.";
	}
	if (
		document.kind === "medical_intervention_refusal" &&
		!document.payload?.medicalInterventionRefusal
	) {
		return "Для выдачи отказа от медицинского вмешательства нужны структурированные данные: вмешательство, показание, причина отказа, риски, альтернативы, тревожные признаки и подтверждения пациента.";
	}
	return null;
}
