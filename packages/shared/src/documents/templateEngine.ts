/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ШАБЛОНИЗАТОР И РЕЗОЛВЕР ПЕРЕМЕННЫХ МЕДИЦИНСКИХ БЛАНКОВ DENTE CRM
 * Стандарт StomX: 10 рубрик, 49 бланков Минздрава РФ, 74+ системных токена
 * ═══════════════════════════════════════════════════════════════════════════
 */
import {
	formatKopecksRu,
	kopecksToNumericString,
	parseKopecks,
	rublesToKopecks,
} from "../money.js";
import {
	integerToWordsRu,
	kopecksToWordsRu,
	legalMoneyInWordsFromKopecksRu,
	legalMoneyInWordsRu,
	rublesToWordsRu,
} from "../moneyWordsRu.js";
import {
	type ClinicalToothRowInput,
	type DentalFormulaRecordInput,
	generateDentalFormulaBreakdownText,
	renderGraphicalDentalFormulaHtml,
	resolveAllTeethTokens,
	type ToothStateData,
} from "./dentalFormulaRenderer.js";

export {
	formatKopecksRu,
	kopecksToNumericString,
	kopecksToWordsRu,
	legalMoneyInWordsFromKopecksRu,
	legalMoneyInWordsRu,
	parseKopecks,
	rublesToKopecks,
	rublesToWordsRu,
};

export type RepresentativeRelationType =
	| "родитель"
	| "опекун"
	| "Муж"
	| "Жена"
	| "Отец"
	| "Мать"
	| "Дочь"
	| "Сын"
	| "Сестра"
	| "Брат"
	| (string & {});

export interface PassportData {
	series?: string | null | undefined;
	number?: string | null | undefined;
	issuedDate?: string | Date | null | undefined;
	issuedBy?: string | null | undefined;
	divisionCode?: string | null | undefined;
}

export interface PatientContextData {
	id?: string | number | null | undefined;
	cardNumber?: string | number | null | undefined;
	fullName?: string | null | undefined;
	lastName?: string | null | undefined;
	firstName?: string | null | undefined;
	middleName?: string | null | undefined;
	gender?: "male" | "female" | "муж" | "жен" | string | null | undefined;
	birthDate?: string | Date | null | undefined;
	age?: string | number | null | undefined;
	address?: string | null | undefined; // Адрес регистрации
	actualAddress?: string | null | undefined; // Фактический адрес
	phone?: string | null | undefined;
	email?: string | null | undefined;
	inn?: string | null | undefined;
	snils?: string | null | undefined;
	disability?: string | number | null | undefined;
	benefits?: string | number | null | undefined;
	profession?: string | null | undefined;
	specialNotes?: string | null | undefined;
	policies?: string | null | undefined;
	omsPolicy?: string | null | undefined;
	dmsPolicy?: string | null | undefined;
	advance?: string | number | null | undefined;
	passport?: PassportData | null | undefined;
	birthPlace?: string | null | undefined;
	firstVisitDate?: string | Date | null | undefined;
	registrationDate?: string | Date | null | undefined;
	homePhone?: string | null | undefined;
	mobilePhone?: string | null | undefined;
	workplace?: string | null | undefined;
	parentName?: string | null | undefined;
	somaticStatus?: string | null | undefined;
	allergyStatus?: string | null | undefined;
	drugIntolerance?: string | null | undefined;
	iin?: string | null | undefined;
	comment?: string | null | undefined;
}

export interface RepresentativeContextData {
	fullName?: string | null | undefined;
	initials?: string | null | undefined;
	phone?: string | null | undefined;
	birthDate?: string | Date | null | undefined;
	address?: string | null | undefined;
	snils?: string | null | undefined;
	basis?: string | null | undefined; // "Паспорт", "Свидетельство о рождении" и т.д.
	relationType?: RepresentativeRelationType | null | undefined;
	passport?: PassportData | null | undefined;
	birthPlace?: string | null | undefined;
	registrationDate?: string | Date | null | undefined;
	homePhone?: string | null | undefined;
	mobilePhone?: string | null | undefined;
	email?: string | null | undefined;
	gender?: "male" | "female" | "муж" | "жен" | string | null | undefined;
	age?: string | number | null | undefined;
	inn?: string | null | undefined;
	iin?: string | null | undefined;
}

export interface AuthorizedPersonContextData {
	fullName?: string | null | undefined;
	initials?: string | null | undefined;
	phone?: string | null | undefined;
	birthDate?: string | Date | null | undefined;
	address?: string | null | undefined;
	snils?: string | null | undefined;
	passport?: PassportData | null | undefined;
}

export interface DoctorStaffContextData {
	fullName?: string | null | undefined;
	initials?: string | null | undefined;
	position?: string | null | undefined;
	specialty?: string | null | undefined;
}

export interface ClinicContextData {
	name?: string | null | undefined;
	inn?: string | null | undefined;
	kpp?: string | null | undefined;
	ogrn?: string | null | undefined;
	address?: string | null | undefined;
	phone?: string | null | undefined;
	licenseNumber?: string | null | undefined;
	licenseIssuedDate?: string | Date | null | undefined;
	licenseValidity?: string | null | undefined;
	licenseIssuer?: string | null | undefined;
	logoUrl?: string | null | undefined;
	bankName?: string | null | undefined;
	bik?: string | null | undefined;
	checkingAccount?: string | null | undefined;
	corrAccount?: string | null | undefined;
}

export interface AppointmentContextData {
	id?: string | number | null | undefined;
	date?: string | Date | null | undefined;
	fullDate?: string | null | undefined;
	time?: string | null | undefined;
}

export interface WarehouseContextData {
	name?: string | null | undefined;
	materialName?: string | null | undefined;
	minThreshold?: string | number | null | undefined;
	balance?: string | number | null | undefined;
}

export interface DocumentMetaContextData {
	id?: string | number | null | undefined;
	number?: string | null | undefined;
	startDate?: string | Date | null | undefined;
	endDate?: string | Date | null | undefined;
	createdAt?: string | Date | null | undefined;
}

export interface FinancialContextData {
	amountKopecks?: number | null | undefined;
	amountRubles?: number | null | undefined;
	invoiceNumber?: string | null | undefined;
	invoiceDate?: string | Date | null | undefined;
	contractNumber?: string | null | undefined;
	contractDate?: string | Date | null | undefined;
	actNumber?: string | null | undefined;
	actDate?: string | Date | null | undefined;
	comment?: string | null | undefined;
}

export interface ClinicalExaminationContextData {
	examinationDate?: string | Date | null | undefined;
	doctorFullName?: string | null | undefined;
	doctorInitials?: string | null | undefined;
	complaints?: string | null | undefined;
	anamnesis?: string | null | undefined;
	pastDiseases?: string | null | undefined;
	diseaseHistory?: string | null | undefined;
	externalExam?: string | null | undefined;
	bite?: string | null | undefined;
	mucousCondition?: string | null | undefined;
	xray?: string | null | undefined;
	objective?: string | null | undefined;
	diagnosis?: string | null | undefined;
	treatment?: string | null | undefined;
	recommendations?: string | null | undefined;
	treatmentDateTime?: string | Date | null | undefined;
}

/**
 * Полный типобезопасный контекст выполнения шаблонизатора
 */
