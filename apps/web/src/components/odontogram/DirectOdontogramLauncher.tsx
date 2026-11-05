/**
 * apps/web/src/components/odontogram/DirectOdontogramLauncher.tsx
 * DENTE Dental CRM — Standalone Direct Odontogram Studio Launcher.
 * Deep Link Mount: #odontogram, #dental-chart, ?odontogram=1, #odontogram-studio.
 * Mounts in AppShell & StandaloneLaunchers (Mandates 8b, 8aq, Sweet Spot <= 150 lines).
 */
import React, { useState, useEffect, useCallback } from "react";
import { OdontogramStudioModal } from "./OdontogramStudioModal";
import { createIntactDentition, type OdontogramToothEntry } from "./odontogramCatalogData";
import { loadTeethFromLocalCache } from "./syncModules/odontogramIndexedDbSync";

function checkIsOdontogramActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = (window.location.hash || "").toLowerCase();
	const s = (window.location.search || "").toLowerCase();
	const params = new URLSearchParams(s);
	return (
		h.includes("odontogram") ||
		h.includes("dental-chart") ||
		h.includes("arch32") ||
		params.get("odontogram") === "1" ||
		params.get("dental_chart") === "1" ||
		params.get("stand") === "arch32"
	);
}

export const DirectOdontogramLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState(checkIsOdontogramActive);
	const [isOpen, setIsOpen] = useState(true);
	const [teeth, setTeeth] = useState<Record<number, OdontogramToothEntry>>(() => {
		const cached = loadTeethFromLocalCache("vis-chairside-8821");
		if (cached && cached.length > 0) {
			const map: Record<number, OdontogramToothEntry> = {};
			for (const t of cached) {
				map[t.toothNumber] = { toothNumber: t.toothNumber, state: t.state || "Healthy", surfaces: t.surfaces ? [...t.surfaces] : [] };
			}
			return map;
		}
		const base = createIntactDentition("adult");
		if (base[16]) base[16] = { toothNumber: 16, state: "Caries", surfaces: ["Occ", "M"] };
		if (base[26]) base[26] = { toothNumber: 26, state: "Filled", surfaces: ["Occ"] };
		if (base[36]) base[36] = { toothNumber: 36, state: "Crown", surfaces: ["Occ", "V", "L"] };
		if (base[46]) base[46] = { toothNumber: 46, state: "Implant", surfaces: [] };
		if (base[48]) base[48] = { toothNumber: 48, state: "Missing", surfaces: [] };
		return base;
	});

	const [theme, setTheme] = useState<"light" | "dark">(() => {
		if (typeof window !== "undefined") {
			const s = window.location.search || "";
			const h = window.location.hash || "";
			if (s.includes("dark") || h.includes("dark") || document.documentElement.classList.contains("dark")) return "dark";
		}
		return "light";
	});

	useEffect(() => {
		const handleLocationChange = () => {
			const active = checkIsOdontogramActive();
			setIsActive(active);
			if (active) setIsOpen(true);
		};
		const handleOpenOdontogram = () => { setIsActive(true); setIsOpen(true); };
		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		window.addEventListener("dente:open-odontogram", handleOpenOdontogram);
		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
			window.removeEventListener("dente:open-odontogram", handleOpenOdontogram);
		};
	}, []);

	useEffect(() => {
		if (typeof document !== "undefined") {
			document.documentElement.classList.toggle("dark", theme === "dark");
			document.documentElement.classList.toggle("light", theme !== "dark");
		}
	}, [theme]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		setIsActive(false);
		if (typeof window !== "undefined" && (window.location.hash.includes("odontogram") || window.location.hash.includes("dental-chart"))) {
			window.history.replaceState(null, "", window.location.pathname + window.location.search);
		}
	}, []);

	const handleSave = useCallback((updatedTeeth: Record<number, OdontogramToothEntry>) => {
		setTeeth(updatedTeeth);
		setIsOpen(false);
		setIsActive(false);
	}, []);

	if (!isActive) return null;

	return (
		<main data-testid="direct-odontogram-launcher-root" className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-center p-4 relative">
			<div className="fixed top-3 right-3 z-40 hidden sm:flex items-center gap-2 bg-[var(--paper-strong)] border border-[var(--line)] px-3 py-1.5 rounded-xl shadow-xs">
				<span className="text-xs text-[var(--ink-muted)]">Тема:</span>
				<button
					type="button"
					onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
					className="text-xs font-semibold px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
				>
					{theme === "dark" ? "🌙 Dark" : "☀️ Light"}
				</button>
			</div>

			<OdontogramStudioModal
				isOpen={isOpen}
				onClose={handleClose}
				initialTeeth={teeth}
				onSaveTeeth={handleSave}
				patientName="Иванов Сергей Павлович (34 года)"
				visitId="vis-chairside-8821"
			/>
		</main>
	);
};

export default DirectOdontogramLauncher;
