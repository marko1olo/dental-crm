/**
 * index.ts — Barrel Index for SanPiN & Expensive Materials Inventory Daemon.
 *
 * Directed Acyclic Graph (DAG) layer exports for SanPiN 3.3686-21 kraft pack monitoring,
 * autoclave validation, surgical inventory reconciliation, and background daemon scheduling.
 */

export type {
	ExpensiveMaterialsInventoryAuditOptions,
	InventoryDiscrepancyType,
	InventoryReconciliationAlertItem,
	KraftPackEvaluationInput,
	SanpinAlertSeverity,
	SanpinAndInventoryAuditDigest,
	SanpinAndInventoryAuditOptions,
	SanpinDaemonSchedulerConfig,
	SanpinPackStatus,
	SanpinSterilizationAlertItem,
	SanpinSterilizationAuditOptions,
	SurgicalActInput,
	WarehouseTransactionInput,
} from "./types.js";

export {
	DISCREPANCY_TYPE_RU_MAP,
	PACKAGING_TYPE_RU_MAP,
} from "./types.js";

export {
	evaluateKraftPackShelfLife,
	runSanpinSterilizationAudit,
} from "./sanpinCycleRunner.js";

export {
	extractRecognizedBrand,
	normalizeText,
	reconcileSurgicalActWithInventory,
	runExpensiveMaterialsInventoryAudit,
} from "./inventoryDeductionRunner.js";

export {
	SanpinDaemonScheduler,
	defaultSanpinDaemonScheduler,
	runSanpinAndInventoryAudit,
} from "./daemonScheduler.js";
