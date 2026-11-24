/**
 * kktModules/index.ts — Barrel exports for modular LAN KKT driver components.
 */

export {
	DEFAULT_ATOL_PORT,
	DEFAULT_SHTRIKH_PORT,
	DEFAULT_TIMEOUT_MS,
	formatAtolJsonTask,
	formatAtolShiftTask,
	formatShtrikhMCommandPacket,
	formatShtrikhShiftPacket,
	getDefaultKktConfig,
	mapAtolErrorCode,
	mapShtrikhErrorCode,
	pingKktSocket,
	sendShtrikhCommand,
} from "./kktProtocolFraming.js";
export { printKktFiscalReceipt } from "./kktReceiptPrinter.js";
export {
	closeKktShift,
	openKktShift,
	printKktXReport,
} from "./kktShiftOperations.js";
export { checkKktDeviceStatus } from "./kktStatusChecker.js";
