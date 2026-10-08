/**
 * Канонический фасад профилей сторонних МИС/CRM (IDENT, DentalPRO, Инфодент, 1С, StomX, Open Dental, Dentrix).
 * Логика декомпозирована в директорию ./vendorProfiles/ в соответствии с /decomposer DAG Layering.
 */

export type {
	VendorFieldRule,
	VendorProfile,
	VendorProfileMatch,
} from "./vendorProfiles/index.js";

export {
	canonicalColumnName,
	detectEntityKind,
	matchVendorProfile,
	rulesForEntity,
} from "./vendorProfiles/index.js";
