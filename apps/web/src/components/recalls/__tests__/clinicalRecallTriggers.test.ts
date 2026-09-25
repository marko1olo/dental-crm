/**
 * clinicalRecallTriggers.test.ts
 *
 * Subagent 2: CRM Core, Recalls & Patient Retention Inquisitor.
 *
 * Mandate & Invariant Verifications:
 * 1. 4 Automatic Clinical Return Triggers:
 *    - Профгигиена: 6 months after last cleaning.
 *    - Осмотр после имплантации / протезирования: 12 months.
 *    - Ортодонтическая активация: 1 month (4 weeks / 28 days).
 *    - Детский осмотр: 3–4 months.
 *    - Unified clinical evaluator: evaluateClinicalRecallTrigger.
 * 2. 4 Canonical Workflow Statuses:
 *    - «Не звонили» (not_called), «Дозвонились» (reached), «Отказ» (declined), «Записан» (scheduled).
 *    - Bidirectional mapping with legacy statuses.
 * 3. 152-ФЗ PDn-Protected WhatsApp / SMS Generator:
 *    - Polite Russian address (First Name + Patronymic e.g. "Иван Иванович").
 *    - Zero diagnosis leakage (no "кариес", "пульпит", "пародонтит", etc. on lockscreens).
 * 4. Period Filtering (all, overdue, this_month, next_month, next_30_days).
 * 5. Doctor & Period Candidate Filters.
 * 6. UI Autonomy: Table / Kanban Views, 4 Kanban Columns, Zero Disabled Buttons (Mandate 8e).
 */

import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	calculateHygieneRecallTrigger,
	calculateImplantProstheticRecallTrigger,
	calculateOrthoActivationRecallTrigger,
	calculatePediatricRecallTrigger,
	evaluateClinicalRecallTrigger,
	resolveCandidateTriggerType,
	isDateInPeriod,
	extractPolitePatientName,
	generatePdnProtectedRecallMessage,
	toCanonicalRecallStatus,
	fromCanonicalRecallStatus,
	filterAndSortRecallCandidates,
	CANONICAL_RECALL_STATUS_CONFIG,
	type PatientRecallRecord,
	type CanonicalRecallWorkflowStatus,
} from "../patientRecallEngine";
import { PatientRecallsHubModal } from "../PatientRecallsHubModal";

