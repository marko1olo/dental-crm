import assert from "node:assert/strict";
import test from "node:test";
import { getToothAnatomicalNameRu } from "../lib/clinicalProtocols043";
import {
	TOOTH_STATE_LABELS,
	type ToothData,
	type ToothState,
} from "../components/odontogram/ToothChart";
import { getToothConfig, getToothPath } from "../utils/math/toothGeometry";

test("ToothChart Geometry — handles adult and pediatric FDI teeth", () => {
	// Adult upper and lower teeth
	const upperIncisor = getToothPath(11);
	assert.ok(upperIncisor.root && upperIncisor.crown, "11 has root and crown");
	assert.ok(upperIncisor.surfaces.V && upperIncisor.surfaces.O, "11 has V and O surfaces");

	const upperMolar = getToothPath(16);
	assert.ok(upperMolar.root && upperMolar.crown, "16 has root and crown");

	const lowerMolar = getToothPath(46);
	assert.ok(lowerMolar.root && lowerMolar.crown, "46 has root and crown");

	// Pediatric primary teeth (55-51, 61-65, 85-81, 71-75)
	const primaryUpperIncisor = getToothPath(51);
	assert.ok(primaryUpperIncisor.root && primaryUpperIncisor.crown, "51 has pediatric root and crown");

	const primaryUpperMolar = getToothPath(55);
	assert.ok(primaryUpperMolar.root && primaryUpperMolar.crown, "55 has pediatric molar root and crown");

	const primaryLowerMolar = getToothPath(85);
	assert.ok(primaryLowerMolar.root && primaryLowerMolar.crown, "85 has pediatric lower molar root and crown");
});

test("ToothChart Geometry — tooth configs provide scalable bounding dimensions", () => {
	const cfg11 = getToothConfig(11);
	assert.equal(cfg11.height, "96px");
	assert.ok(Number.parseInt(cfg11.width) > 0);

	const cfg55 = getToothConfig(55);
	assert.equal(cfg55.height, "96px");
	assert.ok(Number.parseInt(cfg55.width) > 0);
});

test("TOOTH_STATE_LABELS — covers all clinical states", () => {
	const requiredStates: ToothState[] = [
		"Healthy",
		"Caries",
		"Pulpitis",
		"Periodontitis",
		"Filled",
		"Crown",
		"Implant",
		"Planned_Implant",
		"Missing",
	];

	for (const st of requiredStates) {
		assert.ok(TOOTH_STATE_LABELS[st], `TOOTH_STATE_LABELS has label for ${st}`);
		assert.equal(typeof TOOTH_STATE_LABELS[st], "string");
	}
});

test("getToothAnatomicalNameRu — formats adult and pediatric teeth names correctly", () => {
	const name16 = getToothAnatomicalNameRu(16);
	assert.ok(name16.includes("16"), "contains 16");
	assert.ok(name16.includes("верхний правый"), "contains quadrant name");
	assert.ok(name16.includes("первый моляр"), "contains tooth type");

	const name54 = getToothAnatomicalNameRu(54);
	assert.ok(name54.includes("54"), "contains 54");
	assert.ok(name54.includes("временный"), "identifies as primary/temporary");
	assert.ok(name54.includes("первый моляр"), "identifies as first molar");
});

test("createDefaultAdultTeethData — initializes exactly 32 healthy adult teeth", async () => {
	const { ALL_ADULT_TEETH_NUMBERS, createDefaultAdultTeethData } = await import(
		"../components/odontogram/ToothChart"
	);
	assert.equal(ALL_ADULT_TEETH_NUMBERS.length, 32, "32 adult teeth in arch");
	const uniqueNumbers = new Set(ALL_ADULT_TEETH_NUMBERS);
	assert.equal(uniqueNumbers.size, 32, "all 32 tooth numbers are unique");

	const defaultData = createDefaultAdultTeethData();
	assert.equal(defaultData.length, 32, "32 items generated");
	for (const tooth of defaultData) {
		assert.equal(tooth.state, "Healthy", `tooth ${tooth.toothNumber} is Healthy`);
		assert.ok(ALL_ADULT_TEETH_NUMBERS.includes(tooth.toothNumber));
	}
});
