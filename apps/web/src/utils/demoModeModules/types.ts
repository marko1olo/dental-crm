/**
 * types.ts
 *
 * Layer 0: Demo Mode Types, Contracts and Clinical Scenarios
 */

import type { StaffRole } from "@dental/shared";

export interface DemoStaffMember {
	id: string;
	organizationId: string;
	fullName: string;
	role: StaffRole;
	specialization: string;
	email: string;
	phone: string;
	active: boolean;
	color: string;
}

export type {
	DemoOdontogramToothState,
	DemoEstimateItem,
	DemoEstimate,
	DemoSoapDiary,
	DemoLabOrderCase,
} from "../demo/demoClinicalCases.js";

export type {
	DemoRoleProfile,
} from "../demo/demoInteractiveSimulation.js";
