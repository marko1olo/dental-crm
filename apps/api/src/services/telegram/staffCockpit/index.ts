/**
 * staffCockpit/index.ts
 *
 * Layer 5: Единый канонический barrel-экспорт мобильного кокпита персонала в Telegram.
 * 100% паритет всех 17 публичных сущностей.
 */

export type {
	StaffCockpitRole,
	MedicalSecrecySanitizeResult,
	StaffAuthTokenRecord,
	DoctorEventType,
	DoctorEventPushParams,
	DoctorEventPushResult,
	DoctorMorningDigestResult,
	ExecutiveEveningReportResult,
	InventoryShortageItem,
	LowInventoryAlertResult,
} from "./types.js";

export {
	mapUserRoleToStaffCockpitRole,
	formatStaffRoleLabel,
	formatPatientInitials,
	sanitizePhoneForCall,
	sanitizeStaffPushFor323FZ,
	clearInMemoryStaffTokensForTest,
	inMemoryStaffTokens,
} from "./sanitizers.js";

export {
	buildStaffRoleMenuKeyboard,
	buildDoctorMorningDigest,
	buildDoctorEventPush,
	buildExecutiveEveningReport,
	buildLowInventoryAlert,
} from "./digestBuilders.js";

export {
	dispatchDoctorPush,
} from "./pushDispatcher.js";

export {
	TelegramStaffCockpitService,
} from "./cockpitService.js";
