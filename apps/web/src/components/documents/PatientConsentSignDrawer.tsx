/**
 * apps/web/src/components/documents/PatientConsentSignDrawer.tsx
 * Канонический мост к единому SSOT согласий ConsentModal (Мандаты 8b, 8e, 8n).
 * Дублирующий контур снесён: вся логика консолидирована в едином ConsentModal.
 */

import React from "react";
import type { Patient } from "@dental/shared";
import {
	ConsentModal,
	type ConsentModalProps,
	type InformedConsentModalProps,
	type SignedConsentPayload,
} from "../consents/ConsentModal.js";

export type ConsentKindOption =
	| "therapeutic"
	| "surgical_implantation"
	| "anesthesia"
	| "orthodontic"
	| "orthopedic"
	| "personal_data"
	| "paid_contract";

export interface ConsentKindItem {
	id: ConsentKindOption;
	title: string;
	shortTitle: string;
	description: string;
	mappedBackendKind?: string;
}

export const CONSENT_OPTIONS: ConsentKindItem[] = [
	{ id: "therapeutic", title: "Информированное добровольное согласие на терапевтическое лечение", shortTitle: "Терапия", description: "Лечение кариеса, пульпита, периодонтита, эстетическая реставрация зубов", mappedBackendKind: "general_treatment" },
	{ id: "surgical_implantation", title: "Информированное согласие на хирургическое вмешательство и имплантацию", shortTitle: "Хирургия и имплантация", description: "Удаление зубов, синус-лифтинг, костная пластика, установка дентальных имплантатов", mappedBackendKind: "implantology" },
	{ id: "anesthesia", title: "Анестезиологическая карта и согласие на местное обезболивание", shortTitle: "Анестезия", description: "Инфильтрационная и проводниковая анестезия (артикаин, мепивакаин без адреналина)", mappedBackendKind: "anesthesia_consent_log" },
	{ id: "orthodontic", title: "Информированное согласие на ортодонтическое лечение", shortTitle: "Ортодонтия", description: "Исправление прикуса брекет-системами, прозрачными элайнерами, аппаратами", mappedBackendKind: "orthodontics" },
	{ id: "orthopedic", title: "Информированное согласие на ортопедическое лечение (протезирование)", shortTitle: "Протезирование", description: "Коронки из диоксида циркония, керамические виниры, мостовидные и бюгельные протезы", mappedBackendKind: "procedure_specific_consent_packet" },
	{ id: "personal_data", title: "Согласие на обработку персональных данных пациента", shortTitle: "Персональные данные", description: "Хранение и обработка медицинских сведений в защищенном контуре клиники", mappedBackendKind: "personal_data_processing_consent" },
	{ id: "paid_contract", title: "Договор оказания платных медицинских услуг", shortTitle: "Договор услуг", description: "Обязательства клиники, согласованный план лечения, гарантийные обязательства и оплата", mappedBackendKind: "informed_consent" },
];

export interface PatientConsentSignDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	patient?: Patient | { id?: string; fullName?: string; birthDate?: string } | null | undefined;
	patientId?: string | null | undefined;
	doctorFullName?: string | null | undefined;
	doctorName?: string | null | undefined;
	clinicName?: string | undefined;
	defaultConsentKind?: ConsentKindOption | undefined;
	initialDocKey?: string | undefined;
	visitId?: string | null | undefined;
	isMinorPatient?: boolean | undefined;
	onSigned?: ((signatureDataUrl: string, consentKind: ConsentKindOption) => void) | undefined;
	onConsentSigned?: ((payload: Record<string, unknown>) => void) | undefined;
	onConsentConfirmed?: ((payload: Record<string, unknown>) => void) | undefined;
	onPrintBlank?: ((consentKind: ConsentKindOption) => void) | undefined;
}

export const PatientConsentSignDrawer: React.FC<PatientConsentSignDrawerProps> = (props) => {
	return <ConsentModal {...props} />;
};

export { ConsentModal };
export type { ConsentModalProps, InformedConsentModalProps, SignedConsentPayload };
export default PatientConsentSignDrawer;
