/**
 * WarehouseWaybillsTab Facade (Mandate 8b / Decomposer Standard).
 * Re-exports the decomposed modular implementation from ./waybillsTab/index.js.
 */

export {
	WarehouseWaybillsTab,
	default,
} from "./waybillsTab/index.js";

export type {
	WarehouseWaybillsTabProps,
	AcceptanceSupplier,
	AcceptanceWaybillDocument,
	AcceptanceWaybillItem,
	AcceptanceWaybillTotals,
	WaybillsListTableProps,
	WaybillItemsGridProps,
	WaybillEditorModalProps,
	ExpressWaybillModalProps,
} from "./waybillsTab/index.js";
