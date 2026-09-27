/**
 * usePatientInstallmentsApi.ts — Real Backend Integration Hook for Clinic 0% Installments.
 *
 * Connects frontend installment workspace to live Fastify routes:
 * - GET /api/installments?patientId=...
 * - GET /api/installments/:id
 * - POST /api/installments
 * - POST /api/installments/tranches/:id/pay
 *
 * Governed by Mandate 8d, 8e, 8n (Zero-Mockup, SSOT Backend Integration).
 */

import { useCallback, useState } from "react";
import {
	type InstallmentPlan,
	type InternalInstallmentScheduleItem,
	evaluateInstallmentStatus,
} from "./installmentsEngine.js";
import { rublesToKopecks } from "@dental/shared";

export function isUuid(val?: string | null): boolean {
	return Boolean(
		val &&
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
				val,
			),
	);
}

export interface ServerTrancheRecord {
	readonly id: string;
	readonly contractId: string;
	readonly trancheNumber: number;
	readonly amountRub: number;
	readonly dueDate: string | Date;
	readonly isPaid: boolean;
	readonly status: string;
	readonly paidAt?: string | Date | null;
	readonly cashOperationId?: string | null;
}

export interface ServerContractRecord {
	readonly id: string;
	readonly contractNumber: string;
	readonly patientId: string;
	readonly treatmentPlanId?: string | null;
	readonly totalAmountRub: number;
	readonly downPaymentRub: number;
	readonly monthsCount: number;
	readonly paidAmountRub: number;
	readonly remainingAmountRub: number;
	readonly status: string;
	readonly signedAt: string | Date;
	readonly notes?: string | null;
	readonly createdAt: string | Date;
}

export function mapServerContractToInstallmentPlan(serverData: {
	readonly contract: ServerContractRecord;
	readonly patientName?: string;
	readonly patientPhone?: string;
	readonly tranches: readonly ServerTrancheRecord[];
}): InstallmentPlan {
	const c = serverData.contract;
	const tranches = serverData.tranches || [];
	const schedule: InternalInstallmentScheduleItem[] = tranches.map((t) => {
		const amountKop = rublesToKopecks(Number(t.amountRub));
		const isPaid = Boolean(t.isPaid);
		const dueTime = new Date(t.dueDate).getTime();
		const isOverdue = !isPaid && dueTime < Date.now();
		return {
			id: t.id,
			monthIndex: t.trancheNumber,
			dueDateIso: new Date(t.dueDate).toISOString(),
			amountKopecks: amountKop,
			paidKopecks: isPaid ? amountKop : 0,
			isPaid,
			isOverdue,
			paidAtIso: t.paidAt ? new Date(t.paidAt).toISOString() : undefined,
		};
	});

	const evalResult = evaluateInstallmentStatus(
		schedule,
		new Date().toISOString(),
	);

	return {
		id: c.id,
		contractNumber: c.contractNumber,
		patientId: c.patientId,
		patientName: serverData.patientName || "Пациент",
		patientPhone: serverData.patientPhone || "",
		doctorName: "Лечащий врач",
		treatmentTitle: "Лечение по рассрочке клиники (0%)",
		totalAmountKopecks: rublesToKopecks(Number(c.totalAmountRub)),
		downPaymentKopecks: rublesToKopecks(Number(c.downPaymentRub)),
		monthsCount: c.monthsCount,
		monthlyPaymentKopecks:
			schedule.length > 0 ? schedule[0]!.amountKopecks : 0,
		startDateIso: new Date(c.signedAt).toISOString(),
		schedule: evalResult.updatedSchedule,
		paidAmountKopecks: rublesToKopecks(Number(c.paidAmountRub)),
		remainingDebtKopecks: rublesToKopecks(Number(c.remainingAmountRub)),
		overdueDebtKopecks: evalResult.overdueDebtKopecks,
		status: evalResult.status,
		nextPaymentDueItem: evalResult.nextPaymentDueItem,
		daysUntilNextPayment: evalResult.daysUntilNextPayment,
		createdAtIso: new Date(c.createdAt).toISOString(),
		notes: c.notes || undefined,
	};
}

export function usePatientInstallmentsApi(options: {
	readonly patientId?: string | undefined;
	readonly getMutationHeaders?: () => Record<string, string>;
	readonly getReadHeaders?: () => Record<string, string>;
}) {
	const { patientId, getMutationHeaders, getReadHeaders } = options;
	const [isLoading, setIsLoading] = useState(false);

	const fetchActiveContract = useCallback(async (): Promise<InstallmentPlan | null> => {
		if (!patientId || !isUuid(patientId)) return null;
		setIsLoading(true);
		try {
			const headers = getReadHeaders ? getReadHeaders() : {};
			const res = await fetch(`/api/installments?patientId=${patientId}`, {
				headers,
			});
			if (!res.ok) return null;
			const json = (await res.json()) as {
				data: Array<{ contract: ServerContractRecord; patientName?: string; patientPhone?: string }>;
			};
			if (!json.data || json.data.length === 0) return null;

			// Grab the latest contract and fetch detailed tranches
			const latest = json.data[0]!;
			const detailRes = await fetch(`/api/installments/${latest.contract.id}`, {
				headers,
			});
			if (!detailRes.ok) return null;
			const detailJson = (await detailRes.json()) as {
				data: {
					contract: ServerContractRecord;
					patientName?: string;
					patientPhone?: string;
					tranches: ServerTrancheRecord[];
				};
			};

			return mapServerContractToInstallmentPlan(detailJson.data);
		} catch {
			return null;
		} finally {
			setIsLoading(false);
		}
	}, [patientId, getReadHeaders]);

	const createContract = useCallback(
		async (params: {
			patientId: string;
			totalAmountRub: number;
			downPaymentRub: number;
			monthsCount: 3 | 6 | 12 | 24;
			notes?: string;
		}): Promise<InstallmentPlan | null> => {
			if (!isUuid(params.patientId)) return null;
			setIsLoading(true);
			try {
				const headers: Record<string, string> = {
					"Content-Type": "application/json",
					...(getMutationHeaders ? getMutationHeaders() : {}),
				};
				const res = await fetch("/api/installments", {
					method: "POST",
					headers,
					body: JSON.stringify({
						patientId: params.patientId,
						totalAmountRub: params.totalAmountRub,
						downPaymentRub: params.downPaymentRub,
						monthsCount: params.monthsCount,
						notes: params.notes,
					}),
				});
				if (!res.ok) return null;
				const json = (await res.json()) as {
					contract: ServerContractRecord;
					tranches: ServerTrancheRecord[];
				};
				return mapServerContractToInstallmentPlan({
					contract: json.contract,
					tranches: json.tranches,
				});
			} catch {
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[getMutationHeaders],
	);

	const payTranche = useCallback(
		async (trancheId: string, cashBoxId?: string): Promise<boolean> => {
			if (!isUuid(trancheId)) return false;
			setIsLoading(true);
			try {
				const headers: Record<string, string> = {
					"Content-Type": "application/json",
					...(getMutationHeaders ? getMutationHeaders() : {}),
				};
				const res = await fetch(`/api/installments/tranches/${trancheId}/pay`, {
					method: "POST",
					headers,
					body: JSON.stringify({ cashBoxId }),
				});
				return res.ok;
			} catch {
				return false;
			} finally {
				setIsLoading(false);
			}
		},
		[getMutationHeaders],
	);

	return {
		isLoading,
		fetchActiveContract,
		createContract,
		payTranche,
	};
}
