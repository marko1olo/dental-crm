import React from "react";
import { HardwareSettingsTabContent } from "./hardware/HardwareSettingsTabContent.js";

if (typeof window !== "undefined") {
	void import("./HardwareSettingsTab.css");
}

export type { HardwareDomainTab } from "./hardware/HardwareSettingsTabContent.js";

export function HardwareSettingsTab() {
	return <HardwareSettingsTabContent />;
}
