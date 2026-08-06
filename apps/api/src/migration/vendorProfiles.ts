import type { MigrationEntityKind, MigrationTargetField } from "@dental/shared";

/**
 * Профили чужих систем: как называются их таблицы и колонки.
 *
 * ЧТО БЫЛО
 * services/ingestion/CompetitorSchemaRecon.ts содержит два профиля — Open Dental
 * и Dentrix — и сопоставляет их по точному совпадению имени таблицы:
 *
 *     if (tableNames.includes(pTable) && tableNames.includes(vTable))
 *
 * Для российской клиники это пусто вдвойне. Во-первых, ни Open Dental, ни
 * Dentrix в России практически не встречаются — переезжают с IDENT, DentalPRO,
 * «Инфодент», 1С-Медицины, Dental4Windows и десятка местных самописных баз.
 * Во-вторых, точное совпадение имени таблицы не срабатывает никогда: оператор
 * выгружает не базу целиком, а один файл «пациенты.xlsx» или «PATIENT.DBF», и
 * имя таблицы либо отсутствует, либо своё.
 *
 * Поэтому здесь профиль опознаётся по КОЛОНКАМ, а не по имени таблицы, и
 * совпадение считается долей, а не «да/нет»: профиль, узнавший 6 колонок из 9,
 * полезнее отсутствия профиля.
 */

export interface VendorFieldRule {
	/**
	 * Имена колонок этой системы для одного нашего поля. Сравнение
	 * нечувствительно к регистру, пробелам, подчёркиваниям и дефисам.
	 */
	columns: string[];
	targetField: MigrationTargetField;
}

export interface VendorProfile {
	/** Машинный код: попадает в migration_runs.vendor_profile и в ссылки сущностей. */
	code: string;
	/** Название для оператора. */
	title: string;
	/** Пояснение, откуда такая выгрузка берётся. */
	note: string;
	/** Имена таблиц/файлов, характерные для системы, — уточняющий признак. */
	tableHints: Partial<Record<MigrationEntityKind, string[]>>;
	rules: Partial<Record<MigrationEntityKind, VendorFieldRule[]>>;
}

/** Приводит имя колонки к виду, в котором его можно сравнивать. */
export function canonicalColumnName(value: string): string {
	return value
		.toLowerCase()
		.replace(/^@/, "")
		.replace(/[\s_\-.]+/g, "")
		.replace(/ё/g, "е")
		.trim();
}

/**
 * Профили. Состав колонок собран по выгрузкам и документации соответствующих
 * систем; для самописных баз работает обобщённый российский профиль ниже, он же
 * покрывает «сохранить как CSV» из русского Excel.
 */
