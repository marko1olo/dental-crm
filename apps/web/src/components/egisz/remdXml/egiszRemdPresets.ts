/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD CDA R2 PRESETS & OID DICTIONARIES — DENTE DENTAL CRM
 * Russian Ministry of Health Statutory Registries & CDA R2 OIDs (043/u)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { isValidSnils, normalizeSnils, formatSnils } from "../../../utils/snils";

/**
 * Федеральные OID реестров ЕГИСЗ Минздрава РФ и HL7 International
 */
export const EGISZ_REMD_OIDS = {
	/** Корневой OID Реестра медицинских организаций (ФРМО ЕГИСЗ) */
	FRMO_MO_ROOT: "1.2.643.5.1.13.13.12.2",
	/** СНИЛС физического лица (ПФР / СФР) */
	SNILS: "1.2.643.100.3",
	/** ОГРН юридического лица */
	OGRN_LEGAL: "1.2.643.100.1",
	/** ОГРНИП индивидуального предпринимателя */
	OGRN_IP: "1.2.643.100.5",
	/** ИНН организации / ИП */
	INN: "1.2.643.100.4",
	/** Шаблон СЭМД 043/у: Стоматологический протокол лечения / карта */
	SEMD_TEMPLATE_DENTAL_043U: "1.2.643.5.1.13.13.11.1527",
	/** Шаблон СЭМД 108: Протокол консультации стоматолога */
	SEMD_TEMPLATE_DENTAL_108: "1.2.643.5.1.13.13.11.108",
	/** Справочник видов СЭМД ЕГИСЗ (Реестр НСИ Минздрава) */
	NSI_SEMD_DOC_TYPES: "1.2.643.5.1.13.13.11.1005",
	/** Справочник полов пациентов (1 - мужской, 2 - женский) */
	GENDER: "1.2.643.5.1.13.13.11.1040",
	/** Вид медицинской помощи (1 - амбулаторная, 2 - стационарная) */
	MEDICAL_CARE_TYPE: "1.2.643.5.1.13.13.11.1461",
	/** Должности медицинских работников (ФРМР Минздрава РФ) */
	MEDICAL_POSITIONS: "1.2.643.5.1.13.13.11.1002",
	/** Международная классификация болезней МКБ-10 */
	ICD10: "1.2.643.5.1.13.13.11.1005",
	/** Номенклатура медицинских услуг (Приказ Минздрава РФ № 804н) */
	NOMENKLATURA_804N: "1.2.643.5.1.13.13.11.1070",
	/** Справочник зубов и анатомических областей челюсти (FDI / ISO 3950) */
	DENTAL_TOOTH: "1.2.643.5.1.13.13.11.1466",
	/** Справочник поверхностей зубов */
	DENTAL_SURFACE: "1.2.643.5.1.13.13.11.1467",
	/** Полис обязательного медицинского страхования (ЕНП ОМС) */
	POLIS_OMS: "1.2.643.5.1.13.13.11.1035",
	/** Документы, удостоверяющие личность (Паспорт РФ, Свидетельство о рождении) */
	IDENTITY_DOC_TYPE: "1.2.643.5.1.13.13.11.1011",
	/** Справочник уровней конфиденциальности HL7 */
	CONFIDENTIALITY: "2.16.840.1.113883.5.25",
	/** Международная терминологическая система LOINC */
	LOINC: "2.16.840.1.113883.6.1",
	/** Алгоритм электронной подписи ГОСТ Р 34.10-2012 (256 бит) */
	GOST_3410_2012_256: "1.2.643.7.1.1.1.1",
	/** Алгоритм электронной подписи ГОСТ Р 34.10-2012 (512 бит) */
	GOST_3410_2012_512: "1.2.643.7.1.1.1.2",
	/** Алгоритм хэширования ГОСТ Р 34.11-2012 (256 бит) */
	GOST_3411_2012_256: "1.2.643.7.1.1.2.2",
	/** Алгоритм хэширования ГОСТ Р 34.11-2012 (512 бит) */
	GOST_3411_2012_512: "1.2.643.7.1.1.2.3",
	// LOINC коды обязательных клинических секций
	LOINC_COMPLAINTS: "10154-3",
	LOINC_ANAMNESIS: "10164-2",
	LOINC_COMORBIDITIES: "11348-0",
	LOINC_DENTAL_STATUS: "29545-1",
	LOINC_DENTAL_ODONTOGRAM: "74208-1",
	LOINC_DIAGNOSIS_SECTION: "29548-5",
	LOINC_SERVICES_RENDERED: "47519-4",
	LOINC_RECOMMENDATIONS: "18776-5",
	LOINC_DISCHARGE_EPIKRISIS: "42344-2",
} as const;