export interface TemplateExecutionContext {
	patient?: PatientContextData | null | undefined;
	representative?: RepresentativeContextData | null | undefined;
	authorizedPerson?: AuthorizedPersonContextData | null | undefined;
	doctor?: DoctorStaffContextData | null | undefined;
	lastDoctor?: DoctorStaffContextData | null | undefined;
	administrator?: DoctorStaffContextData | null | undefined;
	currentUser?: DoctorStaffContextData | null | undefined;
	clinic?: ClinicContextData | null | undefined;
	appointment?: AppointmentContextData | null | undefined;
	warehouse?: WarehouseContextData | null | undefined;
	document?: DocumentMetaContextData | null | undefined;
	currentDate?: string | Date | null | undefined;
	financial?: FinancialContextData | null | undefined;
	clinicalExamination?: ClinicalExaminationContextData | null | undefined;
	treatmentPlanTableHtml?: string | null | undefined;
	treatmentPlanToothTableHtml?: string | null | undefined;
	actServicesTableHtml?: string | null | undefined;
	dentalWorkOrderTableHtml?: string | null | undefined;
	dentalLab?:
		| {
				name?: string | null | undefined;
				technicianFullName?: string | null | undefined;
				colorVita?: string | null | undefined;
				stlUrl?: string | null | undefined;
				comments?: string | null | undefined;
				fittingDate?: string | Date | null | undefined;
		  }
		| null
		| undefined;
	taxpayer?:
		| {
				fullName?: string | null | undefined;
				inn?: string | null | undefined;
				snils?: string | null | undefined;
				passport?: string | null | undefined;
		  }
		| null
		| undefined;
	fnsServiceCode?: "1" | "2" | string | null | undefined;
	dentalFormula?:
		| Record<string | number, ToothStateData | string | Record<string, unknown>>
		| Array<ClinicalToothRowInput>
		| readonly Record<string, unknown>[]
		| DentalFormulaRecordInput
		| null
		| undefined;
}

const RU_MONTHS_GENITIVE = [
	"января",
	"февраля",
	"марта",
	"апреля",
	"мая",
	"июня",
	"июля",
	"августа",
	"сентября",
	"октября",
	"ноября",
	"декабря",
];

export function formatDateDdMmYyyy(val: unknown): string {
	if (!val) return "";
	if (typeof val === "string") {
		const trimmed = val.trim();
		if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) return trimmed;
		const d = new Date(trimmed);
		if (Number.isNaN(d.getTime())) return trimmed;
		const day = String(d.getDate()).padStart(2, "0");
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const year = d.getFullYear();
		return `${day}.${month}.${year}`;
	}
	if (val instanceof Date) {
		if (Number.isNaN(val.getTime())) return "";
		const day = String(val.getDate()).padStart(2, "0");
		const month = String(val.getMonth() + 1).padStart(2, "0");
		const year = val.getFullYear();
		return `${day}.${month}.${year}`;
	}
	return String(val);
}

export function formatDateFullRussian(val: unknown): string {
	if (!val) return "";
	let d: Date;
	if (val instanceof Date) {
		d = val;
	} else if (typeof val === "string") {
		const trimmed = val.trim();
		const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
		if (dotMatch) {
			const day = Number.parseInt(dotMatch[1] ?? "1", 10);
			const month = Number.parseInt(dotMatch[2] ?? "1", 10) - 1;
			const year = Number.parseInt(dotMatch[3] ?? "2026", 10);
			d = new Date(year, month, day);
		} else {
			d = new Date(trimmed);
		}
	} else {
		return String(val);
	}

	if (Number.isNaN(d.getTime())) return typeof val === "string" ? val : "";
	const day = d.getDate();
	const monthName = RU_MONTHS_GENITIVE[d.getMonth()] ?? "";
	const year = d.getFullYear();
	return `${day} ${monthName} ${year} г.`;
}

export function formatInitials(fullName: string | null | undefined): string {
	if (!fullName || !fullName.trim()) return "";
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "";
	if (parts.length === 1) return parts[0] ?? "";
	const firstInitial = parts[1]?.[0] ? `${parts[1][0].toUpperCase()}.` : "";
	const secondInitial = parts[2]?.[0] ? `${parts[2][0].toUpperCase()}.` : "";
	return [parts[0], firstInitial, secondInitial].filter(Boolean).join(" ");
}

export function calculatePatientAgeNumber(
	birthDateVal: unknown,
): number | null {
	if (!birthDateVal) return null;
	let bDate: Date;
	if (birthDateVal instanceof Date) {
		bDate = birthDateVal;
	} else if (typeof birthDateVal === "string") {
		const trimmed = birthDateVal.trim();
		const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
		if (dotMatch) {
			const day = Number.parseInt(dotMatch[1] ?? "1", 10);
			const month = Number.parseInt(dotMatch[2] ?? "1", 10) - 1;
			const year = Number.parseInt(dotMatch[3] ?? "2026", 10);
			bDate = new Date(year, month, day);
		} else {
			bDate = new Date(trimmed);
		}
	} else {
		return null;
	}

	if (Number.isNaN(bDate.getTime())) return null;
	const now = new Date();
	let age = now.getFullYear() - bDate.getFullYear();
	const mDiff = now.getMonth() - bDate.getMonth();
	if (mDiff < 0 || (mDiff === 0 && now.getDate() < bDate.getDate())) {
		age--;
	}
	return age < 0 ? 0 : age;
}

export function calculatePatientAgeString(birthDateVal: unknown): string {
	const age = calculatePatientAgeNumber(birthDateVal);
	if (age === null) return "";
	return String(age);
}

export function calculatePatientAgeWithUnit(birthDateVal: unknown): string {
	const age = calculatePatientAgeNumber(birthDateVal);
	if (age === null) return "";
	const rem10 = age % 10;
	const rem100 = age % 100;
	let unit = "лет";
	if (rem10 === 1 && rem100 !== 11) {
		unit = "год";
	} else if (rem10 >= 2 && rem10 <= 4 && (rem100 < 10 || rem100 >= 20)) {
		unit = "года";
	}
	return `${age} ${unit}`;
}

export function formatDateRussianDayMonthYear(val: unknown): string {
	if (!val) return "";
	let d: Date;
	if (val instanceof Date) {
		d = val;
	} else if (typeof val === "string") {
		const trimmed = val.trim();
		const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
		if (dotMatch) {
			const day = Number.parseInt(dotMatch[1] ?? "1", 10);
			const month = Number.parseInt(dotMatch[2] ?? "1", 10) - 1;
			const year = Number.parseInt(dotMatch[3] ?? "2026", 10);
			d = new Date(year, month, day);
		} else {
			d = new Date(trimmed);
		}
	} else {
		return String(val);
	}

	if (Number.isNaN(d.getTime())) return typeof val === "string" ? val : "";
	const day = d.getDate();
	const monthName = RU_MONTHS_GENITIVE[d.getMonth()] ?? "";
	const year = d.getFullYear();
	return `${day} ${monthName} ${year}`;
}

export function extractYearFromDate(val: unknown): string {
	if (!val) return "";
	if (typeof val === "string") {
		const match = val.match(/\b(\d{4})\b/);
		if (match) return match[1] ?? "";
	}
	if (val instanceof Date && !Number.isNaN(val.getTime())) {
		return String(val.getFullYear());
	}
	return "";
}

export function formatPassportFullString(
	passport?: PassportData | null | undefined,
): string {
	if (!passport) return "";
	const parts: string[] = [];
	const seriesNumber = [passport.series, passport.number]
		.filter(Boolean)
		.join(" ");
	if (seriesNumber) {
		parts.push(`Паспорт РФ: ${seriesNumber}`);
	}
	if (passport.issuedDate) {
		parts.push(`Выдан: ${formatDateDdMmYyyy(passport.issuedDate)}`);
	}
	if (passport.issuedBy) {
		parts.push(passport.issuedBy);
	}
	if (passport.divisionCode) {
		parts.push(`Код подразделения: ${passport.divisionCode}`);
	}
	return parts.join(", ");
}

function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Полный реестр 74+ стандартизированных токенов подстановки
 */
export * from "./templateVariablesRegistry.js";

/**
 * Строит карту значений всех токенов на основе контекста
 */