export const VENDOR_PROFILES: VendorProfile[] = [
	{
		code: "ident",
		title: "IDENT",
		note: "Российская стоматологическая система; выгрузка обычно в XLSX либо в DBF из старых версий.",
		tableHints: {
			patient: [
				"patient",
				"patients",
				"пациент",
				"пациенты",
				"klient",
				"клиенты",
			],
			appointment: ["priem", "приемы", "raspisanie", "расписание", "visit"],
			payment: ["oplata", "оплаты", "platezh", "платежи", "kassa", "касса"],
		},
		rules: {
			patient: [
				{
					columns: [
						"kod",
						"код",
						"id",
						"idpat",
						"kodpacienta",
						"код пациента",
						"номер карты",
						"nomerkarty",
					],
					targetField: "patient.externalId",
				},
				{
					columns: [
						"fio",
						"фио",
						"фамилия имя отчество",
						"pacient",
						"пациент",
						"полное имя",
					],
					targetField: "patient.fullName",
				},
				{
					columns: ["familiya", "фамилия", "surname", "lastname"],
					targetField: "patient.lastName",
				},
				{
					columns: ["imya", "имя", "name", "firstname"],
					targetField: "patient.firstName",
				},
				{
					columns: ["otchestvo", "отчество", "middlename", "patronymic"],
					targetField: "patient.middleName",
				},
				{
					columns: [
						"datarojd",
						"datarojdeniya",
						"дата рождения",
						"др",
						"birthday",
						"birthdate",
						"dr",
					],
					targetField: "patient.birthDate",
				},
				{
					columns: [
						"telefon",
						"телефон",
						"phone",
						"mobtel",
						"мобильный",
						"сотовый",
					],
					targetField: "patient.phone",
				},
				{
					columns: [
						"telefon2",
						"телефон2",
						"доптелефон",
						"дополнительный телефон",
					],
					targetField: "patient.secondaryPhone",
				},
				{
					columns: ["email", "эл почта", "почта", "epochta"],
					targetField: "patient.email",
				},
				{
					columns: ["pol", "пол", "gender", "sex"],
					targetField: "patient.gender",
				},
				{
					columns: ["adres", "адрес", "address", "адреспроживания"],
					targetField: "patient.address",
				},
				{
					columns: [
						"primechanie",
						"примечание",
						"коммент",
						"комментарий",
						"note",
						"notes",
					],
					targetField: "patient.notes",
				},
			],
			appointment: [
				{
					columns: ["kod", "код", "id"],
					targetField: "appointment.externalId",
				},
				{
					columns: [
						"kodpacienta",
						"код пациента",
						"idpat",
						"pacient",
						"пациент",
					],
					targetField: "appointment.patientRef",
				},
				{
					columns: ["vrach", "врач", "doctor", "kodvracha", "код врача"],
					targetField: "appointment.doctorRef",
				},
				{
					columns: [
						"datapriema",
						"дата приема",
						"data",
						"дата",
						"нач",
						"начало",
						"startdate",
					],
					targetField: "appointment.startsAt",
				},
				{
					columns: ["konec", "конец", "окончание", "enddate"],
					targetField: "appointment.endsAt",
				},
				{
					columns: ["dlitelnost", "длительность", "duration", "минут"],
					targetField: "appointment.durationMinutes",
				},
				{
					columns: ["status", "статус", "sostoyanie", "состояние"],
					targetField: "appointment.status",
				},
				{
					columns: ["povod", "повод", "prichina", "причина", "услуга"],
					targetField: "appointment.reason",
				},
				{
					columns: ["primechanie", "примечание", "коммент", "комментарий"],
					targetField: "appointment.comment",
				},
			],
			payment: [
				{ columns: ["kod", "код", "id"], targetField: "payment.externalId" },
				{
					columns: ["kodpacienta", "код пациента", "pacient", "пациент"],
					targetField: "payment.patientRef",
				},
				{
					columns: ["summa", "сумма", "amount", "оплачено", "koplate"],
					targetField: "payment.amountRub",
				},
				{
					columns: ["dataoplaty", "дата оплаты", "data", "дата"],
					targetField: "payment.paidAt",
				},
				{
					columns: [
						"vidoplaty",
						"вид оплаты",
						"sposob",
						"способ оплаты",
						"тип оплаты",
					],
					targetField: "payment.method",
				},
				{
					columns: ["primechanie", "примечание", "коммент", "назначение"],
					targetField: "payment.note",
				},
			],
		},
	},
	{
		code: "dentalpro",
		title: "DentalPRO",
		note: "Российская система; выгрузка через отчёты в XLSX/CSV.",
		tableHints: {
			patient: ["patients", "пациенты", "clients", "клиентская база"],
			visit: ["visits", "приемы", "лечение"],
			payment: ["payments", "платежи", "оплаты"],
		},
		rules: {
			patient: [
				{
					columns: [
						"номеркарты",
						"картномер",
						"cardnumber",
						"cardno",
						"id",
						"код",
					],
					targetField: "patient.externalId",
				},
				{
					columns: ["пациент", "фио", "фиопациента", "клиент", "fullname"],
					targetField: "patient.fullName",
				},
				{ columns: ["фамилия"], targetField: "patient.lastName" },
				{ columns: ["имя"], targetField: "patient.firstName" },
				{ columns: ["отчество"], targetField: "patient.middleName" },
				{
					columns: ["датарождения", "дррождения", "birthdate"],
					targetField: "patient.birthDate",
				},
				{
					columns: ["мобильныйтелефон", "телефон", "мобильный", "phone"],
					targetField: "patient.phone",
				},
				{
					columns: ["домашнийтелефон", "рабочийтелефон", "второйтелефон"],
					targetField: "patient.secondaryPhone",
				},
				{
					columns: ["email", "электроннаяпочта"],
					targetField: "patient.email",
				},
				{ columns: ["пол"], targetField: "patient.gender" },
				{
					columns: ["адрес", "адресрегистрации"],
					targetField: "patient.address",
				},
				{
					columns: ["заметки", "примечания", "комментарий"],
					targetField: "patient.notes",
				},
				{
					columns: ["статус", "состояниекарты"],
					targetField: "patient.status",
				},
			],
			visit: [
				{ columns: ["id", "номерприема"], targetField: "visit.externalId" },
				{
					columns: ["пациент", "номеркарты", "картномер"],
					targetField: "visit.patientRef",
				},
				{ columns: ["дата", "датаприема"], targetField: "visit.date" },
				{ columns: ["жалобы"], targetField: "visit.complaint" },
				{ columns: ["анамнез"], targetField: "visit.anamnesis" },
				{
					columns: ["объективно", "осмотр", "статус"],
					targetField: "visit.objectiveStatus",
				},
				{ columns: ["диагноз"], targetField: "visit.diagnosis" },
				{
					columns: ["планлечения", "лечение"],
					targetField: "visit.treatmentPlan",
				},
				{
					columns: ["заключение", "рекомендации"],
					targetField: "visit.doctorSummary",
				},
			],
		},
	},
	{
		code: "infodent",
		title: "Инфодент / Infodent",
		note: "Система на FoxPro; данные лежат в DBF-таблицах, текст обычно в cp866.",
		tableHints: {
			patient: ["pacient", "patient", "kart", "karta", "klient"],
			visit: ["priem", "lechenie", "visit"],
			payment: ["oplata", "kassa", "schet"],
		},
		rules: {
			patient: [
				{
					columns: ["nkart", "nomkart", "kod", "id", "idpac", "npac"],
					targetField: "patient.externalId",
				},
				{
					columns: ["fio", "fam_io", "pacient", "nazvanie"],
					targetField: "patient.fullName",
				},
				{
					columns: ["fam", "familia", "familiya"],
					targetField: "patient.lastName",
				},
				{ columns: ["im", "imya"], targetField: "patient.firstName" },
				{
					columns: ["ot", "otch", "otchestvo"],
					targetField: "patient.middleName",
				},
				{
					columns: ["drojd", "ddr", "datar", "datarojd", "birth"],
					targetField: "patient.birthDate",
				},
				{
					columns: ["tel", "telef", "telefon", "mobil"],
					targetField: "patient.phone",
				},
				{
					columns: ["tel2", "teldom", "telrab"],
					targetField: "patient.secondaryPhone",
				},
				{ columns: ["pol", "sex"], targetField: "patient.gender" },
				{ columns: ["adres", "adr"], targetField: "patient.address" },
				{ columns: ["prim", "primech", "zamet"], targetField: "patient.notes" },
			],
			payment: [
				{ columns: ["kod", "id", "nom"], targetField: "payment.externalId" },
				{
					columns: ["nkart", "npac", "idpac", "kodpac"],
					targetField: "payment.patientRef",
				},
				{
					columns: ["summa", "sum", "cena", "itogo"],
					targetField: "payment.amountRub",
				},
				{
					columns: ["data", "datopl", "dataopl"],
					targetField: "payment.paidAt",
				},
				{ columns: ["vid", "vidopl", "sposob"], targetField: "payment.method" },
			],
		},
	},
	{
		code: "1c_medicine",
		title: "1С:Медицина",
		note: "Выгрузка из 1С; имена колонок русские, часто с префиксом справочника.",
		tableHints: {
			patient: ["физическиелица", "пациенты", "справочникпациенты"],
			payment: ["документыоплата", "чеки", "поступлениеденег"],
		},
		rules: {
			patient: [
				{
					columns: [
						"код",
						"кодфизлица",
						"уникальныйидентификатор",
						"guid",
						"ссылка",
					],
					targetField: "patient.externalId",
				},
				{
					columns: ["наименование", "фио", "физическоелицо", "полноеимя"],
					targetField: "patient.fullName",
				},
				{ columns: ["фамилия"], targetField: "patient.lastName" },
				{ columns: ["имя"], targetField: "patient.firstName" },
				{ columns: ["отчество"], targetField: "patient.middleName" },
				{ columns: ["датарождения"], targetField: "patient.birthDate" },
				{
					columns: ["телефон", "контактныйтелефон", "телефонмобильный"],
					targetField: "patient.phone",
				},
				{
					columns: ["адресэлектроннойпочты", "email"],
					targetField: "patient.email",
				},
				{ columns: ["пол"], targetField: "patient.gender" },
				{
					columns: ["адрес", "адресфактический", "адресрегистрации"],
					targetField: "patient.address",
				},
				{
					columns: ["комментарий", "дополнительнаяинформация"],
					targetField: "patient.notes",
				},
			],
			payment: [
				{
					columns: ["номер", "номердокумента"],
					targetField: "payment.externalId",
				},
				{
					columns: ["физическоелицо", "пациент", "контрагент"],
					targetField: "payment.patientRef",
				},
				{
					columns: ["суммадокумента", "сумма"],
					targetField: "payment.amountRub",
				},
				{ columns: ["дата"], targetField: "payment.paidAt" },
				{
					columns: ["видоплаты", "способоплаты"],
					targetField: "payment.method",
				},
				{
					columns: ["комментарий", "назначениеплатежа"],
					targetField: "payment.note",
				},
			],
		},
	},
	{
		code: "opendental",
		title: "Open Dental",
		note: "Западная система на MySQL; выгрузка таблиц patient/appointment/procedurelog.",
		tableHints: {
			patient: ["patient", "patients"],
			appointment: ["appointment", "appointments", "appt"],
			payment: ["payment", "paysplit", "procedurelog"],
			doctor: ["provider", "providers"],
		},
		rules: {
			patient: [
				{
					columns: ["patnum", "patientnum", "patid"],
					targetField: "patient.externalId",
				},
				{ columns: ["lname", "lastname"], targetField: "patient.lastName" },
				{ columns: ["fname", "firstname"], targetField: "patient.firstName" },
				{
					columns: ["middlei", "midname", "middlename"],
					targetField: "patient.middleName",
				},
				{ columns: ["birthdate", "bdate"], targetField: "patient.birthDate" },
				{
					columns: ["hmphone", "wirelessphone", "phone"],
					targetField: "patient.phone",
				},
				{
					columns: ["wkphone", "workphone"],
					targetField: "patient.secondaryPhone",
				},
				{ columns: ["email"], targetField: "patient.email" },
				{ columns: ["gender"], targetField: "patient.gender" },
				{ columns: ["address", "address1"], targetField: "patient.address" },
				{ columns: ["patstatus", "status"], targetField: "patient.status" },
			],
			appointment: [
				{ columns: ["aptnum"], targetField: "appointment.externalId" },
				{ columns: ["patnum"], targetField: "appointment.patientRef" },
				{
					columns: ["provnum", "provider"],
					targetField: "appointment.doctorRef",
				},
				{
					columns: ["aptdatetime", "aptdate"],
					targetField: "appointment.startsAt",
				},
				{ columns: ["aptstatus"], targetField: "appointment.status" },
				{
					columns: ["pattern", "length"],
					targetField: "appointment.durationMinutes",
				},
				{
					columns: ["procdescript", "notes"],
					targetField: "appointment.reason",
				},
			],
			payment: [
				{ columns: ["paynum", "procnum"], targetField: "payment.externalId" },
				{ columns: ["patnum"], targetField: "payment.patientRef" },
				{
					columns: ["payamt", "procfee", "amount"],
					targetField: "payment.amountRub",
				},
				{ columns: ["paydate", "procdate"], targetField: "payment.paidAt" },
				{ columns: ["paynote", "note"], targetField: "payment.note" },
			],
		},
	},
	{
		code: "dentrix",
		title: "Dentrix",
		note: "Западная система; выгрузка через отчёты в CSV.",
		tableHints: {
			patient: ["patient", "patients"],
			appointment: ["appt", "appointment"],
			payment: ["ledger", "transaction"],
		},
		rules: {
			patient: [
				{
					columns: ["patid", "patientid", "chartnumber", "chartno"],
					targetField: "patient.externalId",
				},
				{ columns: ["lastname"], targetField: "patient.lastName" },
				{ columns: ["firstname"], targetField: "patient.firstName" },
				{ columns: ["middlename", "mi"], targetField: "patient.middleName" },
				{
					columns: ["birthdate", "dateofbirth", "dob"],
					targetField: "patient.birthDate",
				},
				{
					columns: ["phone", "homephone", "cellphone"],
					targetField: "patient.phone",
				},
				{ columns: ["email", "emailaddress"], targetField: "patient.email" },
				{ columns: ["gender", "sex"], targetField: "patient.gender" },
				{ columns: ["address", "street"], targetField: "patient.address" },
			],
			appointment: [
				{
					columns: ["apptid", "appointmentid"],
					targetField: "appointment.externalId",
				},
				{
					columns: ["patid", "patientid"],
					targetField: "appointment.patientRef",
				},
				{
					columns: ["provider", "providerid"],
					targetField: "appointment.doctorRef",
				},
				{
					columns: ["startdatetime", "apptdate", "date"],
					targetField: "appointment.startsAt",
				},
				{ columns: ["enddatetime"], targetField: "appointment.endsAt" },
				{
					columns: ["status", "apptstatus"],
					targetField: "appointment.status",
				},
				{
					columns: ["reason", "description"],
					targetField: "appointment.reason",
				},
			],
		},
	},
];

