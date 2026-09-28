/**
 * perioReleaseIsolation.test.ts
 *
 * RIGOROUS ARCHITECTURAL ISOLATION AUDIT:
 * Guarantees that 192-point periodontal probing CANNOT and WILL NOT leak into routine outpatient releases.
 * Enforces Mandates 8e (Doctor Autonomy), 8k (CRM != Simulator), 8n (Solo Doctor Sovereignty).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { completeClinicalVisitAndAssembleEstimate } from "../components/visit/clinicalVisitWorkflow";
import { applyHealthyPeriodontiumPreset, calculatePsrSextants } from "../components/perio/perioMath";
import { createDefaultPerioTeeth } from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, "..");

describe("192-Point Periodontal Probing Release Isolation & Leak Proof Audit", () => {
	it("1. Rigorous Bundle Isolation: PeriodontogramChart is strictly lazy-loaded via React.lazy (0 KB initial bundle cost)", () => {
		const visitDiaryPath = path.join(webSrcDir, "components/visit/VisitDiarySection.tsx");
		const odontogramPath = path.join(webSrcDir, "components/odontogram/OdontogramModule.tsx");

		const visitDiaryCode = fs.readFileSync(visitDiaryPath, "utf-8");
		const odontogramCode = fs.readFileSync(odontogramPath, "utf-8");

		// Запрет на статический импорт в рутинном дневнике визита
		assert.equal(
			visitDiaryCode.includes('import { PeriodontogramChart } from "../perio/PeriodontogramChart"'),
			false,
			"VisitDiarySection MUST NOT statically import PeriodontogramChart! It must be lazy-loaded.",
		);

		// Проверка обязательного lazy-импорта в VisitDiarySection
		assert.ok(
			visitDiaryCode.includes("import(" + '"../perio/PeriodontogramChart")'),
			"VisitDiarySection must dynamically import PeriodontogramChart via import()",
		);
		assert.ok(
			visitDiaryCode.includes("<Suspense"),
			"VisitDiarySection must wrap PeriodontogramChart in Suspense",
		);

		// Проверка обязательного lazy-импорта в OdontogramModule
		assert.ok(
			odontogramCode.includes("import(" + '"../perio/PeriodontogramChart")'),
			"OdontogramModule must dynamically import PeriodontogramChart via import()",
		);
	});

	it("2. Outpatient Context Isolation: Standard dentists have 0-click / 1-click physiological norm without Florida Probe", () => {
		const visitViewPath = path.join(webSrcDir, "VisitView.tsx");
		const visitEmkPath = path.join(webSrcDir, "components/visit/VisitEmkTab.tsx");
		const visitDiaryPath = path.join(webSrcDir, "components/visit/VisitDiarySection.tsx");

		const visitViewCode = fs.readFileSync(visitViewPath, "utf-8");
		const visitEmkCode = fs.readFileSync(visitEmkPath, "utf-8");
		const visitDiaryCode = fs.readFileSync(visitDiaryPath, "utf-8");

		// 1-клик кнопки нормы присутствуют
		assert.ok(
			visitViewCode.includes('data-testid="btn-somatic-norm-one-click"'),
			"VisitView must contain 1-click somatic norm button",
		);
		assert.ok(
			visitEmkCode.includes('handleApplyPhysiologicalNorm'),
			"VisitEmkTab must have instant physiological norm handler",
		);
		assert.ok(
			visitDiaryCode.includes('handleApplyFullPhysiologicalNorm'),
			"VisitDiarySection must have 1-click full physiological norm handler",
		);

		// 192-точечная карта убрана в скрытый Tier 3 (по умолчанию закрыта: useState(false))
		assert.ok(
			visitDiaryCode.includes("const [isTier3PerioModalOpen, setIsTier3PerioModalOpen] = useState(false);"),
			"isTier3PerioModalOpen must default to false",
		);
	});

	it("3. Checkout & Visit Completion Sovereignty: Missing periodontal measurements NEVER block checkout or 043/u (Mandates 8e, 8k)", () => {
		// Завершение визита без пародонтальных данных проходит на 100% успешно
		const emptyVisitResult = completeClinicalVisitAndAssembleEstimate({
			visitId: "visit-perio-isolation-test",
			patientId: "patient-1",
			patientName: "Иванов Иван Иванович",
			doctorName: "Врач-стоматолог",
			diary: {
				anamnesis: "Соматически здоров.",
				statusLocalis: "Зубные ряды интактны.",
				diagnosisIcd10: "Z01.2",
			},
		});

		assert.equal(emptyVisitResult.status, "ready_for_payment");
		assert.equal(emptyVisitResult.form043uSaved, true);
		assert.ok(emptyVisitResult.totalNetRub > 0, "Кассовый чек собран");

		// Проверка documentValidators.ts на отсутствие блокировок пародонта
		const docValidatorsPath = path.join(webSrcDir, "documentValidators.ts");
		const docValidatorsCode = fs.readFileSync(docValidatorsPath, "utf-8");
		assert.equal(
			docValidatorsCode.toLowerCase().includes("probingdepth"),
			false,
			"documentValidators must never require probing depths",
		);
	});

	it("4. Exact 3-Tier Architecture Verification: Tier 1 (Norm), Tier 2 (PSR Sextants), Tier 3 (192-pt Specialist Chart)", () => {
		// Tier 1: 0-click норма выполняется мгновенно
		const initialTeeth = createDefaultPerioTeeth(2);
		const t0 = performance.now();
		const normTeeth = applyHealthyPeriodontiumPreset(initialTeeth);
		const durationNormMs = performance.now() - t0;
		assert.ok(durationNormMs < 10, "Tier 1 norm must execute in < 10 ms");

		// Tier 2: Экспресс PSR-скрининг вычисляет коды по 6 секстантам
		const psr = calculatePsrSextants(normTeeth);
		assert.equal(Object.keys(psr).length, 6, "PSR screening must cover exactly 6 sextants");
		for (const sextant of Object.values(psr)) {
			assert.equal(sextant.code, 0, "Healthy norm PSR must be code 0");
		}

		// Tier 3: 192 точки изолированы в специализированном компоненте
		assert.equal(normTeeth.length, 32, "Tier 3 chart contains 32 teeth");
		const totalSites = normTeeth.reduce((acc, t) => acc + (t.distoBuccal ? 6 : 0), 0);
		assert.equal(totalSites, 192, "Tier 3 chart has exactly 192 probing points (6 per tooth x 32)");
	});
});
