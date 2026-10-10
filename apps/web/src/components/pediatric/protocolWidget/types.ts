import type React from "react";
import type { FranklRating } from "../../odontogram/pediatricDentitionEngine";
import type { SomaticRiskProfile } from "../../visit/anesthesiaCalculatorEngine";

/**
 * Валидация номера зуба по стандарту FDI (ISO 3950):
 * - Постоянные зубы: квадранты 1..4, позиции 1..8
 * - Временные (молочные) зубы: квадранты 5..8, позиции 1..5
 */
export interface FranklExpressItem {
	readonly rating: FranklRating;
	readonly symbol: "--" | "-" | "+" | "++";
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly descriptionRu: string;
	readonly clinicalTacticRu: string;
	readonly icon: React.ComponentType<{ className?: string }>;
	readonly activeClass: string;
	readonly badgeClass: string;
}

export type PediatricProtocolId =
	| "caries_primary"
	| "pulpotomy_primary"
	| "silvering_deep_fluoridation"
	| "fissure_sealing"
	| "extraction_primary_exfoliation"
	| "standard_crown";

export interface PediatricServiceItem {
	readonly code: string;
	readonly nameRu: string;
}

export interface PediatricProtocolDefinition {
	readonly id: PediatricProtocolId;
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly subtitleRu: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisNameRu: string;
	readonly serviceCode804n: string;
	readonly serviceName804n: string;
	readonly defaultSurfaces: readonly string[];
	readonly allowsSurfaces: boolean;
	readonly materials: readonly string[];
	readonly defaultMaterial: string;
	readonly defaultToothFindingState:
		| "Filled"
		| "EndoTreated"
		| "Watch"
		| "Healthy"
		| "Extracted"
		| "Crown";
	readonly icon: React.ComponentType<{ className?: string }>;
	readonly colorTheme: string;
}

export interface PediatricSurfacePreset {
	readonly id: string;
	readonly labelRu: string;
	readonly surfaces: readonly string[];
	readonly descriptionRu: string;
}

export interface PediatricSedationState {
	enabled: boolean;
	gasRatioN2O: number; // e.g. 30..50%
	gasRatioO2: number; // e.g. 50..70%
	spO2Percent: number; // e.g. 98..100%
	pulseBpm: number; // e.g. 80..110
	durationMinutes: number; // e.g. 20
	postOxygenationMinutes: number; // e.g. 3..5
}

export interface VisitPediatricProtocolWidgetProps {
	/** Активный номер зуба по FDI (по умолчанию 54) */
	readonly activeTooth?: number | null;
	/** Выбранные поверхности зуба */
	readonly activeSurfaces?: readonly string[] | undefined;
	/** Обработчик смены поверхностей */
	readonly onSelectSurfaces?: (surfaces: readonly string[]) => void;
	/** Обработчик прямой вставки текста протокола в дневник визита */
	readonly onApplyProtocolText?: (text: string) => void;
	/** Обработчик добавления услуг в смету/наряд */
	readonly onAddToInvoice?: (services: readonly PediatricServiceItem[]) => void;
	/** Начальный рейтинг по шкале Франкла (по умолчанию 3) */
	readonly initialFranklRating?: FranklRating | undefined;
	/** Обработчик смены рейтинга Франкла */
	readonly onFranklChange?: (rating: FranklRating) => void;
	/** Имя юного пациента */
	readonly patientName?: string | undefined;
	/** Телефон пациента / представителя для отправки памятки */
	readonly patientPhone?: string | undefined;
	/** Возраст пациента в годах */
	readonly patientAgeYears?: number | undefined;
	/** Вес ребенка в килограммах для расчета безопасности анестезии */
	readonly patientWeightKg?: number | undefined;
	/** ФИО врача */
	readonly doctorName?: string | undefined;
	/** Название клиники */
	readonly clinicName?: string | undefined;
	/** Данные законного представителя (ФИО) для автоподстановки в 043/у */
	readonly representativeFullName?: string | undefined;
	/** Телефон законного представителя */
	readonly representativePhone?: string | undefined;
	/** Роль представителя ("Мать" | "Отец" | "Опекун" ...) */
	readonly representativeRole?: string | undefined;
	/** Соматический профиль риска ребенка */
	readonly somaticProfile?: SomaticRiskProfile | undefined;
	/** Текстовые аллергии из карты */
	readonly allergies?: string | undefined;
	/** Опционально: показать аккордеон подробностей протокола сразу */
	readonly initialShowDetails?: boolean;
	/** Дополнительный CSS-класс контейнера */
	readonly className?: string;
}
