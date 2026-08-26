import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	ALL_FDI_TEETH,
	ALEXANDER_018_PRESCRIPTION,
	BRACKET_PRESCRIPTIONS,
	calculateTorqueDeviation,
	comparePrescriptions,
	createDefaultPatientBracketMatrix,
	DAMON_Q_HIGH_TORQUE_PRESCRIPTION,
	DAMON_Q_LOW_TORQUE_PRESCRIPTION,
	DAMON_Q_STANDARD_PRESCRIPTION,
	formatToothNameFdi,
	getPrescription,
	getQuadrant,
	isAnteriorTooth,
	isLowerTooth,
	isUpperTooth,
	LOWER_ARCH_TEETH,
	MBT_022_PRESCRIPTION,
	ROTH_022_PRESCRIPTION,
	UPPER_ARCH_TEETH,
} from "../components/orthodontics/bracketPrescriptions";
import {
	calculateTorquePlay,
	ELASTICS_PRESETS,
	generateOrthodonticVisitSoapNote,
	getArchwiresByStage,
	getArchwireSpec,
	getStandardSequenceForPrescription,
	MATERIAL_LABELS,
	STAGE_LABELS,
	STANDARD_ARCHWIRES,
	validateWireProgression,
} from "../components/orthodontics/orthodonticWireSequencer";
import { OrthodonticBracketMatrixModal } from "../components/orthodontics/OrthodonticBracketMatrixModal";

