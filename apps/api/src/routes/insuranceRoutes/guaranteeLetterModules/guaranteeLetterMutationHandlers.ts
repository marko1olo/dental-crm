import {
	dmsGuaranteeLetterCreateSchema,
	dmsGuaranteeLetterUpdateSchema,
	kopecksToRubles,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { dmsGuaranteeLetters } from "../../../db/schema.js";
import { formatGuaranteeLetterResponse, isValidUuid } from "./guaranteeLetterFormatters.js";

export async function handleCreateGuaranteeLetter(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"insurance guarantee letter create",
	);
	if (!orgId) return;

	const parsed = dmsGuaranteeLetterCreateSchema.safeParse(request.body);
	if (!parsed.success) {
		const msg = parsed.error.issues[0]?.message ?? "Проверьте правильность заполнения гарантийного письма.";
		return reply.code(400).send({
			error: "ValidationError",
			message: msg,
		});
	}

	const data = parsed.data;
	const effectiveMaxRub = data.maxCoverageRub > 0
		? data.maxCoverageRub
		: (data.limitKopecks ? kopecksToRubles(data.limitKopecks) : (data.maxCoverageKopecks ? kopecksToRubles(data.maxCoverageKopecks) : 0));

	if (effectiveMaxRub <= 0) {
		return reply.code(400).send({
			error: "InvalidLimit",
			message: "Лимит покрытия по гарантийному письму должен быть больше 0 ₽.",
		});
	}

	const effectiveValidUntil = data.validUntil || data.validTo || "";
	if (data.validFrom > effectiveValidUntil) {
		return reply.code(400).send({
			error: "InvalidDateRange",
			message: "Дата начала действия гарантийного письма не может быть позже даты окончания.",
		});
	}

	const validLetterId = isValidUuid(data.id) ? data.id : undefined;

	const created = await db.transaction(async (tx) => {
		const [inserted] = await tx
			.insert(dmsGuaranteeLetters)
			.values({
				...(validLetterId ? { id: validLetterId } : {}),
				organizationId: orgId,
				contractId: data.contractId ?? null,
				patientId: data.patientId,
				patientFullName: data.patientFullName.trim(),
				patientBirthDate: data.patientBirthDate ?? null,
				policyNumber: data.policyNumber.trim(),
				insurerKey: data.insurerKey || "custom",
				insurerName: data.insurerName.trim(),
				letterNumber: data.letterNumber.trim(),
				issueDate: data.issueDate,
				validFrom: data.validFrom,
				validUntil: effectiveValidUntil,
				maxCoverageRub: effectiveMaxRub,
				usedAmountRub: data.usedAmountRub ?? (data.usedKopecks ? kopecksToRubles(data.usedKopecks) : 0),
				franchisePct: data.franchisePct ?? 0,
				franchiseType: data.franchiseType ?? "percent",
				franchiseFixedRub: data.franchiseFixedRub ?? 0,
				programExclusions: data.programExclusions ?? [],
				approvedServiceCodes: data.approvedServiceCodes ?? [],
				approvedTeethFdi: data.approvedTeethFdi ?? [],
				approvedDiagnosisCodes: data.approvedDiagnosisCodes ?? [],
				curatorFullName: data.curatorFullName ?? null,
				curatorPhone: data.curatorPhone ?? null,
				notes: data.notes ?? "",
				status: data.status ?? "active",
			})
			.returning();

		return inserted;
	});

	if (!created) {
		return reply.code(500).send({
			error: "LetterNotSaved",
			message: "Не удалось сохранить гарантийное письмо ДМС в базе данных.",
		});
	}

	return reply.code(201).send(formatGuaranteeLetterResponse(created));
}

