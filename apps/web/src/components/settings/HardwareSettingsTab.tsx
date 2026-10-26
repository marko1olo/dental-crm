import React from "react";
import { HardwareSettingsTabContent } from "./hardwareTab/HardwareSettingsTabContent.js";

if (typeof window !== "undefined") {
	void import("./HardwareSettingsTab.css");
}

export type { HardwareDomainTab } from "./hardwareTab/HardwareSettingsTabContent.js";

export function HardwareSettingsTab() {
	return <HardwareSettingsTabContent />;
}
