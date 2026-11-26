import { and, desc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { type TenantDb, withSuperuserBypass, withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	electronicPrescriptionItems,
	electronicPrescriptions,
	patientDrugAllergies,
	patients,
	users,
	visits,
} from "../../../db/schema.js";
import { evaluatePatientSomaticRisk } from "./riskEvaluationEngine.js";
import { createApiLogger, safeLogError } from "../../../observability/index.js";
import type {
	AppointmentSomaticContextInput,
	PatientSomaticProfileInput,
	SomaticRadarAlert,
	SomaticRadarPreShiftSummary,
} from "./types.js";

const logger = createApiLogger("somaticRadar");
const VISITS_LOOKBACK_DAYS = 365;
const BATCH_VISITS_MAX_ROWS = 2000;

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE INTEGRATION & PRE-SHIFT BATCH SCANNER (LAYER 3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executes high-performance 07:30 AM Somatic Radar scan across today's appointments.
 * Eliminates N+1 query patterns using parallel batch requests with inArray under RLS.
 */
export async function runSomaticRadarScan(options?: {
	organizationId?: string | undefined;
	targetDate?: Date | undefined;
	now?: Date | undefined;
}): Promise<SomaticRadarAlert[]> {
	try {
		const now = options?.now ?? new Date();
		const targetDate = options?.targetDate ?? now;

		// Shift boundary: today 00:00:00 to 23:59:59
		const dayStart = new Date(targetDate);
		dayStart.setHours(0, 0, 0, 0);
		const dayEnd = new Date(targetDate);
		dayEnd.setHours(23, 59, 59, 999);
		const lookbackStart = new Date(now.getTime() - VISITS_LOOKBACK_DAYS * 86_400_000);

		const orgIdFilter = options?.organizationId;

		const runScan = async (tx: TenantDb) => {
			const apptConditions = [
				gte(appointments.startsAt, dayStart),
				lte(appointments.startsAt, dayEnd),
				or(
					eq(appointments.status, "planned"),
					eq(appointments.status, "confirmed"),
					eq(appointments.status, "arrived"),
					eq(appointments.status, "in_treatment"),
				),
			];
			if (orgIdFilter) {
				apptConditions.push(eq(appointments.organizationId, orgIdFilter));
			}

			// 1. Fetch all appointments scheduled for today
			const todayAppointments = await tx
				.select({
					appointmentId: appointments.id,
					organizationId: appointments.organizationId,
					patientId: appointments.patientId,
					doctorUserId: appointments.doctorUserId,
					startsAt: appointments.startsAt,
					endsAt: appointments.endsAt,
					reason: appointments.reason,
					comment: appointments.comment,
					status: appointments.status,
					patientFullName: patients.fullName,
					patientBirthDate: patients.birthDate,
					patientPhone: patients.phone,
					patientNotes: patients.notes,
					doctorFullName: users.fullName,
				})
				.from(appointments)
				.leftJoin(patients, eq(appointments.patientId, patients.id))
				.leftJoin(users, eq(appointments.doctorUserId, users.id))
				.where(and(...apptConditions))
				.orderBy(appointments.startsAt);

			if (todayAppointments.length === 0) {
				return {
					todayAppointments,
					batchAllergies: [],
					batchVisits: [],
					batchPrescriptionItems: [],
				};
			}

			// Extract unique patient IDs
			const patientIds = Array.from(
				new Set(
					todayAppointments
						.map((a) => a.patientId)
						.filter((id): id is string => Boolean(id)),
				),
			);

			if (patientIds.length === 0) {
				return {
					todayAppointments,
					batchAllergies: [],
					batchVisits: [],
					batchPrescriptionItems: [],
				};
			}

			const allergyConditions = [inArray(patientDrugAllergies.patientId, patientIds)];
			const visitConditions = [
				inArray(visits.patientId, patientIds),
				gte(visits.createdAt, lookbackStart),
			];
			const rxConditions = [inArray(electronicPrescriptions.patientId, patientIds)];
			if (orgIdFilter) {
				allergyConditions.push(eq(patientDrugAllergies.organizationId, orgIdFilter));
				visitConditions.push(eq(visits.organizationId, orgIdFilter));
				rxConditions.push(eq(electronicPrescriptions.organizationId, orgIdFilter));
			}

			const visitLimit = Math.min(Math.max(patientIds.length * 10, 100), BATCH_VISITS_MAX_ROWS);

			const [batchAllergies, batchVisits, batchPrescriptionItems] = await Promise.all([
				tx
					.select({
						patientId: patientDrugAllergies.patientId,
						allergenGroup: patientDrugAllergies.allergenGroup,
						drugInnLatin: patientDrugAllergies.drugInnLatin,
						reactionSeverity: patientDrugAllergies.reactionSeverity,
						clinicalManifestations: patientDrugAllergies.clinicalManifestations,
						hasSamterTriad: patientDrugAllergies.hasSamterTriad,
						notes: patientDrugAllergies.notes,
					})
					.from(patientDrugAllergies)
					.where(and(...allergyConditions)),

				tx
					.select({
						patientId: visits.patientId,
						complaint: visits.complaint,
						anamnesis: visits.anamnesis,
						objectiveStatus: visits.objectiveStatus,
						diagnosis: visits.diagnosis,
						treatmentPlan: visits.treatmentPlan,
						doctorSummary: visits.doctorSummary,
						createdAt: visits.createdAt,
					})
					.from(visits)
					.where(and(...visitConditions))
					.orderBy(desc(visits.createdAt))
					.limit(visitLimit),

				tx
					.select({
						patientId: electronicPrescriptions.patientId,
						innLatin: electronicPrescriptionItems.innLatin,
						signatureDirectionRussian: electronicPrescriptionItems.signatureDirectionRussian,
					})
					.from(electronicPrescriptionItems)
					.innerJoin(
						electronicPrescriptions,
						eq(electronicPrescriptionItems.prescriptionId, electronicPrescriptions.id),
					)
					.where(and(...rxConditions)),
			]);

			return {
				todayAppointments,
				batchAllergies,
				batchVisits,
				batchPrescriptionItems,
			};
		};

		const {
			todayAppointments,
			batchAllergies,
			batchVisits,
			batchPrescriptionItems,
		} = orgIdFilter
			? await withTenantCtx(orgIdFilter, runScan)
			: await withSuperuserBypass(runScan);

		if (todayAppointments.length === 0) {
			return [];
		}

		const allergiesByPatient = new Map<
			string,
			Array<{
				allergenGroup: string;
				drugInnLatin: string | null;
				reactionSeverity: string | null;
				clinicalManifestations: string | null;
				hasSamterTriad: boolean | null;
				notes: string | null;
			}>
		>();

		const pastVisitsByPatient = new Map<
			string,
			Array<{
				complaint: string | null;
				anamnesis: string | null;
				objectiveStatus: string | null;
				diagnosis: string | null;
				treatmentPlan: string | null;
				doctorSummary: string | null;
				createdAt: Date;
			}>
		>();

		const activePrescriptionsByPatient = new Map<string, string[]>();

		for (const item of batchAllergies) {
			let patientAllergies = allergiesByPatient.get(item.patientId);
			if (!patientAllergies) {
				patientAllergies = [];
				allergiesByPatient.set(item.patientId, patientAllergies);
			}
			patientAllergies.push(item);
		}

		for (const v of batchVisits) {
			if (!v.patientId) continue;
			let patientVisits = pastVisitsByPatient.get(v.patientId);
			if (!patientVisits) {
				patientVisits = [];
				pastVisitsByPatient.set(v.patientId, patientVisits);
			}
			if (patientVisits.length < 5) {
				patientVisits.push(v);
			}
		}

		for (const p of batchPrescriptionItems) {
			let rxList = activePrescriptionsByPatient.get(p.patientId);
			if (!rxList) {
				rxList = [];
				activePrescriptionsByPatient.set(p.patientId, rxList);
			}
			rxList.push(`${p.innLatin} ${p.signatureDirectionRussian}`);
		}

		const allAlerts: SomaticRadarAlert[] = [];

		for (const appt of todayAppointments) {
			if (!appt.patientId) continue;

			const allergies = allergiesByPatient.get(appt.patientId) ?? [];
			const pastVisits = pastVisitsByPatient.get(appt.patientId) ?? [];
			const activeMedications = activePrescriptionsByPatient.get(appt.patientId) ?? [];

			const anamnesisTexts: string[] = [];
			const diagnosisTexts: string[] = [];

			for (const v of pastVisits) {
				if (v.anamnesis) anamnesisTexts.push(v.anamnesis);
				if (v.complaint) anamnesisTexts.push(v.complaint);
				if (v.doctorSummary) anamnesisTexts.push(v.doctorSummary);
				if (v.diagnosis) diagnosisTexts.push(v.diagnosis);
				if (v.objectiveStatus) diagnosisTexts.push(v.objectiveStatus);
			}

			const patientProfile: PatientSomaticProfileInput = {
				patientId: appt.patientId,
				organizationId: appt.organizationId,
				fullName: appt.patientFullName || "Пациент",
				birthDate: appt.patientBirthDate,
				phone: appt.patientPhone,
				notes: appt.patientNotes,
				allergies,
				pastAnamnesisText: anamnesisTexts.join(" "),
				pastDiagnosesText: diagnosisTexts.join(" "),
				activeMedications,
			};

			const appointmentContext: AppointmentSomaticContextInput = {
				appointmentId: appt.appointmentId,
				organizationId: appt.organizationId,
				doctorId: appt.doctorUserId,
				doctorName: appt.doctorFullName || "Врач клиники",
				startsAt: appt.startsAt,
				endsAt: appt.endsAt,
				reason: appt.reason,
				comment: appt.comment,
			};

			const apptAlerts = evaluatePatientSomaticRisk(patientProfile, appointmentContext, { now });
			allAlerts.push(...apptAlerts);
		}

		return allAlerts;
	} catch (error) {
		logger.error({ err: safeLogError(error) }, "Failed to run somatic radar scan");
		throw error;
	}
}

/**
 * Compiles a pre-shift summary grouped by organization.
 */
export async function runSomaticRadarShiftSummary(options?: {
	organizationId?: string | undefined;
	targetDate?: Date | undefined;
	now?: Date | undefined;
}): Promise<SomaticRadarPreShiftSummary[]> {
	try {
		const now = options?.now ?? new Date();
		const targetDate = options?.targetDate ?? now;
		const scanArgs: { organizationId?: string; targetDate?: Date; now?: Date } = {
			targetDate,
			now,
		};
		if (options?.organizationId) {
			scanArgs.organizationId = options.organizationId;
		}
		const alerts = await runSomaticRadarScan(scanArgs);

		const orgMap = new Map<string, SomaticRadarAlert[]>();

		for (const a of alerts) {
			const orgId = a.organizationId;
			let orgAlerts = orgMap.get(orgId);
			if (!orgAlerts) {
				orgAlerts = [];
				orgMap.set(orgId, orgAlerts);
			}
			orgAlerts.push(a);
		}

		if (options?.organizationId && !orgMap.has(options.organizationId)) {
			orgMap.set(options.organizationId, []);
		}

		const summaries: SomaticRadarPreShiftSummary[] = [];

		for (const [orgId, orgAlerts] of orgMap.entries()) {
			let critical = 0;
			let high = 0;
			let warnings = 0;
			const uniquePatients = new Set<string>();

			for (const a of orgAlerts) {
				uniquePatients.add(a.patientId);
				if (a.urgency === "CRITICAL") critical++;
				else if (a.urgency === "HIGH") high++;
				else warnings++;
			}

			summaries.push({
				id: `somatic_summary_${orgId}_${Date.now()}`,
				organizationId: orgId,
				shiftDate: targetDate.toLocaleDateString("ru-RU"),
				totalAppointmentsScanned: orgAlerts.length,
				totalPatientsWithRisk: uniquePatients.size,
				criticalThreatsCount: critical,
				highThreatsCount: high,
				warningsCount: warnings,
				alerts: orgAlerts,
				createdAt: now.toISOString(),
			});
		}

		return summaries;
	} catch (error) {
		logger.error({ err: safeLogError(error) }, "Failed to run somatic radar shift summary");
		throw error;
	}
}
