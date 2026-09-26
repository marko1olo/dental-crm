import {
	type GeneratedDocument,
	type Patient,
	type Payment,
	type TaxDeductionApplicationDeliveryChannel,
	type TaxDeductionApplicationForm,
	type TaxDeductionApplicationRelationship,
	formatKopecksRu,
	kopecksToNumericString,
	legacyTaxDeductionCertificateMaxYear,
	legacyTaxDeductionCertificateMinYear,
	parseKopecks,
	splitKopecks,
	sumKopecks,
	taxDeductionCertificateMinYear,
} from "@dental/shared";
import { repairMojibakeText } from "../../text/repairMojibake.js";
import { taxPaymentsForDocumentScope } from "../taxPaymentSnapshot.js";
import {
	DocumentRenderContext,
	escapeHtml,
	present,
	digitsOnly,
	hasPersonNameParts,
	compactParts,
	patientIdentityDocument,
	patientTaxpayerInn,
	patientRegistrationAddress,
	patientResidentialAddress,
	clinicDisplayName,
	clinicLicenseLine,
	clinicLegalRequisites,
	clinicSignatory,
	documentPayloadBlockReason,
	cell,
	row,
	rub,
	rublesFromKopecks,
} from "./baseRenderUtils.js";

export function documentTaxYear(document: GeneratedDocument) {
	return document.taxYear
		? `${document.taxYear}`
		: "год оплаты: заполнить по кассовым данным";
}

export function taxPaymentsForDocument(
	document: GeneratedDocument,
	context: DocumentRenderContext,
): Payment[] {
	return taxPaymentsForDocumentScope(document, context.payments ?? []);
}

export function taxPaymentCode(payment: Payment): "1" | "2" | null {
	return payment.taxDeductionCode === "1" || payment.taxDeductionCode === "2"
		? payment.taxDeductionCode
		: null;
}

export function taxPaymentCodeLabel(code: "1" | "2" | null) {
	if (!code) return "код не выбран";
	return code === "2" ? "2 - дорогостоящее" : "1 - обычное";
}

/**
 * Сумма расходов по коду услуги для справки КНД 1151156, в целых копейках.
 *
 * Справка уходит в налоговую, поэтому сумма обязана быть точной до копейки: до
 * этого сложение шло в плавающей точке, и десять оплат по 1010.10 руб. давали
 * 10101.000000000002.
 */
export function taxPaymentSumKopecks(payments: Payment[], code: "1" | "2"): number {
	return sumKopecks(
		payments
			.filter((payment) => taxPaymentCode(payment) === code)
			.map((payment) => parseKopecks(payment.amountRub)),
	);
}

export function taxPaymentSum(payments: Payment[], code: "1" | "2") {
	return rublesFromKopecks(taxPaymentSumKopecks(payments, code));
}

export function firstTaxPayment(payments: Payment[]): Payment | null {
	return payments[0] ?? null;
}

export function namePartsForTax(fullName: string): {
	lastName: string;
	firstName: string;
	middleName: string;
} {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	return {
		lastName: parts[0] ?? "",
		firstName: parts[1] ?? "",
		middleName: parts.slice(2).join(" "),
	};
}

export function taxCertificateNumber(document: GeneratedDocument): string {
	const year = document.taxYear ? String(document.taxYear) : "";
	const idDigits = document.id.replace(/\D+/g, "");
	const numericHash = Array.from(document.id).reduce(
		(hash, char) => (hash * 31 + char.charCodeAt(0)) % 1_000_000_000,
		17,
	);
	const sequence = (idDigits || String(numericHash))
		.slice(0, 10)
		.padStart(10, "0");
	return `${year}${sequence}`.replace(/\D+/g, "") || "1";
}

export function taxpayerPatientSameFlagCode(payment: Payment | null): "0" | "1" {
	return normalizedTaxpayerRelationship(payment?.payerRelationship) === "self"
		? "1"
		: "0";
}

