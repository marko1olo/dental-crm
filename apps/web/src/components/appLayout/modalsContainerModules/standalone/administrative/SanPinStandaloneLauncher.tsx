/**
 * SanPinStandaloneLauncher — Совместимая обёртка над SterilizationBatchCycleModal.
 */

import type React from "react";
import { SterilizationBatchCycleModal } from "../../../../sanpin/SterilizationBatchCycleModal";

export function renderSanPinStandaloneLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	if (h.includes("sterilization") || h.includes("sanpin") || s.includes("sanpin=1")) {
		return (
			<SterilizationBatchCycleModal
				isOpen={true}
				onClose={() => window.history.replaceState(null, "", window.location.pathname)}
			/>
		);
	}
	return null;
}

export const DirectSanPinStandaloneLauncher: React.FC = () => renderSanPinStandaloneLauncher();
export default DirectSanPinStandaloneLauncher;
