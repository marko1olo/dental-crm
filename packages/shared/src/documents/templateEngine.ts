/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ШАБЛОНИЗАТОР И РЕЗОЛВЕР ПЕРЕМЕННЫХ МЕДИЦИНСКИХ БЛАНКОВ DENTE CRM
 * Стандарт StomX: 10 рубрик, 49 бланков Минздрава РФ, 74+ системных токена
 * ═══════════════════════════════════════════════════════════════════════════
 */

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
	clinic?: ClinicContextData | null | undefined;
	appointment?: AppointmentContextData | null | undefined;
	warehouse?: WarehouseContextData | null | undefined;
	document?: DocumentMetaContextData | null | undefined;
	currentDate?: string | Date | null | undefined;
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
	const parts = fullName.trim().split(/\s+/);
	if (parts.length === 1) return parts[0] ?? "";
	if (parts.length === 2) {
		return `${parts[0]} ${(parts[1] ?? "")[0]?.toUpperCase()}.`;
	}
	return `${parts[0]} ${(parts[1] ?? "")[0]?.toUpperCase()}. ${(parts[2] ?? "")[0]?.toUpperCase()}.`;
}

export function calculatePatientAgeString(birthDateVal: unknown): string {
	if (!birthDateVal) return "";
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
		return "";
	}

	if (Number.isNaN(bDate.getTime())) return "";
	const now = new Date();
	let age = now.getFullYear() - bDate.getFullYear();
	const mDiff = now.getMonth() - bDate.getMonth();
	if (mDiff < 0 || (mDiff === 0 && now.getDate() < bDate.getDate())) {
		age--;
	}
	if (age < 0) age = 0;

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

/**
 * Полный реестр 74+ стандартизированных токенов подстановки
 */
export interface DocumentTemplateVariableSpec {
	token: string;
	domain: string;
	name: string;
	description: string;
	exampleValue: string;
	resolverPath: string;
}

