import type { FastifyInstance } from "fastify";
import { getPatientByIdFromDb, updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { requireOrganizationId } from "../../security/identity.js";
import { parseOrthoData } from "./helpers.js";
import { deductOrthoMaterialSafely } from "./materialDeduction.js";
import { archwireChangeSchema, ligatureActivateSchema, patientParamsSchema, type OrthodonticProgressRecord } from "./types.js";

export function registerArchwireRoutes(app: FastifyInstance, prefix = "/api/orthodontics") {
	app.post<{ Params: { patientId: string } }>(
		`${prefix}/:patientId/archwire-change`,
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = patientParamsSchema.parse(request.params);
			const body = archwireChangeSchema.parse(request.body);
			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const currentProgress = parseOrthoData(adminProfile.orthodonticProgress);
			const archLabel = body.arch === "upper" ? "ВЧ" : body.arch === "lower" ? "НЧ" : "ВЧ + НЧ";
			const archwireStr = `${body.material} ${body.section}" (${archLabel})`;
			const actionSummary = `Смена дуги: ${archwireStr}${body.note ? ` · ${body.note}` : ""}`;

			const updatedProgress: OrthodonticProgressRecord = {
				...currentProgress,
				archwire: archwireStr,
				lastActionDate: new Date().toISOString(),
				lastActionSummary: actionSummary,
			};

			await updatePatientAdministrativeProfileInDb(orgId, patientId, {
				...adminProfile,
				orthodonticProgress: JSON.stringify(updatedProgress),
			});

			const archwireQty = body.arch === "both" ? 2 : 1;
			const deduction = await deductOrthoMaterialSafely({
				organizationId: orgId,
				patientId,
				itemNamePattern: body.material,
				defaultItemName: `Дуга ортодонтическая ${body.material} ${body.section}"`,
				category: "ortho_archwire",
				quantity: archwireQty,
				unit: "шт.",
				unitCostRub: 1200,
				notes: `Смена дуги: ${archwireStr}`,
			});

			return reply.send({ success: true, archwire: archwireStr, actionSummary, progress: updatedProgress, deduction });
		},
	);

	app.post<{ Params: { patientId: string } }>(
		`${prefix}/:patientId/ligatures-activate`,
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = patientParamsSchema.parse(request.params);
			const body = ligatureActivateSchema.parse(request.body);
			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const currentProgress = parseOrthoData(adminProfile.orthodonticProgress);
			const actionSummary = body.powerChain
				? `Установка цепочки Power Chain${body.powerChainSpan ? ` (сегмент ${body.powerChainSpan})` : ""}`
				: `Активация лигатур замков брекет-системы${body.note ? ` · ${body.note}` : ""}`;

			const updatedProgress: OrthodonticProgressRecord = {
				...currentProgress,
				lastActionDate: new Date().toISOString(),
				lastActionSummary: actionSummary,
			};

			await updatePatientAdministrativeProfileInDb(orgId, patientId, {
				...adminProfile,
				orthodonticProgress: JSON.stringify(updatedProgress),
			});

			const deduction = await deductOrthoMaterialSafely({
				organizationId: orgId,
				patientId,
				itemNamePattern: body.powerChain ? "Power Chain" : "лигатур",
				defaultItemName: body.powerChain
					? "Эластическая цепочка Power Chain"
					: "Эластические лигатуры цветные/прозрачные",
				category: body.powerChain ? "ortho_archwire" : "other",
				quantity: body.powerChain ? 1 : 10,
				unit: body.powerChain ? "см" : "шт.",
				unitCostRub: body.powerChain ? 80 : 15,
				notes: actionSummary,
			});

			return reply.send({ success: true, actionSummary, progress: updatedProgress, deduction });
		},
	);
}
