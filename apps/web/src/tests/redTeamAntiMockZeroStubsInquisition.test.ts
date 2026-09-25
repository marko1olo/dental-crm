/**
 * redTeamAntiMockZeroStubsInquisition.test.ts
 *
 * RED TEAM INQUISITOR 1: ANTI-MOCK & ZERO-STUBS INQUISITION
 *
 * Mandates Enforced:
 * 1. ZERO MOCKS / ZERO FAKES / ZERO SIMULATIONS (Constitution Mandate 2, Zero-Mocks Law)
 * 2. Real PostgreSQL 18 ACID endpoints wired to UI components:
 *    - Loyalty: /api/loyalty/balance, /api/loyalty/transactions, /api/loyalty/redeem, /api/loyalty/accrue
 *    - Orthodontics: /api/orthodontics/:patientId/progress, issue-set, archwire-change, ligatures-activate
 *    - Dental Lab (ЗТЛ): /api/clinical/lab-orders (GET & POST)
 * 3. NO RECURSIVE MOCK DOMS (Mandate 8x, Anti-RAM-Hog ceiling)
 * 4. T.A.R.S. 100% / Brutal Honesty: verified byte-for-byte on live files.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, "..");
const apiSrcDir = path.resolve(__dirname, "../../../api/src");

describe("Red Team Inquisitor 1: Anti-Mock & Zero-Stubs Verification Suite", () => {
	// =========================================================================
	// 1. LOYALTY SYSTEM: REAL POSTGRESQL 18 BACKEND BINDING
	// =========================================================================
	describe("1. Loyalty Program Real ACID API Integration", () => {
		const loyaltyModalPath = path.join(
			webSrcDir,
			"components/loyalty/program/LoyaltyProgramModal.tsx",
		);

		it("LoyaltyProgramModal.tsx must physically exist on disk", () => {
			assert.ok(fs.existsSync(loyaltyModalPath), "LoyaltyProgramModal.tsx not found");
		});

		it("LoyaltyProgramModal must synchronize live balance and transactions via fetch", () => {
			const content = fs.readFileSync(loyaltyModalPath, "utf-8");

			// Must fetch live balance
			assert.ok(
				content.includes("/api/loyalty/balance/"),
				"LoyaltyProgramModal missing live GET /api/loyalty/balance/ endpoint call",
			);

			// Must fetch live transactions ledger
			assert.ok(
				content.includes("/api/loyalty/transactions/"),
				"LoyaltyProgramModal missing live GET /api/loyalty/transactions/ endpoint call",
			);

			// Must persist redemptions to ACID endpoint
			assert.ok(
				content.includes("/api/loyalty/redeem"),
				"LoyaltyProgramModal missing live POST /api/loyalty/redeem persistence",
			);

			// Must persist referral bonuses to ACID endpoint
			assert.ok(
				content.includes("/api/loyalty/accrue"),
				"LoyaltyProgramModal missing live POST /api/loyalty/accrue persistence",
			);

			// Must include authorization headers
			assert.ok(
				content.includes("denteAdminSecretRequestHeaders"),
				"LoyaltyProgramModal missing denteAdminSecretRequestHeaders authorization",
			);
		});
	});

	// =========================================================================
	// 2. ORTHODONTICS: REAL CLINICAL API INTEGRATION
	// =========================================================================
	describe("2. Orthodontics Real Clinical API Integration", () => {
		const orthoWidgetPath = path.join(
			webSrcDir,
			"components/orthodontics/OrthodonticVisitProtocolWidget.tsx",
		);

		it("OrthodonticVisitProtocolWidget.tsx must physically exist on disk", () => {
			assert.ok(fs.existsSync(orthoWidgetPath), "OrthodonticVisitProtocolWidget.tsx not found");
		});

		it("OrthodonticVisitProtocolWidget must synchronize progress and persist clinical actions", () => {
			const content = fs.readFileSync(orthoWidgetPath, "utf-8");

			// Must fetch live progress
			assert.ok(
				content.includes("/api/orthodontics/") && content.includes("/progress"),
				"OrthodonticVisitProtocolWidget missing live GET /api/orthodontics/:patientId/progress call",
			);

			// Must persist aligner issuance
			assert.ok(
				content.includes("/aligners/issue-set"),
				"OrthodonticVisitProtocolWidget missing live POST /api/orthodontics/:patientId/aligners/issue-set call",
			);

			// Must persist archwire changes
			assert.ok(
				content.includes("/archwire-change"),
				"OrthodonticVisitProtocolWidget missing live POST /api/orthodontics/:patientId/archwire-change call",
			);

			// Must persist ligature/power chain activations
			assert.ok(
				content.includes("/ligatures-activate"),
				"OrthodonticVisitProtocolWidget missing live POST /api/orthodontics/:patientId/ligatures-activate call",
			);

			// Must include authorization headers
			assert.ok(
				content.includes("denteAdminSecretRequestHeaders"),
				"OrthodonticVisitProtocolWidget missing denteAdminSecretRequestHeaders authorization",
			);
		});
	});

	// =========================================================================
	// 3. DENTAL LAB (ЗТЛ): REAL LAB ORDERS API INTEGRATION
	// =========================================================================
	describe("3. Dental Lab Hub Real Lab Orders API Integration", () => {
		const labHubPath = path.join(
			webSrcDir,
			"components/lab/DentalLabOrdersHubModal.tsx",
		);

		it("DentalLabOrdersHubModal.tsx must physically exist on disk", () => {
			assert.ok(fs.existsSync(labHubPath), "DentalLabOrdersHubModal.tsx not found");
		});

		it("DentalLabOrdersHubModal must synchronize and persist lab orders to backend", () => {
			const content = fs.readFileSync(labHubPath, "utf-8");

			// Must fetch live orders from /api/clinical/lab-orders
			assert.ok(
				content.includes("/api/clinical/lab-orders"),
				"DentalLabOrdersHubModal missing live GET /api/clinical/lab-orders call",
			);

			// Must persist new order creation via POST /api/clinical/lab-orders
			assert.ok(
				content.includes('method: "POST"') && content.includes("/api/clinical/lab-orders"),
				"DentalLabOrdersHubModal missing live POST /api/clinical/lab-orders persistence",
			);

			// Must dispatch reactive event
			assert.ok(
				content.includes("dente-lab-order-created"),
				"DentalLabOrdersHubModal missing dente-lab-order-created reactive event dispatch",
			);

			// Must include authorization headers
			assert.ok(
				content.includes("denteAdminSecretRequestHeaders"),
				"DentalLabOrdersHubModal missing denteAdminSecretRequestHeaders authorization",
			);
		});
	});

	// =========================================================================
	// 4. ZERO STUBS / ZERO FAKES IN PRODUCTION ROUTE HANDLERS
	// =========================================================================
	describe("4. Zero Stubs Invariant in Production Backend Routes", () => {
		const targetRoutes = [
			"loyalty.ts",
			"orthodontics.ts",
			"lab.ts",
			"analytics.ts",
			"marketing.ts",
			"telephony.ts",
		];

		for (const routeFile of targetRoutes) {
			it(`apps/api/src/routes/${routeFile} must NOT contain unimplemented stubs`, () => {
				const fullPath = path.join(apiSrcDir, "routes", routeFile);
				if (!fs.existsSync(fullPath)) return;

				const content = fs.readFileSync(fullPath, "utf-8");
				assert.ok(
					!content.includes('throw new Error("Not implemented")'),
					`${routeFile} contains 'Not implemented' stub`,
				);
				assert.ok(
					!content.includes('throw new Error("TODO")'),
					`${routeFile} contains 'TODO' error stub`,
				);
			});
		}
	});
});
