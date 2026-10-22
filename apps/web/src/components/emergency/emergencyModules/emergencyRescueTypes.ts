/**
 * Russian Dental Emergency Clinical Protocols & Resuscitation Suite
 * Layer 0: Emergency Rescue Types, DTOs & Component Props
 */

import type React from 'react';
import type { EmergencyDrugId, EmergencyDosageResult, LipidRescueDoseCalculation, StatutoryEmergencyKitItem } from './emergencyDrugTypes';
import type { EmergencyScenarioId, EmergencyUrgencyLevel, EmergencyActionStep, EmergencyScenario } from './emergencyScenarioTypes';
import type { EmergencyVitals, ExecutedEmergencyStep, EmergencyIncidentInput } from './emergencyIncidentTypes';

export type {
	EmergencyDrugId,
	EmergencyDosageResult,
	LipidRescueDoseCalculation,
	StatutoryEmergencyKitItem,
	EmergencyScenarioId,
	EmergencyUrgencyLevel,
	EmergencyActionStep,
	EmergencyScenario,
	EmergencyVitals,
	ExecutedEmergencyStep,
	EmergencyIncidentInput,
};

export interface EmergencyRelativeNoticeParams {
	clinicName: string;
	clinicAddress: string;
	clinicPhone: string;
	cabinetNumber: string;
	patientName: string;
	scenarioTitleRu: string;
	doctorFullName: string;
}

export function formatEmergencyRelativeNotice(
	params: EmergencyRelativeNoticeParams
): string {
	return `Экстренное медицинское извещение (клиника «${params.clinicName}»):\n` +
		`Пациент: ${params.patientName}\n` +
		`Клиническое состояние: ${params.scenarioTitleRu}\n` +
		`Оказана неотложная медицинская помощь врачебной бригадой клиники по стандарту Минздрава РФ.\n` +
		`Вызвана бригада скорой медицинской помощи (СМП 112).\n` +
		`Адрес нахождения пациента: ${params.clinicAddress}, кабинет ${params.cabinetNumber}.\n` +
		`Лечащий врач: ${params.doctorFullName}.\n` +
		`Контактный телефон клиники для связи: ${params.clinicPhone || "не указан"}.`;
}

export interface EmergencyRescueModalProps {
	isOpen: boolean;
	onClose: () => void;
	onApplyToDiary?: ((actText: string) => void) | undefined;
	initialPatientName?: string | undefined;
	initialPatientAgeYears?: number | undefined;
	initialPatientWeightKg?: number | undefined;
	initialPatientGender?: 'male' | 'female' | undefined;
	clinicName?: string | undefined;
	clinicAddress?: string | undefined;
	clinicPhone?: string | undefined;
	cabinetNumber?: string | undefined;
	floorNumber?: string | number | null | undefined;
	entranceNumber?: string | number | null | undefined;
	intercomCode?: string | null | undefined;
	doctorFullName?: string | undefined;
	assistantFullName?: string | undefined;
	medCardNumber?: string | undefined;
	defaultScenarioId?: EmergencyScenarioId | undefined;
}

export interface EmergencyProtocolStepListProps {
	actionSteps: EmergencyActionStep[];
	completedStepIds: Record<string, string>;
	onToggleStep: (stepId: string) => void;
}

export interface EmergencyDispatcherBoxProps {
	generatedCheatSheetText: string;
	isCopiedCheatSheet: boolean;
	onCopyCheatSheet: () => void;
	onPrintEmergencyAct: () => void;
	isKitWrittenOff: boolean;
	isWritingOffKit: boolean;
	onWriteoffAntishockKit: () => void;
	onApplyToDiary?: ((text: string) => void) | undefined;
	onApplyToForm043: () => void;
	isCopiedAct: boolean;
	onCopyAct: () => void;
	isCopiedRelative: boolean;
	onCopyRelativeNotice: () => void;
}

export interface EmergencyResuscitationToolsProps {
	adrenalineTimerSeconds: number;
	isAdrenalineTimerRunning: boolean;
	isAdrenalineDue: boolean;
	onStartAdrenalineTimer: (seconds: number) => void;
	onResetAdrenalineTimer: () => void;
	onWriteoffAntishockKit?: (() => void) | undefined;
	isWritingOffKit?: boolean | undefined;
	isKitWrittenOff?: boolean | undefined;
}

export interface EmergencyVitalsSectionProps {
	patientWeightKg: number;
	setPatientWeightKg: (weight: number) => void;
	patientAgeYears: number;
	setPatientAgeYears: (age: number) => void;
	vitals: EmergencyVitals;
	setVitals: React.Dispatch<React.SetStateAction<EmergencyVitals>>;
}
