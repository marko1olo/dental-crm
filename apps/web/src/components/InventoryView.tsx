import { Package, TrendingUp } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useInventoryLogic, type InventoryItem } from "./inventory/useInventoryLogic";
import { InventoryRulesTab } from "./inventory/InventoryRulesTab";
import { InventoryItemsTab } from "./inventory/InventoryItemsTab";
import { InventoryModals } from "./inventory/InventoryModals";
import { InventoryHistoryDrawer } from "./inventory/InventoryHistoryDrawer";

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

	const [viewingItemHistory, setViewingItemHistory] = useState<InventoryItem | null>(null);
	const [simulatedBarcode, setSimulatedBarcode] = useState("");
	const [isBarcodeGuideOpen, setIsBarcodeGuideOpen] = useState(false);

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

	const paperBg = "var(--paper)";
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
			{/* HEADER */}
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					marginBottom: 24,
					flexWrap: "wrap",
					gap: 16,
				}}
			>
				<div>
					<h1
						style={{
							fontSize: 24,
							fontWeight: 700,
							margin: 0,
							display: "flex",
							alignItems: "center",
							gap: 12,
							color: "var(--ink)",
						}}
					>
						<Package color="var(--teal)" size={28} /> Склад материалов
					</h1>
					<p style={{ color: "var(--muted)", margin: "4px 0 0 0", fontSize: 14 }}>
						Учёт расходников, приход и списание
					</p>
				</div>
				{/* KPI CARDS */}
				<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
					<div
						style={{
							background: paperBg,
							border: `1px solid ${borderColor}`,
							padding: "12px 20px",
							borderRadius: 12,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							minWidth: 110,
						}}
					>
						<span
							style={{
								fontSize: 11,
								color: "var(--muted)",
								textTransform: "uppercase",
								letterSpacing: 1,
							}}
						>
							Позиций
						</span>
						<strong style={{ fontSize: 22, color: "var(--ink)" }}>
							{totalItems}
						</strong>
					</div>
					<div
						style={{
							background: paperBg,
							border: `1px solid ${borderColor}`,
							padding: "12px 20px",
							borderRadius: 12,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							minWidth: 110,
						}}
					>
						<span
							style={{
								fontSize: 11,
								color: "var(--muted)",
								textTransform: "uppercase",
								letterSpacing: 1,
							}}
						>
							В дефиците
						</span>
						<strong
							style={{
								fontSize: 22,
								color: lowStockCount > 0 ? "var(--tomato)" : "var(--teal)",
							}}
						>
							{lowStockCount}
						</strong>
					</div>
					{totalValue > 0 && (
						<div
							style={{
								background: paperBg,
								border: `1px solid ${borderColor}`,
								padding: "12px 20px",
								borderRadius: 12,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								minWidth: 140,
							}}
						>
							<span
								style={{
									fontSize: 11,
									color: "var(--muted)",
									textTransform: "uppercase",
									letterSpacing: 1,
								}}
							>
								Стоимость склада
							</span>
							<strong
								style={{
									fontSize: 18,
									color: "var(--teal)",
									display: "flex",
									alignItems: "center",
									gap: 4,
								}}
							>
								<TrendingUp size={14} />
								{totalValue.toLocaleString("ru-RU")} ₽
							</strong>
						</div>
					)}
				</div>
			</div>

			{/* SUB-TABS TABS */}
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
						color: activeSubTab === "inventory" ? "var(--teal)" : "var(--muted)",
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
				<InventoryItemsTab
					items={items}
					filteredItems={filteredItems}
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
					openAddModal={openAddModal}
					openEditModal={openEditModal}
					handleDeleteItem={handleDeleteItem}
					setAdjustingItem={setAdjustingItem}
					setAdjustType={setAdjustType}
					setAdjustAmount={setAdjustAmount}
					setViewingItemHistory={setViewingItemHistory}
					fetchHistory={fetchHistory}
					scannedBarcode={scannedBarcode}
					simulatedBarcode={simulatedBarcode}
					setSimulatedBarcode={setSimulatedBarcode}
					triggerBarcodeSimulation={triggerBarcodeSimulation}
					isBarcodeGuideOpen={isBarcodeGuideOpen}
					setIsBarcodeGuideOpen={setIsBarcodeGuideOpen}
				/>
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

			<InventoryHistoryDrawer
				viewingItemHistory={viewingItemHistory}
				setViewingItemHistory={setViewingItemHistory}
				itemHistory={itemHistory}
				setItemHistory={setItemHistory}
				isLoadingHistory={isLoadingHistory}
			/>
		</div>
	);
};
