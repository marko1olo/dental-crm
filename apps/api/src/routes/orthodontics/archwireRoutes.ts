import type { FastifyInstance } from "fastify";
import { getPatientByIdFromDb, updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { requireOrganizationId } from "../../security/identity.js";
import { createInitialOrthoRecord, parseOrthoData } from "./helpers.js";
import { deductOrthoMaterialSafely } from "./materialDeduction.js";
import { linkOrthoServiceToBillingSafely } from "./orthoBillingService.js";
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
			const currentProgress = parseOrthoData(adminProfile.orthodonticProgress) ?? createInitialOrthoRecord();
			const archLabel = body.arch === "upper" ? "ВЧ" : body.arch === "lower" ? "НЧ" : "ВЧ + НЧ";
			const wireSpec = `${body.material} ${body.section}"`;
			const archwireStr = `${wireSpec} (${archLabel})`;
			const actionSummary = `Смена дуги: ${archwireStr}${body.note ? ` · ${body.note}` : ""}`;

			// DEF-ORTHO-01 / Досье a9c64bbc: Раздельное хранение дуг ВЧ и НЧ (исключение взаимного затирания)
			let upperArchwire = currentProgress.upperArchwire;
			let lowerArchwire = currentProgress.lowerArchwire;

			if (body.arch === "upper") {
				upperArchwire = `${wireSpec} (ВЧ)`;
			} else if (body.arch === "lower") {
				lowerArchwire = `${wireSpec} (НЧ)`;
			} else {
				upperArchwire = `${wireSpec} (ВЧ)`;
				lowerArchwire = `${wireSpec} (НЧ)`;
			}

			let combinedArchwire = archwireStr;
			if (body.arch === "both") {
				combinedArchwire = archwireStr;
			} else if (upperArchwire && lowerArchwire) {
				combinedArchwire = `${upperArchwire} / ${lowerArchwire}`;
			} else {
				combinedArchwire = upperArchwire || lowerArchwire || archwireStr;
			}

			const updatedProgress: OrthodonticProgressRecord = {
				...currentProgress,
				upperArchwire,
				lowerArchwire,
				archwire: combinedArchwire,
				lastActionDate: new Date().toISOString(),
				lastActionSummary: actionSummary,
				...(body.soapSummary ? { lastSoapSummary: body.soapSummary } : {}),
			};

			// DEF-ORTHO-01: Сохраняем структурированный JSONB объект вместо JSON-строки
			await updatePatientAdministrativeProfileInDb(orgId, patientId, {
				...adminProfile,
				orthodonticProgress: updatedProgress,
			});

			const isPlate = body.applianceCategory === "plate";
			const shouldDeductWire = Boolean(body.isWireChange && !isPlate);

			const archwireQty = body.arch === "both" ? 2 : 1;
			// DEF-ORTHO-06 / DEF-ORTHO-10: Расчет стоимости в копейках BIGINT, списание только если не съемная пластинка и isWireChange === true
			const deduction = shouldDeductWire
				? await deductOrthoMaterialSafely({
						organizationId: orgId,
						patientId,
						itemNamePattern: body.material,
						defaultItemName: `Дуга ортодонтическая ${body.material} ${body.section}"`,
						category: "ortho_archwire",
						quantity: archwireQty,
						unit: "шт.",
						unitCostKopecks: 120_000n,
						unitCostRub: 1200,
						notes: `Смена дуги: ${archwireStr}`,
						visitId: body.visitId,
				  })
				: null;

			// DEF-ORTHO-05 / Red Team: Связка активации дуги с прейскурантом услуг
			const serviceName = isPlate
				? "Активация съемного ортодонтического аппарата (пластинки)"
				: body.arch === "both"
					? "Активация брекет-системы и замена ортодонтических дуг (ВЧ + НЧ)"
					: `Активация брекет-системы и замена ортодонтической дуги (${archLabel})`;
			const serviceCode = isPlate ? "A16.07.047" : "A16.07.048.002";
			const priceRub = isPlate ? 2500 : body.arch === "both" ? 4000 : 3500;
			const priceKopecks = BigInt(priceRub * 100);

			const billing = await linkOrthoServiceToBillingSafely({
				organizationId: orgId,
				patientId,
				visitId: body.visitId,
				serviceCode,
				serviceName,
				priceRub,
				priceKopecks,
			});

			return reply.send({
				success: true,
				archwire: archwireStr,
				upperArchwire,
				lowerArchwire,
				combinedArchwire,
				actionSummary,
				progress: updatedProgress,
				deduction,
				billing,
			});
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
			const currentProgress = parseOrthoData(adminProfile.orthodonticProgress) ?? createInitialOrthoRecord();
			const actionSummary = body.powerChain
				? `Установка цепочки Power Chain${body.powerChainSpan ? ` (сегмент ${body.powerChainSpan})` : ""}`
				: `Активация лигатур замков брекет-системы${body.note ? ` · ${body.note}` : ""}`;

			const updatedProgress: OrthodonticProgressRecord = {
				...currentProgress,
				lastActionDate: new Date().toISOString(),
				lastActionSummary: actionSummary,
			};

			// DEF-ORTHO-01: Сохраняем структурированный JSONB объект вместо JSON-строки
			await updatePatientAdministrativeProfileInDb(orgId, patientId, {
				...adminProfile,
				orthodonticProgress: updatedProgress,
			});

			const isPlate = body.applianceCategory === "plate";
			const shouldDeductLigatures = !isPlate;

			// DEF-ORTHO-06: Стоимость в копейках BIGINT (Power Chain: 8 000 коп = 80 руб; лигатуры: 1 500 коп = 15 руб)
			// Списание материалов отключается для съемных пластинок (plate)
			const deduction = shouldDeductLigatures
				? await deductOrthoMaterialSafely({
						organizationId: orgId,
						patientId,
						itemNamePattern: body.powerChain ? "Power Chain" : "лигатур",
						defaultItemName: body.powerChain
							? "Эластическая цепочка Power Chain"
							: "Эластические лигатуры цветные/прозрачные",
						category: body.powerChain ? "ortho_archwire" : "other",
						quantity: body.powerChain ? 1 : 10,
						unit: body.powerChain ? "см" : "шт.",
						unitCostKopecks: body.powerChain ? 8_000n : 1_500n,
						unitCostRub: body.powerChain ? 80 : 15,
						notes: actionSummary,
				  })
				: null;

			return reply.send({ success: true, actionSummary, progress: updatedProgress, deduction });
		},
	);
}
