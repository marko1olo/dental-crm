import type { ClinicProfile, GeneratedDocument, Patient, Payment } from "@dental/shared";
import { taxPaymentsForDocumentScope } from "./taxPaymentSnapshot.js";
import { repairMojibakeText } from "../text/repairMojibake.js";

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
const FNS_MEDICAL_EXPENSE_NOTICE_NUMBER_MAX_LENGTH = 12;

type Knd1151156XmlPreflightExpected = {
  fileName: string;
  taxOfficeCode: string;
  taxYear: number;
  documentNumber: string;
  samePatientFlag: "0" | "1";
  sumCode1: number;
  sumCode2: number;
  requiresPatient: boolean;
};

type Knd1151156XmlPreflightIssue = {
  code: string;
  message: string;
};

function xml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function countOccurrences(value: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while (true) {
    const foundAt = value.indexOf(needle, index);
    if (foundAt === -1) return count;
    count += 1;
    index = foundAt + needle.length;
  }
}

function pushMissingPreflightIssue(
  issues: Knd1151156XmlPreflightIssue[],
  xmlText: string,
  needle: string,
  code: string,
  message: string
): void {
  if (!xmlText.includes(needle)) {
    issues.push({ code, message });
  }
}

function validateSingleTagPair(
  issues: Knd1151156XmlPreflightIssue[],
  xmlText: string,
  openNeedle: string,
  closeNeedle: string,
  code: string,
  name: string
): void {
  const openCount = countOccurrences(xmlText, openNeedle);
  const closeCount = countOccurrences(xmlText, closeNeedle);
  if (openCount !== 1 || closeCount !== 1) {
    issues.push({ code, message: `${name}: ожидалась одна открывающая и одна закрывающая метка.` });
  }
}

