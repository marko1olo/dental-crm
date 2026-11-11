import { and, eq, inArray } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import {
	patients,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlanStages,
	treatmentPlans,
	users,
} from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import {
	ensurePatientInOrganization,
	loadTreatmentPlansForPatient,
	serializeTreatmentPlan,
	verifyPlanReadAccess,
} from "../../odontogram/planHelpers.js";
import { UUID_SHAPE } from "../../odontogram/types.js";
import { calculateTreatmentPlanItemSummary } from "./treatmentPlanTotalsCalculator.js";

/**
 * treatmentPlanQueries.ts — Чтение планов лечения, карточки сметы и истории лечения.
 *
 * Декомпозирован из patientTreatmentPlanHandlers.ts по Мандатам 8b и 8zi.
 * Обеспечивает:
 * - Мандат 8x & 8ap: семантический serviceCode и чистый клинический контекст.
 * - Полное обогащение данными врачей и статусами из книги лечения.
 */

export async function handleGetTreatmentPlanById(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedOrganizationId(
		request,
		reply,
		"treatment plan read",
	);
	if (!organizationId) return;

	const identity = getRequestIdentity(request);
	const staffRole =
		identity.role ??
		(request as unknown as { user?: { role?: string | null } }).user?.role ??
		null;
	const access = verifyPlanReadAccess(staffRole);
	if (!access.allowed) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.treatment_plan.read",
			role: staffRole,
			message: `Отказ в доступе к плану лечения: ${access.reason}`,
		});
	}

	const { id } = request.params as { id: string };
	if (!UUID_SHAPE.test(id)) {
		return reply.code(400).send({ error: "InvalidTreatmentPlanId" });
	}

	const [plan] = await db
		.select()
		.from(treatmentPlans)
		.where(
			and(
				eq(treatmentPlans.id, id),
				eq(treatmentPlans.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!plan) {
		return reply.code(404).send({ error: "TreatmentPlanNotFound" });
	}

	const [patientRow] = await db
		.select()
		.from(patients)
		.where(
			and(
				eq(patients.id, plan.patientId),
				eq(patients.organizationId, organizationId),
			),
		)
		.limit(1);

	const items = await db
		.select()
		.from(treatmentPlanItemsNew)
		.where(
			and(
				eq(treatmentPlanItemsNew.planId, plan.id),
				eq(treatmentPlanItemsNew.organizationId, organizationId),
			),
		)
		.orderBy(treatmentPlanItemsNew.createdAt);

	const doctorIds = [
		...new Set(
			items
				.map((item) => item.doctorId)
				.filter((dId): dId is string => Boolean(dId)),
		),
	];
	const doctorsById = new Map<
		string,
		{ fullName: string; specialty: string | null }
	>();
	if (doctorIds.length > 0) {
		const docRows = await db
			.select({
				id: users.id,
				fullName: users.fullName,
				role: users.role,
				specialties: users.specialties,
			})
			.from(users)
			.where(
				and(
					eq(users.organizationId, organizationId),
					inArray(users.id, doctorIds),
				),
			);
		for (const doc of docRows) {
			const specList = Array.isArray(doc.specialties)
				? doc.specialties.join(", ")
				: null;
			doctorsById.set(doc.id, {
				fullName: doc.fullName,
				specialty:
					specList ||
					(doc.role === "doctor" ? "Врач-стоматолог" : doc.role),
			});
		}
	}

	const ledgerRows = await db
		.select({
			id: treatmentItems.id,
			status: treatmentItems.status,
			visitId: treatmentItems.visitId,
		})
		.from(treatmentItems)
		.where(
			and(
				eq(treatmentItems.organizationId, organizationId),
				eq(treatmentItems.patientId, plan.patientId),
			),
		);

	const ledgerMap = new Map<string, { status: string; visitId: string | null }>();
	for (const lr of ledgerRows) {
		ledgerMap.set(lr.id.toLowerCase(), { status: lr.status, visitId: lr.visitId });
	}

	const stagesRows = await db
		.select()
		.from(treatmentPlanStages)
		.where(
			and(
				eq(treatmentPlanStages.planId, plan.id),
				eq(treatmentPlanStages.organizationId, organizationId),
			),
		)
		.orderBy(treatmentPlanStages.stageOrder);

	const serialized = serializeTreatmentPlan(
		plan,
		items,
		doctorsById,
		ledgerMap,
		stagesRows,
	);

	const primaryDoctorId = doctorIds[0] ?? "";
	const primaryDoctor = primaryDoctorId ? doctorsById.get(primaryDoctorId) : undefined;

	const validationPayload = {
		planId: plan.id,
		planNumber: plan.id.slice(0, 8).toUpperCase(),
		planTitle: plan.name,
		patientId: plan.patientId,
		patientChartNumber: patientRow
			? patientRow.administrativeProfile?.insurancePolicyNumber ||
				`К-${patientRow.id.slice(0, 8).toUpperCase()}`
			: undefined,
		doctorId: primaryDoctorId,
		doctorFullName: primaryDoctor?.fullName ?? "Лечащий врач",
		createdAtIso: plan.createdAt.toISOString(),
		validUntilIso: plan.priceFrozenUntil ? plan.priceFrozenUntil.toISOString() : undefined,
		items: items.map((item) => {
			const summary = calculateTreatmentPlanItemSummary(item);
			return {
				itemId: summary.itemId,
				toothNumber: summary.toothNumber,
				serviceCode: summary.serviceCode,
				code804n: summary.serviceCode, // Сохранено для обратной совместимости внешних клиентов
				serviceTitle: summary.serviceTitle,
				category: "therapy",
				planUnitPriceRub: summary.unitPriceRub,
				planDiscountRub: summary.planDiscountRub,
				planDiscountPercent: summary.planDiscountPercent,
				quantity: summary.quantity,
				planLineTotalRub: summary.planLineTotalRub,
				serviceId: summary.serviceCode,
				phase: summary.phase,
			};
		}),
	};

	return reply.send({
		success: true,
		plan: serialized,
		validationPayload,
	});
}

export async function handleListPatientTreatmentPlans(
	request: FastifyRequest<{ Params: { patientId: string } }>,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedOrganizationId(
		request,
		reply,
		"treatment plans read",
	);
	if (!organizationId) return;

	const identity = getRequestIdentity(request);
	const staffRole =
		identity.role ??
		(request as unknown as { user?: { role?: string | null } }).user?.role ??
		null;
	const access = verifyPlanReadAccess(staffRole);
	if (!access.allowed) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.treatment_plan.read",
			role: staffRole,
			message: `Отказ в доступе к планам лечения: ${access.reason}`,
		});
	}

	const { patientId } = request.params;
	if (!UUID_SHAPE.test(patientId)) {
		return reply.code(400).send({ error: "InvalidPatientId" });
	}
	if (!(await ensurePatientInOrganization(patientId, organizationId))) {
		return reply.code(404).send({ error: "PatientNotFound" });
	}

	const plans = await loadTreatmentPlansForPatient(patientId, organizationId);
	return reply.send({ success: true, plans });
}
