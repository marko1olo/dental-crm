/**
 * stockFefoBatchSelector.ts — Backward compatibility facade.
 * Canonical implementation moved to serviceBomRulesMatcher.ts (resolves BOM rules for clinical services).
 */

export {
	resolveRequiredMaterialsForServices,
	resolveServicesMetadata,
} from "./serviceBomRulesMatcher.js";