export function identityDocumentKindCode(value: string | null | undefined): string {
	const normalized = present(value)?.toLocaleLowerCase("ru-RU") ?? "";
	if (normalized.includes("паспорт") || normalized.includes("passport"))
		return "21";
	if (
		normalized.includes("свидетельство о рождении") ||
		normalized.includes("birth certificate")
	)
		return "03";
	if (normalized.includes("военн") || normalized.includes("military"))
		return "07";
	if (normalized.includes("вид на жительство")) return "12";
	return "91";
}

export function identityDocumentNumberForTax(
	value: string | null | undefined,
): string | null {
	const normalized = present(value);
	if (!normalized) return null;
	const passport = normalized.match(/(\d{2})\s*(\d{2})\s*(\d{6})/);
	if (passport) return `${passport[1]}${passport[2]} ${passport[3]}`;
	const serialNumber = normalized.match(
		/(?:сер(?:ия)?\.?\s*)?([A-Za-zА-Яа-я0-9-]{1,12})\s*(?:№|N|номер)?\s*([A-Za-zА-Яа-я0-9-]{3,12})/u,
	);
	if (!serialNumber) return null;
	return `${serialNumber[1]} ${serialNumber[2]}`.replace(/\s+/g, " ").trim();
}

export function identityDocumentIssuedAtForTax(
	value: string | null | undefined,
): string | null {
	const explicit = /(\d{2})[.\-/](\d{2})[.\-/](\d{4})/.exec(value ?? "");
	return explicit ? `${explicit[1]}.${explicit[2]}.${explicit[3]}` : null;
}

export function hasTaxInn(value: string | null | undefined): boolean {
	return digitsOnly(value).length === 12;
}

export function hasTaxIdentityDocument(value: string | null | undefined): boolean {
	return Boolean(
		identityDocumentNumberForTax(value) &&
			identityDocumentIssuedAtForTax(value),
	);
}

export function hasTaxPersonIdentifier(
	inn: string | null | undefined,
	identity: string | null | undefined,
): boolean {
	return hasTaxInn(inn) || hasTaxIdentityDocument(identity);
}

export function taxReceiptList(payments: Payment[]): string {
	return payments.map((payment) => paymentReceiptLabel(payment)).join("; ");
}

export function kndPersonRows(
	prefix: string,
	parts: { lastName: string; firstName: string; middleName: string },
	inn: string,
	birthDate: string,
	identity: string,
) {
	const innValue = hasTaxInn(inn) ? digitsOnly(inn) : "";
	const identityRows = innValue
		? ""
		: `
    ${row(`${prefix}: Код вида документа`, identityDocumentKindCode(identity))}
    ${row(`${prefix}: Серия и номер документа`, identityDocumentNumberForTax(identity) ?? identity)}
    ${row(`${prefix}: Дата выдачи документа`, identityDocumentIssuedAtForTax(identity) ?? "")}`;
	return `
    ${row(`${prefix}: Фамилия`, parts.lastName)}
    ${row(`${prefix}: Имя`, parts.firstName)}
    ${parts.middleName ? row(`${prefix}: Отчество`, parts.middleName) : ""}
    ${innValue ? row(`${prefix}: ИНН`, innValue) : ""}
    ${row(`${prefix}: Дата рождения`, birthDate)}
    ${identityRows}
  `;
}

