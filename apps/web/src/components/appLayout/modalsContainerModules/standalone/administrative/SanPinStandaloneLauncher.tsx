/**
 * apps/web/src/components/appLayout/modalsContainerModules/standalone/administrative/SanPinStandaloneLauncher.tsx
 * Standalone лаунчер журнала стерилизации и дезинфекции (?sanpin=1, ?sterilization=1, #sanpin)
 * Мандат 8aq: Монтирование в живой UI. Мандат 8b: строго <= 120 строк.
 */

import React from "react";
import { DirectSanpinLauncher } from "../../../../sanpin/DirectSanpinLauncher";

export function renderSanPinStandaloneLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	const search = new URLSearchParams(s);

	const isSanPinStandalone =
		search.get("sanpin") === "1" ||
		search.get("sterilization") === "1" ||
		h.includes("sanpin") ||
		h.includes("sterilization");

	if (!isSanPinStandalone) return null;

	return <DirectSanpinLauncher />;
}

export const DirectSanPinStandaloneLauncher: React.FC = () => {
	return renderSanPinStandaloneLauncher();
};

export default DirectSanPinStandaloneLauncher;