function validateKnd1151156XmlDraft(xmlText: string, expected: Knd1151156XmlPreflightExpected): Knd1151156XmlPreflightIssue[] {
  const issues: Knd1151156XmlPreflightIssue[] = [];

  pushMissingPreflightIssue(
    issues,
    xmlText,
    '<?xml version="1.0" encoding="UTF-8"?>',
    "xml-declaration",
    "нет декларации XML UTF-8"
  );
  pushMissingPreflightIssue(issues, xmlText, `<Файл ИдФайл="${xml(expected.fileName)}"`, "file-id", "ИдФайл не совпадает с именем выгрузки");
  pushMissingPreflightIssue(
    issues,
    xmlText,
    `ВерсФорм="${FNS_MEDICAL_EXPENSE_XML_VERSION}"`,
    "format-version",
    `ВерсФорм должна быть ${FNS_MEDICAL_EXPENSE_XML_VERSION}`
  );
  pushMissingPreflightIssue(
    issues,
    xmlText,
    `<Документ КНД="${FNS_MEDICAL_EXPENSE_XML_KND}"`,
    "document-knd",
    `Документ/@КНД должен быть ${FNS_MEDICAL_EXPENSE_XML_KND}`
  );
  pushMissingPreflightIssue(issues, xmlText, `КодНО="${xml(expected.taxOfficeCode)}"`, "tax-office", "КодНО не совпадает с выбранной налоговой");
  pushMissingPreflightIssue(issues, xmlText, `ОтчГод="${xml(expected.taxYear)}"`, "tax-year", "ОтчГод не совпадает с налоговым годом");
  pushMissingPreflightIssue(issues, xmlText, "<СвНП>", "clinic-node", "нет сведений о медицинской организации");
  pushMissingPreflightIssue(issues, xmlText, "<Подписант ", "signer-node", "нет подписанта");
  pushMissingPreflightIssue(issues, xmlText, "<СведРасхУсл ", "expense-node", "нет блока расходов на медуслуги");
  pushMissingPreflightIssue(issues, xmlText, `НомерСвед="${xml(expected.documentNumber)}"`, "notice-number", "НомерСвед не совпадает с номером справки");
  pushMissingPreflightIssue(issues, xmlText, 'НомКорр="0"', "correction-number", "первичная выгрузка должна иметь НомКорр=0");
  pushMissingPreflightIssue(
    issues,
    xmlText,
    `ПрПациент="${expected.samePatientFlag}"`,
    "same-patient-flag",
    "флаг налогоплательщик/пациент не совпадает с платежом"
  );
  pushMissingPreflightIssue(issues, xmlText, "<НППлатМедУсл ", "payer-node", "нет налогоплательщика-плательщика");

  validateSingleTagPair(issues, xmlText, "<Файл ", "</Файл>", "file-balance", "Файл");
  validateSingleTagPair(issues, xmlText, "<Документ ", "</Документ>", "document-balance", "Документ");
  validateSingleTagPair(issues, xmlText, "<СведРасхУсл ", "</СведРасхУсл>", "expense-balance", "СведРасхУсл");

  const noticeNumber = xmlText.match(/НомерСвед="([^"]+)"/u)?.[1] ?? "";
  if (!/^\d+$/.test(noticeNumber) || noticeNumber.length > FNS_MEDICAL_EXPENSE_NOTICE_NUMBER_MAX_LENGTH) {
    issues.push({
      code: "notice-number-format",
      message: `НомерСвед должен быть числом длиной до ${FNS_MEDICAL_EXPENSE_NOTICE_NUMBER_MAX_LENGTH} знаков.`
    });
  }

  const expectedCode1 = `СуммаКод1="${money(expected.sumCode1)}"`;
  const expectedCode2 = `СуммаКод2="${money(expected.sumCode2)}"`;
  if (expected.sumCode1 > 0) {
    pushMissingPreflightIssue(issues, xmlText, expectedCode1, "sum-code-1", "сумма по коду услуги 1 не совпадает с платежами");
  } else if (xmlText.includes("СуммаКод1=")) {
    issues.push({ code: "sum-code-1-extra", message: "СуммаКод1 не должна выгружаться при нулевой сумме." });
  }
  if (expected.sumCode2 > 0) {
    pushMissingPreflightIssue(issues, xmlText, expectedCode2, "sum-code-2", "сумма по коду услуги 2 не совпадает с платежами");
  } else if (xmlText.includes("СуммаКод2=")) {
    issues.push({ code: "sum-code-2-extra", message: "СуммаКод2 не должна выгружаться при нулевой сумме." });
  }

  if (expected.requiresPatient) {
    pushMissingPreflightIssue(issues, xmlText, "<Пациент", "patient-node", "для разного налогоплательщика и пациента нужен блок Пациент");
  } else if (xmlText.includes("<Пациент")) {
    issues.push({ code: "patient-node-extra", message: "блок Пациент не должен выгружаться, когда плательщик и пациент совпадают." });
  }

  for (const token of ["undefined", "NaN", "Infinity", "[object Object]"]) {
    if (xmlText.includes(token)) {
      issues.push({ code: "invalid-token", message: `XML содержит техническое значение ${token}.` });
    }
  }
  if (/[ÃÂ]/u.test(xmlText)) {
    issues.push({ code: "mojibake", message: "XML содержит признаки битой кодировки." });
  }

  return issues;
}

function present(value: string | null | undefined): string | null {
  const repaired = repairMojibakeText(value ?? "").trim();
  return repaired ? repaired : null;
}

function digits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D+/g, "");
}

function compactDocumentNumber(document: GeneratedDocument): string {
  const year = document.taxYear ? String(document.taxYear).slice(-2) : "";
  const idDigits = document.id.replace(/\D+/g, "");
  const numericHash = Array.from(document.id).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 1_000_000_000, 17);
  const sequenceLength = Math.max(1, FNS_MEDICAL_EXPENSE_NOTICE_NUMBER_MAX_LENGTH - year.length);
  const sequence = (idDigits || String(numericHash)).slice(0, sequenceLength).padStart(sequenceLength, "0");
  return (`${year}${sequence}`.replace(/\D+/g, "") || "1").slice(0, FNS_MEDICAL_EXPENSE_NOTICE_NUMBER_MAX_LENGTH);
}

function taxPaymentsForDocument(document: GeneratedDocument, payments: Payment[]): Payment[] {
  return taxPaymentsForDocumentScope(document, payments);
}

