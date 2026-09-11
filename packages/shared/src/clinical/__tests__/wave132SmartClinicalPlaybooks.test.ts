/**
 * packages/shared/src/clinical/__tests__/wave132SmartClinicalPlaybooks.test.ts
 *
 * Unit tests for Smart Clinical Playbooks Engine (Wave 132).
 * Reverse-engineered & adapted from DentalPin copilot bridge playbooks
 * (backend/app/modules/copilot/bridge.py).
 *
 * Requirements:
 * 1. Doctor Morning Briefing generation with Mandate 8e red flags (critical allergies & somatic stop-factors).
 * 2. Cancellation gap scoring and candidate ranking (priority + dental pathology urgency + slot timing fit + overdue days).
 * 3. Candidate deduplication and limit enforcement on schedule gap recovery.
 * 4. 0-click pre-appointment summary generation (primary vs repeat visit, previous completed services, agreed budget stages, kopeck financial indicators without barriers).
 * 5. Official Russian Ministry of Health Form 043/u A4 protocol formatting with strictly 0 emojis (Mandate 8d item 7).
 * 6. Zod schemas validation and functional parity across @dental/shared entry points.
 * 7. 100% Zero Mocks.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	appointmentBriefSchema,
	budgetBriefSchema,
	cancellationGapRecoverySchema,
	cancellationSlotSchema,
	doctorMorningBriefingSchema,
	evaluateDentalPathologyUrgency,
	findCancellationGapCandidates,
	formatPlaybookForm043A4Protocol,
	generateMorningBriefing,
	generatePreAppointmentSummary,
	patientBriefSchema,
	playbookRecallItemSchema,
	playbookRecallPrioritySchema,
	preAppointmentSummarySchema,
	rankedGapCandidateSchema,
	recallPathologyUrgencySchema,
	recoverCancellationGap,
	smartClinicalPlaybooksEngine,
	visitBriefSchema,
	type AppointmentBrief,
	type BudgetBrief,
	type CancellationGapRecovery,
	type CancellationSlot,
	type DoctorMorningBriefing,
	type PatientBrief,
	type PlaybookRecallItem,
	type PreAppointmentSummary,
	type RankedGapCandidate,
	type VisitBrief,
} from "../smartClinicalPlaybooksEngine.js";

import {
	generateMorningBriefing as generateBriefingFromClinicalIndex,
	findCancellationGapCandidates as findGapFromClinicalIndex,
	recoverCancellationGap as recoverGapFromClinicalIndex,
	generatePreAppointmentSummary as generatePreSummaryFromClinicalIndex,
	formatPlaybookForm043A4Protocol as formatProtocolFromClinicalIndex,
	smartClinicalPlaybooksEngine as engineFromClinicalIndex,
} from "../index.js";

import {
	generateMorningBriefing as generateBriefingFromSharedRoot,
	findCancellationGapCandidates as findGapFromSharedRoot,
	recoverCancellationGap as recoverGapFromSharedRoot,
	generatePreAppointmentSummary as generatePreSummaryFromSharedRoot,
	formatPlaybookForm043A4Protocol as formatProtocolFromSharedRoot,
	smartClinicalPlaybooksEngine as engineFromSharedRoot,
} from "../../index.js";
import { formatKopecksRu } from "../../money.js";

describe("Wave 132: Smart Clinical Playbooks Engine (DentalPin Reverse-Engineering)", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. DOCTOR MORNING BRIEFING & MANDATE 8E RED FLAGS
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Playbook 1: Doctor Morning Briefing", () => {
		const appointments: AppointmentBrief[] = [
			{
				id: "app-1",
				patientId: "pat-101",
				patientFullName: "Смирнова Елена Васильевна",
				patientPhone: "+7 (911) 222-33-44",
				time: "09:00",
				chairName: "Кресло 1 (Терапия)",
				reason: "Острая боль в области зуба 46, подозрение на пульпит",
				durationMinutes: 60,
				criticalAllergies: ["Лидокаин", "Пенициллин"],
				somaticRiskFactors: ["Прием антикоагулянтов (Варфарин)"],
				isFirstVisit: false,
				unpaidKopecks: 0,
			},
			{
				id: "app-2",
				patientId: "pat-102",
				patientFullName: "Иванов Петр Сергеевич",
				patientPhone: "+7 (921) 333-44-55",
				time: "10:30",
				chairName: "Кресло 1 (Терапия)",
				reason: "Плановая профгигиена полости рта и осмотр",
				durationMinutes: 45,
				criticalAllergies: [],
				somaticRiskFactors: [],
				isFirstVisit: true,
				unpaidKopecks: 0,
			},
			{
				id: "app-3",
				patientId: "pat-103",
				patientFullName: "Ковалева Анна Дмитриевна",
				patientPhone: "+7 (931) 444-55-66",
				time: "11:30",
				chairName: "Кресло 1 (Терапия)",
				reason: "Лечение кариеса зуба 24",
				durationMinutes: 30,
				criticalAllergies: [],
				somaticRiskFactors: ["Гипертонический криз в анамнезе"],
				isFirstVisit: false,
				unpaidKopecks: 150000,
			},
		];

		const recalls: PlaybookRecallItem[] = [
			{
				id: "rec-1",
				patientId: "pat-201",
				patientFullName: "Сидоров Михаил Юрьевич",
				patientPhone: "+7 (905) 111-22-33",
				recallType: "hygiene_recall",
				reasonNote: "Профгигиена 6 месяцев",
				dueDate: "2026-08-10",
				priority: "normal",
				diagnosis: "К03.6 Зубные отложения",
				status: "pending",
			},
			{
				id: "rec-2",
				patientId: "pat-202",
				patientFullName: "Павлов Виктор Степанович",
				patientPhone: "+7 (906) 222-33-44",
				recallType: "implant_check",
				reasonNote: "Контроль остеоинтеграции имплантата 36",
				dueDate: "2026-08-01",
				priority: "high",
				diagnosis: "К05.1 Хронический гингивит",
				status: "pending",
			},
			{
				id: "rec-3",
				patientId: "pat-203",
				patientFullName: "Орлов Денис Игоревич",
				patientPhone: "+7 (907) 333-44-55",
				recallType: "caries_control",
				reasonNote: "Диспансерный кариес-контроль",
				dueDate: "2026-09-20", // Future recall, not overdue for 2026-09-12
				priority: "normal",
				status: "pending",
			},
		];

		const budgets: BudgetBrief[] = [
			{
				id: "bud-1",
				patientId: "pat-301",
				patientFullName: "Федоров Алексей Николаевич",
				title: "Комплексная имплантация и протезирование 46, 47",
				status: "sent",
				totalKopecks: 12500000, // 125 000.00 руб.
				createdAt: "2026-09-02",
				stages: [
					{
						stageNumber: 1,
						title: "Хирургический этап: установка имплантатов",
						status: "proposed",
						totalPriceKopecks: 7000000,
					},
					{
						stageNumber: 2,
						title: "Ортопедический этап: коронки из диоксида циркония",
						status: "proposed",
						totalPriceKopecks: 5500000,
					},
				],
			},
			{
				id: "bud-2",
				patientId: "pat-302",
				patientFullName: "Белова Мария Кирилловна",
				title: "Эндодонтическое перелечивание зуба 16",
				status: "proposed",
				totalKopecks: 3800000, // 38 000.00 руб.
				createdAt: "2026-09-05",
				stages: [
					{
						stageNumber: 1,
						title: "Распломбировка и медикаментозная обработка 3 каналов",
						status: "proposed",
						totalPriceKopecks: 1800000,
					},
					{
						stageNumber: 2,
						title: "Обтурация гуттаперчей и композитное восстановление",
						status: "proposed",
						totalPriceKopecks: 2000000,
					},
				],
			},
			{
				id: "bud-3",
				patientId: "pat-303",
				patientFullName: "Григорьев Семен Аркадьевич",
				title: "Лечение поверхностного кариеса",
				status: "accepted", // Already accepted, should not be in unanswered budgets
				totalKopecks: 600000,
				createdAt: "2026-09-01",
			},
		];

		it("generates structured morning briefing with Mandate 8e red flags", () => {
			const briefing = generateMorningBriefing({
				doctorId: "doc-007",
				doctorName: "д-р Барабаш С.В.",
				date: "2026-09-12",
				appointments,
				recalls,
				budgets,
			});

			assert.ok(doctorMorningBriefingSchema.parse(briefing));
			assert.equal(briefing.date, "2026-09-12");
			assert.equal(briefing.doctorId, "doc-007");
			assert.equal(briefing.doctorFullName, "д-р Барабаш С.В.");
			assert.equal(briefing.appointmentsCount, 3);

			// Critical alerts validation
			assert.equal(briefing.hasCriticalAlerts, true);
			assert.equal(briefing.criticalAlerts.length, 3);

			const allergyAlert = briefing.criticalAlerts.find((a) => a.alertType === "allergy");
			assert.ok(allergyAlert);
			assert.equal(allergyAlert.patientFullName, "Смирнова Елена Васильевна");
			assert.ok(allergyAlert.description.includes("Лидокаин"));
			assert.ok(allergyAlert.description.includes("Пенициллин"));
			assert.ok(allergyAlert.actionRequiredRu.includes("Мандат 8e"));

			const somaticAlerts = briefing.criticalAlerts.filter((a) => a.alertType === "somatic");
			assert.equal(somaticAlerts.length, 2);
			assert.ok(somaticAlerts.some((a) => a.description.includes("Варфарин")));
			assert.ok(somaticAlerts.some((a) => a.description.includes("Гипертонический криз")));

			// Overdue recalls validation
			assert.equal(briefing.overdueRecallsCount, 2);
			assert.equal(briefing.overdueRecalls[0]?.patientFullName, "Павлов Виктор Степанович"); // 42 days overdue
			assert.ok((briefing.overdueRecalls[0]?.overdueDays ?? 0) >= 40);
			assert.equal(briefing.overdueRecalls[1]?.patientFullName, "Сидоров Михаил Юрьевич"); // 33 days overdue

			// Unanswered budgets validation
			assert.equal(briefing.unansweredBudgetsCount, 2);
			assert.equal(briefing.totalPendingBudgetsKopecks, 16300000); // 125 000 + 38 000 = 163 000 руб.
			assert.equal(briefing.totalPendingBudgetsRub, formatKopecksRu(16300000));
			assert.equal(briefing.unansweredBudgets[0]?.patientFullName, "Федоров Алексей Николаевич");

			// Chairside note check
			assert.ok(briefing.summaryChairsideNote.includes("приемов 3"));
			assert.ok(briefing.summaryChairsideNote.includes("3 пациентов с соматическими/аллергологическими стоп-факторами"));
		});

		it("activates 1-click physiological norm preset when no somatic risks exist", () => {
			const cleanAppointments: AppointmentBrief[] = [
				{
					id: "app-10",
					patientId: "pat-999",
					patientFullName: "Чистов Артем Ильич",
					time: "14:00",
					chairName: "Кресло 2",
					reason: "Осмотр",
					criticalAllergies: [],
					somaticRiskFactors: [],
				},
			];

			const briefing = generateMorningBriefing({
				doctorId: "doc-008",
				doctorName: "д-р Смирнова Е.Н.",
				date: "2026-09-12",
				appointments: cleanAppointments,
				recalls: [],
				budgets: [],
			});

			assert.equal(briefing.hasCriticalAlerts, false);
			assert.equal(briefing.criticalAlerts.length, 0);
			assert.ok(briefing.summaryChairsideNote.includes("норма активна по умолчанию в 1 клик"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. CANCELLATION GAP RECOVERY, SCORING & DEDUPLICATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Playbook 2: Cancellation Gap Recovery", () => {
		const gapRecalls: PlaybookRecallItem[] = [
			{
				id: "rec-gap-1",
				patientId: "pat-gap-1",
				patientFullName: "Кузнецов Игорь Олегович",
				patientPhone: "+7 (901) 111-11-11",
				recallType: "other",
				reasonNote: "Острая боль, выпала временная пломба зуба 36",
				dueDate: "2026-09-08", // 4 days overdue
				priority: "urgent",
				diagnosis: "К04.0 Острый пульпит",
				toothNumber: 36,
				estimatedDurationMinutes: 30, // Exact match for 30 min slot
				pathologyUrgency: "acute",
				status: "pending",
			},
			{
				id: "rec-gap-2",
				patientId: "pat-gap-2",
				patientFullName: "Соколова Марина Юрьевна",
				patientPhone: "+7 (902) 222-22-22",
				recallType: "hygiene_recall",
				reasonNote: "Плановая профгигиена раз в полгода",
				dueDate: "2026-06-15", // ~89 days overdue
				priority: "normal",
				diagnosis: "К03.6 Зубной налет",
				estimatedDurationMinutes: 60, // Slot overrun for 30 min slot
				pathologyUrgency: "routine",
				status: "pending",
			},
			{
				id: "rec-gap-3",
				patientId: "pat-gap-3",
				patientFullName: "Лебедев Константин Андреевич",
				patientPhone: "+7 (903) 333-33-33",
				recallType: "caries_control",
				reasonNote: "Лечение глубокого кариеса зуба 15",
				dueDate: "2026-08-15", // 28 days overdue
				priority: "high",
				diagnosis: "К02.1 Кариес дентина",
				toothNumber: 15,
				estimatedDurationMinutes: 30, // Exact match
				pathologyUrgency: "high",
				status: "pending",
			},
			// Duplicate patient for deduplication check:
			{
				id: "rec-gap-4",
				patientId: "pat-gap-3", // Same patient as rec-gap-3, but routine checkup
				patientFullName: "Лебедев Константин Андреевич",
				patientPhone: "+7 (903) 333-33-33",
				recallType: "hygiene_recall",
				reasonNote: "Осмотр гигиениста",
				dueDate: "2026-09-01",
				priority: "low",
				estimatedDurationMinutes: 20,
				pathologyUrgency: "routine",
				status: "pending",
			},
			{
				id: "rec-gap-5",
				patientId: "pat-gap-4",
				patientFullName: "Морозов Роман Сергеевич",
				patientPhone: "+7 (904) 444-44-44",
				recallType: "ortho_adjustment",
				reasonNote: "Снятие швов после резекции",
				dueDate: "2026-09-10",
				priority: "high",
				diagnosis: "Послеоперационный осмотр и снятие швов",
				estimatedDurationMinutes: 15,
				pathologyUrgency: "acute",
				status: "pending",
			},
		];

		it("ranks candidates by weighted score (priority + urgency + timing + overdue)", () => {
			const candidates = findCancellationGapCandidates({
				slotMinutes: 30,
				recalls: gapRecalls,
				candidateLimits: 3,
				currentDate: "2026-09-12",
			});

			assert.equal(candidates.length, 3);
			for (const c of candidates) {
				assert.ok(rankedGapCandidateSchema.parse(c));
			}

			// First candidate should be urgent acute pain (Кузнецов)
			const first = candidates[0];
			assert.ok(first);
			assert.equal(first.patientFullName, "Кузнецов Игорь Олегович");
			assert.equal(first.priority, "urgent");
			assert.equal(first.toothNumber, 36);
			assert.equal(first.scoreBreakdown.priorityScore, 35);
			assert.equal(first.scoreBreakdown.pathologyUrgencyScore, 35);
			assert.equal(first.scoreBreakdown.timingFitScore, 20); // 30 min matches 30 min slot exactly
			assert.equal(first.scoreBreakdown.overdueDaysScore, 4); // 4 days overdue
			assert.equal(first.matchScore, 94);

			// Assert descending order of scores
			assert.ok((candidates[0]?.matchScore ?? 0) >= (candidates[1]?.matchScore ?? 0));
			assert.ok((candidates[1]?.matchScore ?? 0) >= (candidates[2]?.matchScore ?? 0));
		});

		it("deduplicates patients having multiple recall items and takes higher score", () => {
			const candidates = findCancellationGapCandidates({
				slotMinutes: 30,
				recalls: gapRecalls,
				candidateLimits: 5,
				currentDate: "2026-09-12",
			});

			const lebedevMatches = candidates.filter((c) => c.patientFullName === "Лебедев Константин Андреевич");
			assert.equal(lebedevMatches.length, 1);
			assert.equal(lebedevMatches[0]?.priority, "high"); // Kept high-priority deep caries, not low routine
			assert.equal(lebedevMatches[0]?.toothNumber, 15);
		});

		it("builds complete cancellation gap recovery model with actionable prompt", () => {
			const slot: CancellationSlot = {
				startTime: "14:00",
				endTime: "14:30",
				durationMinutes: 30,
				chairName: "Кресло 1 (Терапия)",
				doctorId: "doc-007",
				doctorName: "д-р Барабаш С.В.",
				cancelledPatientName: "Николаев Д.А.",
			};

			const recovery: CancellationGapRecovery = recoverCancellationGap({
				slot,
				recalls: gapRecalls,
				candidateLimits: 2,
				referenceDate: "2026-09-12",
			});

			assert.ok(cancellationGapRecoverySchema.parse(recovery));
			assert.equal(recovery.candidates.length, 2);
			assert.equal(recovery.totalCandidatesFound, 2);
			assert.ok(recovery.actionPromptRu.includes("14:00"));
			assert.ok(recovery.actionPromptRu.includes("Кузнецов Игорь Олегович"));
			assert.ok(recovery.actionPromptRu.includes("+7 (901) 111-11-11"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. PRE-APPOINTMENT SUMMARY & 0-CLICK CHAIRSIDE GUIDANCE
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Playbook 3: Pre-Appointment Summary", () => {
		it("generates pre-appointment summary for primary patient with norm preset", () => {
			const patient: PatientBrief = {
				id: "pat-primary-1",
				fullName: "Васильев Семен Сергеевич",
				birthDate: "1994-05-12",
				phone: "+7 (999) 000-11-22",
				gender: "male",
				cardRecordNumber: "043-2026/891",
				criticalAllergies: [],
				somaticRiskFactors: [],
				somaticNorm: true,
			};

			const summary = generatePreAppointmentSummary({
				patient,
				unpaidKopecks: 0,
			});

			assert.ok(preAppointmentSummarySchema.parse(summary));
			assert.equal(summary.isFirstVisit, true);
			assert.equal(summary.visitType, "primary");
			assert.equal(summary.hasCriticalAlerts, false);
			assert.equal(summary.lastVisit, null);
			assert.equal(summary.financialSummary.unpaidKopecks, 0);
			assert.equal(summary.financialSummary.financialStatusRu, "Оплачено 100% (задолженности нет)");
			assert.ok(summary.chairsideTip.includes("Первичный пациент: активна норма в 1 клик по Мандату 8e"));
		});

		it("flags critical stop-factors, prior visit services and agreed budget stages", () => {
			const patient: PatientBrief = {
				id: "pat-repeat-1",
				fullName: "Григорьева Надежда Павловна",
				birthDate: "1968-11-25",
				phone: "+7 (911) 777-88-99",
				gender: "female",
				cardRecordNumber: "043-2025/112",
				criticalAllergies: ["Ультракаин Д-С Форте", "Амоксициллин"],
				somaticRiskFactors: ["Ишемическая болезнь сердца", "Кардиостимулятор"],
				bloodCoagulationRisk: true,
			};

			const lastVisit: VisitBrief = {
				id: "vis-prior-1",
				visitDate: "2026-08-20",
				doctorName: "д-р Барабаш С.В.",
				diagnosis: "К04.0 Пульпит зуба 35",
				completedServices: [
					{
						code804n: "A16.07.030.001",
						name: "Инструментальная и медикаментозная обработка корневого канала",
						toothNumber: 35,
						totalPriceKopecks: 350000,
					},
					{
						code804n: "A16.07.002.001",
						name: "Временное пломбирование лекарственным препаратом",
						toothNumber: 35,
						totalPriceKopecks: 120000,
					},
				],
			};

			const pendingBudgets: BudgetBrief[] = [
				{
					id: "bud-patient-1",
					patientId: "pat-repeat-1",
					title: "Комплексная санация полости рта",
					status: "accepted",
					totalKopecks: 4500000,
					createdAt: "2026-08-15",
					stages: [
						{
							stageNumber: 1,
							title: "Постоянная обтурация канала зуба 35 и культевая вкладка",
							status: "accepted",
							totalPriceKopecks: 2200000,
						},
						{
							stageNumber: 2,
							title: "Ортопедическая коронка E.max на зуб 35",
							status: "in_progress",
							totalPriceKopecks: 2300000,
						},
					],
				},
			];

			const summary = generatePreAppointmentSummary({
				patient,
				lastVisit,
				pendingBudgets,
				unpaidKopecks: 470000, // 4 700.00 руб.
			});

			assert.ok(preAppointmentSummarySchema.parse(summary));
			assert.equal(summary.isFirstVisit, false);
			assert.equal(summary.visitType, "repeat");
			assert.equal(summary.hasCriticalAlerts, true);
			assert.equal(summary.criticalAlerts.length, 5); // 2 allergies + 2 somatic + 1 blood risk
			assert.ok(summary.criticalAlerts.includes("Ультракаин Д-С Форте"));
			assert.ok(summary.criticalAlerts.includes("Риск кровотечения (антикоагулянты / гемостаз)"));

			assert.equal(summary.agreedBudgetStages.length, 2);
			assert.equal(summary.agreedBudgetStages[0]?.stageNumber, 1);
			assert.equal(summary.agreedBudgetStages[0]?.totalPriceRub, formatKopecksRu(2200000));

			assert.equal(summary.financialSummary.unpaidKopecks, 470000);
			assert.equal(summary.financialSummary.hasOverdueDebt, true);
			assert.ok(summary.financialSummary.financialStatusRu.includes(formatKopecksRu(470000)));

			// Stop-factor alert takes precedence in chairside tip
			assert.ok(summary.chairsideTip.includes("[СТОП-ФАКТОР]"));
			assert.ok(summary.chairsideTip.includes("Ультракаин Д-С Форте"));
		});

		it("formats patient credit advance without barrier errors", () => {
			const patient: PatientBrief = {
				id: "pat-credit-1",
				fullName: "Золотов Олег Маркович",
				criticalAllergies: [],
				somaticRiskFactors: [],
			};

			const summary = generatePreAppointmentSummary({
				patient,
				unpaidKopecks: -250000, // Advance: 2 500.00 руб.
			});

			assert.equal(summary.financialSummary.hasOverdueDebt, false);
			assert.ok(summary.financialSummary.financialStatusRu.includes(formatKopecksRu(250000)));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. FORM 043/U A4 PROTOCOL & ZERO EMOJI MANDATE
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Form 043/u A4 Protocols & Strictly 0 Emojis (Mandate 8d Item 7)", () => {
		const pictographicRegex = /\p{Extended_Pictographic}/u;

		it("formats Morning Briefing A4 protocol with strictly 0 emojis", () => {
			const briefing = generateMorningBriefing({
				doctorId: "doc-12",
				doctorName: "д-р Кузьмин А.В.",
				date: "2026-09-12",
				appointments: [
					{
						id: "app-p1",
						patientId: "pat-p1",
						patientFullName: "Тимофеев Илья Романович",
						time: "09:30",
						chairName: "Кресло 3",
						reason: "Острая боль зуба 11",
						criticalAllergies: ["Лидокаин"],
						somaticRiskFactors: ["Сахарный диабет 1 типа"],
					},
				],
				recalls: [
					{
						patientId: "pat-rec-1",
						patientFullName: "Алексеева Дарья Владимировна",
						dueDate: "2026-08-01",
						priority: "high",
					},
				],
				budgets: [
					{
						id: "b-1",
						patientId: "pat-b-1",
						patientFullName: "Борисов Глеб Игоревич",
						title: "Протезирование All-on-4",
						status: "sent",
						totalKopecks: 28000000,
						createdAt: "2026-09-01",
					},
				],
			});

			const protocol = formatPlaybookForm043A4Protocol(briefing, {
				organizationName: "ООО «ДЕНТЕ ПЛЮС»",
			});

			assert.ok(protocol.includes("ФОРМА N 043/У"));
			assert.ok(protocol.includes("УТРЕННИЙ БРИФИНГ ВРАЧА"));
			assert.ok(protocol.includes("ООО «ДЕНТЕ ПЛЮС»"));
			assert.ok(protocol.includes("Тимофеев Илья Романович"));
			assert.ok(protocol.includes("Сахарный диабет 1 типа"));
			assert.ok(protocol.includes("Подпись врача-стоматолога"));

			// Mandate 8d item 7: STRICTLY 0 EMOJIS!
			assert.equal(pictographicRegex.test(protocol), false);
		});

		it("formats Pre-Appointment Summary A4 protocol with strictly 0 emojis", () => {
			const patient: PatientBrief = {
				id: "pat-prep-1",
				fullName: "Мельникова Светлана Сергеевна",
				birthDate: "1988-03-14",
				phone: "+7 (999) 555-44-33",
				cardRecordNumber: "043-2026/410",
				criticalAllergies: ["Новокаин"],
				somaticRiskFactors: ["Бронхиальная астма"],
			};

			const summary = generatePreAppointmentSummary({
				patient,
				lastVisit: {
					visitDate: "2026-08-10",
					doctorName: "д-р Барабаш С.В.",
					completedServices: [
						{
							code804n: "A16.07.002",
							name: "Восстановление зуба пломбой",
							toothNumber: 26,
						},
					],
				},
				unpaidKopecks: 0,
			});

			const protocol = formatPlaybookForm043A4Protocol(summary);

			assert.ok(protocol.includes("ФОРМА N 043/У"));
			assert.ok(protocol.includes("ПОДГОТОВКА К ПРИЕМУ ПАЦИЕНТА"));
			assert.ok(protocol.includes("Мельникова Светлана Сергеевна"));
			assert.ok(protocol.includes("Новокаин"));
			assert.ok(protocol.includes("Бронхиальная астма"));
			assert.ok(protocol.includes("Восстановление зуба пломбой [Зуб 26]"));

			// Mandate 8d item 7: STRICTLY 0 EMOJIS!
			assert.equal(pictographicRegex.test(protocol), false);
		});

		it("formats Cancellation Gap Recovery A4 protocol with strictly 0 emojis", () => {
			const recovery = recoverCancellationGap({
				slot: {
					startTime: "16:00",
					durationMinutes: 45,
					chairName: "Кресло 2 (Хирургия)",
					doctorName: "д-р Барабаш С.В.",
					cancelledPatientName: "Семенов А.П.",
				},
				recalls: [
					{
						patientId: "pat-gap-a4",
						patientFullName: "Яковлев Арсений Германович",
						patientPhone: "+7 (921) 999-00-11",
						dueDate: "2026-09-05",
						priority: "urgent",
						diagnosis: "К04.4 Острый апикальный периодонтит",
						toothNumber: 16,
						estimatedDurationMinutes: 45,
						pathologyUrgency: "acute",
					},
				],
			});

			const protocol = formatPlaybookForm043A4Protocol(recovery);

			assert.ok(protocol.includes("ЗАПОЛНЕНИЕ ОКНА ПРИ ОТМЕНЕ ЗАПИСИ"));
			assert.ok(protocol.includes("Яковлев Арсений Германович"));
			assert.ok(protocol.includes("Острый апикальный периодонтит (Зуб 16)"));
			assert.ok(protocol.includes("ДЕЙСТВИЕ РЕГИСТРАТУРЫ:"));

			// Mandate 8d item 7: STRICTLY 0 EMOJIS!
			assert.equal(pictographicRegex.test(protocol), false);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. ZOD SCHEMA INTEGRITY & RE-EXPORT PARITY
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Zod Schema Integrity & Re-Export Parity across Modules", () => {
		it("validates Zod schemas for all models", () => {
			assert.ok(
				patientBriefSchema.parse({
					id: "p1",
					fullName: "Тестовый Пациент",
				}),
			);
			assert.ok(
				appointmentBriefSchema.parse({
					id: "a1",
					patientId: "p1",
					patientFullName: "Тестовый Пациент",
					time: "10:00",
					chairName: "Кресло 1",
					reason: "Тест",
				}),
			);
			assert.ok(
				budgetBriefSchema.parse({
					id: "b1",
					patientId: "p1",
					title: "Тестовая смета",
					status: "sent",
					totalKopecks: 500000,
					createdAt: "2026-09-01",
				}),
			);
			assert.ok(
				playbookRecallItemSchema.parse({
					patientId: "p1",
					patientFullName: "Тестовый Пациент",
					dueDate: "2026-09-01",
				}),
			);
			assert.ok(
				cancellationSlotSchema.parse({
					startTime: "12:00",
					durationMinutes: 30,
					chairName: "Кресло 1",
				}),
			);

			// Pathology urgency evaluator
			const acuteEval = evaluateDentalPathologyUrgency("Острый пульпит зуба 46");
			assert.equal(acuteEval.urgency, "acute");
			assert.equal(acuteEval.score, 35);

			const routineEval = evaluateDentalPathologyUrgency("Плановая профгигиена");
			assert.equal(routineEval.urgency, "routine");
			assert.equal(routineEval.score, 15);
		});

		it("provides full functional parity from packages/shared/src/clinical/index.js", () => {
			const briefing = generateBriefingFromClinicalIndex({
				doctorId: "doc-1",
				date: "2026-09-12",
				appointments: [],
				recalls: [],
				budgets: [],
			});
			assert.equal(briefing.appointmentsCount, 0);

			const candidates = findGapFromClinicalIndex({
				slotMinutes: 30,
				recalls: [],
			});
			assert.equal(candidates.length, 0);

			const summary = generatePreSummaryFromClinicalIndex({
				patient: { id: "p1", fullName: "Иванов И.И." },
				unpaidKopecks: 0,
			});
			assert.equal(summary.isFirstVisit, true);

			assert.ok(engineFromClinicalIndex.generateMorningBriefing);
			assert.ok(engineFromClinicalIndex.findCancellationGapCandidates);
		});

		it("provides full functional parity from packages/shared/src/index.js root", () => {
			const briefing = generateBriefingFromSharedRoot({
				doctorId: "doc-2",
				date: "2026-09-12",
				appointments: [],
				recalls: [],
				budgets: [],
			});
			assert.equal(briefing.appointmentsCount, 0);

			const candidates = findGapFromSharedRoot({
				slotMinutes: 30,
				recalls: [],
			});
			assert.equal(candidates.length, 0);

			const summary = generatePreSummaryFromSharedRoot({
				patient: { id: "p2", fullName: "Петров П.П." },
				unpaidKopecks: 100000,
			});
			assert.equal(summary.financialSummary.unpaidKopecks, 100000);

			assert.ok(engineFromSharedRoot.generateMorningBriefing);
			assert.ok(engineFromSharedRoot.findCancellationGapCandidates);
		});
	});
});
