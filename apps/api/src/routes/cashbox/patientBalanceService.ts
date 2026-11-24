/**
 * patientBalanceService.ts — Facade preserving PatientBalanceService & registerPatientBalanceRoutes.
 * Delegates implementation to modular services inside ./balanceModules/.
 */

import type { FastifyInstance } from "fastify";
import type { TenantDb } from "../../db/rls.js";
import {
	creditPersonalAdvanceOp,
	type CreditAdvanceParams,
	debitAdvanceOp,
	type DebitAdvanceParams,
	getDetailedPatientBalance,
	type PatientDetailedBalance,
	refundPersonalAdvanceOp,
	type RefundAdvanceParams,
	registerBalanceModuleRoutes,
} from "./balanceModules/index.js";

export type {
	CreditAdvanceParams,
	DebitAdvanceParams,
	PatientDetailedBalance,
	RefundAdvanceParams,
} from "./balanceModules/index.js";

export class PatientBalanceService {
	public static async getDetailedBalance(
		tx: TenantDb,
		orgId: string,
		patientId: string,
	): Promise<PatientDetailedBalance | null> {
		return getDetailedPatientBalance(tx, orgId, patientId);
	}

	public static async creditPersonalAdvance(
		tx: TenantDb,
		params: CreditAdvanceParams,
	) {
		return creditPersonalAdvanceOp(tx, params);
	}

	public static async debitAdvance(
		tx: TenantDb,
		params: DebitAdvanceParams,
	) {
		return debitAdvanceOp(tx, params);
	}

	public static async refundPersonalAdvance(
		tx: TenantDb,
		params: RefundAdvanceParams,
	) {
		return refundPersonalAdvanceOp(tx, params);
	}
}

export async function registerPatientBalanceRoutes(app: FastifyInstance): Promise<void> {
	registerBalanceModuleRoutes(app);
}
