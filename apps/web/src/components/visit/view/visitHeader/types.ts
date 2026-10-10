import type React from "react";
import type { VisitSubViewTab } from "../../VisitMainTabs";

export type { VisitSubViewTab };

/**
 * Очередь смены врача по стадиям (StomX / DENTE)
 */
export interface ShiftDayQueue {
	arrived: number;
	inTreatment: number;
	awaitingPayment: number;
	// biome-ignore lint/suspicious/noExplicitAny: patient list
	arrivedPatients: any[];
}

/**
 * Критический медицинский алерт пациента (аллергия, соматика, стоп-факторы)
 */
export interface PatientCriticalBadge {
	id: string;
	testId?: string;
	shortLabel?: string;
	fullLabel: string;
	title: string;
	severity?: "critical" | "warning" | "info";
}

/**
 * Пропсы канонической шапки приёма врача VisitHeaderMonolith
 */
export interface VisitHeaderMonolithProps {
	// biome-ignore lint/suspicious/noExplicitAny: patient
	activePatient: any;
	patientAge: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: appointment & doctor
	activeAppointment: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor
	activeDoctor: any;
	// biome-ignore lint/suspicious/noExplicitAny: badges
	activePatientCriticalBadges: any[];
	visitSubViewTab: VisitSubViewTab;
	setVisitSubViewTab: (tab: VisitSubViewTab) => void;
	handleApplySomaticNormQuick: () => void;
	handlePrintForm043uFast: () => void;
	setIsEmergencyModalOpen: (v: boolean) => void;
	shiftDayQueue: ShiftDayQueue;
	isQueueLobbyDropdownOpen: boolean;
	setIsQueueLobbyDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
	queueLobbyDropdownRef: React.RefObject<HTMLDivElement | null>;
	flushPendingVisitSaves?: (() => Promise<void>) | undefined;
	handleFinishVisitAction: () => void;
	isHeaderMoreMenuOpen: boolean;
	setIsHeaderMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	headerMoreMenuRef: React.RefObject<HTMLDivElement | null>;
	handlePrintInformedConsentFast: () => void;
	setIsInformedConsentModalOpen: (v: boolean) => void;
	setIsWarrantyModalOpen: (v: boolean) => void;
	setIsDoctorShiftModalOpen: (v: boolean) => void;
	setIsPriceValidatorModalOpen: (v: boolean) => void;
	setIsStagePaymentModalOpen: (v: boolean) => void;
	handlePrintCompletedActFast?: (() => void) | undefined;
	handlePrintEstimateFast?: (() => void) | undefined;
	onOpenLabOrderModal?: (() => void) | undefined;
}

/**
 * Пропсы полосы критических медицинских предупреждений
 */
export interface PatientAlertBadgesBarProps {
	// biome-ignore lint/suspicious/noExplicitAny: patient
	activePatient: any;
	// biome-ignore lint/suspicious/noExplicitAny: badges
	activePatientCriticalBadges: any[];
	consolidatedAllergyChip?: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: appointment
	activeAppointment?: any;
}

/**
 * Пропсы секундомера и оперативной очереди смены
 */
export interface VisitTimerAndStatusControlsProps {
	// biome-ignore lint/suspicious/noExplicitAny: appointment
	activeAppointment: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor
	activeDoctor: any;
	activePeers?: string[];
	summaryText?: string;
	shiftDayQueue?: ShiftDayQueue;
	isQueueLobbyDropdownOpen?: boolean;
	setIsQueueLobbyDropdownOpen?: React.Dispatch<React.SetStateAction<boolean>>;
	queueLobbyDropdownRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Пропсы панели быстрых клинических действий и меню бланков
 */
export interface VisitActionButtonsToolbarProps {
	handleApplySomaticNormQuick: () => void;
	handlePrintForm043uFast: () => void;
	handlePrintCompletedActFast?: (() => void) | undefined;
	handlePrintEstimateFast?: (() => void) | undefined;
	onOpenLabOrderModal?: (() => void) | undefined;
	setIsEmergencyModalOpen: (v: boolean) => void;
	shiftDayQueue: ShiftDayQueue;
	isQueueLobbyDropdownOpen: boolean;
	setIsQueueLobbyDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
	queueLobbyDropdownRef: React.RefObject<HTMLDivElement | null>;
	flushPendingVisitSaves?: (() => Promise<void>) | undefined;
	handleFinishVisitAction: () => void;
	isHeaderMoreMenuOpen: boolean;
	setIsHeaderMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	headerMoreMenuRef: React.RefObject<HTMLDivElement | null>;
	handlePrintInformedConsentFast: () => void;
	setIsInformedConsentModalOpen: (v: boolean) => void;
	setIsWarrantyModalOpen: (v: boolean) => void;
	setIsDoctorShiftModalOpen: (v: boolean) => void;
	setIsPriceValidatorModalOpen: (v: boolean) => void;
	setIsStagePaymentModalOpen: (v: boolean) => void;
}
