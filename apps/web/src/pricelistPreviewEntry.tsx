import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./theme.css";
import "./components/catalog/pricelist/servicePricelist.css";
import { ServicePricelistManagerModal } from "./components/catalog/pricelist/ServicePricelistManagerModal";
import { BASELINE_PRICELIST_SERVICES } from "./components/catalog/pricelist/servicePricelistPresets";

function PricelistPreviewApp() {
	const [isOpen, setIsOpen] = useState(true);
	const [services, setServices] = useState(BASELINE_PRICELIST_SERVICES);

	return (
		<div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-center p-4">
			<ServicePricelistManagerModal
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				services={services as any}
				onSaveServices={(updated) => {
					setServices(updated as any);
					setIsOpen(false);
				}}
			/>
		</div>
	);
}

const rootElement = document.getElementById("root");
if (rootElement) {
	createRoot(rootElement).render(<PricelistPreviewApp />);
}
