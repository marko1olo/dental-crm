/**
 * DENTE CRM — Clinical Quick Guides & Knowledge Base Types
 * Authority: Mandate 8b (Micro-modules <= 120 lines), Mandate 8e/8n
 */

import type React from "react";

export type ClinicalGuideTab =
	| "schedule"
	| "odontogram"
	| "medical_record"
	| "cashier"
	| "imaging"
	| "treatment_plans"
	| "dental_lab"
	| "inventory"
	| "sanpin"
	| "leads"
	| "lan_mesh"
	| "analytics";

export type ClinicalGuideCategory =
	| "clinical"
	| "finance"
	| "diagnostics"
	| "lab_warehouse"
	| "infrastructure";

export interface ClinicalGuideCategoryMeta {
	readonly id: ClinicalGuideCategory;
	readonly label: string;
	readonly description: string;
}

export interface ClinicalGuideMeta {
	readonly id: ClinicalGuideTab;
	readonly category: ClinicalGuideCategory;
	readonly title: string;
	readonly shortTitle: string;
	readonly badge: string;
	readonly description: string;
	readonly hotkeys?: readonly string[];
	readonly keywords: readonly string[];
	readonly targetView?: string;
	readonly tourTrack?: string;
}

export interface ClinicalGuideProps {
	readonly onLaunchTour?: ((trackId?: string) => void) | undefined;
	readonly onNavigate?: ((targetView: string) => void) | undefined;
}

export interface ClinicalHotkeyMeta {
	readonly id: string;
	readonly keyCombination: string;
	readonly title: string;
	readonly description: string;
	readonly category: "global" | "chairside" | "billing" | "imaging" | "records";
	readonly targetView?: string;
}