describe("Orthodontic Bracket Matrix & Wire Sequencer Engine (Wave 5)", () => {
	// ─── 1. Roth .022 Prescription Math ───
	it("1. Roth .022 prescription matches canonical orthodontic torque/angulation values", () => {
		assert.equal(ROTH_022_PRESCRIPTION.slotSize, ".022");
		assert.equal(ROTH_022_PRESCRIPTION.ligatingType, "conventional_ligating");

		// Upper Central Incisor (11, 21): +12° Torque, +5° Angulation
		assert.equal(ROTH_022_PRESCRIPTION.teeth[11]?.nominalTorque, 12);
		assert.equal(ROTH_022_PRESCRIPTION.teeth[11]?.nominalAngulation, 5);
		assert.equal(ROTH_022_PRESCRIPTION.teeth[21]?.nominalTorque, 12);

		// Upper Canine (13, 23): -2° Torque, +11° Angulation, +4° Distal Offset
		assert.equal(ROTH_022_PRESCRIPTION.teeth[13]?.nominalTorque, -2);
		assert.equal(ROTH_022_PRESCRIPTION.teeth[13]?.nominalAngulation, 11);
		assert.equal(ROTH_022_PRESCRIPTION.teeth[13]?.nominalRotation, 4);

		// Lower Molars (36, 46): -30° Torque (deep lingual root compensation)
		assert.equal(ROTH_022_PRESCRIPTION.teeth[36]?.nominalTorque, -30);
		assert.equal(ROTH_022_PRESCRIPTION.teeth[46]?.nominalTorque, -30);
		assert.equal(ROTH_022_PRESCRIPTION.teeth[46]?.nominalRotation, 4);
	});

	// ─── 2. MBT .022 Prescription Math ───
	it("2. MBT .022 prescription features increased incisor torque and reduced canine tip", () => {
		assert.equal(MBT_022_PRESCRIPTION.slotSize, ".022");

		// Upper Central Incisor: +17° Torque (higher than Roth +12° for sliding retraction)
		assert.equal(MBT_022_PRESCRIPTION.teeth[11]?.nominalTorque, 17);
		assert.equal(MBT_022_PRESCRIPTION.teeth[11]?.nominalAngulation, 4);

		// Upper Canine: -7° Torque, +8° Angulation (reduced tip compared to Roth +11°)
		assert.equal(MBT_022_PRESCRIPTION.teeth[13]?.nominalTorque, -7);
		assert.equal(MBT_022_PRESCRIPTION.teeth[13]?.nominalAngulation, 8);

		// Lower Incisors: -6° Torque (preserves root in cancellous symphysis bone)
		assert.equal(MBT_022_PRESCRIPTION.teeth[31]?.nominalTorque, -6);
		assert.equal(MBT_022_PRESCRIPTION.teeth[41]?.nominalTorque, -6);

		// Lower First Molar: -20° Torque (less extreme than Roth -30°)
		assert.equal(MBT_022_PRESCRIPTION.teeth[36]?.nominalTorque, -20);
	});

	// ─── 3. Damon Q Standard Torque ───
	it("3. Damon Q Standard .022 passive self-ligating features neutral canine and positive lower canine torque", () => {
		assert.equal(DAMON_Q_STANDARD_PRESCRIPTION.slotSize, ".022");
		assert.equal(DAMON_Q_STANDARD_PRESCRIPTION.ligatingType, "self_ligating");

		// Upper Canine: 0° neutral torque
		assert.equal(DAMON_Q_STANDARD_PRESCRIPTION.teeth[13]?.nominalTorque, 0);
		assert.equal(DAMON_Q_STANDARD_PRESCRIPTION.teeth[23]?.nominalTorque, 0);

		// Lower Canine: +7° positive torque
		assert.equal(DAMON_Q_STANDARD_PRESCRIPTION.teeth[33]?.nominalTorque, 7);
		assert.equal(DAMON_Q_STANDARD_PRESCRIPTION.teeth[43]?.nominalTorque, 7);

		// Upper Molars: +12° distal offset
		assert.equal(DAMON_Q_STANDARD_PRESCRIPTION.teeth[16]?.nominalRotation, 12);
	});

	// ─── 4. Damon Q High Torque Option ───
	it("4. Damon Q High Torque option provides +17° incisor and +11° canine torque for Class II div 2", () => {
		assert.equal(DAMON_Q_HIGH_TORQUE_PRESCRIPTION.teeth[11]?.nominalTorque, 17);
		assert.equal(DAMON_Q_HIGH_TORQUE_PRESCRIPTION.teeth[21]?.nominalTorque, 17);
		assert.equal(DAMON_Q_HIGH_TORQUE_PRESCRIPTION.teeth[13]?.nominalTorque, 11);
		assert.equal(DAMON_Q_HIGH_TORQUE_PRESCRIPTION.teeth[33]?.nominalTorque, 13);
	});

	// ─── 5. Damon Q Low Torque Option ───
	it("5. Damon Q Low Torque option prevents incisor flare with +2° upper and -11° lower incisor torque", () => {
		assert.equal(DAMON_Q_LOW_TORQUE_PRESCRIPTION.teeth[11]?.nominalTorque, 2);
		assert.equal(DAMON_Q_LOW_TORQUE_PRESCRIPTION.teeth[21]?.nominalTorque, 2);
		assert.equal(DAMON_Q_LOW_TORQUE_PRESCRIPTION.teeth[31]?.nominalTorque, -11);
		assert.equal(DAMON_Q_LOW_TORQUE_PRESCRIPTION.teeth[41]?.nominalTorque, -11);
		assert.equal(DAMON_Q_LOW_TORQUE_PRESCRIPTION.teeth[13]?.nominalTorque, -9);
	});

	// ─── 6. Alexander .018 Discipline ───
	it("6. Alexander Discipline .018 implements slot .018 with +14° incisor and -25° molar torque", () => {
		assert.equal(ALEXANDER_018_PRESCRIPTION.slotSize, ".018");
		assert.equal(ALEXANDER_018_PRESCRIPTION.teeth[11]?.nominalTorque, 14);
		assert.equal(ALEXANDER_018_PRESCRIPTION.teeth[13]?.nominalAngulation, 10);
		assert.equal(ALEXANDER_018_PRESCRIPTION.teeth[46]?.nominalTorque, -25);
		assert.equal(ALEXANDER_018_PRESCRIPTION.teeth[46]?.nominalRotation, 6);
	});

	// ─── 7. Prescription Comparison Matrix Engine ───
	it("7. comparePrescriptions calculates exact delta values across all 32 teeth", () => {
		const comp = comparePrescriptions("roth_022", "mbt_022");
		assert.equal(comp.length, 32);

		const tooth11 = comp.find((c) => c.toothNumber === 11);
		assert.ok(tooth11);
		assert.equal(tooth11.baseTorque, 12);
		assert.equal(tooth11.targetTorque, 17);
		assert.equal(tooth11.torqueDiff, 5); // +17 - +12 = +5°
		assert.equal(tooth11.angulationDiff, -1); // +4 - +5 = -1°

		const tooth13 = comp.find((c) => c.toothNumber === 13);
		assert.ok(tooth13);
		assert.equal(tooth13.baseTorque, -2);
		assert.equal(tooth13.targetTorque, -7);
		assert.equal(tooth13.torqueDiff, -5); // -7 - (-2) = -5°
	});

	// ─── 8. Custom Torque Deviation Analyzer ───
	it("8. calculateTorqueDeviation detects significant labial/lingual root deviations", () => {
		// Doctor customizes tooth 11 on Roth to +20° (+8° deviation >= 5°)
		const devHigh = calculateTorqueDeviation(11, 20, "roth_022");
		assert.equal(devHigh.nominalTorque, 12);
		assert.equal(devHigh.deviation, 8);
		assert.equal(devHigh.isSignificant, true);
		assert.equal(devHigh.direction, "labial_root");

		// Minor customization +13° (+1° deviation < 5°)
		const devMinor = calculateTorqueDeviation(11, 13, "roth_022");
		assert.equal(devMinor.deviation, 1);
		assert.equal(devMinor.isSignificant, false);

		// Negative torque deviation
		const devLow = calculateTorqueDeviation(11, 2, "roth_022");
		assert.equal(devLow.deviation, -10);
		assert.equal(devLow.direction, "lingual_root");
	});

	// ─── 9. Patient Bracket Matrix Initializer ───
	it("9. createDefaultPatientBracketMatrix initializes 32 teeth with proper default states", () => {
		const matrix = createDefaultPatientBracketMatrix("damon_q_standard");
		assert.equal(Object.keys(matrix).length, 32);

		// Central incisor should be fixed with nominal torque 12
		assert.equal(matrix[11]?.status, "fixed");
		assert.equal(matrix[11]?.customTorque, 12);
		assert.equal(matrix[11]?.slotSize, ".022");

		// 8th wisdom molars (18, 28, 38, 48) default to not_indicated
		assert.equal(matrix[18]?.status, "not_indicated");
		assert.equal(matrix[28]?.status, "not_indicated");
		assert.equal(matrix[38]?.status, "not_indicated");
		assert.equal(matrix[48]?.status, "not_indicated");
	});

	// ─── 10. Torsional Play & Clearance Mathematics ───
	it("10. calculateTorquePlay calculates clearance angle and torque transmission percentage", () => {
		// 1. Round wire .014 in .022 slot: 90° play, 0% torque
		const roundPlay = calculateTorquePlay(".014", ".022");
		assert.equal(roundPlay.playAngleDegrees, 90);
		assert.equal(roundPlay.maxTorqueTransmissionPercent, 0);
		assert.equal(roundPlay.isTorqueActive, false);

		// 2. Rectangular wire .019x.025 in .022 slot: ~10.5° play, ~72% transmission
		const mainWorking = calculateTorquePlay(".019x.025", ".022");
		assert.equal(mainWorking.isTorqueActive, true);
		assert.ok(mainWorking.playAngleDegrees >= 6.0 && mainWorking.playAngleDegrees <= 8.0);
		assert.equal(mainWorking.maxTorqueTransmissionPercent, 72);

		// 3. Heavy wire .021x.025 in .022 slot: ~2.4° play, ~96% transmission
		const maxTorque = calculateTorquePlay(".021x.025", ".022");
		assert.ok(maxTorque.playAngleDegrees <= 5.0);
		assert.equal(maxTorque.maxTorqueTransmissionPercent, 96);

		// 4. Rectangular wire .016x.022 in .018 slot: ~5.5° play, ~88% transmission
		const alexWorking = calculateTorquePlay(".016x.022", ".018");
		assert.ok(alexWorking.playAngleDegrees <= 6.0);
		assert.equal(alexWorking.maxTorqueTransmissionPercent, 88);
	});

	// ─── 11. Wire Progression Safety Validation ───
	it("11. validateWireProgression prevents dangerous step jumps and slot size mismatches", () => {
		// Valid sequential transition
		const step1 = validateWireProgression(".014", ".016", ".022");
		assert.equal(step1.isValid, true);

		// Safe step-down (down-sizing for rebonding)
		const stepDown = validateWireProgression(".018", ".014", ".022");
		assert.equal(stepDown.isValid, true);
		assert.ok(stepDown.warning?.includes("Шаг назад"));

		// Dangerous leap (.014 round straight to .019x.025 SS)
		const dangerousJump = validateWireProgression(".014", ".019x.025", ".022");
		assert.equal(dangerousJump.isValid, false);
		assert.ok(dangerousJump.warning?.includes("ОПАСНЫЙ СКАЧОК"));

		// Oversized wire in .018 slot
		const slotMismatch = validateWireProgression(".016", ".019x.025", ".018");
		assert.equal(slotMismatch.isValid, false);
		assert.ok(slotMismatch.warning?.includes("паз .018"));
	});

	// ─── 12. Prescription-Specific Sequence Selector ───
	it("12. getStandardSequenceForPrescription tailors archwires according to slot size and mechanics", () => {
		// Alexander .018 sequence contains only .018-compatible wires
		const alexSeq = getStandardSequenceForPrescription("alexander_018");
		assert.ok(alexSeq.every((w) => w.size !== ".019x.025" && w.size !== ".021x.025"));
		assert.ok(alexSeq.some((w) => w.size === ".016x.022"));

		// Damon Q sequence includes Cu-NiTi thermal wires
		const damonSeq = getStandardSequenceForPrescription("damon_q_standard");
		assert.ok(damonSeq.some((w) => w.material === "copper_niti"));
	});

	// ─── 13. Form 043/y Structured SOAP Visit Note Generator ───
	it("13. generateOrthodonticVisitSoapNote outputs complete clinical protocol", () => {
		const note = generateOrthodonticVisitSoapNote({
			id: "visit-1",
			visitDate: "15.01.2026",
			arch: "both",
			upperWireSize: ".016x.022",
			upperWireMaterial: "copper_niti",
			lowerWireSize: ".014",
			lowerWireMaterial: "copper_niti",
			doctorName: "Д-р Смирнова Е. В.",
			elasticsPattern: "II класс (Fox 1/4 3.5oz)",
			appointmentIntervalWeeks: 6,
			notes: "Замена дуги верхней челюсти, фиксация эластиков.",
			bracketActions: [
				{ toothNumber: 13, action: "rebonded", reason: "окклюзионный скол" },
				{ toothNumber: 24, action: "fixed" },
			],
		});

		assert.ok(note.includes("ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЕМА (ФОРМА 043/У)"));
		assert.ok(note.includes("15.01.2026"));
		assert.ok(note.includes("Д-р Смирнова Е. В."));
		assert.ok(note.includes("Верхняя челюсть: зафиксирована дуга Cu-NiTi (Термоактивный с медью) .016x.022"));
		assert.ok(note.includes("Нижняя челюсть: зафиксирована дуга Cu-NiTi (Термоактивный с медью) .014"));
		assert.ok(note.includes("Зуб 13: повторная переклейка (причина: окклюзионный скол)"));
		assert.ok(note.includes("Межчелюстная эластическая тяга: II класс (Fox 1/4 3.5oz)"));
		assert.ok(note.includes("Следующий контрольный визит через 6 недель"));
	});

	// ─── 14. Universal FDI Teeth Metadata Helpers ───
	it("14. FDI metadata functions correctly classify tooth position and quadrants", () => {
		assert.equal(ALL_FDI_TEETH.length, 32);
		assert.equal(UPPER_ARCH_TEETH.length, 16);
		assert.equal(LOWER_ARCH_TEETH.length, 16);

		assert.equal(isUpperTooth(11), true);
		assert.equal(isUpperTooth(26), true);
		assert.equal(isUpperTooth(46), false);

		assert.equal(isLowerTooth(31), true);
		assert.equal(isLowerTooth(48), true);
		assert.equal(isLowerTooth(12), false);

		assert.equal(isAnteriorTooth(11), true);
		assert.equal(isAnteriorTooth(23), true);
		assert.equal(isAnteriorTooth(14), false);
		assert.equal(isAnteriorTooth(46), false);

		assert.equal(getQuadrant(14), 1);
		assert.equal(getQuadrant(23), 2);
		assert.equal(getQuadrant(36), 3);
		assert.equal(getQuadrant(47), 4);

		assert.ok(formatToothNameFdi(11).includes("11 Верхний правый центральный резец"));
		assert.ok(formatToothNameFdi(43).includes("43 Нижний правый клык"));
	});

	// ─── 15. Intermaxillary Elastics Catalog ───
	it("15. ELASTICS_PRESETS provides standard orthodontic elastic configurations", () => {
		assert.ok(ELASTICS_PRESETS.length >= 6);

		const fox = ELASTICS_PRESETS.find((e) => e.id === "el_class_2_fox");
		assert.ok(fox);
		assert.equal(fox.animalCode, "Fox (Лиса)");
		assert.equal(fox.forceLevel, "3.5 oz (Medium)");
		assert.ok(fox.name.includes("II класс"));

		const rabbit = ELASTICS_PRESETS.find((e) => e.id === "el_class_3_rabbit");
		assert.ok(rabbit);
		assert.equal(rabbit.animalCode, "Rabbit (Кролик)");
		assert.ok(rabbit.name.includes("III класс"));
		assert.ok(rabbit.indication.includes("мезиального прикуса"));

		const zebra = ELASTICS_PRESETS.find((e) => e.id === "el_cross_zebra");
		assert.ok(zebra);
		assert.equal(zebra.forceLevel, "6.0 oz (Extra-Heavy)");
	});

	// ─── 16. Standard Archwire Catalog Integrity ───
	it("16. STANDARD_ARCHWIRES includes all 4 clinical stages and material groups", () => {
		assert.ok(STANDARD_ARCHWIRES.length >= 10);

		const stage1Wires = getArchwiresByStage("leveling_aligning");
		assert.ok(stage1Wires.length >= 4);
		assert.ok(stage1Wires.some((w) => w.size === ".014"));

		const stage2Wires = getArchwiresByStage("working_space_closure");
		assert.ok(stage2Wires.some((w) => w.size === ".019x.025" && w.material === "stainless_steel"));

		const stage3Wires = getArchwiresByStage("finishing_detailing");
		assert.ok(stage3Wires.some((w) => w.material === "tma_beta_ti"));
		assert.ok(stage3Wires.some((w) => w.material === "braided_steel"));

		const spec = getArchwireSpec(".019x.025", "stainless_steel");
		assert.ok(spec);
		assert.equal(spec.shape, "rectangular");
	});

	// ─── 17. OrthodonticBracketMatrixModal SSR & Static Render Proof ───
	it("17. OrthodonticBracketMatrixModal renders complete interface with all 32 teeth and prescription selector", () => {
		const html = renderToStaticMarkup(
			createElement(OrthodonticBracketMatrixModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "p-test-ortho",
				patientName: "Алексеева Мария",
				initialPrescription: "damon_q_standard",
			}),
		);

		assert.ok(html.includes("data-testid=\"orthodontic-bracket-matrix-modal\""));
		assert.ok(html.includes("Алексеева Мария"));
		assert.ok(html.includes("Damon Q Standard .022"));
		assert.ok(html.includes("Матрица торка и ангуляции"));
		assert.ok(html.includes("Протокол смены дуг"));
		assert.ok(html.includes("Верхняя челюсть (Maxilla)"));
		assert.ok(html.includes("Нижняя челюсть (Mandibula)"));

		// Check presence of key FDI teeth
		assert.ok(html.includes("11"));
		assert.ok(html.includes("21"));
		assert.ok(html.includes("46"));
		assert.ok(html.includes("36"));

		// Closed state returns empty
		const htmlClosed = renderToStaticMarkup(
			createElement(OrthodonticBracketMatrixModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.equal(htmlClosed, "");
	});
});
