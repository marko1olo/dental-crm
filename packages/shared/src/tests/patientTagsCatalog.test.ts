import assert from "node:assert";
import test from "node:test";

import {
	PATIENT_TAG_CATEGORIES,
	PATIENT_TAG_CODES,
	PATIENT_TAGS_CATALOG,
	PATIENT_TAGS_MAP,
	isRedAlertPatientTag,
	patientTagCodeSchema,
	patientTagCategorySchema,
	getTagsByCategory,
	getCriticalAlertTags,
	getClinicalTags,
	getAdministrativeTags,
	getFinancialTags,
	getSocialTags,
	getTagBadgeStyle,
	evaluatePatientTagRules,
	shouldAssignDebtorTag,
	shouldAssignChildTag,
	shouldAssignPensionerTag,
	shouldAssignBlacklistTag,
	patientHasTag,
	patientHasAnyTag,
	patientHasAllTags,
	filterPatientsByTags,
	searchPatientTags,
	parsePatientTags,
	serializePatientTags,
	validatePatientTags,
	STOMX_PATIENT_TAGS_CATALOG,
	STOMX_PATIENT_TAGS_MAP,
} from "../patients/patientTagsCatalog.js";

// ============================================================================
// 1. CANONICAL TAG DEFINITIONS & MANDATE 8ap ALIASES
// ============================================================================

test("patientTagsCatalog: contains 13 canonical tags across 4 categories", () => {
	assert.strictEqual(PATIENT_TAGS_CATALOG.length, 13);
	assert.strictEqual(PATIENT_TAG_CODES.length, 13);
	assert.strictEqual(PATIENT_TAG_CATEGORIES.length, 4);

	// Check schemas
	for (const code of PATIENT_TAG_CODES) {
		assert.strictEqual(patientTagCodeSchema.safeParse(code).success, true);
	}
	for (const cat of PATIENT_TAG_CATEGORIES) {
		assert.strictEqual(patientTagCategorySchema.safeParse(cat).success, true);
	}
});

test("patientTagsCatalog: red alert tags are allergy and acute_pain (Mandate 8e)", () => {
	assert.strictEqual(isRedAlertPatientTag("allergy"), true);
	assert.strictEqual(isRedAlertPatientTag("acute_pain"), true);
	assert.strictEqual(isRedAlertPatientTag("vip"), false);
	assert.strictEqual(isRedAlertPatientTag("debtor"), false);

	const critical = getCriticalAlertTags();
	assert.strictEqual(critical.length, 2);
	const codes = critical.map((t) => t.code);
	assert.ok(codes.includes("allergy"));
	assert.ok(codes.includes("acute_pain"));
});

test("patientTagsCatalog: backward compatibility with STOMX aliases", () => {
	assert.strictEqual(STOMX_PATIENT_TAGS_CATALOG.length, 13);
	assert.strictEqual(STOMX_PATIENT_TAGS_MAP.allergy.labelRu, "Аллергия / Непереносимость");
	assert.strictEqual(STOMX_PATIENT_TAGS_MAP.vip.category, "administrative");
});

// ============================================================================
// 2. CATEGORY GROUPINGS & RETRIEVAL
// ============================================================================

test("tagCategories: retrieves tags by clinical, administrative, financial, social", () => {
	const clinical = getClinicalTags();
	assert.ok(clinical.length >= 4);
	assert.ok(clinical.some((t) => t.code === "allergy"));
	assert.ok(clinical.some((t) => t.code === "pregnancy"));

	const admin = getAdministrativeTags();
	assert.ok(admin.some((t) => t.code === "vip"));
	assert.ok(admin.some((t) => t.code === "blacklist"));

	const fin = getFinancialTags();
	assert.ok(fin.some((t) => t.code === "dms"));
	assert.ok(fin.some((t) => t.code === "debtor"));

	const social = getSocialTags();
	assert.ok(social.some((t) => t.code === "pensioner"));
	assert.ok(social.some((t) => t.code === "medical_staff"));
});

// ============================================================================
// 3. APPLE HIG BADGE COLOR PALETTE & CONTRAST
// ============================================================================

