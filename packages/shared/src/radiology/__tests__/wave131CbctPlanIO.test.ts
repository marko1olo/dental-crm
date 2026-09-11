/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 131: CBCT SURGICAL PLAN PERSISTENCE & CASE IO ENGINE TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * 100% Zero-Mock comprehensive unit tests for:
 * 1. Plan serialization & deserialization roundtrip (PlanCase document)
 * 2. Hostile/corrupted input defense:
 *    - Memory exhaustion (clamping >100 implants, >2000 canal points, >200 arch points)
 *    - NaN / Infinity injection rejection & coordinate sanitization
 *    - Invalid FDI tooth numbers (11..48 verification)
 * 3. Active DICOM StudyInstanceUID & PatientId mismatch detection
 * 4. Regulatory Form 043/u A4 protocol generation with strict 0 emojis audit (Mandate 8d)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	PLAN_IO_VERSION,
	MAX_PLAN_IMPLANTS,
	MAX_CANAL_SPLINE_POINTS,
	MAX_ARCH_CONTROL_POINTS,
	isValidPermanentFdiToothNumber,
	implantPlanItemSchema,
	planCaseSchema,
	serializePlanCase,
	parseAndSanitizePlanCase,
	formatSurgicalPlanForm043A4Protocol,
	type PlanCase,
} from "../cbctPlanIOEngine.js";

