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
import type { Patient } from "@dental/shared";
import { OdontogramModule } from "./OdontogramModule";
import { AppLogicProvider, type AppLogicContextType } from "../../contexts/AppLogicContext";
import { usePatientStore } from "../../store/patientStore";
import { isDemoShowcaseMode } from "../../lib/demoMode";

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

function resolveLauncherPatientId(): string {
	if (typeof window !== "undefined") {
		const s = new URLSearchParams(window.location.search || "");
		const fromSearch = s.get("patientId") || s.get("patient") || s.get("id");
		if (fromSearch) return fromSearch;
		const hashMatch = /[?&#](?:patientId|patient|id)=([^&]+)/.exec(window.location.hash || "");
		if (hashMatch?.[1]) return decodeURIComponent(hashMatch[1]);
	}
	const storePatientId = usePatientStore.getState().selectedPatientId;
	if (storePatientId) return storePatientId;
	return isDemoShowcaseMode() ? "demo-patient-1" : "00000000-0000-0000-0000-000000000001";
}

function resolveLauncherOrgId(): string {
	if (typeof window !== "undefined") {
		const s = new URLSearchParams(window.location.search || "");
		const fromSearch = s.get("organizationId") || s.get("orgId") || s.get("org");
		if (fromSearch) return fromSearch;
	}
	return isDemoShowcaseMode() ? "org-demo" : "00000000-0000-0000-0000-000000000001";
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

	const effectivePatientId = useMemo(() => resolveLauncherPatientId(), []);
	const effectiveOrgId = useMemo(() => resolveLauncherOrgId(), []);
	const isDemo = isDemoShowcaseMode();

	const fallbackAppLogic: Partial<AppLogicContextType> = useMemo(() => ({
		odontogramUseSurfaces: true,
		activePatient: {
			id: effectivePatientId,
			organizationId: effectiveOrgId,
			fullName: isDemo ? "Демонстрационная карта" : `Пациент #${effectivePatientId.slice(0, 8)}`,
			phone: null,
			birthDate: "1990-05-15",
			gender: "other",
			email: null,
			notes: null,
			status: "active",
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
			allergies: null,
		} as Patient,
		activeDoctor: {
			id: "00000000-0000-0000-0000-000000000002",
			organizationId: effectiveOrgId,
			fullName: "Д-р Соколов А. В.",
			role: "doctor",
			specialties: ["therapist"],
			phone: null,
			email: null,
			active: true,
			canSignMedicalRecords: true,
			canManageMoney: false,
			canManageImports: false,
			color: "#3b82f6",
			workingHours: null,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		},
		money: (v: unknown) => {
			const rub = typeof v === "number" ? v : Number(v) || 0;
			return `${rub.toLocaleString("ru-RU")} ₽`;
		},
	}), [effectivePatientId, effectiveOrgId, isDemo]);

	if (!isActive) return null;

	return (
		<AppLogicProvider value={fallbackAppLogic}>
			<main
				data-testid="direct-odontogram-module-launcher"
				className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col p-2 sm:p-4 box-border max-w-7xl mx-auto"
			>
				<OdontogramModule patientId={effectivePatientId} />
			</main>
		</AppLogicProvider>
	);
};
