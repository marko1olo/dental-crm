/**
 * apps/web/src/components/appLayout/modalsContainerModules/standalone/administrative/SanPinStandaloneLauncher.tsx
 * Standalone лаунчер журнала стерилизации и дезинфекции (?sanpin=1, ?sterilization=1, #sanpin, #sterilization)
 * Мандат 8aq: Монтирование в живой UI. Мандат 8b: строго <= 120 строк.
 */

import React from "react";
import { DirectSanpinLauncher } from "../../../../sanpin/DirectSanpinLauncher";
import { DirectSterilizationLauncher } from "../../../../sanpin/DirectSterilizationLauncher";

export function renderSanPinStandaloneLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	const search = new URLSearchParams(s);

	const isSterilization =
		search.get("sterilization") === "1" ||
		search.get("autoclave") === "1" ||
		h.includes("sterilization") ||
		h.includes("autoclave") ||
		h.includes("sanpin-autoclave");

	if (isSterilization) {
		return <DirectSterilizationLauncher />;
	}

	const isSanPin =
		search.get("sanpin") === "1" ||
		h.includes("sanpin");

	if (!isSanPin) return null;

	return <DirectSanpinLauncher />;
}

export const DirectSanPinStandaloneLauncher: React.FC = () => {
	return renderSanPinStandaloneLauncher();
};

export default DirectSanPinStandaloneLauncher;
