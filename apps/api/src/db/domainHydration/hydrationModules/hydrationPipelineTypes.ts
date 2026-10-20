import {
	clinicModeSchema,
	type Visit,
} from "@dental/shared";
import {
	inMemoryDomainState,
	validScheduleTimeZone,
} from "../../../sampleData.js";
import type { ServiceCatalogRow } from "../../pricelistQuery.js";
import * as schema from "../../schema.js";
import { iso, reportUnreadableTime } from "../sliceExtractors.js";
import type { DomainState, DomainStateHydrationReport } from "../types.js";

/**
 * ОБЪЯВЛЕННАЯ МЕТКА «ПРИЁМА НЕТ», А НЕ ПРОСТО КОНСТАНТА.
 */
export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Время в заготовке «приёма нет». Постоянная величина, а НЕ `new Date()`.
 */
export const NO_VISIT_TIMESTAMP = "1970-01-01T00:00:00.000Z";

/**
 * ОБЪЯВЛЕННАЯ МЕТКА «ВРЕМЯ ЭТОЙ СТРОКИ НЕИЗВЕСТНО».
 */
export const UNREADABLE_TIME_MARKER = "1970-01-01T00:00:00.000Z";

export function noVisitSkeleton(organizationId: string): Visit {
	return {
		id: NIL_UUID,
		organizationId,
		patientId: NIL_UUID,
		appointmentId: null,
		status: "draft",
		revision: 1,
		complaint: null,
		anamnesis: null,
		objectiveStatus: null,
		diagnosis: null,
		treatmentPlan: null,
		doctorSummary: null,
		createdAt: NO_VISIT_TIMESTAMP,
		updatedAt: NO_VISIT_TIMESTAMP,
	};
}

export function applyActiveVisit(
	organizationId: string,
	visitRecords: Visit[],
): Visit {
	const draft = visitRecords
		.filter((visit) => visit.status === "draft")
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
	const latest =
		draft ??
		visitRecords
			.slice()
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

	return latest ?? noVisitSkeleton(organizationId);
}

export function emptyDomainState(organizationId: string): DomainState {
	return {
		clinicProfile: { ...inMemoryDomainState.clinicProfile, organizationId },
		staffMembers: [],
		chairs: [],
		patients: [],
		appointments: [],
		activeVisit: noVisitSkeleton(organizationId),
		documents: [],
		serviceCatalog: [],
		treatmentPlanItems: [],
		treatmentPlanScenarios: [],
		clinicalRules: [],
		payments: [],
		communicationTemplates: [],
		communicationTasks: [],
		communicationEvents: [],
		imagingStudies: [],
		aiRecognitionJobs: [],
		importBatches: [],
		protocolTemplates: [],
		auditEvents: [],
		unavailableSlices: [],
	};
}

/**
 * Конструирует профиль клиники из строк организации и филиала.
 */
