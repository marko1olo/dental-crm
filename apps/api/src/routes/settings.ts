/**
 * Canonical Facade for Settings Routes.
 * Decomposed into modular components in ./settings/
 *
 * Route-owned validation and mutation rejection boundaries:
 * - parseSettingsPayload(...)
 * - clinicProfileMutationRejection(...)
 * - staffWorkingHoursRejection(...)
 * - chairWorkingHoursRejection(...)
 */
export {
	registerSettingsRoutes,
	clinicProfileMutationRejection,
} from "./settings/index.js";
