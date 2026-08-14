import {
	NiTiFileFatigueEngine,
	SchneiderCurvatureCalculator,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	endoCanalMeasurements,
	endoTreatmentSessions,
	nitiFileCatalogItems,
	nitiFileInstances,
	nitiFileUsageLogs,
	patients,
} from "../db/schema.js";

const point2dSchema = z.object({
	x: z.number(),
	y: z.number(),
});

export async function registerEndodonticRoutes(app: FastifyInstance) {
	/**
	 * 1. POST /api/endo/sessions
	 * Create an endodontic treatment session for a tooth (FDI 11..48)
	 */
	app.post("/api/endo/sessions", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"create endo session",
		);
		if (!orgId) return;

		const bodySchema = z.object({
			patientId: z.string().uuid(),
			visitId: z.string().uuid().optional(),
			toothNumberFdi: z.number().int().min(11).max(85),
			pulpalDiagnosis: z.string().min(2),
			periapicalDiagnosis: z.string().min(2),
			rubberDamUsed: z.boolean().default(true),
			rubberDamClampNumber: z.string().optional(),
			magnificationType: z
				.enum(["microscope", "loupes", "none"])
				.default("microscope"),
			magnificationFactor: z.number().optional(),
			canalCount: z.number().int().min(1).max(6).default(1),
			isthmusObserved: z.boolean().default(false),
			isthmusClassification: z.string().optional(),
			cShapedCategory: z.string().optional(),
			sealerBrand: z.string().optional(),
			obturationTechnique: z.string().optional(),
			treatmentPhase: z
				.enum([
					"access_emergency",
					"instrumentation",
					"intracanal_dressing",
					"obturation",
					"retreatment",
					"instrumentation_and_obturation",
				])
				.default("instrumentation_and_obturation"),
			sessionNotes: z.string().optional(),
		});

		const parsed = bodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "EndoSessionValidationError",
				message: "Некорректные параметры эндодонтического протокола.",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		// Verify patient
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(
				and(
					eq(patients.id, input.patientId),
					eq(patients.organizationId, orgId),
				),
			)
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден.",
			});
		}

		const [session] = await db
			.insert(endoTreatmentSessions)
			.values({
				organizationId: orgId,
				patientId: input.patientId,
				visitId: input.visitId,
				toothNumberFdi: input.toothNumberFdi,
				pulpalDiagnosis: input.pulpalDiagnosis,
				periapicalDiagnosis: input.periapicalDiagnosis,
				rubberDamUsed: input.rubberDamUsed,
				rubberDamClampNumber: input.rubberDamClampNumber,
				magnificationType: input.magnificationType,
				magnificationFactor: input.magnificationFactor
					? String(input.magnificationFactor)
					: null,
				canalCount: input.canalCount,
				isthmusObserved: input.isthmusObserved,
				isthmusClassification: input.isthmusClassification,
				cShapedCategory: input.cShapedCategory,
				sealerBrand: input.sealerBrand,
				obturationTechnique: input.obturationTechnique,
				treatmentPhase: input.treatmentPhase,
				sessionNotes: input.sessionNotes,
			})
			.returning();

		return reply.code(201).send({
			success: true,
			session,
		});
	});

	/**
	 * 2. POST /api/endo/sessions/:id/canals
	 * Record canal measurement with Schneider curvature calculation
	 */
	app.post("/api/endo/sessions/:id/canals", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"record canal measurement",
		);
		if (!orgId) return;

		const { id: sessionId } = request.params as { id: string };

		const bodySchema = z.object({
			canalName: z.string().min(1),
			coronalLandmarkRef: z.string().min(1),
			ealReadingApexDistanceMm: z.number().default(0.0),
			workingLengthMm: z.number().positive(),
			referenceLengthMm: z.number().positive(),
			patencyConfirmed: z.boolean().default(true),
			patencyFileIsoSize: z.number().int().default(10),
			masterApicalFileIso: z.number().int().default(25),
			masterApicalTaper: z.number().default(0.06),
			orificePoint: point2dSchema.optional(),
			departurePoint: point2dSchema.optional(),
			apicalPoint: point2dSchema.optional(),
			manualSchneiderAngleDeg: z.number().optional(),
			manualSchneiderRadiusMm: z.number().optional(),
		});

		const parsed = bodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "CanalMeasurementValidationError",
				message: "Некорректные данные анатомии канала.",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		// Calculate curvature if points provided
		let schneiderAngleDeg = input.manualSchneiderAngleDeg ?? 0;
		let schneiderRadiusMm = input.manualSchneiderRadiusMm ?? 10.0;

		if (input.orificePoint && input.departurePoint && input.apicalPoint) {
			const curvature = SchneiderCurvatureCalculator.calculateAngleAndRadius({
				orificePoint: input.orificePoint,
				departurePoint: input.departurePoint,
				apicalPoint: input.apicalPoint,
			});
			schneiderAngleDeg = curvature.schneiderAngleDeg;
			schneiderRadiusMm = curvature.curvatureRadiusMm;
		}

		const [measurement] = await db
			.insert(endoCanalMeasurements)
			.values({
				organizationId: orgId,
				sessionId,
				canalName: input.canalName,
				coronalLandmarkRef: input.coronalLandmarkRef,
				ealReadingApexDistanceMm: String(input.ealReadingApexDistanceMm),
				workingLengthMm: String(input.workingLengthMm),
				referenceLengthMm: String(input.referenceLengthMm),
				patencyConfirmed: input.patencyConfirmed,
				patencyFileIsoSize: input.patencyFileIsoSize,
				masterApicalFileIso: input.masterApicalFileIso,
				masterApicalTaper: String(input.masterApicalTaper),
				schneiderAngleDeg: String(schneiderAngleDeg),
				schneiderRadiusMm: String(schneiderRadiusMm),
				canalStatus: "obturated",
			})
			.returning();

		return reply.code(201).send({
			success: true,
			measurement,
			curvature: {
				schneiderAngleDeg,
				schneiderRadiusMm,
				isSevere: schneiderAngleDeg > 25,
				isAbruptBend: schneiderRadiusMm < 4.0,
			},
		});
	});

	/**
	 * 3. POST /api/endo/files/usage
	 * Log active NiTi rotary file usage and update accumulated fatigue Phi
	 */
	app.post("/api/endo/files/usage", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"log niti file usage",
		);
		if (!orgId) return;

		const bodySchema = z.object({
			fileInstanceId: z.string().uuid(),
			sessionId: z.string().uuid(),
			canalMeasurementId: z.string().uuid().optional(),
			activeDurationSeconds: z.number().int().positive(),
			measuredSchneiderAngleDeg: z.number().nonnegative(),
			measuredSchneiderRadiusMm: z.number().positive().default(10.0),
			peakTorqueNcm: z.number().optional(),
			isDefectsObserved: z.boolean().default(false),
			defectNotes: z.string().optional(),
		});

		const parsed = bodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "NiTiUsageValidationError",
				message: "Некорректные параметры использования инструмента NiTi.",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		// Fetch file instance and catalog profile
		const [instance] = await db
			.select()
			.from(nitiFileInstances)
			.where(
				and(
					eq(nitiFileInstances.id, input.fileInstanceId),
					eq(nitiFileInstances.organizationId, orgId),
				),
			)
			.limit(1);

		if (!instance) {
			return reply.code(404).send({
				error: "NiTiInstanceNotFound",
				message: "Экземпляр файла NiTi не найден.",
			});
		}

		if (instance.status === "locked_disposed") {
			return reply.code(409).send({
				error: "NiTiFileLocked",
				message:
					"Файл заблокирован и списан из-за исчерпания ресурса усталости. Использование запрещено!",
			});
		}

		const [catalogItem] = await db
			.select()
			.from(nitiFileCatalogItems)
			.where(
				and(
					eq(nitiFileCatalogItems.id, instance.catalogItemId),
					eq(nitiFileCatalogItems.organizationId, orgId),
				),
			)
			.limit(1);

		const kinematics =
			catalogItem?.kinematics === "reciprocating"
				? "reciprocating"
				: "continuous_rotary";
		const isoTip = catalogItem?.isoTipSize ?? 25;
		const taper = Number(catalogItem?.taper ?? 0.06);
		const fatigueCap = catalogItem?.fatigueCapSeconds ?? 600;

		const fatigueResult = NiTiFileFatigueEngine.computeIncrementalFatigue({
			durationSeconds: input.activeDurationSeconds,
			fatigueCapSeconds: fatigueCap,
			schneiderAngleDeg: input.measuredSchneiderAngleDeg,
			schneiderRadiusMm: input.measuredSchneiderRadiusMm,
			kinematics,
			isoTipSize: isoTip,
			taper,
		});

		const currentPhi = Number(instance.accumulatedFatiguePhi);
		const evaluation = NiTiFileFatigueEngine.evaluateFileLifeStatus(
			currentPhi,
			fatigueResult.deltaPhi,
		);

		const now = new Date();

		const result = await db.transaction(async (tx) => {
			const [usageLog] = await tx
				.insert(nitiFileUsageLogs)
				.values({
					organizationId: orgId,
					fileInstanceId: input.fileInstanceId,
					sessionId: input.sessionId,
					canalMeasurementId: input.canalMeasurementId,
					activeDurationSeconds: input.activeDurationSeconds,
					measuredSchneiderAngleDeg: String(
						input.measuredSchneiderAngleDeg,
					),
					measuredSchneiderRadiusMm: String(
						input.measuredSchneiderRadiusMm,
					),
					peakTorqueNcm: input.peakTorqueNcm
						? String(input.peakTorqueNcm)
						: null,
					incrementalFatigueDeltaPhi: String(fatigueResult.deltaPhi),
					resultingFatiguePhi: String(evaluation.newPhi),
					isDefectsObserved: input.isDefectsObserved,
					defectNotes: input.defectNotes,
				})
				.returning();

			await tx
				.update(nitiFileInstances)
				.set({
					cumulativeUsageSeconds:
						instance.cumulativeUsageSeconds +
						input.activeDurationSeconds,
					cumulativeCanalsCount: instance.cumulativeCanalsCount + 1,
					accumulatedFatiguePhi: String(evaluation.newPhi),
					status: evaluation.newStatus,
					lockoutReason: evaluation.lockoutReason,
					lockedAt: evaluation.isLockoutRequired ? now : null,
					lastUsedAt: now,
				})
				.where(
					and(
						eq(nitiFileInstances.id, input.fileInstanceId),
						eq(nitiFileInstances.organizationId, orgId),
					),
				);

			return usageLog;
		});

		return reply.code(201).send({
			success: true,
			usageLog: result,
			fatigueEvaluation: evaluation,
		});
	});
}
