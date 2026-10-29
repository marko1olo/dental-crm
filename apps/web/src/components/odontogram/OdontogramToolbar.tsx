/**
 * DENTE Dental CRM — Odontogram Unified Clinical Toolbar Facade
 *
 * Consolidated per Mandate 8b: unified SSOT in OdontogramQuickBar.tsx
 */

import React from "react";
import { OdontogramQuickBar, type OdontogramQuickBarProps } from "./OdontogramQuickBar";
import type { OdontogramToolbarProps } from "./odontogramToolbarTypes";

export type { OdontogramToolbarProps, OdontogramQuickBarProps };

export const OdontogramToolbar: React.FC<OdontogramQuickBarProps> = React.memo(
	(props) => {
		return <OdontogramQuickBar {...props} />;
	},
);
OdontogramToolbar.displayName = "OdontogramToolbar";

export { OdontogramQuickBar };
