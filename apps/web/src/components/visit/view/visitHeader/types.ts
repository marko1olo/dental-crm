import type React from "react";
import type { VisitSubViewTab } from "../../VisitMainTabs";

export type { VisitSubViewTab };

/**
 * Элемент ожидающего пациента в очереди смены
 */
export interface ArrivedPatientItem {
	id: string;
	patientId?: string | null | undefined;
	name: string;
	time?: string | undefined;
}

/**
 * Очередь смены врача по стадиям (DENTE)
 */
export interface ShiftDayQueue {
	arrived: number;
	inTreatment: number;
	awaitingPayment: number;
	arrivedPatients: ArrivedPatientItem[];
}

/**
 * Критический медицинский алерт пациента (аллергия, соматика, стоп-факторы)
 */
export interface PatientCriticalBadge {
	id: string;
	testId?: string | undefined;
	shortLabel?: string | undefined;
	fullLabel: string;
	title: string;
	severity?: "critical" | "warning" | "info" | undefined;
}

/**
 * Структурный контракт пациента для шапки визита
 */
export interface PatientLike {
	id?: string | undefined;
	patientId?: string | undefined;
	fullName?: string | null | undefined;
	name?: string | null | undefined;
	phone?: string | null | undefined;
	allergies?: readonly string[] | string[] | null | undefined;
	birthDate?: string | null | undefined;
	[key: string]: unknown;
}

/**
 * Структурный контракт приёма для шапки визита
 */
export interface AppointmentLike {
	id?: string | undefined;
	appointmentId?: string | undefined;
	startTime?: string | null | undefined;
	startAt?: string | null | undefined;
	startsAt?: string | null | undefined;
	createdAt?: string | null | undefined;
	services?: readonly unknown[] | unknown[] | undefined;
	[key: string]: unknown;
}

/**
 * Структурный контракт врача для шапки визита
 */
export interface DoctorLike {
	id?: string | undefined;
	userId?: string | undefined;
	fullName?: string | null | undefined;
	name?: string | null | undefined;
	specialty?: string | null | undefined;
	[key: string]: unknown;
}

/**
 * Пропсы канонической шапки приёма врача VisitHeaderMonolith
 */
export interface VisitHeaderMonolithProps {
	activePatient: PatientLike | null | undefined;
	patientAge: string | null;
	activeAppointment: AppointmentLike | null | undefined;
	activeDoctor: DoctorLike | null | undefined;
	activePatientCriticalBadges: readonly PatientCriticalBadge[];
	visitSubViewTab: VisitSubViewTab;
	setVisitSubViewTab: (tab: VisitSubViewTab) => void;
	handleApplySomaticNormQuick: () => void;
	handlePrintClinicalDiaryFast?: (() => void) | undefined;
	handlePrintForm043uFast?: (() => void) | undefined;
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
	setIsPrescriptionModalOpen?: ((v: boolean) => void) | undefined;
	handlePrintCompletedActFast?: (() => void) | undefined;
	handlePrintEstimateFast?: (() => void) | undefined;
	onOpenLabOrderModal?: (() => void) | undefined;
}

/**
 * Пропсы полосы критических медицинских предупреждений
 */
export interface PatientAlertBadgesBarProps {
	activePatient: PatientLike | null | undefined;
	activePatientCriticalBadges: readonly PatientCriticalBadge[];
	consolidatedAllergyChip?: string | null | undefined;
	activeAppointment?: AppointmentLike | null | undefined;
}

/**
 * Пропсы секундомера и оперативной очереди смены
 */
export interface VisitTimerAndStatusControlsProps {
	activeAppointment: AppointmentLike | null | undefined;
	activeDoctor: DoctorLike | null | undefined;
	activePeers?: readonly string[] | string[] | undefined;
	summaryText?: string | null | undefined;
	shiftDayQueue?: ShiftDayQueue | undefined;
	isQueueLobbyDropdownOpen?: boolean | undefined;
	setIsQueueLobbyDropdownOpen?: React.Dispatch<React.SetStateAction<boolean>> | undefined;
	queueLobbyDropdownRef?: React.RefObject<HTMLDivElement | null> | undefined;
}

/**
 * Пропсы панели быстрых клинических действий и меню бланков
 */
export interface VisitActionButtonsToolbarProps {
	handleApplySomaticNormQuick: () => void;
	handlePrintClinicalDiaryFast?: (() => void) | undefined;
	handlePrintForm043uFast?: (() => void) | undefined;
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
	setIsPrescriptionModalOpen?: ((v: boolean) => void) | undefined;
}
