/**
 * timelineSeederTypes.ts — Domain Types & Contracts for Patient Clinical Timeline (Layer 0).
 */

import type { DbTx } from "../types.js";

export type DatabaseTransaction = DbTx;

export interface DemoPatientsBundle {
	allPatients: Array<{ id: string; fullName: string }>;
	p0: { id: string; fullName: string };
	p1: { id: string; fullName: string };
	p2: { id: string; fullName: string };
	p3: { id: string; fullName: string };
}

export interface PatientTreatmentItemsParams {
	organizationId: string;
	p0Id: string;
	p1Id: string;
	p3Id: string;
	doctorUserId: string;
	orthopedistUserId: string;
	surgeonUserId: string;
	chair1Id: string;
	chair2Id: string;
	visitId?: string | undefined;
}

export interface PatientVisitAndDiaryParams {
	organizationId: string;
	patientId: string;
	appointmentId: string;
	doctorUserId: string;
}

export interface ClinicalServiceLookup {
	id: string | undefined;
	title: string;
	price: number;
}
