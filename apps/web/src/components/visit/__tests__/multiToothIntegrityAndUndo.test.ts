import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
	mergeMultiToothDiagnoses,
	parseMultiToothDiagnoses,
	formatToothDiagnosis,
	mergeMultiToothObjective,
	mergeMultiToothTreatmentPlan,
	sanitizeClinicalNormContradictions,
	sanitizeVisitNoteFormFields,
} from "../../../utils/clinicalTextSanitizer";
import { useVisitStore } from "../../../store/visitStore";

describe("Red Team Inquisition: Multi-Tooth Integrity, 1-Click Undo Engine, and Sanitizer", () => {
	beforeEach(() => {
		useVisitStore.setState({
			visitNoteForm: {},
			visitToothStateByCode: {},
			visitAiDiagnosesByCode: {},
			visitToothRecordsByCode: {},
			undoStack: [],
			redoStack: [],
			canUndo: false,
			canRedo: false,
			activeToothNumber: 16,
		});
	});

	describe("1. Multi-Tooth Treatment Integrity (2–4 teeth preservation)", () => {
		it("sequentially accumulates diagnoses for 3 teeth without overwriting any previous tooth", () => {
			let currentDiagnosis = "";

			// 1. Tooth 16 (Caries MOD)
			currentDiagnosis = mergeMultiToothDiagnoses(currentDiagnosis, {
				toothNumber: 16,
				icd10: "K02.1",
				diagnosis: "Кариес дентина",
				cavity: "MOD",
			});
			assert.ok(currentDiagnosis.includes("Зуб 16: K02.1 Кариес дентина (MOD)"));

			// 2. Tooth 17 (Pulpitis)
			currentDiagnosis = mergeMultiToothDiagnoses(currentDiagnosis, {
				toothNumber: 17,
				icd10: "K04.0",
				diagnosis: "Острый пульпит",
			});
			assert.ok(currentDiagnosis.includes("Зуб 16: K02.1 Кариес дентина (MOD)"), "Tooth 16 must NOT be overwritten!");
			assert.ok(currentDiagnosis.includes("Зуб 17: K04.0 Острый пульпит"), "Tooth 17 must be appended cleanly!");

			// 3. Tooth 26 (Periodontitis)
			currentDiagnosis = mergeMultiToothDiagnoses(currentDiagnosis, {
				toothNumber: 26,
				icd10: "K04.5",
				diagnosis: "Хронический периодонтит",
			});
			assert.ok(currentDiagnosis.includes("Зуб 16: K02.1 Кариес дентина (MOD)"));
			assert.ok(currentDiagnosis.includes("Зуб 17: K04.0 Острый пульпит"));
			assert.ok(currentDiagnosis.includes("Зуб 26: K04.5 Хронический периодонтит"));

			// 4. Update Tooth 16 diagnosis in-place (e.g. clarification to deep caries)
			const updatedDiagnosis = mergeMultiToothDiagnoses(currentDiagnosis, {
				toothNumber: 16,
				icd10: "K02.1",
				diagnosis: "Глубокий кариес дентина",
				cavity: "MOD",
			});
			assert.ok(updatedDiagnosis.includes("Зуб 16: K02.1 Глубокий кариес дентина (MOD)"));
			assert.ok(updatedDiagnosis.includes("Зуб 17: K04.0 Острый пульпит"), "Tooth 17 untouched during Tooth 16 edit");
			assert.ok(updatedDiagnosis.includes("Зуб 26: K04.5 Хронический периодонтит"), "Tooth 26 untouched during Tooth 16 edit");
		});

		it("correctly parses multi-tooth diagnoses into a structured map", () => {
			const text = "[Зуб 16: K02.1 Кариес (MOD)]; [Зуб 17: K04.0 Пульпит]; [Зуб 26: K04.5 Периодонтит]";
			const map = parseMultiToothDiagnoses(text);
			assert.equal(map.size, 3);
			assert.ok(map.has(16));
			assert.ok(map.has(17));
			assert.ok(map.has(26));
			assert.ok(map.get(16)?.includes("K02.1"));
			assert.ok(map.get(17)?.includes("K04.0"));
			assert.ok(map.get(26)?.includes("K04.5"));
		});

		it("accumulates objective status and treatment plans for multiple teeth without wiping", () => {
			let obj = "";
			obj = mergeMultiToothObjective(obj, {
				toothNumber: 16,
				content: "Зондирование дна полости болезненно, термопроба положительна.",
			});
			obj = mergeMultiToothObjective(obj, {
				toothNumber: 17,
				content: "Полость зуба вскрыта, зондирование устьев каналов резко болезненно.",
			});

			assert.ok(obj.includes("Зуб 16:"));
			assert.ok(obj.includes("Зуб 17:"));
			assert.ok(obj.includes("Полость зуба вскрыта"));

			let plan = "";
			plan = mergeMultiToothTreatmentPlan(plan, {
				toothNumber: 16,
				content: "Препарирование, пломба Filtek Z250 (MOD)",
			});
			plan = mergeMultiToothTreatmentPlan(plan, {
				toothNumber: 17,
				content: "Экстирпация пульпы, обработка каналов ProTaper, Calasept",
			});
			assert.ok(plan.includes("Зуб 16: Препарирование, пломба Filtek Z250 (MOD)"));
			assert.ok(plan.includes("Зуб 17: Экстирпация пульпы, обработка каналов ProTaper, Calasept"));
		});
	});

	describe("2. Clinical Text Sanitizer & Norm Contradiction Elimination", () => {
		it("purges intact/norm phrases when actual tooth pathology is introduced", () => {
			const initialWithNorm =
				"Полость рта санирована. Зубной ряд интактен. Патологии твердых тканей не выявлено.\n" +
				"Зуб 16: глубокая кариозная полость на жевательной поверхности, дентин размягчен.";

			const sanitized = sanitizeClinicalNormContradictions(initialWithNorm);
			assert.ok(!sanitized.includes("Зубной ряд интактен"), "Must strip 'Зубной ряд интактен'");
			assert.ok(!sanitized.includes("Патологии твердых тканей не выявлено"), "Must strip 'Патологии не выявлено'");
			assert.ok(sanitized.includes("глубокая кариозная полость"), "Must preserve pathology description");
		});

		it("replaces pure Z01.2 Norm diagnosis when a specific tooth pathology is added", () => {
			const initialDiag = "Z01.2 Стоматологическое обследование и гигиена полости рта (Норма)";
			const merged = mergeMultiToothDiagnoses(initialDiag, {
				toothNumber: 16,
				icd10: "K02.1",
				diagnosis: "Кариес дентина",
				cavity: "MO",
			});
			assert.ok(!merged.includes("Z01.2"), "Z01.2 Norm should be replaced by tooth pathology");
			assert.ok(merged.includes("[Зуб 16: K02.1 Кариес дентина (MO)]"));
		});

		it("sanitizes all fields across entire visitNoteForm via sanitizeVisitNoteFormFields", () => {
			const dirtyForm = {
				complaint: "Жалоб нет. Зубы интактны. Боли при накусывании на зуб 16.",
				objectiveStatus: "Зубной ряд интактен. Зуб 16: кариозная полость.",
				diagnosis: "Зуб 16: K02.1",
			};
			const clean = sanitizeVisitNoteFormFields(dirtyForm);
			assert.ok(!clean.complaint?.includes("Зубы интактны"));
			assert.ok(!clean.objectiveStatus?.includes("Зубной ряд интактен"));
			assert.ok(clean.complaint?.includes("Боли при накусывании на зуб 16"));
		});
	});

	describe("3. Structured Per-Tooth Storage in visitStore", () => {
		it("stores structured clinical attributes for multiple teeth independently", () => {
			const store = useVisitStore.getState();

			// Record Tooth 16
			store.setVisitToothRecord("16", {
				toothNumber: 16,
				state: "treatment",
				diagnosis: "K02.1 Кариес дентина",
				diagnosisIcd10: "K02.1",
				cavity: "MOD",
				surfaces: ["M", "O", "D"],
				material: "Filtek Z250",
				anesthesia: "Sol. Ultracaini D-S 1.7 мл",
			});

			// Record Tooth 17
			store.setVisitToothRecord("17", {
				toothNumber: 17,
				state: "treatment",
				diagnosis: "K04.0 Острый пульпит",
				diagnosisIcd10: "K04.0",
				preparationFormula: "MB1, MB2, DB, P",
			});

			const updated = useVisitStore.getState();
			const rec16 = updated.visitToothRecordsByCode["16"];
			const rec17 = updated.visitToothRecordsByCode["17"];

			assert.ok(rec16, "Tooth 16 record exists");
			assert.equal(rec16.cavity, "MOD");
			assert.deepEqual(rec16.surfaces, ["M", "O", "D"]);
			assert.equal(rec16.material, "Filtek Z250");

			assert.ok(rec17, "Tooth 17 record exists");
			assert.equal(rec17.diagnosisIcd10, "K04.0");
			assert.equal(rec17.preparationFormula, "MB1, MB2, DB, P");

			// State synchronization
			assert.equal(updated.visitToothStateByCode["16"], "treatment");
			assert.equal(updated.visitToothStateByCode["17"], "treatment");
		});
	});

	describe("4. 1-Click Visit Undo / Redo Engine Invariants", () => {
		it("captures full visit snapshot and rolls back state with 1 click (undoVisit)", () => {
			const store = useVisitStore.getState();

			// 0. Base initial state
			useVisitStore.setState({
				visitNoteForm: { diagnosis: "Первичный осмотр" },
				visitToothStateByCode: { "16": "idle" },
			});
			store.pushVisitSnapshot("Начало осмотра");

			// 1. Doctor treats Tooth 16
			useVisitStore.setState({
				visitNoteForm: { diagnosis: "[Зуб 16: K02.1 Кариес (MOD)]" },
				visitToothStateByCode: { "16": "treatment" },
			});
			store.pushVisitSnapshot("Лечение зуба 16");

			// 2. Doctor treats Tooth 17
			useVisitStore.setState({
				visitNoteForm: { diagnosis: "[Зуб 16: K02.1 Кариес (MOD)]; [Зуб 17: K04.0 Пульпит]" },
				visitToothStateByCode: { "16": "treatment", "17": "treatment" },
			});

			// Verify current state before undo
			assert.equal(useVisitStore.getState().undoStack.length, 2);
			assert.equal(useVisitStore.getState().canUndo, true);

			// 3. 1-Click Undo: should revert Tooth 17 action and restore Tooth 16 state
			const didUndo = useVisitStore.getState().undoVisit();
			assert.equal(didUndo, true);

			const afterUndo = useVisitStore.getState();
			assert.equal(afterUndo.visitNoteForm.diagnosis, "[Зуб 16: K02.1 Кариес (MOD)]");
			assert.equal(afterUndo.visitToothStateByCode["16"], "treatment");
			assert.equal(afterUndo.visitToothStateByCode["17"], undefined, "Tooth 17 state reverted");
			assert.equal(afterUndo.canRedo, true, "Redo stack enabled");

			// 4. 1-Click Redo: should re-apply Tooth 17 treatment
			const didRedo = useVisitStore.getState().redoVisit();
			assert.equal(didRedo, true);

			const afterRedo = useVisitStore.getState();
			assert.ok(afterRedo.visitNoteForm.diagnosis.includes("Зуб 17: K04.0"));
			assert.equal(afterRedo.visitToothStateByCode["17"], "treatment");
		});

		it("caps undo stack size at 50 snapshots to prevent memory leaks", () => {
			for (let i = 0; i < 60; i++) {
				useVisitStore.getState().pushVisitSnapshot(`Действие #${i}`);
			}
			const stack = useVisitStore.getState().undoStack;
			assert.equal(stack.length, 50, "Undo stack ceiling must be strictly 50");
		});
	});

	describe("5. Cavity Classification (Black Class: MO, OD, MOD, O, V)", () => {
		it("formats tooth diagnosis with cavity classification cleanly", () => {
			assert.equal(
				formatToothDiagnosis(16, "K02.1 Кариес", "MOD"),
				"[Зуб 16: K02.1 Кариес (MOD)]",
			);
			assert.equal(
				formatToothDiagnosis(24, "K02.1 Кариес", "MO"),
				"[Зуб 24: K02.1 Кариес (MO)]",
			);
			assert.equal(
				formatToothDiagnosis(36, "K02.1 Кариес", "OD"),
				"[Зуб 36: K02.1 Кариес (OD)]",
			);
			assert.equal(
				formatToothDiagnosis(47, "K02.1 Кариес", "V"),
				"[Зуб 47: K02.1 Кариес (V)]",
			);
			assert.equal(
				formatToothDiagnosis(11, "K02.1 Кариес"),
				"[Зуб 11: K02.1 Кариес]",
			);
		});
	});
});
