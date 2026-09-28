/**
 * LabOrdersView.tsx — Dental Laboratory Orders & Prosthetics Workflow View.
 * Canonical alias/facade for LabOrdersPage in DENTE CRM.
 */

import React from "react";
import { LabOrdersPage } from "./LabOrdersPage";

export { LabOrdersPage };
export const LabOrdersView: React.FC = () => {
	return <LabOrdersPage />;
};

export default LabOrdersView;