export const ALL_DOCUMENT_TEMPLATE_VARIABLES: readonly DocumentTemplateVariableSpec[] = [
	// Пациент
	{
		token: "Пациент.ФИО",
		domain: "patient",
		name: "ФИО пациента",
		description: "Фамилия Имя Отчество пациента полностью",
		exampleValue: "Иванов Петр Алексеевич",
		resolverPath: "patient.fullName",
	},
	{
		token: "Пациент.ID",
		domain: "patient",
		name: "ID пациента",
		description: "Уникальный идентификатор пациента в базе данных",
		exampleValue: "101",
		resolverPath: "patient.id",
	},
	{
		token: "Пациент.НомерКарты",
		domain: "patient",
		name: "Номер амбулаторной карты",
		description: "Номер медицинской карты стоматологического больного 043/у",
		exampleValue: "333",
		resolverPath: "patient.cardNumber",
	},
	{
		token: "Пациент.Фамилия",
		domain: "patient",
		name: "Фамилия пациента",
		description: "Фамилия пациента",
		exampleValue: "Иванов",
		resolverPath: "patient.lastName",
	},
	{
		token: "Пациент.Имя",
		domain: "patient",
		name: "Имя пациента",
		description: "Имя пациента",
		exampleValue: "Петр",
		resolverPath: "patient.firstName",
	},
	{
		token: "Пациент.Отчество",
		domain: "patient",
		name: "Отчество пациента",
		description: "Отчество пациента",
		exampleValue: "Алексеевич",
		resolverPath: "patient.middleName",
	},
	{
		token: "Пациент.Пол",
		domain: "patient",
		name: "Пол пациента",
		description: "Пол пациента (муж / жен)",
		exampleValue: "муж",
		resolverPath: "patient.gender",
	},
	{
		token: "Пациент.Адрес",
		domain: "patient",
		name: "Адрес регистрации пациента",
		description: "Адрес регистрации по паспорту",
		exampleValue: "ул. Ленина, д. 33, кв. 115",
		resolverPath: "patient.address",
	},
	{
		token: "Пациент.Телефон",
		domain: "patient",
		name: "Телефон пациента",
		description: "Основной контактный телефон пациента",
		exampleValue: "+7 911 090 5544",
		resolverPath: "patient.phone",
	},
	{
		token: "Пациент.ИНН",
		domain: "patient",
		name: "ИНН пациента",
		description: "Идентификационный номер налогоплательщика",
		exampleValue: "123456789012",
		resolverPath: "patient.inn",
	},
	{
		token: "Пациент.ФамилияИО",
		domain: "patient",
		name: "Фамилия и инициалы пациента",
		description: "Фамилия и сокращенные инициалы (Иванов П.А.)",
		exampleValue: "Иванов П.А.",
		resolverPath: "patient.initials",
	},
	{
		token: "Пациент.ДеньРождения",
		domain: "patient",
		name: "Дата рождения пациента",
		description: "Дата рождения пациента в формате ДД.ММ.ГГГГ",
		exampleValue: "20.12.1985",
		resolverPath: "patient.birthDate",
	},
	{
		token: "Пациент.Возраст",
		domain: "patient",
		name: "Возраст пациента",
		description: "Полных лет с русским склонением",
		exampleValue: "30 лет",
		resolverPath: "patient.age",
	},
	{
		token: "Пациент.ФактическийАдрес",
		domain: "patient",
		name: "Фактический адрес пациента",
		description: "Адрес фактического проживания",
		exampleValue: "ул. Ленина, д. 33, кв. 115",
		resolverPath: "patient.actualAddress",
	},
	{
		token: "Пациент.Email",
		domain: "patient",
		name: "Электронная почта пациента",
		description: "Email адрес пациента",
		exampleValue: "email@email.ru",
		resolverPath: "patient.email",
	},
	{
		token: "Пациент.СНИЛС",
		domain: "patient",
		name: "СНИЛС пациента",
		description: "Страховой номер индивидуального лицевого счета",
		exampleValue: "123-456-789-01",
		resolverPath: "patient.snils",
	},
	{
		token: "Пациент.Инвалидность",
		domain: "patient",
		name: "Инвалидность пациента",
		description: "Группа инвалидности или отметка об отсутствии",
		exampleValue: "нет",
		resolverPath: "patient.disability",
	},
	{
		token: "Пациент.Льготы",
		domain: "patient",
		name: "Льготы пациента",
		description: "Категория льгот пациента",
		exampleValue: "нет",
		resolverPath: "patient.benefits",
	},
	{
		token: "Пациент.Профессия",
		domain: "patient",
		name: "Профессия пациента",
		description: "Род деятельности или профессия",
		exampleValue: "водитель",
		resolverPath: "patient.profession",
	},
	{
		token: "Пациент.ОсобыеОтметки",
		domain: "patient",
		name: "Особые клинические отметки",
		description: "Аллергологический анамнез, соматические патологии",
		exampleValue: "Аллергия на пенициллин",
		resolverPath: "patient.specialNotes",
	},
	{
		token: "Пациент.Полисы",
		domain: "patient",
		name: "Все полисы пациента",
		description: "Сводные данные полисов ОМС и ДМС",
		exampleValue: "ОМС 123-456-789-01",
		resolverPath: "patient.policies",
	},
	{
		token: "Пациент.ПолисОМС",
		domain: "patient",
		name: "Полис ОМС",
		description: "Номер полиса обязательного медицинского страхования",
		exampleValue: "123-456-789-01",
		resolverPath: "patient.omsPolicy",
	},
	{
		token: "Пациент.ПолисДМС",
		domain: "patient",
		name: "Полис ДМС",
		description: "Номер полиса добровольного медицинского страхования",
		exampleValue: "123-456-789-01",
		resolverPath: "patient.dmsPolicy",
	},
	{
		token: "Пациент.Аванс",
		domain: "patient",
		name: "Аванс / Баланс пациента",
		description: "Текущий финансовый баланс пациента в рублях",
		exampleValue: "25 000",
		resolverPath: "patient.advance",
	},
	{
		token: "Пациент.Паспорт.Номер",
		domain: "patient",
		name: "Паспорт: номер",
		description: "Номер паспорта пациента",
		exampleValue: "123456",
		resolverPath: "patient.passport.number",
	},
	{
		token: "Пациент.Паспорт.СерияНомер",
		domain: "patient",
		name: "Паспорт: серия и номер",
		description: "Серия и номер паспорта пациента через пробел",
		exampleValue: "4510 123456",
		resolverPath: "patient.passport.seriesNumber",
	},
	{
		token: "Пациент.Паспорт.Серия",
		domain: "patient",
		name: "Серия паспорта пациента",
		description: "4 цифры серии паспорта",
		exampleValue: "4321",
		resolverPath: "patient.passport.series",
	},
	{
		token: "Пациент.Паспорт.ДатаВыдачи",
		domain: "patient",
		name: "Дата выдачи паспорта пациента",
		description: "Дата выдачи паспорта (ДД.ММ.ГГГГ)",
		exampleValue: "20.01.2001",
		resolverPath: "patient.passport.issuedDate",
	},
	{
		token: "Пациент.Паспорт.КемВыдан",
		domain: "patient",
		name: "Кем выдан паспорт пациента",
		description: "Орган, выдавший документ, удостоверяющий личность",
		exampleValue: "Отдел УФМС России по г. Москве №133",
		resolverPath: "patient.passport.issuedBy",
	},
	{
		token: "Пациент.Паспорт.КодПодразделения",
		domain: "patient",
		name: "Код подразделения паспорта пациента",
		description: "Код подразделения (XXX-XXX)",
		exampleValue: "123-456",
		resolverPath: "patient.passport.divisionCode",
	},

	// Представитель
	{
		token: "Представитель.ФИО",
		domain: "representative",
		name: "ФИО законного представителя",
		description: "ФИО родителя, опекуна или попечителя полностью",
		exampleValue: "Петров Алексей Иванович",
		resolverPath: "representative.fullName",
	},
	{
		token: "Представитель.ФамилияИнициалы",
		domain: "representative",
		name: "Фамилия и инициалы представителя",
		description: "Фамилия и инициалы представителя",
		exampleValue: "Петров А. И.",
		resolverPath: "representative.initials",
	},
	{
		token: "Представитель.Телефон",
		domain: "representative",
		name: "Телефон представителя",
		description: "Контактный телефон законного представителя",
		exampleValue: "+7 933 090 5544",
		resolverPath: "representative.phone",
	},
	{
		token: "Представитель.Паспорт.Номер",
		domain: "representative",
		name: "Номер паспорта представителя",
		description: "Номер паспорта законного представителя",
		exampleValue: "123456",
		resolverPath: "representative.passport.number",
	},
	{
		token: "Представитель.Паспорт.Серия",
		domain: "representative",
		name: "Серия паспорта представителя",
		description: "Серия паспорта законного представителя",
		exampleValue: "4321",
		resolverPath: "representative.passport.series",
	},
	{
		token: "Представитель.Паспорт.ДатаВыдачи",
		domain: "representative",
		name: "Дата выдачи паспорта представителя",
		description: "Дата выдачи паспорта представителя (ДД.ММ.ГГГГ)",
		exampleValue: "20.01.2001",
		resolverPath: "representative.passport.issuedDate",
	},
	{
		token: "Представитель.Паспорт.КемВыдан",
		domain: "representative",
		name: "Кем выдан паспорт представителя",
		description: "Орган, выдавший паспорт законному представителю",
		exampleValue: "Отдел УФМС России по г. Москве №133",
		resolverPath: "representative.passport.issuedBy",
	},
	{
		token: "Представитель.Паспорт.КодПодразделения",
		domain: "representative",
		name: "Код подразделения представителя",
		description: "Код подразделения органа выдачи паспорта",
		exampleValue: "123-456",
		resolverPath: "representative.passport.divisionCode",
	},
	{
		token: "Представитель.ДеньРождения",
		domain: "representative",
		name: "Дата рождения представителя",
		description: "Дата рождения представителя (ДД.ММ.ГГГГ)",
		exampleValue: "20.12.1985",
		resolverPath: "representative.birthDate",
	},
	{
		token: "Представитель.Адрес",
		domain: "representative",
		name: "Адрес представителя",
		description: "Адрес места жительства законного представителя",
		exampleValue: "ул. Ленина, д. 33, кв. 115",
		resolverPath: "representative.address",
	},
	{
		token: "Представитель.СНИЛС",
		domain: "representative",
		name: "СНИЛС представителя",
		description: "СНИЛС законного представителя",
		exampleValue: "123-456-789-01",
		resolverPath: "representative.snils",
	},
	{
		token: "Представитель.НаОсновании",
		domain: "representative",
		name: "Основание полномочий представителя",
		description: "Документ-основание (Паспорт, Свидетельство о рождении)",
		exampleValue: "Паспорт",
		resolverPath: "representative.basis",
	},
	{
		token: "Представитель.Тип",
		domain: "representative",
		name: "Тип родства законного представителя",
		description: "родитель, опекун, Муж, Жена, Отец, Мать, Дочь, Сын, Сестра, Брат",
		exampleValue: "Отец",
		resolverPath: "representative.relationType",
	},
	{
		token: "Представитель.Основание",
		domain: "representative",
		name: "Основание представителя (алиас)",
		description: "Документ-основание (Паспорт, Свидетельство о рождении)",
		exampleValue: "Паспорт",
		resolverPath: "representative.basis",
	},
	{
		token: "Представитель.Родство",
		domain: "representative",
		name: "Родство представителя (алиас)",
		description: "Отец, Мать, Опекун и т.д.",
		exampleValue: "Мать",
		resolverPath: "representative.relationType",
	},

	// Полномочный
	{
		token: "Полномочный.ФИО",
		domain: "authorizedPerson",
		name: "ФИО уполномоченного лица",
		description: "ФИО лица по доверенности",
		exampleValue: "Петров Алексей Иванович",
		resolverPath: "authorizedPerson.fullName",
	},
	{
		token: "Полномочный.ФамилияИнициалы",
		domain: "authorizedPerson",
		name: "Фамилия и инициалы уполномоченного",
		description: "Фамилия и инициалы поверенного",
		exampleValue: "Петров А.И.",
		resolverPath: "authorizedPerson.initials",
	},
	{
		token: "Полномочный.Телефон",
		domain: "authorizedPerson",
		name: "Телефон уполномоченного лица",
		description: "Телефон поверенного по доверенности",
		exampleValue: "+7 933 090 5544",
		resolverPath: "authorizedPerson.phone",
	},
	{
		token: "Полномочный.Паспорт.Номер",
		domain: "authorizedPerson",
		name: "Номер паспорта уполномоченного",
		description: "Номер паспорта доверенного лица",
		exampleValue: "123456",
		resolverPath: "authorizedPerson.passport.number",
	},
	{
		token: "Полномочный.Паспорт.Серия",
		domain: "authorizedPerson",
		name: "Серия паспорта уполномоченного",
		description: "Серия паспорта доверенного лица",
		exampleValue: "4321",
		resolverPath: "authorizedPerson.passport.series",
	},
	{
		token: "Полномочный.Паспорт.ДатаВыдачи",
		domain: "authorizedPerson",
		name: "Дата выдачи паспорта уполномоченного",
		description: "Дата выдачи паспорта (ДД.ММ.ГГГГ)",
		exampleValue: "20.01.2001",
		resolverPath: "authorizedPerson.passport.issuedDate",
	},
	{
		token: "Полномочный.Паспорт.КемВыдан",
		domain: "authorizedPerson",
		name: "Кем выдан паспорт уполномоченного",
		description: "Орган, выдавший паспорт доверенному лицу",
		exampleValue: "Отдел УФМС России по г. Москве №133",
		resolverPath: "authorizedPerson.passport.issuedBy",
	},
	{
		token: "Полномочный.Паспорт.КодПодразделения",
		domain: "authorizedPerson",
		name: "Код подразделения уполномоченного",
		description: "Код подразделения паспорта доверенного лица",
		exampleValue: "123-456",
		resolverPath: "authorizedPerson.passport.divisionCode",
	},
	{
		token: "Полномочный.ДеньРождения",
		domain: "authorizedPerson",
		name: "Дата рождения уполномоченного",
		description: "Дата рождения доверенного лица (ДД.ММ.ГГГГ)",
		exampleValue: "20.12.1985",
		resolverPath: "authorizedPerson.birthDate",
	},
	{
		token: "Полномочный.Адрес",
		domain: "authorizedPerson",
		name: "Адрес уполномоченного лица",
		description: "Адрес регистрации доверенного лица",
		exampleValue: "ул. Ленина, д. 33, кв. 115",
		resolverPath: "authorizedPerson.address",
	},
	{
		token: "Полномочный.СНИЛС",
		domain: "authorizedPerson",
		name: "СНИЛС уполномоченного лица",
		description: "СНИЛС доверенного лица",
		exampleValue: "123-456-789-01",
		resolverPath: "authorizedPerson.snils",
	},

	// Врачи и персонал
	{
		token: "ПоследнийПриём.Врач.ФИО",
		domain: "doctor",
		name: "ФИО врача последнего приема",
		description: "ФИО врача, проводившего предыдущий прием",
		exampleValue: "Васильев Иван Петрович",
		resolverPath: "lastDoctor.fullName",
	},
	{
		token: "ПоследнийПриём.Врач.ФамилияИнициалы",
		domain: "doctor",
		name: "Фамилия и инициалы врача последнего приема",
		description: "Фамилия и инициалы лечащего врача",
		exampleValue: "Васильев И. П.",
		resolverPath: "lastDoctor.initials",
	},
	{
		token: "ПоследнийПриём.Врач.Должность",
		domain: "doctor",
		name: "Должность врача последнего приема",
		description: "Штатная медицинская должность врача",
		exampleValue: "Врач-стоматолог терапевт",
		resolverPath: "lastDoctor.position",
	},
	{
		token: "ПоследнийПриём.Врач.Специальность",
		domain: "doctor",
		name: "Специальность врача последнего приема",
		description: "Врачебная специальность",
		exampleValue: "Стоматология терапевтическая",
		resolverPath: "lastDoctor.specialty",
	},
	{
		token: "Администратор.ФИО",
		domain: "administrator",
		name: "ФИО администратора",
		description: "ФИО администратора клиники, оформившего документ",
		exampleValue: "Васильев Иван Петрович",
		resolverPath: "administrator.fullName",
	},
	{
		token: "Администратор.ФамилияИнициалы",
		domain: "administrator",
		name: "Фамилия и инициалы администратора",
		description: "Фамилия и инициалы администратора",
		exampleValue: "Васильев И. П.",
		resolverPath: "administrator.initials",
	},
	{
		token: "Администратор.Должность",
		domain: "administrator",
		name: "Должность администратора",
		description: "Штатная должность сотрудника регистратуры",
		exampleValue: "Администратор",
		resolverPath: "administrator.position",
	},
	{
		token: "Администратор.Специальность",
		domain: "administrator",
		name: "Специальность администратора",
		description: "Специальность сотрудника",
		exampleValue: "Администратор клиники",
		resolverPath: "administrator.specialty",
	},
	{
		token: "АктивныйВрач.ФИО",
		domain: "doctor",
		name: "ФИО активного врача",
		description: "ФИО врача текущего приема / подписывающего врача",
		exampleValue: "Васильев Иван Петрович",
		resolverPath: "doctor.fullName",
	},
	{
		token: "АктивныйВрач.ФамилияИнициалы",
		domain: "doctor",
		name: "Фамилия и инициалы активного врача",
		description: "Фамилия и инициалы врача текущего приема",
		exampleValue: "Васильев И. П.",
		resolverPath: "doctor.initials",
	},
	{
		token: "АктивныйВрач.Должность",
		domain: "doctor",
		name: "Должность активного врача",
		description: "Должность врача текущего приема",
		exampleValue: "Врач-стоматолог терапевт",
		resolverPath: "doctor.position",
	},
	{
		token: "АктивныйВрач.Специальность",
		domain: "doctor",
		name: "Специальность активного врача",
		description: "Клиническая специальность врача",
		exampleValue: "Стоматология общей практики",
		resolverPath: "doctor.specialty",
	},

	// Даты
	{
		token: "ТекущаяДата",
		domain: "date",
		name: "Текущая дата",
		description: "Дата формирования документа в формате ДД.ММ.ГГГГ",
		exampleValue: "03.09.2026",
		resolverPath: "currentDate.short",
	},
	{
		token: "ТекущаяПолнаяДата",
		domain: "date",
		name: "Текущая полная дата прописью",
		description: "Дата прописью по-русски (3 сентября 2026 г.)",
		exampleValue: "03 сентября 2026",
		resolverPath: "currentDate.full",
	},

	// Клиника
	{
		token: "Клиника.Название",
		domain: "clinic",
		name: "Название клиники",
		description: "Фирменное или юридическое наименование медицинской организации",
		exampleValue: "СтомХ стоматология",
		resolverPath: "clinic.name",
	},
	{
		token: "Клиника.ИНН",
		domain: "clinic",
		name: "ИНН клиники",
		description: "Идентификационный номер налогоплательщика клиники",
		exampleValue: "123456789",
		resolverPath: "clinic.inn",
	},
	{
		token: "Клиника.КПП",
		domain: "clinic",
		name: "КПП клиники",
		description: "Код причины постановки на учет",
		exampleValue: "773601001",
		resolverPath: "clinic.kpp",
	},
	{
		token: "Клиника.Адрес",
		domain: "clinic",
		name: "Адрес клиники",
		description: "Юридический и фактический адрес места оказания медицинских услуг",
		exampleValue: "г.Москва ул. Стоматологов, д.15",
		resolverPath: "clinic.address",
	},
	{
		token: "Клиника.Телефон",
		domain: "clinic",
		name: "Телефон клиники",
		description: "Контактный телефон регистратуры клиники",
		exampleValue: "+7(900)123-45-67",
		resolverPath: "clinic.phone",
	},
	{
		token: "Клиника.Лицензия.Номер",
		domain: "clinic",
		name: "Номер медицинской лицензии",
		description: "Регистрационный номер лицензии на осуществление меддеятельности",
		exampleValue: "1234564654",
		resolverPath: "clinic.licenseNumber",
	},
	{
		token: "Клиника.Лицензия.ДатаВыдачи",
		domain: "clinic",
		name: "Дата выдачи лицензии",
		description: "Дата предоставления лицензии (ДД.ММ.ГГГГ)",
		exampleValue: "25.01.2020",
		resolverPath: "clinic.licenseIssuedDate",
	},
	{
		token: "Клиника.Лицензия.СрокДействия",
		domain: "clinic",
		name: "Срок действия лицензии",
		description: "Срок действия или 'Бессрочно'",
		exampleValue: "25.01.2020",
		resolverPath: "clinic.licenseValidity",
	},
	{
		token: "Клиника.Лицензия.КемВыдана",
		domain: "clinic",
		name: "Орган, выдавший лицензию",
		description: "Лицензирующий орган (Министерство / Департамент здравоохранения)",
		exampleValue: "Клуб Стоматологов",
		resolverPath: "clinic.licenseIssuer",
	},

	// Прием
	{
		token: "Прием.Ид",
		domain: "appointment",
		name: "ID приема",
		description: "Идентификатор визита / записи на прием",
		exampleValue: "1",
		resolverPath: "appointment.id",
	},
	{
		token: "Прием.Дата",
		domain: "appointment",
		name: "Дата приема",
		description: "Дата приема в формате ДД.ММ.ГГГГ",
		exampleValue: "05.05.2025",
		resolverPath: "appointment.date",
	},
	{
		token: "Прием.ПолнаяДата",
		domain: "appointment",
		name: "Полная дата приема",
		description: "Дата приема прописью (5 мая 2025 г.)",
		exampleValue: "5 марта 2025",
		resolverPath: "appointment.fullDate",
	},
	{
		token: "Прием.Время",
		domain: "appointment",
		name: "Время приема",
		description: "Время начала приема (ЧЧ:ММ)",
		exampleValue: "12:12",
		resolverPath: "appointment.time",
	},

	// Склад
	{
		token: "Склад.Название",
		domain: "warehouse",
		name: "Название склада",
		description: "Наименование склада хранения материалов",
		exampleValue: "Основной",
		resolverPath: "warehouse.name",
	},
	{
		token: "Склад.Материалы.Название",
		domain: "warehouse",
		name: "Наименование материала",
		description: "Название расходного медицинского материала",
		exampleValue: "Маска",
		resolverPath: "warehouse.materialName",
	},
	{
		token: "Склад.Материалы.МинимальныйПорог",
		domain: "warehouse",
		name: "Минимальный порог остатка",
		description: "Неснижаемый остаток на складе",
		exampleValue: "9",
		resolverPath: "warehouse.minThreshold",
	},
	{
		token: "Склад.Материалы.Остаток",
		domain: "warehouse",
		name: "Остаток материала",
		description: "Текущий фактический остаток материала на складе",
		exampleValue: "7",
		resolverPath: "warehouse.balance",
	},

	// Документ
	{
		token: "Документ.ID",
		domain: "document",
		name: "ID документа",
		description: "Идентификатор документа в архиве",
		exampleValue: "125",
		resolverPath: "document.id",
	},
	{
		token: "Документ.Номер",
		domain: "document",
		name: "Номер документа",
		description: "Регистрационный номер бланка или договора",
		exampleValue: "Б123/ПА",
		resolverPath: "document.number",
	},
	{
		token: "Документ.ДатаНачала",
		domain: "document",
		name: "Дата начала действия",
		description: "Дата начала действия договора или плана",
		exampleValue: "2025-01-01",
		resolverPath: "document.startDate",
	},
	{
		token: "Документ.ДатаОкончания",
		domain: "document",
		name: "Дата окончания действия",
		description: "Дата завершения действия договора или гарантии",
		exampleValue: "2025-01-01",
		resolverPath: "document.endDate",
	},
	{
		token: "Документ.ДатаСоздания",
		domain: "document",
		name: "Дата создания документа",
		description: "Дата формирования документа в системе",
		exampleValue: "2025-01-01",
		resolverPath: "document.createdAt",
	},
] as const;

