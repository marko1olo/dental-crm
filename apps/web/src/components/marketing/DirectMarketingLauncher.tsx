/**
 * apps/web/src/components/marketing/DirectMarketingLauncher.tsx
 * Автономный лаунчер Студии маркетинга, акций и ROMI (Мандаты 8b 50–70 строк, 8e, 8aq).
 * Реагирует на #marketing, #romi, #campaigns, marketing=1, dente:open-marketing.
 */
import React, { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import { MarketingView, type MarketingTab } from "../../MarketingView";
import { MarketingDashboardView } from "../../pages/MarketingDashboardView";

export const DirectMarketingLauncher: React.FC = () => {
	const checkUrlMatch = useCallback((): "cohorts" | MarketingTab | null => {
		if (typeof window === "undefined") return null;
		const h = window.location.hash || "", s = window.location.search || "";
		if (h.includes("cohorts") || s.includes("cohorts")) return "cohorts";
		if (h.includes("romi") || h.includes("roi") || s.includes("romi")) return "romi";
		if (h.includes("marketing") || h.includes("campaigns") || s.includes("marketing=1")) return "promos";
		return null;
	}, []);

	const [activeMode, setActiveMode] = useState<"cohorts" | MarketingTab | null>(checkUrlMatch);

	useEffect(() => {
		const handleHash = () => setActiveMode(checkUrlMatch());
		const handleOpen = () => setActiveMode("promos");
		window.addEventListener("dente:open-marketing", handleOpen);
		window.addEventListener("dente-open-marketing", handleOpen);
		window.addEventListener("hashchange", handleHash);
		return () => {
			window.removeEventListener("dente:open-marketing", handleOpen);
			window.removeEventListener("dente-open-marketing", handleOpen);
			window.removeEventListener("hashchange", handleHash);
		};
	}, [checkUrlMatch]);

	const handleClose = () => {
		setActiveMode(null);
		if (typeof window !== "undefined") {
			const cleanHash = window.location.hash.replace(/#marketing|#romi|#roi|#campaigns|#marketing-cohorts/g, "");
			window.history.replaceState({}, "", window.location.pathname + cleanHash);
		}
	};

	if (!activeMode) return null;
	return (
		<div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4" data-testid="marketing-studio-modal">
			<div className="w-full sm:max-w-7xl h-[96vh] sm:h-[92vh] flex flex-col rounded-t-[24px] sm:rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xl overflow-hidden relative" data-testid="marketing-launcher-content">
				<div className="sm:hidden w-full flex justify-center pt-2 shrink-0"><div className="w-9 h-1 rounded-full bg-[var(--ink-muted)] opacity-40" /></div>
				<button type="button" onClick={handleClose} className="absolute top-3 right-3 z-50 p-2 rounded-xl text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] min-h-[36px] min-w-[36px] flex items-center justify-center" aria-label="Закрыть студию маркетинга" data-testid="btn-close-modal"><X size={20} /></button>
				<div className="flex-1 overflow-y-auto p-2 sm:p-5">
					{activeMode === "cohorts" ? <MarketingDashboardView embedded={false} /> : <MarketingView key={activeMode} initialTab={activeMode} />}
				</div>
			</div>
		</div>
	);
};

export default DirectMarketingLauncher;
