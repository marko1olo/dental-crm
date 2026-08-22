/**
 * STATUTORY RUSSIAN TEMPORARY INCAPACITY PRESETS & DENTAL CLINICAL NORMS
 * Conforming to Ministry of Health of the Russian Federation Order № 1089н
 * (Приказ Минздрава России от 23.11.2021 № 1089н "Об утверждении Условий и порядка
 * формирования листков нетрудоспособности в форме электронного документа")
 *
 * Domain: Statutory Electronic Sick Leave (ЭЛН) & Medical Commission (ВК)
 */

export type IncapacityReasonCode = '01' | '02' | '03' | '05' | '08' | '09' | '10' | '11';

export type IncapacityRegimeType = 'ambulatory' | 'hospital' | 'day_hospital' | 'sanatorium';

export type SickLeaveClosingCode = '31' | '32' | '33' | '34' | '36';

export type RegimeViolationCode = '23' | '24' | '25' | '28';

export type MedicalCommissionRole = 'CHAIRPERSON' | 'DEPUTY_CHAIRPERSON' | 'COMMISSION_MEMBER' | 'ATTENDING_DOCTOR' | 'SECRETARY';

/**
 * Statutory Reason Codes according to SFR / FSS (Коды причин нетрудоспособности СФР)
 */
export interface IncapacityReasonMeta {
	code: IncapacityReasonCode;
	titleRu: string;
	descriptionRu: string;
	isDentalCommon: boolean;
}

export const INCAPACITY_REASON_CODES: Record<IncapacityReasonCode, IncapacityReasonMeta> = {
	'01': {
		code: '01',
		titleRu: '01 - Заболевание',
		descriptionRu: 'Заболевание челюстно-лицевой области, одонтогенная инфекция, периостит, пульпит с интоксикацией',
		isDentalCommon: true
	},
	'02': {
		code: '02',
		titleRu: '02 - Травма',
		descriptionRu: 'Травма ЧЛО, перелом челюсти/альвеолярного отростка, вывих зуба, ранение мягких тканей',
		isDentalCommon: true
	},
	'03': {
		code: '03',
		titleRu: '03 - Карантин',
		descriptionRu: 'Карантинные мероприятия и изоляция контактных лиц',
		isDentalCommon: false
	},
	'05': {
		code: '05',
		titleRu: '05 - Отпуск по беременности и родам',
		descriptionRu: 'Дородовый и послеродовый период',
		isDentalCommon: false
	},
	'08': {
		code: '08',
		titleRu: '08 - Долечивание в санаторно-курортных организациях',
		descriptionRu: 'Направление на долечивание непосредственно после стационарного лечения',
		isDentalCommon: true
	},
	'09': {
		code: '09',
		titleRu: '09 - Уход за больным членом семьи',
		descriptionRu: 'Уход за ребенком или взрослым членом семьи при амбулаторном лечении',
		isDentalCommon: false
	},
	'10': {
		code: '10',
		titleRu: '10 - Иное состояние',
		descriptionRu: 'Отравление, проведение сложных инвазивных амбулаторных манипуляций',
		isDentalCommon: false
	},
	'11': {
		code: '11',
		titleRu: '11 - Заболевание вследствие опьянения',
		descriptionRu: 'Заболевание или травма, наступившие в результате алкогольного или токсического опьянения',
		isDentalCommon: false
	}
};

/**
 * Statutory Closing Codes (Результат экспертизы временной нетрудоспособности)
 */
export interface SickLeaveClosingMeta {
	code: SickLeaveClosingCode;
	titleRu: string;
	descriptionRu: string;
	requiresResumeDate: boolean;
	requiresNextElnNumber: boolean;
}

export const SICK_LEAVE_CLOSING_CODES: Record<SickLeaveClosingCode, SickLeaveClosingMeta> = {
	'31': {
		code: '31',
		titleRu: '31 - Приступить к работе',
		descriptionRu: 'Трудоспособность восстановлена полностью. Указывается дата выхода на работу.',
		requiresResumeDate: true,
		requiresNextElnNumber: false
	},
	'32': {
		code: '32',
		titleRu: '32 - Продолжает болеть',
		descriptionRu: 'Выдан новый листок нетрудоспособности (продолжение).',
		requiresResumeDate: false,
		requiresNextElnNumber: true
	},
	'33': {
		code: '33',
		titleRu: '33 - Направлен на МСЭ',
		descriptionRu: 'Направлен на медико-социальную экспертизу для освидетельствования.',
		requiresResumeDate: false,
		requiresNextElnNumber: false
	},
	'34': {
		code: '34',
		titleRu: '34 - Установлена группа инвалидности',
		descriptionRu: 'По результатам МСЭ установлена группа инвалидности.',
		requiresResumeDate: false,
		requiresNextElnNumber: false
	},
	'36': {
		code: '36',
		titleRu: '36 - Явился трудоспособным',
		descriptionRu: 'Пациент явился на прием трудоспособным с нарушением срока явки.',
		requiresResumeDate: true,
		requiresNextElnNumber: false
	}
};