/**
 * Обобщённый российский профиль. Применяется, когда ни один конкретный не
 * опознан, и покрывает главный реальный случай: таблица, собранная
 * администратором в Excel руками.
 *
 * Живёт отдельно от VENDOR_PROFILES, потому что не должен участвовать в
 * состязании за лучшее совпадение — он всегда доступен как основа.
 */
export const GENERIC_RU_RULES: Partial<
	Record<MigrationEntityKind, VendorFieldRule[]>
> = {
	patient: [
		{
			columns: [
				"id",
				"код",
				"номер",
				"no",
				"№",
				"номеркарты",
				"карта",
				"кодпациента",
				"внешнийид",
				"externalid",
			],
			targetField: "patient.externalId",
		},
		{
			columns: [
				"фио",
				"фиополностью",
				"пациент",
				"клиент",
				"имяпациента",
				"полноеимя",
				"наименование",
				"fio",
				"fullname",
				"name",
				"patient",
				"patientname",
				"client",
			],
			targetField: "patient.fullName",
		},
		{
			columns: ["фамилия", "surname", "lastname", "lname", "familiya", "fam"],
			targetField: "patient.lastName",
		},
		{
			columns: ["имя", "firstname", "fname", "imya"],
			targetField: "patient.firstName",
		},
		{
			columns: ["отчество", "middlename", "patronymic", "otchestvo", "otch"],
			targetField: "patient.middleName",
		},
		{
			columns: [
				"датарождения",
				"дата рождения",
				"др",
				"дррождения",
				"рождение",
				"деньрождения",
				"birthdate",
				"birthday",
				"dob",
				"dateofbirth",
				"datarojdeniya",
				"datarojd",
			],
			targetField: "patient.birthDate",
		},
		{
			columns: [
				"телефон",
				"тел",
				"мобильный",
				"мобильныйтелефон",
				"сотовый",
				"номертелефона",
				"контакт",
				"контактныйтелефон",
				"whatsapp",
				"phone",
				"tel",
				"telephone",
				"mobile",
				"cellphone",
				"mobilephone",
				"telefon",
			],
			targetField: "patient.phone",
		},
		{
			columns: [
				"телефон2",
				"второйтелефон",
				"доптелефон",
				"дополнительныйтелефон",
				"домашнийтелефон",
				"рабочийтелефон",
				"phone2",
				"secondphone",
				"workphone",
				"homephone",
			],
			targetField: "patient.secondaryPhone",
		},
		{
			columns: [
				"email",
				"почта",
				"электроннаяпочта",
				"элпочта",
				"мейл",
				"мыло",
				"mail",
				"emailaddress",
			],
			targetField: "patient.email",
		},
		{ columns: ["пол", "gender", "sex"], targetField: "patient.gender" },
		{
			columns: [
				"адрес",
				"адреспроживания",
				"адресрегистрации",
				"address",
				"street",
				"city",
				"город",
			],
			targetField: "patient.address",
		},
		{
			columns: [
				"комментарий",
				"коммент",
				"примечание",
				"примечания",
				"заметка",
				"заметки",
				"описание",
				"прочее",
				"инфо",
				"comment",
				"comments",
				"note",
				"notes",
				"memo",
				"remark",
				"description",
			],
			targetField: "patient.notes",
		},
		{
			columns: [
				"статус",
				"состояние",
				"активен",
				"архив",
				"status",
				"patstatus",
			],
			targetField: "patient.status",
		},
		{
			columns: [
				"датасоздания",
				"датарегистрации",
				"созданадата",
				"created",
				"createdat",
				"regdate",
			],
			targetField: "patient.createdAt",
		},
	],
	doctor: [
		{
			columns: ["id", "код", "кодврача", "doctorid", "provnum", "provider"],
			targetField: "doctor.externalId",
		},
		{
			columns: [
				"фио",
				"врач",
				"доктор",
				"специалист",
				"doctor",
				"provider",
				"fullname",
			],
			targetField: "doctor.fullName",
		},
		{
			columns: [
				"специальность",
				"специализация",
				"должность",
				"specialty",
				"speciality",
				"position",
			],
			targetField: "doctor.specialty",
		},
		{ columns: ["телефон", "тел", "phone"], targetField: "doctor.phone" },
		{ columns: ["email", "почта"], targetField: "doctor.email" },
	],
	service: [
		{
			columns: ["id", "код", "кодуслуги", "артикул", "serviceid", "code"],
			targetField: "service.externalId",
		},
		{
			columns: ["кодуслуги", "шифр", "code", "servicecode"],
			targetField: "service.code",
		},
		{
			columns: [
				"услуга",
				"наименование",
				"название",
				"наименованиеуслуги",
				"service",
				"name",
				"description",
			],
			targetField: "service.name",
		},
		{
			columns: [
				"цена",
				"стоимость",
				"прайс",
				"суммауслуги",
				"price",
				"fee",
				"amount",
				"cost",
			],
			targetField: "service.priceRub",
		},
	],
	appointment: [
		{
			columns: ["id", "код", "номерзаписи", "apptid", "aptnum"],
			targetField: "appointment.externalId",
		},
		{
			columns: [
				"пациент",
				"кодпациента",
				"номеркарты",
				"фиопациента",
				"patient",
				"patnum",
				"patientid",
			],
			targetField: "appointment.patientRef",
		},
		{
			columns: [
				"врач",
				"доктор",
				"кодврача",
				"специалист",
				"doctor",
				"provider",
				"provnum",
			],
			targetField: "appointment.doctorRef",
		},
		{
			columns: [
				"дата",
				"датаприема",
				"датавремя",
				"начало",
				"времяначала",
				"datetime",
				"startsat",
				"aptdatetime",
				"startdatetime",
				"date",
			],
			targetField: "appointment.startsAt",
		},
		{
			columns: [
				"окончание",
				"времяокончания",
				"конец",
				"endsat",
				"enddatetime",
			],
			targetField: "appointment.endsAt",
		},
		{
			columns: [
				"длительность",
				"продолжительность",
				"минут",
				"duration",
				"length",
				"minutes",
			],
			targetField: "appointment.durationMinutes",
		},
		{
			columns: ["статус", "состояние", "status", "aptstatus"],
			targetField: "appointment.status",
		},
		{
			columns: [
				"повод",
				"причина",
				"услуга",
				"назначение",
				"reason",
				"procdescript",
				"description",
			],
			targetField: "appointment.reason",
		},
		{
			columns: [
				"комментарий",
				"примечание",
				"коммент",
				"comment",
				"note",
				"notes",
			],
			targetField: "appointment.comment",
		},
	],
	visit: [
		{
			columns: ["id", "код", "номерприема", "visitid"],
			targetField: "visit.externalId",
		},
		{
			columns: ["пациент", "кодпациента", "номеркарты", "patient", "patnum"],
			targetField: "visit.patientRef",
		},
		{
			columns: ["дата", "датаприема", "датапосещения", "date", "visitdate"],
			targetField: "visit.date",
		},
		{
			columns: [
				"жалобы",
				"жалоба",
				"обращение",
				"complaint",
				"complaints",
				"chiefcomplaint",
			],
			targetField: "visit.complaint",
		},
		{
			columns: [
				"анамнез",
				"анамнезжизни",
				"историязаболевания",
				"anamnesis",
				"history",
			],
			targetField: "visit.anamnesis",
		},
		{
			columns: [
				"объективно",
				"объективныйстатус",
				"осмотр",
				"статус",
				"objective",
				"examination",
			],
			targetField: "visit.objectiveStatus",
		},
		{
			columns: ["диагноз", "заключениедиагноз", "diagnosis", "dx"],
			targetField: "visit.diagnosis",
		},
		{
			columns: [
				"планлечения",
				"лечение",
				"проведенолечение",
				"treatment",
				"treatmentplan",
				"plan",
			],
			targetField: "visit.treatmentPlan",
		},
		{
			columns: [
				"заключение",
				"рекомендации",
				"итог",
				"summary",
				"recommendations",
				"conclusion",
			],
			targetField: "visit.doctorSummary",
		},
	],
	payment: [
		{
			columns: [
				"id",
				"код",
				"номер",
				"номерчека",
				"номердокумента",
				"paynum",
				"paymentid",
				"receiptno",
			],
			targetField: "payment.externalId",
		},
		{
			columns: [
				"пациент",
				"кодпациента",
				"номеркарты",
				"плательщик",
				"patient",
				"patnum",
				"patientid",
			],
			targetField: "payment.patientRef",
		},
		{
			columns: ["приемid", "кодприема", "визит", "visitid", "procnum"],
			targetField: "payment.visitRef",
		},
		{
			columns: [
				"сумма",
				"суммаоплаты",
				"оплачено",
				"квитанция",
				"итого",
				"стоимость",
				"amount",
				"payamt",
				"sum",
				"total",
				"paid",
			],
			targetField: "payment.amountRub",
		},
		{
			columns: [
				"способоплаты",
				"видоплаты",
				"типоплаты",
				"форма оплаты",
				"method",
				"paytype",
				"paymentmethod",
			],
			targetField: "payment.method",
		},
		{
			columns: ["статус", "состояниеоплаты", "status", "paystatus"],
			targetField: "payment.status",
		},
		{
			columns: [
				"дата",
				"датаоплаты",
				"датаплатежа",
				"paiddate",
				"paydate",
				"date",
			],
			targetField: "payment.paidAt",
		},
		{
			columns: [
				"комментарий",
				"примечание",
				"назначение",
				"назначениеплатежа",
				"note",
				"paynote",
				"comment",
			],
			targetField: "payment.note",
		},
	],
	tooth_state: [
		{
			columns: ["пациент", "кодпациента", "номеркарты", "patient", "patnum"],
			targetField: "toothState.patientRef",
		},
		{
			columns: [
				"зуб",
				"номерзуба",
				"зубformula",
				"tooth",
				"toothnum",
				"toothcode",
			],
			targetField: "toothState.toothCode",
		},
		{
			columns: [
				"состояние",
				"диагноззуба",
				"статус",
				"condition",
				"state",
				"diagnosis",
			],
			targetField: "toothState.condition",
		},
		{
			columns: ["комментарий", "примечание", "note", "comment"],
			targetField: "toothState.note",
		},
	],
};

