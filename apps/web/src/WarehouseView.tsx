import React from "react";
import { InventoryView } from "./components/InventoryView.js";

/**
 * apps/web/src/WarehouseView.tsx — Canonical facade for Warehouse & Inventory View.
 *
 * Implements Mandate 8s (Law of Single Indivisible Authority):
 * Delegates directly to the canonical authority InventoryView, ensuring zero duplicates.
 */
export const WarehouseView: React.FC<{ organizationId: string }> = (props) => {
	return <InventoryView {...props} />;
};

export default WarehouseView;
