/**
 * patientTimelineSeeder.ts — Patient Demographics, Tooth States, SOAP 043/u Diaries, and Treatment Plans (Facade).
 *
 * Decomposed into modular domain components (Gate 0..6 / Decomposer Skill):
 * - timelineModules/timelineSeederTypes.ts: Domain contracts, DTO interfaces, transaction types.
 * - timelineModules/clinicalHistoryGenerator.ts: Deterministic clinical history generator (teeth, SOAP, items).
 * - timelineModules/timelineDbWriter.ts: Batch transactional database writer.
 */

import type { DbTx } from "./types.js";
import {
	type ClinicalServiceLookup,
	type DatabaseTransaction,
	type DemoPatientsBundle,
	type PatientTreatmentItemsParams,
	type PatientVisitAndDiaryParams,
} from "./timelineModules/timelineSeederTypes.js";
import {
	writeDemoPatients,
	writePatientToothStates,
	writePatientVisitAndDiary,
	writePatientTreatmentPlan,
	writePatientTreatmentItems,
} from "./timelineModules/timelineDbWriter.js";

// Re-export domain types
export type {
	DatabaseTransaction,
	DemoPatientsBundle,
	PatientTreatmentItemsParams,
	PatientVisitAndDiaryParams,
	ClinicalServiceLookup,
};

// Re-export generator functions
export {
	buildDeterministicTreatmentItems,
	buildPatientToothStateValues,
	buildPatientVisitDiaryValues,
} from "./timelineModules/clinicalHistoryGenerator.js";

// Re-export DB writers with both canonical and alias names for backward compatibility
export {
	writeDemoPatients,
	writePatientToothStates,
	writePatientVisitAndDiary,
	writePatientTreatmentPlan,
	writePatientTreatmentItems,
};

/**
 * Инициализирует 4 демо-пациента клиники или возвращает существующие записи.
 */
export async function seedDemoPatients(
	tx: DbTx,
	organizationId: string,
): Promise<DemoPatientsBundle | null> {
	return writeDemoPatients(tx, organizationId);
}

/**
 * Засевает зубные формулы (одонтограммы) для пациентов кейсов терапии, ортопедии и хирургии.
 */
export async function seedPatientToothStates(
	tx: DbTx,
	organizationId: string,
	p0Id: string,
	p1Id: string,
	p3Id: string,
): Promise<void> {
	return writePatientToothStates(tx, organizationId, p0Id, p1Id, p3Id);
}

/**
 * Засевает завершенный визит и медицинский дневник Форма 043/у (SOAP-протокол).
 */
export async function seedPatientVisitAndDiary(
	tx: DbTx,
	organizationId: string,
	p0Id: string,
	appointmentId: string,
	doctorUserId: string,
): Promise<string | undefined> {
	return writePatientVisitAndDiary(tx, organizationId, p0Id, appointmentId, doctorUserId);
}

/**
 * Засевает утвержденный комплексный план санации полости рта и его этапы.
 */
export async function seedPatientTreatmentPlan(
	tx: DbTx,
	organizationId: string,
	p0: { id: string; fullName: string },
	doctorUserId: string,
): Promise<string | undefined> {
	return writePatientTreatmentPlan(tx, organizationId, p0, doctorUserId);
}

/**
 * Засевает позиции плана лечения (treatment_items) с привязкой к реальным услугам из справочника 804н.
 */
export async function seedPatientTreatmentItems(
	tx: DbTx,
	params: PatientTreatmentItemsParams,
): Promise<string[]> {
	return writePatientTreatmentItems(tx, params);
}
