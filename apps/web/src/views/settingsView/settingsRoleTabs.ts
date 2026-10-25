/**
 * @file apps/web/src/views/settingsView/settingsRoleTabs.ts
 * @description Layer 0: Tab role sets for SettingsView.
 */

export type SettingsRoleMode = "doctor" | "admin" | "owner" | "all";

export const DOCTOR_TABS = new Set<string>([
	"profile",
	"preferences",
	"protocols",
	"rules",
	"procedure-boms",
	"ai",
	"hardware",
]);

export const ADMIN_TABS = new Set<string>([
	"clinic",
	"staff",
	"access",
	"messengers",
	"telegram",
	"booking",
	"modules",
	"marketing",
	"bpmn",
]);

export const OWNER_TABS = new Set<string>([
	"clinic",
	"prices",
	"commissions",
	"procedure-boms",
	"insurance",
	"reporting",
	"imports",
	"backup",
	"audit",
	"sources",
	"deep-clinical",
]);

export const ENTERPRISE_ADVANCED_TABS = new Set<string>([
	"bpmn",
	"sources",
	"insurance",
	"reporting",
	"audit",
	"deep-clinical",
]);
