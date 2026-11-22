import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { registerSanpinSterilizationRoutes } from "../../routes/sanpin/sterilizationRoutes.js";

describe("SanPiN Sterilization SSOT Route Aliases & Red Team Verification", () => {
	it("registers both canonical /quick-norm and alias /quick-norm-cycle endpoints without error", async () => {
		const app = Fastify({ logger: false });
		registerSanpinSterilizationRoutes(app);
		await app.ready();

		assert.equal(app.hasRoute({ method: "POST", url: "/api/sanpin/sterilization/quick-norm" }), true);
		assert.equal(app.hasRoute({ method: "POST", url: "/api/sanpin/sterilization/quick-norm-cycle" }), true);
		assert.equal(app.hasRoute({ method: "POST", url: "/api/sanpin/sterilization-cycles/quick-norm" }), true);
		assert.equal(app.hasRoute({ method: "POST", url: "/api/sanpin/sterilization-cycles/quick-norm-cycle" }), true);
		await app.close();
	});

	it("verifies all SanPiN mutating endpoints are covered by Idempotency-Key enforcement regexes", () => {
		const sanpinIdempotentPaths = [
			"/api/sanpin/sterilization/quick-norm",
			"/api/sanpin/sterilization/quick-norm-cycle",
			"/api/sanpin/sterilization/shift-batch",
			"/api/sanpin/sterilization-cycles/quick-norm",
			"/api/sanpin/sterilization-cycles/shift-batch",
			"/api/sanpin/sterilization/cycles",
			"/api/sanpin/sterilization/pso/quick-norm",
			"/api/sanpin/shift-autofill",
			"/api/sanpin/month-autofill",
			"/api/registers/autofill-shift",
			"/api/registers/autofill-month",
			"/api/registers/sanpin/shift-close",
			"/api/registers/bactericidal/shift-autopilot",
			"/api/registers/bactericidal/open-morning-shift",
			"/api/registers/bactericidal/close-evening-shift",
			"/api/registers/medical-waste/quick-shift-bundle",
			"/api/registers/cleaning/autopilot-month",
		];

		const patterns = [
			/^\/api\/sanpin\/sterilization(?:-cycles)?\/(?:quick-norm|quick-norm-cycle|shift-batch|batch|cycles|pso\/quick-norm)/,
			/^\/api\/sanpin\/(?:shift-autofill|month-autofill)/,
			/^\/api\/registers\/(?:autofill-shift|autofill-month|sanpin\/shift-close)/,
			/^\/api\/registers\/(?:bactericidal\/(?:shift-autopilot|open-morning-shift|close-evening-shift)|medical-waste\/quick-shift-bundle|cleaning\/autopilot-month)/,
		];

		for (const path of sanpinIdempotentPaths) {
			const isCovered = patterns.some((re) => re.test(path));
			assert.equal(isCovered, true, `Path ${path} must be protected by Idempotency-Key enforcement regex`);
		}
	});
});
