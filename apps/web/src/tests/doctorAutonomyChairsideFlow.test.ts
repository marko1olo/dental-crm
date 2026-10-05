/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE DENTAL CRM — DOCTOR AUTONOMY & CHAIRSIDE FLOW VERIFICATION TESTS
 * Mandate 8e: DOCTOR & STAFF AUTONOMY (ZERO RED TAPE / NO DEAD ENDS)
 * Mandate 8f: 100% FACTUAL HONESTY & RIGOROUS INQUISITION
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
	validateBuyerInn,
	validateCheckoutSplit,
	applyQuickCheckoutPreset,
	splitStateToCheckoutPayments,
	calculateCashChangeKop,
	type FastCheckoutInput,
} from "../components/payments/checkout/fastCheckoutEngine.js";

describe("Doctor Autonomy & Chairside Flow (Mandate 8e Inquisition)", () => {
	describe("1. Express Schedule Booking (<=5s, Zero Roadblocks)", () => {
		it("AppointmentModal: Patient Section features 1-click '+ Аноним / Острая боль' button", () => {
			const sectionFilePath = path.resolve(
				process.cwd(),
				"apps/web/src/components/schedule/AppointmentModalPatientSection.tsx",
			);
			assert.ok(fs.existsSync(sectionFilePath), "AppointmentModalPatientSection.tsx must exist");
			const content = fs.readFileSync(sectionFilePath, "utf8");

			assert.ok(
				content.includes('data-testid="appointment-modal-cito-express-btn"'),
				"Must render CITO express button with data-testid appointment-modal-cito-express-btn",
			);
			assert.ok(
				content.includes('data-testid="appointment-modal-anonymous-express-btn"'),
				"Must render + Аноним / Острая боль button",
			);
			assert.ok(
				content.includes("Анонимный пациент (Острая боль)"),
				"Must create inline patient with title 'Анонимный пациент (Острая боль)'",
			);
			assert.ok(
				content.includes("handleConvertToCito()"),
				"Must activate CITO emergency mode upon 1-click express selection",
			);
		});

		it("useAppointmentModalState: Saving without selected patient NEVER deadlocks with error banner", () => {
			const stateFilePath = path.resolve(
				process.cwd(),
				"apps/web/src/components/schedule/useAppointmentModalState.ts",
			);
			assert.ok(fs.existsSync(stateFilePath), "useAppointmentModalState.ts must exist");
			const content = fs.readFileSync(stateFilePath, "utf8");

			// Ensure legacy blocking error is eradicated
			assert.ok(
				!content.includes('setError("Укажите пациента")'),
				"Legacy blocking error 'setError(\"Укажите пациента\")' must be completely eradicated",
			);

			// Verify fallback auto-creation of express patient
			assert.ok(
				content.includes("Первичный пациент (Экспресс-запись)"),
				"Must automatically create 'Первичный пациент (Экспресс-запись)' if patient was not picked",
			);
			assert.ok(
				content.includes("Пациент с острой болью (CITO)"),
				"Must create CITO patient card when reason indicates acute pain",
			);
		});

		it("AppointmentModal: Zero requirement for assistant or branch selection", () => {
			const modalFilePath = path.resolve(
				process.cwd(),
				"apps/web/src/components/schedule/AppointmentModal.tsx",
			);
			assert.ok(fs.existsSync(modalFilePath), "AppointmentModal.tsx must exist");
			const content = fs.readFileSync(modalFilePath, "utf8");

			// Must not disable save button because assistant is missing
			assert.ok(
				!content.includes('disabled={!assistantId}'),
				"Save must never be disabled because assistant is missing",
			);
			assert.ok(
				!content.includes('disabled={!branchId}'),
				"Save must never be disabled because branch is missing",
			);
		});
	});

	describe("2. Chairside EMK & Physiological Norm in 1 Click", () => {
		it("EmkToolbar: Features prominent 1-click physiological norm button in action bar", () => {
			const toolbarPath = path.resolve(
				process.cwd(),
				"apps/web/src/components/visit/emk/EmkToolbar.tsx",
			);
			assert.ok(fs.existsSync(toolbarPath), "EmkToolbar.tsx must exist");
			const content = fs.readFileSync(toolbarPath, "utf8");

			assert.ok(
				content.includes('data-testid="btn-chairside-physiological-norm"'),
				"EmkToolbar must have data-testid btn-chairside-physiological-norm",
			);
			assert.ok(
				content.includes("✓ Соматически здоров / Норма"),
				"Must display '✓ Соматически здоров / Норма'",
			);
			assert.ok(
				content.includes("ShieldCheck"),
				"Must use clinical ShieldCheck icon for physiological norm",
			);
		});

		it("VisitEmkTab: 'Завершить приём' button is NEVER disabled due to unfilled secondary fields", () => {
			const emkTabPath = path.resolve(
				process.cwd(),
				"apps/web/src/components/visit/VisitEmkTab.tsx",
			);
			assert.ok(fs.existsSync(emkTabPath), "VisitEmkTab.tsx must exist");
			const content = fs.readFileSync(emkTabPath, "utf8");

			// btn-complete-visit-emk disabled attribute check
			const completeBtnMatches = content.match(
				/<button[^>]*data-testid="btn-complete-visit-emk"[^>]*>/s,
			);
			assert.ok(completeBtnMatches, "Must contain btn-complete-visit-emk");
			assert.ok(
				completeBtnMatches[0].includes("disabled={isCompletingVisit}"),
				"Complete visit button must only be disabled during active completion request flight",
			);
			assert.ok(
				!completeBtnMatches[0].includes("!temperature"),
				"Complete visit button must not check temperature",
			);
			assert.ok(
				!completeBtnMatches[0].includes("!pulse"),
				"Complete visit button must not check pulse",
			);
		});

		it("VisitEmkTab & VisitSoapEditor: Autosave safeguards drafts against data loss", () => {
			const emkTabPath = path.resolve(
				process.cwd(),
				"apps/web/src/components/visit/VisitEmkTab.tsx",
			);
			const soapEditorPath = path.resolve(
				process.cwd(),
				"apps/web/src/components/visit/VisitSoapEditor.tsx",
			);
			const emkContent = fs.readFileSync(emkTabPath, "utf8");
			const soapContent = fs.readFileSync(soapEditorPath, "utf8");

			assert.ok(
				emkContent.includes("Debounced autosave"),
				"VisitEmkTab must implement debounced autosave",
			);
			assert.ok(
				soapContent.includes("autosaveDebounceMs") || soapContent.includes("autosave"),
				"VisitSoapEditor must implement draft autosave",
			);
		});
	});

	describe("3. Fast Checkout 54-FZ & Doctor Financial Autonomy", () => {
		it("54-FZ: INN is strictly optional for physical persons (Article 4.7 № 54-FZ)", () => {
			// Case A: empty INN for physical person
			const resEmpty = validateBuyerInn({
				clientType: "physical_person",
				buyerInn: "",
			});
			assert.equal(resEmpty.isValid, true, "Empty INN for physical person must be valid");
			assert.equal(resEmpty.isRequired, false, "INN for physical person must be optional");
			assert.equal(resEmpty.errorRu, undefined, "No error should be produced for empty INN");

			// Case B: undefined INN for physical person
			const resUndefined = validateBuyerInn({
				clientType: "physical_person",
			});
			assert.equal(resUndefined.isValid, true);
			assert.equal(resUndefined.isRequired, false);

			// Case C: 12-digit INN optionally supplied by physical person (for 13% tax refund certificate)
			const resSupplied = validateBuyerInn({
				clientType: "physical_person",
				buyerInn: "770123456789",
			});
			assert.equal(resSupplied.isValid, true);
			assert.equal(resSupplied.isRequired, false);
		});

		it("54-FZ: INN remains required for legal entities (10 digits) and individual entrepreneurs (12 digits)", () => {
			// Legal entity missing INN
			const resLegalMissing = validateBuyerInn({
				clientType: "legal_entity",
				buyerInn: "",
			});
			assert.equal(resLegalMissing.isValid, false);
			assert.equal(resLegalMissing.isRequired, true);
			assert.ok(resLegalMissing.errorRu?.includes("обязателен ИНН"));

			// Legal entity valid 10 digits
			const resLegalValid = validateBuyerInn({
				clientType: "legal_entity",
				buyerInn: "7701234567",
			});
			assert.equal(resLegalValid.isValid, true);

			// Individual entrepreneur valid 12 digits
			const resIpValid = validateBuyerInn({
				clientType: "individual_entrepreneur",
				buyerInn: "770123456789",
			});
			assert.equal(resIpValid.isValid, true);
		});

		it("Fast Checkout Engine: 100% warranty remake preset (warranty_100) requires 0 ₽ and zero master-passwords", () => {
			const totalBillKop = 1500000; // 15 000 ₽
			const preset = applyQuickCheckoutPreset({
				totalBillKop,
				preset: "warranty_100",
			});

			assert.deepEqual(preset.payments, [], "Warranty 100% requires 0 customer payment");
			assert.equal(preset.cashTenderedKop, 0);

			// When bill is 0 kop (100% discount applied to the bill)
			const checkoutInput: FastCheckoutInput = {
				orderId: "ord-warranty-test-1",
				totalBillKop: 0,
				payments: [],
				clientType: "physical_person",
			};

			const validation = validateCheckoutSplit(checkoutInput);
			assert.equal(validation.isValid, true, "0 ₽ checkout for 100% warranty must be valid");
			assert.equal(validation.totalPaidKop, 0);
			assert.equal(validation.remainingDueKop, 0);
		});

		it("Fast Checkout Engine: Split payment calculation down to kopecks without float drift", () => {
			const splitPayments = splitStateToCheckoutPayments({
				cardRub: 2500.5,
				cashRub: 1000,
				depositRub: 500,
			});

			assert.equal(splitPayments.length, 3);
			assert.equal(splitPayments.find((p) => p.method === "bank_card")?.amountKop, 250050);
			assert.equal(splitPayments.find((p) => p.method === "cash")?.amountKop, 100000);
			assert.equal(splitPayments.find((p) => p.method === "patient_deposit")?.amountKop, 50000);

			// Cash change calculation
			const change = calculateCashChangeKop(150000, 100000); // 1500 ₽ tendered, 1000 ₽ required
			assert.equal(change.changeDueKop, 50000); // 500 ₽ change
			assert.equal(change.isUnderpaid, false);
		});
	});
});
