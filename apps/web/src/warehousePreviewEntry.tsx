/**
 * warehousePreviewEntry.tsx — Preview entry for Warehouse Hub SSOT.
 * Governed by Mandates 8e, 8n, 8am, 8ze, Apple HIG.
 */

import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/themes.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/tailwind.css";
import "./theme.css";
import { WarehouseHubModal } from "./components/inventory/WarehouseHubModal.js";

function WarehousePreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const themeParam = params.get("theme") || "light";
	const isDark = themeParam === "dark" || themeParam === "night";

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
		if (isDark) {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
			document.body.classList.add("light");
			document.body.classList.remove("dark");
		}
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
	}, [isDark]);

	return (
		<div className="w-full min-h-screen bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] flex flex-col items-center justify-end sm:justify-center p-0">
			<WarehouseHubModal
				isOpen={true}
				onClose={() => {}}
				organizationId="01a00000-0000-0000-0000-000000000000"
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<WarehousePreviewApp />);
}
