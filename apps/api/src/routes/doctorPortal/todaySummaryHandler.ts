import { resolveValidIanaTimeZone, todayDateKeyInTimeZone } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { withTenantCtx } from "../../db/rls.js";
import {
	ensureClinicalStaffAccess,
	requireClinicalReadContext,
} from "../../security/tenantContext.js";
import { clinicTimeZone } from "../../services/reports/managerReports/timezone.js";
import { resolveDoctorUserUuid } from "../payrollSettlementDbQueries.js";
import { computeDoctorTodayEarningsInTx } from "./todaySummaryQuery.js";

const doctorTodaySummaryQuerySchema = z
	.object({
		date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}/)
			.optional(),
		doctorId: z.string().optional(),
	})
	.strict();

export async function handleGetDoctorTodaySummary(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const context = await requireClinicalReadContext(
		request,
		reply,
		"doctor today earnings",
	);
	if (!context) return;
	if (!ensureClinicalStaffAccess(request, reply, "просмотру заработка врача за смену")) {
		return;
	}

	const parsed = doctorTodaySummaryQuerySchema.safeParse(request.query ?? {});
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры запроса сводки заработка врача",
			issues: parsed.error.issues,
		});
	}

	const orgId = context.organizationId;
	const q = parsed.data;
	const explicitDateIso = q.date ? q.date.slice(0, 10) : null;

	const requestedDocId = q.doctorId || context.userId || "";
	if (
		context.role === "doctor" &&
		q.doctorId &&
		context.userId &&
		q.doctorId !== "solo-doctor"
	) {
		const targetCheck = await resolveDoctorUserUuid(
			orgId,
			q.doctorId,
			context.userId,
			request.log,
		);
		if (targetCheck && targetCheck !== context.userId) {
			return reply.code(403).send({
				error: "PermissionDenied",
				message: "Врач может просматривать заработок только по собственной смене",
			});
		}
	}

	const resolvedDocId = await resolveDoctorUserUuid(
		orgId,
		requestedDocId,
		context.userId,
		request.log,
	);
	if (!resolvedDocId) {
		return reply.send({
			success: true,
			data: {
				earnedTodayKopecks: 0,
				grossTodayKopecks: 0,
				commissionPercent: 25,
				completedVisitsCount: 0,
				plannedEarningsKopecks: 0,
			},
		});
	}

	const { summary } = await withTenantCtx(orgId, async (tx) => {
		const dateIso =
			explicitDateIso ??
			todayDateKeyInTimeZone(resolveValidIanaTimeZone(await clinicTimeZone(orgId, tx)));
		return computeDoctorTodayEarningsInTx({
			tx,
			organizationId: orgId,
			doctorId: resolvedDocId,
			dateIso,
		});
	});

	return reply.send({
		success: true,
		data: summary,
	});
}
