/**
 * writeOffRoutes.ts — Компактный фасад маршрутов списания ТМЦ и партионного учета (FEFO).
 * Декомпозирован по стандарту /decomposer (строго <= 250 строк).
 * Логика вынесена в writeOffModules: FEFO, пакеты приёма, мягкий овердрафт.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { getRequestIdentity } from "../../security/identity.js";
import { TreatmentConsumablesService } from "../../services/treatmentConsumablesService.js";
import {
	type QuickWriteoffCarpulesBody,
	type QuickWriteoffOrthopedicBody,
	type QuickWriteoffPackageBody,
	type QuickWriteoffShiftBundleBody,
	type QuickWriteoffStandardKitBody,
	type QuickWriteoffSurgeryBody,
	type QuickWriteoffVisitBundleBody,
	executeQuickPackageWriteOff,
	handleDeductRequest,
	handleDeductVisitRequest,
} from "./writeOffModules/index.js";

export const writeOffRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
	// 1-клик списание базового набора приёма (перчатки, маска, слюноотсос, валики)
	server.post<{
		Params: { organizationId: string };
		Body?: QuickWriteoffStandardKitBody;
	}>("/:organizationId/quick-writeoff-standard-kit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff standard kit",
		);
		if (!resolvedOrgId) return;
		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) return reply.code(403).send({ error: "Forbidden" });

		const body = request.body ?? {};
		return withTenantCtx(organizationId, async (tx) => {
			return TreatmentConsumablesService.quickWriteoffStandardKit(tx, {
				organizationId,
				userId: request.user?.id ?? null,
				visitId: body.visitId ?? null,
				notes: body.notes ?? null,
			});
		});
	});

	// 1-клик списание пустых карпул анестетиков медсестрой (СанПиН 3.3686-21, отходы Класса Б)
	server.post<{
		Params: { organizationId: string };
		Body?: QuickWriteoffCarpulesBody;
	}>("/:organizationId/quick-writeoff-carpules", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff carpules",
		);
		if (!resolvedOrgId) return;
		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) return reply.code(403).send({ error: "Forbidden" });

		const body = request.body ?? {};
		return withTenantCtx(organizationId, async (tx) => {
			return TreatmentConsumablesService.quickWriteoffCarpules(tx, {
				organizationId,
				carpulesCount: body.carpulesCount,
				drugName: body.drugName,
				userId: request.user?.id ?? null,
				visitId: body.visitId ?? null,
				notes: body.notes ?? null,
			});
		});
	});

	// 1-клик пакетное списание смены (терапия / ортопедия / хирургия)
	server.post<{
		Params: { organizationId: string };
		Body?: QuickWriteoffShiftBundleBody;
	}>("/:organizationId/quick-writeoff-shift-bundle", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff shift bundle",
		);
		if (!resolvedOrgId) return;
		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) return reply.code(403).send({ error: "Forbidden" });

		const body = request.body ?? {};
		return withTenantCtx(organizationId, async (tx) => {
			return TreatmentConsumablesService.quickWriteoffShiftBundle(tx, {
				organizationId,
				bundleType: body.bundleType || "therapy",
				userId: request.user?.id ?? null,
				visitId: body.visitId ?? null,
				notes: body.notes ?? null,
			});
		});
	});

	// 1-клик списание набора клинического приёма с поддержкой мягкого овердрафта
	server.post<{
		Params: { organizationId: string };
		Body?: QuickWriteoffVisitBundleBody;
	}>("/:organizationId/quick-writeoff-visit-bundle", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff visit bundle",
		);
		if (!resolvedOrgId) return;
		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) return reply.code(403).send({ error: "Forbidden" });

		const body = request.body ?? {};
		return withTenantCtx(organizationId, async (tx) => {
			return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
				organizationId,
				visitType: body.visitType || "therapy",
				userId: request.user?.id ?? null,
				visitId: body.visitId ?? null,
				notes: body.notes ?? null,
			});
		});
	});

	// 1-клик списание расходников ортопедического протокола (Мандаты 8e, 8k, 8n)
	server.post<{
		Params: { organizationId: string };
		Body?: QuickWriteoffOrthopedicBody;
	}>("/:organizationId/quick-writeoff-orthopedic", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff orthopedic",
		);
		if (!resolvedOrgId) return;
		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) return reply.code(403).send({ error: "Forbidden" });

		const body = request.body ?? {};
		return withTenantCtx(organizationId, async (tx) => {
			return TreatmentConsumablesService.quickWriteoffOrthopedicProtocol(tx, {
				organizationId,
				protocolId: body.protocolId || "ortho_prep_zirconia_emax",
				userId: request.user?.id ?? null,
				visitId: body.visitId ?? null,
				toothNumber: body.toothNumber ?? null,
				notes: body.notes ?? null,
			});
		});
	});

	// 1-клик списание хирургических материалов с мягким овердрафтом (Мандаты 8e, 8k, 8n)
	server.post<{
		Params: { organizationId: string };
		Body?: QuickWriteoffSurgeryBody;
	}>("/:organizationId/quick-writeoff-surgery", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff surgery",
		);
		if (!resolvedOrgId) return;
		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) return reply.code(403).send({ error: "Forbidden" });

		const body = request.body ?? {};
		return withTenantCtx(organizationId, async (tx) => {
			return TreatmentConsumablesService.quickWriteoffSurgery(tx, {
				organizationId,
				...body,
				userId: request.user?.id ?? null,
			});
		});
	});

	server.post<{
		Body?: QuickWriteoffSurgeryBody & { organizationId?: string };
	}>("/quick-writeoff-surgery", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff surgery fallback",
		);
		if (!resolvedOrgId) return;
		const targetOrgId = request.body?.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) return reply.code(403).send({ error: "Forbidden" });

		const body = request.body ?? {};
		return withTenantCtx(targetOrgId, async (tx) => {
			return TreatmentConsumablesService.quickWriteoffSurgery(tx, {
				...body,
				organizationId: targetOrgId,
				userId: request.user?.id ?? null,
			});
		});
	});

	// 1-клик пакетное списание анестетиков и расходников (Мандаты 8e п. 10, 8k, 8n)
	server.post<{
		Params: { organizationId: string };
		Body?: QuickWriteoffPackageBody;
	}>("/:organizationId/quick-writeoff-package", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff package",
		);
		if (!resolvedOrgId) return;
		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) return reply.code(403).send({ error: "Forbidden" });

		const body = request.body ?? {};
		const identity = getRequestIdentity(request);
		const effectiveUserId = identity.userId ?? request.user?.id ?? null;

		return withTenantCtx(organizationId, async (tx) => {
			return executeQuickPackageWriteOff(tx, {
				organizationId,
				packageId: body.packageId,
				quantityMultiplier: body.quantityMultiplier,
				effectiveUserId,
				visitId: body.visitId ?? null,
				notes: body.notes ?? null,
			});
		});
	});

	// 1-клик списание укладки «Антишок» / Неотложной помощи (Приказ Минздрава РФ № 786н, Мандат 8e)
	server.post<{
		Params: { organizationId: string };
		Body?: {
			visitId?: string | null;
			scenarioId?: string | null;
			notes?: string | null;
		};
	}>("/:organizationId/quick-writeoff-emergency-antishock", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff emergency antishock",
		);
		if (!resolvedOrgId) return;
		const { organizationId } = request.params;
		const effectiveOrgId =
			organizationId === "current" || !organizationId ? resolvedOrgId : organizationId;
		if (resolvedOrgId !== effectiveOrgId) return reply.code(403).send({ error: "Forbidden" });

		const body = request.body ?? {};
		return withTenantCtx(effectiveOrgId, async (tx) => {
			return TreatmentConsumablesService.quickWriteoffEmergencyAntishock(tx, {
				organizationId: effectiveOrgId,
				userId: request.user?.id ?? null,
				visitId: body.visitId ?? null,
				scenarioId: body.scenarioId ?? null,
				notes: body.notes ?? null,
			});
		});
	});

	server.post<{
		Body?: {
			organizationId?: string;
			visitId?: string | null;
			scenarioId?: string | null;
			notes?: string | null;
		};
	}>("/quick-writeoff-emergency-antishock", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff emergency antishock fallback",
		);
		if (!resolvedOrgId) return;
		const targetOrgId = request.body?.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) return reply.code(403).send({ error: "Forbidden" });

		const body = request.body ?? {};
		return withTenantCtx(targetOrgId, async (tx) => {
			return TreatmentConsumablesService.quickWriteoffEmergencyAntishock(tx, {
				organizationId: targetOrgId,
				userId: request.user?.id ?? null,
				visitId: body.visitId ?? null,
				scenarioId: body.scenarioId ?? null,
				notes: body.notes ?? null,
			});
		});
	});

	// LIVE STOCK DEDUCTION & FEFO CONSUMPTION: DUAL-ROUTE PARITY (Мандаты 8e, 8k, 8s)
	const registerDeductRoute = (path: string) => {
		server.post<{ Params?: { organizationId?: string } }>(path, async (request, reply) => {
			const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"inventory deduct",
			);
			if (!resolvedOrgId) return;
			const targetOrgId = request.params?.organizationId || (request.body as any)?.organizationId || resolvedOrgId;
			if (targetOrgId !== resolvedOrgId) return reply.code(403).send({ error: "Forbidden" });
			return handleDeductRequest(targetOrgId, request.body, request, reply);
		});
	};

	registerDeductRoute("/:organizationId/deduct");
	registerDeductRoute("/deduct");
	registerDeductRoute("/:organizationId/write-off");
	registerDeductRoute("/write-off");
	registerDeductRoute("/:organizationId/transactions");
	registerDeductRoute("/transactions");
	registerDeductRoute("/:organizationId/quick-deduct-surgical");
	registerDeductRoute("/quick-deduct-surgical");

	// АВТОСПИСАНИЕ ПО ВИЗИТУ: DUAL-ROUTE PARITY
	const registerVisitDeductRoute = (path: string) => {
		server.post<{ Params?: { organizationId?: string } }>(path, async (request, reply) => {
			const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"inventory deduct visit",
			);
			if (!resolvedOrgId) return;
			const bodyOrg = (request.body as any)?.organizationId;
			const isUuid = (id?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "");
			const targetOrgId = request.params?.organizationId || (bodyOrg && isUuid(bodyOrg) ? bodyOrg : resolvedOrgId);
			if (targetOrgId !== resolvedOrgId) return reply.code(403).send({ error: "Forbidden" });
			return handleDeductVisitRequest(targetOrgId, request.body, request, reply);
		});
	};

	registerVisitDeductRoute("/:organizationId/auto-bom-deduct");
	registerVisitDeductRoute("/auto-bom-deduct");
	registerVisitDeductRoute("/:organizationId/deduct/visit");
	registerVisitDeductRoute("/deduct/visit");
};

