export type {
	VendorFieldRule,
	VendorProfile,
	VendorProfileMatch,
} from "./types.js";
export { canonicalColumnName } from "./canonicalColumnName.js";
export {
	detectEntityKind,
	matchVendorProfile,
	rulesForEntity,
} from "./matcher.js";
export { VENDOR_PROFILES } from "./profiles/allProfiles.js";
