/**
 * cancellationAndConsentTool.test.ts — Unit and Integration tests for Cancellation Gap Auto-Fill & Informed Consent Tools.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import { getTableName } from "drizzle-orm";
import type { AgentContext } from "./context.js";
import { ToolRegistry } from "./tools/registry.js";
import { autoFillCancellationGapTool } from "./tools/cancellationTool.js";
import {
	CONSENT_PROCEDURE_PRESETS,
	consentProcedureTypeEnum,
	generateInformedConsentTool,
} from "./tools/consentTool.js";
import { registerClinicalTools } from "./tools/clinicalTools.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";
const CLINIC_ID = "00000000-0000-7000-8000-000000000002";
const USER_ID = "00000000-0000-7000-8000-000000000003";
const PATIENT_ID = "00000000-0000-7000-8000-000000000004";
const APPOINTMENT_ID = "00000000-0000-7000-8000-000000000005";
const CHAIR_ID = "00000000-0000-7000-8000-000000000006";

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

describe("cancellationTool (clinical.auto_fill_cancellation_gap)", () => {
	test("tool is registered in ToolRegistry with valid parameters and permissions", () => {
		const registry = new ToolRegistry();
		registerClinicalTools(registry, "clinical");

		const tool = registry.get("clinical.auto_fill_cancellation_gap");
		assert.ok(tool, "Tool must be registered as clinical.auto_fill_cancellation_gap");
		assert.strictEqual(tool.name, "auto_fill_cancellation_gap");
		assert.strictEqual(tool.category, "read");
		assert.deepStrictEqual(tool.permissions, [
			"schedule.read",
			"patients.read",
			"clinical.read",
		]);

		// Zod validation
		const validParse = tool.parameters.safeParse({
			appointmentId: APPOINTMENT_ID,
			maxCandidates: 5,
		});
		assert.strictEqual(validParse.success, true);

		const invalidParse = tool.parameters.safeParse({
			appointmentId: "not-a-uuid",
		});
		assert.strictEqual(invalidParse.success, false);
	});

	test("accurately matches, scores, and orders candidates from tasks, tickets, and treatment plans", async () => {
		const canceledStart = new Date("2026-09-01T10:00:00.000Z");
		const canceledEnd = new Date("2026-09-01T11:00:00.000Z");

		const mockDb: any = {
			select: () => ({
				from: (table: any) => {
					const tableName = getTableName(table);

					return {
						where: () => {
							const exec = () => {
								if (tableName === "appointments") {
									return [
										{
											id: APPOINTMENT_ID,
											patientId: "00000000-0000-7000-8000-000000000099",
											doctorUserId: USER_ID,
											chairId: CHAIR_ID,
											status: "cancelled",
											startsAt: canceledStart,
											endsAt: canceledEnd,
											reason: "Пациент заболел ОРВИ",
											comment: "Отмена за 1 час",
										},
									];
								}
								if (tableName === "users") {
									return [
										{
											fullName: "Д-р Барабаш С.В.",
											role: "dentist_therapist",
											specialties: ["therapy", "endodontics"],
										},
									];
								}
								if (tableName === "chairs") {
									return [
										{
											name: "Кабинет №1 (Planmeca)",
											equipment: "Микроскоп",
										},
									];
								}
								return [];
							};

							const res = exec();
							return Object.assign(Promise.resolve(res), {
								limit: () => Promise.resolve(res),
								then: (resolve: any) => Promise.resolve(res).then(resolve),
							});
						},
						innerJoin: (_joinTable: any, _joinCond: any) => ({
							where: () => {
								const getJoinedData = () => {
									if (tableName === "communication_tasks") {
										return [
											{
												taskId: "task-001",
												patientId: "patient-waiting-01",
												intent: "general",
												status: "queued",
												priority: "urgent",
												dueAt: new Date(Date.now() - 3600000), // Overdue
												title: "Лист ожидания: острая боль зуб 36",
												body: "Пациент просил записать в любое освободившееся окно",
												patientName: "Смирнова Елена Александровна",
												patientPhone: "+7 (999) 111-22-33",
											},
											{
												taskId: "task-002",
												patientId: "patient-recall-02",
												intent: "recall",
												status: "needs_call",
												priority: "normal",
												dueAt: new Date(Date.now() + 86400000),
												title: "Плановый Recall: Профгигиена полости рта",
												body: "Прошло 6 месяцев с последнего визита",
												patientName: "Кузнецов Игорь Петрович",
												patientPhone: "+7 (999) 222-33-44",
											},
										];
									}
									if (tableName === "patient_task_tickets") {
										return [
											{
												ticketId: "ticket-001",
												patientId: "patient-ticket-03",
												title: "Лист ожидания на терапевтический прием",
												description: "Позвонить при отмене утренних записей",
												status: "pending",
												priority: "high",
												patientName: "Морозов Дмитрий Сергеевич",
												patientPhone: "+7 (999) 333-44-55",
											},
										];
									}
									if (tableName === "treatment_plans") {
										return [
											{
												planId: "plan-001",
												patientId: "patient-plan-04",
												doctorId: USER_ID, // Doctor matches
												name: "План эндодонтического лечения 36, 37",
												title: "Эндодонтия 36, 37",
												status: "Active",
												totalPrice: "45000.00",
												totalPriceRub: "45000.00",
												patientName: "Васильева Ольга Николаевна",
												patientPhone: "+7 (999) 444-55-66",
											},
										];
									}
									return [];
								};

								const data = getJoinedData();
								return Object.assign(Promise.resolve(data), {
									limit: () => Promise.resolve(data),
									orderBy: () => ({
										limit: () => Promise.resolve(data),
									}),
									then: (resolve: any) => Promise.resolve(data).then(resolve),
								});
							},
						}),
					};
				},
			}),
		};

		const ctx = createMockContext({ db: mockDb });

		const result = await autoFillCancellationGapTool.handler(ctx, {
			appointmentId: APPOINTMENT_ID,
			maxCandidates: 5,
		});

		assert.ok(result);
		assert.strictEqual(result.gapSummary.appointmentId, APPOINTMENT_ID);
		assert.strictEqual(result.gapSummary.durationMinutes, 60);
		assert.strictEqual(result.gapSummary.doctorName, "Д-р Барабаш С.В.");
		assert.strictEqual(result.gapSummary.chairName, "Кабинет №1 (Planmeca)");
		assert.strictEqual(result.gapSummary.originalReason, "Пациент заболел ОРВИ");

		assert.strictEqual(result.candidatesCount, 4);
		assert.strictEqual(result.candidates.length, 4);

		// First candidate should be highest score
		const topCandidate = result.candidates[0];
		if (!topCandidate) {
			assert.fail("Expected at least one candidate");
		}
		assert.ok(topCandidate.matchScore >= 80);
		assert.ok(topCandidate.oneClickBookingSlot);
		assert.strictEqual(topCandidate.oneClickBookingSlot.doctorUserId, USER_ID);
		assert.strictEqual(topCandidate.oneClickBookingSlot.chairId, CHAIR_ID);
		assert.strictEqual(topCandidate.oneClickBookingSlot.startsAt, canceledStart.toISOString());
		assert.strictEqual(topCandidate.oneClickBookingSlot.endsAt, canceledEnd.toISOString());

		// Recommended action string
		assert.ok(result.recommendedAction.includes("найдено 4"));
		assert.ok(result.recommendedAction.includes("Рекомендуется связаться"));
	});

	test("throws structured error if appointment is not found", async () => {
		const mockDb: any = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: () => Promise.resolve([]),
					}),
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });

		await assert.rejects(
			async () => {
				await autoFillCancellationGapTool.handler(ctx, {
					appointmentId: APPOINTMENT_ID,
					maxCandidates: 5,
				});
			},
			{
				message: `Запись на прием с ID ${APPOINTMENT_ID} не найдена`,
			},
		);
	});
});

describe("consentTool (clinical.generate_informed_consent)", () => {
	test("tool is registered in ToolRegistry with valid parameters and permissions", () => {
		const registry = new ToolRegistry();
		registerClinicalTools(registry, "clinical");

		const tool = registry.get("clinical.generate_informed_consent");
		assert.ok(tool, "Tool must be registered as clinical.generate_informed_consent");
		assert.strictEqual(tool.name, "generate_informed_consent");
		assert.strictEqual(tool.category, "write");
		assert.deepStrictEqual(tool.permissions, ["clinical.write", "clinical.read"]);

		const validParse = tool.parameters.safeParse({
			patientId: PATIENT_ID,
			procedureType: "therapy_caries",
			doctorName: "Д-р Барабаш С.В.",
			toothCode: "36",
		});
		assert.strictEqual(validParse.success, true);

		const invalidParse = tool.parameters.safeParse({
			patientId: PATIENT_ID,
			procedureType: "unknown_procedure",
			doctorName: "Д-р Барабаш С.В.",
		});
		assert.strictEqual(invalidParse.success, false);
	});

	test("all 8 procedure presets are fully defined with indications, risks, and alternatives", () => {
		const procedures = consentProcedureTypeEnum.options;
		assert.strictEqual(procedures.length, 8);

		for (const proc of procedures) {
			const preset = CONSENT_PROCEDURE_PRESETS[proc];
			assert.ok(preset, `Preset for ${proc} must exist`);
			assert.ok(preset.titleRu.length > 5);
			assert.ok(preset.diagnosisOrIndication.length > 5);
			assert.ok(preset.plannedAnesthesia.length > 5);
			assert.ok(preset.materialsAndMethods.length > 5);
			assert.ok(preset.specificRisks.length >= 3, `Risks for ${proc} must be >= 3`);
			assert.ok(preset.alternatives.length >= 2, `Alternatives for ${proc} must be >= 2`);
			assert.ok(preset.aftercareRequirements.length >= 2, `Aftercare for ${proc} must be >= 2`);
		}
	});

	test("generates full 323-FZ compliant legal text with SHA-256 hash and persists document", async () => {
		const insertedDocs: any[] = [];

		const mockDb: any = {
			select: () => ({
				from: (table: any) => {
					const tableName = getTableName(table);
					return {
						where: () => {
							if (tableName === "patients") {
								const patientData = [
									{
										id: PATIENT_ID,
										fullName: "Ковалев Андрей Михайлович",
										birthDate: "1985-04-12",
										phone: "+7 (999) 777-88-99",
									},
								];
								return Object.assign(Promise.resolve(patientData), {
									limit: () => Promise.resolve(patientData),
									then: (resolve: any) => Promise.resolve(patientData).then(resolve),
								});
							}
							if (tableName === "patient_drug_allergies") {
								const allergiesData = [
									{
										allergenGroup: "Пенициллины",
										drugInnLatin: "Amoxicillinum",
										reactionSeverity: "critical",
									},
								];
								return Object.assign(Promise.resolve(allergiesData), {
									limit: () => Promise.resolve(allergiesData),
									then: (resolve: any) => Promise.resolve(allergiesData).then(resolve),
								});
							}
							return Object.assign(Promise.resolve([]), {
								limit: () => Promise.resolve([]),
								then: (resolve: any) => Promise.resolve([]).then(resolve),
							});
						},
					};
				},
			}),
			insert: (_table: any) => ({
				values: (vals: any) => {
					insertedDocs.push(vals);
					return {
						returning: () =>
							Promise.resolve([
								{
									id: "doc-generated-001",
									createdAt: new Date("2026-09-01T12:00:00.000Z"),
								},
							]),
					};
				},
			}),
		};

		const ctx = createMockContext({ db: mockDb });

		const result = await generateInformedConsentTool.handler(ctx, {
			patientId: PATIENT_ID,
			procedureType: "implantology",
			doctorName: "Д-р Барабаш С.В.",
			toothCode: "46 (область отсутствующего зуба)",
			customRisks: ["Курение пациента до 10 сигарет в день"],
			trustedContact: "Ковалева Мария Ивановна (супруга), +7 (999) 111-00-00",
		});

		assert.ok(result);
		assert.strictEqual(result.success, true);
		assert.strictEqual(result.documentId, "doc-generated-001");
		assert.strictEqual(result.patientName, "Ковалев Андрей Михайлович");
		assert.strictEqual(result.procedureType, "implantology");
		assert.strictEqual(result.doctorName, "Д-р Барабаш С.В.");

		// Verify SHA-256 hash
		assert.match(result.signatureSha256, /^[0-9a-f]{64}$/, "Signature must be 64-char hex SHA-256");

		// Verify 7 legal sections
		assert.strictEqual(result.sections.length, 7);
		const s0 = result.sections[0];
		const s2 = result.sections[2];
		const s5 = result.sections[5];
		if (!s0 || !s2 || !s5) {
			assert.fail("Expected sections 0, 2, and 5 to be present");
		}
		assert.strictEqual(s0.number, 1);
		assert.ok(s0.content.includes("Ковалев Андрей Михайлович"));
		assert.ok(s0.content.includes("Д-р Барабаш С.В."));
		assert.ok(s2.content.includes("Пенициллины")); // Allergy integrated
		assert.ok(s2.content.includes("Курение пациента")); // Custom risk integrated
		assert.ok(s5.content.includes("Ковалева Мария Ивановна")); // Trusted contact

		// Verify legal text contains statutory references
		assert.ok(result.legalText.includes("323-ФЗ"));
		assert.ok(result.legalText.includes("1051н"));
		assert.ok(result.legalText.includes("РАЗДЕЛ 1."));
		assert.ok(result.legalText.includes("РАЗДЕЛ 7."));
		assert.ok(result.legalText.includes("ПОДПИСИ СТОРОН:"));

		// Verify database insertion
		assert.strictEqual(insertedDocs.length, 1);
		const inserted = insertedDocs[0];
		assert.strictEqual(inserted.organizationId, ORG_ID);
		assert.strictEqual(inserted.patientId, PATIENT_ID);
		assert.strictEqual(inserted.kind, "informed_consent");
		assert.strictEqual(inserted.status, "draft");
		assert.strictEqual(inserted.issuedSnapshotSha256, result.signatureSha256);
		assert.ok(inserted.title.includes("ИДС:"));
	});

	test("throws error when patient does not exist", async () => {
		const mockDb: any = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: () => Promise.resolve([]),
					}),
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });

		await assert.rejects(
			async () => {
				await generateInformedConsentTool.handler(ctx, {
					patientId: PATIENT_ID,
					procedureType: "endodontics",
					doctorName: "Д-р Барабаш С.В.",
				});
			},
			{
				message: `Пациент с ID ${PATIENT_ID} не найден`,
			},
		);
	});
});