export function officialKnd1151156PrintBlock(
	document: GeneratedDocument,
	patient: Patient,
	context: DocumentRenderContext,
	taxPayments: Payment[],
	taxpayerPayment: Payment | null,
	regularTreatmentRub: number | null,
	expensiveTreatmentRub: number | null,
) {
	const samePersonFlag = taxpayerPatientSameFlagCode(taxpayerPayment);
	const taxpayerIdentityDocument = payerIdentityDocumentForTax(
		taxpayerPayment,
		patient,
	);
	const patientIdentity = patientIdentityDocumentForTax(
		taxpayerPayment,
		patient,
	);
	const taxpayerNameParts = namePartsForTax(
		payerNameForTax(taxpayerPayment, patient),
	);
	const patientNameParts = namePartsForTax(patient.fullName);
	const pageCount = samePersonFlag === "1" ? "1" : "2";
	const clinicProfile = context.clinicProfile;
	const clinicKpp = present(clinicProfile?.kpp) ?? "не применяется";
	const clinicOgrn = present(clinicProfile?.ogrn) ?? "не применяется";
	const receiptNumbers = taxPayments.length
		? taxReceiptList(taxPayments)
		: "фискальные чеки будут подтянуты после оплаты";
	const patientPage =
		samePersonFlag === "0"
			? `<h3>Лист 002. Данные физического лица, которому оказаны медицинские услуги</h3>
      <table>
        ${row("ИНН медицинской организации", present(clinicProfile?.inn) ?? "")}
        ${row("КПП медицинской организации", clinicKpp)}
        ${row("Страница", "002")}
        ${kndPersonRows("Пациент", patientNameParts, patientInnForTax(taxpayerPayment, patient), patientBirthDateForTax(taxpayerPayment, patient), patientIdentity)}
        ${row("Подтверждение страницы", clinicSignatory(clinicProfile))}
      </table>`
			: "";

	return `<h2>Печатный контроль формы КНД 1151156</h2>
    <div class="notice">
      Этот блок повторяет ключевые поля приложения N 1 к приказу ФНС России от 08.11.2023 N ЕА-7-11/824@:
      лист 001 заполняется всегда, лист 002 добавляется, когда налогоплательщик и пациент не являются одним лицом.
      Электронный XML/ТКС-файл ФНС этим HTML не заменяется.
    </div>
    <h3>Лист 001. Форма по КНД 1151156</h3>
    <table>
      ${row("ИНН медицинской организации", present(clinicProfile?.inn) ?? "")}
      ${row("КПП медицинской организации", clinicKpp)}
      ${row("Страница", "001")}
      ${row("Форма", "КНД 1151156")}
      ${row("Номер справки", taxCertificateNumber(document))}
      ${row("Номер корректировки", "0")}
      ${row("Отчетный год", documentTaxYear(document))}
      ${row("Медицинская организация", clinicDisplayName(clinicProfile))}
      ${row("ОГРН/ОГРНИП", clinicOgrn)}
      ${row("Лицензия", clinicLicenseLine(clinicProfile) ?? "")}
      ${kndPersonRows(
				"Налогоплательщик",
				taxpayerNameParts,
				payerInnForTax(taxpayerPayment, patient),
				payerBirthDateForTax(taxpayerPayment, patient),
				taxpayerIdentityDocument,
			)}
      ${row("Признак налогоплательщика и пациента", taxpayerPatientSameFlag(taxpayerPayment))}
      ${row("Сумма расходов по коду услуги 1", rub(regularTreatmentRub))}
      ${row("Сумма расходов по коду услуги 2", rub(expensiveTreatmentRub))}
      ${row("Фискальные чеки-основания", receiptNumbers)}
      ${row("Справка составлена на страницах", pageCount)}
      ${row("Зона QR-кода", "формируется при экспорте PDF или электронного пакета клиники")}
      ${row("Достоверность и полноту сведений подтверждает", clinicSignatory(clinicProfile))}
    </table>
    ${patientPage}`;
}

export function payerNameForTax(payment: Payment | null, patient: Patient) {
	return payment?.payerFullName?.trim() || patient.fullName;
}

export function payerInnForTax(payment: Payment | null, patient?: Patient) {
	const inn =
		payment?.payerInn?.trim() || (patient ? patientTaxpayerInn(patient) : null);
	if (inn) return inn;
	if (
		payment?.payerIdentityDocument?.trim() ||
		(patient ? patientIdentityDocument(patient) : null)
	)
		return "";
	return "заполнить перед выдачей";
}

export function payerBirthDateForTax(payment: Payment | null, patient: Patient) {
	return (
		payment?.payerBirthDate?.trim() ||
		patient.birthDate ||
		"заполнить перед выдачей"
	);
}

