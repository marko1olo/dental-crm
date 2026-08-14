import { CephalometricEngine } from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	orthodonticBiomechanicalPlans,
	orthodonticCephalometricStudies,
	patients,
} from "../db/schema.js";

const point2dSchema = z.object({
	x: z.number(),
	y: z.number(),
});

const calculateCephalometricsSchema = z.object({
	patientId: z.string().uuid(),
	landmarks: z.object({
		S: point2dSchema,
		N: point2dSchema,
		Ba: point2dSchema.optional(),
		Po: point2dSchema,
		Or: point2dSchema,
		ANS: point2dSchema,
		PNS: point2dSchema,
		A: point2dSchema,
		B: point2dSchema,
		Pog: point2dSchema,
		Gn: point2dSchema,
		Me: point2dSchema,
		Go: point2dSchema,
		U1_apex: point2dSchema,
		U1_tip: point2dSchema,
		L1_apex: point2dSchema,
		L1_tip: point2dSchema,
		Occ_ant: point2dSchema,
		Occ_post: point2dSchema,
		Prn: point2dSchema,
		Sn: point2dSchema,
		Ls: point2dSchema,
		Li: point2dSchema,
		Pog_s: point2dSchema,
	}),
	scaleMmPerPixel: z.number().positive(),
	calibrationRuler: z.object({
		p1: point2dSchema,
		p2: point2dSchema,
		trueLengthMm: z.number().positive(),
	}),
	imageWidthPx: z.number().int().positive(),
	imageHeightPx: z.number().int().positive(),
	xrayScanId: z.string().uuid().optional(),
	visitId: z.string().uuid().optional(),
});

export async function registerOrthodonticRoutes(app: FastifyInstance) {
	/**
	 * 1. POST /api/orthodontics/cephalometrics/calculate
	 * Pure mathematical analysis of 20 anatomical craniofacial landmarks
	 */
	app.post("/api/orthodontics/cephalometrics/calculate", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = calculateCephalometricsSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "CephalometricValidationError",
				message: "Некорректные координаты анатомических точек ТРГ.",
				details: parsed.error.format(),
			});
		}

		const { landmarks, scaleMmPerPixel } = parsed.data;
		const analysis = CephalometricEngine.runFullAnalysis(
			landmarks,
			scaleMmPerPixel,
		);

		return reply.send({
			success: true,
			analysis,
		});
	});

	/**
	 * 2. POST /api/orthodontics/cephalometrics/save
	 * Persist cephalometric study and analysis to PostgreSQL
	 */
	app.post("/api/orthodontics/cephalometrics/save", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"save cephalometrics study",
		);
		if (!orgId) return;

		const parsed = calculateCephalometricsSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "CephalometricValidationError",
				message: "Некорректные параметры для сохранения ТРГ исследования.",
				details: parsed.error.format(),
			});
		}
		const data = parsed.data;

		// Verify patient
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(
				and(
					eq(patients.id, data.patientId),
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

		const analysis = CephalometricEngine.runFullAnalysis(
			data.landmarks,
			data.scaleMmPerPixel,
		);

		const [study] = await db
			.insert(orthodonticCephalometricStudies)
			.values({
				organizationId: orgId,
				patientId: data.patientId,
				visitId: data.visitId,
				xrayScanId: data.xrayScanId,
				imageWidthPx: data.imageWidthPx,
				imageHeightPx: data.imageHeightPx,
				scaleMmPerPixel: String(data.scaleMmPerPixel),
				calibrationRulerJson: data.calibrationRuler,
				landmarksJson: data.landmarks,
				snaAngleDeg: String(analysis.steiner.snaDeg),
				snbAngleDeg: String(analysis.steiner.snbDeg),
				anbAngleDeg: String(analysis.steiner.anbDeg),
				snGoGnAngleDeg: String(analysis.steiner.snGoGnDeg),
				u1NaAngleDeg: String(analysis.steiner.u1NaAngleDeg),
				u1NaDistanceMm: String(analysis.steiner.u1NaDistanceMm),
				l1NbAngleDeg: String(analysis.steiner.l1NbAngleDeg),
				l1NbDistanceMm: String(analysis.steiner.l1NbDistanceMm),
				interincisalAngleDeg: String(analysis.steiner.interincisalAngleDeg),
				steinerUpperLipDistanceMm: String(
					analysis.steiner.steinerUpperLipDistanceMm,
				),
				steinerLowerLipDistanceMm: String(
					analysis.steiner.steinerLowerLipDistanceMm,
				),
				fmaAngleDeg: String(analysis.tweed.fmaDeg),
				impaAngleDeg: String(analysis.tweed.impaDeg),
				fmiaAngleDeg: String(analysis.tweed.fmiaDeg),
				witsAoBoMm: String(analysis.wits.witsAoBoMm),
				skeletalClass: analysis.classifications.skeletalClass,
				facialBiotype: analysis.classifications.facialBiotype,
				growthVector: analysis.classifications.growthVector,
				clinicalInterpretationReport: analysis.clinicalInterpretation,
			})
			.returning();

		return reply.code(201).send({
			success: true,
			study,
			analysis,
		});
	});

	/**
	 * 3. GET /api/orthodontics/cephalometrics/patient/:patientId
	 * Retrieve historical cephalometric tracings for patient
	 */
	app.get("/api/orthodontics/cephalometrics/patient/:patientId", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { patientId } = request.params as { patientId: string };
		const studies = await db
			.select()
			.from(orthodonticCephalometricStudies)
			.where(
				and(
					eq(orthodonticCephalometricStudies.organizationId, orgId),
					eq(orthodonticCephalometricStudies.patientId, patientId),
				),
			)
			.orderBy(desc(orthodonticCephalometricStudies.studyDate));

		return reply.send({
			success: true,
			patientId,
			studies,
		});
	});
}
