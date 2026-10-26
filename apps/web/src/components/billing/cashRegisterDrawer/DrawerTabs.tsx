/**
 * apps/web/src/components/billing/cashRegisterDrawer/DrawerTabs.tsx
 *
 * Navigation tabs for CashRegisterDrawer: Payment, Shift, Receipts, Operations.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { QrCode, ShieldCheck, Receipt, Zap } from "lucide-react";

interface DrawerTabsProps {
	readonly activeTab: "payment" | "shift" | "receipts" | "operations";
	readonly setActiveTab: (tab: "payment" | "shift" | "receipts" | "operations") => void;
	readonly hasSelectedReceipt: boolean;
	readonly setSelectedReceipt: (rec: any) => void;
	readonly receiptsCount: number;
}

export const DrawerTabs: React.FC<DrawerTabsProps> = ({
	activeTab,
	setActiveTab,
	hasSelectedReceipt,
	setSelectedReceipt,
	receiptsCount,
}) => {
	return (
		<div className="cash-drawer-tabs">
			<button
				type="button"
				onClick={() => {
					setActiveTab("payment");
					setSelectedReceipt(null);
				}}
				className={`cash-drawer-tab-btn ${
					activeTab === "payment" && !hasSelectedReceipt ? "is-active" : ""
				}`}
				data-testid="tab-register-payment"
			>
				<QrCode size={14} />
				<span>Касса & СБП</span>
			</button>
			<button
				type="button"
				onClick={() => {
					setActiveTab("shift");
					setSelectedReceipt(null);
				}}
				className={`cash-drawer-tab-btn ${
					activeTab === "shift" && !hasSelectedReceipt ? "is-active" : ""
				}`}
				data-testid="tab-register-shift"
			>
				<ShieldCheck size={14} />
				<span>Смена</span>
			</button>
			<button
				type="button"
				onClick={() => setActiveTab("receipts")}
				className={`cash-drawer-tab-btn ${
					activeTab === "receipts" || hasSelectedReceipt ? "is-active" : ""
				}`}
				data-testid="tab-register-receipts"
			>
				<Receipt size={14} />
				<span>Чеки ({receiptsCount})</span>
			</button>
			<button
				type="button"
				onClick={() => {
					setActiveTab("operations");
					setSelectedReceipt(null);
				}}
				className={`cash-drawer-tab-btn ${
					activeTab === "operations" ? "is-active" : ""
				}`}
				data-testid="tab-register-operations"
			>
				<Zap size={14} />
				<span>Операции</span>
			</button>
		</div>
	);
};
