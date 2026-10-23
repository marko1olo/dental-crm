import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationAccess, resolveOrganizationId } from "../../../accessGuard.js";
import { getRequestIdentity } from "../../../security/identity.js";
import {
	DIARY_CLINIC_UNKNOWN_REVISE_MESSAGE,
	DIARY_NOT_FOUND_REVISE_MESSAGE,
	diaryIdParamsSchema,
	diaryReviseBodySchema,
	isDoctorOrClinicalSigner,
} from "../types.js";
import { executeDiaryReviseTx } from "./diaryReviseTransaction.js";
import type { ReviseInputData } from "./revisionsTypes.js";

export async function handleDiaryRevisePost(req: FastifyRequest, reply: FastifyReply): Promise<void> {
	if (!(await requireClinicalMutationAccess(req, reply, "revise locked diary"))) return;

	const parsedIdParams = diaryIdParamsSchema.safeParse(req.params);
	if (!parsedIdParams.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Идентификатор дневника в адресе должен быть UUID (id).",
		});
	}
	const { id } = parsedIdParams.data;

	const parsedReviseBody = diaryReviseBodySchema.safeParse(req.body ?? {});
	if (!parsedReviseBody.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Тело запроса ревизии дневника должно быть JSON-объектом.",
		});
	}
	const identity = getRequestIdentity(req);
	const userId: string | null = identity.userId ?? req.user?.id ?? null;
	const role: string = identity.role ?? req.user?.role ?? "assistant";

	if (!isDoctorOrClinicalSigner(role)) {
		return reply.code(403).send({
			error: "DoctorOrClinicalSignerRequired",
			message:
				"Исправить уже подписанный дневник приёма может лечащий врач или администратор клиники. Обратитесь к лечащему врачу или администратору клиники — он внесёт правку с пометкой «Исправленному верить», а прежний текст надёжно сохранится в истории версий.",
		});
	}

	const orgId = await resolveOrganizationId(req);
	if (!orgId) {
		return reply.code(403).send({
			error: "OrgRequired",
			message: DIARY_CLINIC_UNKNOWN_REVISE_MESSAGE,
		});
	}

	const body: ReviseInputData = {
		anamnesis: typeof parsedReviseBody.data.anamnesis === "string" ? parsedReviseBody.data.anamnesis : undefined,
		statusLocalis: typeof parsedReviseBody.data.statusLocalis === "string" ? parsedReviseBody.data.statusLocalis : undefined,
		diagnosisIcd10: typeof parsedReviseBody.data.diagnosisIcd10 === "string" ? parsedReviseBody.data.diagnosisIcd10 : undefined,
		diagnosisTooth: typeof parsedReviseBody.data.diagnosisTooth === "string" ? parsedReviseBody.data.diagnosisTooth : undefined,
		treatmentDescription: typeof parsedReviseBody.data.treatmentDescription === "string" ? parsedReviseBody.data.treatmentDescription : undefined,
		complications: typeof parsedReviseBody.data.complications === "string" ? parsedReviseBody.data.complications : undefined,
		comorbidities: typeof parsedReviseBody.data.comorbidities === "string" ? parsedReviseBody.data.comorbidities : undefined,
		instrumentTrayBarcode: typeof parsedReviseBody.data.instrumentTrayBarcode === "string" ? parsedReviseBody.data.instrumentTrayBarcode : undefined,
		revisionReason: typeof parsedReviseBody.data.revisionReason === "string" ? parsedReviseBody.data.revisionReason : undefined,
	};

	const reviseResult = await executeDiaryReviseTx({ id, orgId, userId, role, body });

	if (reviseResult.kind === "not_found") {
		return reply.code(404).send({ error: "NotFound", message: DIARY_NOT_FOUND_REVISE_MESSAGE });
	}
	if (reviseResult.kind === "not_locked") {
		return reply.code(409).send({ error: "NotLocked", message: "Дневник не подписан — просто редактируйте его." });
	}
	if (reviseResult.kind === "forbidden") {
		return reply.code(403).send({
			error: "DoctorOrClinicalSignerRequired",
			message: "Исправить уже подписанный дневник приёма может лечащий врач или администратор клиники.",
		});
	}
	if (reviseResult.kind === "invalid_tray") {
		return reply.code(400).send({
			error: "InvalidTrayBarcode",
			message: "Лоток отмечен в журнале стерилизации как забракованный. Замените лоток на стерильный или очистите поле лотка.",
		});
	}
	if (reviseResult.kind === "update_lost") {
		return reply.code(409).send({
			error: "ReviseConflict",
			message: "Исправление подписанного дневника не применилось: запись уже изменилась или снята с подписи. Откройте приём заново и повторите исправление.",
		});
	}

	return reply.send({
		success: true,
		hash: reviseResult.hash,
		revisionCount: reviseResult.revisionCount,
		cryptoSignatureAttached: false,
	});
}
