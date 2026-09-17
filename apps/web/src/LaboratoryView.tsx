import React from "react";
import { LabOrdersPage } from "./pages/LabOrdersPage.js";

/**
 * apps/web/src/LaboratoryView.tsx — Canonical facade for Dental Laboratory & ZTL Orders.
 *
 * Implements Mandate 8s (Law of Single Indivisible Authority):
 * Delegates directly to the canonical authority LabOrdersPage, ensuring zero duplicates.
 */
export const LaboratoryView: React.FC = () => {
	return <LabOrdersPage />;
};

export default LaboratoryView;
