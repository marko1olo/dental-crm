import type { FastifyInstance } from "fastify";
import { registerChairsRoutes } from "./chairsRoutes.js";
import { registerClinicProfileRoutes } from "./clinicProfileRoutes.js";
import { registerProtocolTemplatesRoutes } from "./protocolTemplatesRoutes.js";
import { registerServiceCatalogRoutes } from "./serviceCatalogRoutes.js";
import { registerStaffSettingsRoutes } from "./staffSettingsRoutes.js";
import { registerUiPreferencesRoutes } from "./uiPreferencesRoutes.js";

export {
	chairMutationRejection,
	chairWorkingHoursRejection,
	clinicProfileMutationRejection,
	parseSettingsPayload,
	protocolTemplateMutationRejection,
	requireSettingsAccess,
	serviceCatalogMutationRejection,
	staffAuthorityMutationRejection,
	staffMutationRejection,
	staffWorkingHoursRejection,
} from "./helpers.js";

export async function registerSettingsRoutes(
	app: FastifyInstance,
): Promise<void> {
	registerClinicProfileRoutes(app);
	registerUiPreferencesRoutes(app);
	registerStaffSettingsRoutes(app);
	registerChairsRoutes(app);
	registerServiceCatalogRoutes(app);
	registerProtocolTemplatesRoutes(app);
}