/**
 * Statutory Regime Violations (Коды нарушения режима по Приказу 1089н)
 */
export interface RegimeViolationMeta {
	code: RegimeViolationCode;
	titleRu: string;
	descriptionRu: string;
}

export const REGIME_VIOLATION_CODES: Record<RegimeViolationCode, RegimeViolationMeta> = {
	'23': {
		code: '23',
		titleRu: '23 - Несоблюдение режима',
		descriptionRu: 'Несоблюдение предписанного лечебного режима, самовольный уход из МО'
	},
	'24': {
		code: '24',
		titleRu: '24 - Несвоевременная явка на прием',
		descriptionRu: 'Несвоевременная явка на прием к врачу в назначенную дату'
	},
	'25': {
		code: '25',
		titleRu: '25 - Выход на работу без выписки',
		descriptionRu: 'Выход на работу без выписки к труду лечащим врачом'
	},
	'28': {
		code: '28',
		titleRu: '28 - Другие нарушения',
		descriptionRu: 'Иные нарушения лечебно-охранительного режима'
	}
};

/**
 * Clinical Duration Norms in Dentistry (Ориентировочные сроки временной нетрудоспособности в стоматологии)
 */
export interface DentalClinicalPreset {
	id: string;
	titleRu: string;
	shortTitleRu: string;
	icd10Code: string;
	icd10TitleRu: string;
	reasonCode: IncapacityReasonCode;
	recommendedMinDays: number;
	recommendedMaxDays: number;
	defaultDays: number;
	isVkMandatory: boolean;
	clinicalDescriptionRu: string;
	expertJustificationRu: string;
}

