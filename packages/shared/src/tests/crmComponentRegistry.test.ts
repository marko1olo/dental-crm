import assert from "node:assert";
import { describe, test } from "node:test";
import {
	CRM_COMPONENT_REGISTRY,
	crmComponentKnowledgeSchema,
	exportKnowledgeRegistryAsJson,
	findComponentKnowledge,
	formatComponentForLLMContext,
	formatKnowledgeBaseOverviewForLLM,
	getComponentKnowledgeById,
	listAllComponents,
} from "../index.js";

describe("CRM Component Knowledge Registry (Mandate 8l)", () => {
	test("registry contains at least 12 canonical modules", () => {
		assert.ok(
			CRM_COMPONENT_REGISTRY.length >= 12,
			`Expected at least 12 components, got ${CRM_COMPONENT_REGISTRY.length}`,
		);
	});

	test("all registered components satisfy Zod schema", () => {
		for (const component of CRM_COMPONENT_REGISTRY) {
			const parseResult = crmComponentKnowledgeSchema.safeParse(component);
			assert.ok(
				parseResult.success,
				`Component ${component.id} failed validation: ${
					parseResult.success ? "" : JSON.stringify(parseResult.error.format())
				}`,
			);
		}
	});

	test("all component IDs are unique", () => {
		const ids = CRM_COMPONENT_REGISTRY.map((c) => c.id);
		const uniqueIds = new Set(ids);
		assert.strictEqual(
			uniqueIds.size,
			ids.length,
			"Detected duplicate component IDs in registry",
		);
	});

	test("all components contain required operational and clinical fields", () => {
		for (const c of CRM_COMPONENT_REGISTRY) {
			assert.ok(c.id.length > 0, "id cannot be empty");
			assert.ok(c.name.length > 0, "name cannot be empty");
			assert.ok(c.shortName.length > 0, "shortName cannot be empty");
			assert.ok(c.description.length > 0, "description cannot be empty");
			assert.ok(c.route.length > 0, "route cannot be empty");
			assert.ok(c.clinicalWorkflow.length > 0, "clinicalWorkflow cannot be empty");
			assert.ok(c.scaleAdaptability.length > 0, "scaleAdaptability cannot be empty");
			assert.ok(c.keywords.length > 0, "keywords cannot be empty");
			assert.ok(
				[1, 2, 3].includes(c.tier),
				`Invalid tier ${c.tier} for ${c.id}`,
			);

			// Each component must have primary actions with valid selectors
			assert.ok(
				c.primaryActions.length > 0,
				`Component ${c.id} must define at least one primary action`,
			);
			for (const action of c.primaryActions) {
				assert.ok(action.id.length > 0, "Action id cannot be empty");
				assert.ok(action.label.length > 0, "Action label cannot be empty");
				assert.ok(
					action.selector.includes("[") || action.selector.includes("."),
					`Action selector '${action.selector}' must be a valid CSS/data-testid selector`,
				);
				assert.ok(action.effect.length > 0, "Action effect cannot be empty");
			}

			// Each component must have FAQ and Troubleshooting entries
			assert.ok(
				c.faq.length > 0,
				`Component ${c.id} must have at least one FAQ item`,
			);
			assert.ok(
				c.troubleshooting.length > 0,
				`Component ${c.id} must have at least one troubleshooting item`,
			);
		}
	});

	test("getComponentKnowledgeById retrieves exact component or undefined", () => {
		const schedule = getComponentKnowledgeById("schedule_grid");
		assert.ok(schedule, "schedule_grid must exist");
		assert.strictEqual(schedule?.name, "Сетка расписания приёмов");

		const nonExistent = getComponentKnowledgeById("non_existent_module_404");
		assert.strictEqual(nonExistent, undefined);
	});

	test("listAllComponents returns the entire registry", () => {
		const all = listAllComponents();
		assert.strictEqual(all.length, CRM_COMPONENT_REGISTRY.length);
	});
});

