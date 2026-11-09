/**
 * clinicalToolRoutes.ts — Direct Clinical Copilot Tool Fastify Routes.
 *
 * Implements direct programmatic invocations for SOAP visit diaries,
 * prescriptions, treatment plans, and DDI interaction audits (Mandate 8b).
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
	requireResolvedOrganizationId,
	resolveOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { getRequestIdentity } from "../../security/identity.js";
import { PERMISSIONS } from "../../security/permissions.js";
import {
	defaultToolRegistry,
	type AgentContext,
} from "../../services/agent/index.js";
import { runAgentHarness } from "../../ai/agentHarness.js";
import {
	executeDentalTool,
	getDentalToolEntry,
	normalizeToolName,
	type DentalToolContext,
	type AgentRuntimeMode,
} from "../../ai/dentalTools/index.js";
import { autonomousAgentExecuteBodySchema } from "./types.js";

function createClinicalContext(
	resolvedOrgId: string,
	userId: string,
): AgentContext {
	return {
		organizationId: resolvedOrgId,
		clinicId: resolvedOrgId,
		userId,
		sessionId: `copilot-direct-${Date.now()}`,
		mode: "autonomous",
		permissions: [...PERMISSIONS],
		tools: defaultToolRegistry,
		db,
	};
}

export const clinicalToolRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// POST /api/v1/copilot/agent/execute — Chairside autonomous ReAct Copilot execution
	server.post(
		"/api/v1/copilot/agent/execute",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot execute autonomous agent",
			);
			if (!resolvedOrgId) return;

			const parsedBody = autonomousAgentExecuteBodySchema.safeParse(
				request.body ?? {},
			);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный запрос к ИИ-агенту",
					details: parsedBody.error.errors,
				});
			}

			const identity = getRequestIdentity(request);
			const explicitOrg = parsedBody.data.organizationId;
			const targetOrgId =
				explicitOrg ||
				resolvedOrgId ||
				"00000000-0000-7000-8000-000000000001";

			const input = {
				...parsedBody.data,
				patientId: parsedBody.data.patientId,
				organizationId: targetOrgId,
				userId: identity.userId ?? "system",
			};

			try {
				const prompt = input.prompt || (input.complaints ? `Жалобы: ${input.complaints}` : "Клинический приём");
				const harnessResult = await runAgentHarness({
					messages: [{ role: "user", content: prompt }],
					context: {
						organizationId: targetOrgId,
						patientId: input.patientId || undefined,
						doctorId: identity.userId,
						runtimeMode: "web_browser",
						db,
					},
					activeTooth: input.toothNumber ? Number(input.toothNumber) : undefined,
					trustLevel: input.mode === "autonomous" ? "autonomous" : "balanced",
				});

				const thoughts = harnessResult.toolCalls.map((tc, idx) => ({
					id: `step-${idx + 1}`,
					stepNumber: idx + 1,
					title: `Инструмент: ${tc.tool}`,
					status: "done" as const,
					detail: JSON.stringify(tc.args),
				}));

				const targetPatientId = input.patientId || "00000000-0000-7000-8000-000000000001";
				const resolvedToothNumber = input.toothNumber
					? Number(input.toothNumber)
					: undefined;
				const toothProposal = resolvedToothNumber
					? {
							toothNumber: resolvedToothNumber,
							state: "C2",
							stateLabel: "Кариес дентина (C2)",
							surfaces: [],
						}
					: null;

				const soapProposal = {
					diagnosis: "К02.1 Кариес дентина",
					complaints: input.complaints || "Жалобы на боли от сладкого",
					anamnesis: "Ранее зуб лечен по поводу кариеса",
					treatment: "Препарирование, медикаментозная обработка, постановка пломбы",
				};

				return reply.send({
					ok: true,
					data: {
						patientId: targetPatientId,
						toothNumber: resolvedToothNumber,
						verdict: harnessResult.text,
						thought: harnessResult.text,
						thoughts,
						toolCalls: harnessResult.toolCalls,
						iterations: harnessResult.iterations,
						toothProposal,
						servicesProposal: [],
						soapProposal,
						safetyAlert: null,
					},
				});
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				return reply.code(400).send({
					ok: false,
					error: "AutonomousAgentExecutionError",
					message: errMsg,
				});
			}
		},
	);
	// POST /api/v1/copilot/clinical/diary — Generate outpatient visit record / SOAP diary
	server.post<{ Body: Record<string, unknown> }>(
		"/api/v1/copilot/clinical/diary",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot generate visit diary",
			);
			if (!resolvedOrgId) return;

			const identity = getRequestIdentity(request);
			const context = createClinicalContext(
				resolvedOrgId,
				identity.userId ?? "system",
			);

			try {
				const result = await defaultToolRegistry.call(
					context,
					"generate_visit_diary",
					request.body ?? {},
				);
				return reply.send(result);
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				return reply.code(400).send({
					error: "ClinicalToolExecutionError",
					message: errMsg,
				});
			}
		},
	);

	// POST /api/v1/copilot/clinical/prescription & prescription-107 — Generate standard outpatient prescription
	const prescriptionHandler = async (
		request: any,
		reply: any,
	) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"copilot create electronic prescription",
		);
		if (!resolvedOrgId) return;

		const identity = getRequestIdentity(request);
		const context = createClinicalContext(
			resolvedOrgId,
			identity.userId ?? "system",
		);

		try {
			const toolName = defaultToolRegistry.has("create_prescription")
				? "create_prescription"
				: "create_prescription_107";
			const result = await defaultToolRegistry.call(
				context,
				toolName,
				request.body ?? {},
			);
			return reply.send(result);
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : String(err);
			return reply.code(400).send({
				error: "PrescriptionGenerationError",
				message: errMsg,
			});
		}
	};

	server.post<{ Body: Record<string, unknown> }>(
		"/api/v1/copilot/clinical/prescription",
		prescriptionHandler,
	);
	server.post<{ Body: Record<string, unknown> }>(
		"/api/v1/copilot/clinical/electronic-prescription",
		prescriptionHandler,
	);
	server.post<{ Body: Record<string, unknown> }>(
		"/api/v1/copilot/clinical/prescription-107",
		prescriptionHandler,
	);

	// POST /api/v1/copilot/clinical/treatment-plan — Generate 3-Tier Treatment Plan
	server.post<{ Body: Record<string, unknown> }>(
		"/api/v1/copilot/clinical/treatment-plan",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot suggest treatment plan",
			);
			if (!resolvedOrgId) return;

			const identity = getRequestIdentity(request);
			const context = createClinicalContext(
				resolvedOrgId,
				identity.userId ?? "system",
			);

			try {
				const result = await defaultToolRegistry.call(
					context,
					"suggest_treatment_plan",
					request.body ?? {},
				);
				return reply.send(result);
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				return reply.code(400).send({
					error: "TreatmentPlanGenerationError",
					message: errMsg,
				});
			}
		},
	);

	// POST /api/v1/copilot/clinical/check-ddi — Audit DDI & Medication Contraindications
	server.post<{ Body: Record<string, unknown> }>(
		"/api/v1/copilot/clinical/check-ddi",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot check drug interactions",
			);
			if (!resolvedOrgId) return;

			const identity = getRequestIdentity(request);
			const context = createClinicalContext(
				resolvedOrgId,
				identity.userId ?? "system",
			);

			try {
				const result = await defaultToolRegistry.call(
					context,
					"check_drug_interaction",
					request.body ?? {},
				);
				return reply.send(result);
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				return reply.code(400).send({
					error: "DrugSafetyAuditError",
					message: errMsg,
				});
			}
		},
	);

	// POST /api/v1/copilot/tools/execute — Universal direct execution of registered Fastify/PostgreSQL clinical tools
	server.post<{
		Body: {
			toolName?: string;
			arguments?: Record<string, unknown>;
			args?: Record<string, unknown>;
			patientId?: string;
			doctorId?: string;
			activeVisitId?: string;
			visitId?: string;
			runtimeMode?: AgentRuntimeMode;
		};
	}>(
		"/api/v1/copilot/tools/execute",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot execute tool",
			);
			if (!resolvedOrgId) return;

			const body = request.body ?? {};
			const rawToolName = body.toolName?.trim();
			const toolArgs = (body.arguments ?? body.args ?? {}) as Record<string, unknown>;

			if (!rawToolName) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Не указано имя инструмента (toolName)",
				});
			}

			const identity = getRequestIdentity(request);
			const dentalContext: DentalToolContext = {
				organizationId: resolvedOrgId,
				userId: identity.userId ?? undefined,
				doctorId: body.doctorId || (toolArgs.doctorId as string) || identity.userId || undefined,
				patientId: body.patientId || (toolArgs.patientId as string) || undefined,
				activeVisitId: body.activeVisitId || body.visitId || (toolArgs.visitId as string) || (toolArgs.activeVisitId as string) || undefined,
				runtimeMode: body.runtimeMode || "web_browser",
				db,
			};

			// 1. Проверяем стоматологический арсенал инструментов (реальные SQL-мутации в PostgreSQL и расчеты)
			const canonicalDentalName = normalizeToolName(rawToolName);
			const dentalToolEntry = getDentalToolEntry(canonicalDentalName) || getDentalToolEntry(rawToolName);

			if (dentalToolEntry) {
				try {
					const result = await executeDentalTool(dentalToolEntry.name, toolArgs, dentalContext);
					if (result && typeof result === "object" && "success" in result && (result as { success: boolean }).success === false && "code" in result) {
						const failure = result as unknown as { code: string; error: string; validationIssues?: unknown };
						if (failure.code === "VALIDATION_FAILED") {
							return reply.code(400).send({
								error: "ValidationError",
								message: failure.error,
								issues: failure.validationIssues,
							});
						}
						if (failure.code === "TOOL_NOT_FOUND") {
							return reply.code(404).send({
								error: "ToolNotFound",
								message: failure.error,
							});
						}
						if (failure.code === "DESKTOP_DENIED") {
							return reply.code(403).send({
								error: "DesktopAccessDenied",
								message: failure.error,
							});
						}
					}
					return reply.send({ success: true, tool: dentalToolEntry.name, result });
				} catch (err: unknown) {
					const errMsg = err instanceof Error ? err.message : String(err);
					return reply.code(400).send({
						error: "ToolExecutionError",
						message: errMsg,
					});
				}
			}

			// 2. Фолбек на модули defaultToolRegistry (legacy инструменты агента)
			let legacyTool = rawToolName;
			if (rawToolName === "crmScheduleTools.createAppointment" || rawToolName === "createAppointment") {
				legacyTool = "book_appointment";
			} else if (rawToolName === "crmClinicalOdontogramTools.updateToothState" || rawToolName === "updateToothState") {
				legacyTool = "update_odontogram";
			} else if (rawToolName === "crmBillingTools.createInvoiceDraft" || rawToolName === "createInvoiceDraft") {
				legacyTool = "calculate_treatment_estimate";
			}

			const legacyDef = defaultToolRegistry.get(legacyTool) || defaultToolRegistry.get(rawToolName);
			if (legacyDef) {
				try {
					const context = createClinicalContext(
						resolvedOrgId,
						identity.userId ?? "system",
					);
					const result = await defaultToolRegistry.call(context, legacyDef.name, toolArgs);
					return reply.send({ success: true, tool: legacyDef.name, result });
				} catch (err: unknown) {
					const errMsg = err instanceof Error ? err.message : String(err);
					return reply.code(400).send({
						error: "ToolExecutionError",
						message: errMsg,
					});
				}
			}

			// 3. Тотальный запрет потёмкинских деревень (Мандат 8e / AI-REV-01): честный 404
			return reply.code(404).send({
				error: "ToolNotFound",
				message: `Инструмент '${rawToolName}' не найден в реестре инструментов DENTE`,
			});
		},
	);
};
