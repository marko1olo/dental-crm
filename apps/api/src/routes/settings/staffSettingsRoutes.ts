import type { FastifyInstance } from "fastify";
import { registerStaffCommissionAndAuthorityRoutes } from "./staff/commissionAndAuthorityRoutes.js";
import { registerStaffMemberRoutes } from "./staff/memberRoutes.js";

export function registerStaffSettingsRoutes(app: FastifyInstance): void {
	registerStaffMemberRoutes(app);
	registerStaffCommissionAndAuthorityRoutes(app);
}