/**
 * Поддерживаемые виды СЭМД стоматологического профиля в ЕГИСЗ РЭМД
 */
export const EGISZ_DENTAL_SEMD_TYPES = {
	"303": {
		code: "303",
		nsiCode: "76",
		title: "Протокол стоматологического лечения и вмешательства (ф. 043/у)",
		shortTitle: "Протокол лечения ф. 043/у",
		description: "Лечебно-диагностическое стоматологическое вмешательство с заполнением зубной формулы, диагноза по МКБ-10 и номенклатуры 804н",
		loincCode: "74208-1",
		loincDisplayName: "Протокол стоматологического вмешательства",
		templateRoot: "1.2.643.5.1.13.13.11.1527",
	},
	"302": {
		code: "302",
		nsiCode: "75",
		title: "Протокол консультации врача-стоматолога (ф. 043/у)",
		shortTitle: "Консультация стоматолога",
		description: "Первичный или повторный консультативно-диагностический осмотр врача-стоматолога",
		loincCode: "74208-1",
		loincDisplayName: "Протокол стоматологического осмотра",
		templateRoot: "1.2.643.5.1.13.13.11.1527",
	},
	"105": {
		code: "105",
		nsiCode: "105",
		title: "Выписной эпикриз в амбулаторной стоматологической практике",
		shortTitle: "Эпикриз ф. 043/у",
		description: "Итоговый этапный или заключительный эпикриз по курсу комплексного стоматологического лечения",
		loincCode: "42344-2",
		loincDisplayName: "Стоматологический эпикриз",
		templateRoot: "1.2.643.5.1.13.13.11.1527",
	},
} as const;

export type EgiszDentalSemdCode = keyof typeof EGISZ_DENTAL_SEMD_TYPES;

/**
 * Коды должностей медицинских работников (ФРМР Минздрава РФ / OID 1.2.643.5.1.13.13.11.1002)
 */
export const FRMR_DOCTOR_POSITIONS = [
	{ code: "71", name: "Врач-стоматолог-терапевт", nsiId: "1.2.643.5.1.13.13.11.1002.71" },
	{ code: "72", name: "Врач-стоматолог-хирург", nsiId: "1.2.643.5.1.13.13.11.1002.72" },
	{ code: "73", name: "Врач-стоматолог-ортопед", nsiId: "1.2.643.5.1.13.13.11.1002.73" },
	{ code: "74", name: "Врач-ортодонт", nsiId: "1.2.643.5.1.13.13.11.1002.74" },
	{ code: "75", name: "Врач-стоматолог детский", nsiId: "1.2.643.5.1.13.13.11.1002.75" },
	{ code: "70", name: "Врач-стоматолог общей практики", nsiId: "1.2.643.5.1.13.13.11.1002.70" },
	{ code: "15", name: "Главный врач (Руководитель МО)", nsiId: "1.2.643.5.1.13.13.11.1002.15" },
] as const;

/**
 * Анатомические квадранты и номера зубов по международной системе FDI / ISO 3950
 */
export const FDI_ADULT_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
	48, 47, 46, 45, 44, 43, 42, 41,
	31, 32, 33, 34, 35, 36, 37, 38,
] as const;

export const FDI_CHILD_TEETH = [
	55, 54, 53, 52, 51,
	61, 62, 63, 64, 65,
	85, 84, 83, 82, 81,
	71, 72, 73, 74, 75,
] as const;

export const ALL_FDI_TEETH = [...FDI_ADULT_TEETH, ...FDI_CHILD_TEETH] as const;

/**
 * Клинические статусы зубов по форме 043/у и номенклатуре ЕГИСЗ
 */
export const DENTAL_TOOTH_STATUS_DICTIONARY: Record<
	string,
	{ code: string; labelRu: string; shortSymbol: string; color: string; egiszCode: string }