function taxPaymentCode(payment: Payment): "1" | "2" | null {
  return payment.taxDeductionCode === "1" || payment.taxDeductionCode === "2" ? payment.taxDeductionCode : null;
}

function taxPaymentSum(payments: Payment[], code: "1" | "2"): number {
  return payments.filter((payment) => taxPaymentCode(payment) === code).reduce((total, payment) => total + payment.amountRub, 0);
}

function money(value: number): string {
  return Math.max(0, value).toFixed(2);
}

function isoToRuDate(value: string | null | undefined): string | null {
  const explicit = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  if (explicit) return `${explicit[3]}.${explicit[2]}.${explicit[1]}`;
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function nameParts(fullName: string | null | undefined): { lastName: string; firstName: string; middleName: string } | null {
  const parts = repairMojibakeText(fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return {
    lastName: parts[0]!,
    firstName: parts[1]!,
    middleName: parts.slice(2).join(" ")
  };
}

function fioXml(parts: { lastName: string; firstName: string; middleName: string }): string {
  const middleName = parts.middleName ? ` Отчество="${xml(parts.middleName)}"` : "";
  return `<ФИО Фамилия="${xml(parts.lastName)}" Имя="${xml(parts.firstName)}"${middleName}/>`;
}

function identityDocumentKindCode(value: string): string {
  const normalized = repairMojibakeText(value).toLocaleLowerCase("ru-RU");
  if (normalized.includes("свидетельств") && normalized.includes("рожд")) return "03";
  if (normalized.includes("военн")) return "07";
  if (normalized.includes("вид на жительство")) return "12";
  if (normalized.includes("иностран")) return "10";
  if (normalized.includes("паспорт")) return "21";
  return "91";
}

function identityDocumentNumber(value: string): string | null {
  const normalized = repairMojibakeText(value).trim();
  const passport = normalized.match(/(\d{2})\s*(\d{2})\s*(\d{6})/);
  if (passport) return `${passport[1]}${passport[2]} ${passport[3]}`;
  const serialNumber = normalized.match(/(?:сер(?:ия)?\.?\s*)?([A-Za-zА-Яа-я0-9-]{1,12})\s*(?:№|N|номер)?\s*([A-Za-zА-Яа-я0-9-]{3,12})/u);
  if (!serialNumber) return null;
  const joined = `${serialNumber[1]} ${serialNumber[2]}`.replace(/\s+/g, " ").trim();
  return joined.length <= 25 ? joined : joined.slice(0, 25);
}

function identityDocumentIssuedAt(value: string): string | null {
  const explicit = /(\d{2})[.\-/](\d{2})[.\-/](\d{4})/.exec(value);
  if (explicit) return `${explicit[1]}.${explicit[2]}.${explicit[3]}`;
  return null;
}

function identityDocumentXml(value: string | null | undefined): string {
  const clean = present(value);
  if (!clean) return "";
  const number = identityDocumentNumber(clean);
  const issuedAt = identityDocumentIssuedAt(clean);
  if (!number || !issuedAt) return "";
  return `<СведДок КодВидДок="${identityDocumentKindCode(clean)}" СерНомДок="${xml(number)}" ДатаДок="${xml(issuedAt)}"/>`;
}

function taxPersonIdentifierXml(inn: string | null | undefined, identityDocument: string | null | undefined): { innAttribute: string; identityXml: string } | null {
  const cleanInn = digits(inn);
  if (cleanInn) {
    return cleanInn.length === 12 ? { innAttribute: ` ИНН="${xml(cleanInn)}"`, identityXml: "" } : null;
  }
  const identityXml = identityDocumentXml(identityDocument);
  return identityXml ? { innAttribute: "", identityXml } : null;
}

function normalizedRelationship(value: string | null | undefined): "self" | "other" {
  const normalized = repairMojibakeText(value ?? "").trim().toLocaleLowerCase("ru-RU");
  return ["self", "patient", "me", "пациент", "сам пациент", "сама пациентка", "налогоплательщик"].includes(normalized)
    ? "self"
    : "other";
}

function payerPersonXml(payment: Payment): string | null {
  const payerName = nameParts(payment.payerFullName);
  const payerBirthDate = isoToRuDate(payment.payerBirthDate);
  const identifier = taxPersonIdentifierXml(payment.payerInn, payment.payerIdentityDocument);
  if (!payerName || !identifier || !payerBirthDate) return null;
  return `<НППлатМедУсл${identifier.innAttribute} ДатаРожд="${xml(payerBirthDate)}">${fioXml(payerName)}${identifier.identityXml}</НППлатМедУсл>`;
}

function patientPersonXml(patient: Patient): string | null {
  const patientName = nameParts(patient.fullName);
  const patientBirthDate = isoToRuDate(patient.birthDate);
  const identifier = taxPersonIdentifierXml(patient.administrativeProfile?.taxpayerInn, patient.administrativeProfile?.identityDocument);
  if (!patientName || !identifier || !patientBirthDate) return null;
  return `<Пациент${identifier.innAttribute} ДатаРожд="${xml(patientBirthDate)}">${fioXml(patientName)}${identifier.identityXml}</Пациент>`;
}

function clinicXml(profile: ClinicProfile): string | null {
  const inn = digits(profile.inn);
  const kpp = digits(profile.kpp);
  if (inn.length === 10 && kpp.length === 9) {
    return `<НПЮЛ НаимОрг="${xml(present(profile.legalName) ?? present(profile.clinicName) ?? "DENTE")}" ИННЮЛ="${xml(inn)}" КПП="${xml(kpp)}"/>`;
  }
  if (inn.length === 12) {
    const signer = nameParts(profile.signatoryName || profile.legalName || profile.clinicName);
    if (!signer) return null;
    return `<НПИП ИННФЛ="${xml(inn)}">${fioXml(signer)}</НПИП>`;
  }
  return null;
}

function signerXml(profile: ClinicProfile): string | null {
  const signer = nameParts(profile.signatoryName || profile.legalName || profile.clinicName);
  return signer ? `<Подписант ПрПодп="1">${fioXml(signer)}</Подписант>` : null;
}

function requireTaxOfficeCode(value: string | null): string | null {
  const clean = digits(value);
  return /^\d{4}$/.test(clean) ? clean : null;
}

export function buildKnd1151156Xml(
  document: GeneratedDocument,
  patient: Patient,
  context: Knd1151156XmlContext
): Knd1151156XmlResult {
  if (document.kind !== "tax_deduction_certificate") {
    return { ok: false, statusCode: 409, error: "XML КНД 1151156 доступен только для справки об оплате медицинских услуг с 2024 года." };
  }
  if (!document.taxYear || document.taxYear < 2024) {
    return { ok: false, statusCode: 409, error: "XML КНД 1151156 требует налоговый год 2024 или позже." };
  }

  const taxOfficeCode = requireTaxOfficeCode(context.taxOfficeCode);
  if (!taxOfficeCode) {
    return { ok: false, statusCode: 409, error: "Для XML КНД 1151156 укажите в серверных настройках 4-значный код налогового органа." };
  }

  const clinic = clinicXml(context.clinicProfile);
  const signer = signerXml(context.clinicProfile);
  if (!clinic || !signer) {
    return { ok: false, statusCode: 409, error: "Для XML КНД 1151156 нужен корректный ИНН клиники/ИП и ФИО подписанта." };
  }

  const taxPayments = taxPaymentsForDocument(document, context.payments);
  if (!taxPayments.length) {
    return { ok: false, statusCode: 409, error: "Для XML КНД 1151156 нужен хотя бы один оплаченный платеж за выбранный год." };
  }
  if (taxPayments.some((payment) => !taxPaymentCode(payment))) {
    return { ok: false, statusCode: 409, error: "Для XML КНД 1151156 каждый платеж должен иметь код услуги 1 или 2." };
  }

  const payerPayment = taxPayments[0]!;
  const payer = payerPersonXml(payerPayment);
  if (!payer) {
    return { ok: false, statusCode: 409, error: "Для XML КНД 1151156 нужны ФИО, дата рождения и 12-значный ИНН либо документ личности налогоплательщика с датой выдачи." };
  }

  const samePatientFlag = normalizedRelationship(payerPayment.payerRelationship) === "self" ? "1" : "0";
  const patientXml = samePatientFlag === "0" ? patientPersonXml(patient) : null;
  if (samePatientFlag === "0" && !patientXml) {
    return { ok: false, statusCode: 409, error: "Если налогоплательщик и пациент разные, для XML КНД 1151156 нужны ФИО, дата рождения и 12-значный ИНН либо документ личности пациента с датой выдачи." };
  }

  const sumCode1 = taxPaymentSum(taxPayments, "1");
  const sumCode2 = taxPaymentSum(taxPayments, "2");
  const sumAttrs = [sumCode1 > 0 ? `СуммаКод1="${money(sumCode1)}"` : null, sumCode2 > 0 ? `СуммаКод2="${money(sumCode2)}"` : null]
    .filter(Boolean)
    .join(" ");
  if (!sumAttrs) {
    return { ok: false, statusCode: 409, error: "Для XML КНД 1151156 нужна сумма расходов по коду услуги 1 или 2." };
  }

  const documentDate = isoToRuDate(document.issuedAt || new Date().toISOString());
  const documentNumber = compactDocumentNumber(document);
  const fileName = `UT_SVOPLMEDUSL_DENTE_${document.taxYear}_${documentNumber}`;
  const xmlText = `<?xml version="1.0" encoding="UTF-8"?>
<!-- DENTE XML draft for issued KND ${KND_1151156_PRINT_FORM_CODE}; electronic medical expense KND ${FNS_MEDICAL_EXPENSE_XML_KND}, XSD ${FNS_MEDICAL_EXPENSE_XML_VERSION}, FNS order ${FNS_MEDICAL_EXPENSE_ORDER}. Not a signed TKS package: validate through operator/FNS and sign with KEP before dispatch. -->
<Файл ИдФайл="${xml(fileName)}" ВерсПрог="DENTE 0.1.0" ВерсФорм="${FNS_MEDICAL_EXPENSE_XML_VERSION}">
  <Документ КНД="${FNS_MEDICAL_EXPENSE_XML_KND}" ДатаДок="${xml(documentDate)}" КодНО="${xml(taxOfficeCode)}" ОтчГод="${xml(document.taxYear)}">
    <СвНП>${clinic}</СвНП>
    ${signer}
    <СведРасхУсл НомерСвед="${xml(documentNumber)}" НомКорр="0" ПрПациент="${samePatientFlag}" ${sumAttrs}>
      ${payer}
      ${patientXml ?? ""}
    </СведРасхУсл>
  </Документ>
</Файл>`;

  const preflightIssues = validateKnd1151156XmlDraft(xmlText, {
    fileName,
    taxOfficeCode,
    taxYear: document.taxYear,
    documentNumber,
    samePatientFlag,
    sumCode1,
    sumCode2,
    requiresPatient: samePatientFlag === "0"
  });
  if (preflightIssues.length) {
    return {
      ok: false,
      statusCode: 409,
      error: `XML КНД 1151156 не прошел внутреннюю структурную предпроверку DENTE: ${preflightIssues
        .map((issue) => `${issue.code}: ${issue.message}`)
        .join("; ")}`
    };
  }

  return {
    ok: true,
    fileName,
    xml: xmlText,
    warnings: [
      `Внутренняя структурная предпроверка DENTE пройдена: корень, КНД ${FNS_MEDICAL_EXPENSE_XML_KND}, ВерсФорм ${FNS_MEDICAL_EXPENSE_XML_VERSION}, НомерСвед, флаг пациента и суммы согласованы. Это не заменяет официальную XSD/ЭДО-проверку.`,
      `XML draft собран по структуре приказа ФНС ${FNS_MEDICAL_EXPENSE_ORDER}; это не подписанный ТКС-пакет. Перед отправкой выполните операторскую XSD-проверку и подпись КЭП.`
    ]
  };
}
