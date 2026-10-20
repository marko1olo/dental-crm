/**
 * crmLeakDetectorApi.ts — API Client for 210-Day CRM Patient Reactivation Pipeline.
 */

import type {
	CrmDeclineReason,
	CrmLeadStatus,
	CrmLeakFunnelMetrics,
	CrmLeakLeadItem,
} from "@dental/shared";
import { handleApiResponse } from "./apiResponseHandler.js";

export interface FetchLeadsParams {
	minDays?: number | undefined;
	status?: string | undefined;
	doctorId?: string | undefined;
	hasUncompletedPlan?: boolean | undefined;
	limit?: number | undefined;
	offset?: number | undefined;
}

export async function fetchLeakDetectorLeads(
	headers: Record<string, string>,
	params: FetchLeadsParams = {},
): Promise<{ data: CrmLeakLeadItem[]; total: number }> {
	const query = new URLSearchParams();
	if (params.minDays) query.set("minDays", String(params.minDays));
	if (params.status && params.status !== "all") query.set("status", params.status);
	if (params.doctorId) query.set("doctorId", params.doctorId);
	if (params.hasUncompletedPlan !== undefined) query.set("hasUncompletedPlan", String(params.hasUncompletedPlan));
	if (params.limit) query.set("limit", String(params.limit));
	if (params.offset) query.set("offset", String(params.offset));

	const url = `/api/crm/leak-detector${query.toString() ? `?${query.toString()}` : ""}`;
	const res = await fetch(url, { method: "GET", headers });
	return handleApiResponse<{ data: CrmLeakLeadItem[]; total: number }>(res, "Ошибка загрузки списка утечки");
}

export async function syncLeakDetector(
	headers: Record<string, string>,
): Promise<{ success: boolean; message: string; createdCount: number; updatedCount: number }> {
	const res = await fetch("/api/crm/leak-detector/sync", {
		method: "POST",
		headers: { ...headers, "Content-Type": "application/json" },
	});
	return handleApiResponse<{ success: boolean; message: string; createdCount: number; updatedCount: number }>(res, "Ошибка синхронизации");
}

export async function startLeakLead(
	leadId: string,
	headers: Record<string, string>,
): Promise<{ success: boolean; lead: CrmLeakLeadItem }> {
	const res = await fetch(`/api/crm/leak-detector/${leadId}/start-lead`, {
		method: "POST",
		headers: { ...headers, "Content-Type": "application/json" },
	});
	return handleApiResponse<{ success: boolean; lead: CrmLeakLeadItem }>(res, "Ошибка взятия лида в работу");
}

export async function processLeakLead(
	leadId: string,
	payload: {
		channel: "call" | "whatsapp" | "telegram" | "sms";
		notes: string;
		targetStatus?: "contacted" | "in_progress";
	},
	headers: Record<string, string>,
): Promise<{ success: boolean; lead: CrmLeakLeadItem }> {
	const res = await fetch(`/api/crm/leak-detector/${leadId}/process-lead`, {
		method: "POST",
		headers: { ...headers, "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	return handleApiResponse<{ success: boolean; lead: CrmLeakLeadItem }>(res, "Ошибка фиксации контакта");
}

export async function cancelLeakLead(
	leadId: string,
	payload: {
		declineReason: CrmDeclineReason;
		declineComment?: string | undefined;
	},
	headers: Record<string, string>,
): Promise<{ success: boolean; lead: CrmLeakLeadItem }> {
	const res = await fetch(`/api/crm/leak-detector/${leadId}/cancel-lead`, {
		method: "POST",
		headers: { ...headers, "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	return handleApiResponse<{ success: boolean; lead: CrmLeakLeadItem }>(res, "Ошибка отмены лида");
}

export async function fetchLeakFunnelMetrics(
	headers: Record<string, string>,
): Promise<{ data: CrmLeakFunnelMetrics }> {
	const res = await fetch("/api/funnels/leak-detector", { method: "GET", headers });
	return handleApiResponse<{ data: CrmLeakFunnelMetrics }>(res, "Ошибка загрузки воронки утечек");
}

export async function createLeakTask(
	leadId: string,
	headers: Record<string, string>,
): Promise<{ success: boolean; message: string; lead: CrmLeakLeadItem }> {
	const res = await fetch(`/api/crm/leak-detector/${leadId}/create-task`, {
		method: "POST",
		headers: { ...headers, "Content-Type": "application/json" },
	});
	return handleApiResponse<{ success: boolean; message: string; lead: CrmLeakLeadItem }>(res, "Ошибка создания задачи");
}

