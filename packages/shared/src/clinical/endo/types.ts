/**
 * DENTE Dental CRM — Clinical Endodontic Types & Contracts (Layer 0)
 * @dental/shared/clinical/endo/types.ts
 *
 * Чистые контракты типов данных эндодонтии (ISO 3630-1, Форма 043/у, клинические рекомендации СтАР):
 * - Данные корневых каналов (рабочая длина, апекслокация, MAF, конусность, обтурация)
 * - Пресеты клинических протоколов 1-клик (первичное эндо, ретритмент, постоянная обтурация)
 * - Цветовая кодировка инструментов ISO 3630-1 (ISO 06..140)
 * - Оценка качества эндодонтического лечения (СтАР)
 */

export interface EndoCanalData {
	readonly id: string;
	canalName: string;
	referencePoint: string;
	workingLengthMm: number | string;
	masterApicalFile: string;
	taper: string;
	obturationTechnique: string;
	sealer?: string | undefined;
	notes?: string | undefined;
}

/** Алиас для канонической записи корневого канала */
export type RootCanalRecord = EndoCanalData;

export interface EndoToothClinicalData {
	toothNumber?: number;
	toothTitle?: string;
	canals: EndoCanalData[];
	irrigation?: string;
	rotarySystem?: string;
	radiologyControl?: string;
	apexLocator?: string;
	updatedAt?: string;
}

export type EndoProtocolPresetId =
	| "primary_endo"
	| "retreatment_endo"
	| "obturation_permanent"
	| "express_apical"
	| "pulpitis_visit1"
	| "pulpitis_obturation"
	| "periodontitis_destructive"
	| "pulpitis_complete"
	| "periodontitis_temp"
	| "standard"
	| "caoh2";

export interface EndoProtocolPreset {
	readonly id: EndoProtocolPresetId;
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly descriptionRu: string;
	readonly rotarySystem: string;
	readonly irrigation: string;
	readonly radiologyControl: string;
	readonly obturationTechnique: string;
	readonly sealer: string;
	readonly masterApicalFile: string;
	readonly taper: string;
	readonly notes: string;
}

/**
 * Цветовая кодировка эндодонтических инструментов по стандарту ISO 3630-1
 * Размеры от ISO 06 до ISO 140
 */
export type IsoEndoSize =
	| 6
	| 8
	| 10
	| 15
	| 20
	| 25
	| 30
	| 35
	| 40
	| 45
	| 50
	| 55
	| 60
	| 70
	| 80
	| 90
	| 100
	| 110
	| 120
	| 130
	| 140;

export interface IsoEndoColorInfo {
	readonly size: IsoEndoSize;
	readonly code: string;
	readonly colorRu: string;
	readonly colorEn: string;
	readonly hex: string;
	readonly textHex: string;
	readonly bgClass: string;
	readonly borderClass: string;
	readonly labelRu: string;
}

export interface EndoPatientMemoParams {
	readonly clinicName: string;
	readonly clinicPhone: string;
	readonly patientName: string;
	readonly doctorName: string;
	readonly toothNumber: number;
	readonly toothAnatomicalNameRu?: string | undefined;
	readonly isTemporaryCaOh2?: boolean | undefined;
	readonly isPermanentObturation?: boolean | undefined;
	readonly nextVisitDays?: number | string | undefined;
	readonly date?: string | undefined;
}

// ─── ОЦЕНКА КАЧЕСТВА ОБТУРАЦИИ ПО КЛИНИЧЕСКИМ РЕКОМЕНДАЦИЯМ СтАР ─────────────

/** Статус соответствия длины пломбирования рентгенологическому апексу */
export type EndoObturationLengthStatus =
	| "optimal" // Пломбирование на 0.5–1.5 мм до апекса (физиологическое сужение)
	| "adequate" // Пломбирование в пределах 0–2.0 мм до апекса (норма СтАР)
	| "underfilled" // Недопломбировка более 2 мм до апекса
	| "overfilled" // Выведение пломбировочного материала за апекс
	| "unmeasured"; // Длина не указана

/** Статус плотности и гомогенности обтурации */
export type EndoObturationDensityStatus =
	| "dense_homogeneous" // Плотная гомогенная трехмерная обтурация
	| "temporary_calcium" // Временная обтурация гидроксидом кальция (Metapex/Calcept)
	| "inhomogeneous_voids" // Наличие пор и пустот в обтурационном материале
	| "unspecified"; // Не указано

/** Оценка качества обтурации отдельного корневого канала */
export interface EndoCanalEvaluation {
	readonly canalId: string;
	readonly canalName: string;
	readonly workingLengthMm: number | null;
	readonly anatomicalLengthMm: number;
	readonly lengthDifferenceMm: number | null;
	readonly lengthStatus: EndoObturationLengthStatus;
	readonly densityStatus: EndoObturationDensityStatus;
	readonly isCompliantStar: boolean;
	readonly clinicalNoteRu: string;
}

/** Итоговая клиническая оценка эндодонтического случая */
export interface EndoCaseEvaluationResult {
	readonly toothNumber: number;
	readonly totalCanals: number;
	readonly evaluatedCanals: readonly EndoCanalEvaluation[];
	readonly isFullyCompliantStar: boolean;
	readonly hasOverfill: boolean;
	readonly hasUnderfill: boolean;
	readonly summaryRu: string;
	readonly clinicalRecommendationsRu: readonly string[];
}