export function buildTemplateVariablesMap(
	ctx: TemplateExecutionContext,
): Record<string, string> {
	const map: Record<string, string> = {};

	// Текущая дата
	const curDate = ctx.currentDate ? new Date(ctx.currentDate) : new Date();
	const curDateDdMmYyyy = formatDateDdMmYyyy(curDate);
	const curDateFull = formatDateFullRussian(curDate);
	map["ТекущаяДата"] = curDateDdMmYyyy;
	map["ТекущаяПолнаяДата"] = curDateFull;
	map["ТекущаяДатаПолная"] = curDateFull;

	// Пациент
	const p = ctx.patient ?? {};
	const pFullName =
		p.fullName ??
		[p.lastName, p.firstName, p.middleName].filter(Boolean).join(" ");
	const pParts = pFullName ? pFullName.trim().split(/\s+/).filter(Boolean) : [];
	const pLastName = p.lastName ?? pParts[0] ?? "";
	const pFirstName = p.firstName ?? pParts[1] ?? "";
	const pMiddleName = p.middleName ?? pParts[2] ?? "";
	const pLastNameUpper = pLastName.toUpperCase();
	const pLastNameUpperFullName = pLastNameUpper
		? [pLastNameUpper, pFirstName, pMiddleName].filter(Boolean).join(" ")
		: pFullName;
	const pInitials = formatInitials(pFullName);

	const pGenderStr =
		p.gender === "male" ||
		p.gender === "муж" ||
		p.gender === "мужской" ||
		p.gender === "Мужской"
			? "Мужской"
			: p.gender === "female" ||
					p.gender === "жен" ||
					p.gender === "женский" ||
					p.gender === "Женский"
				? "Женский"
				: (p.gender ?? "");

	const pBirthDateStr = formatDateDdMmYyyy(p.birthDate);
	const pBirthDateFull = formatDateRussianDayMonthYear(p.birthDate);
	const pBirthYear = extractYearFromDate(p.birthDate);
	const pAgeStr =
		p.age !== undefined && p.age !== null
			? String(p.age)
			: calculatePatientAgeString(p.birthDate);
	const pPassport = p.passport ?? {};
	const pPassportFull = formatPassportFullString(pPassport);

	const pAddress = p.address || p.actualAddress || "";
	const pActualAddress = p.actualAddress || p.address || "";
	const pPhone = p.phone || p.mobilePhone || "";
	const pPhones = [p.mobilePhone || p.phone, p.homePhone]
		.filter(Boolean)
		.join("; ");

	map["Пациент.ФИО"] = pFullName || "";
	map["Пациент.ID"] = p.id !== undefined && p.id !== null ? String(p.id) : "";
	map["Пациент.НомерКарты"] =
		p.cardNumber !== undefined && p.cardNumber !== null
			? String(p.cardNumber)
			: "";
	map["Пациент.НомерМедкарты"] = map["Пациент.НомерКарты"];
	map["Пациент.Фамилия"] = pLastName || "";
	map["Пациент.Имя"] = pFirstName || "";
	map["Пациент.Отчество"] = pMiddleName || "";
	map["Пациент.Пол"] = pGenderStr || "";
	map["Пациент.Адрес"] = pAddress;
	map["Пациент.Телефон"] = pPhone;
	map["Пациент.ИНН"] = p.inn || "";
	map["Пациент.ФамилияИО"] = pInitials;
	map["Пациент.ФИО.Инициалы"] = pInitials;
	map["Пациент.ДеньРождения"] = pBirthDateStr || "";
	map["Пациент.Возраст"] = pAgeStr || "";
	map["Пациент.ФактическийАдрес"] = pActualAddress;
	map["Пациент.Email"] = p.email || "";
	map["Пациент.СНИЛС"] = p.snils || "";
	map["Пациент.Инвалидность"] =
		p.disability !== undefined && p.disability !== null
			? String(p.disability)
			: "нет";
	map["Пациент.Льготы"] =
		p.benefits !== undefined && p.benefits !== null
			? String(p.benefits)
			: "нет";
	map["Пациент.Профессия"] = p.profession || "";
	map["Пациент.ОсобыеОтметки"] = p.specialNotes || "";
	map["Пациент.Полисы"] =
		p.policies || (p.omsPolicy ? `ОМС ${p.omsPolicy}` : "");
	map["Пациент.ПолисОМС"] = p.omsPolicy || "";
	map["Пациент.ПолисДМС"] = p.dmsPolicy || "";
	map["Пациент.Аванс"] =
		p.advance !== undefined && p.advance !== null ? String(p.advance) : "0";
	map["Пациент.Паспорт"] =
		pPassportFull ||
		[pPassport.series, pPassport.number].filter(Boolean).join(" ");
	map["Пациент.ПаспортДанные"] = pPassportFull || "";
	map["Пациент.Паспорт.Номер"] = pPassport.number || "";
	map["Пациент.Паспорт.Серия"] = pPassport.series || "";
	map["Пациент.Паспорт.СерияНомер"] = [pPassport.series, pPassport.number]
		.filter(Boolean)
		.join(" ");
	map["Пациент.Паспорт.ДатаВыдачи"] = formatDateDdMmYyyy(pPassport.issuedDate);
	map["Пациент.Паспорт.КемВыдан"] = pPassport.issuedBy || "";
	map["Пациент.Паспорт.КодПодразделения"] = pPassport.divisionCode || "";

	// Плоские теги пациента (IDENT / DentalPRO)
	map["ФАМИЛИЯИмяОтчество"] = pLastNameUpperFullName || "";
	map["ФамилияИмяОтчество"] = pFullName || "";
	map["ФамилияИО"] = pInitials || "";
	map["Фамилия"] = pLastName || "";
	map["Имя"] = pFirstName || "";
	map["Отчество"] = pMiddleName || "";
	map["ДатаРождения"] = pBirthDateFull || pBirthDateStr || "";
	map["ГодРождения"] = pBirthYear || "";
	map["Возраст"] = pAgeStr || "";
	map["Пол"] = pGenderStr || "";
	map["Телефоны"] = pPhone || pPhones || "";
	map["МобТелефон"] = p.mobilePhone || pPhone || "";
	map["ДомТелефон"] = p.homePhone || "";
	map["Email"] = p.email || "";
	map["Адрес"] = pActualAddress || pAddress;
	map["АдресРегистрации"] = p.address || pAddress;
	map["ДатаРегистрации"] = formatDateDdMmYyyy(p.registrationDate);
	map["ИНН"] = p.inn || "";
	map["СНИЛС"] = p.snils || "";
	map["ИИН"] = p.iin || "";
	map["МестоРаботы"] = p.workplace || "";
	map["Профессия"] = p.profession || "";
	map["Полисы"] = map["Пациент.Полисы"];
	map["Комментарий"] = p.comment || p.specialNotes || "";
	map["НомерКарты"] = map["Пациент.НомерКарты"];
	map["НомерМедкарты"] = map["Пациент.НомерМедкарты"];
	map["ДатаПервогоПриема"] = formatDateFullRussian(p.firstVisitDate);
	map["ДатаПервогоПриемаЧислом"] = formatDateDdMmYyyy(p.firstVisitDate);
	map["Родитель"] = p.parentName || (ctx.representative?.fullName ?? "");
	map["МестоРождения"] = p.birthPlace || "";
	map["Документ"] = pPassportFull;
	map["Документ.ТипДокумента"] = pPassport.number ? "Паспорт РФ" : "";
	map["Документ.СерияНомер"] = map["Пациент.Паспорт.СерияНомер"];
	map["Документ.СерияНомер.Серия"] = pPassport.series || "";
	map["Документ.СерияНомер.Номер"] = pPassport.number || "";
	map["Документ.Выдан"] = pPassport.number
		? `Выдан: ${formatDateDdMmYyyy(pPassport.issuedDate)}, ${pPassport.issuedBy || ""}, Код подразделения: ${pPassport.divisionCode || ""}`.trim()
		: "";
	map["Документ.Выдан.ДатаВыдачи"] = formatDateDdMmYyyy(pPassport.issuedDate);
	map["Документ.Выдан.КодПодразделения"] = pPassport.divisionCode || "";
	map["Документ.Выдан.КемВыдан"] = pPassport.issuedBy || "";

	// Соматический и аллергологический статус
	const somaticStatusStr =
		p.somaticStatus ||
		"Соматически здоров, хронических заболеваний не выявлено";
	const allergyStatusStr =
		p.allergyStatus ||
		p.specialNotes ||
		"Аллергологический анамнез не отягощен";
	const drugIntoleranceStr =
		p.drugIntolerance || "Непереносимость лекарственных препаратов отрицает";
	map["Пациент.СоматическийСтатус"] = somaticStatusStr;
	map["СоматическийСтатус"] = somaticStatusStr;
	map["Аллергостатус"] = allergyStatusStr;
	map["Аллергии"] = allergyStatusStr;
	map["НепереносимостьПрепаратов"] = drugIntoleranceStr;

	// Законный представитель
	const rep = ctx.representative ?? {};
	const repFullName = rep.fullName || "";
	const repParts = repFullName
		? repFullName.trim().split(/\s+/).filter(Boolean)
		: [];
	const repLastName = repParts[0] ?? "";
	const repFirstName = repParts[1] ?? "";
	const repMiddleName = repParts[2] ?? "";
	const repLastNameUpper = repLastName.toUpperCase();
	const repLastNameUpperFullName = repLastNameUpper
		? [repLastNameUpper, repFirstName, repMiddleName].filter(Boolean).join(" ")
		: repFullName;
	const repInitials = rep.initials || formatInitials(repFullName);
	const repPassport = rep.passport ?? {};
	const repPassportFull = formatPassportFullString(repPassport);
	const repGenderStr =
		rep.gender === "male" || rep.gender === "муж" || rep.gender === "мужской"
			? "мужской"
			: rep.gender === "female" ||
					rep.gender === "жен" ||
					rep.gender === "женский"
				? "женский"
				: (rep.gender ?? "");
	const repBirthDateStr = formatDateDdMmYyyy(rep.birthDate);
	const repBirthDateFull = formatDateRussianDayMonthYear(rep.birthDate);
	const repBirthYear = extractYearFromDate(rep.birthDate);
	const repAgeStr =
		rep.age !== undefined && rep.age !== null
			? String(rep.age)
			: calculatePatientAgeString(rep.birthDate);

	map["Представитель.ФИО"] = repFullName;
	map["Представитель.ФамилияИнициалы"] = repInitials;
	map["Представитель.Телефон"] = rep.phone || rep.mobilePhone || "";
	map["Представитель.Паспорт.Номер"] = repPassport.number || "";
	map["Представитель.Паспорт.Серия"] = repPassport.series || "";
	map["Представитель.Паспорт.ДатаВыдачи"] = formatDateDdMmYyyy(
		repPassport.issuedDate,
	);
	map["Представитель.Паспорт.КемВыдан"] = repPassport.issuedBy || "";
	map["Представитель.Паспорт.КодПодразделения"] =
		repPassport.divisionCode || "";
	map["Представитель.ДеньРождения"] = repBirthDateStr;
	map["Представитель.Адрес"] = rep.address || "";
	map["Представитель.СНИЛС"] = rep.snils || "";
	map["Представитель.НаОсновании"] =
		rep.basis || (repPassport.number ? "Паспорт" : "");
	map["Представитель.Основание"] = map["Представитель.НаОсновании"];
	map["Представитель.Тип"] = rep.relationType || "";
	map["Представитель.Родство"] = rep.relationType || "";

	// ИДЕНТ-алиасы представителя
	map["Представитель.ФАМИЛИЯИмяОтчество"] = repLastNameUpperFullName;
	map["Представитель.ФамилияИмяОтчество"] = repFullName;
	map["Представитель.ФамилияИО"] = repInitials;
	map["Представитель.Фамилия"] = repLastName;
	map["Представитель.Имя"] = repFirstName;
	map["Представитель.Отчество"] = repMiddleName;
	map["Представитель.ДатаРождения"] = repBirthDateFull || repBirthDateStr;
	map["Представитель.ГодРождения"] = repBirthYear;
	map["Представитель.Возраст"] = repAgeStr;
	map["Представитель.Пол"] = repGenderStr;
	map["Представитель.Телефоны"] =
		[rep.mobilePhone || rep.phone, rep.homePhone].filter(Boolean).join("; ") ||
		rep.phone ||
		"";
	map["Представитель.МобТелефон"] = rep.mobilePhone || rep.phone || "";
	map["Представитель.ДомТелефон"] = rep.homePhone || "";
	map["Представитель.Email"] = rep.email || "";
	map["Представитель.АдресРегистрации"] = rep.address || "";
	map["Представитель.ДатаРегистрации"] = formatDateDdMmYyyy(
		rep.registrationDate,
	);
	map["Представитель.ИНН"] = rep.inn || "";
	map["Представитель.ИИН"] = rep.iin || "";
	map["Представитель.МестоРождения"] = rep.birthPlace || "";
	map["Представитель.Документ"] = repPassportFull;
	map["Представитель.Документ.ТипДокумента"] = repPassport.number
		? "Паспорт РФ"
		: "";
	map["Представитель.Документ.СерияНомер"] = [
		repPassport.series,
		repPassport.number,
	]
		.filter(Boolean)
		.join(" ");
	map["Представитель.Документ.СерияНомер.Серия"] = repPassport.series || "";
	map["Представитель.Документ.СерияНомер.Номер"] = repPassport.number || "";
	map["Представитель.Документ.Выдан"] = repPassport.number
		? `Выдан: ${formatDateDdMmYyyy(repPassport.issuedDate)}, ${repPassport.issuedBy || ""}, Код подразделения: ${repPassport.divisionCode || ""}`.trim()
		: "";
	map["Представитель.Документ.Выдан.ДатаВыдачи"] = formatDateDdMmYyyy(
		repPassport.issuedDate,
	);
	map["Представитель.Документ.Выдан.КодПодразделения"] =
		repPassport.divisionCode || "";
	map["Представитель.Документ.Выдан.КемВыдан"] = repPassport.issuedBy || "";

	// Полномочный представитель (по доверенности)
	const auth = ctx.authorizedPerson ?? {};
	const authFullName = auth.fullName || "";
	const authPassport = auth.passport ?? {};
	map["Полномочный.ФИО"] = authFullName;
	map["Полномочный.ФамилияИнициалы"] =
		auth.initials || formatInitials(authFullName);
	map["Полномочный.Телефон"] = auth.phone || "";
	map["Полномочный.Паспорт.Номер"] = authPassport.number || "";
	map["Полномочный.Паспорт.Серия"] = authPassport.series || "";
	map["Полномочный.Паспорт.ДатаВыдачи"] = formatDateDdMmYyyy(
		authPassport.issuedDate,
	);
	map["Полномочный.Паспорт.КемВыдан"] = authPassport.issuedBy || "";
	map["Полномочный.Паспорт.КодПодразделения"] = authPassport.divisionCode || "";
	map["Полномочный.ДеньРождения"] = formatDateDdMmYyyy(auth.birthDate);
	map["Полномочный.Адрес"] = auth.address || "";
	map["Полномочный.СНИЛС"] = auth.snils || "";

	// Врач последнего приема
	const ld = ctx.lastDoctor ?? {};
	const ldFullName = ld.fullName || "";
	map["ПоследнийПриём.Врач.ФИО"] = ldFullName;
	map["ПоследнийПриём.Врач.ФамилияИнициалы"] =
		ld.initials || formatInitials(ldFullName);
	map["ПоследнийПриём.Врач.Должность"] = ld.position || "";
	map["ПоследнийПриём.Врач.Специальность"] = ld.specialty || "";

	// Администратор
	const adm = ctx.administrator ?? {};
	const admFullName = adm.fullName || "";
	map["Администратор.ФИО"] = admFullName;
	map["Администратор.ФамилияИнициалы"] =
		adm.initials || formatInitials(admFullName);
	map["Администратор.Должность"] = adm.position || "Администратор";
	map["Администратор.Специальность"] = adm.specialty || "Администратор";

	// Активный врач
	const doc = ctx.doctor ?? {};
	const docFullName = doc.fullName || "";
	map["АктивныйВрач.ФИО"] = docFullName;
	map["АктивныйВрач.ФамилияИнициалы"] =
		doc.initials || formatInitials(docFullName);
	map["АктивныйВрач.Должность"] = doc.position || "Врач-стоматолог";
	map["АктивныйВрач.Специальность"] = doc.specialty || "Стоматология";

	map["Врач.ФИО"] = docFullName;
	map["Врач.ФамилияИнициалы"] = map["АктивныйВрач.ФамилияИнициалы"];
	map["Врач.Должность"] = map["АктивныйВрач.Должность"];
	map["Врач.Специальность"] = map["АктивныйВрач.Специальность"];
	map["Врач"] = docFullName;

	// Текущий пользователь (сотрудник, печатающий документ)
	const cu = ctx.currentUser ?? ctx.administrator ?? ctx.doctor ?? {};
	const cuFullName = cu.fullName || admFullName || docFullName || "";
	const cuParts = cuFullName
		? cuFullName.trim().split(/\s+/).filter(Boolean)
		: [];
	const cuLastName = cuParts[0] ?? "";
	const cuFirstName = cuParts[1] ?? "";
	const cuMiddleName = cuParts[2] ?? "";
	const cuLastNameUpper = cuLastName.toUpperCase();
	const cuLastNameUpperFullName = cuLastNameUpper
		? [cuLastNameUpper, cuFirstName, cuMiddleName].filter(Boolean).join(" ")
		: cuFullName;
	const cuInitials = cu.initials || formatInitials(cuFullName);

	map["ТекущийПользователь.Должность"] = cu.position || "Администратор";
	map["ТекущийПользователь.ФАМИЛИЯИмяОтчество"] = cuLastNameUpperFullName;
	map["ТекущийПользователь.ФамилияИмяОтчество"] = cuFullName;
	map["ТекущийПользователь.ФамилияИО"] = cuInitials;
	map["ТекущийПользователь.Фамилия"] = cuLastName;
	map["ТекущийПользователь.Имя"] = cuFirstName;
	map["ТекущийПользователь.Отчество"] = cuMiddleName;

	// Клиника
	const cl = ctx.clinic ?? {};
	const clinicName = cl.name || "";
	const clinicPhone = cl.phone || "";
	const clinicAddress = cl.address || "";
	map["Клиника.Название"] = clinicName;
	map["Клиника.ИНН"] = cl.inn || "";
	map["Клиника.КПП"] = cl.kpp || "";
	map["Клиника.ОГРН"] = cl.ogrn || "";
	map["Клиника.Адрес"] = clinicAddress;
	map["Клиника.Телефон"] = clinicPhone;
	map["Клиника.Лицензия.Номер"] = cl.licenseNumber || "";
	map["Клиника.ЛицензияНомер"] = cl.licenseNumber || "";
	map["Клиника.Лицензия.ДатаВыдачи"] = formatDateDdMmYyyy(cl.licenseIssuedDate);
	map["Клиника.ЛицензияДата"] = formatDateDdMmYyyy(cl.licenseIssuedDate);
	map["Клиника.Лицензия.СрокДействия"] = cl.licenseValidity || "Бессрочно";
	map["Клиника.Лицензия.КемВыдана"] = cl.licenseIssuer || "";
	map["Клиника.ЛицензияОрган"] = cl.licenseIssuer || "";
	map["Клиника.Лицензия"] = cl.licenseNumber
		? `№ ${cl.licenseNumber} от ${formatDateDdMmYyyy(cl.licenseIssuedDate)}${cl.licenseIssuer ? `, выдана: ${cl.licenseIssuer}` : ""}`.trim()
		: "";

	const clinicReqParts = [
		cl.inn ? `ИНН ${cl.inn}` : "",
		cl.kpp ? `КПП ${cl.kpp}` : "",
		cl.ogrn ? `ОГРН ${cl.ogrn}` : "",
		cl.bankName ? `Банк: ${cl.bankName}` : "",
		cl.bik ? `БИК ${cl.bik}` : "",
		cl.checkingAccount ? `Р/с ${cl.checkingAccount}` : "",
		cl.corrAccount ? `К/с ${cl.corrAccount}` : "",
	].filter(Boolean);
	map["Клиника.Реквизиты"] = clinicReqParts.join(", ") || "";

	map["КомпанияНазвание"] = clinicName;
	map["КомпанияТелефон"] = clinicPhone;
	map["КомпанияАдрес"] = clinicAddress;
	map["Логотип"] = cl.logoUrl
		? `<img src="${cl.logoUrl}" alt="Логотип" class="clinic-logo" />`
		: "";

	// Прием
	const app = ctx.appointment ?? {};
	map["Прием.Ид"] =
		app.id !== undefined && app.id !== null ? String(app.id) : "";
	map["Прием.Дата"] = formatDateDdMmYyyy(app.date);
	map["Прием.ПолнаяДата"] = app.fullDate || formatDateFullRussian(app.date);
	map["Прием.Время"] = app.time || "";

	// Склад
	const wh = ctx.warehouse ?? {};
	map["Склад.Название"] = wh.name || "";
	map["Склад.Материалы.Название"] = wh.materialName || "";
	map["Склад.Материалы.МинимальныйПорог"] =
		wh.minThreshold !== undefined && wh.minThreshold !== null
			? String(wh.minThreshold)
			: "";
	map["Склад.Материалы.Остаток"] =
		wh.balance !== undefined && wh.balance !== null ? String(wh.balance) : "";

	// Документ
	const docMeta = ctx.document ?? {};
	map["Документ.ID"] =
		docMeta.id !== undefined && docMeta.id !== null ? String(docMeta.id) : "";
	map["Документ.Номер"] = docMeta.number || "";
	map["Документ.ДатаНачала"] = formatDateDdMmYyyy(docMeta.startDate);
	map["Документ.ДатаОкончания"] = formatDateDdMmYyyy(docMeta.endDate);
	map["Документ.ДатаСоздания"] = formatDateDdMmYyyy(
		docMeta.createdAt || curDate,
	);

	// ─── ФИНАНСОВЫЕ ТОКЕНЫ И ДЕНЬГИ ПРОПИСЬЮ ───
	const fin = ctx.financial ?? {};
	let finKopecks = 0;
	if (fin.amountKopecks !== undefined && fin.amountKopecks !== null) {
		finKopecks = Math.round(Number(fin.amountKopecks));
	} else if (fin.amountRubles !== undefined && fin.amountRubles !== null) {
		finKopecks = rublesToKopecks(fin.amountRubles);
	} else if (
		p.advance !== undefined &&
		p.advance !== null &&
		String(p.advance).trim() !== ""
	) {
		finKopecks = parseKopecks(p.advance);
	}

	const amountWords = kopecksToWordsRu(finKopecks);
	const amountNumeric = kopecksToNumericString(finKopecks);
	const rublesOnly = Math.floor(Math.abs(finKopecks) / 100);
	const rublesWords = integerToWordsRu(rublesOnly);

	const absolute = Math.abs(finKopecks);
	const whole = Math.trunc(absolute / 100);
	const fraction = absolute % 100;
	const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	const formattedRubles = `${finKopecks < 0 ? "-" : ""}${grouped},${String(fraction).padStart(2, "0")} руб.`;
	const formattedFullSumma = `${formatKopecksRu(finKopecks)} (${amountWords})`;

	map["Сумма"] = formattedRubles;
	map["СуммаЧислом"] = amountNumeric;
	map["СуммаПрописью"] = amountWords;
	map["СуммаПрописьюРублей"] = rublesWords;
	map["СуммаПолная"] = formattedFullSumma;

	map["Счет.Сумма"] = formattedRubles;
	map["Счет.СуммаЧислом"] = amountNumeric;
	map["Счет.СуммаПрописью"] = amountWords;
	map["Счет.Номер"] = fin.invoiceNumber || "";
	map["Счет.Дата"] = formatDateDdMmYyyy(fin.invoiceDate || curDate);

	map["Договор.Сумма"] = formatKopecksRu(finKopecks);
	map["Договор.СуммаЧислом"] = amountNumeric;
	map["Договор.СуммаПрописью"] = amountWords;
	map["Договор.Номер"] = fin.contractNumber || docMeta.number || "";
	map["Договор.Дата"] = formatDateDdMmYyyy(
		fin.contractDate || docMeta.startDate || curDate,
	);

	map["Акт.Сумма"] = formatKopecksRu(finKopecks);
	map["Акт.СуммаЧислом"] = amountNumeric;
	map["Акт.СуммаПрописью"] = amountWords;
	map["Акт.Номер"] = fin.actNumber || docMeta.number || "";
	map["Акт.Дата"] = formatDateDdMmYyyy(fin.actDate || curDate);

	// ─── ЗУБОТЕХНИЧЕСКАЯ ЛАБОРАТОРИЯ (ЗТЛ) ───
	const lab = ctx.dentalLab ?? {};
	map["Лаборатория.Название"] =
		lab.name || "Зуботехническая лаборатория ЗТЛ-Партнер";
	map["ЗубнойТехник.ФИО"] =
		lab.technicianFullName || "___________________________";
	map["ЗаказНаряд.Цвет"] = lab.colorVita || "A2 / Bleach";
	map["ЗаказНаряд.StlСсылка"] =
		lab.stlUrl || "STL-скан челюстей передан в CAD-систему лаборатории";
	map["ЗаказНаряд.ДатаПримерки"] =
		formatDateDdMmYyyy(lab.fittingDate) || "По согласованию";
	map["ЗаказНаряд.Комментарий"] =
		lab.comments || "Окклюзионные контакты и анатомический микрорельеф";
	map["ЗаказНаряд.Таблица"] = ctx.dentalWorkOrderTableHtml || "";

	// ─── СПРАВКА ФНС И НАЛОГОПЛАТЕЛЬЩИК ───
	const tp = ctx.taxpayer ?? {};
	map["Налогоплательщик.ФИО"] = tp.fullName || pFullName;
	map["Налогоплательщик.ИНН"] = tp.inn || p.inn || "";
	map["Налогоплательщик.СНИЛС"] = tp.snils || p.snils || "";
	map["СправкаФНС.Номер"] = docMeta.number || fin.actNumber || "__________";
	map["СправкаФНС.КодУслуги"] = ctx.fnsServiceCode || "1";
	map["КодУслуги"] = ctx.fnsServiceCode || "1";

	// ─── КЛИНИЧЕСКИЙ ОСМОТР, ДНЕВНИК И ИСТОРИЯ БОЛЕЗНИ ───
	const ce = ctx.clinicalExamination ?? {};
	const examDate = ce.examinationDate || curDate;
	map["ДатаОсмотра"] = formatDateDdMmYyyy(examDate);
	map["ДатаЛечения"] = formatDateDdMmYyyy(examDate);
	map["ДатаИВремяЛечения"] = ce.treatmentDateTime
		? `${formatDateDdMmYyyy(ce.treatmentDateTime)} ${formatDateDdMmYyyy(ce.treatmentDateTime) ? new Date(ce.treatmentDateTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : ""}`.trim()
		: curDateDdMmYyyy;
	map["ФамилияИОВрача"] =
		ce.doctorInitials ||
		formatInitials(ce.doctorFullName) ||
		map["АктивныйВрач.ФамилияИнициалы"] ||
		"";
	map["Диагноз"] = ce.diagnosis || "";
	map["Жалобы"] = ce.complaints || "";
	map["Анамнез"] = ce.anamnesis || "";
	map["ПеренесенныеЗаболевания"] = ce.pastDiseases || "";
	map["РазвитиеЗаболевания"] = ce.diseaseHistory || "";
	map["ВнешнийОсмотр"] = ce.externalExam || "";
	map["Прикус"] = ce.bite || "Ортогнатический";
	map["СостояниеСлизистой"] =
		ce.mucousCondition ||
		"Слизистая оболочка полости рта бледно-розовая, умеренно увлажнена, десневые сосочки без признаков воспаления";
	map["Рентген"] = ce.xray || "";
	map["Объективно"] = ce.objective || "";
	map["Лечение"] = ce.treatment || "";
	map["Рекомендации"] = ce.recommendations || "";

	// ─── ЗУБНАЯ ФОРМУЛА И ОДОНТОГРАММА ───
	const formulaBreakdown = generateDentalFormulaBreakdownText(
		ctx.dentalFormula,
	);
	map["ЗубнаяФормула.Расшифровка"] = formulaBreakdown;
	map["ЗубнаяФормула.Текст"] = formulaBreakdown;
	map["ЗубнаяФормула.Прописью"] = formulaBreakdown;

	const formulaHtml = renderGraphicalDentalFormulaHtml({
		dentalFormula: ctx.dentalFormula as DentalFormulaRecordInput,
	});
	map["ПервичныйОсмотр.ЗубнаяФормула"] = formulaHtml;
	map["ЗубнаяФормула"] = formulaHtml;

	// Токены отдельных зубов: {18}, {18т}, ...
	const teethTokens = resolveAllTeethTokens(ctx.dentalFormula);
	for (const [tKey, tVal] of Object.entries(teethTokens)) {
		map[tKey] = tVal;
	}

	// ─── ПЛАН ЛЕЧЕНИЯ И АКТ (ТАБЛИЦЫ) ───
	map["ПланЛечения.Таблица"] =
		ctx.treatmentPlanTableHtml ||
		'<table class="treatment-plan-table"><thead><tr><th>№</th><th>Код</th><th>Наименование услуги</th><th>Зуб</th><th>Кол-во</th><th>Сумма, руб.</th></tr></thead><tbody><tr><td colspan="6" style="text-align: center; color: #666;">Комплексный план лечения согласован с пациентом</td></tr></tbody></table>';
	map["ПланЛечения.ТаблицаПоЗубам"] = ctx.treatmentPlanToothTableHtml || "";
	map["ПланЛечения.СрокДействия"] = docMeta.endDate
		? formatDateDdMmYyyy(docMeta.endDate)
		: "30 календарных дней";
	map["Акт.ТаблицаУслуг"] = ctx.actServicesTableHtml || "";
	map["ТаблицаУслуг"] = ctx.actServicesTableHtml || "";

	return map;
}