export function payerIdentityDocumentForTax(
	payment: Payment | null,
	patient?: Patient,
) {
	return (
		payment?.payerIdentityDocument?.trim() ||
		(patient ? patientIdentityDocument(patient) : null) ||
		"заполнить перед выдачей"
	);
}

export function payerRelationshipForTax(payment: Payment | null) {
	return payment?.payerRelationship?.trim() || "пациент";
}

export const taxApplicationRelationshipLabels: Record<
	TaxDeductionApplicationRelationship,
	string
> = {
	self: "пациент / сам налогоплательщик",
	spouse: "супруг / супруга",
	parent: "родитель",
	child: "ребенок",
	ward: "подопечный",
};

export const taxApplicationFormLabels: Record<TaxDeductionApplicationForm, string> = {
	knd_1151156: "КНД 1151156 для расходов с 2024 года",
	legacy_2021_2023: "справка по прежнему порядку для оплат 2021-2023",
};

export const taxApplicationDeliveryChannelLabels: Record<
	TaxDeductionApplicationDeliveryChannel,
	string
> = {
	paper: "бумажный экземпляр в клинике",
	pdf: "PDF после проверки и подписи",
	secure_link: "защищенная ссылка",
	email: "email после проверки согласия",
	portal: "личный кабинет / портал пациента",
	other: "иной согласованный канал",
};

export function normalizedTaxpayerRelationship(
	value: string | null | undefined,
): "self" | "spouse" | "parent" | "child" | "ward" | null {
	const normalized =
		present(value)
			?.toLocaleLowerCase("ru-RU")
			.replaceAll("ё", "е")
			.replace(/[\s_-]+/g, " ") ?? null;
	if (!normalized) return null;
	if (
		[
			"self",
			"patient",
			"me",
			"пациент",
			"сам пациент",
			"сама пациентка",
			"налогоплательщик",
		].includes(normalized)
	)
		return "self";
	if (
		["spouse", "husband", "wife", "супруг", "супруга", "муж", "жена"].includes(
			normalized,
		)
	)
		return "spouse";
	if (
		[
			"parent",
			"father",
			"mother",
			"родитель",
			"отец",
			"мать",
			"папа",
			"мама",
		].includes(normalized)
	)
		return "parent";
	if (
		[
			"child",
			"son",
			"daughter",
			"kid",
			"ребенок",
			"ребенок до 18",
			"ребенок до 24 очно",
			"сын",
			"дочь",
			"усыновленный",
			"усыновленная",
		].includes(normalized)
	) {
		return "child";
	}
	if (
		["ward", "подопечный", "подопечная", "опекаемый", "опекаемая"].includes(
			normalized,
		)
	)
		return "ward";
	return null;
}

export function taxpayerPatientSameFlag(payment: Payment | null): string {
	return taxpayerPatientSameFlagCode(payment) === "1" ? "1 - да" : "0 - нет";
}

export function patientBirthDateForTax(payment: Payment | null, patient: Patient) {
	return (
		patient.birthDate ||
		(normalizedTaxpayerRelationship(payment?.payerRelationship) === "self"
			? payment?.payerBirthDate?.trim()
			: null) ||
		"заполнить перед выдачей"
	);
}

export function patientInnForTax(payment: Payment | null, patient: Patient) {
	const inn =
		patientTaxpayerInn(patient) ||
		(normalizedTaxpayerRelationship(payment?.payerRelationship) === "self"
			? payment?.payerInn?.trim()
			: null);
	if (inn) return inn;
	const identity =
		patientIdentityDocument(patient) ||
		(normalizedTaxpayerRelationship(payment?.payerRelationship) === "self"
			? payment?.payerIdentityDocument?.trim()
			: null);
	if (identity) return "";
	return "заполнить перед выдачей";
}

