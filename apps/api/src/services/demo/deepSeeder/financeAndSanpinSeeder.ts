/**
 * financeAndSanpinSeeder.ts — Facade for ZTL Lab Orders, FEFO Warehouse, CRM Leads, DMS, SanPiN, and Finance (Layer 5).
 *
 * Decomposed into modular domain seeders in ./sanpinModules/ under DAG compliance:
 *   - crmWarehouseLabSeederModule.ts: seedLabOrders, seedWarehouseAndInventory, seedCrmLeads
 *   - insuranceIntegrationsSeederModule.ts: seedInsuranceAndIntegrations
 *   - sanpinSterilizationSeederModule.ts: seedSanpinRegisters
 *   - financePaymentsSeederModule.ts: seedDemoFinanceAndPayments
 */

export {
	seedLabOrders,
	seedWarehouseAndInventory,
	seedCrmLeads,
} from "./sanpinModules/crmWarehouseLabSeederModule.js";

export { seedInsuranceAndIntegrations } from "./sanpinModules/insuranceIntegrationsSeederModule.js";

export { seedSanpinRegisters } from "./sanpinModules/sanpinSterilizationSeederModule.js";

export { seedDemoFinanceAndPayments } from "./sanpinModules/financePaymentsSeederModule.js";

