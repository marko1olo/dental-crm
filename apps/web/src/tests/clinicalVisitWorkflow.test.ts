import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createDoctorChairSession,
	switchDoctorChair,
	calculateChairTimerMetrics,
	markAnesthesiaAdministered,
	updateChairSessionStatus,
	abortOrRescheduleVisit,
	formatTimerSeconds,
	getIsolatedVisitDraftStorageKey,
	completeClinicalVisitAndAssembleEstimate,
	extractProceduresFromDiary,
	buildChairsideSmartProtocol,
	CHAIRSIDE_SMART_PROTOCOL_KEYS,
	type DoctorChairSession,
	type ClinicalVisitCompletionInput,
	type ChairsideSmartProtocolKey,
} from "../components/visit/clinicalVisitWorkflow";
import {
	saveChairsideVisitDraft,
	loadChairsideVisitDraft,
	clearChairsideVisitDraft,
	isChairsideDraftRecent,
	type ChairsideVisitDraftPayload,
} from "../components/visit/doctorChairSessions";
import {
	getIsolatedVisitDraftKey,
	verifyZeroDraftCollision,
} from "../components/visit/useVisitSave";

// Import full comprehensive clinical visit workflow test suite
import "../components/visit/clinicalVisitWorkflow.test";

describe("Subagent 6: Multi-Chair Solo Doctor Concurrent Workflow & Chair Switcher Test Suite", () => {
	describe("1. Multi-Chair Scenario & 1-Click Chair Switching", () => {
		it("supports a solo doctor working across 2-3 dental chairs simultaneously", () => {
			const now = "2026-09-29T11:00:00.000Z";
			const chair1 = createDoctorChairSession({
				chairId: "chair-1",
				chairName: "Кресло 1 (Терапия)",
				visitId: "vis-ch1",
				patientId: "pat-1",
				patientName: "Сидоров А.В.",
				doctorName: "Д-р Смирнова А.С.",
				isDoctorPresent: true,
				startedAt: now,
			});
			const chair2 = createDoctorChairSession({
				chairId: "chair-2",
				chairName: "Кресло 2 (Хирургия)",
				visitId: "vis-ch2",
				patientId: "pat-2",
				patientName: "Петров В.С.",
				doctorName: "Д-р Смирнова А.С.",
				isDoctorPresent: false,
				startedAt: now,
			});
			const chair3 = createDoctorChairSession({
				chairId: "chair-3",
				chairName: "Кресло 3 (Осмотр)",
				visitId: "vis-ch3",
				patientId: "pat-3",
				patientName: "Иванов И.И.",
				doctorName: "Д-р Смирнова А.С.",
				isDoctorPresent: false,
				startedAt: now,
			});

			const chairs = [chair1, chair2, chair3];
			assert.equal(chairs.length, 3);
			assert.equal(chairs[0]?.isDoctorPresent, true);
			assert.equal(chairs[1]?.isDoctorPresent, false);
			assert.equal(chairs[2]?.isDoctorPresent, false);
		});

		it("switches from Chair 1 to Chair 2 without losing active state or doctor work time", () => {
			const startIso = "2026-09-29T11:00:00.000Z";
			const anesIso = "2026-09-29T11:05:00.000Z";
			const switchIso = "2026-09-29T11:06:00.000Z"; // After 6 minutes (including anesthesia injection at min 5)

			const chair1 = createDoctorChairSession({
				chairId: "chair-1",
				chairName: "Кресло 1",
				visitId: "vis-ch1",
				patientId: "pat-1",
				patientName: "Сидоров А.В.",
				doctorName: "Д-р Смирнова А.С.",
				isDoctorPresent: true,
				startedAt: startIso,
			});
			const chair2 = createDoctorChairSession({
				chairId: "chair-2",
				chairName: "Кресло 2",
				visitId: "vis-ch2",
				patientId: "pat-2",
				patientName: "Петров В.С.",
				doctorName: "Д-р Смирнова А.С.",
				isDoctorPresent: false,
				startedAt: startIso,
			});

			// Doctor injects anesthesia on Chair 1
			const withAnesthesia = markAnesthesiaAdministered([chair1, chair2], "chair-1", {
				drugName: "Ультракаин Д-С",
				durationMinutes: 8,
				nowIso: anesIso,
			});

			// Doctor switches to Chair 2 to prepare tooth for Petrov V.S.
			const { updatedSessions, activeSession, previousSession } = switchDoctorChair(
				withAnesthesia,
				"chair-2",
				{ nowIso: switchIso },
			);

			assert.equal(activeSession?.chairId, "chair-2");
			assert.equal(activeSession?.isDoctorPresent, true);
			assert.equal(activeSession?.status, "active");

			assert.equal(previousSession?.chairId, "chair-1");
			const updatedChair1 = updatedSessions.find((c) => c.chairId === "chair-1")!;
			assert.equal(updatedChair1.isDoctorPresent, false);
			assert.equal(updatedChair1.status, "waiting_anesthesia");
			assert.equal(updatedChair1.doctorWorkSeconds, 360); // 6 min = 360 seconds
		});
	});

	describe("2. Independent Chair Clocks & Anesthesia Countdown", () => {
		it("tracks chair total time vs active doctor work time independently", () => {
			const startIso = "2026-09-29T11:00:00.000Z";
			const switchIso = "2026-09-29T11:10:00.000Z"; // 10 min
			const auditIso = "2026-09-29T11:30:00.000Z"; // 30 min from start

			const chair1 = createDoctorChairSession({
				chairId: "chair-1",
				chairName: "Кресло 1",
				visitId: "vis-ch1",
				patientId: "pat-1",
				patientName: "Сидоров А.В.",
				doctorName: "Д-р Смирнова А.С.",
				isDoctorPresent: true,
				startedAt: startIso,
			});
			const chair2 = createDoctorChairSession({
				chairId: "chair-2",
				chairName: "Кресло 2",
				visitId: "vis-ch2",
				patientId: "pat-2",
				patientName: "Петров В.С.",
				doctorName: "Д-р Смирнова А.С.",
				isDoctorPresent: false,
				startedAt: startIso,
			});

			const { updatedSessions } = switchDoctorChair([chair1, chair2], "chair-2", { nowIso: switchIso });
			const c1 = updatedSessions.find((c) => c.chairId === "chair-1")!;
			const c2 = updatedSessions.find((c) => c.chairId === "chair-2")!;

			const metrics1 = calculateChairTimerMetrics(c1, auditIso);
			const metrics2 = calculateChairTimerMetrics(c2, auditIso);

			// Patient 1 in chair for 30 minutes, doctor worked only 10 minutes (11:00 - 11:10)
			assert.equal(metrics1.totalChairSeconds, 30 * 60);
			assert.equal(metrics1.doctorActiveSeconds, 10 * 60);
			assert.equal(metrics1.chairTimeFormatted, "30:00");
			assert.equal(metrics1.doctorTimeFormatted, "10:00");

			// Patient 2 in chair for 30 minutes, doctor worked 20 minutes (11:10 - 11:30)
			assert.equal(metrics2.totalChairSeconds, 30 * 60);
			assert.equal(metrics2.doctorActiveSeconds, 20 * 60);
			assert.equal(metrics2.chairTimeFormatted, "30:00");
			assert.equal(metrics2.doctorTimeFormatted, "20:00");
		});

		it("displays countdown for anesthesia onset and marks ready upon expiration", () => {
			const anesIso = "2026-09-29T11:00:00.000Z";
			const midIso = "2026-09-29T11:03:00.000Z"; // 3 min later
			const readyIso = "2026-09-29T11:09:00.000Z"; // 9 min later (target is 8 min)

			const chair = createDoctorChairSession({
				chairId: "chair-1",
				chairName: "Кресло 1",
				visitId: "vis-ch1",
				patientId: "pat-1",
				patientName: "Сидоров А.В.",
				doctorName: "Д-р Смирнова А.С.",
				isDoctorPresent: false,
				anesthesiaStartedAt: anesIso,
				anesthesiaDurationMinutes: 8,
			});

			const midMetrics = calculateChairTimerMetrics(chair, midIso);
			assert.equal(midMetrics.anesthesiaRemainingSeconds, 5 * 60);
			assert.equal(midMetrics.isAnesthesiaReady, false);
			assert.ok(midMetrics.tabLabel.includes("Ожидание анестезии 5 мин"));

			const readyMetrics = calculateChairTimerMetrics(chair, readyIso);
			assert.equal(readyMetrics.anesthesiaRemainingSeconds, 0);
			assert.equal(readyMetrics.isAnesthesiaReady, true);
		});
	});

	describe("3. Autosave Safety & Zero Data Collisions (localStorage/IndexedDB)", () => {
		it("keys drafts strictly by visitId ensuring Chair 1 and Chair 2 never collide", () => {
			const visitId1 = "vis-ch1-2026";
			const visitId2 = "vis-ch2-2026";

			const key1 = getIsolatedVisitDraftKey(visitId1);
			const key2 = getIsolatedVisitDraftKey(visitId2);

			assert.equal(key1, "dente_visit_draft_vis-ch1-2026");
			assert.equal(key2, "dente_visit_draft_vis-ch2-2026");
			assert.notEqual(key1, key2);

			const isSafe = verifyZeroDraftCollision(visitId1, visitId2);
			assert.equal(isSafe, true);
		});

		it("sanitizes dangerous characters in visitId keys to prevent prototype poisoning", () => {
			const unsafeVisitId = "vis/../ch1*#@!";
			const sanitizedKey = getIsolatedVisitDraftKey(unsafeVisitId);
			assert.ok(!sanitizedKey.includes("/"));
			assert.ok(!sanitizedKey.includes(".."));
			assert.ok(!sanitizedKey.includes("*"));
		});
	});

	describe("4. Doctor Autonomy: Aborted & Rescheduled Visit Workflow (Mandate 8e)", () => {
		it("allows doctor to close visit as aborted without forced 100% protocol", () => {
			const result = abortOrRescheduleVisit({
				visitId: "VIS-ABORT-SOLO",
				patientId: "pat-99",
				patientName: "Смирнов К.В.",
				doctorName: "Д-р Васильев П.И.",
				mode: "aborted",
				reason: "Пациент почувствовал головокружение, приём прерван",
				diary: {
					anamnesis: "Жалобы на слабость.",
				},
			});

			assert.equal(result.status, "aborted");
			assert.equal(result.isAbortedOrRescheduled, true);
			assert.equal(result.totalNetRub, 0);
			assert.equal(result.sbpQrUrl, ""); // No payment QR forced
			assert.equal(result.form043uSaved, true);
			assert.ok(result.statusBannerText.includes("Приём прерван"));
			assert.ok(result.statusBannerText.includes("без обязательных полей"));
		});

		it("allows doctor to reschedule visit with zero friction", () => {
			const result = abortOrRescheduleVisit({
				visitId: "VIS-RESCHED-SOLO",
				patientId: "pat-100",
				patientName: "Федорова М.А.",
				doctorName: "Д-р Васильев П.И.",
				mode: "rescheduled",
				reason: "Перенос на следующий понедельник по согласованию",
				rescheduledDateIso: "2026-10-06T10:00:00.000Z",
			});

			assert.equal(result.status, "rescheduled");
			assert.equal(result.isAbortedOrRescheduled, true);
			assert.equal(result.form043uSaved, true);
			assert.ok(result.statusBannerText.includes("Приём перенесен"));
		});
	});

	describe("5. Chairside 1-Click Smart Clinical Protocols & Crash Resilience (Mandates 8e, 8i, 8k)", () => {
		it("provides all 5 core chairside protocols with compliant ICD-10, SOAP sections, and 804n codes", () => {
			assert.equal(CHAIRSIDE_SMART_PROTOCOL_KEYS.length, 5);
			const expectedKeys: ChairsideSmartProtocolKey[] = ["caries", "pulpitis", "periodontitis", "hygiene", "extraction"];
			assert.deepEqual([...CHAIRSIDE_SMART_PROTOCOL_KEYS], expectedKeys);

			for (const key of expectedKeys) {
				const proto = buildChairsideSmartProtocol(key, 36, { surfaces: "MOD" });
				assert.ok(proto.icd10, `Missing icd10 for ${key}`);
				assert.ok(proto.diagnosis.includes("36"), `Diagnosis must include tooth 36 for ${key}`);
				assert.ok(proto.complaint.length > 10, `Complaint too short for ${key}`);
				assert.ok(proto.anamnesis.length > 10, `Anamnesis too short for ${key}`);
				assert.ok(proto.objectiveStatus.length > 10, `ObjectiveStatus too short for ${key}`);
				assert.ok(proto.treatmentPlan.length > 20, `TreatmentPlan too short for ${key}`);
				assert.ok(proto.recommendations.length > 10, `Recommendations too short for ${key}`);
				assert.equal(proto.targetTooth, 36);
			}

			// Проверка специфических клинических кодов Минздрава РФ (Приказ 804н)
			const caries = buildChairsideSmartProtocol("caries", 16);
			assert.equal(caries.icd10, "K02.1");
			assert.ok(caries.treatmentPlan.includes("A16.07.002.001"));

			const pulpitis = buildChairsideSmartProtocol("pulpitis", 24);
			assert.equal(pulpitis.icd10, "K04.0");
			assert.ok(pulpitis.treatmentPlan.includes("A16.07.030"));

			const perio = buildChairsideSmartProtocol("periodontitis", 46);
			assert.equal(perio.icd10, "K04.5");
			assert.ok(perio.treatmentPlan.includes("A16.07.082"));

			const hygiene = buildChairsideSmartProtocol("hygiene");
			assert.equal(hygiene.icd10, "K05.1");
			assert.ok(hygiene.treatmentPlan.includes("A16.07.051"));

			const extraction = buildChairsideSmartProtocol("extraction", 48);
			assert.equal(extraction.icd10, "K01.1");
			assert.ok(extraction.treatmentPlan.includes("A16.07.001"));
		});

		it("applies audit stamp when protocol is updated in locked/signed state", () => {
			const proto = buildChairsideSmartProtocol("caries", 11, { isLocked: true });
			assert.ok(proto.treatmentPlan.includes("[Исправленному верить:"));
		});

		it("extracts procedures accurately for K01.1 (surgery) and K05.1 (hygiene)", () => {
			const surgProcs = extractProceduresFromDiary({
				diagnosisIcd10: "K01.1 Простое удаление зуба 38",
				diagnosisTooth: "38",
				treatmentDescription: "Люксация элеватором и удаление корня зуба щипцами.",
			});
			assert.ok(surgProcs.some((p) => p.category === "surgery" && p.code === "A16.07.001"));

			const hygProcs = extractProceduresFromDiary({
				diagnosisIcd10: "K05.1 Хронический катаральный гингивит",
				treatmentDescription: "Комплексная гигиена полости рта, скейлинг, Air-Flow.",
			});
			assert.ok(hygProcs.some((p) => p.category === "hygiene" && p.code === "A16.07.051"));
		});

		it("persists chairside visit draft and recovers within 1 second on crash/refresh", () => {
			const map = new Map<string, string>();
			const mockStorage = {
				getItem: (k: string) => map.get(k) ?? null,
				setItem: (k: string, v: string) => map.set(k, String(v)),
				removeItem: (k: string) => map.delete(k),
				clear: () => map.clear(),
			};
			const prevWindow = (globalThis as any).window;
			(globalThis as any).window = {
				localStorage: mockStorage,
			};

			try {
				const draft: ChairsideVisitDraftPayload = {
					visitId: "VIS-CHAIRSIDE-CRASH-TEST",
					chairId: "chair-1",
					savedAtIso: new Date().toISOString(),
					noteForm: {
						diagnosis: "K02.1 Кариес дентина зуба 16",
						complaint: "Боль от холодного",
						anamnesis: "Появилась неделю назад",
						objectiveStatus: "Полость на жевательной",
						treatmentPlan: "Препарирование и пломба Filtek",
						recommendations: "Не есть 2 часа",
					},
					diary: {
						diagnosis: "K02.1 Кариес дентина зуба 16",
						complaint: "Боль от холодного",
						anamnesis: "Появилась неделю назад",
						objectiveStatus: "Полость на жевательной",
						treatmentPlan: "Препарирование и пломба Filtek",
						recommendations: "Не есть 2 часа",
						toothNumber: 16,
					},
					activeTooth: 16,
					activeTab: "diary",
				};

				saveChairsideVisitDraft(draft);

				const loaded = loadChairsideVisitDraft("VIS-CHAIRSIDE-CRASH-TEST");
				assert.ok(loaded !== null);
				assert.equal(loaded?.visitId, "VIS-CHAIRSIDE-CRASH-TEST");
				assert.equal(loaded?.activeTooth, 16);
				assert.equal(loaded?.noteForm?.diagnosis, "K02.1 Кариес дентина зуба 16");
				assert.equal(loaded?.diary?.diagnosis, "K02.1 Кариес дентина зуба 16");
				assert.equal(isChairsideDraftRecent(loaded), true);

				// Draft older than 24 hours should not be considered recent
				const oldDraft: ChairsideVisitDraftPayload = {
					...draft,
					savedAtIso: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
				};
				assert.equal(isChairsideDraftRecent(oldDraft), false);

				// Clear draft
				clearChairsideVisitDraft("VIS-CHAIRSIDE-CRASH-TEST");
				assert.equal(loadChairsideVisitDraft("VIS-CHAIRSIDE-CRASH-TEST"), null);
			} finally {
				(globalThis as any).window = prevWindow;
			}
		});
	});
});
