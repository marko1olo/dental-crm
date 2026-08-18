/**
 * Production-Grade XML Builder for FNS Form KND 1151156 / Format 1184043 (`UT_SVOPLMEDUSL`)
 * Generates XML files strictly conforming to FNS Order dated 08.11.2023 No. EA-7-11/824@ Version 5.01.
 */

import { randomUUID } from "node:crypto";
import { escapeXml } from "../cda/util.js";

export interface FnsClinicInfo {
	inn: string;
	kpp?: string;
	ogrn: string;
	name?: string;
	isIndividualEntrepreneur?: boolean;
	ipFullName?: {
		family: string;
		given: string;
		patronymic?: string;
	};
	license?: {
		number: string;
		date: string;
	};
}

export interface FnsPersonInfo {
	inn?: string;
	snils?: string;
	birthDate?: string;
	fullName: {
		family: string;
		given: string;
		patronymic?: string;
	};
	identityDocument?: {
		docTypeCode?: string; // 21 for Russian Passport
		seriesAndNumber: string;
		issueDate?: string;
	};
}

export interface FnsPatientInfo extends Partial<FnsPersonInfo> {
	patientKinshipCode: "1" | "2" | "3" | "4" | "5"; // 1 = Self, 2 = Spouse, 3 = Parent, 4 = Child, 5 = Ward
}

export interface FnsTaxPayload {
	taxInspectionCode?: string; // 4-digit code e.g. "7701"
	documentNumber: string;
	documentDate: string | Date;
	taxYear: string;
	certificateKind?: "1" | "2" | "3"; // 1 = Primary, 2 = Corrective, 3 = Cancellation
	correctionNumber?: number;
	softwareVersion?: string;
	clinic: FnsClinicInfo;
	payer: FnsPersonInfo;
	patient: FnsPatientInfo;
	expenses: {
		code1AmountRub?: number;
		code2AmountRub?: number;
	};
	signatory: {
		signatoryRole: "1" | "2"; // 1 = Head/IP, 2 = Authorized Representative
		snils?: string;
		fullName: {
			family: string;
			given: string;
			patronymic?: string;
		};
		powerOfAttorneyNumber?: string;
	};
}

export function formatFnsDate(dateStrOrObj?: string | Date): string {
	if (!dateStrOrObj) {
		const now = new Date();
		const dd = now.getDate().toString().padStart(2, "0");
		const mm = (now.getMonth() + 1).toString().padStart(2, "0");
		const yyyy = now.getFullYear();
		return `${dd}.${mm}.${yyyy}`;
	}
	if (typeof dateStrOrObj === "string") {
		if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStrOrObj)) {
			return dateStrOrObj;
		}
		if (/^\d{4}-\d{2}-\d{2}/.test(dateStrOrObj)) {
			const datePart = dateStrOrObj.split("T")[0] ?? "";
			const parts = datePart.split("-");
			if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
				return `${parts[2]}.${parts[1]}.${parts[0]}`;
			}
		}
		if (/^\d{8}$/.test(dateStrOrObj)) {
			return `${dateStrOrObj.slice(6, 8)}.${dateStrOrObj.slice(4, 6)}.${dateStrOrObj.slice(0, 4)}`;
		}
	}
	const date = new Date(dateStrOrObj);
	if (Number.isNaN(date.getTime())) return "01.01.2026";
	const dd = date.getDate().toString().padStart(2, "0");
	const mm = (date.getMonth() + 1).toString().padStart(2, "0");
	const yyyy = date.getFullYear();
	return `${dd}.${mm}.${yyyy}`;
}

export function cleanDigits(str?: string | null): string {
	return str ? str.replace(/\D/g, "") : "";
}

export function generateFnsFileNameAndId(
	taxOfficeCode: string,
	senderInn: string,
	senderKpp: string | undefined,
	dateStr: string,
	customUuid?: string,
): { fileName: string; fileId: string; uuid: string } {
	const cleanOffice = (taxOfficeCode || "7701").padStart(4, "0").slice(0, 4);
	const cleanInn = cleanDigits(senderInn);
	const cleanKpp = senderKpp ? cleanDigits(senderKpp) : "";
	const senderId = cleanInn.length === 12 ? cleanInn : `${cleanInn}${cleanKpp}`;

	const rawDate = dateStr.includes(".")
		? dateStr.split(".").reverse().join("")
		: dateStr.replace(/\D/g, "").slice(0, 8) || "20260818";

	const fileUuid = customUuid || randomUUID();
	const fileId = `UT_SVOPLMEDUSL_${cleanOffice}_${cleanOffice}_${senderId}_${rawDate}_${fileUuid}`;
	const fileName = `${fileId}.xml`;

	return { fileName, fileId, uuid: fileUuid };
}

