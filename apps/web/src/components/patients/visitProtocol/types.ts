import type { ClinicalMaterialDeduction } from "../../visit/clinicalSoapPresets";

export interface VisitProtocolData {
	visitId?: string | null | undefined;
	patientId?: string | null | undefined;
	date?: string | undefined;
	toothNumber?: number | string | undefined;
	complaints: string;
	anamnesis: string;
	statusLocalis: string;
	diagnosisIcd10: string;
	treatmentProtocol: string;
	recommendations: string;
	anestheticDrug: string;
	anestheticCarpules: number;
	deductedMaterials: ClinicalMaterialDeduction[];
	isSigned?: boolean | undefined;
}

export interface VisitProtocolViewProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly visitId?: string | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly initialTooth?: number | string | null | undefined;
	readonly initialDate?: string | null | undefined;
	readonly initialDiagnosis?: string | null | undefined;
	readonly onSaveProtocol?: ((data: VisitProtocolData) => void) | undefined;
	readonly onPrint?: (() => void) | undefined;
}

export const COMMON_ICD10_PRESETS = [
	{ code: "Z01.2", title: "Стоматологическое обследование (Норма)", presetId: "norm_healthy", shortBadge: "Норма" },
	{ code: "K02.1", title: "Кариес дентина (средний)", presetId: "caries_medium", shortBadge: "Кариес" },
	{ code: "K04.0", title: "Острый очаговый пульпит", presetId: "pulpitis_acute", shortBadge: "Пульпит" },
	{ code: "K04.03", title: "Пульпит (Обработка каналов)", presetId: "pulpitis_visit1", shortBadge: "Эндо" },
	{ code: "K04.5", title: "Хронический периодонтит", presetId: "periodontitis_chronic", shortBadge: "Периодонтит" },
	{ code: "K05.3", title: "Хронический пародонтит", presetId: "perio_srp_curettage", shortBadge: "Пародонтит" },
	{ code: "K03.6", title: "Зубные отложения (Профгигиена)", presetId: "hygiene_complex", shortBadge: "Гигиена" },
	{ code: "K08.1", title: "Удаление зуба (Хирургия)", presetId: "surgery_extraction_simple", shortBadge: "Удаление" },
] as const;

export const STANDARD_ANESTHETICS = [
	{
		key: "ultracain_ds_forte",
		nameRu: "✓ Норма: Артикаин 1:100 000 (1 карпула 1.7 мл)",
		material: { name: "Артикаин 1:100 000 (Ультракаин Форте)", category: "anesthesia" as const, quantity: 1, unit: "карп." as const },
	},
	{
		key: "ultracain_ds",
		nameRu: "Щадящий адреналин: Артикаин 1:200 000 (1 карпула 1.7 мл)",
		material: { name: "Артикаин 1:200 000 (Ультракаин Д-С)", category: "anesthesia" as const, quantity: 1, unit: "карп." as const },
	},
	{
		key: "scandonest_3",
		nameRu: "Кардио-защита: Мепивакаин без адреналина (1 карпула 1.7 мл)",
		material: { name: "Мепивакаин 3% (Скандонест)", category: "anesthesia" as const, quantity: 1, unit: "карп." as const },
	},
] as const;
