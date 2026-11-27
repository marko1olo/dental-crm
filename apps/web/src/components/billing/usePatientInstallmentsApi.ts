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

import { useCallback, useMemo, useRef, useState } from "react";
import {
	type InstallmentItemStatus,
	type InstallmentPlan,
	type InternalInstallmentScheduleItem,
	evaluateInstallmentStatus,
} from "./installmentsEngine.js";
import { generateUuidV7, rublesToKopecks } from "@dental/shared";
import { clientLogger } from "../../services/logging/clientLogger.js";
import { showToast } from "../GlobalToast.js";

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
	readonly paidAt?: string | Date | null | undefined;
	readonly cashOperationId?: string | null | undefined;
}

export interface ServerContractRecord {
	readonly id: string;
	readonly contractNumber: string;
	readonly patientId: string;
	readonly treatmentPlanId?: string | null | undefined;
	readonly totalAmountRub: number;
	readonly downPaymentRub: number;
	readonly monthsCount: number;
	readonly paidAmountRub: number;
	readonly remainingAmountRub: number;
	readonly status: string;
	readonly signedAt: string | Date;
	readonly notes?: string | null | undefined;
	readonly createdAt: string | Date;
}

export function mapServerContractToInstallmentPlan(serverData: {
	readonly contract: ServerContractRecord;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly tranches: readonly ServerTrancheRecord[];
}): InstallmentPlan {
	const c = serverData.contract;
	const tranches = serverData.tranches || [];
	const schedule: InternalInstallmentScheduleItem[] = tranches.map((t) => {
		const amountKop = rublesToKopecks(Number(t.amountRub));
		const isPaid = Boolean(t.isPaid);
		const dueTime = new Date(t.dueDate).getTime();
		const isOverdue = !isPaid && dueTime < Date.now();
		const status: InstallmentItemStatus = isPaid
			? "paid"
			: isOverdue
				? "overdue"
				: "on_schedule";
		return {
			id: t.id,
			paymentNumber: t.trancheNumber,
			title:
				t.trancheNumber === 0
					? "Первоначальный взнос"
					: `Платёж №${t.trancheNumber}`,
			dueDateIso: new Date(t.dueDate).toISOString(),
			amountKopecks: amountKop,
			paidKopecks: isPaid ? amountKop : rublesToKopecks(0),
			status,
			...(t.paidAt ? { paidAtIso: new Date(t.paidAt).toISOString() } : {}),
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
		monthlyPaymentKopecks: schedule[0]?.amountKopecks ?? 0,
		startDateIso: new Date(c.signedAt).toISOString(),
		schedule: evalResult.updatedSchedule,
		paidAmountKopecks: rublesToKopecks(Number(c.paidAmountRub)),
		remainingDebtKopecks: rublesToKopecks(Number(c.remainingAmountRub)),
		overdueDebtKopecks: evalResult.overdueDebtKopecks,
		status: evalResult.status,
		nextPaymentDueItem: evalResult.nextPaymentDueItem,
		daysUntilNextPayment: evalResult.daysUntilNextPayment,
		createdAtIso: new Date(c.createdAt).toISOString(),
		...(c.notes ? { notes: c.notes } : {}),
	};
}

export function usePatientInstallmentsApi(options: {
	readonly patientId?: string | undefined;
	readonly getMutationHeaders?: () => Record<string, string>;
	readonly getReadHeaders?: () => Record<string, string>;
}) {
	const { patientId, getMutationHeaders, getReadHeaders } = options;
	const [isLoading, setIsLoading] = useState(false);
	const getReadHeadersRef = useRef(getReadHeaders);
	const getMutationHeadersRef = useRef(getMutationHeaders);
	getReadHeadersRef.current = getReadHeaders;
	getMutationHeadersRef.current = getMutationHeaders;

	const fetchActiveContract = useCallback(async (): Promise<InstallmentPlan | null> => {
		if (!patientId || !isUuid(patientId)) return null;
		setIsLoading(true);
		try {
			const headers = getReadHeadersRef.current ? getReadHeadersRef.current() : {};
			const res = await fetch(`/api/installments?patientId=${patientId}`, {
				headers,
			});
			if (!res.ok) {
				clientLogger.warn("[usePatientInstallmentsApi] Ошибка загрузки договоров рассрочки", { status: res.status }, { module: "Billing" });
				return null;
			}
			const json = (await res.json()) as
				| Array<{ contract: ServerContractRecord; patientName?: string | undefined; patientPhone?: string | undefined }>
				| {
						data?: Array<{ contract: ServerContractRecord; patientName?: string | undefined; patientPhone?: string | undefined }> | undefined;
				  };
			const contractList = Array.isArray(json) ? json : json.data;
			if (!contractList || contractList.length === 0) return null;

			// Grab the latest contract and fetch detailed tranches
			const latest = contractList[0];
			if (!latest?.contract?.id) return null;
			const detailRes = await fetch(`/api/installments/${latest.contract.id}`, {
				headers,
			});
			if (!detailRes.ok) {
				clientLogger.warn("[usePatientInstallmentsApi] Ошибка загрузки деталей договора рассрочки", { status: detailRes.status }, { module: "Billing" });
				return null;
			}
			const detailJson = (await detailRes.json()) as {
				data?: {
					contract: ServerContractRecord;
					patientName?: string;
					patientPhone?: string;
					tranches: ServerTrancheRecord[];
				};
				contract?: ServerContractRecord;
				patientName?: string;
				patientPhone?: string;
				tranches?: ServerTrancheRecord[];
			};
			const detailPayload = detailJson.data ?? (detailJson.contract ? {
				contract: detailJson.contract,
				...(detailJson.patientName !== undefined ? { patientName: detailJson.patientName } : {}),
				...(detailJson.patientPhone !== undefined ? { patientPhone: detailJson.patientPhone } : {}),
				tranches: detailJson.tranches ?? [],
			} : null);
			if (!detailPayload) return null;

			return mapServerContractToInstallmentPlan(detailPayload);
		} catch (err: unknown) {
			clientLogger.warn("[usePatientInstallmentsApi] Не удалось загрузить активный договор рассрочки", err, {
				module: "Billing",
			});
			return null;
		} finally {
			setIsLoading(false);
		}
	}, [patientId]);

	const createContract = useCallback(
		async (params: {
			patientId: string;
			totalAmountRub: number;
			downPaymentRub: number;
			monthsCount: 3 | 6 | 10 | 12 | 18 | 24;
			cashBoxId?: string | undefined;
			notes?: string;
		}): Promise<InstallmentPlan | null> => {
			if (!isUuid(params.patientId)) return null;
			setIsLoading(true);
			try {
				const existingMutationHeaders = getMutationHeadersRef.current ? getMutationHeadersRef.current() : {};
				const headers: Record<string, string> = {
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
					...existingMutationHeaders,
				};
				if (!headers["Idempotency-Key"] && !headers["idempotency-key"]) {
					headers["Idempotency-Key"] = generateUuidV7();
				}
				const res = await fetch("/api/installments", {
					method: "POST",
					headers,
					body: JSON.stringify({
						patientId: params.patientId,
						totalAmountRub: params.totalAmountRub,
						downPaymentRub: params.downPaymentRub,
						monthsCount: params.monthsCount,
						...(params.cashBoxId ? { cashBoxId: params.cashBoxId } : {}),
						notes: params.notes,
					}),
				});
				if (!res.ok) {
					const errJson = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
					const errMsg = errJson?.message || errJson?.error || `Ошибка оформления рассрочки (HTTP ${res.status})`;
					clientLogger.warn("[usePatientInstallmentsApi] Ошибка создания договора рассрочки", { status: res.status, errMsg }, { module: "Billing" });
					showToast(errMsg, "error");
					return null;
				}
				const rawJson = (await res.json()) as {
					data?: { contract?: ServerContractRecord; tranches?: ServerTrancheRecord[] };
					contract?: ServerContractRecord;
					tranches?: ServerTrancheRecord[];
				};
				const payload = rawJson.data ?? rawJson;
				const contract = payload.contract ?? rawJson.contract;
				const tranches = payload.tranches ?? rawJson.tranches ?? [];
				if (!contract) {
					clientLogger.warn("[usePatientInstallmentsApi] Пустой ответ при создании договора рассрочки", rawJson, { module: "Billing" });
					showToast("Сервер вернул некорректный ответ при оформлении рассрочки", "error");
					return null;
				}
				return mapServerContractToInstallmentPlan({
					contract,
					tranches,
				});
			} catch (err: unknown) {
				clientLogger.warn("[usePatientInstallmentsApi] Не удалось создать договор рассрочки", err, {
					module: "Billing",
				});
				showToast("Сетевой сбой при оформлении рассрочки. Повторите попытку.", "error");
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	const payTranche = useCallback(
		async (
			trancheId: string,
			options?: { cashBoxId?: string; amountPaidKopecks?: number } | string,
		): Promise<boolean> => {
			if (!isUuid(trancheId)) return false;
			const cashBoxId = typeof options === "string" ? options : options?.cashBoxId;
			const amountPaidKopecks = typeof options === "object" ? options?.amountPaidKopecks : undefined;
			setIsLoading(true);
			try {
				const existingMutationHeaders = getMutationHeadersRef.current ? getMutationHeadersRef.current() : {};
				const headers: Record<string, string> = {
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
					...existingMutationHeaders,
				};
				if (!headers["Idempotency-Key"] && !headers["idempotency-key"]) {
					headers["Idempotency-Key"] = generateUuidV7();
				}
				const res = await fetch(`/api/installments/tranches/${trancheId}/pay`, {
					method: "POST",
					headers,
					body: JSON.stringify({ cashBoxId, amountPaidKopecks }),
				});
				if (!res.ok) {
					const errorJson = (await res.json().catch(() => null)) as { message?: string } | null;
					throw new Error(errorJson?.message || `Ошибка оплаты транша рассрочки (HTTP ${res.status})`);
				}
				return true;
			} catch (err: unknown) {
				clientLogger.warn("[usePatientInstallmentsApi] Не удалось оплатить транш рассрочки", err, {
					module: "Billing",
				});
				throw err;
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	return useMemo(
		() => ({
			isLoading,
			fetchActiveContract,
			createContract,
			payTranche,
		}),
		[isLoading, fetchActiveContract, createContract, payTranche],
	);
}