export async function handleUpdateGuaranteeLetter(
	request: FastifyRequest<{ Params: { letterId: string } }>,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"insurance guarantee letter update",
	);
	if (!orgId) return;

	const { letterId } = request.params;
	if (!isValidUuid(letterId)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Параметр letterId должен быть валидным UUID.",
		});
	}

	const parsed = dmsGuaranteeLetterUpdateSchema.safeParse(request.body);
	if (!parsed.success) {
		const msg = parsed.error.issues[0]?.message ?? "Проверьте правильность обновления гарантийного письма.";
		return reply.code(400).send({
			error: "ValidationError",
			message: msg,
		});
	}

	const d = parsed.data;

	const txResult = await db.transaction(async (tx) => {
		const [existing] = await tx
			.select()
			.from(dmsGuaranteeLetters)
			.where(
				and(
					eq(dmsGuaranteeLetters.id, letterId),
					eq(dmsGuaranteeLetters.organizationId, orgId),
				),
			)
			.for("update")
			.limit(1);

		if (!existing) {
			return { status: 404, error: { error: "LetterNotFound", message: "Гарантийное письмо ДМС не найдено в вашей клинике." } };
		}

		const updateData: Partial<typeof dmsGuaranteeLetters.$inferInsert> = {
			updatedAt: new Date(),
		};

		if (d.contractId !== undefined) updateData.contractId = d.contractId ?? null;
		if (d.patientId !== undefined) updateData.patientId = d.patientId;
		if (d.patientFullName !== undefined) updateData.patientFullName = d.patientFullName.trim();
		if (d.patientBirthDate !== undefined) updateData.patientBirthDate = d.patientBirthDate ?? null;
		if (d.policyNumber !== undefined) updateData.policyNumber = d.policyNumber.trim();
		if (d.insurerKey !== undefined) updateData.insurerKey = d.insurerKey;
		if (d.insurerName !== undefined) updateData.insurerName = d.insurerName.trim();
		if (d.letterNumber !== undefined) updateData.letterNumber = d.letterNumber.trim();
		if (d.issueDate !== undefined) updateData.issueDate = d.issueDate;
		if (d.validFrom !== undefined) updateData.validFrom = d.validFrom;
		if (d.validUntil !== undefined) updateData.validUntil = d.validUntil;
		else if (d.validTo !== undefined) updateData.validUntil = d.validTo;
		if (d.maxCoverageRub !== undefined) updateData.maxCoverageRub = d.maxCoverageRub;
		else if (d.limitKopecks !== undefined) updateData.maxCoverageRub = kopecksToRubles(d.limitKopecks);
		else if (d.maxCoverageKopecks !== undefined) updateData.maxCoverageRub = kopecksToRubles(d.maxCoverageKopecks);
		if (d.usedAmountRub !== undefined) updateData.usedAmountRub = d.usedAmountRub;
		else if (d.usedKopecks !== undefined) updateData.usedAmountRub = kopecksToRubles(d.usedKopecks);
		else if (d.usedAmountKopecks !== undefined) updateData.usedAmountRub = kopecksToRubles(d.usedAmountKopecks);
		if (d.franchisePct !== undefined) updateData.franchisePct = d.franchisePct;
		if (d.franchiseType !== undefined) updateData.franchiseType = d.franchiseType;
		if (d.franchiseFixedRub !== undefined) updateData.franchiseFixedRub = d.franchiseFixedRub;
		if (d.programExclusions !== undefined) updateData.programExclusions = d.programExclusions;
		if (d.approvedServiceCodes !== undefined) updateData.approvedServiceCodes = d.approvedServiceCodes;
		if (d.approvedTeethFdi !== undefined) updateData.approvedTeethFdi = d.approvedTeethFdi;
		if (d.approvedDiagnosisCodes !== undefined) updateData.approvedDiagnosisCodes = d.approvedDiagnosisCodes;
		if (d.curatorFullName !== undefined) updateData.curatorFullName = d.curatorFullName ?? null;
		if (d.curatorPhone !== undefined) updateData.curatorPhone = d.curatorPhone ?? null;
		if (d.notes !== undefined) updateData.notes = d.notes;
		if (d.status !== undefined) updateData.status = d.status;

		const finalMax = updateData.maxCoverageRub !== undefined ? Number(updateData.maxCoverageRub) : Number(existing.maxCoverageRub);
		const finalUsed = updateData.usedAmountRub !== undefined ? Number(updateData.usedAmountRub) : Number(existing.usedAmountRub);
		if (finalUsed >= finalMax && updateData.status === undefined) {
			updateData.status = "exhausted";
		}

		const [updated] = await tx
			.update(dmsGuaranteeLetters)
			.set(updateData)
			.where(
				and(
					eq(dmsGuaranteeLetters.id, letterId),
					eq(dmsGuaranteeLetters.organizationId, orgId),
				),
			)
			.returning();

		if (!updated) {
			return {
				status: 404,
				error: {
					error: "guarantee_letter_not_found",
					message: "Гарантийное письмо не найдено или не принадлежит организации",
				},
			};
		}

		return { status: 200, data: updated };
	});

	if (txResult.status !== 200 || !txResult.data) {
		return reply.code(txResult.status).send(txResult.error);
	}

	return reply.code(200).send(formatGuaranteeLetterResponse(txResult.data));
}

export async function handleDeleteGuaranteeLetter(
	request: FastifyRequest<{ Params: { letterId: string } }>,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"insurance guarantee letter delete",
	);
	if (!orgId) return;

	const { letterId } = request.params;
	if (!isValidUuid(letterId)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Параметр letterId должен быть валидным UUID.",
		});
	}

	const deleteResult = await db.transaction(async (tx) => {
		const [existing] = await tx
			.select({ id: dmsGuaranteeLetters.id })
			.from(dmsGuaranteeLetters)
			.where(
				and(
					eq(dmsGuaranteeLetters.id, letterId),
					eq(dmsGuaranteeLetters.organizationId, orgId),
				),
			)
			.for("update")
			.limit(1);

		if (!existing) {
			return { status: 404, error: { error: "LetterNotFound", message: "Гарантийное письмо ДМС не найдено в вашей клинике." } };
		}

		await tx
			.update(dmsGuaranteeLetters)
			.set({ status: "cancelled", updatedAt: new Date() })
			.where(
				and(
					eq(dmsGuaranteeLetters.id, letterId),
					eq(dmsGuaranteeLetters.organizationId, orgId),
				),
			);

		return { status: 200 };
	});

	if (deleteResult.status !== 200) {
		return reply.code(deleteResult.status).send(deleteResult.error);
	}

	return reply.code(200).send({
		success: true,
		letterId,
		message: "Гарантийное письмо отозвано / аннулировано.",
	});
}

export function registerGuaranteeLetterMutationRoutes(app: FastifyInstance) {
	app.post("/api/insurance/guarantee-letters", handleCreateGuaranteeLetter);
	app.put<{ Params: { letterId: string } }>(
		"/api/insurance/guarantee-letters/:letterId",
		handleUpdateGuaranteeLetter,
	);
	app.delete<{ Params: { letterId: string } }>(
		"/api/insurance/guarantee-letters/:letterId",
		handleDeleteGuaranteeLetter,
	);
}