export interface VendorProfileMatch {
	profile: VendorProfile | null;
	/** Доля колонок источника, узнанных профилем: 0..1. */
	coverage: number;
	/** Сущность, к которой профиль отнёс таблицу. */
	entityKind: MigrationEntityKind;
	/** Пояснение решения для отчёта оператору. */
	rationale: string;
}

function ruleColumnSet(rules: VendorFieldRule[]): Set<string> {
	const set = new Set<string>();
	for (const rule of rules) {
		for (const column of rule.columns) set.add(canonicalColumnName(column));
	}
	return set;
}

/**
 * Опознаёт систему по колонкам источника.
 *
 * Считается доля колонок источника, которые профиль знает. Имя таблицы —
 * уточняющий признак, дающий надбавку, а не условие: оператор чаще всего
 * выгружает один файл со своим именем.
 */
export function matchVendorProfile(
	columns: string[],
	tableName: string,
	requestedCode?: string,
): VendorProfileMatch {
	const canonicalColumns = columns.map(canonicalColumnName).filter(Boolean);
	const canonicalTable = canonicalColumnName(tableName);

	if (requestedCode) {
		const requested = VENDOR_PROFILES.find(
			(profile) => profile.code === requestedCode,
		);
		if (requested) {
			const best = bestEntityForProfile(
				requested,
				canonicalColumns,
				canonicalTable,
			);
			return {
				profile: requested,
				coverage: best.coverage,
				entityKind: best.entityKind,
				rationale: `Профиль «${requested.title}» выбран оператором вручную; узнано ${Math.round(best.coverage * 100)}% колонок.`,
			};
		}
	}

	let best: VendorProfileMatch = {
		profile: null,
		coverage: 0,
		entityKind: "unknown",
		rationale: "Ни один профиль известной системы не узнал колонки источника.",
	};

	for (const profile of VENDOR_PROFILES) {
		const candidate = bestEntityForProfile(
			profile,
			canonicalColumns,
			canonicalTable,
		);
		if (candidate.coverage > best.coverage) {
			best = {
				profile,
				coverage: candidate.coverage,
				entityKind: candidate.entityKind,
				rationale: `Профиль «${profile.title}» узнал ${Math.round(candidate.coverage * 100)}% колонок${
					candidate.tableHintMatched ? ` и имя таблицы «${tableName}»` : ""
				}.`,
			};
		}
	}

	/**
	 * Порог 0.45 подобран по смыслу: профиль полезен, если узнаёт хотя бы
	 * половину колонок. Ниже этого его подсказки скорее мешают — обобщённые
	 * правила и языковая модель справятся лучше, а ложно опознанная система
	 * приведёт к неверному коду в ссылках сущностей.
	 */
	if (best.coverage < 0.45) {
		return {
			profile: null,
			coverage: best.coverage,
			entityKind: best.entityKind,
			rationale:
				best.coverage > 0
					? `Ближайший профиль узнал лишь ${Math.round(best.coverage * 100)}% колонок — этого мало для уверенного опознания, применяются обобщённые правила.`
					: best.rationale,
		};
	}

	return best;
}

