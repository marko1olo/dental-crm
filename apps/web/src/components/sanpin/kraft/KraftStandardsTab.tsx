/**
 * DENTE CRM — Kraft Package Statutory Standards & Indicators Subcomponent
 * SanPiN 3.3686-21 & GOST ISO 11140-1 Reference Tables
 */

import React from "react";
import { KraftIndicatorsTable } from "./KraftIndicatorsTable.js";
import { KraftMaterialsTable } from "./KraftMaterialsTable.js";

export const KraftStandardsTab: React.FC = () => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			<KraftMaterialsTable />
			<KraftIndicatorsTable />
		</div>
	);
};

export default KraftStandardsTab;
