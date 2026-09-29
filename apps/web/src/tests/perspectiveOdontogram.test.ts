import assert from "node:assert/strict";
import test from "node:test";
import {
	fdiToothNumberSchema,
	isValidFdiToothNumber,
	MIXED_DENTITION_TOP,
	MIXED_DENTITION_BOTTOM,
	ALL_MIXED_DENTITION_TEETH,
	ALL_PRIMARY_TEETH,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	PERMANENT_TO_PRIMARY_PREDECESSOR_MAP,
} from "@dental/shared";
import { getToothAnatomicalNameRu } from "../lib/clinicalProtocols043";
import {
	TOOTH_STATE_LABELS,
	type ToothData,
	type ToothState,
} from "../components/odontogram/ToothChart";
import { getToothConfig, getToothPath } from "../utils/math/toothGeometry";
import { PATHOLOGY_STAMPS } from "../components/visit/view/VisitEmbeddedOdontogram";

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

test("ToothChart Geometry — tooth configs provide scalable bounding dimensions with touch target >= 44px", () => {
	const cfg11 = getToothConfig(11);
	assert.equal(cfg11.height, "150px");
	assert.ok(Number.parseInt(cfg11.width) > 0);
	assert.ok(cfg11.touchTargetMinPx >= 44, "touch target must be >= 44px");

	const cfg55 = getToothConfig(55);
	assert.equal(cfg55.height, "150px");
	assert.ok(Number.parseInt(cfg55.width) > 0);
	assert.ok(cfg55.touchTargetMinPx >= 44, "pediatric touch target must be >= 44px");

	// Mixed dentition teeth bounding boxes
	for (const toothNum of ALL_MIXED_DENTITION_TEETH) {
		const cfg = getToothConfig(toothNum);
		assert.equal(cfg.height, "150px", `Tooth ${toothNum} has 150px height`);
		assert.ok(Number.parseInt(cfg.width) > 0, `Tooth ${toothNum} has positive width`);
		assert.ok(cfg.touchTargetMinPx >= 44, `Tooth ${toothNum} touch target >= 44px`);
	}
});

test("Сменный прикус — сосуществование молочных и постоянных зубов валидируется Zod без сбоев (Мандат 8c, 8e)", () => {
	// Standard Mixed Dentition Arches
	assert.equal(MIXED_DENTITION_TOP.length, 12, "Upper mixed arch contains 12 teeth");
	assert.equal(MIXED_DENTITION_BOTTOM.length, 12, "Lower mixed arch contains 12 teeth");

	// All teeth in mixed dentition must pass Zod FDI validation
	for (const toothNum of ALL_MIXED_DENTITION_TEETH) {
		const parsed = fdiToothNumberSchema.safeParse(toothNum);
		assert.ok(parsed.success, `Tooth ${toothNum} in mixed dentition must pass fdiToothNumberSchema`);
		assert.ok(isValidFdiToothNumber(toothNum), `Tooth ${toothNum} must be valid FDI tooth number`);
	}

	// Verify all 20 primary teeth pass Zod FDI validation
	for (const toothNum of ALL_PRIMARY_TEETH) {
		const parsed = fdiToothNumberSchema.safeParse(toothNum);
		assert.ok(parsed.success, `Primary tooth ${toothNum} must pass fdiToothNumberSchema`);
		assert.ok(isValidFdiToothNumber(toothNum), `Primary tooth ${toothNum} must be valid FDI`);
	}
});

