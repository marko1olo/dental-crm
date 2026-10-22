import React, { useState } from "react";
import { BactericidalRegisterTab } from "./BactericidalRegisterTab.js";
import { CabinetReadinessTab } from "./CabinetReadinessTab.js";
import { GeneralCleaningRegisterTab } from "./GeneralCleaningRegisterTab.js";
import {
	SanpinUvAndCleaningSubHeader,
	type UvAndCleaningSubTab,
} from "./SanpinUvAndCleaningSubHeader.js";

export type { UvAndCleaningSubTab };

export interface SanpinUvAndCleaningRegisterTabProps {
	initialSubTab?: UvAndCleaningSubTab;
}

export function SanpinUvAndCleaningRegisterTab({
	initialSubTab = "readiness",
}: SanpinUvAndCleaningRegisterTabProps) {
	const [activeSubTab, setActiveSubTab] = useState<UvAndCleaningSubTab>(initialSubTab);

	return (
		<div className="sanpin-uv-cleaning-container">
			<SanpinUvAndCleaningSubHeader
				activeSubTab={activeSubTab}
				setActiveSubTab={setActiveSubTab}
			/>

			{activeSubTab === "readiness" && <CabinetReadinessTab />}
			{activeSubTab === "bactericidal" && <BactericidalRegisterTab />}
			{activeSubTab === "cleaning" && <GeneralCleaningRegisterTab />}
		</div>
	);
}