> = {
	Healthy: { code: "Healthy", labelRu: "Здоров / Интактен", shortSymbol: "З", color: "#10b981", egiszCode: "0" },
	Caries: { code: "Caries", labelRu: "Кариес", shortSymbol: "C", color: "#ef4444", egiszCode: "1" },
	Pulpitis: { code: "Pulpitis", labelRu: "Пульпит", shortSymbol: "P", color: "#dc2626", egiszCode: "2" },
	Periodontitis: { code: "Periodontitis", labelRu: "Периодонтит", shortSymbol: "Pt", color: "#b91c1c", egiszCode: "3" },
	Filling: { code: "Filling", labelRu: "Пломбирован", shortSymbol: "П", color: "#3b82f6", egiszCode: "4" },
	Crown: { code: "Crown", labelRu: "Искусственная коронка", shortSymbol: "К", color: "#8b5cf6", egiszCode: "5" },
	Artificial: { code: "Artificial", labelRu: "Искусственный зуб (мост)", shortSymbol: "И", color: "#6366f1", egiszCode: "6" },
	Implant: { code: "Implant", labelRu: "Имплантат", shortSymbol: "Imp", color: "#06b6d4", egiszCode: "7" },
	Extracted: { code: "Extracted", labelRu: "Отсутствует / Удален", shortSymbol: "О", color: "#64748b", egiszCode: "8" },
	Root: { code: "Root", labelRu: "Корень (подлежит удалению)", shortSymbol: "R", color: "#991b1b", egiszCode: "9" },
	Retained: { code: "Retained", labelRu: "Ретинированный зуб", shortSymbol: "Рет", color: "#d97706", egiszCode: "10" },
	Dystopic: { code: "Dystopic", labelRu: "Дистопированный зуб", shortSymbol: "Дис", color: "#eab308", egiszCode: "11" },
};

/**
 * Анатомические поверхности зубов
 */
export const DENTAL_SURFACES = [
	{ code: "O", labelRu: "Окклюзионная (Жевательная)", shortName: "Оккл" },
	{ code: "M", labelRu: "Медиальная (Апроксимальная)", shortName: "Мед" },
	{ code: "D", labelRu: "Дистальная (Апроксимальная)", shortName: "Дист" },
	{ code: "V", labelRu: "Вестибулярная (Щечная / Губная)", shortName: "Вест" },
	{ code: "L", labelRu: "Язычная / Нёбная", shortName: "Языч" },
	{ code: "Cerv", labelRu: "Пришеечная область", shortName: "Шейка" },
] as const;

/**
 * Популярные коды МКБ-10 стоматологического профиля
 */
export const COMMON_DENTAL_ICD10 = [
	{ code: "K02.0", name: "Кариес эмали (включая белое пятно)", category: "Кариес" },
	{ code: "K02.1", name: "Кариес дентина", category: "Кариес" },
	{ code: "K02.2", name: "Кариес цемента", category: "Кариес" },
	{ code: "K02.8", name: "Другой кариес зубов", category: "Кариес" },
	{ code: "K04.0", name: "Пульпит (острый / хронический)", category: "Пульпит" },
	{ code: "K04.1", name: "Некроз пульпы (гангрена)", category: "Пульпит" },
	{ code: "K04.4", name: "Острый апикальный периодонтит", category: "Периодонтит" },
	{ code: "K04.5", name: "Хронический апикальный периодонтит", category: "Периодонтит" },
	{ code: "K05.0", name: "Острый гингивит", category: "Пародонт" },
	{ code: "K05.1", name: "Хронический гингивит", category: "Пародонт" },
	{ code: "K05.3", name: "Хронический пародонтит", category: "Пародонт" },
	{ code: "K08.1", name: "Потеря зубов вследствие несчастного случая, удаления или локальной болезни", category: "Ортопедия" },
	{ code: "K00.6", name: "Нарушения прорезывания зубов (ретенция / дистопия)", category: "Хирургия" },
	{ code: "Z01.2", name: "Стоматологическое обследование (профилактический осмотр)", category: "Осмотр" },
] as const;

/**
 * Номенклатура медицинских услуг (Приказ Минздрава РФ № 804н / OID 1.2.643.5.1.13.13.11.1070)
 */
