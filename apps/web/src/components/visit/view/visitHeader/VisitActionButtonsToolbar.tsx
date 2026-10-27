/**
 * VisitActionButtonsToolbar.tsx - Canonical Facade
 * Mandate 8b: Facade strictly <= 15 lines.
 */
import React from "react";
import { VisitActionButtonsLayout } from "./toolbar/VisitActionButtonsLayout";
import type { VisitActionButtonsToolbarProps } from "./types";

export function VisitActionButtonsToolbar(props: VisitActionButtonsToolbarProps) {
	return <VisitActionButtonsLayout {...props} />;
}
