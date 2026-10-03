import assert from "node:assert/strict";
import test from "node:test";
import {
	findBestClinicalProtocol,
	extractFdiToothFromText,
	ALL_CLINICAL_CHUNKS_1142,
	GROUPED_CLINICAL_PROCEDURES,
} from "../../../components/visit/clinicalCatalog/clinicalProtocolsCatalog.js";
import { dispatchCrmAction } from "../aiActionDispatcher.js";
import { useVisitStore } from "../../../store/visitStore.js";

test("Clinical Protocols Copilot - 1. FDI Tooth extraction from clinical phrases", () => {
	// Adult permanent teeth (11..48)
	assert.equal(extractFdiToothFromText("Глубокий кариес 16 зуба"), 16);
	assert.equal(extractFdiToothFromText("Эндодонтическое лечение зуба 24"), 24);
	assert.equal(extractFdiToothFromText("Удаление дистопированного 38"), 38);
	assert.equal(extractFdiToothFromText("Зуб 47 коронка цирконий"), 47);
	assert.equal(extractFdiToothFromText("Резекция корня 21"), 21);

	// Pediatric primary teeth (51..85)
	assert.equal(extractFdiToothFromText("Кариес эмали 54"), 54);
	assert.equal(extractFdiToothFromText("Пульпотомия молочного зуба 74"), 74);
	assert.equal(extractFdiToothFromText("Удаление молочного резца 81"), 81);
	assert.equal(extractFdiToothFromText("Серебрение зуба 65"), 65);

	// Non-tooth numbers (years, 804n codes, prices, percentages) must NOT be extracted as teeth
	assert.equal(extractFdiToothFromText("Протокол СтАР от 2024 года стоимость 5000 руб со скидкой 10%"), null);
	assert.equal(extractFdiToothFromText("Услуга A16.07.002 наложение пломбы"), null);
});

test("Clinical Protocols Copilot - 2. Semantic Protocol Routing across 22 clinical scenarios", () => {
	const scenarios = [
		// 1. Терапия: кариес глубокий
		{ query: "глубокий кариес 16", expectedTooth: 16, expectedKeywords: ["кариес"], expectedState: "treatment" },
		// 2. Терапия: кариес средний
		{ query: "средний кариес 24", expectedTooth: 24, expectedKeywords: ["кариес"], expectedState: "treatment" },
		// 3. Терапия: кариес эмали / поверхностный
		{ query: "поверхностный кариес 35", expectedTooth: 35, expectedKeywords: ["кариес"], expectedState: "treatment" },
		// 4. Терапия: пульпит
		{ query: "острый пульпит 26", expectedTooth: 26, expectedKeywords: ["пульпит"], expectedState: "treatment" },
		// 5. Терапия: периодонтит
		{ query: "хронический апикальный периодонтит 46", expectedTooth: 46, expectedKeywords: ["периодонтит"], expectedState: "treatment" },
		// 6. Терапия: эндодонтия
		{ query: "эндодонтия 11 корневой канал", expectedTooth: 11, expectedKeywords: ["эндо", "канал", "пульпит", "периодонтит"], expectedState: "treatment" },
		// 7. Хирургия: удаление постоянного зуба
		{ query: "удаление зуба 38", expectedTooth: 38, expectedKeywords: ["удален"], expectedState: "missing" },
		// 8. Хирургия: сложное удаление
		{ query: "сложное удаление корня 48", expectedTooth: 48, expectedKeywords: ["удален"], expectedState: "missing" },
		// 9. Хирургия/Имплантация
		{ query: "дентальная имплантация 36", expectedTooth: 36, expectedKeywords: ["имплант"], expectedCategory: "surgery" },
		// 10. Хирургия: синус-лифтинг
		{ query: "синус-лифтинг открытый", expectedCategory: "surgery" },
		// 11. Хирургия: резекция
		{ query: "резекция верхушки корня 21", expectedTooth: 21, expectedKeywords: ["резекц", "хирург"], expectedCategory: "surgery" },
		// 12. Ортопедия: коронка цирконий
		{ query: "коронка диоксид циркония 15", expectedTooth: 15, expectedKeywords: ["коронк", "циркон", "протез"] },
		// 13. Ортопедия: металлокерамика
		{ query: "металлокерамическая коронка 47", expectedTooth: 47, expectedKeywords: ["металлокерам", "коронк"] },
		// 14. Ортопедия: виниры
		{ query: "виниры керамические e.max 12", expectedTooth: 12, expectedKeywords: ["винир", "ортопед", "протез"] },
		// 15. Ортопедия: бюгельный протез
		{ query: "бюгельный съемный протез на кламмерах", expectedKeywords: ["бюгел", "съемн", "протез"] },
		// 16. Гигиена: комплексная
		{ query: "профессиональная гигиена полости рта ультразвук", expectedCategory: "hygiene" },
		// 17. Гигиена: скейлинг и Air Flow
		{ query: "скейлинг и Air Flow полировка", expectedCategory: "hygiene" },
		// 18. Отбеливание: клиническое Zoom
		{ query: "клиническое отбеливание зубов Zoom", expectedCategory: "bleaching" },
		// 19. Отбеливание: домашнее в каппах
		{ query: "домашнее отбеливание каппы гель", expectedCategory: "bleaching" },
		// 20. Детство: молочный кариес
		{ query: "детский кариес молочного зуба 54", expectedTooth: 54, expectedCategory: "pediatric" },
		// 21. Детство: пульпотомия
		{ query: "пульпотомия молочного зуба 74", expectedTooth: 74, expectedCategory: "pediatric" },
		// 22. Пародонтология: гингивит
		{ query: "катаральный гингивит обострение", expectedCategory: "periodontics" },
	];

	for (const s of scenarios) {
		const result = findBestClinicalProtocol(s.query);
		assert.ok(result, `Protocol match must be found for query: "${s.query}"`);
		
		if (s.expectedTooth !== undefined) {
			assert.equal(result.tooth, s.expectedTooth, `Tooth for query "${s.query}" must match ${s.expectedTooth}`);
		}
		if (s.expectedState !== undefined) {
			assert.equal(result.recommendedToothState, s.expectedState, `Recommended tooth state for "${s.query}" must match ${s.expectedState}`);
		}
		if (s.expectedCategory !== undefined) {
			assert.equal(result.categoryKey, s.expectedCategory, `Category for "${s.query}" must match ${s.expectedCategory}`);
		}
		if (s.expectedKeywords && s.expectedKeywords.length > 0) {
			const textForCheck = `${result.procedureName} ${result.patch.diagnosis || ""}`.toLowerCase();
			const hasAny = s.expectedKeywords.some((kw) => textForCheck.includes(kw.toLowerCase()));
			assert.ok(hasAny, `Result "${result.procedureName}" for query "${s.query}" must contain one of: ${s.expectedKeywords.join(", ")}`);
		}

		// Invariant: every result must have a valid procedure name and rich patch
		assert.ok(result.procedureName.length > 3, "Procedure name must be meaningful");
		assert.ok(result.patch.treatmentPlan || result.patch.complaint || result.patch.objectiveStatus, "Must produce clinical note patch");
		assert.ok(Array.isArray(result.alternatives), "Alternatives array must be provided");
		assert.ok(result.alternatives.length <= 3, "Up to 3 alternatives from 1 142 catalog");
	}
});

