/**
 * WarehouseWaybillsTab Facade (Mandate 8b / Decomposer Standard).
 * Re-exports the decomposed modular implementation from ./waybillsTab/index.js.
 */

export type {
	AcceptanceSupplier,
	AcceptanceWaybillDocument,
	AcceptanceWaybillItem,
	AcceptanceWaybillTotals,
	ExpressWaybillModalProps,
	WarehouseWaybillsTabProps,
	WaybillEditorModalProps,
	WaybillItemsGridProps,
	WaybillsListTableProps,
} from "./waybillsTab/index.js";
export {
	default,
	WarehouseWaybillsTab,
} from "./waybillsTab/index.js";
