/**
 * PricelistStandaloneLauncher — Автономный лаунчер прейскуранта и каталога услуг.
 * Мандат 8b (<= 120 строк), Мандат 8aq (Монтирование в живой UI).
 */

import React, { Suspense } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { ServicePricelistManagerModal } from "../../../../catalog/pricelist/ServicePricelistManagerModal";
import { CANONICAL_SERVICE_PRESETS } from "../../../../catalog/pricelist/servicePricelistPresets";

export function renderPricelistStandaloneLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	const isPricelist =
		s.includes("pricelist") ||
		s.includes("catalog") ||
		h.includes("pricelist") ||
		h.includes("catalog");

	if (!isPricelist) return null;

	const handleClose = () => {
		const url = new URL(window.location.href);
		url.searchParams.delete("pricelist");
		url.searchParams.delete("catalog");
		const cleanHash = window.location.hash.replace(/#pricelist|#catalog/g, "");
		window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
		window.location.reload();
	};

	return (
		<Suspense fallback={<AppLoadingState message="Загрузка каталога и прейскуранта услуг..." />}>
			<div className="w-full h-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center">
				<ServicePricelistManagerModal
					isOpen={true}
					initialItems={CANONICAL_SERVICE_PRESETS}
					onClose={handleClose}
					onSaveCatalog={handleClose}
				/>
			</div>
		</Suspense>
	);
}

export const DirectPricelistStandaloneLauncher: React.FC = () => {
	return renderPricelistStandaloneLauncher();
};
