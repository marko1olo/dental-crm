/**
 * EgiszBlankPermissionsWidget facade — re-exports modular implementation.
 * Ensures 100% backward compatibility for all existing call sites.
 */
export { EgiszBlankPermissionsWidget } from "./egiszModules/EgiszBlankPermissionsWidget";
export {
	readBlankPermissions,
	cleanBlankLabel,
	type EgiszPermissionItem,
	type EgiszAuditLogItem,
	type DoctorSpecialtyCode,
} from "./egiszModules/egiszWidgetTypes";
