import type {
	ClinicalToothRowInput,
	DentalFormulaRecordInput,
	ToothStateData,
} from "../dentalFormulaRenderer.js";

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

export interface InterpolateVariablesOptions {
	/**
	 * Сохранять ли неразрешенные токены в виде {{token}} (true) или заменять на emptyPlaceholder (false).
	 * По умолчанию: true (для отладки и видимости пропущенных полей).
	 */
	preserveUnresolved?: boolean;
	emptyPlaceholder?: string;
}
