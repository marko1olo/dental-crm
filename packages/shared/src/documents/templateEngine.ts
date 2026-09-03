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
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "";
	if (parts.length === 1) return parts[0] ?? "";
	const firstInitial = parts[1]?.[0] ? `${parts[1][0].toUpperCase()}.` : "";
	const secondInitial = parts[2]?.[0] ? `${parts[2][0].toUpperCase()}.` : "";
	return [parts[0], firstInitial, secondInitial].filter(Boolean).join(" ");
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
export * from "./templateVariablesRegistry.js";


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
	const pParts = pFullName ? pFullName.trim().split(/\s+/).filter(Boolean) : [];
	const pLastName = p.lastName ?? (pParts[0] ?? "");
	const pFirstName = p.firstName ?? (pParts[1] ?? "");
	const pMiddleName = p.middleName ?? (pParts[2] ?? "");
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