test("tagColorPalette: produces valid light and dark styles for tags", () => {
	const allergyLight = getTagBadgeStyle("allergy", false);
	assert.ok(allergyLight.color, "Must have text color");
	assert.ok(allergyLight.backgroundColor, "Must have background color");
	assert.ok(allergyLight.borderColor, "Must have border color");

	const allergyDark = getTagBadgeStyle("allergy", true);
	assert.notStrictEqual(allergyDark.color, allergyLight.color, "Dark mode text should have higher tint brightness");

	const fallback = getTagBadgeStyle("unknown_tag_code", false);
	assert.ok(fallback.color);
});

// ============================================================================
// 4. TAG RULE ENGINE (AUTO-TAG EVALUATION)
// ============================================================================

test("tagRuleEngine: correctly identifies debtor from negative balance in kopecks", () => {
	assert.strictEqual(shouldAssignDebtorTag(-50000), true);
	assert.strictEqual(shouldAssignDebtorTag(0), false);
	assert.strictEqual(shouldAssignDebtorTag(120000), false);
});

test("tagRuleEngine: correctly identifies age-based tags (child <18, pensioner >=60)", () => {
	assert.strictEqual(shouldAssignChildTag(7), true);
	assert.strictEqual(shouldAssignChildTag(17), true);
	assert.strictEqual(shouldAssignChildTag(18), false);

	assert.strictEqual(shouldAssignPensionerTag(59), false);
	assert.strictEqual(shouldAssignPensionerTag(60), true);
	assert.strictEqual(shouldAssignPensionerTag(75), true);
});

test("tagRuleEngine: evaluates full facts into comprehensive tag set", () => {
	const tags = evaluatePatientTagRules({
		balanceKopecks: -150000,
		ageYears: 12,
		hasDrugAllergies: true,
		hasAcutePainEmergency: true,
		noShowCount: 4,
	});

	assert.ok(tags.includes("debtor"), "Must have debtor tag");
	assert.ok(tags.includes("child"), "Must have child tag");
	assert.ok(tags.includes("allergy"), "Must have allergy tag");
	assert.ok(tags.includes("acute_pain"), "Must have acute pain tag");
	assert.ok(tags.includes("blacklist"), "Must have blacklist tag for >=3 no-shows");
});

// ============================================================================
// 5. TAG MATCHER & FILTERING
// ============================================================================

test("tagMatcher: matches tags and filters patient records", () => {
	const patientA = { id: "p1", name: "Иванов", tags: ["vip", "allergy"] };
	const patientB = { id: "p2", name: "Петров", tags: ["dms", "child"] };
	const patientC = { id: "p3", name: "Сидоров", tags: ["debtor"] };

	assert.strictEqual(patientHasTag(patientA.tags, "vip"), true);
	assert.strictEqual(patientHasTag(patientA.tags, "debtor"), false);

	assert.strictEqual(patientHasAnyTag(patientA.tags, ["allergy", "debtor"]), true);
	assert.strictEqual(patientHasAllTags(patientA.tags, ["vip", "allergy"]), true);
	assert.strictEqual(patientHasAllTags(patientA.tags, ["vip", "debtor"]), false);

	const patients = [patientA, patientB, patientC];
	const filteredAny = filterPatientsByTags(patients, ["vip", "dms"], "any");
	assert.strictEqual(filteredAny.length, 2);

	const filteredAll = filterPatientsByTags(patients, ["vip", "allergy"], "all");
	assert.strictEqual(filteredAll.length, 1);
	assert.strictEqual(filteredAll[0].id, "p1");

	const searchResults = searchPatientTags("аллергия");
	assert.strictEqual(searchResults.length, 1);
	assert.strictEqual(searchResults[0].code, "allergy");
});

// ============================================================================
// 6. SERIALIZATION & ZOD VALIDATION
// ============================================================================

test("tagSerialization: parses, serializes and validates tags cleanly", () => {
	const raw = ["ALLERGY", " vip ", "invalid_tag_xyz", 123, "acute_pain"];
	const parsed = parsePatientTags(raw);
	assert.deepStrictEqual(parsed, ["allergy", "vip", "acute_pain"]);

	const serialized = serializePatientTags(parsed);
	assert.deepStrictEqual(serialized, ["allergy", "vip", "acute_pain"]);

	const validCheck = validatePatientTags(["allergy", "vip"]);
	assert.strictEqual(validCheck.success, true);
	assert.strictEqual(validCheck.data?.length, 2);

	const invalidCheck = validatePatientTags(["bogus_tag"]);
	assert.strictEqual(invalidCheck.success, false);
});