/**
 * Строит карту значений всех 74+ токенов на основе контекста
 */
export function buildTemplateVariablesMap(
	ctx: TemplateExecutionContext,
): Record<string, string> {
	const map: Record<string, string> = {};

	// Текущая дата
	const curDate = ctx.currentDate ? new Date(ctx.currentDate) : new Date();
	map["ТекущаяДата"] = formatDateDdMmYyyy(curDate);
	map["ТекущаяПолнаяДата"] = formatDateFullRussian(curDate);

	// Пациент
	const p = ctx.patient ?? {};
	const pFullName = p.fullName ?? [p.lastName, p.firstName, p.middleName].filter(Boolean).join(" ");
	const pLastName = p.lastName ?? (pFullName ? pFullName.split(/\s+/)[0] ?? "" : "");
	const pFirstName = p.firstName ?? (pFullName ? pFullName.split(/\s+/)[1] ?? "" : "");
	const pMiddleName = p.middleName ?? (pFullName ? pFullName.split(/\s+/)[2] ?? "" : "");
	const pGenderStr = p.gender === "male" || p.gender === "муж" ? "муж" : p.gender === "female" || p.gender === "жен" ? "жен" : (p.gender ?? "");
	const pBirthDateStr = formatDateDdMmYyyy(p.birthDate);
	const pAgeStr = p.age !== undefined && p.age !== null ? String(p.age) : calculatePatientAgeString(p.birthDate);
	const pPassport = p.passport ?? {};

	map["Пациент.ФИО"] = pFullName || "";
	map["Пациент.ID"] = p.id !== undefined && p.id !== null ? String(p.id) : "";
	map["Пациент.НомерКарты"] = p.cardNumber !== undefined && p.cardNumber !== null ? String(p.cardNumber) : "";
	map["Пациент.НомерМедкарты"] = p.cardNumber !== undefined && p.cardNumber !== null ? String(p.cardNumber) : "";
	map["Пациент.Фамилия"] = pLastName || "";
	map["Пациент.Имя"] = pFirstName || "";
	map["Пациент.Отчество"] = pMiddleName || "";
	map["Пациент.Пол"] = pGenderStr || "";
	map["Пациент.Адрес"] = p.address || "";
	map["Пациент.Телефон"] = p.phone || "";
	map["Пациент.ИНН"] = p.inn || "";
	map["Пациент.ФамилияИО"] = formatInitials(pFullName);
	map["Пациент.ФИО.Инициалы"] = formatInitials(pFullName);
	map["Пациент.ДеньРождения"] = pBirthDateStr || "";
	map["Пациент.Возраст"] = pAgeStr || "";
	map["Пациент.ФактическийАдрес"] = p.actualAddress || p.address || "";
	map["Пациент.Email"] = p.email || "";
	map["Пациент.СНИЛС"] = p.snils || "";
	map["Пациент.Инвалидность"] = p.disability !== undefined && p.disability !== null ? String(p.disability) : "нет";
	map["Пациент.Льготы"] = p.benefits !== undefined && p.benefits !== null ? String(p.benefits) : "нет";
	map["Пациент.Профессия"] = p.profession || "";
	map["Пациент.ОсобыеОтметки"] = p.specialNotes || "";
	map["Пациент.Полисы"] = p.policies || (p.omsPolicy ? `ОМС ${p.omsPolicy}` : "");
	map["Пациент.ПолисОМС"] = p.omsPolicy || "";
	map["Пациент.ПолисДМС"] = p.dmsPolicy || "";
	map["Пациент.Аванс"] = p.advance !== undefined && p.advance !== null ? String(p.advance) : "0";
	map["Пациент.Паспорт.Номер"] = pPassport.number || "";
	map["Пациент.Паспорт.Серия"] = pPassport.series || "";
	map["Пациент.Паспорт.СерияНомер"] = [pPassport.series, pPassport.number].filter(Boolean).join(" ");
	map["Пациент.Паспорт.ДатаВыдачи"] = formatDateDdMmYyyy(pPassport.issuedDate);
	map["Пациент.Паспорт.КемВыдан"] = pPassport.issuedBy || "";
	map["Пациент.Паспорт.КодПодразделения"] = pPassport.divisionCode || "";

	// Законный представитель
	const rep = ctx.representative ?? {};
	const repFullName = rep.fullName || "";
	const repPassport = rep.passport ?? {};
	map["Представитель.ФИО"] = repFullName;
	map["Представитель.ФамилияИнициалы"] = rep.initials || formatInitials(repFullName);
	map["Представитель.Телефон"] = rep.phone || "";
	map["Представитель.Паспорт.Номер"] = repPassport.number || "";
	map["Представитель.Паспорт.Серия"] = repPassport.series || "";
	map["Представитель.Паспорт.ДатаВыдачи"] = formatDateDdMmYyyy(repPassport.issuedDate);
	map["Представитель.Паспорт.КемВыдан"] = repPassport.issuedBy || "";
	map["Представитель.Паспорт.КодПодразделения"] = repPassport.divisionCode || "";
	map["Представитель.ДеньРождения"] = formatDateDdMmYyyy(rep.birthDate);
	map["Представитель.Адрес"] = rep.address || "";
	map["Представитель.СНИЛС"] = rep.snils || "";
	map["Представитель.НаОсновании"] = rep.basis || (repPassport.number ? "Паспорт" : "");
	map["Представитель.Основание"] = map["Представитель.НаОсновании"];
	map["Представитель.Тип"] = rep.relationType || "";
	map["Представитель.Родство"] = rep.relationType || "";

	// Полномочный представитель (по доверенности)
	const auth = ctx.authorizedPerson ?? {};
	const authFullName = auth.fullName || "";
	const authPassport = auth.passport ?? {};
	map["Полномочный.ФИО"] = authFullName;
	map["Полномочный.ФамилияИнициалы"] = auth.initials || formatInitials(authFullName);
	map["Полномочный.Телефон"] = auth.phone || "";
	map["Полномочный.Паспорт.Номер"] = authPassport.number || "";
	map["Полномочный.Паспорт.Серия"] = authPassport.series || "";
	map["Полномочный.Паспорт.ДатаВыдачи"] = formatDateDdMmYyyy(authPassport.issuedDate);
	map["Полномочный.Паспорт.КемВыдан"] = authPassport.issuedBy || "";
	map["Полномочный.Паспорт.КодПодразделения"] = authPassport.divisionCode || "";
	map["Полномочный.ДеньРождения"] = formatDateDdMmYyyy(auth.birthDate);
	map["Полномочный.Адрес"] = auth.address || "";
	map["Полномочный.СНИЛС"] = auth.snils || "";

	// Врач последнего приема
	const ld = ctx.lastDoctor ?? {};
	const ldFullName = ld.fullName || "";
	map["ПоследнийПриём.Врач.ФИО"] = ldFullName;
	map["ПоследнийПриём.Врач.ФамилияИнициалы"] = ld.initials || formatInitials(ldFullName);
	map["ПоследнийПриём.Врач.Должность"] = ld.position || "";
	map["ПоследнийПриём.Врач.Специальность"] = ld.specialty || "";

	// Администратор
	const adm = ctx.administrator ?? {};
	const admFullName = adm.fullName || "";
	map["Администратор.ФИО"] = admFullName;
	map["Администратор.ФамилияИнициалы"] = adm.initials || formatInitials(admFullName);
	map["Администратор.Должность"] = adm.position || "Администратор";
	map["Администратор.Специальность"] = adm.specialty || "Администратор";

	// Активный врач
	const doc = ctx.doctor ?? {};
	const docFullName = doc.fullName || "";
	map["АктивныйВрач.ФИО"] = docFullName;
	map["АктивныйВрач.ФамилияИнициалы"] = doc.initials || formatInitials(docFullName);
	map["АктивныйВрач.Должность"] = doc.position || "Врач-стоматолог";
	map["АктивныйВрач.Специальность"] = doc.specialty || "Стоматология";

	// Клиника
	const cl = ctx.clinic ?? {};
	map["Клиника.Название"] = cl.name || "";
	map["Клиника.ИНН"] = cl.inn || "";
	map["Клиника.КПП"] = cl.kpp || "";
	map["Клиника.Адрес"] = cl.address || "";
	map["Клиника.Телефон"] = cl.phone || "";
	map["Клиника.Лицензия.Номер"] = cl.licenseNumber || "";
	map["Клиника.Лицензия.ДатаВыдачи"] = formatDateDdMmYyyy(cl.licenseIssuedDate);
	map["Клиника.Лицензия.СрокДействия"] = cl.licenseValidity || "Бессрочно";
	map["Клиника.Лицензия.КемВыдана"] = cl.licenseIssuer || "";

	// Прием
	const app = ctx.appointment ?? {};
	map["Прием.Ид"] = app.id !== undefined && app.id !== null ? String(app.id) : "";
	map["Прием.Дата"] = formatDateDdMmYyyy(app.date);
	map["Прием.ПолнаяДата"] = app.fullDate || formatDateFullRussian(app.date);
	map["Прием.Время"] = app.time || "";

	// Склад
	const wh = ctx.warehouse ?? {};
	map["Склад.Название"] = wh.name || "";
	map["Склад.Материалы.Название"] = wh.materialName || "";
	map["Склад.Материалы.МинимальныйПорог"] = wh.minThreshold !== undefined && wh.minThreshold !== null ? String(wh.minThreshold) : "";
	map["Склад.Материалы.Остаток"] = wh.balance !== undefined && wh.balance !== null ? String(wh.balance) : "";

	// Документ
	const docMeta = ctx.document ?? {};
	map["Документ.ID"] = docMeta.id !== undefined && docMeta.id !== null ? String(docMeta.id) : "";
	map["Документ.Номер"] = docMeta.number || "";
	map["Документ.ДатаНачала"] = formatDateDdMmYyyy(docMeta.startDate);
	map["Документ.ДатаОкончания"] = formatDateDdMmYyyy(docMeta.endDate);
	map["Документ.ДатаСоздания"] = formatDateDdMmYyyy(docMeta.createdAt || curDate);

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
 * Поддерживает синтаксис {{Токен}} и [Токен].
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

	// 1. Замена синтаксиса mustache: {{ Токен }}
	let result = templateHtml.replace(
		/\{\{\s*([^{}]+?)\s*\}\}/g,
		(match, tokenName: string) => {
			const cleanToken = tokenName.trim();
			if (Object.prototype.hasOwnProperty.call(varsMap, cleanToken)) {
				const val = varsMap[cleanToken];
				return val && val.trim() !== "" ? val : emptyPlaceholder;
			}
			return preserveUnknown ? match : emptyPlaceholder;
		},
	);

	// 2. Замена синтаксиса квадратных скобок: [Токен] (используется в некоторых формах StomX)
	result = result.replace(
		/\[([А-Яа-яA-Za-z0-9_.-]+(?:\.[А-Яа-яA-Za-z0-9_.-]+)+)\]/g,
		(match, tokenName: string) => {
			const cleanToken = tokenName.trim();
			if (Object.prototype.hasOwnProperty.call(varsMap, cleanToken)) {
				const val = varsMap[cleanToken];
				return val && val.trim() !== "" ? val : emptyPlaceholder;
			}
			return preserveUnknown ? match : emptyPlaceholder;
		},
	);

	return result;
}
