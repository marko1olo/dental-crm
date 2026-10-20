import React from "react";
import { InventoryServiceUsagePanel } from "../../InventoryServiceUsagePanel.js";
import { WarehouseWaybillsTab } from "../WarehouseWaybillsTab.js";
import { WarehouseInventoryTab } from "../WarehouseInventoryTab.js";
import { InventoryBatchFefoPanel } from "../../InventoryBatchFefoPanel.js";
import { InventoryStockTable } from "../../InventoryStockTable.js";
import type { InventoryItem } from "../useInventoryLogic.js";

export interface InventoryViewContentRouterProps {
	readonly activeSubTab: string;
	readonly stockViewMode: "standard" | "fefo";
	readonly organizationId: string;
	readonly items: readonly InventoryItem[];
	readonly rulesList: any[];
	readonly isLoading: boolean;
	readonly loadError: string | null;
	readonly searchQuery: string;
	readonly inventorySlice: any;
	readonly setDisplayLimit: React.Dispatch<React.SetStateAction<number>>;
	readonly fetchItems: () => Promise<void> | void;
	readonly getHeaders: (h?: Record<string, string>) => Record<string, string>;
	readonly handleApplyInventoryAudit: (doc: any) => Promise<void>;
	readonly openEditModal: (it: InventoryItem) => void;
	readonly openAddModal: () => void;
	readonly setAdjustingItem: (it: InventoryItem | null) => void;
	readonly setAdjustType: (t: "in" | "out") => void;
	readonly setAdjustAmount: (a: string) => void;
	readonly handleDeleteItem: (id: string, name: string) => void;
	readonly setIsAcceptanceWaybillsOpen: (b: boolean) => void;
	readonly setIsWarehouseManagerOpen: (b: boolean) => void;
	readonly setIsInventoryAuditOpen: (b: boolean) => void;
	readonly setIsClinicalWriteoffOpen: (b: boolean) => void;
	readonly handleQuickWriteoffCarpules: () => Promise<any> | void;
}

export const InventoryViewContentRouter: React.FC<InventoryViewContentRouterProps> = (props) => {
	const {
		activeSubTab, stockViewMode, organizationId, items, rulesList, isLoading, loadError,
		searchQuery, inventorySlice, setDisplayLimit, fetchItems, getHeaders, handleApplyInventoryAudit,
		openEditModal, openAddModal, setAdjustingItem, setAdjustType, setAdjustAmount,
		handleDeleteItem, setIsAcceptanceWaybillsOpen, setIsWarehouseManagerOpen,
		setIsInventoryAuditOpen, setIsClinicalWriteoffOpen, handleQuickWriteoffCarpules,
	} = props;

	if (activeSubTab === "rules") {
		return <InventoryServiceUsagePanel organizationId={organizationId} inventoryItems={items} rulesList={rulesList} onRulesUpdated={fetchItems} getHeaders={getHeaders} />;
	}
	if (activeSubTab === "waybills") {
		return <WarehouseWaybillsTab organizationId={organizationId} inventoryItems={items} onRefreshStock={fetchItems} />;
	}
	if (activeSubTab === "audit") {
		return <WarehouseInventoryTab organizationId={organizationId} items={items} onRefresh={fetchItems} onApplyAudit={handleApplyInventoryAudit} />;
	}
	if (stockViewMode === "fefo") {
		return (
			<InventoryBatchFefoPanel
				items={items} isLoading={isLoading} organizationId={organizationId}
				onDeductItem={(item, qty) => { setAdjustingItem(item); setAdjustType("out"); setAdjustAmount(String(qty)); }}
				onReceiveItem={(item, qty) => { setAdjustingItem(item); setAdjustType("in"); setAdjustAmount(String(qty)); }}
				onSelectItem={(item) => openEditModal(item)}
				onWriteOffExpired={(item) => {
					const n = item?.name?.toLowerCase() || "";
					if (n.includes("артикаин") || n.includes("ультракаин") || n.includes("карпул")) handleQuickWriteoffCarpules();
					else setIsClinicalWriteoffOpen(true);
				}}
			/>
		);
	}
	return (
		<InventoryStockTable
			items={inventorySlice.visibleItems} isLoading={isLoading} organizationId={organizationId}
			searchQuery={searchQuery} loadError={loadError} hasMore={inventorySlice.hasMore}
			remainingCount={inventorySlice.remainingCount} onShowMore={() => setDisplayLimit((prev) => prev + 40)}
			onSelectItem={openEditModal} onEditItem={openEditModal}
			onDeductItem={(item) => { setAdjustingItem(item); setAdjustType("out"); setAdjustAmount(""); }}
			onReceiveItem={(item) => { setAdjustingItem(item); setAdjustType("in"); setAdjustAmount(""); }}
			onDeleteItem={handleDeleteItem} onOpenWaybills={() => setIsAcceptanceWaybillsOpen(true)}
			onOpenAddModal={openAddModal} onOpenWarehouseManager={() => setIsWarehouseManagerOpen(true)}
			onOpenInventoryAudit={() => setIsInventoryAuditOpen(true)} onRetry={fetchItems}
		/>
	);
};

export default InventoryViewContentRouter;
