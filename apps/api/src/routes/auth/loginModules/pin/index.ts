/**
 * apps/api/src/routes/auth/loginModules/pin/index.ts
 *
 * DENTE Dental CRM — Staff PIN Modules Facade.
 */

export {
	extractClinicPayload,
	verifyBruteForceLimit,
	findStaffUserById,
	resolveDemoUser,
	verifyAndMatchStaffUser,
	validateRoleSwitchPin,
} from "./staffPinVerification.js";

export {
	issueStaffSessionToken,
	handleDemoRoleSwitch,
} from "./staffPinSessionTokens.js";
export type {
	StaffAuthResponseUser,
	StaffAuthSuccessResult,
} from "./staffPinSessionTokens.js";
