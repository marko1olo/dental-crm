import React, { useState } from "react";
import { OnlineBookingConversionPanel } from "./OnlineBookingConversionPanel";
import { MarketingRomiTable } from "../marketing/MarketingRomiTable";
import { MarketingAttributionHeader } from "./marketingModules/MarketingAttributionHeader";
import { PatientFieldRequirementsSettings } from "./marketingModules/PatientFieldRequirementsSettings";

export function MarketingAttributionDashboard() {
	const [activeSection, setActiveSection] = useState<"attribution" | "romi" | "field_settings">("attribution");

	return (
		<div className="space-y-6" data-testid="marketing-attribution-dashboard">
			<MarketingAttributionHeader activeSection={activeSection} onSelectSection={setActiveSection} />
			{activeSection === "attribution" && <OnlineBookingConversionPanel />}
			{activeSection === "romi" && <MarketingRomiTable />}
			{activeSection === "field_settings" && <PatientFieldRequirementsSettings />}
		</div>
	);
}
