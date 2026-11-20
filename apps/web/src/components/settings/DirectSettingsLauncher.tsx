/**
 * apps/web/src/components/settings/DirectSettingsLauncher.tsx
 *
 * Standalone direct launcher for Settings Access (RBAC) & Settings Staff tabs.
 * Mounts in AppShell (Mandates 8b <= 100 lines, 8aq, 8am).
 */

import React, { useState, useEffect } from "react";
import { type StaffProfileExtended, staffProfileExtendedSchema } from "@dental/shared";
import { SettingsAccessTab } from "./SettingsAccessTab";
import { SettingsStaffTab } from "./SettingsStaffTab";

const DEMO_STAFF_MEMBERS: StaffProfileExtended[] = [
	staffProfileExtendedSchema.parse({
		id: "11111111-1111-4111-8111-111111111111",
		organizationId: "00000000-0000-4000-8000-000000000001",
		fullName: "Д-р Захаров Андрей Васильевич",
		role: "owner",
		phone: "+7 (999) 111-22-33",
		specialties: ["surgeon", "general"],
		active: true,
	}),
	staffProfileExtendedSchema.parse({
		id: "22222222-2222-4222-8222-222222222222",
		organizationId: "00000000-0000-4000-8000-000000000001",
		fullName: "Д-р Смирнова Елена Павловна",
		role: "curator",
		phone: "+7 (999) 222-33-44",
		specialties: ["therapist", "general"],
		active: true,
	}),
	staffProfileExtendedSchema.parse({
		id: "33333333-3333-4333-8333-333333333333",
		organizationId: "00000000-0000-4000-8000-000000000001",
		fullName: "Кузнецова Анна Сергеевна",
		role: "administrator",
		phone: "+7 (999) 333-44-55",
		specialties: ["universal"],
		active: true,
	}),
];

function checkSettingsMode(): "access" | "staff" | null {
	if (typeof window === "undefined") return null;
	const h = (window.location.hash || "").toLowerCase();
	const s = (window.location.search || "").toLowerCase();
	if (h.includes("staff") || s.includes("staff")) return "staff";
	if (h.includes("access") || s.includes("access") || h.includes("rbac") || s.includes("rbac")) return "access";
	if (h.includes("settings") || s.includes("settings")) return "access";
	return null;
}

export const DirectSettingsLauncher: React.FC = () => {
	const [mode, setMode] = useState<"access" | "staff" | null>(checkSettingsMode);

	useEffect(() => {
		const update = () => setMode(checkSettingsMode());
		window.addEventListener("hashchange", update);
		window.addEventListener("popstate", update);
		return () => {
			window.removeEventListener("hashchange", update);
			window.removeEventListener("popstate", update);
		};
	}, []);

	if (!mode) return null;

	return (
		<main
			data-testid="direct-settings-launcher-root"
			className="fixed inset-0 z-[100000] w-full h-full bg-[var(--paper)] text-[var(--ink)] overflow-y-auto p-3 sm:p-6"
		>
			<div className="max-w-6xl mx-auto w-full">
				{mode === "staff" ? (
					<SettingsStaffTab props={{ dashboard: { clinicSettings: { staff: DEMO_STAFF_MEMBERS, name: "Клиника ДЕНТЕ" } } }} />
				) : (
					<SettingsAccessTab />
				)}
			</div>
		</main>
	);
};
