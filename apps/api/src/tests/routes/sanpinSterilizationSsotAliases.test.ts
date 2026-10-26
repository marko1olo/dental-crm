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
});