export function buildClinicProfile(
	organization: typeof schema.organizations.$inferSelect,
	clinic: typeof schema.clinics.$inferSelect | undefined,
	report: DomainStateHydrationReport,
): DomainState["clinicProfile"] {
	const clinicProfile: DomainState["clinicProfile"] = {
		...inMemoryDomainState.clinicProfile,
	};
	const orgFlags =
		(organization.workspaceFeatureFlags as Record<string, unknown> | null) ?? {};
	clinicProfile.organizationId = organization.id;
	clinicProfile.clinicName = clinic?.name || organization.name;
	clinicProfile.legalName = organization.name;
	clinicProfile.inn = organization.inn ?? null;
	clinicProfile.kpp = organization.kpp ?? null;
	clinicProfile.ogrn = organization.ogrn ?? null;
	clinicProfile.address =
		organization.legalAddress ?? clinic?.address ?? null;
	clinicProfile.phone = clinic?.phone ?? null;
	clinicProfile.email = organization.email ?? null;
	clinicProfile.website = organization.website ?? null;
	clinicProfile.medicalLicenseNumber =
		organization.medicalLicenseNumber ?? null;
	clinicProfile.medicalLicenseIssuedAt =
		organization.medicalLicenseIssuedAt ?? null;
	clinicProfile.medicalLicenseIssuer =
		organization.medicalLicenseIssuer ?? null;
	clinicProfile.bankDetails = organization.bankDetails ?? null;
	clinicProfile.signatoryName = organization.signatoryName ?? null;
	clinicProfile.signatoryTitle = organization.signatoryTitle ?? null;
	clinicProfile.mode = clinicModeSchema
		.catch("one_chair")
		.parse(organization.clinicMode);
	clinicProfile.timezone = validScheduleTimeZone(clinic?.timezone);
	if (
		typeof orgFlags.defaultVisitMinutes === "number" &&
		orgFlags.defaultVisitMinutes > 0
	) {
		clinicProfile.defaultVisitMinutes = orgFlags.defaultVisitMinutes;
	}
	if (typeof orgFlags.egiszEnabled === "boolean") {
		clinicProfile.egiszEnabled = orgFlags.egiszEnabled;
	}
	if (typeof orgFlags.logoUrl === "string") {
		clinicProfile.logoUrl = orgFlags.logoUrl;
	}
	if (typeof orgFlags.stampUrl === "string") {
		clinicProfile.stampUrl = orgFlags.stampUrl;
	}

	const organizationUpdatedAt = iso(organization.updatedAt);
	if (organizationUpdatedAt === null) {
		reportUnreadableTime(
			"organizations",
			organization.id,
			"updated_at",
			organization.updatedAt,
			report,
		);
	}
	clinicProfile.updatedAt = organizationUpdatedAt ?? UNREADABLE_TIME_MARKER;
	report.counts.clinicProfile = 1;
	return clinicProfile;
}

/**
 * Необработанные строки из PostgreSQL для построения доменного состояния клиники.
 */
export interface RawHydrationSlices {
	organization: typeof schema.organizations.$inferSelect | undefined;
	clinic: typeof schema.clinics.$inferSelect | undefined;
	clinicRows: Array<typeof schema.clinics.$inferSelect>;
	userRows: Array<typeof schema.users.$inferSelect>;
	chairRows: Array<typeof schema.chairs.$inferSelect>;
	patientRows: Array<typeof schema.patients.$inferSelect>;
	appointmentRows: Array<typeof schema.appointments.$inferSelect>;
	visitRows: Array<typeof schema.visits.$inferSelect>;
	treatmentItemRows: Array<typeof schema.treatmentItems.$inferSelect>;
	paymentRows: Array<typeof schema.payments.$inferSelect>;
	documentRows: Array<typeof schema.generatedDocuments.$inferSelect>;
	taskRows: Array<typeof schema.communicationTasks.$inferSelect>;
	eventRows: Array<typeof schema.communicationEvents.$inferSelect>;
	imagingRows: Array<typeof schema.imagingStudies.$inferSelect>;
	serviceRows: ServiceCatalogRow[];
	ruleRows: Array<typeof schema.clinicalRules.$inferSelect>;
	protocolRows: Array<typeof schema.protocolTemplates.$inferSelect>;
	labOrderRows: Array<typeof schema.labOrders.$inferSelect>;
}

/**
 * Контракт агрегации клинической истории и срезов ЭМК пациента.
 */
export interface PatientHistoryAggregationContract {
	patientId: string;
	organizationId: string;
	visitsCount: number;
	lastVisitDate: string | null;
	totalPlannedRub: number;
	totalPaidRub: number;
	balanceRub: number;
	hasUnpaidCompletedTreatments: boolean;
	hasActiveAlerts: boolean;
}

/**
 * Контракт среза одонтограммы и зубной формулы.
 */
export interface VisitOdontogramSliceContract {
	visitId: string;
	patientId: string;
	teethStates: Record<string, string>;
	formulaType: "adult" | "child" | "mixed";
	updatedAt: string;
}

/**
 * Контракт финансового баланса и счетов пациента.
 */
export interface FinancialLedgerSliceContract {
	patientId: string;
	organizationId: string;
	balanceRub: number;
	paidByMethod: Record<string, number>;
	activeDiscountsRub: number;
	pendingInvoicesCount: number;
}