export const DENTAL_CLINICAL_PRESETS: Record<string, DentalClinicalPreset> = {
	acute_purulent_periostitis: {
		id: 'acute_purulent_periostitis',
		titleRu: 'Острый гнойный периостит челюсти (одонтогенный абсцесс)',
		shortTitleRu: 'Периостит челюсти',
		icd10Code: 'K10.2',
		icd10TitleRu: 'Воспалительные заболевания челюстей (периостит)',
		reasonCode: '01',
		recommendedMinDays: 3,
		recommendedMaxDays: 6,
		defaultDays: 5,
		isVkMandatory: false,
		clinicalDescriptionRu: 'Острый гнойный одонтогенный периостит челюсти. Проведена периостотомия, дренирование резиновым выпускником, антисептическая обработка, антибактериальная и анальгетическая терапия.',
		expertJustificationRu: 'Выраженный болевой синдром, коллатеральный отек мягких тканей лица, интоксикация, необходимость ежедневных перевязок и дренирования раны.'
	},
	atypical_impacted_extraction: {
		id: 'atypical_impacted_extraction',
		titleRu: 'Сложное атипичное удаление ретинированного зуба с остеотомией',
		shortTitleRu: 'Атипичная экстракция',
		icd10Code: 'K01.1',
		icd10TitleRu: 'Ретинированные зубы (дистопия, полуретиненция)',
		reasonCode: '01',
		recommendedMinDays: 3,
		recommendedMaxDays: 5,
		defaultDays: 4,
		isVkMandatory: false,
		clinicalDescriptionRu: 'Атипичная операция удаления ретинированного и дистопированного зуба с остеотомией кортикальной пластинки, фрагментацией зуба и ушиванием раны наглухо.',
		expertJustificationRu: 'Послеоперационный реактивный отек, тризм жевательной мускулатуры 1-2 степени, выраженный болевой синдром, ограничение открывания рта.'
	},
	odontogenic_sinusitis_perforation: {
		id: 'odontogenic_sinusitis_perforation',
		titleRu: 'Одонтогенный гайморит / перфорация дна гайморовой пазухи с пластикой',
		shortTitleRu: 'Перфорация пазухи / Гайморит',
		icd10Code: 'T81.2',
		icd10TitleRu: 'Случайный прокол или разрыв при выполнении процедуры (перфорация пазухи)',
		reasonCode: '01',
		recommendedMinDays: 7,
		recommendedMaxDays: 10,
		defaultDays: 8,
		isVkMandatory: false,
		clinicalDescriptionRu: 'Перфорация дна верхнечелюстной пазухи при удалении зуба, пластика ороантрального соустья трапециевидным слизисто-надкостничным лоскутом.',
		expertJustificationRu: 'Необходимость постельного/охранительного режима, исключение повышения внутриносового давления, ежедневная антибактериальная и деконгестантная терапия, контроль герметичности швов.'
	},
	osteomyelitis_subacute_vk: {
		id: 'osteomyelitis_subacute_vk',
		titleRu: 'Подострый остеомиелит челюсти / тяжелый альвеолит (требует ВК)',
		shortTitleRu: 'Остеомиелит челюсти (ВК)',
		icd10Code: 'K10.2',
		icd10TitleRu: 'Воспалительные заболевания челюстей (остеомиелит)',
		reasonCode: '01',
		recommendedMinDays: 16,
		recommendedMaxDays: 24,
		defaultDays: 18,
		isVkMandatory: true,
		clinicalDescriptionRu: 'Подострый одонтогенный остеомиелит челюсти. Вскрытие очагов, кюретаж лунки, секвестрэктомия, длительная антибактериальная терапия, физиолечение.',
		expertJustificationRu: 'Длительное течение воспалительного процесса, интоксикационный синдром, секвестрация костной ткани, превышение 15-дневного лимита единоличной экспертизы лечащего врача. Требуется продление решением Врачебной комиссии (ВК) согласно Приказу 1089н.'
	},
	maxillofacial_trauma_fracture: {
		id: 'maxillofacial_trauma_fracture',
		titleRu: 'Травма ЧЛО: вывих зуба с шинированием / перелом альвеолярного отростка',
		shortTitleRu: 'Травма ЧЛО / Вывих зуба',
		icd10Code: 'S03.2',
		icd10TitleRu: 'Вывих зуба (травматический)',
		reasonCode: '02',
		recommendedMinDays: 10,
		recommendedMaxDays: 14,
		defaultDays: 12,
		isVkMandatory: false,
		clinicalDescriptionRu: 'Травматический вывих зубов, репозиция и фиксация назубной композитно-проволочной шиной. Ограничение механической нагрузки на зубочелюстной аппарат.',
		expertJustificationRu: 'Наличие иммобилизирующей шины, нарушение функции жевания и речи, болевой синдром, необходимость регулярного контроля окклюзии и состояния пульпы.'
	},
	acute_vincent_stomatitis: {
		id: 'acute_vincent_stomatitis',
		titleRu: 'Острый язвенно-некротический гингивостоматит Венсана',
		shortTitleRu: 'Стоматит Венсана',
		icd10Code: 'A69.1',
		icd10TitleRu: 'Другие инфекции Венсана (язвенно-некротический гингивостоматит)',
		reasonCode: '01',
		recommendedMinDays: 4,
		recommendedMaxDays: 7,
		defaultDays: 5,
		isVkMandatory: false,
		clinicalDescriptionRu: 'Острый язвенно-некротический гингивостоматит Венсана с лимфаденитом и общей интоксикацией. Ферментативный дебридмент, антибактериальная обработка.',
		expertJustificationRu: 'Выраженная интоксикация (гипертермия 38.0°C), резкая болезненность при приеме пищи и речи, регионарный лимфаденит, необходимость частых медикаментозных орошений.'
	},
	floor_mouth_phlegmon_rehab: {
		id: 'floor_mouth_phlegmon_rehab',
		titleRu: 'Флегмона околочелюстной области (амбулаторный этап реабилитации)',
		shortTitleRu: 'Околочелюстная флегмона (долечивание)',
		icd10Code: 'K12.2',
		icd10TitleRu: 'Флегмона и абсцесс полости рта',
		reasonCode: '01',
		recommendedMinDays: 10,
		recommendedMaxDays: 15,
		defaultDays: 14,
		isVkMandatory: false,
		clinicalDescriptionRu: 'Амбулаторное долечивание после стационарного хирургического лечения одонтогенной флегмоны околоушно-жевательной области. Гранулирующие раны, ежедневные асептические перевязки.',
		expertJustificationRu: 'Наличие дренированных послеоперационных ран, умеренный тризм, астенический синдром после системной инфекции, необходимость регулярных перевязок.'
	}
};

/**
 * Default Medical Commission Composition Presets
 */
export interface CommissionMemberPreset {
	role: MedicalCommissionRole;
	roleTitleRu: string;
	fio: string;
	specialty: string;
	snils: string;
}

export const DEFAULT_COMMISSION_PRESETS: CommissionMemberPreset[] = [
	{
		role: 'CHAIRPERSON',
		roleTitleRu: 'Председатель ВК (Главный врач)',
		fio: 'Иванова Елена Васильевна',
		specialty: 'Главный врач, стоматолог-терапевт высшей категории',
		snils: '142-876-543 89'
	},
	{
		role: 'DEPUTY_CHAIRPERSON',
		roleTitleRu: 'Зам. председателя ВК',
		fio: 'Смирнов Петр Александрович',
		specialty: 'Зав. ортопедическим отделением, стоматолог-ортопед',
		snils: '154-321-987 65'
	},
	{
		role: 'COMMISSION_MEMBER',
		roleTitleRu: 'Член ВК (Врач-эксперт)',
		fio: 'Кузнецова Ольга Дмитриевна',
		specialty: 'Врач-стоматолог-хирург, эксперт КЭР',
		snils: '167-456-123 01'
	},
	{
		role: 'ATTENDING_DOCTOR',
		roleTitleRu: 'Лечащий врач',
		fio: 'Соколов Андрей Михайлович',
		specialty: 'Врач-стоматолог-хирург',
		snils: '139-204-857 44'
	}
];
