import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	computePackagingExpirationDate,
	STERILIZATION_CYCLE_MODES,
	STERILIZATION_INDICATOR_TYPES,
	STERILIZATION_PACKAGING_TYPES,
} from "@dental/shared";

describe("SanPiN 3.3686-21 Sterilization Packaging Shelf Life Calculation", () => {
	it("computes 50 days shelf life for heat-sealed kraft bags", () => {
		const baseDate = new Date("2026-08-01T12:00:00Z");
		const expiry = computePackagingExpirationDate("kraft_heat_sealed", baseDate);
		const diffDays = Math.round((expiry.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
		assert.equal(diffDays, 50);
	});

	it("computes 30 days shelf life for self-adhesive kraft bags", () => {
		const baseDate = new Date("2026-08-01T12:00:00Z");
		const expiry = computePackagingExpirationDate("kraft_self_adhesive", baseDate);
		const diffDays = Math.round((expiry.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
		assert.equal(diffDays, 30);
	});

	it("computes 180 days shelf life for heat-sealed laminated transparent pouches", () => {
		const baseDate = new Date("2026-08-01T12:00:00Z");
		const expiry = computePackagingExpirationDate("laminated_heat_sealed", baseDate);
		const diffDays = Math.round((expiry.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
		assert.equal(diffDays, 180);
	});

	it("falls back to 3 days for unspecified or open packaging", () => {
		const baseDate = new Date("2026-08-01T12:00:00Z");
		const expiry = computePackagingExpirationDate("other", baseDate);
		const diffDays = Math.round((expiry.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
		assert.equal(diffDays, 3);
	});
});

describe("Sterilization Indicator and Cycle Mode Taxonomy", () => {
	it("includes Class 4, 5, 6, Biological and Bowie-Dick indicators", () => {
		assert.ok("class4_multivariable" in STERILIZATION_INDICATOR_TYPES);
		assert.ok("class5_integrating" in STERILIZATION_INDICATOR_TYPES);
		assert.ok("class6_emulating" in STERILIZATION_INDICATOR_TYPES);
		assert.ok("biological" in STERILIZATION_INDICATOR_TYPES);
		assert.ok("bowie_dick" in STERILIZATION_INDICATOR_TYPES);
	});

	it("includes Class B, S, N autoclave and dry heat modes", () => {
		assert.ok("B" in STERILIZATION_CYCLE_MODES);
		assert.ok("S" in STERILIZATION_CYCLE_MODES);
		assert.ok("N" in STERILIZATION_CYCLE_MODES);
		assert.ok("dry_heat_180" in STERILIZATION_CYCLE_MODES);
		assert.ok("dry_heat_160" in STERILIZATION_CYCLE_MODES);
	});
});
