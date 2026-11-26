/**
 * SpecializedAdministrativeLaunchers — Совместимый фасад (DirectShiftLauncher сохранен для контура смен).
 */

import React from "react";
import type { StandaloneLaunchersProps } from "../modalsContainerTypes";
import { DirectShiftLauncher } from "../../../shift/DirectShiftLauncher";

export function renderSpecializedAdministrativeLaunchers(
	_props: StandaloneLaunchersProps,
): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const h = window.location.hash || "";
	const s = window.location.search || "";
	if (
		h === "#shift-closing" ||
		h.startsWith("#shift-closing?") ||
		h === "#z-report" ||
		h.startsWith("#z-report?") ||
		s.includes("z_report=1") ||
		s.includes("shift_closing=1")
	) {
		return <DirectShiftLauncher />;
	}
	return null;
}