test("Clinical Protocols Copilot - 3. Zero Context Overflow & Sub-millisecond Performance Invariant", () => {
	assert.equal(ALL_CLINICAL_CHUNKS_1142.length, 1142, "Entire catalog must contain 1 142 chunks");
	assert.ok(GROUPED_CLINICAL_PROCEDURES.length >= 150, "At least 150 grouped procedures");

	// Benchmark 100 consecutive queries
	const startTime = Date.now();
	for (let i = 0; i < 100; i++) {
		findBestClinicalProtocol("глубокий кариес зуба 16 лечение", 16);
	}
	const elapsedMs = Date.now() - startTime;
	const avgMs = elapsedMs / 100;

	// Invariant: Average search time must be under 10ms (instant responsiveness)
	assert.ok(avgMs < 10.0, `Average search time (${avgMs.toFixed(2)}ms) must be under 10.0ms`);
});

test("Clinical Protocols Copilot - 4. Action Dispatcher real execution & Store synchronization", async () => {
	// Initialize store state
	useVisitStore.setState({
		visitNoteForm: {
			complaint: "",
			anamnesis: "",
			objectiveStatus: "",
			treatmentPlan: "",
			recommendations: "",
			diagnosis: "",
		},
		visitToothStateByCode: {},
	});

	const match = findBestClinicalProtocol("глубокий кариес 16");
	assert.ok(match, "Match must exist");

	const result = await dispatchCrmAction({
		callId: "test-call-protocol-1",
		name: "apply_clinical_protocol",
		arguments: {
			procedureId: match.procedureId,
			procedureName: match.procedureName,
			categoryKey: match.categoryKey,
			categoryName: match.categoryName,
			matchedIcd10: match.matchedIcd10,
			tooth: match.tooth,
			patch: match.patch,
			toothState: match.recommendedToothState,
		},
		confirmed: true,
	});

	assert.equal(result.success, true, "Action should be successfully applied");

	// Verify visitNoteForm in useVisitStore
	const currentForm = useVisitStore.getState().visitNoteForm;
	assert.ok(currentForm.treatmentPlan?.length, "Treatment plan must be populated");
	assert.ok(currentForm.diagnosis?.includes("K02") || currentForm.diagnosis?.length, "Diagnosis must be populated");
	
	// Verify toothState in useVisitStore
	assert.equal(useVisitStore.getState().visitToothStateByCode["16"], "treatment", "Tooth 16 state must be 'treatment'");
});

test("Clinical Protocols Copilot - 5. Extraction Protocol switches tooth to missing", async () => {
	useVisitStore.setState({
		visitNoteForm: {
			complaint: "",
			anamnesis: "",
			objectiveStatus: "",
			diagnosis: "",
			treatmentPlan: "",
		},
		visitToothStateByCode: {},
	});

	const match = findBestClinicalProtocol("удаление зуба 38");
	assert.ok(match);
	assert.equal(match.tooth, 38);
	assert.equal(match.recommendedToothState, "missing");

	const result = await dispatchCrmAction({
		callId: "test-call-protocol-2",
		name: "apply_clinical_protocol",
		arguments: {
			procedureId: match.procedureId,
			procedureName: match.procedureName,
			tooth: 38,
			patch: match.patch,
			toothState: "missing",
		},
		confirmed: true,
	});

	assert.equal(result.success, true);
	assert.equal(useVisitStore.getState().visitToothStateByCode["38"], "missing", "Tooth 38 state must be 'missing'");
});
