/**
 * apps/web/src/components/marketing/DirectMarketingLauncher.tsx
 * Автономный лаунчер Студии маркетинга, акций и ROMI (Мандаты 8b 50–70 строк, 8e, 8aq).
 * Реагирует на #marketing, #romi, #campaigns, marketing=1, dente:open-marketing.
 */
import React, { useEffect, useState, useCallback } from "react";
import { MarketingStudioModal } from "./MarketingStudioModal";
import { MarketingDashboardView } from "../../pages/MarketingDashboardView";

export const DirectMarketingLauncher: React.FC = () => {
	const checkUrlMatch = useCallback((): "studio" | "cohorts" | null => {
		if (typeof window === "undefined") return null;
		const h = window.location.hash || "", s = window.location.search || "";
		if (h.includes("cohorts") || s.includes("cohorts")) return "cohorts";
		if (
			h.includes("marketing") || h.includes("romi") || h.includes("campaigns") ||
			s.includes("marketing=1") || s.includes("standalone=marketing")
		) {
			return "studio";
		}
		return null;
	}, []);

	const [activeMode, setActiveMode] = useState<"studio" | "cohorts" | null>(checkUrlMatch);

	useEffect(() => {
		const handleHash = () => setActiveMode(checkUrlMatch());
		const handleOpenStudio = () => setActiveMode("studio");
		window.addEventListener("dente:open-marketing", handleOpenStudio);
		window.addEventListener("dente-open-marketing", handleOpenStudio);
		window.addEventListener("hashchange", handleHash);
		return () => {
			window.removeEventListener("dente:open-marketing", handleOpenStudio);
			window.removeEventListener("dente-open-marketing", handleOpenStudio);
			window.removeEventListener("hashchange", handleHash);
		};
	}, [checkUrlMatch]);

	const handleClose = () => {
		setActiveMode(null);
		if (typeof window !== "undefined") {
			const cleanHash = window.location.hash.replace(/#marketing|#romi|#campaigns|#marketing-cohorts/g, "");
			window.history.replaceState({}, "", window.location.pathname + cleanHash);
		}
	};

	if (!activeMode) return null;
	if (activeMode === "cohorts") {
		return (
			<div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6" data-testid="marketing-cohorts-standalone-wrapper">
				<div className="max-w-7xl mx-auto">
					<MarketingDashboardView clinicName="Стоматология ДЕНТЕ Премиум" embedded={false} />
				</div>
			</div>
		);
	}
	return <MarketingStudioModal isOpen={activeMode === "studio"} onClose={handleClose} />;
};

export default DirectMarketingLauncher;
