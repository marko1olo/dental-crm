import { Package } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useInventoryLogic } from "./inventory/useInventoryLogic";
import { InventoryRulesTab } from "./inventory/InventoryRulesTab";
import { InventoryHeader } from "./inventory/InventoryHeader";
import { InventoryBarcodeGuide } from "./inventory/InventoryBarcodeGuide";
import { InventoryListTable } from "./inventory/InventoryListTable";
import { InventoryModals } from "./inventory/InventoryModals";
import { InventoryItemDrawer } from "./inventory/InventoryItemDrawer";

export const InventoryView: React.FC<{ organizationId: string }> = ({
	organizationId,
}) => {
	const inventory = useInventoryLogic(organizationId);
	const {
		items,
		isLoading,
		dashboard,
		scannedBarcode,
		activeSubTab,
		setActiveSubTab,
		selectedServiceId,
		setSelectedServiceId,
		rulesList,
		isLoadingRules,
		selectedInventoryItemId,
		setSelectedInventoryItemId,
		quantityToDeduct,
		setQuantityToDeduct,
		handleAddRule,
		handleDeleteRule,
		searchQuery,
		setSearchQuery,
		showModal,
		setShowModal,
		editingItem,
		formData,
		setFormData,
		adjustingItem,
		setAdjustingItem,
		adjustAmount,
		setAdjustAmount,
		adjustType,
		setAdjustType,
		openAddModal,
		openEditModal,
		handleSaveItem,
		handleDeleteItem,
		handleAdjustStock,
		filteredItems,
		totalValue,
		lowStockCount,
		totalItems,
		itemHistory,
		isLoadingHistory,
		fetchHistory,
		setItemHistory,
	} = inventory;

	const [viewingItemHistory, setViewingItemHistory] = useState<any | null>(null);

	const triggerBarcodeSimulation = (barcodeStr: string) => {
		const code = barcodeStr.trim();
		if (!code) return;

		let delay = 0;
		for (let i = 0; i < code.length; i++) {
			const char = code[i] || "";
			setTimeout(() => {
				const event = new KeyboardEvent("keydown", {
					key: char,
					bubbles: true,
					cancelable: true,
				});
				window.dispatchEvent(event);
			}, delay);
			delay += 12;
		}

		setTimeout(() => {
			const event = new KeyboardEvent("keydown", {
				key: "Enter",
				bubbles: true,
				cancelable: true,
			});
			window.dispatchEvent(event);
		}, delay + 15);
	};

	const borderColor = "var(--line)";

	if (isLoading && items.length === 0) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: "100%",
					color: "var(--muted)",
					gap: 12,
				}}
			>
				<Package size={20} />
				Загрузка склада...
			</div>
		);
	}

	return (
		<div
			style={{
				padding: 24,
				maxWidth: 1200,
				margin: "0 auto",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				gap: 0,
			}}
		>
			<InventoryHeader
				totalItems={totalItems}
				lowStockCount={lowStockCount}
				totalValue={totalValue}
			/>

			{/* SUB-TABS */}
			<div
				style={{
					display: "flex",
					gap: 8,
					marginBottom: 20,
					borderBottom: `1px solid ${borderColor}`,
					paddingBottom: 8,
				}}
			>
				<button
					type="button"
					onClick={() => setActiveSubTab("inventory")}
					style={{
						padding: "8px 16px",
						borderRadius: 8,
						background:
							activeSubTab === "inventory"
								? "var(--teal-50, rgba(20, 184, 166, 0.1))"
								: "transparent",
						border: "none",
						color:
							activeSubTab === "inventory" ? "var(--teal)" : "var(--muted)",
						fontWeight: 600,
						fontSize: 14,
						cursor: "pointer",
						transition: "all 0.2s ease",
					}}
				>
					📦 Складские остатки
				</button>
				<button
					type="button"
					onClick={() => setActiveSubTab("rules")}
					style={{
						padding: "8px 16px",
						borderRadius: 8,
						background:
							activeSubTab === "rules"
								? "var(--teal-50, rgba(20, 184, 166, 0.1))"
								: "transparent",
						border: "none",
						color: activeSubTab === "rules" ? "var(--teal)" : "var(--muted)",
						fontWeight: 600,
						fontSize: 14,
						cursor: "pointer",
						transition: "all 0.2s ease",
					}}
				>
					⚙️ Правила списания
				</button>
			</div>

			{activeSubTab === "inventory" ? (
				<>
					<InventoryBarcodeGuide
						scannedBarcode={scannedBarcode}
						triggerBarcodeSimulation={triggerBarcodeSimulation}
					/>

					<InventoryListTable
						searchQuery={searchQuery}
						setSearchQuery={setSearchQuery}
						openAddModal={openAddModal}
						filteredItems={filteredItems}
						setViewingItemHistory={setViewingItemHistory}
						fetchHistory={fetchHistory}
						openEditModal={openEditModal}
						handleDeleteItem={handleDeleteItem}
						setAdjustingItem={setAdjustingItem}
						setAdjustType={setAdjustType}
						setAdjustAmount={setAdjustAmount}
					/>
				</>
			) : (
				<InventoryRulesTab
					dashboard={dashboard}
					selectedServiceId={selectedServiceId}
					setSelectedServiceId={setSelectedServiceId}
					handleAddRule={handleAddRule}
					selectedInventoryItemId={selectedInventoryItemId}
					setSelectedInventoryItemId={setSelectedInventoryItemId}
					items={items}
					quantityToDeduct={quantityToDeduct}
					setQuantityToDeduct={setQuantityToDeduct}
					isLoadingRules={isLoadingRules}
					rulesList={rulesList}
					handleDeleteRule={handleDeleteRule}
				/>
			)}

			<InventoryModals
				showModal={showModal}
				setShowModal={setShowModal}
				editingItem={editingItem}
				formData={formData}
				setFormData={setFormData}
				handleSaveItem={handleSaveItem}
				adjustingItem={adjustingItem}
				setAdjustingItem={setAdjustingItem}
				adjustType={adjustType}
				setAdjustType={setAdjustType}
				adjustAmount={adjustAmount}
				setAdjustAmount={setAdjustAmount}
				handleAdjustStock={handleAdjustStock}
			/>

			<InventoryItemDrawer
				viewingItemHistory={viewingItemHistory}
				setViewingItemHistory={setViewingItemHistory}
				setItemHistory={setItemHistory}
				isLoadingHistory={isLoadingHistory}
				itemHistory={itemHistory}
				openEditModal={openEditModal}
				setAdjustingItem={setAdjustingItem}
				setAdjustType={setAdjustType}
				setAdjustAmount={setAdjustAmount}
			/>
		</div>
	);
};
