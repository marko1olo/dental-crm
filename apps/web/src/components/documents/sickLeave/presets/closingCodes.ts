import type {
	SickLeaveClosingCode,
	SickLeaveClosingMeta,
	RegimeViolationCode,
	RegimeViolationMeta,
	CommissionMemberPreset
} from "./types";

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

export const REGIME_VIOLATION_CODES: Record<RegimeViolationCode, RegimeViolationMeta> = {
	'23': {
		code: '23',
		titleRu: '23 - Несоблюдение режима',
		descriptionRu: 'Несоблюдение предписанного лечебного режима'
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

export const DEFAULT_COMMISSION_PRESETS: CommissionMemberPreset[] = [
	{
		role: 'CHAIRPERSON',
		roleTitleRu: 'Главный врач клиники',
		fio: 'Главный врач',
		specialty: 'Главный врач, стоматолог',
		snils: ''
	},
	{
		role: 'DEPUTY_CHAIRPERSON',
		roleTitleRu: 'Заместитель главного врача',
		fio: 'Зам. главного врача',
		specialty: 'Зав. отделением, стоматолог',
		snils: ''
	},
	{
		role: 'COMMISSION_MEMBER',
		roleTitleRu: 'Врач-эксперт',
		fio: 'Врач-эксперт',
		specialty: 'Врач-стоматолог',
		snils: ''
	},
	{
		role: 'ATTENDING_DOCTOR',
		roleTitleRu: 'Лечащий врач',
		fio: 'Лечащий врач',
		specialty: 'Врач-стоматолог',
		snils: ''
	}
];
