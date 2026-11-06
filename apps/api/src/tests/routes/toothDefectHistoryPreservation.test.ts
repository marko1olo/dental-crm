import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	formatToothStateLabel,
	formatToothStateTransition,
} from "../../routes/toothHistory.js";
import { parseClinicalDataFromNotes } from "../../routes/odontogram/types.js";

describe("Tooth Defect History Preservation & Multi-Status [CLN-03]", () => {
	test("parseClinicalDataFromNotes parses composite metadata without requiring canals", () => {
		const rawNotes = JSON.stringify({
			baseState: "Crown",
			hasCrown: true,
			hasSecondaryCaries: true,
			conditions: ["Caries"],
			condition: "defective",
		});

		const parsed = parseClinicalDataFromNotes(rawNotes);
		assert.ok(parsed !== null, "Clinical data must be parsed successfully");
		// @ts-expect-error passthrough property
		assert.equal(parsed.baseState, "Crown");
		// @ts-expect-error passthrough property
		assert.equal(parsed.hasCrown, true);
		// @ts-expect-error passthrough property
		assert.equal(parsed.hasSecondaryCaries, true);
		// @ts-expect-error passthrough property
		assert.deepEqual(parsed.conditions, ["Caries"]);
	});

	test("formatToothStateLabel accurately translates composite status into clinical Russian", () => {
		assert.equal(formatToothStateLabel("Crown + Caries"), "коронка + кариес");
		assert.equal(
			formatToothStateLabel("Root_Canal_Treated + Crown"),
			"депульпирован / каналы + коронка",
		);
		assert.equal(formatToothStateLabel("Implant + Periimplantitis"), "имплантат + Periimplantitis");
		assert.equal(formatToothStateLabel("Veneer + Crack"), "винир + трещина");
	});

	test("formatToothStateTransition renders readable audit transition for crowned tooth with caries", () => {
		const transition = formatToothStateTransition(
			"Crown",
			"Crown + Caries",
			"Выявлен пришеечный кариес K02.1",
		);

		assert.equal(
			transition,
			"Статус зуба: коронка → коронка + кариес (Выявлен пришеечный кариес K02.1)",
		);
	});

	test("formatToothStateTransition renders readable audit transition for endo-treated tooth with crown", () => {
		const transition = formatToothStateTransition(
			"Root_Canal_Treated",
			"Crown",
			"Ортопедическое лечение (установка коронки)",
		);

		assert.equal(
			transition,
			"Статус зуба: депульпирован / каналы → коронка (Ортопедическое лечение (установка коронки))",
		);
	});
});
