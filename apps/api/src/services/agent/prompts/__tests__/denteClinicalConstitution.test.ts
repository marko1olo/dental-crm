/**
 * denteClinicalConstitution.test.ts
 *
 * Unit test suite for DENTE Clinical Constitution, Pharmacology, 804n Billing,
 * 54-FZ Cash Registers, Form 107-1/u Prescriptions, and Mandate 8e Doctor Autonomy.
 *
 * SQUAD VERIFICATION GATES:
 * 1. Clinical Identity & ReAct Cycle (T.A.R.S. 100% honesty, zero-sycophancy, Thought -> Action -> Observation).
 * 2. Form 043/u & StAR protocols (K02, K04.0, K04.5, K05, K05.3, Order 834n).
 * 3. Strict FDI Tooth Numbering (11–48, 51–85) and anatomical surfaces (O, M, D, V/B, L/P).
 * 4. SOAP Structure (Subjective, Objective, Assessment, Plan).
 * 5. Pharmacology & Anesthesia Safety (Articaine max 7 mg/kg, 1:100k, 1:200k, Mepivacaine 3%, DDI).
 * 6. Prescription Form 107-1/u (Latin block: Rp, D.t.d. N, S:).
 * 7. Billing & Nomenclature 804n (A16.07.002, A16.07.030, A16.07.082, A16.07.008, etc.).
 * 8. Kopeck exactness & VAT exemption (пп. 2 п. 2 ст. 149 НК РФ) & 54-FZ (optional physical person INN).
 * 9. Mandate 8e Doctor Autonomy (software for doctor, 1-click norm, 0 disabled buttons, soft warnings, 100% discount freedom).
 * 10. System Prompt Builder (buildDenteAgentSystemPrompt with specialty, autonomousMode, doctorContext).
 * 11. Anti-bloat check: zero kraft-packets or autoclave checks on the doctor's hot path.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import {
	BILLING_AND_PRICING_804N_PROMPT,
	DENTE_CLINICAL_CONSTITUTION_PROMPT,
	DENTE_CLINICAL_IDENTITY,
	DENTE_CLINICAL_STANDARDS_PROMPT,
	DENTE_REACT_CYCLE_PROMPT,
	DOCTOR_AUTONOMY_PROMPT,
	FISCAL_54FZ_AND_VAT_PROMPT,
	KOPECK_EXACT_FINANCE_PROMPT,
	LOCAL_ANESTHESIA_SAFETY_PROMPT,
	NOMENCLATURE_804N_PROMPT,
	PHARMACOLOGY_AND_SAFETY_PROMPT,
	PRESCRIPTION_FORM_107_1_U_PROMPT,
	buildDenteAgentSystemPrompt,
} from "../index.js";

describe("DENTE Clinical Constitution & Agent Prompts Suite", () => {
	describe("1. Clinical Identity & ReAct Instrumental Cycle", () => {
		test("contains Chief Clinical AI Resident and Digital CMO identity", () => {
			assert.ok(
				DENTE_CLINICAL_IDENTITY.includes("ГЛАВНЫЙ КЛИНИЧЕСКИЙ ИИ-ОРДИНАТОР"),
			);
			assert.ok(DENTE_CLINICAL_IDENTITY.includes("ЦИФРОВОЙ НАЧМЕД"));
			assert.ok(DENTE_CLINICAL_IDENTITY.includes("T.A.R.S. 100%"));
			assert.ok(DENTE_CLINICAL_IDENTITY.includes("zero-sycophancy"));
			assert.ok(DENTE_CLINICAL_IDENTITY.includes("Презумпция дефекта"));
		});

		test("enforces ReAct instrumental cycle (Thought -> Action -> Observation)", () => {
			assert.ok(DENTE_REACT_CYCLE_PROMPT.includes("THOUGHT"));
			assert.ok(DENTE_REACT_CYCLE_PROMPT.includes("ACTION"));
			assert.ok(
				DENTE_REACT_CYCLE_PROMPT.includes("OBSERVATION & VERDICT"),
			);
			assert.ok(DENTE_REACT_CYCLE_PROMPT.includes("FDI"));
			assert.ok(DENTE_REACT_CYCLE_PROMPT.includes("804n billing"));
		});
	});

	describe("2. Form 043/u, StAR Protocols, FDI Notation & SOAP Structure", () => {
		test("includes Form 043/u and Order 834n", () => {
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("043/У"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("834Н"));
		});

		test("includes canonical StAR protocols (K02, K04.0, K04.5, K05, K05.3)", () => {
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("K02"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("K02.1"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("K04.0"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("K04.5"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("K05"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("K05.3"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("Пульпит"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("Периодонтит"));
		});

		test("strictly defines FDI tooth notation (11–48 permanent, 51–85 deciduous)", () => {
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("FDI"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("11"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("48"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("51"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("85"));
		});

		test("defines anatomical surfaces (O, M, D, V/B, L/P)", () => {
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("O (Occlusal)"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("M (Mesial)"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("D (Distal)"));
			assert.ok(
				DENTE_CLINICAL_STANDARDS_PROMPT.includes("V/B (Vestibular/Buccal)"),
			);
			assert.ok(
				DENTE_CLINICAL_STANDARDS_PROMPT.includes("L/P (Lingual/Palatal)"),
			);
		});

		test("defines SOAP structure (Subjective, Objective, Assessment, Plan)", () => {
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("S (Subjective"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("O (Objective"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("A (Assessment"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("P (Plan"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("ЭОД"));
			assert.ok(DENTE_CLINICAL_STANDARDS_PROMPT.includes("коффердам"));
		});
	});

	describe("3. Pharmacology, Local Anesthesia & Form 107-1/u Prescriptions", () => {
		test("contains Articaine dosing (max 7 mg/kg) and Epinephrine ratios (1:100k, 1:200k)", () => {
			assert.ok(LOCAL_ANESTHESIA_SAFETY_PROMPT.includes("АРТИКАИН 4%"));
			assert.ok(LOCAL_ANESTHESIA_SAFETY_PROMPT.includes("7 мг на 1 кг"));
			assert.ok(LOCAL_ANESTHESIA_SAFETY_PROMPT.includes("1:100 000"));
			assert.ok(LOCAL_ANESTHESIA_SAFETY_PROMPT.includes("1:200 000"));
		});

		test("specifies Mepivacaine 3% without vasoconstrictor for hypertensive & cardiac patients", () => {
			assert.ok(
				LOCAL_ANESTHESIA_SAFETY_PROMPT.includes("МЕПИВАКАИН 3% БЕЗ ВАЗОКОНСТРИКТОРА"),
			);
			assert.ok(LOCAL_ANESTHESIA_SAFETY_PROMPT.includes("Артериальная гипертензия"));
			assert.ok(LOCAL_ANESTHESIA_SAFETY_PROMPT.includes("Ишемическая болезнь сердца"));
			assert.ok(LOCAL_ANESTHESIA_SAFETY_PROMPT.includes("Аллергия на сульфиты"));
		});

		test("includes antibiotic prophylaxis (Amoxiclav, Clindamycin, Josamycin)", () => {
			assert.ok(PHARMACOLOGY_AND_SAFETY_PROMPT.includes("Амоксиклав"));
			assert.ok(PHARMACOLOGY_AND_SAFETY_PROMPT.includes("875 мг + 125 мг"));
			assert.ok(PHARMACOLOGY_AND_SAFETY_PROMPT.includes("Клиндамицин"));
			assert.ok(PHARMACOLOGY_AND_SAFETY_PROMPT.includes("300 мг"));
			assert.ok(PHARMACOLOGY_AND_SAFETY_PROMPT.includes("Джозамицин"));
		});

		test("enforces Form 107-1/u Latin prescription format (Rp, D.t.d. N, S)", () => {
			assert.ok(PRESCRIPTION_FORM_107_1_U_PROMPT.includes("107-1/У"));
			assert.ok(PRESCRIPTION_FORM_107_1_U_PROMPT.includes("Rp:"));
			assert.ok(PRESCRIPTION_FORM_107_1_U_PROMPT.includes("D.t.d. N"));
			assert.ok(PRESCRIPTION_FORM_107_1_U_PROMPT.includes("S:"));
			assert.ok(PRESCRIPTION_FORM_107_1_U_PROMPT.includes("1094Н"));
		});
	});

	describe("4. Billing, Nomenclature 804n, Kopeck Arithmetic & 54-FZ Cash Registers", () => {
		test("includes canonical Nomenclature 804n codes", () => {
			assert.ok(NOMENCLATURE_804N_PROMPT.includes("A16.07.002"));
			assert.ok(NOMENCLATURE_804N_PROMPT.includes("A16.07.030"));
			assert.ok(NOMENCLATURE_804N_PROMPT.includes("A16.07.082"));
			assert.ok(NOMENCLATURE_804N_PROMPT.includes("A16.07.008"));
			assert.ok(NOMENCLATURE_804N_PROMPT.includes("A16.07.001"));
			assert.ok(NOMENCLATURE_804N_PROMPT.includes("A16.07.004"));
			assert.ok(NOMENCLATURE_804N_PROMPT.includes("A16.07.051"));
			assert.ok(NOMENCLATURE_804N_PROMPT.includes("A16.07.054"));
			assert.ok(NOMENCLATURE_804N_PROMPT.includes("B01.065.001"));
		});

		test("enforces integer kopeck exactness and conversion functions", () => {
			assert.ok(KOPECK_EXACT_FINANCE_PROMPT.includes("ЦЕЛОЧИСЛЕННЫХ КОПЕЙКАХ"));
			assert.ok(KOPECK_EXACT_FINANCE_PROMPT.includes("rubToKopecks"));
			assert.ok(KOPECK_EXACT_FINANCE_PROMPT.includes("kopecksToRub"));
			assert.ok(KOPECK_EXACT_FINANCE_PROMPT.includes("Round Half to Even"));
		});

		test("stipulates VAT exemption under subclause 2 clause 2 article 149 of RF Tax Code", () => {
			assert.ok(FISCAL_54FZ_AND_VAT_PROMPT.includes("149"));
			assert.ok(FISCAL_54FZ_AND_VAT_PROMPT.includes("Без НДС"));
		});

		test("enforces 54-FZ rules: physical person INN strictly optional, multi-tender support", () => {
			assert.ok(
				FISCAL_54FZ_AND_VAT_PROMPT.includes("ИНН ФИЗИЧЕСКИХ ЛИЦ СТРОГО ОПЦИОНАЛЕН"),
			);
			assert.ok(
				FISCAL_54FZ_AND_VAT_PROMPT.includes("МУЛЬТИТЕНДЕРНАЯ ОПЛАТА В 1 КЛИК"),
			);
		});
	});

	describe("5. Mandate 8e: Doctor Autonomy & Friction Reduction", () => {
		test("establishes software for the doctor principle", () => {
			assert.ok(
				DOCTOR_AUTONOMY_PROMPT.includes("СОФТ ДЛЯ ВРАЧА, А НЕ ВРАЧ ДЛЯ СОФТА"),
			);
		});

		test("mandates 1-click physiological norm by default", () => {
			assert.ok(
				DOCTOR_AUTONOMY_PROMPT.includes("ФИЗИОЛОГИЧЕСКАЯ НОРМА ПО УМОЛЧАНИЮ В 1 КЛИК"),
			);
		});

		test("prohibits disabled buttons and mandates soft warnings", () => {
			assert.ok(
				DOCTOR_AUTONOMY_PROMPT.includes("НОЛЬ ЗАБЛОКИРОВАННЫХ DISABLED КНОПОК"),
			);
			assert.ok(DOCTOR_AUTONOMY_PROMPT.includes("soft warning"));
		});

		test("guarantees doctor discount freedom up to 100% on remakes and staff", () => {
			assert.ok(
				DOCTOR_AUTONOMY_PROMPT.includes("СВОБОДА СКИДОК И ПЕРЕДЕЛОК"),
			);
			assert.ok(DOCTOR_AUTONOMY_PROMPT.includes("100%"));
		});

		test("guarantees draft printing at any moment and autosave", () => {
			assert.ok(DOCTOR_AUTONOMY_PROMPT.includes("ПЕЧАТЬ В ЛЮБОЙ МОМЕНТ"));
			assert.ok(DOCTOR_AUTONOMY_PROMPT.includes("ЧЕРНОВИК"));
			assert.ok(DOCTOR_AUTONOMY_PROMPT.includes("ПОДПИСАНО ВРАЧОМ"));
			assert.ok(DOCTOR_AUTONOMY_PROMPT.includes("AUTOSAVE"));
		});
	});

	describe("6. Master Prompt Builder (buildDenteAgentSystemPrompt)", () => {
		test("builds complete unified system prompt with all modules by default", () => {
			const prompt = buildDenteAgentSystemPrompt();

			// Clinical identity & ReAct
			assert.ok(prompt.includes("ГЛАВНЫЙ КЛИНИЧЕСКИЙ ИИ-ОРДИНАТОР"));
			assert.ok(prompt.includes("THOUGHT"));

			// Standards & FDI
			assert.ok(prompt.includes("043/У"));
			assert.ok(prompt.includes("K02"));
			assert.ok(prompt.includes("11"));
			assert.ok(prompt.includes("48"));

			// Pharmacology
			assert.ok(prompt.includes("АРТИКАИН 4%"));
			assert.ok(prompt.includes("Амоксиклав"));
			assert.ok(prompt.includes("Rp:"));

			// Billing & Fiscal
			assert.ok(prompt.includes("A16.07.002"));
			assert.ok(prompt.includes("ЦЕЛОЧИСЛЕННЫХ КОПЕЙКАХ"));
			assert.ok(prompt.includes("149"));

			// Doctor Autonomy
			assert.ok(prompt.includes("СОФТ ДЛЯ ВРАЧА, А НЕ ВРАЧ ДЛЯ СОФТА"));
			assert.ok(prompt.includes("НОЛЬ ЗАБЛОКИРОВАННЫХ DISABLED КНОПОК"));
		});

		test("injects specialty-specific section when requested", () => {
			const therapyPrompt = buildDenteAgentSystemPrompt({
				specialty: "therapy",
			});
			assert.ok(therapyPrompt.includes("ТЕРАПЕВТИЧЕСКАЯ СТОМАТОЛОГИЯ"));
			assert.ok(therapyPrompt.includes("A16.07.002"));

			const surgeryPrompt = buildDenteAgentSystemPrompt({
				specialty: "surgery",
			});
			assert.ok(surgeryPrompt.includes("ХИРУРГИЧЕСКАЯ СТОМАТОЛОГИЯ"));
			assert.ok(surgeryPrompt.includes("A16.07.054"));

			const endoPrompt = buildDenteAgentSystemPrompt({
				specialty: "endodontics",
			});
			assert.ok(endoPrompt.includes("ЭНДОДОНТИЯ"));
			assert.ok(endoPrompt.includes("A16.07.030"));
		});

		test("injects autonomous mode section when autonomousMode=true", () => {
			const autoPrompt = buildDenteAgentSystemPrompt({
				autonomousMode: true,
			});
			assert.ok(
				autoPrompt.includes("РЕЖИМ АВТОНОМНОГО КЛИНИЧЕСКОГО АССИСТЕНТА"),
			);
			assert.ok(autoPrompt.includes("DDI"));
		});

		test("appends doctor screen context when provided", () => {
			const context = "[UI Context: View='treatment-plan' ActiveTooth=36]";
			const prompt = buildDenteAgentSystemPrompt({ doctorContext: context });
			assert.ok(prompt.includes(context));
		});

		test("anti-bloat check: prompt contains zero kraft-packet or autoclave clutter on hot path", () => {
			const prompt = buildDenteAgentSystemPrompt();
			assert.strictEqual(
				/крафт-пакет/i.test(prompt),
				false,
				"Chairside prompt must not contain kraft-packet inspection",
			);
			assert.strictEqual(
				/азопирам/i.test(prompt),
				false,
				"Chairside prompt must not contain azopiram inspection",
			);
			assert.strictEqual(
				/журнал цсо/i.test(prompt),
				false,
				"Chairside prompt must not contain CSO journal inspection",
			);
		});
	});
});
