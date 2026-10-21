import type React from "react";
import { ToothActionDesktopMenu } from "./ToothActionDesktopMenu";
import { ToothActionMobileSheet } from "./ToothActionMobileSheet";
import type { ToothActionMenuPortalProps } from "./toothActionMenuTypes";

export * from "./toothActionMenuTypes";

export const ToothActionMenuPortal: React.FC<ToothActionMenuPortalProps> = (
	props,
) => {
	if (!props.menuConfig || typeof document === "undefined") return null;

	const vw = typeof window !== "undefined" ? window.innerWidth : 1440;

	// Mobile Native Bottom Sheet per Apple HIG & Mandate 8c (< 768px)
	if (vw < 768) {
		return <ToothActionMobileSheet {...props} />;
	}

	return <ToothActionDesktopMenu {...props} />;
};
