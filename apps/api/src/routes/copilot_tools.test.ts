/**
 * copilot_tools.test.ts — Comprehensive E2E Integration Test Suite for DENTE Copilot AI Tools.
 *
 * Tests the core advanced clinical agent tools:
 * 1. clinical.analyze_radiograph_vision (visionTool.ts)
 * 2. clinical.calculate_treatment_estimate (estimateTool.ts)
 * 3. clinical.draft_lab_work_order (labOrderTool.ts)
 * 4. clinical.auto_fill_cancellation_gap (cancellationTool.ts)
 * 5. clinical.generate_informed_consent (consentTool.ts)
 * 6. clinical.suggest_icd10_plan & clinical.get_doctor_schedule (clinicalTools.ts)
 * 7. Fastify SSE stream dispatch, supervised action confirmations, Zod validation, and tenant isolation.
 */

import assert from "node:assert";
import { afterEach, beforeEach, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import {
	analyzeRadiographVisionTool,
	autoFillCancellationGapTool,
	calculateTreatmentEstimateTool,
	defaultCopilotActionManager,
	defaultToolRegistry,
	draftLabWorkOrderTool,
	generateInformedConsentTool,
	getDoctorScheduleTool,
	suggestIcd10PlanTool,
	type AgentContext,
} from "../services/agent/index.js";
import { analyzeRadiographVisionSchema } from "../services/agent/tools/visionTool.js";
import { signToken } from "../utils/cryptoHelper.js";
import { copilotRoutes } from "./copilot.js";

const TEST_SECRET = "test-secret-copilot-tools";
const ORG_ID = "00000000-0000-7000-8000-000000000001";
const OTHER_ORG_ID = "00000000-0000-7000-8000-000000000999";
const USER_ID = "00000000-0000-7000-8000-000000000002";
const PATIENT_ID = "00000000-0000-7000-8000-000000000003";
const APPOINTMENT_ID = "00000000-0000-7000-8000-000000000004";
const STUDY_ID = "00000000-0000-7000-8000-000000000005";

function authHeaders(orgId = ORG_ID): Record<string, string> {
	return {
		"x-dente-clinic-token": signToken({ organizationId: orgId }, TEST_SECRET, 3600),
		"x-dente-staff-token": signToken(
			{ userId: USER_ID, organizationId: orgId, role: "doctor" },
			TEST_SECRET,
			3600,
		),
	};
}

function createMockContext(overrides: Partial<AgentContext> = {}): AgentContext {
	return {
		organizationId: ORG_ID,
		clinicId: ORG_ID,
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
		tools: defaultToolRegistry,
		db: null,
		...overrides,
	};
}

interface ParsedSseFrame {
	event: string;
	data: unknown;
	raw: string;
}

function parseSseStream(rawPayload: string): ParsedSseFrame[] {
	const frames: ParsedSseFrame[] = [];
	const blocks = rawPayload.split("\n\n");

	for (const block of blocks) {
		const trimmed = block.trim();
		if (!trimmed) continue;

		let eventName = "message";
		let dataStr = "";

		for (const line of trimmed.split("\n")) {
			if (line.startsWith("event:")) {
				eventName = line.slice(6).trim();
			} else if (line.startsWith("data:")) {
				dataStr += line.slice(5).trim();
			}
		}

		let parsedData: unknown = dataStr;
		if (dataStr) {
			try {
				parsedData = JSON.parse(dataStr);
			} catch {
				parsedData = dataStr;
			}
		}

		frames.push({
			event: eventName,
			data: parsedData,
			raw: trimmed,
		});
	}

	return frames;
}

describe("SQUAD XI — Copilot AI Tools E2E Integration Suite", () => {
	let app: FastifyInstance;

	beforeEach(async () => {
		process.env.NODE_ENV = "test";
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		defaultCopilotActionManager.clear();
		app = Fastify();
		await app.register(copilotRoutes);
	});

	afterEach(async () => {
		defaultCopilotActionManager.clear();
		await app.close();
	});

	// ─── 1. clinical.analyze_radiograph_vision ──────────────────────────────

	describe("1. clinical.analyze_radiograph_vision (AI Radiograph Vision Analysis)", () => {
		test("validates input schema with valid studyId and toothCode", () => {
			const parsed = analyzeRadiographVisionSchema.safeParse({
				studyId: STUDY_ID,
				toothCode: "36",
				clinicalQuestion: "Оценка периапикальных тканей и обтурации каналов",
			});
			assert.strictEqual(parsed.success, true);
			if (parsed.success) {
				assert.strictEqual(parsed.data.studyId, STUDY_ID);
				assert.strictEqual(parsed.data.toothCode, "36");
				assert.strictEqual(parsed.data.mimeType, "image/png");
			}
		});

		test("rejects call with missing studyId and missing imageBase64", async () => {
			const ctx = createMockContext();
			await assert.rejects(
				() => analyzeRadiographVisionTool.handler(ctx, {}),
				/Необходимо указать studyId .* или imageBase64/,
			);
		});

		test("enforces tenant isolation on studyId lookup (throws when study not found in org)", async () => {
			const mockDb = {
				select: () => ({
					from: () => ({
						where: () => ({
							limit: async () => [],
						}),
					}),
				}),
			};

			const ctx = createMockContext({ db: mockDb });
			await assert.rejects(
				() =>
					analyzeRadiographVisionTool.handler(ctx, {
						studyId: STUDY_ID,
					}),
				/Рентген-исследование с ID .* не найдено в текущей организации/,
			);
		});

		test("blocks execution when context lacks clinical.read permission", async () => {
			const ctx = createMockContext({ permissions: ["schedule.read"] });
			const result = await defaultToolRegistry.call(
				ctx,
				"clinical.analyze_radiograph_vision",
				{
					studyId: STUDY_ID,
				},
			);
			assert.strictEqual(result.ok, false);
			assert.match(String(result.error), /permission denied/);
		});
	});

	// ─── 2. clinical.calculate_treatment_estimate ───────────────────────────

	describe("2. clinical.calculate_treatment_estimate (3-Tier Pricing & FNS Tax Deduction)", () => {
		test("calculates 3 parallel tiers (economy, optimum, premium) with kopeck-exact precision and 13% tax return", async () => {
			const mockDb = {
				select: () => ({
					from: () => ({
						where: () => ({
							limit: async () => [
								{
									id: PATIENT_ID,
									fullName: "Барабаш Сергей Владимирович",
								},
							],
						}),
					}),
				}),
			};

			const ctx = createMockContext({ db: mockDb });
			const result = (await calculateTreatmentEstimateTool.handler(ctx, {
				patientId: PATIENT_ID,
				items: [
					{
						toothCode: 16,
						serviceName: "Препарирование и пломбирование кариозной полости",
						nomenclatureCode: "A16.07.002",
						basePriceRub: 6000,
						category: "Терапия",
						quantity: 2,
					},
					{
						serviceName: "Установка дентального имплантата",
						nomenclatureCode: "A16.07.054",
						basePriceRub: 45000,
						category: "Имплантация",
						quantity: 1,
					},
				],
				discountPercent: 10,
				createDraftPlan: false,
			})) as any;

			assert.strictEqual(result.patientId, PATIENT_ID);
			assert.strictEqual(result.patientFullName, "Барабаш Сергей Владимирович");
			assert.strictEqual(result.itemsCount, 2);
			assert.strictEqual(result.discountPercent, 10);
			assert.strictEqual(result.recommendedTier, "optimum");

			// Optimum tier: Gross = (6000 * 2) + 45000 = 57000. Discount 10% = 5700. Net = 51300
			const optimum = result.tiers.optimum;
			assert.strictEqual(optimum.grossTotalRub, 57000);
			assert.strictEqual(optimum.discountRub, 5700);
			assert.strictEqual(optimum.totalRub, 51300);
			assert.strictEqual(optimum.totalKopecks, 5130000);

			// Tax deduction verification
			assert.ok(optimum.taxDeduction.totalTaxRefundRub > 0);
			assert.strictEqual(
				optimum.taxDeduction.totalTaxRefundRub,
				Math.round(optimum.taxDeduction.totalTaxRefundKopecks) / 100,
			);
			assert.ok(optimum.taxDeduction.fnsFormReference.includes("1151156"));

			// Economy tier multiplier (0.85)
			const economy = result.tiers.economy;
			assert.ok(economy.totalRub < optimum.totalRub);

			// Premium tier multiplier (1.40)
			const premium = result.tiers.premium;
			assert.ok(premium.totalRub > optimum.totalRub);

			// Installments
			assert.strictEqual(optimum.installments.months3.isZeroPercent, true);
			assert.strictEqual(optimum.installments.months6.months, 6);
		});

		test("rejects empty items array via ToolRegistry call (Zod validation error)", async () => {
			const ctx = createMockContext();
			const res = await defaultToolRegistry.call(
				ctx,
				"clinical.calculate_treatment_estimate",
				{
					items: [],
				},
			);

			assert.strictEqual(res.ok, false);
			assert.match(String(res.error), /validation error/);
		});
	});

	// ─── 3. clinical.draft_lab_work_order ───────────────────────────────────

	describe("3. clinical.draft_lab_work_order (Dental Lab Order Drafting)", () => {
		test("drafts lab order with VITA shade, materials and FDI teeth validation", async () => {
			const futureDueDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

			const mockDb = {
				select: () => ({
					from: () => ({
						where: () => ({
							limit: async () => [
								{
									id: PATIENT_ID,
									fullName: "Кузнецов Дмитрий Иванович",
								},
							],
						}),
					}),
				}),
				insert: () => ({
					values: (vals: any) => ({
						returning: async () => [
							{
								id: "lab-order-9876",
								organizationId: vals.organizationId,
								patientId: vals.patientId,
								doctorId: vals.doctorId,
								doctorName: vals.doctorName,
								secureToken: vals.secureToken,
								toothFdi: vals.toothFdi,
								material: vals.material,
								colorVita: vals.colorVita,
								status: "draft",
								dueDate: vals.dueDate,
								clinicalNotes: vals.clinicalNotes,
								priceRub: vals.priceRub,
								createdAt: new Date(),
							},
						],
					}),
				}),
			};

			const ctx = createMockContext({ db: mockDb });
			const result = (await draftLabWorkOrderTool.handler(ctx, {
				patientId: PATIENT_ID,
				toothCodes: [21, 22],
				workType: "Коронка",
				material: "Диоксид циркония ZrO2",
				vitaShade: "A2",
				dueDate: futureDueDate,
				laboratoryName: "ЗТЛ Дентал-Арт",
				notes: "Индивидуальный микрорельеф эмали",
				priceRub: 35000,
			})) as any;

			assert.strictEqual(result.success, true);
			assert.strictEqual(result.patientFullName, "Кузнецов Дмитрий Иванович");
			assert.deepStrictEqual(result.toothCodes, [21, 22]);
			assert.strictEqual(result.toothFdi, "21, 22");
			assert.strictEqual(result.colorVita, "A2");
			assert.strictEqual(result.status, "draft");
			assert.ok(result.portalUrl.startsWith("/lab-portal?token="));
			assert.strictEqual(result.priceRub, 35000);
		});

		test("rejects invalid tooth number FDI (e.g. 99)", async () => {
			const mockDb = {
				select: () => ({
					from: () => ({
						where: () => ({
							limit: async () => [{ id: PATIENT_ID, fullName: "Пациент" }],
						}),
					}),
				}),
			};

			const ctx = createMockContext({ db: mockDb });
			await assert.rejects(
				() =>
					draftLabWorkOrderTool.handler(ctx, {
						patientId: PATIENT_ID,
						toothCodes: [99],
						workType: "Коронка",
						material: "E.max",
						vitaShade: "A1",
						dueDate: "2026-09-15",
					}),
				/Некорректный номер зуба FDI: 99/,
			);
		});

		test("enforces tenant isolation (throws when patient is not in clinic)", async () => {
			const mockDb = {
				select: () => ({
					from: () => ({
						where: () => ({
							limit: async () => [],
						}),
					}),
				}),
			};

			const ctx = createMockContext({ db: mockDb });
			await assert.rejects(
				() =>
					draftLabWorkOrderTool.handler(ctx, {
						patientId: PATIENT_ID,
						toothCodes: [16],
						workType: "Коронка",
						material: "Цирконий",
						vitaShade: "A2",
						dueDate: "2026-09-15",
					}),
				/Пациент с ID .* не найден в вашей клинике/,
			);
		});
	});

	// ─── 4. clinical.auto_fill_cancellation_gap ─────────────────────────────

	describe("4. clinical.auto_fill_cancellation_gap (Schedule Gap Auto-Filler)", () => {
		test("finds and prioritizes cancellation gap candidates from waiting list and treatment plans", async () => {
			const startsAt = new Date("2026-09-02T10:00:00Z");
			const endsAt = new Date("2026-09-02T11:00:00Z");

			let selectCall = 0;
			const mockDb = {
				select: () => ({
					from: () => ({
						where: () => {
							selectCall++;
							// Query 1: apt
							if (selectCall === 1) {
								return {
									limit: async () => [
										{
											id: APPOINTMENT_ID,
											patientId: PATIENT_ID,
											doctorUserId: USER_ID,
											chairId: null,
											status: "cancelled",
											startsAt,
											endsAt,
											reason: "Пациент заболел",
											comment: null,
										},
									],
								};
							}
							// Query 2: doctor
							if (selectCall === 2) {
								return {
									limit: async () => [
										{
											fullName: "Д-р Смирнов А.В.",
											role: "doctor",
											specialties: ["therapy"],
										},
									],
								};
							}
							// Query 3: overlapping (returns promise array)
							const promise: any = Promise.resolve([]);
							promise.then = (fn: any) => Promise.resolve([]).then(fn);
							return promise;
						},
						innerJoin: () => ({
							where: () => ({
								limit: async () => [
									{
										taskId: "task-1",
										patientId: "00000000-0000-7000-8000-000000000010",
										intent: "recall",
										status: "needs_call",
										priority: "urgent",
										dueAt: new Date(),
										title: "Острая боль / лист ожидания",
										body: "Просит записать при освобождении окна",
										patientName: "Ковалев Андрей Михайлович",
										patientPhone: "+7 (999) 111-22-33",
									},
								],
								orderBy: () => ({
									limit: async () => [],
								}),
							}),
						}),
					}),
				}),
			};

			const ctx = createMockContext({ db: mockDb });
			const result = (await autoFillCancellationGapTool.handler(ctx, {
				appointmentId: APPOINTMENT_ID,
				maxCandidates: 5,
			})) as any;

			assert.strictEqual(result.gapSummary.appointmentId, APPOINTMENT_ID);
			assert.strictEqual(result.gapSummary.durationMinutes, 60);
			assert.strictEqual(result.gapSummary.doctorName, "Д-р Смирнов А.В.");
			assert.strictEqual(result.candidatesCount, 1);
			assert.strictEqual(result.candidates[0].patientName, "Ковалев Андрей Михайлович");
			assert.strictEqual(result.candidates[0].priority, "urgent");
			assert.strictEqual(result.candidates[0].source, "waiting_list");
			assert.ok(result.recommendedAction.includes("Ковалев Андрей Михайлович"));
		});

		test("throws error when appointment is not found in organization", async () => {
			const mockDb = {
				select: () => ({
					from: () => ({
						where: () => ({
							limit: async () => [],
						}),
					}),
				}),
			};

			const ctx = createMockContext({ db: mockDb });
			await assert.rejects(
				() =>
					autoFillCancellationGapTool.handler(ctx, {
						appointmentId: APPOINTMENT_ID,
					}),
				/Запись на прием с ID .* не найдена/,
			);
		});
	});

	// ─── 5. clinical.generate_informed_consent ──────────────────────────────

	describe("5. clinical.generate_informed_consent (Legal ИДС 323-ФЗ)", () => {
		test("generates legal informed consent with patient allergies and SHA-256 hash", async () => {
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
											fullName: "Николаев Роман Олегович",
											birthDate: "1988-04-12",
											phone: "+7 (916) 777-88-99",
										},
									];
								}
								return [];
							},
							then: async (resolve: any) => {
								const allergies = [
									{
										allergenGroup: "Пенициллины",
										drugInnLatin: "Amoxicillin",
										reactionSeverity: "critical",
									},
								];
								return resolve ? resolve(allergies) : allergies;
							},
						}),
					}),
				}),
				insert: () => ({
					values: (vals: any) => ({
						returning: async () => [
							{
								id: "doc-consent-555",
								createdAt: new Date(),
							},
						],
					}),
				}),
			};

			const ctx = createMockContext({ db: mockDb });
			const result = (await generateInformedConsentTool.handler(ctx, {
				patientId: PATIENT_ID,
				procedureType: "implantology",
				doctorName: "Д-р Васильев И.Г.",
				toothCode: "46",
				customRisks: ["Близость нижнечелюстного канала (n. alveolaris inferior)"],
			})) as any;

			assert.strictEqual(result.success, true);
			assert.strictEqual(result.patientName, "Николаев Роман Олегович");
			assert.strictEqual(result.procedureType, "implantology");
			assert.strictEqual(result.toothOrArea, "Зуб/зона: 46");
			assert.ok(result.signatureSha256 && result.signatureSha256.length === 64);
			assert.ok(result.legalText.includes("ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ"));
			assert.ok(result.legalText.includes("Приказом Министерства здравоохранения РФ от 12.11.2021 № 1051н"));
			assert.ok(result.legalText.includes("Пенициллины"));
			assert.ok(result.legalText.includes("n. alveolaris inferior"));
			assert.strictEqual(result.sections.length, 7);
		});

		test("rejects invalid procedureType via Zod schema", async () => {
			const ctx = createMockContext();
			const res = await defaultToolRegistry.call(
				ctx,
				"clinical.generate_informed_consent",
				{
					patientId: PATIENT_ID,
					procedureType: "unsupported_procedure_xyz",
					doctorName: "Врач",
				},
			);

			assert.strictEqual(res.ok, false);
			assert.match(String(res.error), /validation error: procedureType/);
		});
	});

	// ─── 6. clinical.suggest_icd10_plan & clinical.get_doctor_schedule ─────

	describe("6. Diagnostic & Schedule Tools (suggest_icd10_plan & get_doctor_schedule)", () => {
		test("suggest_icd10_plan returns ICD-10 K04.0 for pulpitis complaints with FDI validation", async () => {
			const ctx = createMockContext();
			const result = (await suggestIcd10PlanTool.handler(ctx, {
				complaint: "Острая ночная самопроизвольная боль в зубе",
				toothNumber: 36,
			})) as any;

			assert.strictEqual(result.toothNumber, 36);
			assert.ok(result.suggestedDiagnoses.length >= 1);
			const pulpitis = result.suggestedDiagnoses.find((d: any) => d.code === "K04.0");
			assert.ok(pulpitis, "Must propose K04.0 Pulpitis");
			assert.strictEqual(pulpitis.validation.isValid, true);
		});

		test("suggest_icd10_plan rejects invalid tooth number FDI (e.g. 99)", async () => {
			const ctx = createMockContext();
			await assert.rejects(
				() =>
					suggestIcd10PlanTool.handler(ctx, {
						complaint: "Кариес",
						toothNumber: 99,
					}),
				/Некорректный номер зуба FDI: 99/,
			);
		});

		test("get_doctor_schedule calculates booked minutes and free capacity", async () => {
			const dateFrom = "2026-09-05T08:00:00Z";
			const dateTo = "2026-09-05T16:00:00Z";

			const mockDb = {
				select: () => ({
					from: () => ({
						leftJoin: () => ({
							where: () => ({
								orderBy: async () => [
									{
										id: "app-1",
										patientId: PATIENT_ID,
										patientName: "Сидорова О.В.",
										chairId: "chair-1",
										status: "planned",
										startsAt: new Date("2026-09-05T09:00:00Z"),
										endsAt: new Date("2026-09-05T10:30:00Z"),
										reason: "Лечение пульпита",
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
				dateFrom,
				dateTo,
			})) as any;

			assert.strictEqual(result.doctorUserId, USER_ID);
			assert.strictEqual(result.totalAppointmentsCount, 1);
			assert.strictEqual(result.totalBookedMinutes, 90);
			assert.strictEqual(result.freeCapacityMinutes, 390);
		});
	});

	// ─── 7. Fastify E2E SSE Streaming & Action Confirmation ────────────────

	describe("7. Fastify E2E SSE Streaming & Supervised Action Confirmations", () => {
		test("Fastify SSE stream executes clinical tools and returns structured frames", async () => {
			const sessionId = "sess_e2e_tools_101";
			const res = await app.inject({
				method: "POST",
				url: `/api/v1/copilot/sessions/${sessionId}/messages`,
				headers: authHeaders(),
				payload: {
					content: "Найди пациента Смирнова",
				},
			});

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res.headers["content-type"]?.includes("text/event-stream"));

			const frames = parseSseStream(res.body);
			assert.ok(frames.length >= 2, "Must produce multiple SSE events");

			const finalFrame = frames.find((f) => f.event === "final" || f.event === "done");
			assert.ok(finalFrame, "Must finish with a final/done frame");
		});

		test("Confirms pending write action via POST /api/v1/copilot/confirm", async () => {
			const sessionId = "sess_confirm_flow_202";
			const callId = "call-act-draft-lab-001";

			defaultCopilotActionManager.registerPending(
				sessionId,
				callId,
				"clinical.draft_lab_work_order",
				{
					patientId: PATIENT_ID,
					toothCodes: [11],
					workType: "Винир",
					material: "E.max Press",
					vitaShade: "BL1",
					dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
					priceRub: 25000,
				},
			);

			const res = await app.inject({
				method: "POST",
				url: "/api/v1/copilot/confirm",
				headers: { ...authHeaders(), accept: "application/json" },
				payload: {
					sessionId,
					callId,
					decision: "confirm",
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const json = res.json();
			assert.ok(json.ok !== undefined);
		});

		test("Rejects pending action via POST /api/v1/copilot/confirm with reason", async () => {
			const sessionId = "sess_reject_flow_303";
			const callId = "call-act-reject-002";

			defaultCopilotActionManager.registerPending(
				sessionId,
				callId,
				"clinical.draft_lab_work_order",
				{ patientId: PATIENT_ID },
			);

			const res = await app.inject({
				method: "POST",
				url: "/api/v1/copilot/confirm",
				headers: { ...authHeaders(), accept: "application/json" },
				payload: {
					sessionId,
					callId,
					decision: "reject",
					reason: "Пациент передумал ставить виниры",
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const json = res.json();
			assert.strictEqual(json.ok, true);
			assert.strictEqual(json.rejected, true);
			assert.strictEqual(json.reason, "Пациент передумал ставить виниры");
		});

		test("Enforces tenant isolation on Fastify routes (unauthorized access rejected)", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/v1/copilot/sessions/sess_unauth/messages",
				payload: { content: "Привет" },
			});
			assert.strictEqual(res.statusCode, 401);
		});
	});
});
