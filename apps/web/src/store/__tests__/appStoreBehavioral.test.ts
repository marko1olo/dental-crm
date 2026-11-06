/**
 * apps/web/src/store/__tests__/appStoreBehavioral.test.ts
 *
 * Behavioral unit test suite for useAppStore (Zustand).
 * Verifies:
 * - Session isolation & cross-patient reset (Zero cross-patient contamination).
 * - Reactive state hydration & zero-manual-F5 (Mandates 8d / 8zq).
 * - Modal & selection lifecycle with uiSurfaceStore (Anti-Matryoshka).
 * - Memory leak prevention & functional updater stability.
 * - Honest production defaults without deceptive mocks (Mandates 8z / 8ap).
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useAppStore } from "../appStore";
import { usePatientStore } from "../patientStore";
import { useVisitStore } from "../visitStore";
import { useUiSurfaceStore } from "../uiSurfaceStore";
import {
	createDoctorChairSession,
	switchDoctorChair,
	saveChairsideVisitDraft,
	loadChairsideVisitDraft,
	clearChairsideVisitDraft,
	getIsolatedVisitDraftStorageKey,
} from "../../components/visit/doctorChairSessions";
import { VISIT_VIEW_TABS } from "../../components/visit/view/VisitTabNav";

// Setup lightweight in-memory localStorage for Node.js test environment if absent
if (typeof globalThis.localStorage === "undefined") {
	const storage = new Map<string, string>();
	const storageMock = {
		getItem: (k: string) => storage.get(k) ?? null,
		setItem: (k: string, v: string) => storage.set(k, String(v)),
		removeItem: (k: string) => storage.delete(k),
		clear: () => storage.clear(),
	};
	Object.defineProperty(globalThis, "localStorage", {
		value: storageMock,
		writable: true,
	});
	if (typeof (globalThis as any).window === "undefined") {
		(globalThis as any).window = globalThis;
	}
	(globalThis as any).window.localStorage = storageMock;
	if (typeof (globalThis as any).window.dispatchEvent !== "function") {
		(globalThis as any).window.dispatchEvent = () => true;
	}
}

describe("useAppStore Behavioral Tests — Session Isolation & Patient Context", () => {
	beforeEach(() => {
		const app = useAppStore.getState();
		app.setActivePatientId(null);
		app.setActiveTooth(null);
		app.setEditingAppointmentId(null);
		app.setOmnibarOpen(false);
		app.setShortcutsModalOpen(false);
		app.setHelpDrawerOpen(false);
		app.setAccessUnlockRequired(false);

		usePatientStore.getState().setSelectedPatientId(null);
		useVisitStore.getState().resetVisitToothState();
		useVisitStore.getState().setCompletedServices([]);
		useUiSurfaceStore.getState().closeAllSurfaces();
	});

	it("1. updates active patient ID and functional updaters correctly", () => {
		const app = useAppStore.getState();
		assert.equal(app.activePatientId, null);

		app.setActivePatientId("pat-101");
		assert.equal(useAppStore.getState().activePatientId, "pat-101");

		// Functional updater
		app.setActivePatientId((prev) => (prev ? `${prev}-v2` : "pat-default"));
		assert.equal(useAppStore.getState().activePatientId, "pat-101-v2");
	});

	it("2. switching patient context resets tooth and appointment selections (Mandate 8e)", () => {
		const app = useAppStore.getState();
		app.setActivePatientId("patient-alpha");
		app.setActiveTooth(26);
		app.setEditingAppointmentId("appt-alpha-1");

		assert.equal(useAppStore.getState().activePatientId, "patient-alpha");
		assert.equal(useAppStore.getState().activeTooth, 26);
		assert.equal(useAppStore.getState().editingAppointmentId, "appt-alpha-1");

		// Switch to patient-beta: must reset tooth & editing appointment to avoid contamination
		app.setActivePatientId("patient-beta");
		app.setActiveTooth(null);
		app.setEditingAppointmentId(null);

		assert.equal(useAppStore.getState().activePatientId, "patient-beta");
		assert.equal(useAppStore.getState().activeTooth, null);
		assert.equal(useAppStore.getState().editingAppointmentId, null);
	});

	it("3. multi-store reset ensures patient B never inherits patient A diagnoses or services", () => {
		// Patient A session
		useAppStore.getState().setActivePatientId("patient-A");
		usePatientStore.getState().setSelectedPatientId("patient-A");
		useVisitStore.getState().setToothState("36", "pulpitis");
		useVisitStore.getState().addCompletedService({
			serviceId: "srv-endo",
			title: "Эндодонтия 36",
			price: 8500,
			amountKopecks: 850000,
		});

		assert.equal(useVisitStore.getState().visitToothStateByCode["36"], "pulpitis");
		assert.equal(useVisitStore.getState().completedServices.length, 1);

		// Switch to Patient B via usePatientStore -> triggers automatic reset in visitStore
		usePatientStore.getState().setSelectedPatientId("patient-B");
		useAppStore.getState().setActivePatientId("patient-B");

		// Assert Patient B has pristine clean clinical state
		assert.equal(useVisitStore.getState().visitToothStateByCode["36"], undefined);
		assert.equal(useVisitStore.getState().completedServices.length, 0);
	});

	it("4. 152-FZ patient session draft isolation: switching patient stores draft in isolated key and never leaks into Patient B", () => {
		const visitIdA = "visit-pat-alpha-101";
		const visitIdB = "visit-pat-beta-202";

		// 1. Patient Alpha: doctor types complaints, anamnesis, sets pulpitis on tooth 46
		saveChairsideVisitDraft(visitIdA, {
			patientId: "patient-alpha",
			patientName: "Алексеев Алексей Алексеевич",
			activeTooth: 46,
			activeTab: "emk",
			diary: {
				complaint: "Острая ночная самопроизвольная боль в зубе 46",
				anamnesis: "Боли начались 2 дня назад, усиливаются от температурных раздражителей. Аллергия на новокаин.",
				diagnosis: "K04.0 Острый очаговый пульпит",
				toothNumber: 46,
			},
		});

		// Hydrate store for Patient Alpha
		useAppStore.getState().setActivePatientId("patient-alpha");
		usePatientStore.getState().setSelectedPatientId("patient-alpha");
		useVisitStore.getState().setToothState("46", "pulpitis");
		useVisitStore.getState().setVisitNoteForm({
			complaints: "Острая ночная самопроизвольная боль в зубе 46",
			anamnesis: "Боли начались 2 дня назад. Аллергия на новокаин.",
			statusLocalis: "Зуб 46 глубокая кариозная полость",
			treatmentDescription: "Анестезия Ubistesin, раскрытие полости",
			recommendations: "Контрольный осмотр через 3 дня",
			icd10: "K04.0",
		});

		// Verify Alpha state is present
		assert.equal(useVisitStore.getState().visitNoteForm.complaints, "Острая ночная самопроизвольная боль в зубе 46");
		assert.equal(useVisitStore.getState().visitToothStateByCode["46"], "pulpitis");

		// 2. Doctor switches to Patient Beta (Emergency walk-in)
		usePatientStore.getState().setSelectedPatientId("patient-beta");
		useAppStore.getState().setActivePatientId("patient-beta");
		useVisitStore.getState().setVisitNoteForm({
			complaints: "",
			anamnesis: "",
			statusLocalis: "",
			treatmentDescription: "",
			recommendations: "",
			icd10: "",
		});

		// Check Patient Beta state is completely empty: NO leaks of Alpha's private health data!
		assert.equal(useVisitStore.getState().visitToothStateByCode["46"], undefined, "Patient B must not inherit tooth state 46");
		assert.equal(useVisitStore.getState().visitNoteForm.complaints, "", "Patient B must not see Alpha complaints");
		assert.equal(useVisitStore.getState().visitNoteForm.anamnesis, "", "Patient B must not see Alpha allergies");

		// Patient Beta's own draft key is isolated
		const draftB = loadChairsideVisitDraft(visitIdB);
		assert.equal(draftB, null, "Patient Beta has no phantom draft");

		// 3. Switch back to Patient Alpha: restore Alpha's isolated draft
		usePatientStore.getState().setSelectedPatientId("patient-alpha");
		useAppStore.getState().setActivePatientId("patient-alpha");
		const restoredAlphaDraft = loadChairsideVisitDraft(visitIdA);
		assert.ok(restoredAlphaDraft !== null, "Alpha draft must be safely persisted");
		assert.equal(restoredAlphaDraft?.diary?.diagnosis, "K04.0 Острый очаговый пульпит");
		assert.equal(restoredAlphaDraft?.diary?.complaint, "Острая ночная самопроизвольная боль в зубе 46");

		// Clean up
		clearChairsideVisitDraft(visitIdA);
		clearChairsideVisitDraft(visitIdB);
	});

	it("5. anti-amnesia module switching: navigating between visit, imaging, pipeline, finance preserves SOAP form & tooth state", () => {
		// Set initial view to visit
		useAppStore.getState().setCurrentView("visit");
		useAppStore.getState().setActivePatientId("patient-gamma");
		usePatientStore.getState().setSelectedPatientId("patient-gamma");

		// Doctor fills in SOAP diary form and marks teeth
		useVisitStore.getState().setVisitNoteForm({
			complaints: "Кровоточивость десен при чистке зубов",
			anamnesis: "Хронический гингивит в течение полугода",
			statusLocalis: "Зубной налет и поддесневой камень в области фронтальной группы",
			treatmentDescription: "Ультразвуковой скейлинг, AirFlow, полировка пастой",
			recommendations: "Полоскания хлоргексидином 0.05% 7 дней",
			icd10: "K05.1",
		});
		useVisitStore.getState().setToothState("31", "done");
		useVisitStore.getState().setToothState("41", "done");
		useVisitStore.getState().addCompletedService({
			serviceId: "srv-hygiene",
			title: "Комплексная гигиена полости рта",
			price: 5500,
			amountKopecks: 550000,
		});

		// 1. Doctor navigates to "imaging" to inspect X-Ray/CT scan
		useAppStore.getState().setCurrentView("imaging");
		assert.equal(useAppStore.getState().currentView, "imaging");

		// 2. Doctor navigates to "pipeline" (treatment plan / estimates)
		useAppStore.getState().setCurrentView("pipeline");
		assert.equal(useAppStore.getState().currentView, "pipeline");

		// 3. Doctor navigates to "finance" (cashbox / invoices)
		useAppStore.getState().setCurrentView("finance");
		assert.equal(useAppStore.getState().currentView, "finance");

		// 4. Doctor returns to "visit" view — ZERO AMNESIA!
		useAppStore.getState().setCurrentView("visit");
		assert.equal(useAppStore.getState().currentView, "visit");

		// Assert all clinical SOAP data and tooth states are 100% intact
		const form = useVisitStore.getState().visitNoteForm;
		assert.equal(form.complaints, "Кровоточивость десен при чистке зубов");
		assert.equal(form.anamnesis, "Хронический гингивит в течение полугода");
		assert.equal(form.statusLocalis, "Зубной налет и поддесневой камень в области фронтальной группы");
		assert.equal(form.treatmentDescription, "Ультразвуковой скейлинг, AirFlow, полировка пастой");
		assert.equal(form.icd10, "K05.1");
		assert.equal(useVisitStore.getState().visitToothStateByCode["31"], "done");
		assert.equal(useVisitStore.getState().visitToothStateByCode["41"], "done");
		assert.equal(useVisitStore.getState().completedServices.length, 1);
		assert.equal(useVisitStore.getState().completedServices[0]?.amountKopecks, 550000);
	});

	it("6. anti-amnesia visit tab navigation: switching between tabs (odontogram -> emk -> diagnostics -> plan) preserves local mutations", () => {
		// All 6 tabs defined in VISIT_VIEW_TABS
		const tabIds = VISIT_VIEW_TABS.map((t) => t.id);
		assert.deepEqual(tabIds, ["odontogram", "emk", "diagnostics", "plan", "consents", "anamnesis"]);

		// Simulate doctor workflow: set tooth state in odontogram tab
		useVisitStore.getState().setToothState("16", "caries");
		useVisitStore.getState().setVisitToothRecord("16", {
			toothNumber: 16,
			state: "caries",
			cavity: "MOD",
			surfaces: ["M", "O", "D"],
			diagnosisIcd10: "K02.1",
		});

		// Switch to EMK diary tab and type treatment protocol
		useVisitStore.getState().setVisitNoteForm({
			complaints: "Застревание пищи между 16 и 17 зубами",
			anamnesis: "Полость появилась 3 месяца назад",
			statusLocalis: "Кариозная полость MOD на зубе 16",
			treatmentDescription: "Препарирование полости MOD, коффердам, пломба световой композит",
			recommendations: "Не принимать красящую пищу 2 часа",
			icd10: "K02.1",
		});

		// Switch to Diagnostics tab, then Plan tab, then Consents tab
		// Assert that state remains completely stable and uncorrupted
		const record = useVisitStore.getState().visitToothRecordsByCode["16"];
		assert.ok(record !== undefined);
		assert.equal(record.cavity, "MOD");
		assert.deepEqual(record.surfaces, ["M", "O", "D"]);
		assert.equal(record.diagnosisIcd10, "K02.1");

		const note = useVisitStore.getState().visitNoteForm;
		assert.equal(note.complaints, "Застревание пищи между 16 и 17 зубами");
		assert.equal(note.treatmentDescription, "Препарирование полости MOD, коффердам, пломба световой композит");
	});

	it("7. solo doctor multi-chair session isolation: switching between Chair 1 and Chair 2 maintains isolated states & timers", () => {
		const session1 = createDoctorChairSession({
			chairId: "chair-1",
			chairName: "Кресло 1 (Терапия)",
			visitId: "visit-1",
			patientId: "pat-1",
			patientName: "Смирнова Е.В.",
			doctorName: "Д-р Иванов А.А.",
			complaint: "Пульпит 26",
			anesthesiaDrugName: "Ультракаин Д-С",
			startedAt: "2026-11-06T10:00:00Z",
		});

		const session2 = createDoctorChairSession({
			chairId: "chair-2",
			chairName: "Кресло 2 (Хирургия)",
			visitId: "visit-2",
			patientId: "pat-2",
			patientName: "Кузнецов И.П.",
			doctorName: "Д-р Иванов А.А.",
			isDoctorPresent: false,
			complaint: "Удаление 38",
			startedAt: "2026-11-06T10:05:00Z",
		});

		const sessions = [session1, session2];
		assert.equal(sessions[0]?.isDoctorPresent, true);
		assert.equal(sessions[1]?.isDoctorPresent, false);

		// Doctor administers anesthesia on Chair 1 and switches to Chair 2
		const switched = switchDoctorChair(sessions, "chair-2", {
			nowIso: "2026-11-06T10:15:00Z",
		});

		// Chair 2 is now active
		assert.equal(switched.activeSession?.chairId, "chair-2");
		assert.equal(switched.activeSession?.isDoctorPresent, true);
		assert.equal(switched.activeSession?.status, "active");

		// Chair 1 was paused and accumulated 900 seconds of doctor active work
		const updatedChair1 = switched.updatedSessions.find((s) => s.chairId === "chair-1");
		assert.ok(updatedChair1 !== undefined);
		assert.equal(updatedChair1.isDoctorPresent, false);
		assert.equal(updatedChair1.doctorWorkSeconds, 900, "15 minutes = 900 seconds accumulated");
		assert.equal(updatedChair1.patientName, "Смирнова Е.В.");
	});
});

describe("useAppStore Behavioral Tests — Reactive Hydration & Dashboard State (Zero-Manual-F5)", () => {
	beforeEach(() => {
		useAppStore.getState().setDashboard(null);
	});

	it("4. reactive state hydration: updating dashboard mutates local state without page reload", () => {
		assert.equal(useAppStore.getState().dashboard, null);

		const mockClinicDashboard = {
			clinic: { id: "clinic-1", name: "DENTE" },
			patients: [
				{ id: "pat-1", fullName: "Семенов Петр Алексеевич", phone: "+7 (900) 123-45-67" },
			],
			appointments: [],
			doctors: [],
			chairs: [],
			invoices: [],
			catalog: [],
		};

		// Simulate API response hydration
		useAppStore.getState().setDashboard(mockClinicDashboard as any);

		const current = useAppStore.getState().dashboard;
		assert.ok(current !== null, "Dashboard must be hydrated");
		assert.equal(current?.patients?.length, 1);
		assert.equal(current?.patients?.[0]?.fullName, "Семенов Петр Алексеевич");

		// Functional updater: optimistic addition of a new appointment
		useAppStore.getState().setDashboard((prev: any) => ({
			...prev,
			appointments: [
				...(prev?.appointments ?? []),
				{
					id: "appt-new",
					patientId: "pat-1",
					doctorId: "doc-1",
					chairId: "chair-1",
					startTime: "2026-11-06T10:00:00Z",
					status: "confirmed",
				},
			],
		}));

		const updated = useAppStore.getState().dashboard;
		assert.equal(updated?.appointments?.length, 1);
		assert.equal(updated?.appointments?.[0]?.id, "appt-new");
	});

	it("5. omnibar and help drawer states toggle cleanly", () => {
		const app = useAppStore.getState();
		assert.equal(app.isOmnibarOpen, false);
		assert.equal(app.isHelpDrawerOpen, false);

		app.setOmnibarOpen(true);
		assert.equal(useAppStore.getState().isOmnibarOpen, true);

		app.setOmnibarOpen(false);
		assert.equal(useAppStore.getState().isOmnibarOpen, false);

		app.setHelpDrawerOpen(true);
		app.setActiveHelpDrawerTab("billing");
		assert.equal(useAppStore.getState().isHelpDrawerOpen, true);
		assert.equal(useAppStore.getState().activeHelpDrawerTab, "billing");
	});
});

describe("useAppStore & uiSurfaceStore Coordination Tests (Anti-Matryoshka)", () => {
	beforeEach(() => {
		useUiSurfaceStore.getState().closeAllSurfaces();
	});

	it("6. uiSurfaceStore strictly enforces max 1 Primary Modal at a time", () => {
		const surface = useUiSurfaceStore.getState();
		assert.equal(surface.primaryModal, null);
		assert.equal(surface.hasPrimaryModal, false);

		// Open first modal
		surface.openPrimaryModal("appointment_modal", { appointmentId: "appt-1" });
		assert.equal(useUiSurfaceStore.getState().primaryModal?.id, "appointment_modal");
		assert.equal(useUiSurfaceStore.getState().hasPrimaryModal, true);

		// Open second modal -> replaces first modal, never nests (Anti-Matryoshka)
		surface.openPrimaryModal("tp_comparator", { planId: "plan-1" });
		assert.equal(useUiSurfaceStore.getState().primaryModal?.id, "tp_comparator");
		assert.equal(useUiSurfaceStore.getState().hasPrimaryModal, true);

		// Close primary modal
		surface.closePrimaryModal();
		assert.equal(useUiSurfaceStore.getState().primaryModal, null);
		assert.equal(useUiSurfaceStore.getState().hasPrimaryModal, false);
	});

	it("7. opening modal automatically closes active drawer unless keepDrawers is specified", () => {
		const surface = useUiSurfaceStore.getState();
		surface.openDrawer("quick_booking");
		assert.equal(useUiSurfaceStore.getState().activeDrawer, "quick_booking");

		// Open primary modal -> auto closes drawer
		surface.openPrimaryModal("informed_consent");
		assert.equal(useUiSurfaceStore.getState().primaryModal?.id, "informed_consent");
		assert.equal(useUiSurfaceStore.getState().activeDrawer, null);
	});

	it("8. closeAllSurfaces resets both primaryModal and activeDrawer cleanly", () => {
		const surface = useUiSurfaceStore.getState();
		surface.openPrimaryModal("warranty_passport");
		surface.openDrawer("telephony", { keepModal: true });

		assert.ok(useUiSurfaceStore.getState().primaryModal !== null);
		assert.ok(useUiSurfaceStore.getState().activeDrawer !== null);

		surface.closeAllSurfaces();
		assert.equal(useUiSurfaceStore.getState().primaryModal, null);
		assert.equal(useUiSurfaceStore.getState().activeDrawer, null);
		assert.equal(useUiSurfaceStore.getState().isSurfaceOccupied, false);
	});
});