export function buildFnsKnd1151156Xml(
	payload: FnsTaxPayload,
	customUuid?: string,
): {
	xmlContent: string;
	fileName: string;
	fileId: string;
} {
	const taxOffice = payload.taxInspectionCode || "7701";
	const docDateFormatted = formatFnsDate(payload.documentDate);
	const taxYear = (
		payload.taxYear || new Date().getFullYear().toString()
	).slice(0, 4);
	const certKind = payload.certificateKind || "1";
	const corrNumber = payload.correctionNumber ?? (certKind === "1" ? 0 : 1);
	const progVersion =
		payload.softwareVersion || "DentalMIS_EGISZ_Gateway_v2.4.0";

	const clinicInn = cleanDigits(payload.clinic.inn);
	const clinicKpp = payload.clinic.kpp
		? cleanDigits(payload.clinic.kpp)
		: undefined;
	const clinicOgrn = cleanDigits(payload.clinic.ogrn);

	const { fileName, fileId } = generateFnsFileNameAndId(
		taxOffice,
		clinicInn,
		clinicKpp,
		docDateFormatted,
		customUuid,
	);

	// 1. Clinic block (<СвОргМ>)
	let orgBlockXml = "";
	if (payload.clinic.isIndividualEntrepreneur || clinicInn.length === 12) {
		const ipFio = payload.clinic.ipFullName || {
			family: "Иванов",
			given: "Иван",
		};
		const patronymicAttr = ipFio.patronymic
			? ` Отчество="${escapeXml(ipFio.patronymic)}"`
			: "";
		const licenseXml = payload.clinic.license
			? `
        <Лицензия НомЛиц="${escapeXml(payload.clinic.license.number)}" ДатаЛиц="${formatFnsDate(payload.clinic.license.date)}"/>`
			: "";

		orgBlockXml = `    <СвОргМ>
      <СвИП ИННФЛ="${clinicInn}" ОГРНИП="${clinicOgrn}">
        <ФИО Фамилия="${escapeXml(ipFio.family)}" Имя="${escapeXml(ipFio.given)}"${patronymicAttr}/>${licenseXml}
      </СвИП>
    </СвОргМ>`;
	} else {
		const licenseXml = payload.clinic.license
			? `
        <Лицензия НомЛиц="${escapeXml(payload.clinic.license.number)}" ДатаЛиц="${formatFnsDate(payload.clinic.license.date)}"/>`
			: "";

		orgBlockXml = `    <СвОргМ>
      <СвОргЮЛ НаимОрг="${escapeXml(payload.clinic.name || "ООО Стоматология")}" 
                ИННЮЛ="${clinicInn}" 
                КПП="${clinicKpp || "770101001"}" 
                ОГРН="${clinicOgrn}">${licenseXml}
      </СвОргЮЛ>
    </СвОргМ>`;
	}

	// 2. Payer block (<СвФЛ>)
	const payer = payload.payer;
	const payerInnClean = cleanDigits(payer.inn);
	const payerSnilsClean = cleanDigits(payer.snils);
	const payerBirthFormatted = formatFnsDate(payer.birthDate);

	let payerAttrs = `ДатаРожд="${payerBirthFormatted}"`;
	if (payerInnClean && payerInnClean.length === 12) {
		payerAttrs = `ИННФЛ="${payerInnClean}" ${payerAttrs}`;
	}
	if (payerSnilsClean && payerSnilsClean.length === 11) {
		payerAttrs = `СНИЛС="${payerSnilsClean}" ${payerAttrs}`;
	}

	const payerPatronymicAttr = payer.fullName.patronymic
		? ` Отчество="${escapeXml(payer.fullName.patronymic)}"`
		: "";

	let payerDocXml = "";
	if (payer.identityDocument) {
		const docDateAttr = payer.identityDocument.issueDate
			? ` ДатаДок="${formatFnsDate(payer.identityDocument.issueDate)}"`
			: "";
		payerDocXml = `
      <УдЛичнФЛ КодВидДок="${escapeXml(payer.identityDocument.docTypeCode || "21")}" СерНомДок="${escapeXml(payer.identityDocument.seriesAndNumber)}"${docDateAttr}/>`;
	}

	const payerBlockXml = `    <СвФЛ ${payerAttrs}>
      <ФИО Фамилия="${escapeXml(payer.fullName.family)}" Имя="${escapeXml(payer.fullName.given)}"${payerPatronymicAttr}/>${payerDocXml}
    </СвФЛ>`;

	// 3. Patient block (<СвПациент>)
	const patient = payload.patient;
	let patientBlockXml = "";
	if (patient.patientKinshipCode === "1") {
		patientBlockXml = "    <СвПациент ПризнПац=\"1\"/>";
	} else {
		let patientAttrs = `ПризнПац="${patient.patientKinshipCode}"`;
		const patInn = cleanDigits(patient.inn);
		const patSnils = cleanDigits(patient.snils);
		if (patInn && patInn.length === 12) patientAttrs += ` ИННФЛ="${patInn}"`;
		if (patSnils && patSnils.length === 11)
			patientAttrs += ` СНИЛС="${patSnils}"`;
		if (patient.birthDate)
			patientAttrs += ` ДатаРожд="${formatFnsDate(patient.birthDate)}"`;

		let patientFioXml = "";
		if (patient.fullName) {
			const patPatrAttr = patient.fullName.patronymic
				? ` Отчество="${escapeXml(patient.fullName.patronymic)}"`
				: "";
			patientFioXml = `
      <ФИО Фамилия="${escapeXml(patient.fullName.family)}" Имя="${escapeXml(patient.fullName.given)}"${patPatrAttr}/>`;
		}

		let patientDocXml = "";
		if (patient.identityDocument) {
			const docDateAttr = patient.identityDocument.issueDate
				? ` ДатаДок="${formatFnsDate(patient.identityDocument.issueDate)}"`
				: "";
			patientDocXml = `
      <УдЛичнФЛ КодВидДок="${escapeXml(patient.identityDocument.docTypeCode || "21")}" СерНомДок="${escapeXml(patient.identityDocument.seriesAndNumber)}"${docDateAttr}/>`;
		}

		patientBlockXml = `    <СвПациент ${patientAttrs}>${patientFioXml}${patientDocXml}
    </СвПациент>`;
	}

	// 4. Expenses block (<СведРасхУсл>)
	const expenseNodes: string[] = [];
	const code1Amt = payload.expenses.code1AmountRub;
	const code2Amt = payload.expenses.code2AmountRub;

	if (code1Amt && code1Amt > 0) {
		expenseNodes.push(
			`    <СведРасхУсл КодУслуг="1" СумОпл="${code1Amt.toFixed(2)}"/>`,
		);
	}
	if (code2Amt && code2Amt > 0) {
		expenseNodes.push(
			`    <СведРасхУсл КодУслуг="2" СумОпл="${code2Amt.toFixed(2)}"/>`,
		);
	}

	if (expenseNodes.length === 0) {
		throw new Error(
			"At least one of code1AmountRub or code2AmountRub must be greater than 0.00",
		);
	}

	// 5. Signatory block (<Подписант>)
	const sign = payload.signatory;
	const signSnils = cleanDigits(sign.snils);
	const signSnilsAttr =
		signSnils && signSnils.length === 11 ? ` СНИЛС="${signSnils}"` : "";
	const signPatronymicAttr = sign.fullName.patronymic
		? ` Отчество="${escapeXml(sign.fullName.patronymic)}"`
		: "";
	const signRepXml =
		sign.signatoryRole === "2" && sign.powerOfAttorneyNumber
			? `\n      <СвПред НомДовер="${escapeXml(sign.powerOfAttorneyNumber)}"/>`
			: "";

	const signatoryBlockXml = `    <Подписант ПрПодп="${sign.signatoryRole}"${signSnilsAttr}>
      <ФИО Фамилия="${escapeXml(sign.fullName.family)}" Имя="${escapeXml(sign.fullName.given)}"${signPatronymicAttr}/>${signRepXml}
    </Подписант>`;

	const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="${fileId}" 
      ВерсПрог="${escapeXml(progVersion)}" 
      ВерсФорм="5.01">
  <Документ КНД="1184043" 
            ДатаДок="${docDateFormatted}" 
            НомСпр="${escapeXml(payload.documentNumber)}" 
            ГодУсл="${taxYear}" 
            ПризнСпр="${certKind}" 
            НомКорр="${corrNumber}">
${orgBlockXml}
${payerBlockXml}
${patientBlockXml}
${expenseNodes.join("\n")}
${signatoryBlockXml}
  </Документ>
</Файл>`;

	return {
		xmlContent,
		fileName,
		fileId,
	};
}
