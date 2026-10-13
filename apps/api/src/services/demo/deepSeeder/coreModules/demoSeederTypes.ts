/**
 * demoSeederTypes.ts — Domain Contracts & Types for Core Demo Seeder (Layer 0).
 */

import type { DbTx } from "../types.js";

export type DatabaseTransaction = DbTx;

export interface DemoShowcaseStatusSummary {
	alreadyExisted: boolean;
	organizationId: string;
	clinicId: string;
	chairsCount: number;
	staffCount: number;
	patientsCount: number;
	appointmentsCount: number;
	labOrderId?: string | undefined;
	warehouseId?: string | undefined;
	leadsCount: number;
}
