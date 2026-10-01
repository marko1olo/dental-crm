import assert from "node:assert/strict";
import test from "node:test";
import {
	detectIdentityType,
	getLiveTimeOfDayGreeting,
} from "../authSmartIdentity.js";
import { DEMO_ROLES } from "../DemoTourSelector.js";

test("Universal Auth Identity — detectIdentityType parses formats correctly", () => {
	// Emails
	assert.equal(detectIdentityType("doctor@clinic.com"), "email");
	assert.equal(detectIdentityType("admin.dental@mail.ru"), "email");
	assert.equal(detectIdentityType("  user@dente.ru  "), "email");

	// Phone numbers
	assert.equal(detectIdentityType("+79991234567"), "phone");
	assert.equal(detectIdentityType("8 (999) 123-45-67"), "phone");
	assert.equal(detectIdentityType("+7 916 555-44-33"), "phone");
	assert.equal(detectIdentityType("89001112233"), "phone");
	assert.equal(detectIdentityType("+1 (555) 234-5678"), "phone");

	// Clinic Identifiers / Codes / Slugs
	assert.equal(detectIdentityType("clinic-main-01"), "clinic_id");
	assert.equal(detectIdentityType("stom_premium"), "clinic_id");
	assert.equal(detectIdentityType("dental77"), "clinic_id");
	assert.equal(detectIdentityType("DENTE-NORTH-BRANCH"), "clinic_id");
});

test("Universal Auth Identity — getLiveTimeOfDayGreeting returns clinical greeting", () => {
	const { greeting, timeSlot } = getLiveTimeOfDayGreeting();
	assert.ok(typeof greeting === "string" && greeting.length > 0);
	assert.ok(greeting.includes("доктор"));
	assert.ok(["morning", "day", "evening", "night"].includes(timeSlot));
});

test("Universal Auth Demo Roles — covers 5 clinical personas with full details", () => {
	assert.equal(DEMO_ROLES.length, 5);

	const roleIds = DEMO_ROLES.map((r) => r.id);
	assert.ok(roleIds.includes("therapist"));
	assert.ok(roleIds.includes("orthodontist"));
	assert.ok(roleIds.includes("surgeon"));
	assert.ok(roleIds.includes("owner"));
	assert.ok(roleIds.includes("admin"));

	for (const role of DEMO_ROLES) {
		assert.ok(role.title.length > 0, `Title missing for ${role.id}`);
		assert.ok(role.doctorName.length > 0, `Doctor name missing for ${role.id}`);
		assert.ok(role.highlights.length >= 3, `Highlights missing for ${role.id}`);
		assert.ok(role.badge.length > 0, `Badge missing for ${role.id}`);
	}
});
