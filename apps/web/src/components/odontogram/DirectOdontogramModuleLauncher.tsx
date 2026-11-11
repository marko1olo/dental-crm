/**
 * apps/web/src/components/odontogram/DirectOdontogramModuleLauncher.tsx
 *
 * DENTE Dental CRM — Standalone Direct OdontogramModule Launcher (Mandates 8aq, 8b, 8e).
 * Mounts full OdontogramModule with OdontogramViewContainer, OdontogramBatchBar,
 * Wheeler 2.5D Vector Arch, and 1-Click Clinical Actions.
 *
 * Deep Links: ?stand=module, ?stand=odontogram, ?odontogram-module=1, #odontogram-module.
 */

import React, { useState, useEffect, useMemo } from "react";
import { OdontogramModule } from "./OdontogramModule";
import { AppLogicProvider, type AppLogicContextType } from "../../contexts/AppLogicContext";

export function checkIsOdontogramModuleActive(): boolean {
	if (typeof window === "undefined") return true;
	if (typeof process !== "undefined" && process.env.NODE_ENV === "test") return true;
	const h = (window.location?.hash || "").toLowerCase();
	const s = (window.location?.search || "").toLowerCase();
	const params = new URLSearchParams(s);
	return (
		h.includes("odontogram") ||
		h.includes("dental-chart") ||
		h.includes("odontogram-module") ||
		h.includes("stand-module") ||
		params.get("stand") === "module" ||
		params.get("stand") === "odontogram" ||
		params.get("odontogram-module") === "1" ||
		params.get("odontogram") === "1" ||
		params.get("dental_chart") === "1"
	);
}

export const DirectOdontogramModuleLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState(checkIsOdontogramModuleActive);

	useEffect(() => {
		const handleLocationChange = () => {
			setIsActive(checkIsOdontogramModuleActive());
		};
		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
		};
	}, []);

	const fallbackAppLogic = useMemo(() => ({
		odontogramUseSurfaces: true,
		activePatient: {
			id: "demo-patient-1",
			fullName: "Демонстрационная карта",
			birthDate: "1990-05-15",
			allergies: [],
		},
		activeDoctor: {
			id: "doc-1",
			fullName: "Д-р Соколов А. В.",
			specialty: "Врач-стоматолог-терапевт",
		},
		auth: { role: "owner" },
		money: (rub: number) => `${rub.toLocaleString("ru-RU")} ₽`,
	}) as unknown as AppLogicContextType, []);

	if (!isActive) return null;

	return (
		<AppLogicProvider value={fallbackAppLogic}>
			<main
				data-testid="direct-odontogram-module-launcher"
				className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col p-2 sm:p-4 box-border max-w-7xl mx-auto"
			>
				<OdontogramModule patientId="demo-patient-1" />
			</main>
		</AppLogicProvider>
	);
};
