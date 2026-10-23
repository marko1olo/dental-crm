/**
 * recipeService.ts — Layer 5: Canonical Facade for Treatment Consumables and Procedure Recipes.
 * Decomposed in accordance with Mandate 8b (<= 120 lines SSOT).
 */

export { mapRowToLinkDetailed } from "./recipeService/recipeRowMapper.js";
export { listLinks, getLink } from "./recipeService/recipeQueries.js";
export { getRecipeForService } from "./recipeService/recipeForService.js";
export { createLink, updateLink, deleteLink } from "./recipeService/recipeMutations.js";
export { getLinkOptions } from "./recipeService/recipeLinkOptions.js";
