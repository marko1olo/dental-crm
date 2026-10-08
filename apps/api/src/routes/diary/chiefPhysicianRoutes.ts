import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	resolveOrganizationId,
} from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	ChiefPhysicianAuditError,
	ChiefPhysicianAuditService,
	type Order203nCriteriaEvaluation,
} from "../../services/clinical/ChiefPhysicianAuditService.js";
import { clinicNotIdentifiedMessage } from "../../utils/clinicSessionRefusal.js";
import { chiefReviewBodySchema, diaryIdParamsSchema } from "./types.js";

export function registerChiefPhysicianRoutes(app: FastifyInstance): void {
	const handleChiefReviewPost = async (
		req: FastifyRequest,
		reply: FastifyReply,
	) => {
		if (
			!(await requireClinicalMutationAccess(
				req,
				reply,
				"chief physician review",
			))
		)
			return;

		const parsedIdParams = diaryIdParamsSchema.safeParse(req.params);
		if (!parsedIdParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор в адресе должен быть UUID (id).",
			});
		}
		const { id } = parsedIdParams.data;

		const parsedBody = chiefReviewBodySchema.safeParse(req.body ?? {});
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Неверное тело запроса экспертизы. Требуется вердикт ('approved' | 'deficiencies_found' | 'critical_violation').",
			});
		}

		const orgId = await resolveOrganizationId(req);
		if (!orgId) {
			return reply.code(403).send({
				error: "OrgRequired",
				message: clinicNotIdentifiedMessage(
					"экспертизу истории болезни провести нельзя",
				),
			});
		}

		const identity = getRequestIdentity(req);
		const userContext = req.user;
		const userId: string | null = identity.userId ?? userContext?.id ?? null;
		const role: string = identity.role ?? userContext?.role ?? "assistant";

		if (role !== "chief_doctor" && role !== "owner" && role !== "admin") {
			return reply.code(403).send({
				error: "OnlyChiefDoctorCanReview",
				message:
					"Экспертиза историй болезни доступна только главному врачу, владельцу или администратору клиники. У вашей смены такого права нет.",
			});
		}

		if (!userId) {
			return reply.code(401).send({
				error: "StaffAuthRequired",
				message:
					"Для проведения экспертизы качества требуется вход сотрудника в смену.",
			});
		}

		let criteriaEvaluation: Partial<Order203nCriteriaEvaluation> | undefined;
		if (parsedBody.data.criteriaEvaluation) {
			criteriaEvaluation = {};
			const raw = parsedBody.data.criteriaEvaluation;
			if (raw.informedConsentPresent !== undefined)
				criteriaEvaluation.informedConsentPresent = raw.informedConsentPresent;
			if (raw.anamnesisComplete !== undefined)
				criteriaEvaluation.anamnesisComplete = raw.anamnesisComplete;
			if (raw.statusLocalisComplete !== undefined)
				criteriaEvaluation.statusLocalisComplete = raw.statusLocalisComplete;
			if (raw.icd10DiagnosisValid !== undefined)
				criteriaEvaluation.icd10DiagnosisValid = raw.icd10DiagnosisValid;
			if (raw.treatmentPlanAdequate !== undefined)
				criteriaEvaluation.treatmentPlanAdequate = raw.treatmentPlanAdequate;
			if (raw.instrumentTraceabilityValid !== undefined)
				criteriaEvaluation.instrumentTraceabilityValid =
					raw.instrumentTraceabilityValid;
		}

		try {
			const result = await ChiefPhysicianAuditService.reviewDiary(
				orgId,
				userId,
				id,
				parsedBody.data.verdict,
				parsedBody.data.notes,
				criteriaEvaluation ? { criteriaEvaluation } : undefined,
			);

			return reply.code(200).send({
				success: true,
				...result,
			});
		} catch (err) {
			if (err instanceof ChiefPhysicianAuditError) {
				if (err.code === "PermissionDenied") {
					return reply.code(403).send({
						error: "PermissionDenied",
						message: err.message,
					});
				}
				if (
					err.code === "VisitNotFound" ||
					err.code === "DiaryNotFound" ||
					err.code === "UserNotFound"
				) {
					return reply.code(404).send({
						error: err.code,
						message: err.message,
					});
				}
				if (
					err.code === "InvalidVerdict" ||
					err.code === "ValidationError"
				) {
					return reply.code(400).send({
						error: err.code,
						message: err.message,
					});
				}
			}
			throw err;
		}
	};

	const handleChiefReviewsGet = async (
		req: FastifyRequest,
		reply: FastifyReply,
	) => {
		if (
			!(await requireClinicalReadAccess(
				req,
				reply,
				"read chief physician reviews",
			))
		)
			return;

		// 152-ФЗ / 323-ФЗ: Экспертиза качества медицинской помощи — врачебная тайна
		const identity = getRequestIdentity(req);
		const staffRole =
			identity.role ??
			(req as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		if (staffRole) {
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.chief_review.read",
					role: staffRole,
					message: `Отказ в доступе к экспертизе качества медпомощи (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}
		}

		const parsedIdParams = diaryIdParamsSchema.safeParse(req.params);
		if (!parsedIdParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор в адресе должен быть UUID (id).",
			});
		}
		const { id } = parsedIdParams.data;

		const orgId = await resolveOrganizationId(req);
		if (!orgId) {
			return reply.code(403).send({
				error: "OrgRequired",
				message: clinicNotIdentifiedMessage(
					"историю экспертиз качества не показать",
				),
			});
		}

		try {
			const reviews = await ChiefPhysicianAuditService.getDiaryReviews(
				orgId,
				id,
			);
			return reply.send({ reviews });
		} catch (err) {
			if (err instanceof ChiefPhysicianAuditError) {
				return reply.code(400).send({
					error: err.code,
					message: err.message,
				});
			}
			throw err;
		}
	};

	app.post("/api/diary/:id/chief-review", handleChiefReviewPost);
	app.post("/api/diaries/:id/chief-review", handleChiefReviewPost);
	app.get("/api/diary/:id/chief-reviews", handleChiefReviewsGet);
	app.get("/api/diaries/:id/chief-reviews", handleChiefReviewsGet);
}
