/**
 * marketingPresets.ts — Canonical Dental Practice Promotional Offers & Campaigns.
 * Grounded in real Russian dental CRM operations.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8ap, Mandate 8n (Solo Doctor Autonomy).
 */

import type { MarketingPromo } from "./marketingTypes";
import { DEFAULT_PATIENT_SEGMENTS } from "./marketingSegmentsPresets.js";
import { DEFAULT_ACTIVE_PROMOS } from "./marketingActivePromosPresets.js";
import { DEFAULT_ARCHIVED_PROMOS } from "./marketingArchivedPromosPresets.js";

export { DEFAULT_PATIENT_SEGMENTS };

export const DEFAULT_MARKETING_PROMOS: readonly MarketingPromo[] = [
	...DEFAULT_ACTIVE_PROMOS,
	...DEFAULT_ARCHIVED_PROMOS,
];