export function patientIdentityDocumentForTax(
	payment: Payment | null,
	patient: Patient,
) {
	return (
		patientIdentityDocument(patient) ||
		(normalizedTaxpayerRelationship(payment?.payerRelationship) === "self"
			? payment?.payerIdentityDocument?.trim()
			: null) ||
		"заполнить перед выдачей"
	);
}

export function paymentFiscalReceiptDetailsLabel(payment: Payment): string | null {
	const fiscalReceipt = payment.fiscalReceipt;
	const receiptUrl =
		present(fiscalReceipt?.receiptUrl) || present(payment.fiscalReceiptUrl);
	if (!fiscalReceipt && !receiptUrl) return null;
	return (
		compactParts([
			present(fiscalReceipt?.fn) ? `ФН ${present(fiscalReceipt?.fn)}` : null,
			present(fiscalReceipt?.fd) ? `ФД ${present(fiscalReceipt?.fd)}` : null,
			present(fiscalReceipt?.fpd) ? `ФПД ${present(fiscalReceipt?.fpd)}` : null,
			present(fiscalReceipt?.cashierName)
				? `кассир ${present(fiscalReceipt?.cashierName)}`
				: null,
			receiptUrl ? `ОФД ${receiptUrl}` : null,
		]) || null
	);
}

export function paymentReceiptLabel(payment: Payment) {
	return (
		paymentFiscalReceiptDetailsLabel(payment) ||
		payment.fiscalReceiptNumber?.trim() ||
		`платеж ${payment.id.slice(0, 8)}`
	);
}

export function paymentDateLabel(payment: Payment) {
	const value = payment.fiscalReceiptIssuedAt || payment.paidAt;
	if (!value) return "дата не зафиксирована";
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime())
		? value
		: parsed.toLocaleString("ru-RU");
}

export function paidPaymentsForDocument(
	document: GeneratedDocument,
	context: DocumentRenderContext,
): Payment[] {
	const matchingPayments = (context.payments ?? []).filter(
		(payment) =>
			payment.patientId === document.patientId &&
			payment.status === "paid" &&
			Number.isFinite(payment.amountRub) &&
			parseKopecks(payment.amountRub) > 0,
	);
	if (
		document.kind === "payment_receipt" &&
		document.payload?.paymentReceipt?.selectedPaymentIds.length
	) {
		const selectedPaymentIds = new Set(
			document.payload.paymentReceipt.selectedPaymentIds,
		);
		return matchingPayments.filter((payment) =>
			selectedPaymentIds.has(payment.id),
		);
	}
	if (
		document.kind === "payment_refund_correction_request" &&
		document.payload?.paymentRefundCorrection?.selectedPaymentIds.length
	) {
		const selectedPaymentIds = new Set(
			document.payload.paymentRefundCorrection.selectedPaymentIds,
		);
		return matchingPayments.filter((payment) =>
			selectedPaymentIds.has(payment.id),
		);
	}
	const linkedPayments = matchingPayments.filter(
		(payment) => payment.documentId === document.id,
	);
	if (linkedPayments.length) return linkedPayments;
	const visitPayments = matchingPayments.filter(
		(payment) => document.visitId && payment.visitId === document.visitId,
	);
	return visitPayments.length ? visitPayments : [];
}

export function hasFiscalReceiptNumber(payment: Payment): boolean {
	return Boolean(present(payment.fiscalReceiptNumber));
}

export function hasAllFiscalReceipts(payments: Payment[]): boolean {
	return payments.every(hasFiscalReceiptNumber);
}

export function hasFiscalReceiptDate(payment: Payment): boolean {
	return isValidDateLike(payment.fiscalReceiptIssuedAt);
}

export function hasAllFiscalReceiptDates(payments: Payment[]): boolean {
	return payments.every(hasFiscalReceiptDate);
}

export function isValidDateLike(value: string | null | undefined): boolean {
	const clean = present(value);
	if (!clean) return false;
	const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(clean);
	if (iso) {
		const parsed = new Date(clean);
		return !Number.isNaN(parsed.getTime());
	}
	const ru = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(clean);
	if (ru) {
		const parsed = new Date(`${ru[3]}-${ru[2]}-${ru[1]}T00:00:00Z`);
		return !Number.isNaN(parsed.getTime());
	}
	return false;
}

