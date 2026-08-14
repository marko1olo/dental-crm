import {
	ImplantStabilityCalculator,
	createImplantInstallationSchema,
	recordIsqMeasurementSchema,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	implantIsqMeasurements,
	patientImplantInstallations,
	patients,
	toothStateHistory,
	toothStates,
} from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";

export async function registerClinicalImplantRoutes(app: FastifyInstance) {
	/**
	 * 1. POST /api/clinical/implants/installations
	 * Регистрирует установку имплантата с кривой торка и базовым ISQ
	 */
	app.post("/api/clinical/implants/installations", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
		);
		if (!orgId) return;

		const parsed = createImplantInstallationSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ImplantInstallationValidationError",
				message: "Некорректные параметры протокола установки имплантата.",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		// Verify patient belongs to organization
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
				message: "Пациент не найден в вашей клинике.",
			});
		}

		const { isqMean, isqAnisotropyDelta } =
			ImplantStabilityCalculator.calculateMeanIsq(
				input.baselineIsqMesiodistal,
				input.baselineIsqBuccolingual,
				input.baselineIsqDistopalatal,
			);

		const { protocol, decisionRationale } =
			ImplantStabilityCalculator.evaluateLoadingProtocol(
				isqMean,
				input.finalInsertionTorqueNcm,
				0, // day 0 baseline
			);

		const result = await db.transaction(async (tx) => {
			const [installation] = await tx
				.insert(patientImplantInstallations)
				.values({
					organizationId: orgId,
					patientId: input.patientId,
					surgeonDoctorId: null,
					visitId: input.visitId ?? null,
					catalogItemId: input.catalogItemId ?? null,
					toothNumberFdi: input.toothNumberFdi,
					implantBrand: input.implantBrand,
					implantDiameterMm: String(input.implantDiameterMm),
					implantLengthMm: String(input.implantLengthMm),
					lotNumber: input.lotNumber ?? null,
					serialNumber: input.serialNumber ?? null,
					boneDensityClass: input.boneDensityClass,
					averageHounsfieldUnits: input.averageHounsfieldUnits
						? String(input.averageHounsfieldUnits)
						: null,
					finalInsertionTorqueNcm: String(input.finalInsertionTorqueNcm),
					baselineIsq: Math.round(isqMean),
					initialProtocol: protocol,
					corticalTapUsed: input.corticalTapUsed,
					underdrillingUsed: input.underdrillingUsed,
					boneGraftMaterial: input.boneGraftMaterial ?? null,
					membraneUsed: input.membraneUsed ?? null,
					torqueCurveSamplesJson: JSON.stringify(
						input.torqueCurveSamples || [],
					),
					notes: input.notes ?? null,
				})
				.returning();

			if (!installation) {
				throw new Error("Не удалось сохранить протокол установки имплантата в базе данных.");
			}

			// Record baseline ISQ measurement entry
			await tx.insert(implantIsqMeasurements).values({
				organizationId: orgId,
				installationId: installation.id,
				measuredByDoctorId: null,
				visitId: input.visitId ?? null,
				daysPostOp: 0,
				isqMesiodistal: input.baselineIsqMesiodistal,
				isqBuccolingual: input.baselineIsqBuccolingual,
				isqDistopalatal: input.baselineIsqDistopalatal ?? null,
				isqMean: String(isqMean),
				isqAnisotropyDelta,
				stabilityStatus: "primary_mechanical_high",
				recommendedLoadingDecision: decisionRationale,
				isBiologicalDipDetected: false,
			});

			// Update Odontogram tooth state to 'Implant'
			await tx
				.delete(toothStates)
				.where(
					and(
						eq(toothStates.organizationId, orgId),
						eq(toothStates.patientId, input.patientId),
						eq(toothStates.toothNumber, input.toothNumberFdi),
					),
				);

			await tx.insert(toothStates).values({
				organizationId: orgId,
				patientId: input.patientId,
				toothNumber: input.toothNumberFdi,
				state: "Implant",
				surfaces: ["implant_site"],
				notes: `Имплантат ${input.implantBrand} Ø${input.implantDiameterMm}x${input.implantLengthMm}мм (ISQ: ${Math.round(isqMean)}, ${input.finalInsertionTorqueNcm} Н·см)`,
			});

			await tx.insert(toothStateHistory).values({
				organizationId: orgId,
				patientId: input.patientId,
				toothNumber: input.toothNumberFdi,
				newState: "Implant",
				newSurfaces: ["implant_site"],
				reason: `Хирургическая установка имплантата. Протокол: ${protocol}`,
			});

			return installation;
		});

		wsBroker.broadcastToOrganization(orgId, {
			type: "UPDATE_IMPLANT_RECORD",
			payload: {
				patientId: input.patientId,
				toothNumberFdi: input.toothNumberFdi,
				installationId: result.id,
			},
		});

		return reply.code(201).send({
			success: true,
			installation: result,
			evaluatedProtocol: protocol,
			decisionRationale,
		});
	});

	/**
	 * 2. POST /api/clinical/implants/:installationId/isq
	 * Фиксация динамического замера ISQ с обнаружением биологического проседания (Stability Dip)
	 */
	app.post(
		"/api/clinical/implants/:installationId/isq",
		async (request, reply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
			);
			if (!orgId) return;

			const { installationId } = request.params as {
				installationId: string;
			};
			const parsed = recordIsqMeasurementSchema.safeParse({
				...((request.body as object) || {}),
				installationId,
			});

			if (!parsed.success) {
				return reply.code(400).send({
					error: "IsqMeasurementValidationError",
					message: "Некорректные параметры измерения ISQ.",
					details: parsed.error.format(),
				});
			}
			const input = parsed.data;

			const [installation] = await db
				.select()
				.from(patientImplantInstallations)
				.where(
					and(
						eq(patientImplantInstallations.id, installationId),
						eq(patientImplantInstallations.organizationId, orgId),
					),
				)
				.limit(1);

			if (!installation) {
				return reply.code(404).send({
					error: "ImplantInstallationNotFound",
					message: "Карточка установленного имплантата не найдена.",
				});
			}

			const { isqMean, isqAnisotropyDelta } =
				ImplantStabilityCalculator.calculateMeanIsq(
					input.isqMesiodistal,
					input.isqBuccolingual,
					input.isqDistopalatal,
				);

			const { status, decisionRationale, isBiologicalDip } =
				ImplantStabilityCalculator.evaluateLoadingProtocol(
					isqMean,
					Number(installation.finalInsertionTorqueNcm),
					input.daysPostOp,
				);

			const [measurement] = await db
				.insert(implantIsqMeasurements)
				.values({
					organizationId: orgId,
					installationId,
					measuredByDoctorId: null,
					visitId: input.visitId ?? null,
					daysPostOp: input.daysPostOp,
					isqMesiodistal: input.isqMesiodistal,
					isqBuccolingual: input.isqBuccolingual,
					isqDistopalatal: input.isqDistopalatal ?? null,
					isqMean: String(isqMean),
					isqAnisotropyDelta,
					stabilityStatus: status,
					recommendedLoadingDecision: decisionRationale,
					isBiologicalDipDetected: isBiologicalDip,
					smartpegCode: input.smartpegCode ?? null,
					notes: input.notes ?? null,
				})
				.returning();

			return reply.code(201).send({
				success: true,
				measurement,
				evaluation: {
					status,
					decisionRationale,
					isBiologicalDip,
				},
			});
		},
	);

	/**
	 * 3. GET /api/clinical/implants/patient/:patientId
	 * Получение списка установленных имплантатов пациента (Имплантологический паспорт)
	 */
	app.get(
		"/api/clinical/implants/patient/:patientId",
		async (request, reply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = request.params as { patientId: string };

			const installations = await db
				.select()
				.from(patientImplantInstallations)
				.where(
					and(
						eq(patientImplantInstallations.patientId, patientId),
						eq(patientImplantInstallations.organizationId, orgId),
					),
				)
				.orderBy(desc(patientImplantInstallations.installedAt));

			return reply.send({
				success: true,
				installations,
			});
		},
	);
}

