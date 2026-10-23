/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 * Service Code Validation & Automatic Category Detection (Facade)
 */

export {
	isValidStatutoryCode,
	isValidOrder804nCode,
	isValidCatalogServiceCode,
	isClinicPackageOrCustomService,
} from "./serviceCodeValidation";

export {
	detectCategoryFromServiceCode,
	detectCategoryFrom804nCode,
} from "./serviceCategoryDetector";