describe("Subagent 2: Clinical Recall Triggers & Retention Inquisitor", () => {
	/* ==========================================================================
	   1. ТЕСТИРОВАНИЕ 4 КЛИНИЧЕСКИХ ТРИГГЕРОВ ВОЗВРАТА ПАЦИЕНТОВ
	   ========================================================================== */
	describe("1. 4 Automatic Clinical Return Triggers (StomX / IDENT Standards)", () => {
		it("Trigger 1: Hygiene — sets 6 months interval from last cleaning", () => {
			const lastCleaning = "2026-03-15";
			const trigger = calculateHygieneRecallTrigger(lastCleaning);

			assert.equal(trigger.triggerType, "hygiene_6m");
			assert.equal(trigger.intervalMonths, 6);
			assert.equal(trigger.formattedDueDate, "2026-09-15");
			assert.equal(trigger.mappedCycleType, "standard_prophylaxis");
			assert.ok(trigger.title.includes("гигиена"));
			assert.ok(trigger.clinicalRationale.includes("гарантийных обязательств"));
		});

		it("Trigger 1: Hygiene handles month end overflow safely (Aug 31 + 6 months -> Feb 28)", () => {
			const trigger = calculateHygieneRecallTrigger("2025-08-31");
			assert.equal(trigger.formattedDueDate, "2026-02-28");
		});

		it("Trigger 2: Implants / Prosthetics — sets 12 months interval for annual checkup", () => {
			const surgeryDate = "2025-05-20";
			const trigger = calculateImplantProstheticRecallTrigger(surgeryDate);

			assert.equal(trigger.triggerType, "implant_prosthetic_12m");
			assert.equal(trigger.intervalMonths, 12);
			assert.equal(trigger.formattedDueDate, "2026-05-20");
			assert.equal(trigger.mappedCycleType, "implant_monitoring");
			assert.ok(trigger.title.includes("имплантации"));
			assert.ok(trigger.clinicalRationale.includes("СтАР/ITI"));
		});

		it("Trigger 3: Orthodontic Activation — sets strictly 1 month / 4 weeks (28 days)", () => {
			const lastAdjustment = "2026-04-01";
			const trigger = calculateOrthoActivationRecallTrigger(lastAdjustment);

			assert.equal(trigger.triggerType, "ortho_activation_1m");
			assert.equal(trigger.intervalWeeks, 4);
			assert.equal(trigger.intervalMonths, 1);
			// 2026-04-01 + 28 days = 2026-04-29
			assert.equal(trigger.formattedDueDate, "2026-04-29");
			assert.equal(trigger.mappedCycleType, "orthodontic_braces");
			assert.ok(trigger.title.includes("активация"));
		});

		it("Trigger 4: Pediatric Checkup — sets 3 or 4 months interval for children", () => {
			const lastVisit = "2026-01-10";

			const trigger3m = calculatePediatricRecallTrigger(lastVisit, 3);
			assert.equal(trigger3m.triggerType, "pediatric_3_4m");
			assert.equal(trigger3m.intervalMonths, 3);
			assert.equal(trigger3m.formattedDueDate, "2026-04-10");
			assert.equal(trigger3m.mappedCycleType, "pediatric_fluoridation");
			assert.ok(trigger3m.clinicalRationale.includes("незрелой эмали"));

			const trigger4m = calculatePediatricRecallTrigger(lastVisit, 4);
			assert.equal(trigger4m.intervalMonths, 4);
			assert.equal(trigger4m.formattedDueDate, "2026-05-10");
		});

		it("Unified Evaluator: classifies child < 14 as pediatric recall trigger", () => {
			const result = evaluateClinicalRecallTrigger({
				lastVisitDate: "2026-02-01",
				isChildUnder14: true,
			});
			assert.equal(result.triggerType, "pediatric_3_4m");
			assert.equal(result.intervalMonths, 3);
		});

		it("Unified Evaluator: classifies orthodontic braces patient as 1 month activation", () => {
			const result = evaluateClinicalRecallTrigger({
				lastVisitDate: "2026-03-01",
				hasBraces: true,
			});
			assert.equal(result.triggerType, "ortho_activation_1m");
			assert.equal(result.intervalWeeks, 4);
		});

		it("Unified Evaluator: classifies implant/crown carrier as 12 months annual checkup", () => {
			const result = evaluateClinicalRecallTrigger({
				lastVisitDate: "2025-06-15",
				hasImplants: true,
			});
			assert.equal(result.triggerType, "implant_prosthetic_12m");
			assert.equal(result.intervalMonths, 12);
		});

		it("Unified Evaluator: defaults healthy adult patient to 6 months hygiene trigger", () => {
			const result = evaluateClinicalRecallTrigger({
				lastVisitDate: "2026-01-01",
			});
			assert.equal(result.triggerType, "hygiene_6m");
			assert.equal(result.intervalMonths, 6);
			assert.equal(result.formattedDueDate, "2026-07-01");
		});

		it("Candidate Trigger Resolver: maps patient records into canonical triggers correctly", () => {
			const childCandidate: PatientRecallRecord = {
				id: "c1",
				patientId: "p1",
				fullName: "Смирнов Артем Денисович",
				phone: "+79991112233",
				age: 8,
				cycleType: "pediatric_fluoridation",
				lastVisitDate: "2026-01-01",
				dueDate: "2026-04-01",
				daysOverdue: 0,
				urgencyStatus: "due_now",
				status: "due_now",
			};
			assert.equal(resolveCandidateTriggerType(childCandidate), "pediatric_3_4m");

			const orthoCandidate: PatientRecallRecord = {
				...childCandidate,
				age: 22,
				cycleType: "orthodontic_braces",
			};
			assert.equal(resolveCandidateTriggerType(orthoCandidate), "ortho_activation_1m");

			const implantCandidate: PatientRecallRecord = {
				...childCandidate,
				age: 45,
				cycleType: "implant_monitoring",
				implantSurgeryDate: "2025-04-10",
			};
			assert.equal(resolveCandidateTriggerType(implantCandidate), "implant_prosthetic_12m");

			const hygieneCandidate: PatientRecallRecord = {
				...childCandidate,
				age: 35,
				cycleType: "standard_prophylaxis",
			};
			assert.equal(resolveCandidateTriggerType(hygieneCandidate), "hygiene_6m");
		});
	});

	/* ==========================================================================
	   2. 4 КАНОНИЧЕСКИХ СТАТУСА (НЕ ЗВОНИЛИ / ДОЗВОНИЛИСЬ / ОТКАЗ / ЗАПИСАН)
	   ========================================================================== */
	describe("2. 4 Canonical Workflow Statuses & Mapping", () => {
		it("maps legacy and contact statuses into the 4 canonical workflow buckets", () => {
			assert.equal(toCanonicalRecallStatus("due_now"), "not_called");
			assert.equal(toCanonicalRecallStatus("pending"), "not_called");

			assert.equal(toCanonicalRecallStatus("invited"), "reached");
			assert.equal(toCanonicalRecallStatus("contacted"), "reached");

			assert.equal(toCanonicalRecallStatus("declined"), "declined");

			assert.equal(toCanonicalRecallStatus("scheduled"), "scheduled");
			assert.equal(toCanonicalRecallStatus("completed"), "scheduled");
		});

		it("maps canonical workflow statuses back to engine contact statuses", () => {
			assert.equal(fromCanonicalRecallStatus("not_called"), "due_now");
			assert.equal(fromCanonicalRecallStatus("reached"), "contacted");
			assert.equal(fromCanonicalRecallStatus("declined"), "declined");
			assert.equal(fromCanonicalRecallStatus("scheduled"), "scheduled");
		});

		it("defines canonical status config with localized Russian labels and color tokens", () => {
			const statuses: CanonicalRecallWorkflowStatus[] = [
				"not_called",
				"reached",
				"declined",
				"scheduled",
			];
			for (const s of statuses) {
				const cfg = CANONICAL_RECALL_STATUS_CONFIG[s];
				assert.ok(cfg, `Config for status ${s} must exist`);
				assert.ok(cfg.label.length > 0);
				assert.ok(cfg.badgeColorToken.length > 0);
			}
			assert.equal(CANONICAL_RECALL_STATUS_CONFIG.not_called.label, "Не звонили");
			assert.equal(CANONICAL_RECALL_STATUS_CONFIG.reached.label, "Дозвонились");
			assert.equal(CANONICAL_RECALL_STATUS_CONFIG.declined.label, "Отказ");
			assert.equal(CANONICAL_RECALL_STATUS_CONFIG.scheduled.label, "Записан");
		});
	});

	/* ==========================================================================
	   3. 152-ФЗ PDN-ЗАЩИЩЕННЫЙ ШАБЛОН (БЕЗ УТЕЧКИ ДИАГНОЗОВ)
	   ========================================================================== */
	describe("3. 152-ФЗ PDn-Protected WhatsApp & SMS Message Generator", () => {
		it("extracts polite Russian salutation (Имя Отчество) from full Russian name", () => {
			assert.equal(
				extractPolitePatientName("Иванов Иван Иванович"),
				"Иван Иванович",
			);
			assert.equal(
				extractPolitePatientName("Петрова Елена Сергеевна"),
				"Елена Сергеевна",
			);
			assert.equal(extractPolitePatientName("Сидоров Алексей"), "Алексей");
			assert.equal(extractPolitePatientName("Мария"), "Мария");
			assert.equal(extractPolitePatientName(""), "Пациент");
		});

		it("generates 152-ФЗ protected message with zero medical diagnosis leaks", () => {
			const candidate: PatientRecallRecord = {
				id: "cand-77",
				patientId: "pat-77",
				fullName: "Кузнецов Иван Иванович",
				phone: "+7 (999) 555-44-33",
				cycleType: "periodontal_maintenance", // Periodontitis
				lastVisitDate: "2025-11-01",
				dueDate: "2026-05-01",
				daysOverdue: 0,
				urgencyStatus: "due_now",
				status: "due_now",
				clinicalNotes: "Глубокий кариес 36 зуба, хронический пародонтит, имплантация 46",
			};

			const message = generatePdnProtectedRecallMessage(candidate, {
				clinicName: "Стоматология ДЕНТЕ",
			});

			// Standard greeting & polite name
			assert.ok(message.includes("Иван Иванович"));
			assert.ok(message.includes("подошел срок контрольного осмотра"));
			assert.ok(message.includes("Стоматология ДЕНТЕ"));
			assert.ok(message.includes("Записаться:"));

			// Strict 152-ФЗ / 323-ФЗ check: NO medical secrets on lockscreen!
			const forbiddenWords = [
				/кариес/i,
				/пародонтит/i,
				/пульпит/i,
				/удалени/i,
				/имплант/i,
				/кист/i,
				/пломб/i,
				/гной/i,
				/десн/i,
				/кровоточивост/i,
			];

			for (const pattern of forbiddenWords) {
				assert.equal(
					pattern.test(message),
					false,
					`152-ФЗ Violation: message must NOT leak diagnosis matching ${pattern}`,
				);
			}
		});
	});

	/* ==========================================================================
	   4. ПЕРИОДИЧЕСКАЯ ФИЛЬТРАЦИЯ (isDateInPeriod)
	   ========================================================================== */
	describe("4. Period Filtering (Overdue, This Month, Next Month, Next 30 Days)", () => {
		const refDate = new Date("2026-05-15T12:00:00Z");

		it("recognizes overdue dates (dueDate < referenceDate)", () => {
			assert.equal(isDateInPeriod("2026-05-10", "overdue", refDate), true);
			assert.equal(isDateInPeriod("2026-04-01", "overdue", refDate), true);
			assert.equal(isDateInPeriod("2026-05-20", "overdue", refDate), false);
			assert.equal(isDateInPeriod("2026-06-01", "overdue", refDate), false);
		});

		it("recognizes dates in this month (year and month match)", () => {
			assert.equal(isDateInPeriod("2026-05-01", "this_month", refDate), true);
			assert.equal(isDateInPeriod("2026-05-25", "this_month", refDate), true);
			assert.equal(isDateInPeriod("2026-04-30", "this_month", refDate), false);
			assert.equal(isDateInPeriod("2026-06-01", "this_month", refDate), false);
		});

		it("recognizes dates in next month", () => {
			assert.equal(isDateInPeriod("2026-06-05", "next_month", refDate), true);
			assert.equal(isDateInPeriod("2026-06-30", "next_month", refDate), true);
			assert.equal(isDateInPeriod("2026-05-31", "next_month", refDate), false);
			assert.equal(isDateInPeriod("2026-07-01", "next_month", refDate), false);
		});

		it("recognizes dates in next 30 days window", () => {
			// ref is 2026-05-15
			assert.equal(isDateInPeriod("2026-05-16", "next_30_days", refDate), true);
			assert.equal(isDateInPeriod("2026-06-10", "next_30_days", refDate), true);
			// 45 days in future:
			assert.equal(isDateInPeriod("2026-07-01", "next_30_days", refDate), false);
			// in the past:
			assert.equal(isDateInPeriod("2026-05-10", "next_30_days", refDate), false);
		});

		it("period 'all' matches any valid date", () => {
			assert.equal(isDateInPeriod("2025-01-01", "all", refDate), true);
			assert.equal(isDateInPeriod("2027-12-31", "all", refDate), true);
		});
	});

	/* ==========================================================================
	   5. ФИЛЬТРАЦИЯ КАНДИДАТОВ ПО ВРАЧАМ, ПЕРИОДАМ И КЛИНИЧЕСКИМ ТРИГГЕРАМ
	   ========================================================================== */
	describe("5. Candidate Filtering by Doctor, Period, and Trigger", () => {
		const candidates: PatientRecallRecord[] = [
			{
				id: "c-doc1-hygiene",
				patientId: "p1",
				fullName: "Иванов Петр",
				phone: "+79991110001",
				cycleType: "standard_prophylaxis",
				lastVisitDate: "2025-11-15",
				dueDate: "2026-05-15",
				daysOverdue: 0,
				urgencyStatus: "due_now",
				status: "due_now",
				attendingDoctorId: "doc-petrov",
				attendingDoctorName: "Д-р Петров П.П.",
			},
			{
				id: "c-doc2-implant",
				patientId: "p2",
				fullName: "Сидорова Анна",
				phone: "+79991110002",
				cycleType: "implant_monitoring",
				implantSurgeryDate: "2025-04-01",
				lastVisitDate: "2025-04-01",
				dueDate: "2026-04-01",
				daysOverdue: 45,
				urgencyStatus: "overdue_30",
				status: "invited",
				attendingDoctorId: "doc-smirnov",
				attendingDoctorName: "Д-р Смирнов С.С.",
			},
			{
				id: "c-doc1-ortho",
				patientId: "p3",
				fullName: "Козлов Дмитрий",
				phone: "+79991110003",
				cycleType: "orthodontic_braces",
				orthoDeviceType: "braces",
				lastVisitDate: "2026-05-01",
				dueDate: "2026-05-29",
				daysOverdue: -14,
				urgencyStatus: "upcoming",
				status: "scheduled",
				attendingDoctorId: "doc-petrov",
				attendingDoctorName: "Д-р Петров П.П.",
			},
		];

		it("filters candidates by attendingDoctorId", () => {
			const filteredDoc1 = filterAndSortRecallCandidates(candidates, {
				doctorId: "doc-petrov",
			});
			assert.equal(filteredDoc1.length, 2);
			assert.ok(filteredDoc1.every((c) => c.attendingDoctorId === "doc-petrov"));

			const filteredDoc2 = filterAndSortRecallCandidates(candidates, {
				doctorId: "doc-smirnov",
			});
			assert.equal(filteredDoc2.length, 1);
			assert.equal(filteredDoc2[0]?.id, "c-doc2-implant");
		});

		it("filters candidates by clinical return trigger", () => {
			const hygieneOnly = filterAndSortRecallCandidates(candidates, {
				triggerType: "hygiene_6m",
			});
			assert.equal(hygieneOnly.length, 1);
			assert.equal(hygieneOnly[0]?.id, "c-doc1-hygiene");

			const implantOnly = filterAndSortRecallCandidates(candidates, {
				triggerType: "implant_prosthetic_12m",
			});
			assert.equal(implantOnly.length, 1);
			assert.equal(implantOnly[0]?.id, "c-doc2-implant");

			const orthoOnly = filterAndSortRecallCandidates(candidates, {
				triggerType: "ortho_activation_1m",
			});
			assert.equal(orthoOnly.length, 1);
			assert.equal(orthoOnly[0]?.id, "c-doc1-ortho");
		});

		it("filters candidates by canonical workflow status", () => {
			const notCalled = filterAndSortRecallCandidates(candidates, {
				canonicalStatus: "not_called",
			});
			assert.equal(notCalled.length, 1);
			assert.equal(notCalled[0]?.id, "c-doc1-hygiene");

			const reached = filterAndSortRecallCandidates(candidates, {
				canonicalStatus: "reached",
			});
			assert.equal(reached.length, 1);
			assert.equal(reached[0]?.id, "c-doc2-implant");

			const scheduled = filterAndSortRecallCandidates(candidates, {
				canonicalStatus: "scheduled",
			});
			assert.equal(scheduled.length, 1);
			assert.equal(scheduled[0]?.id, "c-doc1-ortho");
		});

		it("filters candidates by period (overdue relative to refDate)", () => {
			const overdue = filterAndSortRecallCandidates(candidates, {
				period: "overdue",
				referenceDate: "2026-05-15",
			});
			assert.equal(overdue.length, 1);
			assert.equal(overdue[0]?.id, "c-doc2-implant"); // dueDate 2026-04-01 is overdue
		});
	});

	/* ==========================================================================
	   6. UI РЕНДЕРИНГ И АВТОНОМИЯ ВРАЧА (TABLE / KANBAN / ZERO DISABLED BUTTONS)
	   ========================================================================== */
	describe("6. UI Rendering: Table vs Kanban Views and Doctor Autonomy", () => {
		const sampleCandidate: PatientRecallRecord = {
			id: "cand-ui-01",
			patientId: "pat-ui-01",
			fullName: "Васильев Василий Васильевич",
			phone: "+7 (926) 333-22-11",
			cycleType: "standard_prophylaxis",
			lastVisitDate: "2025-11-01",
			dueDate: "2026-05-01",
			daysOverdue: 14,
			urgencyStatus: "due_now",
			status: "due_now",
			attendingDoctorId: "doc-10",
			attendingDoctorName: "Д-р Орлова А.И.",
			historicalRevenueRub: 12000,
			visitsCount: 1,
		};

		it("renders View Mode toggle buttons (Table vs Kanban) in toolbar", () => {
			const html = renderToStaticMarkup(
				createElement(PatientRecallsHubModal, {
					isOpen: true,
					initialCandidates: [sampleCandidate],
				}),
			);

			assert.ok(html.includes('data-testid="view-mode-table"'), "Table toggle must exist");
			assert.ok(html.includes('data-testid="view-mode-kanban"'), "Kanban toggle must exist");
		});

		it("renders Doctor and Period filter dropdowns in toolbar", () => {
			const html = renderToStaticMarkup(
				createElement(PatientRecallsHubModal, {
					isOpen: true,
					initialCandidates: [sampleCandidate],
				}),
			);

			assert.ok(html.includes('data-testid="doctor-filter-select"'), "Doctor filter must exist");
			assert.ok(html.includes('data-testid="period-filter-select"'), "Period filter must exist");
			assert.ok(html.includes("Все врачи"));
			assert.ok(html.includes("Все периоды"));
			assert.ok(html.includes("Просрочено"));
			assert.ok(html.includes("Текущий месяц"));
		});

		it("renders 4 clinical return trigger presets in the toolbar", () => {
			const html = renderToStaticMarkup(
				createElement(PatientRecallsHubModal, {
					isOpen: true,
					initialCandidates: [sampleCandidate],
				}),
			);

			assert.ok(html.includes('data-testid="preset-hygiene-6m"'), "Hygiene 6m preset must exist");
			assert.ok(html.includes('data-testid="preset-implants-1y"'), "Implant 1y preset must exist");
			assert.ok(html.includes('data-testid="preset-ortho-1m"'), "Ortho 1m preset must exist");
			assert.ok(html.includes('data-testid="preset-pediatric-3m"'), "Pediatric 3m preset must exist");
		});

		it("Mandate 8e: zero disabled action buttons across all action triggers", () => {
			const html = renderToStaticMarkup(
				createElement(PatientRecallsHubModal, {
					isOpen: true,
					initialCandidates: [
						sampleCandidate,
						{
							...sampleCandidate,
							id: "cand-ui-02",
							phone: "", // No phone
							status: "declined",
						},
					],
				}),
			);

			// Extract all <button> tags and ensure NONE have disabled attribute
			const buttonMatches = html.match(/<button[^>]*>/g) || [];
			assert.ok(buttonMatches.length > 0, "Buttons must be present");

			for (const btn of buttonMatches) {
				assert.equal(
					btn.includes("disabled"),
					false,
					`Mandate 8e Violation: Button must never be disabled: ${btn}`,
				);
			}
		});

		it("renders 1-Click Book and WhatsApp action buttons for candidate row", () => {
			const html = renderToStaticMarkup(
				createElement(PatientRecallsHubModal, {
					isOpen: true,
					initialCandidates: [sampleCandidate],
				}),
			);

			assert.ok(
				html.includes(`data-testid="recall-book-btn-${sampleCandidate.id}"`),
				"Book button must exist",
			);
			assert.ok(
				html.includes(`data-testid="recall-whatsapp-btn-${sampleCandidate.id}"`),
				"WhatsApp button must exist",
			);
			assert.ok(
				html.includes(`data-testid="recall-sms-btn-${sampleCandidate.id}"`),
				"SMS button must exist",
			);
		});
	});
});
