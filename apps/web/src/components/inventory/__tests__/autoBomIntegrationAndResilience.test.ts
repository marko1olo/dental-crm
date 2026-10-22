import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { performAutoVisitBomDeduction } from "../autoBomDeductionEngine.js";
import { completeClinicalVisitAndAssembleEstimate } from "../../visit/clinicalVisitWorkflow.js";

const EMOJI_REGEX = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

describe("BOM Deduction: Resilience & Clinical Workflow Integration", () => {
	it("фоновая сетевая ошибка синхронизации не роняет процесс списания", async () => {
		const failingFetch = async (): Promise<Response> => {
			throw new Error("Сетевой сбой при отправке на склад");
		};

		const result = await performAutoVisitBomDeduction({
			visitId: "VIS-AUTO-03",
			patientId: "PAT-03",
			doctorId: "DOC-03",
			renderedServices: [{ serviceCode: "A16.07.002", quantity: 1 }],
			organizationId: "org-test",
			fetchFn: failingFetch as unknown as typeof fetch,
			onToast: () => {},
		});

		assert.ok(result.totalDeductedItems > 0);
	});

	it("завершение визита с лечением кариеса и анестезией генерирует смету и данные автосписания", async () => {
		const completionResult = completeClinicalVisitAndAssembleEstimate({
			visitId: "VIS-CLINICAL-100",
			patientId: "PAT-100",
			patientName: "Ковалев Игорь Семенович",
			doctorName: "Д-р Смирнова Е. П.",
			doctorSpecialty: "Врач-стоматолог-терапевт",
			clinicName: "Клиника «DENTE»",
			diary: {
				anamnesis: "Жалобы на кратковременные боли от сладкого в зубе 2.6.",
				statusLocalis: "В зубе 2.6 на окклюзионной поверхности глубокая кариозная полость.",
				diagnosisIcd10: "K02.1",
				diagnosisTooth: "26",
				treatmentDescription: "Инфильтрационная анестезия. Препарирование полости, наложение светоотверждаемой пломбы.",
			},
			completedPlanItems: [],
			additionalServices: [],
		});

		assert.ok(completionResult.items.length >= 2);
		assert.ok(completionResult.totalNetRub > 0);

		const bomResult = await performAutoVisitBomDeduction({
			visitId: completionResult.visitId,
			patientId: completionResult.patientId,
			doctorId: completionResult.doctorName,
			renderedServices: completionResult.items,
			allowOverdraft: true,
		});

		assert.ok(bomResult.totalDeductedItems >= 5);
		assert.ok(bomResult.classBWaste.carpulesCount >= 1);
		assert.ok(bomResult.classBWaste.sharpsCount >= 1);
		assert.equal(bomResult.classBWaste.singlePersonApproval, true);
		assert.ok(!EMOJI_REGEX.test(bomResult.statutoryActText));
	});
});
