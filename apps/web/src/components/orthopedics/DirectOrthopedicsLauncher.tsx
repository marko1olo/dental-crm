/**
 * DirectOrthopedicsLauncher.tsx — Автономный лаунчер ортопедической студии и коронок (Мандат 8b 60–100 строк, 8aq).
 * Deep Link Mount: #orthopedics, #crowns, #ortho-studio, ?ortho=1, ?orthopedics=1, ?crowns=1, ?standalone=orthopedics.
 * Монтируется в AppShell.tsx и StandaloneLaunchers.tsx (Мандат 8aq).
 */

import React, { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import { OrthopedicsChairsidePanel } from "./OrthopedicsChairsidePanel.js";

function checkIsOrthopedicsActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash.toLowerCase();
	const s = window.location.search.toLowerCase();
	const params = new URLSearchParams(s);
	return (
		h.includes("orthopedics") || h.includes("crowns") ||
		params.get("orthopedics") === "1" || params.get("crowns") === "1" || params.get("standalone") === "orthopedics"
	);
}

function readToothFromUrl(): string {
	if (typeof window === "undefined") return "16";
	const params = new URLSearchParams(window.location.search || "");
	const toothParam = params.get("tooth") || params.get("toothFdi") || params.get("toothNumber");
	if (toothParam) {
		const parsed = parseInt(toothParam, 10);
		if (!Number.isNaN(parsed) && parsed >= 11 && parsed <= 48) return String(parsed);
	}
	return "16";
}

export const DirectOrthopedicsLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState<boolean>(checkIsOrthopedicsActive);
	const [isOpen, setIsOpen] = useState<boolean>(true);
	const [toothFdi, setToothFdi] = useState<string>(readToothFromUrl);

	useEffect(() => {
		const handleLocationChange = () => {
			const active = checkIsOrthopedicsActive();
			setIsActive(active);
			if (active) { setIsOpen(true); setToothFdi(readToothFromUrl()); }
		};
		const handleOpenEvent = (e: Event) => {
			setIsActive(true); setIsOpen(true);
			const custom = e as CustomEvent<{ toothFdi?: string | number }>;
			setToothFdi(custom.detail?.toothFdi ? String(custom.detail.toothFdi) : readToothFromUrl());
		};

		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		window.addEventListener("dente:open-orthopedics", handleOpenEvent);
		window.addEventListener("dente:open-crowns", handleOpenEvent);

		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
			window.removeEventListener("dente:open-orthopedics", handleOpenEvent);
			window.removeEventListener("dente:open-crowns", handleOpenEvent);
		};
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false); setIsActive(false);
		if (typeof window !== "undefined") {
			const hash = window.location.hash;
			if (hash.includes("orthopedics") || hash.includes("crowns")) {
				const cleanHash = hash.replace(/#(orthopedics-studio|orthopedics|crowns)/gi, "");
				const url = new URL(window.location.href);
				url.searchParams.delete("orthopedics"); url.searchParams.delete("crowns");
				if (url.searchParams.get("standalone") === "orthopedics") url.searchParams.delete("standalone");
				window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
			}
		}
	}, []);

	if (!isActive || !isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[10060] flex items-center justify-center p-2 sm:p-4 bg-black/55 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			data-testid="direct-orthopedics-launcher-modal"
			onClick={handleClose}
		>
			<div
				className="relative w-full max-w-5xl max-h-[94vh] flex flex-col bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--line,#e2e8f0)]"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,#f8fafc)]">
					<div>
						<h2 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)]">
							Ортопедия и зуботехническая лаборатория (ЗТЛ)
						</h2>
						<p className="text-xs text-[var(--muted,#64748b)]">
							Кресельный протокол ортопеда, заказ-наряды и гарантийный паспорт изделия
						</p>
					</div>
					<button
						type="button"
						onClick={handleClose}
						className="w-11 h-11 flex items-center justify-center rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#fff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>
				<div className="flex-1 overflow-y-auto p-3 sm:p-5">
					<OrthopedicsChairsidePanel
						patientName={isDemoShowcaseMode() ? "Ковалев Дмитрий Сергеевич" : undefined}
						doctorName={isDemoShowcaseMode() ? "Д-р Смирнова Е. В. (Ортопед)" : undefined}
						activeToothFdi={toothFdi}
					/>
				</div>
			</div>
		</div>
	);
};

DirectOrthopedicsLauncher.displayName = "DirectOrthopedicsLauncher";
export default DirectOrthopedicsLauncher;
