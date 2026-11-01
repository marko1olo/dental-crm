import type { StoreApi } from "zustand";
import type { TelephonyStore } from "./telephonyStoreTypes";
import { fetchCallHistoryAction } from "./telephonySlaAndLeadActions";
import {
	createCallLineManagementActions,
	createCallAudioStreamActions,
	createCallTransferAndDtmfActions,
} from "./callActions";

export * from "./telephonySlaAndLeadActions";
export * from "./callActions";

type SetState = StoreApi<TelephonyStore>["setState"];
type GetState = StoreApi<TelephonyStore>["getState"];

/**
 * Координатор-фасад действий телефонии DENTE CRM.
 * Объединяет управление линиями, аудио-потоками, CTI-трансфером и SLA/лид-захватом.
 * Соответствует Мандату 8b/8zi (размер фасада < 90 строк).
 */
export function createTelephonyCallActions(set: SetState, get: GetState) {
	return {
		...createCallLineManagementActions(set, get),
		...createCallAudioStreamActions(set, get),
		...createCallTransferAndDtmfActions(set, get),
		fetchCallHistory: () => fetchCallHistoryAction(set, get),
	};
}