export interface RenderTemplateOptions {
	/**
	 * Чем заменять токены, у которых нет значения в контексте.
	 * По умолчанию: "" (пустая строка). Можно передать "_______" для печатных бланков с подчеркиванием.
	 */
	emptyPlaceholder?: string;
	/**
	 * Сохранять ли неизвестные токены в исходном виде (true) или очищать (false).
	 * По умолчанию: false (очищать).
	 */
	preserveUnknownTokens?: boolean;
}

/**
 * Рендерит HTML-шаблон документа, подставляя реальные данные из контекста.
 * Поддерживает:
 * 1. Синтаксис {{ Токен }}, { Токен }, [ Токен ]
 * 2. Префикс восклицательного знака {!Токен} / {{!Токен}}: при пустом значении
 *    строка / элемент / абзац с токеном полностью скрывается.
 */
export function renderDocumentTemplate(
	templateHtml: string,
	ctx: TemplateExecutionContext,
	options: RenderTemplateOptions = {},
): string {
	if (!templateHtml) return "";

	const emptyPlaceholder = options.emptyPlaceholder ?? "";
	const preserveUnknown = options.preserveUnknownTokens ?? false;
	const varsMap = buildTemplateVariablesMap(ctx);

	let result = templateHtml;

	// ── 1. ОБРАБОТКА ТОКЕНОВ С ВОСКЛИЦАТЕЛЬНЫМ ЗНАКОМ: {!Токен}, {{!Токен}}, [!Токен] ──
	// Если значение пустое — скрывается вся строка или охватывающий тег (<p>, <tr>, <li>, <div>, <br>)
	const exclamationTokenRegex =
		/(?:\{\{|\{|\[)!\s*([А-Яа-яA-Za-z0-9_.-]+)\s*(?:\}\}|\}|\])/g;
	const exclamationTokens = new Set<string>();
	let exMatch: RegExpExecArray | null;
	while ((exMatch = exclamationTokenRegex.exec(result)) !== null) {
		if (exMatch[1]) {
			exclamationTokens.add(exMatch[1].trim());
		}
	}

	for (const tokenName of exclamationTokens) {
		const val = varsMap[tokenName];
		const isFilled = val !== undefined && val !== null && val.trim() !== "";
		const trimmedVal = isFilled ? val.trim() : "";

		const tokenPatterns = [
			`\\{!\\s*${escapeRegExp(tokenName)}\\s*\\}`,
			`\\{\\{!\\s*${escapeRegExp(tokenName)}\\s*\\}\\}`,
			`\\[!\\s*${escapeRegExp(tokenName)}\\s*\\]`,
		];

		for (const patternStr of tokenPatterns) {
			if (isFilled) {
				// Заменяем токен на значение
				result = result.replace(new RegExp(patternStr, "g"), trimmedVal);
			} else {
				// Удаляем родительский блок при пустом значении

				// а) Строка таблицы: <tr...>...{!Token}...</tr>
				const trRegex = new RegExp(
					`<tr[^>]*>(?:(?!<\\/tr>)[\\s\\S])*?${patternStr}(?:(?!<\\/tr>)[\\s\\S])*?<\\/tr>\\s*`,
					"gi",
				);
				result = result.replace(trRegex, "");

				// б) Параграф: <p...>...{!Token}...</p>
				const pRegex = new RegExp(
					`<p[^>]*>(?:(?!<\\/p>)[\\s\\S])*?${patternStr}(?:(?!<\\/p>)[\\s\\S])*?<\\/p>\\s*`,
					"gi",
				);
				result = result.replace(pRegex, "");

				// в) Элемент списка: <li...>...{!Token}...</li>
				const liRegex = new RegExp(
					`<li[^>]*>(?:(?!<\\/li>)[\\s\\S])*?${patternStr}(?:(?!<\\/li>)[\\s\\S])*?<\\/li>\\s*`,
					"gi",
				);
				result = result.replace(liRegex, "");

				// г) Блок div: <div...>...{!Token}...</div>
				const divRegex = new RegExp(
					`<div[^>]*>(?:(?!<\\/div>)[\\s\\S])*?${patternStr}(?:(?!<\\/div>)[\\s\\S])*?<\\/div>\\s*`,
					"gi",
				);
				result = result.replace(divRegex, "");

				// д) Строка с тегом <br>: ... {!Token} ... <br />
				const brRegex = new RegExp(
					`(?:^|>)[^<\\n]*?${patternStr}[^<\\n]*?<br\\s*\\/?>\\s*`,
					"gim",
				);
				result = result.replace(brRegex, (m) => (m.startsWith(">") ? ">" : ""));

				// е) Текстовая строка: вся строка целиком
				const lineRegex = new RegExp(
					`^[^\r\n]*?${patternStr}[^\r\n]*(?:\r?\n|$)`,
					"gm",
				);
				result = result.replace(lineRegex, "");

				// ж) Оставшийся токен (если остался в тексте)
				result = result.replace(new RegExp(patternStr, "g"), "");
			}
		}
	}

	// ── 2. ЗАМЕНА СИНТАКСИСА MUSTACHE: {{ Токен }} ──
	result = result.replace(
		/\{\{\s*([^{}]+?)\s*\}\}/g,
		(match, tokenName: string) => {
			const cleanToken = tokenName.trim();
			if (Object.hasOwn(varsMap, cleanToken)) {
				const val = varsMap[cleanToken];
				return val && val.trim() !== "" ? val : emptyPlaceholder;
			}
			return preserveUnknown ? match : emptyPlaceholder;
		},
	);

	// ── 3. ЗАМЕНА СИНТАКСИСА КВАДРАТНЫХ СКОБОК: [Токен] ──
	result = result.replace(
		/\[([А-Яа-яA-Za-z0-9_.-]+)\]/g,
		(match, tokenName: string) => {
			const cleanToken = tokenName.trim();
			if (Object.hasOwn(varsMap, cleanToken)) {
				const val = varsMap[cleanToken];
				return val && val.trim() !== "" ? val : emptyPlaceholder;
			}
			return preserveUnknown ? match : emptyPlaceholder;
		},
	);

	// ── 4. ЗАМЕНА СИНТАКСИСА ОДИНОЧНЫХ СКОБОК ИДЕНТ: { Токен } ──
	// Проверяем наличие токена в varsMap для исключения CSS-правил
	result = result.replace(
		/\{([А-Яа-яA-Za-z0-9_.-]+)\}/g,
		(match, tokenName: string) => {
			const cleanToken = tokenName.trim();
			if (Object.hasOwn(varsMap, cleanToken)) {
				const val = varsMap[cleanToken];
				return val && val.trim() !== "" ? val : emptyPlaceholder;
			}
			return preserveUnknown ? match : match;
		},
	);

	return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// КЛИНИЧЕСКИЙ ШАБЛОНИЗАТОР СООБЩЕНИЙ И ОМНИКАНАЛЬНЫХ УВЕДОМЛЕНИЙ (SSOT)
// Мандаты 8s (Закон Единого Неделимого Авторитета), 8b (Точные деньги), 8e
// ═══════════════════════════════════════════════════════════════════════════

export interface InteractiveButton {
	id: string;
	title: string;
	payload?: string;
}

export type SupportedLocale = "ru" | (string & {});

export interface RenderedTemplate {
	templateKey: string;
	locale: SupportedLocale | string;
	subject: string;
	bodyText: string;
	bodyHtml?: string | undefined;
	buttons?: InteractiveButton[] | undefined;
}

export interface TemplateDefinition {
	templateKey: string;
	description: string;
	locales: Record<
		string,
		{
			subject: string;
			bodyText: string;
			bodyHtml?: string | undefined;
			buttons?: InteractiveButton[] | undefined;
		}
	>;
}

export function formatMoney(
	amountKopecksOrUnits: number | string,
	_currency = "RUB",
): string {
	try {
		const raw =
			typeof amountKopecksOrUnits === "string"
				? amountKopecksOrUnits.trim().replace(",", ".")
				: amountKopecksOrUnits;
		const kopecks = parseKopecks(raw);
		return formatKopecksRu(kopecks);
	} catch {
		return formatKopecksRu(0);
	}
}

export const BUILT_IN_TEMPLATES: Record<string, TemplateDefinition> = {
	appointment_confirmation: {
		templateKey: "appointment_confirmation",
		description: "Подтверждение записи на приём",
		locales: {
			ru: {
				subject: "Запись на приём в {{clinic_name}} подтверждена",
				bodyText:
					"Здравствуйте, {{patient_name}}! Ваша запись в клинику {{clinic_name}} подтверждена на {{appointment_date}} в {{appointment_time}} (врач: {{doctor_name}}). Адрес: {{clinic_address}}. Телефон: {{clinic_phone}}.",
				buttons: [
					{ id: "APPT_CONFIRM", title: "Подтверждаю" },
					{ id: "APPT_RESCHEDULE", title: "Перенести" },
				],
			},
		},
	},

	appointment_reminder: {
		templateKey: "appointment_reminder",
		description: "Напоминание о предстоящем приёме (за 24ч / 2ч)",
		locales: {
			ru: {
				subject: "Напоминание о приёме: {{clinic_name}}",
				bodyText:
					"Здравствуйте, {{patient_name}}! Напоминаем о вашем визите в клинику {{clinic_name}} завтра, {{appointment_date}} в {{appointment_time}} (врач: {{doctor_name}}). Ждём вас по адресу: {{clinic_address}}.",
				buttons: [
					{ id: "APPT_CONFIRM", title: "Буду на приёме" },
					{ id: "APPT_CANCEL", title: "Не смогу прийти" },
				],
			},
		},
	},

	appointment_cancelled: {
		templateKey: "appointment_cancelled",
		description: "Уведомление об отмене приёма",
		locales: {
			ru: {
				subject: "Отмена записи на приём: {{clinic_name}}",
				bodyText:
					"Здравствуйте, {{patient_name}}. Ваша запись на {{appointment_date}} в {{appointment_time}} в клинику {{clinic_name}} была отменена (причина: {{cancellation_reason}}). Для выбора нового времени позвоните нам: {{clinic_phone}}.",
				buttons: [{ id: "BOOK_NEW", title: "Записаться снова" }],
			},
		},
	},

	post_op_instructions: {
		templateKey: "post_op_instructions",
		description: "Памятка пациенту после лечения / операции",
		locales: {
			ru: {
				subject: "Рекомендации после приёма: {{clinic_name}}",
				bodyText:
					"Здравствуйте, {{patient_name}}! После процедуры ({{treatment_name}}) рекомендуем: 1. Не принимать пищу 2 часа. 2. Избегать горячего и физических нагрузок 24ч. 3. При возникновении острой боли или отёка срочно свяжитесь с нами: {{clinic_phone}}.",
				buttons: [
					{ id: "FEELING_OK", title: "Всё хорошо" },
					{ id: "DOCTOR_CALL", title: "Нужна помощь" },
				],
			},
		},
	},

	invoice_payment_link: {
		templateKey: "invoice_payment_link",
		description: "Счёт на оплату и ссылка на онлайн-эквайринг",
		locales: {
			ru: {
				subject: "Счёт на оплату №{{invoice_number}}: {{clinic_name}}",
				bodyText:
					"Здравствуйте, {{patient_name}}! Выставлен счёт №{{invoice_number}} на сумму {{total_amount}}. Ссылка для быстрой и безопасной оплаты картой или СБП: {{payment_url}}.",
				buttons: [{ id: "PAY_INVOICE", title: "Оплатить онлайн" }],
			},
		},
	},

	recall_reminder: {
		templateKey: "recall_reminder",
		description: "Напоминание о регулярном профилактическом осмотре (Recall)",
		locales: {
			ru: {
				subject: "Приглашение на плановый осмотр: {{clinic_name}}",
				bodyText:
					"Здравствуйте, {{patient_name}}! Подошло время вашего регулярного профилактического осмотра ({{reason}}, запланирован на {{due_month}}). Сохраните здоровье зубов — запишитесь на удобное время: {{booking_url}} или по телефону {{clinic_phone}}.",
				buttons: [
					{ id: "BOOK_RECALL", title: "Записаться на осмотр" },
					{ id: "RECALL_SNOOZE", title: "Напомнить позже" },
				],
			},
		},
	},

	welcome: {
		templateKey: "welcome",
		description: "Приветственное сообщение новому пациенту",
		locales: {
			ru: {
				subject: "Добро пожаловать в клинику {{clinic_name}}!",
				bodyText:
					"Здравствуйте, {{patient_name}}! Рады приветствовать вас в клинике {{clinic_name}}. Мы всегда на связи: {{clinic_phone}}, адрес: {{clinic_address}}. В этом чате вы можете подтверждать приёмы и задавать вопросы.",
			},
		},
	},
};

export interface InterpolateVariablesOptions {
	/**
	 * Сохранять ли неразрешенные токены в виде {{token}} (true) или заменять на emptyPlaceholder (false).
	 * По умолчанию: true (для отладки и видимости пропущенных полей).
	 */
	preserveUnresolved?: boolean;
	emptyPlaceholder?: string;
}

/**
 * Каноническая функция интерполяции переменных формата {{variable_name}}
 * из контекста. Автоматически форматирует числовые переменные денег через formatMoney.
 */
export function interpolateVariables(
	templateString: string,
	context: Record<string, unknown> = {},
	options: InterpolateVariablesOptions = {},
): string {
	if (!templateString) return "";
	const preserveUnresolved = options.preserveUnresolved ?? true;
	const emptyPlaceholder = options.emptyPlaceholder ?? "";

	return templateString.replace(
		/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g,
		(match, varName) => {
			const val = context[varName];
			if (val === undefined || val === null) {
				return preserveUnresolved ? match : emptyPlaceholder;
			}
			if (
				typeof val === "number" &&
				(varName.includes("amount") ||
					varName.includes("price") ||
					varName.includes("total") ||
					varName.includes("balance"))
			) {
				return formatMoney(val);
			}
			return String(val);
		},
	);
}

/**
 * Канонический алиас для интерполяции шаблонов сообщений (Мандаты 8s, 8j)
 */
export function interpolateMessageTemplate(
	templateString: string,
	context: Record<string, unknown> = {},
	options: InterpolateVariablesOptions = {},
): string {
	return interpolateVariables(templateString, context, options);
}

export class TemplateEngine {
	private readonly customTemplates: Map<string, TemplateDefinition> = new Map();

	/**
	 * Register a custom template into the engine.
	 */
	public registerTemplate(template: TemplateDefinition): void {
		this.customTemplates.set(template.templateKey, template);
	}

	/**
	 * Renders a template by key, locale, and context variables.
	 */
	public render(
		templateKey: string,
		locale: SupportedLocale | string = "ru",
		context: Record<string, unknown> = {},
	): RenderedTemplate {
		const def =
			this.customTemplates.get(templateKey) || BUILT_IN_TEMPLATES[templateKey];

		if (!def) {
			// Fallback generic template
			const bodyText = context.bodyText
				? String(context.bodyText)
				: `Уведомление: ${templateKey}`;
			return {
				templateKey,
				locale,
				subject: (context.subject as string) || "Уведомление клиники",
				bodyText: interpolateVariables(bodyText, context),
				buttons: (context.buttons as InteractiveButton[]) || [],
			};
		}

		// Resolve locale with fallback to 'ru' then first available
		const localeData =
			def.locales[locale] || def.locales.ru || Object.values(def.locales)[0];

		if (!localeData) {
			throw new Error(
				`No locale definition available for template '${templateKey}'`,
			);
		}

		const renderedSubject = interpolateVariables(localeData.subject, context);
		const renderedBody = interpolateVariables(localeData.bodyText, context);
		const renderedHtml = localeData.bodyHtml
			? interpolateVariables(localeData.bodyHtml, context)
			: undefined;

		const result: RenderedTemplate = {
			templateKey,
			locale,
			subject: renderedSubject,
			bodyText: renderedBody,
		};
		if (renderedHtml !== undefined) {
			result.bodyHtml = renderedHtml;
		}
		if (localeData.buttons) {
			result.buttons = [...localeData.buttons];
		}
		return result;
	}
}

export const templateEngine = new TemplateEngine();

/**
 * Рендерит шаблон сообщения по ключу, локали и контексту переменных через канонический templateEngine.
 */
export function renderMessageTemplate(
	templateKey: string,
	locale: SupportedLocale | string = "ru",
	context: Record<string, unknown> = {},
): RenderedTemplate {
	return templateEngine.render(templateKey, locale, context);
}
