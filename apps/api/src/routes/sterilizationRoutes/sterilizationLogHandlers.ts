import type { FastifyInstance } from "fastify";
import {
	handleCreateDailyTest,
	handleCreatePsoTest,
	handleGetDailyTests,
	handleGetPsoTests,
	handlePsoQuickNorm,
	handleScanSterilization,
} from "../sanpin/sterilizationModules/sterilizationLogHandlers.js";

export * from "../sanpin/sterilizationModules/sterilizationLogHandlers.js";

export async function registerSterilizationLogRoutes(app: FastifyInstance): Promise<void> {
	app.post("/api/sterilization/scan", handleScanSterilization);
	app.post("/api/sterilization/pso-tests", handleCreatePsoTest);
	app.post("/api/sterilization/pso/quick-norm", handlePsoQuickNorm);
	app.get("/api/sterilization/pso-tests", handleGetPsoTests);
	app.post("/api/sterilization/daily-tests", handleCreateDailyTest);
	app.get("/api/sterilization/daily-tests", handleGetDailyTests);
}
