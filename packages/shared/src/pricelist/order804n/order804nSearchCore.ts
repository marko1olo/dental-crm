/**
 * packages/shared/src/pricelist/order804n/order804nSearchCore.ts
 * Layer 2: Facade for Domain Search, Normalization, Lemmatization & Statutory 804n Code Validation.
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Pure Layer 2 domain logic without DOM or network dependencies.
 */

export {
	ORDER_804N_STATUTORY_REGISTRY,
	ORDER_804N_CODE_REGEX,
	normalize804nCode,
	isOrder804nCode,
	validate804nCode,
	find804nEntryByCode,
	get804nEntriesByCategory,
	get804nEntriesBySpecialty,
} from "./order804nCodeValidation.js";

export { stemCyrillicWord, tokenizeAndStem } from "./order804nStemmer.js";

export { search804nRegistry, get804nCategorySummaries } from "./order804nSearchEngine.js";