describe("Wave 131: CBCT Surgical Plan Persistence & Case IO Engine", () => {
	// Comprehensive reference plan case
	const referencePlan: PlanCase = {
		version: PLAN_IO_VERSION,
		savedAt: "2026-09-12T01:30:00.000Z",
		studyInstanceUID: "1.2.840.113619.2.55.3.60468842.671.1601283921.432",
		seriesInstanceUID: "1.2.840.113619.2.55.3.60468842.671.1601283921.433",
		patientId: "PAT-043-9821",
		doctorId: "DOC-KUZNETSOV-M",
		implants: [
			{
				id: "IMP-36",
				toothNumber: 36,
				implantModel: "Osstem TS III SA 4.0x10",
				lengthMm: 10.0,
				diameterMm: 4.0,
				platformDiameterMm: 3.8,
				position: [14.5, -12.3, 5.0],
				direction: [0, 0, -1],
				rollDeg: 12.0,
				safetyMarginMm: 2.0,
			},
			{
				id: "IMP-46",
				toothNumber: 46,
				implantModel: "Straumann BLX 4.5x10",
				lengthMm: 10.0,
				diameterMm: 4.5,
				platformDiameterMm: 4.0,
				position: [-15.2, -11.8, 5.2],
				direction: [0, 0.05, -0.998],
				rollDeg: 0,
				safetyMarginMm: 1.5,
			},
		],
		nerveCanals: [
			{
				id: "IAN-L",
				side: "left",
				points: [
					[10.0, -5.0, 0.0],
					[12.5, -8.0, 2.2],
					[14.0, -12.0, 4.5],
					[16.2, -18.0, 7.1],
				],
				mentalForamen: [15.0, -4.2, 0.5],
			},
			{
				id: "IAN-R",
				side: "right",
				points: [
					[-10.0, -5.0, 0.0],
					[-12.5, -8.0, 2.2],
					[-14.0, -12.0, 4.5],
					[-16.2, -18.0, 7.1],
				],
				mentalForamen: [-15.0, -4.2, 0.5],
			},
		],
		archCurve: {
			controlPoints: [
				[-25.0, -20.0],
				[-15.0, 0.0],
				[0.0, 10.0],
				[15.0, 0.0],
				[25.0, -20.0],
			],
			slabWidthMm: 20.0,
			projectionMode: "mip",
			resolutionMm: 0.25,
			crossSectionPosition: 0.65,
			crossSectionTiltDeg: 5.0,
		},
		surgicalGuide: {
			sleeveDiameterMm: 5.0,
			sleeveHeightMm: 4.0,
			offsetClearanceMm: 0.2,
			wallThicknessMm: 2.5,
			fixationPins: [
				[-20.0, -15.0, 5.0, 0.5, 0.0, -0.866],
				[20.0, -15.0, 5.0, -0.5, 0.0, -0.866],
			],
		},
		safetyLimits: {
			minCanalDistanceMm: 2.0,
			minRootDistanceMm: 1.5,
			minCorticalClearanceMm: 1.0,
		},
		notes: "Планируется навигационная хирургия с винтовой фиксацией шаблона пинами.",
	};

	// ── 1. FDI Tooth Number Validation ─────────────────────────────

	describe("1. FDI Tooth Notation Validation", () => {
		it("accepts all valid permanent dentition FDI numbers (11..18, 21..28, 31..38, 41..48)", () => {
			for (let q = 1; q <= 4; q++) {
				for (let t = 1; t <= 8; t++) {
					const fdi = q * 10 + t;
					assert.strictEqual(
						isValidPermanentFdiToothNumber(fdi),
						true,
						`FDI tooth ${fdi} must be valid`,
					);
				}
			}
		});

		it("rejects invalid teeth notation (0, 10, 19, 29, 39, 49, 50, 99)", () => {
			const invalid = [0, 9, 10, 19, 20, 29, 30, 39, 40, 49, 50, 51, 85, 99, -16];
			for (const tooth of invalid) {
				assert.strictEqual(
					isValidPermanentFdiToothNumber(tooth),
					false,
					`Tooth ${tooth} must be rejected as invalid permanent FDI`,
				);
			}
		});

		it("validates implantPlanItemSchema with FDI refinement", () => {
			const validItem = {
				id: "IMP-11",
				toothNumber: 11,
				implantModel: "Standard",
				lengthMm: 11.5,
				diameterMm: 3.5,
				platformDiameterMm: 3.5,
				position: [0, 0, 0] as [number, number, number],
				direction: [0, 0, -1] as [number, number, number],
				rollDeg: 0,
				safetyMarginMm: 1.5,
			};
			assert.doesNotThrow(() => implantPlanItemSchema.parse(validItem));

			const invalidItem = { ...validItem, toothNumber: 19 };
			assert.throws(() => implantPlanItemSchema.parse(invalidItem));
		});
	});

	// ── 2. Serialization & Deserialization Roundtrip ───────────────

	describe("2. Plan Serialization & Deserialization Roundtrip", () => {
		it("serializes valid PlanCase into deterministic, formatted JSON", () => {
			const json = serializePlanCase(referencePlan);
			assert.strictEqual(typeof json, "string");
			assert.ok(json.length > 200);

			const parsed = JSON.parse(json);
			assert.strictEqual(parsed.version, PLAN_IO_VERSION);
			assert.strictEqual(parsed.patientId, "PAT-043-9821");
			assert.strictEqual(parsed.implants.length, 2);
			assert.strictEqual(parsed.nerveCanals.length, 2);
			assert.strictEqual(parsed.archCurve.controlPoints.length, 5);
			assert.strictEqual(parsed.surgicalGuide.fixationPins.length, 2);
		});

		it("deserializes and reconstructs full PlanCase with mathematical equality", () => {
			const json = serializePlanCase(referencePlan);
			const result = parseAndSanitizePlanCase(json, {
				studyInstanceUID: referencePlan.studyInstanceUID!,
				patientId: referencePlan.patientId!,
			});

			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.errors.length, 0);
			assert.strictEqual(result.studyMismatch, false);
			assert.strictEqual(result.patientMismatch, false);
			assert.ok(result.plan !== null);

			// Deep equality on complete structure
			assert.deepStrictEqual(result.plan, referencePlan);
		});

		it("handles plan with nullish optional fields (no archCurve, no guide)", () => {
			const minimalPlan: PlanCase = {
				version: 1,
				savedAt: "2026-09-12T01:00:00.000Z",
				studyInstanceUID: null,
				seriesInstanceUID: null,
				patientId: null,
				doctorId: null,
				implants: [],
				nerveCanals: [],
				archCurve: null,
				surgicalGuide: null,
				safetyLimits: {
					minCanalDistanceMm: 2.0,
					minRootDistanceMm: 1.5,
					minCorticalClearanceMm: 1.0,
				},
				notes: "",
			};

			const json = serializePlanCase(minimalPlan);
			const result = parseAndSanitizePlanCase(json);
			assert.strictEqual(result.isValid, true);
			assert.ok(result.plan !== null);
			assert.strictEqual(result.plan.implants.length, 0);
			assert.strictEqual(result.plan.archCurve, null);
			assert.strictEqual(result.plan.surgicalGuide, null);
		});
	});

	// ── 3. Hostile & Corrupted Input Defense ────────────────────────

	describe("3. Defense Against Hostile and Corrupted Input", () => {
		it("clamps memory exhaustion attacks (>100 implants capped to 100)", () => {
			const bloatedImplants = [];
			for (let i = 0; i < 150; i++) {
				bloatedImplants.push({
					id: `IMP-${i + 1}`,
					toothNumber: 36,
					implantModel: "StressTest",
					lengthMm: 10.0,
					diameterMm: 4.0,
					platformDiameterMm: 4.0,
					position: [i * 0.1, 0, 0],
					direction: [0, 0, -1],
					rollDeg: 0,
					safetyMarginMm: 1.5,
				});
			}

			const payload = {
				version: 1,
				savedAt: new Date().toISOString(),
				implants: bloatedImplants,
			};

			const result = parseAndSanitizePlanCase(JSON.stringify(payload));
			assert.strictEqual(result.isValid, true);
			assert.ok(result.plan !== null);
			assert.strictEqual(result.plan.implants.length, MAX_PLAN_IMPLANTS);
			assert.ok(
				result.warnings.some((w) => w.includes("Превышен лимит имплантатов (150 > 100)")),
			);
		});

		it("clamps bloated canal spline points (>2000 points capped to 2000)", () => {
			const bloatedPoints: [number, number, number][] = [];
			for (let i = 0; i < 2500; i++) {
				bloatedPoints.push([i * 0.01, 0, 0]);
			}

			const payload = {
				version: 1,
				savedAt: new Date().toISOString(),
				nerveCanals: [
					{
						id: "IAN-MASSIVE",
						side: "left",
						points: bloatedPoints,
					},
				],
			};

			const result = parseAndSanitizePlanCase(JSON.stringify(payload));
			assert.strictEqual(result.isValid, true);
			assert.ok(result.plan !== null);
			assert.strictEqual(
				result.plan.nerveCanals[0]!.points.length,
				MAX_CANAL_SPLINE_POINTS,
			);
			assert.ok(result.warnings.some((w) => w.includes("превышен лимит точек")));
		});

		it("clamps bloated arch control points (>200 points capped to 200)", () => {
			const bloatedArch: [number, number][] = [];
			for (let i = 0; i < 300; i++) {
				bloatedArch.push([i * 0.1, Math.sin(i)]);
			}

			const payload = {
				version: 1,
				savedAt: new Date().toISOString(),
				archCurve: {
					controlPoints: bloatedArch,
					slabWidthMm: 20,
					projectionMode: "mip",
				},
			};

			const result = parseAndSanitizePlanCase(JSON.stringify(payload));
			assert.strictEqual(result.isValid, true);
			assert.ok(result.plan !== null);
			assert.strictEqual(
				result.plan.archCurve!.controlPoints.length,
				MAX_ARCH_CONTROL_POINTS,
			);
			assert.ok(result.warnings.some((w) => w.includes("Кривая зубной дуги: превышен лимит")));
		});

		it("drops implants with NaN or Infinity coordinates without crashing", () => {
			const corruptPayload = {
				version: 1,
				savedAt: new Date().toISOString(),
				implants: [
					// 1. Corrupt position with NaN
					{
						id: "CORRUPT-NAN-POS",
						toothNumber: 36,
						implantModel: "Bad1",
						lengthMm: 10.0,
						diameterMm: 4.0,
						platformDiameterMm: 4.0,
						position: [Number.NaN, 0, 0],
						direction: [0, 0, -1],
					},
					// 2. Corrupt direction with Infinity
					{
						id: "CORRUPT-INF-DIR",
						toothNumber: 37,
						implantModel: "Bad2",
						lengthMm: 10.0,
						diameterMm: 4.0,
						platformDiameterMm: 4.0,
						position: [10, 0, 0],
						direction: [0, Number.POSITIVE_INFINITY, -1],
					},
					// 3. Corrupt dimension with -Infinity
					{
						id: "CORRUPT-INF-LEN",
						toothNumber: 35,
						implantModel: "Bad3",
						lengthMm: Number.NEGATIVE_INFINITY,
						diameterMm: 4.0,
						platformDiameterMm: 4.0,
						position: [5, 0, 0],
						direction: [0, 0, -1],
					},
					// 4. Valid implant
					{
						id: "VALID-IMP",
						toothNumber: 36,
						implantModel: "ValidModel",
						lengthMm: 10.0,
						diameterMm: 4.0,
						platformDiameterMm: 4.0,
						position: [12.0, -8.0, 2.0],
						direction: [0, 0, -1],
						rollDeg: 0,
						safetyMarginMm: 1.5,
					},
				],
			};

			const jsonStr = JSON.stringify(corruptPayload)
				.replace("null", "NaN")
				.replace("null", "Infinity");

			const result = parseAndSanitizePlanCase(JSON.stringify(corruptPayload));
			assert.strictEqual(result.isValid, true);
			assert.ok(result.plan !== null);
			// 3 corrupt implants dropped, 1 valid remains
			assert.strictEqual(result.plan.implants.length, 1);
			assert.strictEqual(result.plan.implants[0]!.id, "VALID-IMP");
			assert.ok(result.warnings.length >= 3);
		});

		it("safely handles non-object and malformed JSON strings", () => {
			const emptyRes = parseAndSanitizePlanCase("");
			assert.strictEqual(emptyRes.isValid, false);
			assert.strictEqual(emptyRes.plan, null);

			const brokenJsonRes = parseAndSanitizePlanCase("{ invalid json [[");
			assert.strictEqual(brokenJsonRes.isValid, false);
			assert.ok(brokenJsonRes.errors[0]!.includes("Синтаксическая ошибка JSON"));

			const arrayRes = parseAndSanitizePlanCase("[1, 2, 3]");
			assert.strictEqual(arrayRes.isValid, false);
			assert.ok(arrayRes.errors[0]!.includes("должен быть объектом"));
		});
	});

	// ── 4. DICOM Study & Patient Mismatch Detection ────────────────

	describe("4. DICOM Study & Patient Mismatch Detection", () => {
		it("detects studyInstanceUID mismatch against active viewer context", () => {
			const json = serializePlanCase(referencePlan);
			const result = parseAndSanitizePlanCase(json, {
				studyInstanceUID: "9.9.999.DIFFERENT.STUDY.UID",
				patientId: referencePlan.patientId!,
			});

			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.studyMismatch, true);
			assert.strictEqual(result.patientMismatch, false);
			assert.ok(
				result.warnings.some((w) =>
					w.includes("Несоответствие исследования: план был сохранен для StudyInstanceUID"),
				),
			);
		});

		it("detects patientId mismatch against active viewer context", () => {
			const json = serializePlanCase(referencePlan);
			const result = parseAndSanitizePlanCase(json, {
				studyInstanceUID: referencePlan.studyInstanceUID!,
				patientId: "PAT-ANOTHER-PERSON-999",
			});

			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.studyMismatch, false);
			assert.strictEqual(result.patientMismatch, true);
			assert.ok(
				result.warnings.some((w) =>
					w.includes("Несоответствие пациента: план был сохранен для пациента"),
				),
			);
		});

		it("reports clean match when study and patient match active context", () => {
			const json = serializePlanCase(referencePlan);
			const result = parseAndSanitizePlanCase(json, {
				studyInstanceUID: referencePlan.studyInstanceUID!,
				patientId: referencePlan.patientId!,
			});

			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.studyMismatch, false);
			assert.strictEqual(result.patientMismatch, false);
		});
	});

	// ── 5. Form 043/u A4 Protocol Generation & 0 Emojis Audit ──────

	describe("5. Form 043/u A4 Protocol Generation & Strict 0 Emojis Audit", () => {
		it("generates comprehensive, well-structured Form 043/u A4 protocol", () => {
			const protocol = formatSurgicalPlanForm043A4Protocol(referencePlan);

			// Title & metadata
			assert.ok(protocol.includes("РЕГЛАМЕНТНЫЙ ХИРУРГИЧЕСКИЙ ПРОТОКОЛ ПЛАНИРОВАНИЯ ИМПЛАНТАЦИИ"));
			assert.ok(protocol.includes("PAT-043-9821"));
			assert.ok(protocol.includes("DOC-KUZNETSOV-M"));
			assert.ok(protocol.includes(referencePlan.studyInstanceUID!));

			// Implants section
			assert.ok(protocol.includes("Зуб по FDI: 36"));
			assert.ok(protocol.includes("Osstem TS III SA 4.0x10"));
			assert.ok(protocol.includes("Зуб по FDI: 46"));
			assert.ok(protocol.includes("Straumann BLX 4.5x10"));
			assert.ok(protocol.includes("Точка входа платформы"));
			assert.ok(protocol.includes("Вектор оси установки"));

			// Nerve canal section
			assert.ok(protocol.includes("АНАТОМИЧЕСКИЕ СТРУКТУРЫ РИСКА"));
			assert.ok(protocol.includes("IAN-L"));
			assert.ok(protocol.includes("IAN-R"));
			assert.ok(protocol.includes("Ментальное отверстие"));

			// CPR & Arch section
			assert.ok(protocol.includes("ПАНОРАМНАЯ РЕКОНСТРУКЦИЯ И КРИВАЯ ЗУБНОЙ ДУГИ (CPR)"));
			assert.ok(protocol.includes("20.0 мм"));
			assert.ok(protocol.includes("MIP"));

			// Surgical guide section
			assert.ok(protocol.includes("НАВИГАЦИОННОГО ХИРУРГИЧЕСКОГО ШАБЛОНА"));
			assert.ok(protocol.includes("5.0 мм"));
			assert.ok(protocol.includes("Количество пинов фиксации          : 2"));

			// Safety limits
			assert.ok(protocol.includes("Минимальный зазор до канала IAN    : 2.0 мм"));
			assert.ok(protocol.includes("Минимальный зазор до корней зубов  : 1.5 мм"));

			// Legal & clinical verdict
			assert.ok(protocol.includes("рекомендаций СтАР"));
			assert.ok(protocol.includes("Врач хирург-имплантолог: ____________________ / DOC-KUZNETSOV-M /"));
			assert.ok(protocol.includes("М.П. Клиники"));
		});

		it("strictly contains ZERO cartoon emojis per Mandate 8d item 7", () => {
			const protocol = formatSurgicalPlanForm043A4Protocol(referencePlan);

			// Comprehensive Unicode emoji pattern covering all emoji blocks
			const emojiRegex =
				/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/u;

			const hasEmoji = emojiRegex.test(protocol);
			assert.strictEqual(
				hasEmoji,
				false,
				"Mandate 8d item 7 violation: Form 043/u clinical protocol must strictly contain ZERO cartoon emojis!",
			);
		});

		it("handles empty/minimal plan case without throwing and formats cleanly", () => {
			const emptyPlan: PlanCase = {
				version: 1,
				savedAt: "2026-09-12T01:00:00.000Z",
				studyInstanceUID: null,
				seriesInstanceUID: null,
				patientId: null,
				doctorId: null,
				implants: [],
				nerveCanals: [],
				archCurve: null,
				surgicalGuide: null,
				safetyLimits: {
					minCanalDistanceMm: 2.0,
					minRootDistanceMm: 1.5,
					minCorticalClearanceMm: 1.0,
				},
				notes: "",
			};

			const protocol = formatSurgicalPlanForm043A4Protocol(emptyPlan);
			assert.ok(protocol.includes("Запланированные имплантаты отсутствуют."));
			assert.ok(protocol.includes("Трассировка нижнечелюстных каналов (IAN) не зафиксирована."));
			assert.ok(protocol.includes("Зубная дуга не размечена."));
			assert.ok(protocol.includes("Навигационный хирургический шаблон не спланирован."));

			const emojiRegex =
				/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/u;
			assert.strictEqual(emojiRegex.test(protocol), false);
		});
	});
});