export function hasPaymentPayerIdentity(payment: Payment): boolean {
	const payerInnLength = digitsOnly(payment.payerInn).length;
	return Boolean(
		hasPersonNameParts(payment.payerFullName) &&
			isValidDateLike(payment.payerBirthDate) &&
			(payerInnLength === 0 || payerInnLength === 10 || payerInnLength === 12) &&
			present(payment.payerIdentityDocument) &&
			normalizedTaxpayerRelationship(payment.payerRelationship),
	);
}

export function hasAllPaymentPayerIdentities(payments: Payment[]): boolean {
	return payments.every(hasPaymentPayerIdentity);
}

export function normalizedFiscalReceiptNumber(
	value: string | null | undefined,
): string {
	return (present(value) ?? "").replace(/\s+/g, " ").toLocaleUpperCase("ru-RU");
}

export function normalizedDocumentValue(value: string | null | undefined): string {
	return (present(value) ?? "").replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

export function paymentReceiptStoredFieldMatchesPayload(
	storedValue: string | null | undefined,
	payloadValue: string | null | undefined,
): boolean {
	const normalizedStoredValue = normalizedDocumentValue(storedValue);
	if (!normalizedStoredValue) return true;
	return normalizedStoredValue === normalizedDocumentValue(payloadValue);
}


export function hasExplicitTaxDeductionCode(payment: Payment): boolean {
	return payment.taxDeductionCode === "1" || payment.taxDeductionCode === "2";
}

export function paymentMethodForDocument(payment: Payment) {
	const labels: Record<Payment["method"], string> = {
		cash: "наличные",
		card: "карта",
		bank_transfer: "банковский перевод",
		online: "онлайн-оплата",
		insurance: "страховая",
		family_wallet: "семейный кошелек",
		other: "иной способ",
	};
	return labels[payment.method] ?? payment.method;
}

export function paymentReceiptRows(payments: Payment[]) {
	if (!payments.length) {
		return `<tr><td colspan="5">Перед выдачей нужен сохраненный оплаченный платеж.</td></tr>`;
	}
	return payments
		.map(
			(payment) =>
				`<tr><td>${escapeHtml(paymentDateLabel(payment))}</td><td>${escapeHtml(paymentMethodForDocument(payment))}</td><td>${escapeHtml(
					rub(payment.amountRub),
				)}</td><td>${escapeHtml(paymentReceiptLabel(payment))}</td><td>${escapeHtml(
					compactParts([
						present(payment.payerFullName),
						present(payment.payerInn)
							? `ИНН ${present(payment.payerInn)}`
							: null,
						present(payment.payerBirthDate)
							? `дата рождения ${present(payment.payerBirthDate)}`
							: null,
						present(payment.payerIdentityDocument)
							? `документ ${present(payment.payerIdentityDocument)}`
							: null,
						present(payment.payerRelationship)
							? `связь с пациентом: ${present(payment.payerRelationship)}`
							: null,
					]) || "плательщик не указан",
				)}</td></tr>`,
		)
		.join("");
}

export function taxRegistryRows(payments: Payment[], document: GeneratedDocument) {
	if (!payments.length) {
		return `<tr><td>заполнить</td><td>заполнить</td><td>код не выбран</td><td>${escapeHtml(rub(document.totalAmountRub))}</td></tr>`;
	}

	return payments
		.map((payment) => {
			const dateLabel = paymentDateLabel(payment);
			return `<tr><td>${escapeHtml(dateLabel)}</td><td>${escapeHtml(paymentReceiptLabel(payment))}</td><td>${escapeHtml(
				taxPaymentCodeLabel(taxPaymentCode(payment)),
			)}</td><td>${escapeHtml(rub(payment.amountRub))}</td></tr>`;
		})
		.join("");
}