function bestEntityForProfile(
	profile: VendorProfile,
	canonicalColumns: string[],
	canonicalTable: string,
): {
	entityKind: MigrationEntityKind;
	coverage: number;
	tableHintMatched: boolean;
} {
	let best: {
		entityKind: MigrationEntityKind;
		coverage: number;
		tableHintMatched: boolean;
	} = {
		entityKind: "unknown",
		coverage: 0,
		tableHintMatched: false,
	};

	for (const [entityKind, rules] of Object.entries(profile.rules) as [
		MigrationEntityKind,
		VendorFieldRule[],
	][]) {
		if (!rules?.length) continue;
		const known = ruleColumnSet(rules);
		const matched = canonicalColumns.filter((column) =>
			known.has(column),
		).length;
		const coverage =
			canonicalColumns.length === 0 ? 0 : matched / canonicalColumns.length;

		const hints = (profile.tableHints[entityKind] ?? []).map(
			canonicalColumnName,
		);
		const tableHintMatched = hints.some((hint) =>
			canonicalTable.includes(hint),
		);
		// Надбавка за имя таблицы, но она не может сама вытянуть профиль через порог.
		const adjusted = Math.min(1, coverage + (tableHintMatched ? 0.15 : 0));

		if (adjusted > best.coverage)
			best = { entityKind, coverage: adjusted, tableHintMatched };
	}

	return best;
}

