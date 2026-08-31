/**
 * agent.test.ts — Comprehensive test suite for Dentalpin Agentic Core & PHI Redaction Ingestor.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import { z } from "zod";
import type { AgentContext } from "./context.js";
import {
	CopilotActionManager,
	formatSseEvent,
} from "./copilotService.js";
import {
	checkGuardrails,
	permissionMatches,
	resetGuardrailCounters,
} from "./guardrails.js";
import {
	AgentOrchestrator,
	TokenBudgetGuard,
	compactHistory,
	runTurn,
	summarizeHistorySegment,
} from "./orchestrator.js";
import { Redactor, SymbolTable } from "./redaction.js";
import {
	calculateTreatmentEstimateTool,
	cancelAppointmentTool,
	checkDrugInteractionsTool,
	createStaffTaskTool,
	draftLabWorkOrderTool,
	findPatientTool,
	getDoctorScheduleTool,
	getEmrCardTool,
	getFamilyBalanceTool,
	getLabOrdersTool,
	getPatientRecallsTool,
	getPatientTimelineTool,
	registerClinicalTools,
	rescheduleAppointmentTool,
	scheduleRecallTool,
	suggestIcd10PlanTool,
} from "./tools/clinicalTools.js";
import { ToolRegistry } from "./tools/registry.js";
import {
	toolToAnthropicSchema,
	toolToOpenAiSchema,
	zodToJsonSchema,
} from "./tools/schemaSerializer.js";
import type { ToolDefinition } from "./tools/tool.js";
import type {
	LLMProvider,
	ProviderMessage,
} from "./types.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";
const CLINIC_ID = "00000000-0000-7000-8000-000000000002";
const USER_ID = "00000000-0000-7000-8000-000000000003";
const PATIENT_ID = "00000000-0000-7000-8000-000000000004";
const APPOINTMENT_ID = "00000000-0000-7000-8000-000000000005";

function createMockContext(overrides: Partial<AgentContext> = {}): AgentContext {
	const registry = new ToolRegistry();
	registerClinicalTools(registry, "clinical");

	return {
		organizationId: ORG_ID,
		clinicId: CLINIC_ID,
		userId: USER_ID,
		sessionId: "test-session-" + Math.random().toString(36).slice(2),
		mode: "autonomous",
		permissions: [
			"patients.read",
			"clinical.read",
			"clinical.write",
			"schedule.read",
			"schedule.write",
			"billing.read",
			"tasks.write",
			"communications.read",
			"communications.write",
		],
		tools: registry,
		db: null,
		...overrides,
	};
}

describe("PHI Redaction Engine (SymbolTable & Redactor)", () => {
	test("SymbolTable tokenizes deterministically and rehydrates accurately", () => {
		const table = new SymbolTable();
		const realName = "Иванов Иван Иванович";
		const realPhone = "+7 (999) 123-45-67";

		const tokenName1 = table.tokenize(realName, "NAME");
		const tokenName2 = table.tokenize(realName, "NAME");
		const tokenPhone = table.tokenize(realPhone, "PHONE");

		assert.strictEqual(tokenName1, tokenName2, "Tokens must be deterministic for identical input");
		assert.match(tokenName1, /^NAME_[0-9a-f]{6}$/, "Token must match KIND_hash format");
		assert.match(tokenPhone, /^PHONE_[0-9a-f]{6}$/);

		const textWithTokens = `Пациент ${tokenName1}, тел. ${tokenPhone}, готов к осмотру.`;
		const restored = table.restoreText(textWithTokens);

		assert.strictEqual(
			restored,
			`Пациент ${realName}, тел. ${realPhone}, готов к осмотру.`,
			"Text must be restored to original cleartext",
		);
	});

	test("Redactor masks structured JSON keys across all Russian PHI categories", () => {
		const redactor = new Redactor();
		const structuredPayload = {
			fullName: "Петрова Анна Сергеевна",
			phone: "89271234567",
			email: "petrova@dental.ru",
			passport: "45 10 123456",
			snils: "123-456-789 01",
			oms: "1234567890123456",
			address: "г. Москва, ул. Тверская, д. 10",
			birthDate: "1985-05-12",
			patientId: PATIENT_ID,
			clinicalNotes: "Зуб 36 реагирует на холод",
		};

		const redacted = redactor.redactResult(structuredPayload) as Record<string, unknown>;

		assert.notStrictEqual(redacted.fullName, structuredPayload.fullName);
		assert.match(String(redacted.fullName), /^NAME_/);
		assert.match(String(redacted.phone), /^PHONE_/);
		assert.match(String(redacted.email), /^EMAIL_/);
		assert.match(String(redacted.passport), /^PASSPORT_/);
		assert.match(String(redacted.snils), /^SNILS_/);
		assert.match(String(redacted.oms), /^OMS_/);
		assert.match(String(redacted.address), /^ADDRESS_/);
		assert.match(String(redacted.birthDate), /^DOB_/);
		assert.match(String(redacted.patientId), /^PATIENT_/);

		// Resolve args / rehydration round-trip check
		const resolved = redactor.resolveArgs(redacted);
		assert.deepStrictEqual(resolved, structuredPayload, "Resolved args must perfectly match original payload");
	});

	test("Redactor scrubs free-text Russian PII using heuristic NER patterns", () => {
		const redactor = new Redactor();
		const prompt =
			"Запиши Сидорова Олега, телефон +79165554433, паспорт 4510 654321, СНИЛС 987-654-321 00 на прием.";

		const messages: ProviderMessage[] = [
			{
				role: "user",
				content: prompt,
			},
		];

		const outgoing = redactor.redactOutgoing(messages);
		const redactedText = typeof outgoing[0]?.content === "string" ? outgoing[0].content : "";

		assert.ok(!redactedText.includes("+79165554433"), "Phone must not leave in cleartext");
		assert.ok(!redactedText.includes("4510 654321"), "Passport must not leave in cleartext");
		assert.ok(!redactedText.includes("987-654-321 00"), "SNILS must not leave in cleartext");
		assert.match(redactedText, /PHONE_[0-9a-f]{6}/);
		assert.match(redactedText, /PASSPORT_[0-9a-f]{6}/);
		assert.match(redactedText, /SNILS_[0-9a-f]{6}/);

		const restored = redactor.rehydrate(redactedText);
		assert.strictEqual(restored, prompt, "Free text round-trip rehydration must match");
	});

	test("Redactor stream buffer emits clean rehydrated tokens across chunk boundaries", () => {
		const redactor = new Redactor();
		const name = "Смирнов Алексей";
		const token = redactor.table.tokenize(name, "NAME");

		const chunk1 = "Пациент " + token.slice(0, 3);
		const chunk2 = token.slice(3, 7);
		const chunk3 = token.slice(7) + " прибыл в клинику.";

		const delta1 = redactor.rehydrateDelta(chunk1);
		const delta2 = redactor.rehydrateDelta(chunk2);
		const delta3 = redactor.rehydrateDelta(chunk3);
		const flushed = redactor.flushDeltaBuffer();

		const combined = delta1 + delta2 + delta3 + flushed;
		assert.strictEqual(
			combined,
			`Пациент ${name} прибыл в клинику.`,
			"Stream buffering must prevent split token corruption",
		);
	});
});

describe("Guardrails & RBAC Policy Engine", () => {
	test("Wildcard permission matching works accurately", () => {
		assert.ok(permissionMatches("patients.read", "patients.read"));
		assert.ok(permissionMatches("patients.read", "patients.*"));
		assert.ok(permissionMatches("patients.read", "*"));
		assert.ok(permissionMatches("schedule.cancel", "*.cancel"));
		assert.ok(!permissionMatches("billing.write", "patients.*"));
	});

	test("Supervised mode requires approval for non-read tools", () => {
		resetGuardrailCounters();
		const ctx = createMockContext({ mode: "supervised" });

		const mockReadTool: ToolDefinition = {
			name: "read_info",
			description: "Read only",
			parameters: z.object({}),
			permissions: ["patients.read"],
			category: "read",
			handler: async () => ({ ok: true }),
		};

		const mockWriteTool: ToolDefinition = {
			name: "update_card",
			description: "Write card",
			parameters: z.object({}),
			permissions: ["clinical.read"],
			category: "write",
			handler: async () => ({ ok: true }),
		};

		assert.strictEqual(checkGuardrails(ctx, mockReadTool, "read_info"), "allow");
		assert.strictEqual(checkGuardrails(ctx, mockWriteTool, "update_card"), "require_approval");
	});

	test("Rate limiting blocks calls exceeding max actions per minute", () => {
		resetGuardrailCounters();
		const ctx = createMockContext({ mode: "autonomous" });

		const dummyTool: ToolDefinition = {
			name: "quick_tool",
			description: "Fast",
			parameters: z.object({}),
			permissions: ["patients.read"],
			category: "read",
			handler: async () => ({ ok: true }),
		};

		const config = { maxActionsPerMinute: 3 };

		assert.strictEqual(checkGuardrails(ctx, dummyTool, "quick_tool", config), "allow");
		assert.strictEqual(checkGuardrails(ctx, dummyTool, "quick_tool", config), "allow");
		assert.strictEqual(checkGuardrails(ctx, dummyTool, "quick_tool", config), "allow");
		assert.strictEqual(checkGuardrails(ctx, dummyTool, "quick_tool", config), "block");
	});

	test("Blocked tools policy blocks invocation", () => {
		resetGuardrailCounters();
		const ctx = createMockContext();
		const tool: ToolDefinition = {
			name: "danger_tool",
			description: "Danger",
			parameters: z.object({}),
			permissions: ["*"],
			category: "destructive",
			handler: async () => ({ ok: true }),
		};

		const config = { blockedTools: ["danger_*"] };
		assert.strictEqual(checkGuardrails(ctx, tool, "danger_tool", config), "block");
	});
});

describe("Schema Serializer (OpenAI & Anthropic)", () => {
	test("Converts Zod object schema to standard JSON Schema and tool formats", () => {
		const testSchema = z.object({
			patientName: z.string().describe("Имя пациента"),
			age: z.number().optional().describe("Возраст"),
			status: z.enum(["active", "archived"]).default("active"),
		});

		const tool: ToolDefinition = {
			name: "test_tool",
			description: "Test tool description",
			parameters: testSchema,
			permissions: [],
			category: "read",
			handler: async () => ({}),
		};

		const jsonSchema = zodToJsonSchema(testSchema);
		assert.strictEqual(jsonSchema.type, "object");
		assert.deepStrictEqual((jsonSchema as any).required, ["patientName"]);
		assert.ok((jsonSchema as any).properties.patientName);

		const openAi = toolToOpenAiSchema(tool, "mod.test_tool") as any;
		assert.strictEqual(openAi.type, "function");
		assert.strictEqual(openAi.function.name, "mod.test_tool");
		assert.strictEqual(openAi.function.description, "Test tool description");

		const anthropic = toolToAnthropicSchema(tool, "mod.test_tool") as any;
		assert.strictEqual(anthropic.name, "mod.test_tool");
		assert.strictEqual(anthropic.input_schema.type, "object");
	});
});

describe("Tool Registry Chokepoint & RBAC", () => {
	test("Rejects invocation when RBAC permission is missing", async () => {
		const registry = new ToolRegistry();
		const securedTool: ToolDefinition = {
			name: "secret_records",
			description: "VIP only",
			parameters: z.object({ id: z.string() }),
			permissions: ["vip.access"],
			category: "read",
			handler: async () => ({ vip: true }),
		};

		registry.register(securedTool, "admin");

		const ctx = createMockContext({
			permissions: ["patients.read"],
			tools: registry,
		});

		const result = await registry.call(ctx, "admin.secret_records", { id: "123" });
		assert.strictEqual(result.ok, false);
		assert.match(String(result.error), /permission denied: vip\.access/);
	});

	test("Validates parameters against Zod schema before calling handler", async () => {
		const registry = new ToolRegistry();
		const mathTool: ToolDefinition = {
			name: "calc",
			description: "Calc",
			parameters: z.object({
				amount: z.number().min(100, "Сумма должна быть от 100"),
			}),
			permissions: ["patients.read"],
			category: "read",
			handler: async (_ctx, args) => ({ total: args.amount * 2 }),
		};

		registry.register(mathTool);
		const ctx = createMockContext({ tools: registry });

		// Invalid parameter
		const failRes = await registry.call(ctx, "calc", { amount: 50 });
		assert.strictEqual(failRes.ok, false);
		assert.match(String(failRes.error), /validation error: amount/);

		// Valid parameter
		const okRes = await registry.call(ctx, "calc", { amount: 200 });
		assert.strictEqual(okRes.ok, true);
		assert.deepStrictEqual(okRes.data, { total: 400 });
	});
});

describe("Clinical Tools Specification & ICD-10 Validator", () => {
	test("suggest_icd10_plan validates FDI tooth formula and returns matched stages", async () => {
		const ctx = createMockContext();

		// Invalid tooth number (e.g. 99)
		await assert.rejects(
			() =>
				suggestIcd10PlanTool.handler(ctx, {
					complaint: "Ноющая боль",
					toothNumber: 99,
				}),
			/Некорректный номер зуба FDI: 99/,
		);

		// Valid tooth 36 with Pulpitis complaint
		const pulpitisRes = (await suggestIcd10PlanTool.handler(ctx, {
			complaint: "Острая ночная самопроизвольная боль",
			toothNumber: 36,
		})) as any;

		assert.strictEqual(pulpitisRes.toothNumber, 36);
		assert.ok(pulpitisRes.suggestedDiagnoses.length > 0);
		const diag = pulpitisRes.suggestedDiagnoses[0];
		assert.strictEqual(diag.code, "K04.0");
		assert.match(diag.title, /Пульпит/);
		assert.ok(diag.stages.length >= 3);
		assert.strictEqual(diag.validation.isValid, true);
	});

	test("suggest_icd10_plan proposes Caries treatment stages for tooth 11", async () => {
		const ctx = createMockContext();
		const cariesRes = (await suggestIcd10PlanTool.handler(ctx, {
			complaint: "Кариес переднего зуба, реакция на сладкое",
			toothNumber: 11,
		})) as any;

		const diag = cariesRes.suggestedDiagnoses[0];
		assert.strictEqual(diag.code, "K02.1");
		assert.match(diag.title, /Кариес дентина/);
		assert.strictEqual(diag.validation.isValid, true);
	});
});

describe("New Clinical Tools (Timeline, Drug Safety, Lab, Family)", () => {
	test("check_drug_interactions catches allergy clashes and dangerous drug-drug pairs", async () => {
		const mockDb = {
			select: () => ({
				from: () => ({
					where: async () => [
						{
							allergenGroup: "Пенициллины",
							drugInnLatin: "Amoxicillin",
							reactionSeverity: "critical",
							clinicalManifestations: "Отек Квинке",
							hasSamterTriad: false,
						},
					],
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });

		const result = (await checkDrugInteractionsTool.handler(ctx, {
			patientId: PATIENT_ID,
			proposedMedicationIds: ["med_amox_500", "med_metron_500"],
			existingMedicationIds: ["warfarin"],
		})) as any;

		assert.strictEqual(result.isSafe, false);
		assert.strictEqual(result.hasAllergyClash, true);
		assert.strictEqual(result.allergyWarnings.length, 1);
		assert.strictEqual(result.allergyWarnings[0].proposedDrug, "med_amox_500");

		assert.ok(result.drugInteractionsCount >= 1);
		const warfarinRule = result.drugInteractions.find(
			(i: any) => i.drugAId === "med_metron_500" && i.drugBId === "warfarin",
		);
		assert.ok(warfarinRule, "Must detect metronidazole + warfarin critical interaction");
		assert.strictEqual(warfarinRule.severity, "critical");
	});

	test("get_patient_timeline aggregates and sorts chronologically", async () => {
		const now = new Date("2026-08-20T10:00:00Z");
		const yesterday = new Date("2026-08-19T10:00:00Z");
		const lastWeek = new Date("2026-08-12T10:00:00Z");

		let callCount = 0;
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						orderBy: () => ({
							limit: async () => {
								callCount++;
								if (callCount === 1) {
									return [
										{
											id: "v-1",
											complaint: "Боль",
											diagnosis: "K02.1 Кариес",
											doctorSummary: "Пломбирование",
											status: "signed",
											signedAt: now,
											createdAt: now,
										},
									];
								}
								if (callCount === 2) {
									return [
										{
											id: "tp-1",
											name: "Санация",
											title: "Санация",
											status: "active",
											totalPriceRub: "15000.00",
											totalPrice: "15000.00",
											createdAt: lastWeek,
										},
									];
								}
								if (callCount === 3) {
									return [
										{
											id: "p-1",
											amountRub: 5000,
											method: "card",
											status: "paid",
											createdAt: yesterday,
										},
									];
								}
								return [
									{
										id: "lab-1",
										toothFdi: "46",
										material: "Цирконий",
										colorVita: "A2",
										status: "in_progress",
										dueDate: now,
										clinicalNotes: "Коронка",
										createdAt: yesterday,
									},
								];
							},
						}),
					}),
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });
		const res = (await getPatientTimelineTool.handler(ctx, {
			patientId: PATIENT_ID,
			limit: 10,
		})) as any;

		assert.strictEqual(res.patientId, PATIENT_ID);
		assert.strictEqual(res.totalEventsCount, 4);
		assert.strictEqual(res.timeline[0].type, "visit", "Latest event must be first");
		assert.strictEqual(res.timeline[0].id, "v-1");
	});

	test("get_lab_orders retrieves laboratory prosthetic tracking details", async () => {
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						orderBy: async () => [
							{
								id: "lab-123",
								doctorName: "Доктор Смирнов",
								toothFdi: "24",
								material: "E-max Пресс",
								colorVita: "A1",
								status: "shipped",
								dueDate: new Date("2026-09-01T12:00:00Z"),
								clinicalNotes: "Винир",
								labComments: "Готово к отправке",
								priceRub: 18000,
								sentAt: new Date("2026-08-25T10:00:00Z"),
								completedAt: null,
								createdAt: new Date("2026-08-24T10:00:00Z"),
							},
						],
					}),
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });
		const res = (await getLabOrdersTool.handler(ctx, {
			patientId: PATIENT_ID,
			statusFilter: "active",
		})) as any;

		assert.strictEqual(res.count, 1);
		assert.strictEqual(res.orders[0].toothFdi, "24");
		assert.strictEqual(res.orders[0].colorVita, "A1");
		assert.strictEqual(res.orders[0].material, "E-max Пресс");
		assert.strictEqual(res.orders[0].status, "shipped");
	});

	test("get_family_balance fetches linked accounts and head patient balance", async () => {
		const FAMILY_ID = "00000000-0000-7000-8000-000000000099";

		let selectStep = 0;
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => {
							selectStep++;
							if (selectStep === 1) {
								return [
									{
										id: PATIENT_ID,
										fullName: "Иванов Иван (Сын)",
										phone: "+79991112233",
										familyGroupId: FAMILY_ID,
									},
								];
							}
							if (selectStep === 2) {
								return [
									{
										id: FAMILY_ID,
										name: "Семья Ивановых",
										groupName: "Семья Ивановых",
										headPatientId: "00000000-0000-7000-8000-000000000088",
										balance: "24500.50",
									},
								];
							}
							return [];
						},
						then: async (resolve: any) => {
							const members = [
								{
									id: "00000000-0000-7000-8000-000000000088",
									fullName: "Иванов Петр (Отец)",
									phone: "+79990001122",
									birthDate: "1975-01-10",
									status: "active",
								},
								{
									id: PATIENT_ID,
									fullName: "Иванов Иван (Сын)",
									phone: "+79991112233",
									birthDate: "2005-06-15",
									status: "active",
								},
							];
							return resolve ? resolve(members) : members;
						},
					}),
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });
		const res = (await getFamilyBalanceTool.handler(ctx, {
			patientId: PATIENT_ID,
		})) as any;

		assert.strictEqual(res.hasFamilyAccount, true);
		assert.strictEqual(res.familyGroupId, FAMILY_ID);
		assert.strictEqual(res.groupName, "Семья Ивановых");
		assert.strictEqual(res.balanceRub, "24500.50");
		assert.strictEqual(res.membersCount, 2);
		assert.strictEqual(res.members[0].isHead, true);
		assert.strictEqual(res.members[1].isHead, false);
	});
});

describe("Interactive Schedule Mutation Tools (Reschedule, Cancel, Doctor Schedule)", () => {
	test("reschedule_appointment detects schedule conflict and updates valid time", async () => {
		const existingApp = {
			id: APPOINTMENT_ID,
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			doctorUserId: USER_ID,
			chairId: "00000000-0000-7000-8000-000000000077",
			status: "planned",
			startsAt: new Date("2026-09-01T10:00:00Z"),
			endsAt: new Date("2026-09-01T11:00:00Z"),
			comment: null,
		};

		const conflictDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [existingApp],
					}),
				}),
			}),
		};

		const ctxConflict = createMockContext({ db: conflictDb });

		await assert.rejects(
			() =>
				rescheduleAppointmentTool.handler(ctxConflict, {
					appointmentId: APPOINTMENT_ID,
					newStartsAt: "2026-09-01T14:00:00Z",
					newEndsAt: "2026-09-01T15:00:00Z",
					reason: "Пациент попросил перенести на вечер",
				}),
			/Конфликт расписания/,
		);

		let queryStep = 0;
		const successDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => {
							queryStep++;
							if (queryStep === 1) {
								return [existingApp];
							}
							return [];
						},
					}),
				}),
			}),
			update: () => ({
				set: (values: any) => ({
					where: () => ({
						returning: async () => [
							{
								...existingApp,
								startsAt: values.startsAt,
								endsAt: values.endsAt,
								comment: values.comment,
							},
						],
					}),
				}),
			}),
		};

		const ctxSuccess = createMockContext({ db: successDb });
		const result = (await rescheduleAppointmentTool.handler(ctxSuccess, {
			appointmentId: APPOINTMENT_ID,
			newStartsAt: "2026-09-02T12:00:00Z",
			newEndsAt: "2026-09-02T13:00:00Z",
			reason: "Пациент свободен только во вторник",
		})) as any;

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.appointmentId, APPOINTMENT_ID);
		assert.strictEqual(result.newStartsAt, "2026-09-02T12:00:00.000Z");
		assert.strictEqual(result.newEndsAt, "2026-09-02T13:00:00.000Z");
	});

	test("cancel_appointment cancels appointment and sets reason", async () => {
		const existingApp = {
			id: APPOINTMENT_ID,
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			doctorUserId: USER_ID,
			status: "planned",
			comment: "Первичная консультация",
		};

		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [existingApp],
					}),
				}),
			}),
			update: () => ({
				set: (values: any) => ({
					where: () => ({
						returning: async () => [
							{
								...existingApp,
								status: values.status,
								comment: values.comment,
							},
						],
					}),
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });
		const result = (await cancelAppointmentTool.handler(ctx, {
			appointmentId: APPOINTMENT_ID,
			cancellationReason: "Пациент уехал в командировку",
		})) as any;

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.status, "cancelled");
		assert.strictEqual(result.cancellationReason, "Пациент уехал в командировку");
		assert.ok(result.cancelledAt);
	});

	test("get_doctor_schedule computes booked minutes and free capacity", async () => {
		const shiftStart = new Date("2026-09-01T09:00:00Z");
		const shiftEnd = new Date("2026-09-01T18:00:00Z");

		const mockDb = {
			select: () => ({
				from: () => ({
					leftJoin: () => ({
						where: () => ({
							orderBy: async () => [
								{
									id: "app-1",
									patientId: PATIENT_ID,
									patientName: "Сидоров Алексей",
									chairId: "chair-1",
									status: "confirmed",
									startsAt: new Date("2026-09-01T10:00:00Z"),
									endsAt: new Date("2026-09-01T11:00:00Z"),
									reason: "Лечение пульпита 36 зуба",
									comment: null,
								},
								{
									id: "app-2",
									patientId: PATIENT_ID,
									patientName: "Кузнецова Ольга",
									chairId: "chair-1",
									status: "planned",
									startsAt: new Date("2026-09-01T14:00:00Z"),
									endsAt: new Date("2026-09-01T15:30:00Z"),
									reason: "Профгигиена Air-Flow",
									comment: null,
								},
							],
						}),
					}),
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });
		const result = (await getDoctorScheduleTool.handler(ctx, {
			doctorUserId: USER_ID,
			dateFrom: shiftStart.toISOString(),
			dateTo: shiftEnd.toISOString(),
		})) as any;

		assert.strictEqual(result.doctorUserId, USER_ID);
		assert.strictEqual(result.totalAppointmentsCount, 2);
		assert.strictEqual(result.totalBookedMinutes, 150);
		assert.strictEqual(result.freeCapacityMinutes, 390);
		assert.strictEqual(result.bookedSlots.length, 2);
		assert.strictEqual(result.bookedSlots[0].patientName, "Сидоров Алексей");
		assert.strictEqual(result.bookedSlots[0].durationMinutes, 60);
	});
});

describe("Staff Tasks & Preventive Recall Tools", () => {
	test("create_staff_task inserts clinic task for admin/nurse with due date", async () => {
		const mockPatient = {
			id: PATIENT_ID,
			fullName: "Васильева Елена Михайловна",
		};

		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [mockPatient],
					}),
				}),
			}),
			insert: () => ({
				values: (vals: any) => ({
					returning: async () => [
						{
							id: "task-001",
							organizationId: ORG_ID,
							patientId: vals.patientId,
							assignedRole: vals.assignedRole,
							title: vals.title,
							body: vals.body,
							priority: vals.priority,
							status: "needs_call",
							dueAt: vals.dueAt,
							createdAt: new Date("2026-08-27T10:00:00Z"),
						},
					],
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });
		const res = (await createStaffTaskTool.handler(ctx, {
			patientId: PATIENT_ID,
			title: "Перезвонить по поводу плана имплантации",
			description: "Пациент просил уточнить стоимость коронки из диоксида циркония",
			priority: "high",
			assignedRole: "admin",
			dueDate: "2026-08-28T12:00:00Z",
		})) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.taskId, "task-001");
		assert.strictEqual(res.patientName, "Васильева Елена Михайловна");
		assert.strictEqual(res.title, "Перезвонить по поводу плана имплантации");
		assert.strictEqual(res.priority, "high");
		assert.strictEqual(res.assignedRole, "admin");
		assert.strictEqual(res.dueAt, "2026-08-28T12:00:00.000Z");
	});

	test("get_patient_recalls evaluates active recalls and medical recommendations", async () => {
		const now = new Date();
		const upcomingRecallDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

		let step = 0;
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						orderBy: () => {
							step++;
							if (step === 1) {
								// Existing communication tasks (recalls)
								const recallsList = [
									{
										id: "recall-1",
										title: "Профгигиена полости рта (Recall)",
										body: "Плановый осмотр и гигиена",
										channel: "whatsapp",
										status: "queued",
										priority: "normal",
										dueAt: upcomingRecallDate,
										createdAt: now,
									},
								];
								return Object.assign(Promise.resolve(recallsList), {
									limit: async () => recallsList,
									then: (resolve: any) => Promise.resolve(recallsList).then(resolve),
								});
							}
							// Last completed visit for recommendation
							const visitList = [
								{
									id: "visit-123",
									diagnosis: "K05.1 Хронический гингивит, дентальный имплантат 36",
									treatmentPlan: "Установка имплантата",
									signedAt: new Date("2026-08-01T10:00:00Z"),
									createdAt: new Date("2026-08-01T10:00:00Z"),
								},
							];
							return Object.assign(Promise.resolve(visitList), {
								limit: async () => visitList,
								then: (resolve: any) => Promise.resolve(visitList).then(resolve),
							});
						},
					}),
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });
		const res = (await getPatientRecallsTool.handler(ctx, {
			patientId: PATIENT_ID,
			statusFilter: "all",
		})) as any;

		assert.strictEqual(res.patientId, PATIENT_ID);
		assert.strictEqual(res.totalActiveRecallsCount, 1);
		assert.strictEqual(res.recalls[0].title, "Профгигиена полости рта (Recall)");
		assert.strictEqual(res.recalls[0].urgency, "upcoming");

		assert.ok(res.medicalRecommendations.length >= 2);
		const hygieneRec = res.medicalRecommendations.find((r: any) => r.reason === "hygiene");
		const implantRec = res.medicalRecommendations.find((r: any) => r.reason === "implant_review");
		assert.ok(hygieneRec, "Must have hygiene recall recommendation");
		assert.ok(implantRec, "Must have implant review recommendation");
		assert.strictEqual(hygieneRec.recommendedIntervalMonths, 6);
	});

	test("schedule_recall schedules preventive recall with channel and priority", async () => {
		const mockPatient = {
			id: PATIENT_ID,
			fullName: "Кузнецов Артем Дмитриевич",
		};

		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [mockPatient],
					}),
				}),
			}),
			insert: () => ({
				values: (vals: any) => ({
					returning: async () => [
						{
							id: "recall-002",
							organizationId: ORG_ID,
							patientId: vals.patientId,
							assignedRole: vals.assignedRole,
							channel: vals.channel,
							intent: vals.intent,
							title: vals.title,
							body: vals.body,
							priority: vals.priority,
							status: vals.status,
							dueAt: vals.dueAt,
							createdAt: new Date("2026-08-27T11:00:00Z"),
						},
					],
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });
		const res = (await scheduleRecallTool.handler(ctx, {
			patientId: PATIENT_ID,
			recallReason: "implant_review",
			dueAt: "2027-02-27T10:00:00Z",
			channel: "whatsapp",
			priority: "high",
			notes: "Контроль остеоинтеграции и прицельный снимок",
		})) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.recallTaskId, "recall-002");
		assert.strictEqual(res.recallReason, "implant_review");
		assert.strictEqual(res.title, "Контрольный осмотр имплантов и прикуса (Recall)");
		assert.strictEqual(res.channel, "whatsapp");
		assert.strictEqual(res.dueAt, "2027-02-27T10:00:00.000Z");
	});
});

describe("Agent Orchestrator Loop & Turn Suspension", () => {
	test("Orchestrator executes READ tools automatically and writes assistant turn in real space", async () => {
		const redactor = new Redactor();
		const patientName = "Кузнецов Дмитрий";
		redactor.table.tokenize(patientName, "NAME");

		const registry = new ToolRegistry();
		const infoTool: ToolDefinition = {
			name: "get_status",
			description: "Status",
			parameters: z.object({ patient: z.string() }),
			permissions: ["patients.read"],
			category: "read",
			handler: async (_ctx, args) => {
				return { message: `Пациент ${args.patient} на месте` };
			},
		};
		registry.register(infoTool);

		const ctx = createMockContext({ tools: registry });

		let step = 0;
		const mockProvider: LLMProvider = {
			async *complete() {
				if (step === 0) {
					step++;
					yield {
						type: "tool_use",
						id: "call_1",
						name: "get_status",
						input: { patient: redactor.table.getToken(patientName) || patientName },
					};
					yield {
						type: "done",
						stopReason: "tool_use",
					};
				} else {
					yield {
						type: "text_delta",
						text: "Пациент ожидает в холле.",
					};
					yield {
						type: "done",
						stopReason: "stop",
					};
				}
			},
		};

		const history: ProviderMessage[] = [
			{ role: "user", content: `Где ${patientName}?` },
		];

		const events: any[] = [];
		for await (const ev of runTurn({
			ctx,
			provider: mockProvider,
			system: "Dental assistant",
			history,
			toolNames: ["get_status"],
			redactor,
		})) {
			events.push(ev);
		}

		assert.ok(events.some((e) => e.type === "tool_call_started"));
		assert.ok(events.some((e) => e.type === "tool_call_finished"));
		assert.ok(events.some((e) => e.type === "token" && e.text.includes("Пациент ожидает")));
		assert.ok(events.some((e) => e.type === "final"));

		const lastAssistant = history[history.length - 1]!;
		assert.strictEqual(lastAssistant.role, "assistant");
	});

	test("Orchestrator suspends turn on WRITE tool requiring confirmation", async () => {
		const registry = new ToolRegistry();
		const writeTool: ToolDefinition = {
			name: "book_slot",
			description: "Book",
			parameters: z.object({ time: z.string() }),
			permissions: ["schedule.write"],
			category: "write",
			handler: async () => ({ booked: true }),
		};
		registry.register(writeTool);

		const ctx = createMockContext({ tools: registry });

		const mockProvider: LLMProvider = {
			async *complete() {
				yield {
					type: "tool_use",
					id: "call_book_1",
					name: "book_slot",
					input: { time: "14:00" },
				};
				yield {
					type: "done",
					stopReason: "tool_use",
				};
			},
		};

		const history: ProviderMessage[] = [{ role: "user", content: "Запиши меня" }];
		const events: any[] = [];

		for await (const ev of runTurn({
			ctx,
			provider: mockProvider,
			system: "Assistant",
			history,
			toolNames: ["book_slot"],
		})) {
			events.push(ev);
		}

		const confirmEvent = events.find((e) => e.type === "confirmation_required") as any;
		assert.ok(confirmEvent, "Orchestrator must yield confirmation_required for WRITE tool");
		assert.strictEqual(confirmEvent.callId, "call_book_1");
		assert.strictEqual(confirmEvent.name, "book_slot");
	});

	test("TokenBudgetGuard prevents calls when threshold is exceeded", async () => {
		const guard = new TokenBudgetGuard(100);
		guard.record(60, 50);
		assert.strictEqual(guard.check(), false);

		const ctx = createMockContext();
		const mockProvider: LLMProvider = {
			async *complete() {},
		};

		const events: any[] = [];
		for await (const ev of runTurn({
			ctx,
			provider: mockProvider,
			system: "System",
			history: [],
			toolNames: [],
			budget: guard,
		})) {
			events.push(ev);
		}

		assert.strictEqual(events[0]?.type, "budget_exceeded");
	});

	test("compactHistory preserves history if message count <= maxMessages", () => {
		const history: ProviderMessage[] = [
			{ role: "user", content: "Привет" },
			{ role: "assistant", content: [{ type: "text", text: "Здравствуйте!" }] },
		];
		const compacted = compactHistory(history, 20, 10);
		assert.strictEqual(compacted.length, 2);
		assert.deepStrictEqual(compacted, history);
	});

	test("compactHistory compacts intermediate tool calls and turns when > 20 messages", () => {
		const history: ProviderMessage[] = [];
		// Build 24 messages (12 turns of user/assistant/tools)
		for (let i = 1; i <= 8; i++) {
			history.push({ role: "user", content: `Запрос ${i}` });
			history.push({
				role: "assistant",
				content: [
					{
						type: "tool_use",
						id: `call_${i}`,
						name: "clinical.find_patient",
						input: { query: `Пациент_${i}` },
					},
				],
			});
			history.push({
				role: "tool",
				content: [
					{
						type: "tool_result",
						toolCallId: `call_${i}`,
						content: { patientId: `P-${i}`, name: `Пациент ${i}` },
					},
				],
			});
		}
		// 8 * 3 = 24 messages
		assert.strictEqual(history.length, 24);

		const compacted = compactHistory(history, 20, 10);
		// Compacted should have summary messages (2) + retained recent messages (approx 10..12) <= 15
		assert.ok(compacted.length <= 15, `Expected <= 15 messages after compaction, got ${compacted.length}`);
		assert.strictEqual(compacted[0]?.role, "user");
		const summaryText = String(compacted[0]?.content);
		assert.ok(summaryText.includes("[Сводка предыдущих шагов диалога"));
		assert.ok(summaryText.includes("clinical.find_patient"));
		assert.strictEqual(compacted[1]?.role, "assistant");

		// Recent messages must start with a clean user turn
		assert.strictEqual(compacted[2]?.role, "user");
	});

	test("runTurn triggers automatic sliding window compaction during multi-turn dialogue", async () => {
		const ctx = createMockContext();
		const history: ProviderMessage[] = [];
		for (let i = 1; i <= 22; i++) {
			history.push({ role: i % 2 === 1 ? "user" : "assistant", content: `Сообщение ${i}` });
		}
		assert.strictEqual(history.length, 22);

		const mockProvider: LLMProvider = {
			async *complete(params) {
				// Provider should receive compacted messages
				assert.ok(params.messages.length <= 15, `Expected <= 15 messages received by provider, got ${params.messages.length}`);
				yield { type: "text_delta", text: "Ответ сжатого контекста" };
				yield { type: "done", stopReason: "stop" };
			},
		};

		const events: any[] = [];
		for await (const ev of runTurn({
			ctx,
			provider: mockProvider,
			system: "Dental Copilot",
			history,
			toolNames: [],
			maxHistoryMessages: 20,
			retainedRecentMessages: 10,
		})) {
			events.push(ev);
		}

		const fullText = events
			.filter((e) => e.type === "token")
			.map((e) => e.text)
			.join("");
		assert.ok(fullText.includes("Ответ сжатого контекста"));
		assert.ok(events.some((e) => e.type === "final"));
		// History in-place array should have been compacted
		assert.ok(history.length <= 16, `History should be compacted in-place, got ${history.length}`);
	});
});

describe("Copilot Action Manager & SSE Formatting", () => {
	test("Registers pending actions, confirms, and formats SSE protocol chunks", async () => {
		const manager = new CopilotActionManager();
		const ctx = createMockContext();

		manager.registerPending("sess_1", "call_xyz", "clinical.find_patient", {
			query: "Иванов",
		});

		const pending = manager.getPending("call_xyz");
		assert.ok(pending);
		assert.strictEqual(pending.toolName, "clinical.find_patient");

		const sseChunk = formatSseEvent({
			type: "confirmation_required",
			callId: "call_xyz",
			name: "clinical.find_patient",
			arguments: { query: "Иванов" },
		});

		assert.ok(sseChunk.startsWith("event: confirmation_required\n"));
		assert.ok(sseChunk.includes('"callId":"call_xyz"'));
		assert.ok(sseChunk.endsWith("\n\n"));

		const rejected = manager.rejectAction("call_xyz", "Отменено врачом");
		assert.strictEqual(rejected.ok, true);
		assert.strictEqual(manager.getPending("call_xyz"), undefined);
	});

	test("Registers estimateTool and labOrderTool in default clinical registry", () => {
		const registry = new ToolRegistry();
		registerClinicalTools(registry, "clinical");

		const estimate = registry.get("clinical.calculate_treatment_estimate");
		assert.ok(estimate, "clinical.calculate_treatment_estimate must be registered");
		assert.strictEqual(estimate.category, "read");

		const labOrder = registry.get("clinical.draft_lab_work_order");
		assert.ok(labOrder, "clinical.draft_lab_work_order must be registered");
		assert.strictEqual(labOrder.category, "write");
	});
});