export const COMMON_804N_DENTAL_SERVICES = [
	{ code: "B01.065.001", name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный" },
	{ code: "B01.065.002", name: "Прием (осмотр, консультация) врача-стоматолога-терапевта повторный" },
	{ code: "B01.066.001", name: "Прием (осмотр, консультация) врача-стоматолога-ортопеда первичный" },
	{ code: "B01.067.001", name: "Прием (осмотр, консультация) врача-стоматолога-хирурга первичный" },
	{ code: "A16.07.002.001", name: "Восстановление зуба пломбой с нарушением формы твердых тканей зуба I, V, VI класс по Блэку" },
	{ code: "A16.07.002.002", name: "Восстановление зуба пломбой II, III класс по Блэку с использованием светоотверждаемых материалов" },
	{ code: "A16.07.030.001", name: "Инструментальная и медикаментозная обработка хорошо проходимого корневого канала" },
	{ code: "A16.07.008.002", name: "Пломбирование корневого канала зуба гуттаперчевыми штифтами" },
	{ code: "A16.07.001.001", name: "Удаление постоянного зуба простое" },
	{ code: "A16.07.001.002", name: "Удаление постоянного зуба сложное с разъединением корней" },
	{ code: "A16.07.006", name: "Профессиональная гигиена полости рта и зубов (ультразвуковое удаление отложений + Air-Flow)" },
	{ code: "A16.07.004", name: "Восстановление зуба коронкой постоянной металлокерамической / диоксид циркония" },
] as const;

/**
 * Валидация СНИЛС по официальному контрольному числу РФ
 */
export function validateRussianSnils(rawSnils: string): { isValid: boolean; clean: string; formatted: string; error?: string } {
	const clean = normalizeSnils(rawSnils);
	if (!clean || clean.length !== 11) {
		return { isValid: false, clean: "", formatted: "", error: "СНИЛС должен содержать ровно 11 цифр" };
	}
	if (!isValidSnils(clean)) {
		return { isValid: false, clean, formatted: formatSnils(clean), error: "Неверное контрольное число СНИЛС" };
	}
	return { isValid: true, clean, formatted: formatSnils(clean) };
}

/**
 * Валидация ОГРН (13 знаков юрлицо / 15 знаков ИП)
 */
export function validateRussianOgrn(ogrn: string): boolean {
	const clean = ogrn.replace(/\D/g, "");
	if (clean.length === 13) {
		const num = BigInt(clean.slice(0, 12));
		const checkDigit = Number(clean[12]);
		return Number((num % 11n) % 10n) === checkDigit;
	}
	if (clean.length === 15) {
		const num = BigInt(clean.slice(0, 14));
		const checkDigit = Number(clean[14]);
		return Number((num % 13n) % 10n) === checkDigit;
	}
	return false;
}

/**
 * Валидация ИНН (10 знаков юрлицо / 12 знаков физлицо)
 */
export function validateRussianInn(inn: string): boolean {
	const clean = inn.replace(/\D/g, "");
	if (clean.length === 10) {
		const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
		const sum = weights.reduce((acc, w, idx) => acc + w * Number(clean[idx]), 0);
		return (sum % 11) % 10 === Number(clean[9]);
	}
	if (clean.length === 12) {
		const w11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
		const sum11 = w11.reduce((acc, w, idx) => acc + w * Number(clean[idx]), 0);
		const c11 = (sum11 % 11) % 10;
		if (c11 !== Number(clean[10])) return false;

		const w12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
		const sum12 = w12.reduce((acc, w, idx) => acc + w * Number(clean[idx]), 0);
		const c12 = (sum12 % 11) % 10;
		return c12 === Number(clean[11]);
	}
	return false;
}

/**
 * Валидация OID формата (например 1.2.643.5.1.13.13.12.2.77.1234)
 */
export function validateOidFormat(oid: string): boolean {
	if (!oid || typeof oid !== "string") return false;
	return /^[0-2](\.(0|[1-9]\d*))+$/.test(oid.trim());
}

/**
 * Эталонные преднастройки клиники и врача для тестов и генерации
 */
export const DEFAULT_EGISZ_CLINIC_PRESET = {
	clinicName: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
	clinicOid: "1.2.643.5.1.13.13.12.2.77.10425",
	clinicOgrn: "1157746123457",
	clinicInn: "7701234560",
	clinicKpp: "770101001",
	clinicAddress: "125009, г. Москва, ул. Тверская, д. 12, стр. 2",
	clinicPhone: "+7 (495) 789-45-60",
	clinicEmail: "info@dente-clinic.ru",
	chiefDoctorName: "Смирнова Елена Викторовна",
	chiefDoctorSnils: "123-456-789 64",
};

export const DEFAULT_EGISZ_DOCTOR_PRESET = {
	doctorFullName: "Иванов Сергей Павлович",
	doctorSnils: "123-456-789 64",
	doctorPosition: "Врач-стоматолог-терапевт",
	doctorPositionCode: "71",
	doctorPhone: "+7 (926) 555-12-34",
	doctorEmail: "dr.ivanov@dente-clinic.ru",
};

export const SAMPLE_043U_PATIENT_PRESET = {
	patientId: "PAT-043-8942",
	cardNumber: "043-2026/184",
	patientFullName: "Соколова Анна Владимировна",
	patientSnils: "123-456-789 64",
	patientBirthDate: "1988-06-14",
	patientGender: "female" as const,
	patientPolisOms: "1658493021948572",
	patientPassport: "4512 894512",
	patientAddress: "119049, г. Москва, Ленинский проспект, д. 24, кв. 86",
	patientPhone: "+7 (903) 123-45-67",
	patientEmail: "anna.sokolova@gmail.com",
};
