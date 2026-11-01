/**
 * apps/web/src/components/appLayout/modalsContainerModules/standalone/administrative/RecallsStandaloneLauncher.tsx
 *
 * Автономный лаунчер студии повторных вызовов и профосмотров для административного контейнера.
 * Мандаты 8b, 8e, 8aq (Монтирование в живой UI).
 */

import React from "react";
import { DirectRecallLauncher } from "../../../../recalls/DirectRecallLauncher";

export function renderRecallsStandaloneLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const h = window.location.hash || "";
	const s = window.location.search || "";
	const params = new URLSearchParams(s);
	if (
		h.includes("recalls") ||
		h.includes("prophylaxis") ||
		h.includes("recall-hub") ||
		params.get("recalls") === "1"
	) {
		return <DirectRecallLauncher />;
	}
	return null;
}
