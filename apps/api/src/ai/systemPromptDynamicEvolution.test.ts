/**
 * systemPromptDynamicEvolution.test.ts — Red Team Inquisition Test Suite
 *
 * Verifies AI-REV-04, AI-REV-05, AI-REV-07, AI-REV-11, AI-REV-12:
 * 1. AI-REV-04: Tool alias support for check_somatic_risks & check_somatic_risks_and_contraindications
 * 2. AI-REV-05 & AI-REV-07: Ingestion of activeTooth & activeVisitId in system prompt
 * 3. AI-REV-11: Zero IDE cargo-cult swarm text & zero cartoon emojis
 * 4. AI-REV-12: Complete removal of Soviet stationery (043/u, 54-FZ) in clinical protocol and invoice drafts
 * 5. Dynamic domain protocol adaptation (therapy, surgery, endodontics, orthopedics)
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	buildAgentSystemPrompt,
	detectClinicalProcedureDomain,
	MULTIMODAL_STUDY_INTERPRETATION_DIRECTIVE,
} from "./harness/systemPromptBuilder.js";
import {
	executeDentalTool,
	normalizeToolName,
} from "./dentalTools/index.js";
import { CLINICAL_SWARM_ROLES } from "./harness/swarmRoles.js";

test("AI-REV-04: normalizeToolName and executeDentalTool seamlessly resolve check_somatic_risks alias", async () => {
	// 1. Alias normalization check
	assert.equal(
		normalizeToolName("check_somatic_risks"),
		"check_somatic_risks_and_contraindications",
	);
	assert.equal(
		normalizeToolName("somatic_screening"),
		"check_somatic_risks_and_contraindications",
	);
	assert.equal(
		normalizeToolName("check_somatic_risks_and_contraindications"),
		"check_somatic_risks_and_contraindications",
	);

	// 2. Real tool execution with alias name check_somatic_risks
	const context = {
		organizationId: "11111111-1111-1111-1111-111111111111",
		runtimeMode: "web_browser" as const,
	};

	const result = (await executeDentalTool(
		"check_somatic_risks",
		{
			conditions: ["гипертония"],
			medications: ["варфарин"],
			allergies: ["пенициллин"],
			plannedIntervention: "tooth_extraction",
		},
		context,
	)) as Record<string, unknown>;

	assert.equal(typeof result, "object");
	assert.equal(result.safeToProceed, false);
	assert.ok(Array.isArray(result.highRiskFlags));
	assert.ok(
		(result.highRiskFlags as string[]).some((f) =>
			f.includes("кровотечения"),
		),
	);
});

test("AI-REV-05 & AI-REV-07: activeTooth and activeVisitId correctly injected into system prompt", () => {
	const dummyContext = {
		organizationId: "11111111-1111-1111-1111-111111111111",
		patientId: "patient-456",
		activeVisitId: "visit-9999",
		activeTooth: 36,
	};

	const prompt = buildAgentSystemPrompt(
		"web_browser",
		dummyContext,
		undefined,
		"orchestrator",
		undefined,
		undefined,
		"Стоматолог-терапевт",
		36,
		"visit-9999",
	);

	// Mandated exact strings
	assert.ok(
		prompt.includes(
			"АКТИВНЫЙ ЗУБ ВРАЧА У КРЕСЛА: Zub #36. При любых клинических вопросах фокус строго на этом зубе, если врач явно не указал другой.",
		),
	);
	assert.ok(prompt.includes("ТЕКУЩИЙ ВИЗИТ: #visit-9999"));
	assert.ok(prompt.includes("Активный пациент ID: patient-456"));
});

test("AI-REV-11: Zero IDE cargo-cult swarm text and zero cartoon emojis in swarm roles", () => {
	const forbiddenEmojis = ["🩻", "📞", "📋", "💳"];

	for (const [roleId, roleDef] of Object.entries(CLINICAL_SWARM_ROLES)) {
		// Zero cartoon emojis check
		for (const emoji of forbiddenEmojis) {
			assert.ok(
				!roleDef.titleRu.includes(emoji),
				`Role ${roleId} titleRu must not contain emoji ${emoji}`,
			);
			assert.ok(
				!roleDef.directive.includes(emoji),
				`Role ${roleId} directive must not contain emoji ${emoji}`,
			);
		}

		// Zero cargo-cult "Верховный Клинический Оркестратор L1"
		assert.ok(
			!roleDef.directive.includes("Верховный Клинический Оркестратор L1"),
			`Role ${roleId} must not contain cargo cult L1 orchestrator text`,
		);
		assert.ok(
			!roleDef.titleRu.includes("L1 Chairside Copilot Orchestrator"),
			`Role ${roleId} titleRu must use clean clinical Russian`,
		);
	}

	assert.ok(
		CLINICAL_SWARM_ROLES.orchestrator.directive.includes(
			"Ты — Единый клинический советник и копайлот врача-стоматолога CRM DENTE (Solo Chairside Copilot)",
		),
	);
});

test("AI-REV-12: Total removal of Soviet stationery (043/u) and 54-FZ bureaucracy", async () => {
	const context = {
		organizationId: "11111111-1111-1111-1111-111111111111",
		runtimeMode: "web_browser" as const,
	};

	// 1. Clinical protocol execution
	const protocolResult = (await executeDentalTool(
		"generate_form_043_entry",
		{
			toothNumber: 46,
			diagnosisMkb: "K02.1",
		},
		context,
	)) as Record<string, unknown>;

	const fullText = protocolResult.fullForm043Text as string;
	assert.ok(
		fullText.includes(
			"Медицинская карта приёма стоматологического пациента / Протокол приёма SOAP",
		),
	);
	assert.ok(!fullText.includes("ФОРМА № 043/У"));
	assert.ok(!fullText.includes("СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО"));

	// 2. Also supports alias generate_clinical_protocol
	const aliasResult = (await executeDentalTool(
		"generate_clinical_protocol",
		{
			toothNumber: 46,
			diagnosisMkb: "K02.1",
		},
		context,
	)) as Record<string, unknown>;

	assert.equal(aliasResult.toothNumber, 46);
});

test("Dynamic clinical domain protocol adaptation in system prompt", () => {
	// 1. Therapy domain detection & injection
	const therapyDomain = detectClinicalProcedureDomain("Стоматолог-терапевт");
	assert.equal(therapyDomain, "therapy");

	const therapyPrompt = buildAgentSystemPrompt(
		"web_browser",
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		"Стоматолог-терапевт",
	);
	assert.ok(
		therapyPrompt.includes(
			"КЛИНИЧЕСКИЙ ПРОТОКОЛ: ТЕРАПИЯ И ЭСТЕТИЧЕСКАЯ РЕСТАВРАЦИЯ",
		),
	);
	assert.ok(therapyPrompt.includes("коффердама"));
	assert.ok(therapyPrompt.includes("Адгезивный протокол"));

	// 2. Surgery domain detection & injection from user messages
	const surgeryMessages = [
		{ role: "user" as const, content: "Нужно провести сложное удаление зуба 38" },
	];
	const surgeryDomain = detectClinicalProcedureDomain(
		undefined,
		surgeryMessages,
	);
	assert.equal(surgeryDomain, "surgery");

	const surgeryPrompt = buildAgentSystemPrompt(
		"web_browser",
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		surgeryMessages,
	);
	assert.ok(
		surgeryPrompt.includes(
			"КЛИНИЧЕСКИЙ ПРОТОКОЛ: АМБУЛАТОРНАЯ ХИРУРГИЯ И ДЕНТАЛЬНАЯ ИМПЛАНТАЦИЯ",
		),
	);
	assert.ok(surgeryPrompt.includes("Socket Preservation"));

	// 3. Endodontics domain detection & injection
	const endoMessages = [
		{ role: "user" as const, content: "Острый пульпит, необходимо депульпирование и обработка каналов" },
	];
	const endoPrompt = buildAgentSystemPrompt(
		"web_browser",
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		endoMessages,
	);
	assert.ok(
		endoPrompt.includes(
			"КЛИНИЧЕСКИЙ ПРОТОКОЛ: ЭНДОДОНТИЯ И ЛЕЧЕНИЕ КОРНЕВЫХ КАНАЛОВ",
		),
	);
	assert.ok(endoPrompt.includes("NaOCl"));

	// 4. Orthopedics domain detection & injection
	const orthoMessages = [
		{ role: "user" as const, content: "Подготовка зуба под циркониевую коронку, снятие слепков" },
	];
	const orthoPrompt = buildAgentSystemPrompt(
		"web_browser",
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		orthoMessages,
	);
	assert.ok(
		orthoPrompt.includes(
			"КЛИНИЧЕСКИЙ ПРОТОКОЛ: ОРТОПЕДИЧЕСКАЯ СТОМАТОЛОГИЯ",
		),
	);
	assert.ok(orthoPrompt.includes("Феррул-эффект"));
});

test("Multimodal dental imaging analysis protocol (RVG, OPTG, CBCT, polish artifacts) integration", () => {
	assert.ok(
		MULTIMODAL_STUDY_INTERPRETATION_DIRECTIVE.includes(
			"ПРОТОКОЛ МУЛЬТИМОДАЛЬНОГО АНАЛИЗА СТОМАТОЛОГИЧЕСКИХ СНИМКОВ (STOMCHAT VISION SSOT)",
		),
	);
	assert.ok(
		MULTIMODAL_STUDY_INTERPRETATION_DIRECTIVE.includes(
			"ДИФФЕРЕНЦИАЦИЯ СВЕТОВЫХ БЛИКОВ ПОЛИРА И ОПТИЧЕСКИХ АРТЕФАКТОВ ОТ ВТОРИЧНОГО КАРИЕСА",
		),
	);
	assert.ok(
		MULTIMODAL_STUDY_INTERPRETATION_DIRECTIVE.includes(
			"ПРИЦЕЛЬНАЯ РАДИОВИЗИОГРАФИЯ (RVG)",
		),
	);
	assert.ok(
		MULTIMODAL_STUDY_INTERPRETATION_DIRECTIVE.includes(
			"ОРТОПАНТОМОГРАФИЯ (ОПТГ)",
		),
	);
	assert.ok(
		MULTIMODAL_STUDY_INTERPRETATION_DIRECTIVE.includes(
			"КОНУСНО-ЛУЧЕВАЯ КОМПЬЮТЕРНАЯ ТОМОГРАФИЯ (КЛКТ 3D)",
		),
	);
	assert.ok(
		MULTIMODAL_STUDY_INTERPRETATION_DIRECTIVE.includes(
			"MB2 в мезиально-щечном корне",
		),
	);

	const prompt = buildAgentSystemPrompt("web_browser");
	assert.ok(
		prompt.includes(
			"ПРОТОКОЛ МУЛЬТИМОДАЛЬНОГО АНАЛИЗА СТОМАТОЛОГИЧЕСКИХ СНИМКОВ (STOMCHAT VISION SSOT)",
		),
	);
	assert.ok(
		prompt.includes(
			"ДИФФЕРЕНЦИАЦИЯ СВЕТОВЫХ БЛИКОВ ПОЛИРА И ОПТИЧЕСКИХ АРТЕФАКТОВ ОТ ВТОРИЧНОГО КАРИЕСА",
		),
	);
	assert.ok(prompt.includes("Принял световой блик полира за избыток композита"));
});

