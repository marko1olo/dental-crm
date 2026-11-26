/**
 * apps/web/src/components/settings/DirectSettingsLauncher.tsx
 *
 * Standalone direct launcher for Settings Access (RBAC) & Settings Staff tabs.
 * Mounts in AppShell (Mandates 8b <= 100 lines, 8aq, 8am).
 */

import React, { useState, useEffect } from "react";
import { type StaffProfileExtended, staffProfileExtendedSchema } from "@dental/shared";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { useAppStore } from "../../store/appStore";
import { logger } from "../../utils/logger";
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
	const dashboard = useAppStore((s) => s.dashboard);
	const isDemo = isDemoShowcaseMode();
	const [remoteStaff, setRemoteStaff] = useState<StaffProfileExtended[] | null>(null);
	const [staffFetchDone, setStaffFetchDone] = useState(false);

	useEffect(() => {
		const update = () => setMode(checkSettingsMode());
		window.addEventListener("hashchange", update);
		window.addEventListener("popstate", update);
		return () => {
			window.removeEventListener("hashchange", update);
			window.removeEventListener("popstate", update);
		};
	}, []);

	useEffect(() => {
		if (mode !== "staff" || isDemo || dashboard?.clinicSettings?.staff) return;
		let cancelled = false;
		const loadStaff = async () => {
			try {
				const res = await fetch("/api/staff/extended", {
					headers: getDenteAuthHeaders(),
				});
				if (!res.ok) {
					logger.warn(`[DirectSettingsLauncher] Failed to load staff: HTTP ${res.status}`);
					if (!cancelled) {
						setRemoteStaff([]);
						setStaffFetchDone(true);
					}
					return;
				}
				const raw: unknown = await res.json();
				const payload = (raw as { data?: unknown } | null)?.data ?? raw;
				const parsed = Array.isArray(payload) ? (payload as StaffProfileExtended[]) : [];
				if (!cancelled) {
					setRemoteStaff(parsed);
					setStaffFetchDone(true);
				}
			} catch (err) {
				logger.warn("[DirectSettingsLauncher] Staff fetch error:", err);
				if (!cancelled) {
					setRemoteStaff([]);
					setStaffFetchDone(true);
				}
			}
		};
		void loadStaff();
		return () => {
			cancelled = true;
		};
	}, [mode, isDemo, dashboard?.clinicSettings?.staff]);

	if (!mode) return null;

	const storeStaff = dashboard?.clinicSettings?.staff as StaffProfileExtended[] | undefined;
	const resolvedClinicName =
		dashboard?.clinicSettings?.profile?.clinicName ||
		dashboard?.clinicName ||
		(isDemo ? "Клиника ДЕНТЕ" : "");

	const staffTabProps = isDemo
		? {
				dashboard: {
					clinicSettings: {
						staff: storeStaff?.length ? storeStaff : DEMO_STAFF_MEMBERS,
						name: resolvedClinicName,
					},
				},
			}
		: Boolean(dashboard?.clinicSettings) || staffFetchDone
			? {
					dashboard: {
						clinicSettings: {
							staff: storeStaff ?? remoteStaff ?? [],
							name: resolvedClinicName,
						},
					},
				}
			: {};

	return (
		<main
			data-testid="direct-settings-launcher-root"
			className="fixed inset-0 z-[100000] w-full h-full bg-[var(--paper)] text-[var(--ink)] overflow-y-auto p-3 sm:p-6"
		>
			<div className="max-w-6xl mx-auto w-full">
				{mode === "staff" ? (
					<SettingsStaffTab props={staffTabProps} />
				) : (
					<SettingsAccessTab />
				)}
			</div>
		</main>
	);
};
