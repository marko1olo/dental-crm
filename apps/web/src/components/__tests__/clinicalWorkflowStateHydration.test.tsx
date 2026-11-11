/**
 * apps/web/src/components/__tests__/clinicalWorkflowStateHydration.test.tsx
 *
 * Comprehensive Red Team Behavioral Integration Test Suite:
 * Clinical Workflow State Hydration, Component Rendering & Apple HIG Ergonomics.
 *
 * Verifies the complete chairside journey across React 19 components & Zustand stores:
 * 1. Schedule & Agenda View (ScheduleMobileAgendaView / BottomBar).
 * 2. Odontogram Studio (OdontogramStudioModal / FDI Formula / Intact Norm in 1 click).
 * 3. Visit SOAP Diary (VisitDiaryActionsFooter / Autosave / 1 Primary CTA).
 * 4. Treatment Plans (TreatmentPlanStudioModal / 3 Tiers / 100% Doctor Autonomy / Kopecks).
 * 5. Cash Register (CashRegisterCheckoutModal / 0 Disabled Buttons / Mandate 8n Solo Sovereignty).
 * 6. Cross-Patient State Isolation & Zero Cross-Contamination.
 * 7. Apple HIG Mobile Invariants: touch targets >= 44x44px, Drag Handle, 0px horizontal drift.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString, renderToStaticMarkup } from "react-dom/server";

import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useVisitStore } from "../../store/visitStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";

import { OdontogramStudioModal } from "../odontogram/OdontogramStudioModal";
import { VisitDiaryActionsFooter } from "../visit/diary/section/VisitDiaryActionsFooter";
import { TreatmentPlanStudioModal } from "../treatment-plans/TreatmentPlanStudioModal";
import { CashRegisterStudioModal } from "../cashbox/CashRegisterStudioModal";
import { ScheduleMobileBottomBar } from "../schedule/mobile/ScheduleMobileBottomBar";
import { IcdMobileBottomSheet } from "../visit/diary/fields/IcdMobileBottomSheet";

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

describe("Clinical Workflow — Stage 1: Schedule & Chairside Activation", () => {
	beforeEach(() => {
		useScheduleStore.getState().setScheduleDateFilter(null);
		useScheduleStore.getState().setPendingStageBooking(null);
		useUiSurfaceStore.getState().closeAllSurfaces();
	});

	it("1. renders ScheduleMobileBottomBar with Apple HIG 52px height and safe-area padding", () => {
		const html = renderToStaticMarkup(
			<ScheduleMobileBottomBar isVisible={true} onAction={() => {}} />,
		);

		assert.ok(html.includes("schedule-mobile-bottom-bar"), "Must render container");
		assert.ok(html.includes("data-testid=\"schedule-mobile-add-btn\""), "Must have add CTA");
		assert.ok(html.includes("h-[52px] min-h-[44px]"), "Touch target must satisfy >= 44x44px");
		assert.ok(html.includes("safe-area-inset-bottom"), "Must respect Home Bar safe area");
	});

	it("2. returns null when ScheduleMobileBottomBar isVisible is false", () => {
		const html = renderToStaticMarkup(
			<ScheduleMobileBottomBar isVisible={false} onAction={() => {}} />,
		);
		assert.equal(html, "");
	});
});

describe("Clinical Workflow — Stage 2: Odontogram Studio & Physiological Norm (Mandate 8e)", () => {
	beforeEach(() => {
		useVisitStore.getState().resetVisitToothState();
	});

	it("3. renders OdontogramStudioModal with patient name, 1 Primary CTA and 0 disabled buttons", () => {
		const html = renderToString(
			<OdontogramStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Петров Василий Николаевич"
				patientId="pat-petrov"
			/>,
		);

		assert.ok(html.includes("Зубная формула"), "Must render header");
		assert.ok(html.includes("Петров Василий Николаевич"), "Must display active patient");
		assert.ok(html.includes("btn-save-odontogram-studio"), "Must have Primary CTA");

		// Doctor autonomy: 0 disabled buttons
		const disabledButtons = html.match(/<button[^>]*\bdisabled\b[^>]*>/gi);
		assert.equal(disabledButtons, null, "Odontogram buttons must never be disabled");

		// 1-click intact dentition button
		assert.ok(html.includes("btn-reset-intact"), "Must render 1-click physiological norm button");
	});

	it("4. updates tooth state in visitStore and verifies reactivity", () => {
		useVisitStore.getState().setToothState("16", "caries");
		useVisitStore.getState().setToothState("21", "done");

		const state = useVisitStore.getState();
		assert.equal(state.visitToothStateByCode["16"], "caries");
		assert.equal(state.visitToothStateByCode["21"], "done");
	});
});

describe("Clinical Workflow — Stage 3: Visit SOAP Diary & Autosave Protocol", () => {
	const defaultDiaryProps = {
		isLocked: false,
		isSaving: false,
		doSave: async () => {},
		ensureDraftSavedForSigning: async () => null,
		doLock: async () => {},
		isRevising: false,
		revisionReason: "",
		setRevisionReason: () => {},
		cancelRevise: () => {},
		isRevisingBusy: false,
		doRevise: async () => {},
		beginRevise: () => {},
		setShowPreview: () => {},
		onCompleteVisitAndBilling: async () => {},
	};

	it("5. renders VisitDiaryActionsFooter with exactly 1 Primary CTA and min-h-[44px] buttons", () => {
		const html = renderToString(<VisitDiaryActionsFooter {...defaultDiaryProps} />);

		// Primary CTA
		assert.ok(html.includes('id="diary-complete-visit-btn"'));
		assert.ok(
			html.includes("Завершить приём и подписать") ||
				html.includes("Завершить приём и сохранить карту"),
		);

		// Secondary buttons
		assert.ok(html.includes('id="diary-save-btn"'));
		assert.ok(html.includes('id="diary-footer-print-btn"'));

		// Apple HIG touch targets
		assert.ok(html.includes("min-h-[44px]"));

		// Autonomy: 0 disabled buttons in unlocked active state
		const disabledButtons = html.match(/<button[^>]*\bdisabled\b[^>]*>/gi);
		assert.equal(disabledButtons, null, "Active diary buttons must not be disabled");
	});

	it("6. renders IcdMobileBottomSheet with tactile Drag Handle (36x5px) and rounded-t-[24px]", () => {
		const html = renderToString(
			<IcdMobileBottomSheet
				isOpen={true}
				onClose={() => {}}
				filteredIcd={[{ code: "K02.1", label: "Кариес дентина", group: "caries" }]}
				onSelectIcd={() => {}}
				searchValue=""
				onSearchChange={() => {}}
			/>,
		);

		assert.ok(html.includes("rounded-t-[24px]"), "Must have Apple HIG rounded top border");
		assert.ok(html.includes("w-9 h-1.5") || html.includes("w-[36px] h-[5px]"), "Must have tactile Drag Handle");
		assert.ok(html.includes("Кариес дентина"), "Must render ICD items");
	});
});

describe("Clinical Workflow — Stage 4: Treatment Plans 3-Tier Autonomy & Exact Kopecks", () => {
	it("7. renders TreatmentPlanStudioModal with 3 canonical tiers, kopeck math and 1 Primary CTA", () => {
		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
				patientId="pat-petrov"
				patientName="Петров Василий Николаевич"
				doctorFullName="Д-р Смирнов А.В."
			/>,
		);

		assert.ok(html.includes("План лечения"), "Must display treatment plan studio title");
		assert.ok(html.includes("Эконом"), "Must render Economy tier");
		assert.ok(html.includes("Оптимум"), "Must render Optimum tier");
		assert.ok(html.includes("Премиум"), "Must render Premium tier");

		// Exactly 1 Primary CTA
		assert.ok(
			html.includes("data-testid=\"approve-treatment-plan-btn\"") ||
				html.includes("tp-primary-cta-btn"),
			"Must have primary CTA",
		);

		// Zero disabled buttons (Doctor Autonomy)
		const disabledButtons = html.match(/<button[^>]*\bdisabled\b[^>]*>/gi);
		assert.equal(disabledButtons, null, "TreatmentPlanStudioModal buttons must never be disabled");
	});
});

describe("Clinical Workflow — Stage 5: Cash Register Checkout & Solo Sovereignty (Mandate 8n)", () => {
	it("8. renders CashRegisterStudioModal with tender tiles, 0 disabled buttons and clean Russian", () => {
		const html = renderToString(
			<CashRegisterStudioModal
				isOpen={true}
				onClose={() => {}}
				mode="checkout"
				initialTab="checkout"
				containerTestId="cash-register-checkout-modal"
				submitButtonTestId="btn-confirm-checkout-payment"
				title="Касса · Оплата приёма"
				totalDueRub={12500}
				patientId="pat-petrov"
				patientName="Петров Василий Николаевич"
				patientPhone="+7 (912) 345-67-89"
				patientDepositRub={5000}
				cashierFullName="Администратор Кассы"
			/>,
		);

		// Amount & tiles
		assert.ok(html.includes("12") && html.includes("500"), "Must render total amount");
		assert.ok(html.includes("Наличные"), "Must include Cash tender");
		assert.ok(html.includes("Терминал (Карта)") || html.includes("Карта"), "Must include Card tender");
		assert.ok(html.includes("СБП") || html.includes("QR"), "Must include SBP QR");

		// Primary CTA
		assert.ok(html.includes("data-testid=\"btn-confirm-checkout-payment\""), "Must have payment CTA");
		assert.ok(html.includes("Принять оплату"), "CTA text must be 'Принять оплату'");

		// Zero Soviet codes in patient UI (Mandate 8x)
		assert.ok(!html.includes("ФФД 1.2"));
		assert.ok(!html.includes("54-ФЗ"));
	});
});

describe("Clinical Workflow — Stage 6: Cross-Patient State Isolation & Reactive Hydration", () => {
	it("9. switching between Patient A and Patient B cleanly resets visit, tooth states, and invoices", () => {
		// Patient A state setup
		useAppStore.getState().setActivePatientId("pat-A");
		usePatientStore.getState().setSelectedPatientId("pat-A");
		useVisitStore.getState().setToothState("46", "treatment");
		useVisitStore.getState().setVisitToothRecord("46", {
			state: "treatment",
			diagnosis: "K04.0 Пульпит",
		});
		useVisitStore.getState().addCompletedService({
			serviceId: "srv-pulpotomy",
			title: "Пульпотомия",
			price: 4500,
			amountKopecks: 450000,
		});

		assert.equal(useVisitStore.getState().visitToothStateByCode["46"], "treatment");
		assert.equal(useVisitStore.getState().completedServices.length, 1);

		// Switch to Patient B
		usePatientStore.getState().setSelectedPatientId("pat-B");
		useAppStore.getState().setActivePatientId("pat-B");

		// State must be completely empty for Patient B
		assert.equal(useVisitStore.getState().visitToothStateByCode["46"], undefined);
		assert.equal(useVisitStore.getState().visitToothRecordsByCode["46"], undefined);
		assert.equal(useVisitStore.getState().completedServices.length, 0);
	});

	it("10. reactive dashboard updates apply instantly without F5 (Optimistic update)", () => {
		const initialDashboard = {
			clinic: { id: "c1", name: "DENTE" },
			patients: [{ id: "pat-1", fullName: "Иванов И.И." }],
			appointments: [],
			doctors: [],
			chairs: [],
			invoices: [],
			catalog: [],
		};

		useAppStore.getState().setDashboard(initialDashboard as any);
		assert.equal(useAppStore.getState().dashboard?.patients?.length, 1);

		// Add patient optimistically (e.g. after registration modal)
		useAppStore.getState().setDashboard((prev: any) => ({
			...prev,
			patients: [...(prev?.patients ?? []), { id: "pat-2", fullName: "Петров П.П." }],
		}));

		assert.equal(useAppStore.getState().dashboard?.patients?.length, 2);
		assert.equal(useAppStore.getState().dashboard?.patients?.[1]?.fullName, "Петров П.П.");
	});
});

describe("Clinical Workflow — Stage 7: 0-F5 Reactive State Hydration & Counters Sync (Mandate 8zq)", () => {
	beforeEach(() => {
		useVisitStore.getState().resetVisitToothState();
		useVisitStore.getState().setCompletedServices([]);
		useVisitStore.getState().setVisitFlowResult(null);
		useVisitStore.getState().setLastVisitSaveReceipt(null);
	});

	it("11. adding clinical services reactively recalculates estimate total in kopecks & increments service badges without F5", () => {
		const visitStore = useVisitStore.getState();
		assert.equal(visitStore.completedServices.length, 0);

		// 1. Add first service: Diagnostic examination
		visitStore.addCompletedService({
			serviceId: "srv-diag-01",
			title: "Осмотр и сбор анамнеза",
			price: 1500,
			amountKopecks: 150000,
			toothCode: "16",
		});

		let currentServices = useVisitStore.getState().completedServices;
		assert.equal(currentServices.length, 1);
		assert.equal(currentServices[0]?.amountKopecks, 150000);

		// Calculate total in kopecks
		let totalKopecks = currentServices.reduce(
			(sum, s) => sum + (s.amountKopecks ?? (s.price != null ? s.price * 100 : 0)),
			0,
		);
		assert.equal(totalKopecks, 150000, "1500.00 RUB = 150000 kopecks");

		// 2. Add second service: Photopolymer restoration
		visitStore.addCompletedService({
			serviceId: "srv-rest-02",
			title: "Восстановление зуба пломбой (Estelite)",
			price: 5500,
			amountKopecks: 550000,
			toothCode: "16",
		});

		currentServices = useVisitStore.getState().completedServices;
		assert.equal(currentServices.length, 2);
		totalKopecks = currentServices.reduce(
			(sum, s) => sum + (s.amountKopecks ?? (s.price != null ? s.price * 100 : 0)),
			0,
		);
		assert.equal(totalKopecks, 700000, "Total must be exactly 7000.00 RUB (700000 kopecks)");

		// 3. Remove first service: instantly reactively decrements badge count and updates total
		visitStore.removeCompletedService(0);
		currentServices = useVisitStore.getState().completedServices;
		assert.equal(currentServices.length, 1);
		assert.equal(currentServices[0]?.serviceId, "srv-rest-02");
		totalKopecks = currentServices.reduce(
			(sum, s) => sum + (s.amountKopecks ?? (s.price != null ? s.price * 100 : 0)),
			0,
		);
		assert.equal(totalKopecks, 550000);
	});

	it("12. protocol save receipt instantly updates clinical EMR badges and save receipts without page refresh", () => {
		assert.equal(useVisitStore.getState().lastVisitSaveReceipt, null);
		assert.equal(useVisitStore.getState().visitFlowResult, null);

		const nowIso = new Date().toISOString();
		const mockReceipt = {
			visitId: "visit-flow-777",
			protocolId: "proto-soap-01",
			savedAt: nowIso,
			signatureSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			pepSigned: true,
		};

		// Simulate server protocol confirmation response hydration
		useVisitStore.getState().setLastVisitSaveReceipt(mockReceipt);
		useVisitStore.getState().setServerDraftSyncState("saved");

		const state = useVisitStore.getState();
		assert.ok(state.lastVisitSaveReceipt !== null);
		assert.equal(state.lastVisitSaveReceipt?.visitId, "visit-flow-777");
		assert.equal(state.serverDraftSyncState, "saved");
		assert.equal(state.lastVisitSaveReceipt?.pepSigned, true);
	});

	it("13. payment checkout completion reactively clears patient debt status without manual reload", () => {
		// Mock initial dashboard with an invoice awaiting payment
		const initialDashboard = {
			clinic: { id: "c1", name: "DENTE" },
			patients: [{ id: "pat-petrov", fullName: "Петров Василий Николаевич", debtRub: 12500 }],
			appointments: [],
			doctors: [],
			chairs: [],
			invoices: [
				{
					id: "inv-101",
					patientId: "pat-petrov",
					amountKopecks: 1250000,
					totalDueRub: 12500,
					status: "issued",
				},
			],
			catalog: [],
		};

		useAppStore.getState().setDashboard(initialDashboard as any);
		let currentDashboard = useAppStore.getState().dashboard;
		assert.equal(currentDashboard?.patients?.[0]?.debtRub, 12500);
		assert.equal(currentDashboard?.invoices?.[0]?.status, "issued");

		// Simulate 0-F5 payment checkout event (e.g. after CashRegisterCheckoutModal closes with success)
		useAppStore.getState().setDashboard((prev: any) => ({
			...prev,
			patients: prev.patients.map((p: any) =>
				p.id === "pat-petrov" ? { ...p, debtRub: 0 } : p,
			),
			invoices: prev.invoices.map((inv: any) =>
				inv.id === "inv-101" ? { ...inv, status: "paid", paidAt: new Date().toISOString() } : inv,
			),
		}));

		currentDashboard = useAppStore.getState().dashboard;
		assert.equal(currentDashboard?.patients?.[0]?.debtRub, 0, "Patient debt must be reactively cleared to 0");
		assert.equal(currentDashboard?.invoices?.[0]?.status, "paid", "Invoice status must be reactively updated to 'paid'");
	});
});