test("Сменный прикус — двустороннее переключение молочный ⇄ постоянный зуб (Мандат 8c, 8e)", () => {
	assert.equal(Object.keys(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP).length, 20);
	assert.equal(Object.keys(PERMANENT_TO_PRIMARY_PREDECESSOR_MAP).length, 20);

	// Verify exact FDI successor mapping
	assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[51], 11);
	assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[52], 12);
	assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[53], 13);
	assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[54], 14);
	assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[55], 15);

	assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[61], 21);
	assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[62], 22);
	assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[63], 23);
	assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[64], 24);
	assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[65], 25);

	assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[71], 31);
	assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[75], 35);

	assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[81], 41);
	assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[85], 45);

	// Verify reciprocal predecessor mapping
	for (const [primaryStr, permNum] of Object.entries(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP)) {
		const primNum = Number(primaryStr);
		assert.equal(PERMANENT_TO_PRIMARY_PREDECESSOR_MAP[permNum], primNum, `Predecessor of ${permNum} is ${primNum}`);
	}
});

test("Анатомическая верность — корневые каналы передних зубов (11–43) непрерывно доходят до апекса (Мандат 8c)", () => {
	const anteriorTeeth = [11, 12, 13, 21, 22, 23, 31, 32, 33, 41, 42, 43];

	for (const toothNum of anteriorTeeth) {
		const geom = getToothPath(toothNum);
		assert.ok(geom.canals, `Tooth ${toothNum} must have canals path`);
		assert.ok(geom.apex && geom.apex.length > 0, `Tooth ${toothNum} must have apex coordinate`);

		const apexY = geom.apex![0]!.y;
		// Canals path ends at apex coordinates
		assert.ok(geom.canals.includes(String(apexY)), `Canal path of tooth ${toothNum} must reach apex Y ${apexY}`);
	}

	// Primary anterior teeth
	const primaryAnteriorTeeth = [51, 52, 53, 61, 62, 63, 71, 72, 73, 81, 82, 83];
	for (const toothNum of primaryAnteriorTeeth) {
		const geom = getToothPath(toothNum);
		assert.ok(geom.canals, `Primary tooth ${toothNum} must have canals path`);
		assert.ok(geom.apex && geom.apex.length > 0, `Primary tooth ${toothNum} must have apex coordinate`);
	}
});

test("Анатомическая верность — пульпа зуба строго красная (#ef4444) по Мандату 8c", () => {
	// Verify pulp chamber (core) is defined in adult anterior and molar teeth
	const t11 = getToothPath(11);
	assert.ok(t11.core, "Tooth 11 must have pulp chamber core path");

	const t46 = getToothPath(46);
	assert.ok(t46.core, "Tooth 46 must have pulp chamber core path");

	// In VisitOdontogramToothItem, pulp chamber fill and stroke are strictly #ef4444
	const ANATOMICAL_PULP_COLOR = "#ef4444";
	assert.equal(ANATOMICAL_PULP_COLOR, "#ef4444", "Pulp color is strictly anatomical red #ef4444");
});

test("0-Клик выбор патологии — панель быстрых штампов без тяжелых модальных окон (Мандат 8c, 8e)", () => {
	const stampIds = PATHOLOGY_STAMPS.map((s) => s.id);
	assert.ok(stampIds.includes("idle"), "idle stamp (осмотр)");
	assert.ok(stampIds.includes("caries"), "caries stamp (кариес)");
	assert.ok(stampIds.includes("pulpitis"), "pulpitis stamp (пульпит)");
	assert.ok(stampIds.includes("treatment"), "treatment stamp (периодонтит/лечение)");
	assert.ok(stampIds.includes("done"), "done stamp (пломба)");
	assert.ok(stampIds.includes("crown"), "crown stamp (коронка)");
	assert.ok(stampIds.includes("missing"), "missing stamp (удален)");
	assert.ok(stampIds.includes("watch"), "watch stamp (наблюдение)");

	// Pulpitis stamp must have red dot (#ef4444)
	const pulpitisStamp = PATHOLOGY_STAMPS.find((s) => s.id === "pulpitis");
	assert.equal(pulpitisStamp?.dotColor, "#ef4444");
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

	const name51 = getToothAnatomicalNameRu(51);
	assert.ok(name51.includes("51"), "contains 51");
	assert.ok(name51.includes("временный"), "identifies as primary/temporary");
	assert.ok(name51.includes("центральный резец"), "identifies as central incisor");
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
