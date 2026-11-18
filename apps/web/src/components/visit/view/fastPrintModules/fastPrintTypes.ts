/**
 * apps/web/src/components/visit/view/fastPrintModules/fastPrintTypes.ts
 *
 * Строгие типизированные контракты для быстрой печати клинического визита:
 * ИДС, памяток, актов выполненных услуг, смет и медицинских карт (Мандат 8bk).
 */

import type { Dashboard } from "@dental/shared";
import type { VisitDashboardEntity } from "../VisitViewProps";

export interface FastPrintPatientContext {
	readonly id?: string | null | undefined;
	readonly fullName?: string | null | undefined;
	readonly name?: string | null | undefined;
	readonly birthDate?: string | Date | null | undefined;
	readonly passportSeries?: string | null | undefined;
	readonly passportNumber?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
	readonly medicalCardNumber?: string | null | undefined;
	readonly medCardNumber?: string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly address?: string | null | undefined;
	readonly gender?: string | null | undefined;
	readonly snils?: string | null | undefined;
	readonly omsPolis?: string | null | undefined;
	readonly allergies?: readonly string[] | string | null | undefined;
	readonly administrativeProfile?: {
		readonly snils?: string | null | undefined;
		readonly omsPolis?: string | null | undefined;
		readonly allergies?: readonly string[] | string | null | undefined;
		readonly preferredAppointmentNote?: string | null | undefined;
		readonly dataProcessingBasisNote?: string | null | undefined;
	} | null | undefined;
	readonly clinicalSafetyProfile?: Record<string, unknown> | null | undefined;
	readonly [key: string]: unknown;
}

export interface FastPrintDoctorContext {
	readonly id?: string | null | undefined;
	readonly fullName?: string | null | undefined;
	readonly name?: string | null | undefined;
	readonly specialty?: string | null | undefined;
	readonly specialtyRu?: string | null | undefined;
	readonly [key: string]: unknown;
}

export interface FastPrintAppointmentContext {
	readonly id?: string | null | undefined;
	readonly startsAt?: string | Date | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly [key: string]: unknown;
}

export interface FastPrintVisitNoteFormContext {
	readonly complaint?: string | null | undefined;
	readonly anamnesis?: string | null | undefined;
	readonly objectiveStatus?: string | null | undefined;
	readonly diagnosis?: string | null | undefined;
	readonly treatmentPlan?: string | null | undefined;
	readonly recommendations?: string | null | undefined;
	readonly revisionCount?: number | null | undefined;
	readonly isRevising?: boolean | null | undefined;
	readonly [key: string]: unknown;
}

export interface FastPrintPlanItemContext {
	readonly id?: string | undefined;
	readonly code?: string | undefined;
	readonly code804n?: string | undefined;
	readonly name?: string | undefined;
	readonly title?: string | undefined;
	readonly tooth?: string | number | null | undefined;
	readonly toothNumber?: string | number | null | undefined;
	readonly quantity?: number | undefined;
	readonly price?: number | undefined;
	readonly priceRub?: number | undefined;
	readonly unitPriceRub?: number | undefined;
	readonly totalRub?: number | undefined;
	readonly [key: string]: unknown;
}

export interface FastPrintPlanContext {
	readonly id?: string | undefined;
	readonly title?: string | null | undefined;
	readonly name?: string | null | undefined;
	readonly items?: readonly FastPrintPlanItemContext[] | undefined;
	readonly stages?: readonly {
		readonly title?: string | undefined;
		readonly stageNumber?: number | undefined;
		readonly items?: readonly FastPrintPlanItemContext[] | undefined;
		readonly [key: string]: unknown;
	}[] | undefined;
	readonly status?: string | undefined;
	readonly [key: string]: unknown;
}

export interface FastPrintDashboardOrganization {
	readonly name?: string | undefined;
	readonly address?: string | undefined;
	readonly phone?: string | undefined;
	readonly ogrn?: string | undefined;
	readonly inn?: string | undefined;
	readonly licenseNumber?: string | undefined;
	readonly license?: string | undefined;
	readonly [key: string]: unknown;
}

export interface FastPrintDashboardClinicSettings {
	readonly clinicName?: string | undefined;
	readonly address?: string | undefined;
	readonly phone?: string | undefined;
	readonly ogrn?: string | undefined;
	readonly inn?: string | undefined;
	readonly licenseNumber?: string | undefined;
	readonly profile?: {
		readonly brandName?: string | undefined;
		readonly [key: string]: unknown;
	} | undefined;
	readonly [key: string]: unknown;
}

export type FastPrintDashboardContext =
	| VisitDashboardEntity
	| ((Partial<Dashboard> | Record<string, unknown>) & {
			readonly organization?: FastPrintDashboardOrganization | null | undefined;
			readonly organizationName?: string | undefined;
			readonly clinicSettings?: FastPrintDashboardClinicSettings | undefined;
			readonly activeDoctor?: FastPrintDoctorContext | undefined;
			readonly activeVisit?: {
				readonly id?: string | undefined;
				readonly patientId?: string | undefined;
				readonly diagnosisTooth?: string | number | undefined;
				readonly [key: string]: unknown;
			} | undefined;
			readonly patients?: readonly unknown[] | undefined;
			readonly imagingStudies?: readonly unknown[] | undefined;
			readonly [key: string]: unknown;
	  });

export interface ToothStateRecord {
	readonly state?: string | undefined;
	readonly status?: string | undefined;
	readonly customNote?: string | undefined;
	readonly label?: string | undefined;
	readonly [key: string]: unknown;
}

export interface FastPrintClinicRequisites {
	readonly clinicName: string;
	readonly clinicAddress: string;
	readonly clinicPhone: string;
	readonly clinicOgrn: string;
	readonly clinicInn: string;
	readonly license: string;
}

export interface DmftCalculationResult {
	readonly decayed: number;
	readonly missing: number;
	readonly filled: number;
	readonly total: number;
}