describe("Knowledge Search Engine (Mandate 8l)", () => {
	test("finds component by exact ID", () => {
		const results = findComponentKnowledge("kkt_cashier");
		assert.ok(results.length > 0, "Should find kkt_cashier");
		assert.strictEqual(results[0]?.component.id, "kkt_cashier");
		assert.ok((results[0]?.score ?? 0) >= 100);
	});

	test("finds component by clinical Russian keywords", () => {
		// Odontogram search
		const toothResults = findComponentKnowledge("зубная формула кариес");
		assert.ok(toothResults.length > 0);
		assert.strictEqual(toothResults[0]?.component.id, "odontogram_arch");

		// Schedule search
		const schedResults = findComponentKnowledge("запись расписание слоты");
		assert.ok(schedResults.length > 0);
		assert.strictEqual(schedResults[0]?.component.id, "schedule_grid");

		// Cashier search
		const cashResults = findComponentKnowledge("касса чек 54-ФЗ оплата");
		assert.ok(cashResults.length > 0);
		assert.strictEqual(cashResults[0]?.component.id, "kkt_cashier");

		// SanPiN search
		const sanpinResults = findComponentKnowledge("стерилизация автоклав санпин");
		assert.ok(sanpinResults.length > 0);
		assert.strictEqual(
			sanpinResults[0]?.component.id,
			"sanpin_sterilization_journal",
		);

		// Imaging / CBCT search
		const imagingResults = findComponentKnowledge("снимки рентген кт mpr");
		assert.ok(imagingResults.length > 0);
		assert.strictEqual(imagingResults[0]?.component.id, "cbct_mpr_studio");

		// Tax deduction search
		const taxResults = findComponentKnowledge("справка налоговый вычет ндфл");
		assert.ok(taxResults.length > 0);
		assert.strictEqual(taxResults[0]?.component.id, "document_generator");
	});

	test("filters results by user role", () => {
		const nurseResults = findComponentKnowledge("склад анестетики", {
			role: "nurse",
		});
		assert.ok(nurseResults.length > 0);
		assert.strictEqual(nurseResults[0]?.component.id, "warehouse_fefo");

		const doctorResults = findComponentKnowledge("дневник жалобы норма", {
			role: "doctor",
		});
		assert.ok(doctorResults.length > 0);
		assert.strictEqual(doctorResults[0]?.component.id, "visit_diary");
	});

	test("filters results by category", () => {
		const financeResults = findComponentKnowledge("чек оплата", {
			category: "finance",
		});
		assert.ok(financeResults.length > 0);
		assert.strictEqual(financeResults[0]?.component.category, "finance");
		assert.strictEqual(financeResults[0]?.component.id, "kkt_cashier");
	});

	test("respects limit option", () => {
		const results = findComponentKnowledge("приём", { limit: 2 });
		assert.ok(results.length <= 2, `Expected <= 2 results, got ${results.length}`);
	});
});

describe("LLM Context Formatting for AI Agents (Mandate 8l)", () => {
	test("formatComponentForLLMContext returns markdown with actions and selectors", () => {
		const formatted = formatComponentForLLMContext("schedule_grid");
		assert.ok(formatted.includes("### [КОМПОНЕНТ CRM: Сетка расписания приёмов"));
		assert.ok(formatted.includes("Доступные действия и проверенные селекторы"));
		assert.ok(formatted.includes("Клинический сценарий (Workflow)"));
		assert.ok(formatted.includes("Диагностика и устранение проблем (Troubleshooting)"));
		assert.ok(formatted.includes("Суверенитет масштаба (Мандат 8n)"));
		assert.ok(formatted.includes('[data-testid="btn-create-appointment"]'));
	});

	test("formatComponentForLLMContext handles natural language search fallback", () => {
		const formatted = formatComponentForLLMContext("как работает касса");
		assert.ok(formatted.includes("Касса и чеки 54-ФЗ"));
		assert.ok(formatted.includes("54-ФЗ"));
	});

	test("formatComponentForLLMContext returns safe message for unknown component", () => {
		const formatted = formatComponentForLLMContext("абсолютно_неизвестный_модуль_xyz");
		assert.ok(formatted.includes("не найден в реестре"));
	});

	test("formatKnowledgeBaseOverviewForLLM includes all registered components", () => {
		const overview = formatKnowledgeBaseOverviewForLLM();
		assert.ok(overview.includes("# КАРТА ЗНАНИЙ И КОМПОНЕНТОВ CRM DENTE"));
		for (const comp of CRM_COMPONENT_REGISTRY) {
			assert.ok(
				overview.includes(comp.id),
				`Overview must mention component id '${comp.id}'`,
			);
		}
	});

	test("exportKnowledgeRegistryAsJson serializes and roundtrips without data loss", () => {
		const json = exportKnowledgeRegistryAsJson();
		assert.ok(typeof json === "string");
		const parsed = JSON.parse(json);
		assert.ok(Array.isArray(parsed));
		assert.strictEqual(parsed.length, CRM_COMPONENT_REGISTRY.length);
	});
});