/**
 * Правила для сущности: правила профиля идут первыми и имеют приоритет, затем
 * обобщённые. Так «HMPHONE» из Open Dental победит обобщённое «phone», а колонка
 * «Комментарий», которой в профиле нет, всё равно найдёт своё поле.
 */
export function rulesForEntity(
	entityKind: MigrationEntityKind,
	profile: VendorProfile | null,
): VendorFieldRule[] {
	const fromProfile = profile?.rules[entityKind] ?? [];
	const generic = GENERIC_RU_RULES[entityKind] ?? [];
	return [...fromProfile, ...generic];
}

/**
 * Определяет сущность по колонкам, когда профиль не опознан и оператор не указал
 * её явно. Решение принимается по «ключевым» колонкам, а не по любым: колонка
 * «Дата» есть у всех сущностей и ничего не говорит, а «Жалобы» — только у приёма.
 */
export function detectEntityKind(
	columns: string[],
	tableName: string,
): { entityKind: MigrationEntityKind; rationale: string } {
	const canonical = new Set(columns.map(canonicalColumnName));
	const table = canonicalColumnName(tableName);

	const signals: Array<{
		entityKind: MigrationEntityKind;
		columns: string[];
		tables: string[];
		title: string;
	}> = [
		{
			entityKind: "visit",
			columns: [
				"жалобы",
				"жалоба",
				"анамнез",
				"диагноз",
				"объективно",
				"планлечения",
				"complaint",
				"anamnesis",
				"diagnosis",
			],
			tables: ["priem", "приемы", "visit", "visits", "лечение", "осмотр"],
			title: "приёмы",
		},
		{
			entityKind: "payment",
			columns: [
				"сумма",
				"суммаоплаты",
				"оплачено",
				"способоплаты",
				"видоплаты",
				"номерчека",
				"amount",
				"payamt",
				"paymentmethod",
			],
			tables: [
				"oplata",
				"оплаты",
				"платежи",
				"payment",
				"payments",
				"kassa",
				"касса",
				"чеки",
			],
			title: "платежи",
		},
		{
			entityKind: "appointment",
			columns: [
				"времяначала",
				"началоприема",
				"окончание",
				"длительность",
				"кабинет",
				"кресло",
				"startsat",
				"aptdatetime",
				"duration",
			],
			tables: [
				"raspisanie",
				"расписание",
				"appointment",
				"appointments",
				"приемы",
				"запись",
				"записи",
			],
			title: "записи в расписании",
		},
		{
			entityKind: "service",
			columns: [
				"цена",
				"стоимость",
				"прайс",
				"кодуслуги",
				"услуга",
				"price",
				"fee",
				"servicecode",
			],
			tables: [
				"услуги",
				"прайс",
				"прайслист",
				"service",
				"services",
				"pricelist",
			],
			title: "услуги",
		},
		{
			entityKind: "doctor",
			columns: [
				"специальность",
				"специализация",
				"должность",
				"specialty",
				"position",
			],
			tables: [
				"врачи",
				"сотрудники",
				"doctor",
				"doctors",
				"provider",
				"providers",
				"staff",
			],
			title: "врачи",
		},
		{
			entityKind: "tooth_state",
			columns: ["зуб", "номерзуба", "tooth", "toothnum", "состояниезуба"],
			tables: ["зубы", "формула", "tooth", "teeth", "odontogram"],
			title: "состояния зубов",
		},
		{
			entityKind: "patient",
			columns: [
				"фио",
				"датарождения",
				"пациент",
				"номеркарты",
				"birthdate",
				"lastname",
				"fullname",
				"patient",
			],
			tables: [
				"пациенты",
				"patient",
				"patients",
				"клиенты",
				"klient",
				"kart",
				"карты",
			],
			title: "пациенты",
		},
	];

	let best: {
		entityKind: MigrationEntityKind;
		score: number;
		title: string;
		matched: string[];
	} = {
		entityKind: "unknown",
		score: 0,
		title: "",
		matched: [],
	};

	for (const signal of signals) {
		const matched = signal.columns.filter((column) =>
			canonical.has(canonicalColumnName(column)),
		);
		const tableMatched = signal.tables.some((hint) =>
			table.includes(canonicalColumnName(hint)),
		);
		/**
		 * Имя таблицы весит как две ключевые колонки: файл «оплаты.xlsx» — сильный
		 * довод, но одной только колонки «Сумма» мало, она бывает и у услуг.
		 */
		const score = matched.length + (tableMatched ? 2 : 0);
		if (score > best.score)
			best = {
				entityKind: signal.entityKind,
				score,
				title: signal.title,
				matched,
			};
	}

	if (best.score === 0) {
		return {
			entityKind: "unknown",
			rationale:
				"По колонкам не удалось определить, что за сущность в источнике. Укажите её вручную.",
		};
	}

	return {
		entityKind: best.entityKind,
		rationale: `Определено как «${best.title}»${
			best.matched.length > 0
				? ` по колонкам: ${best.matched.slice(0, 4).join(", ")}`
				: " по имени таблицы"
		}.`,
	};
}
