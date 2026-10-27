/**
 * localFallbackAppointments.ts — Локальная обработка смет 804н и записи/отмены приёмов
 */

import { useAppStore } from "../../../store/appStore";
import { getActionTitleRu } from "../aiActionDispatcher";
import { copilotActionRunner } from "../copilotActionRunner";
import type { AssistantEventCallbacks, AssistantMessage, AssistantToolCall } from "./types";

export async function handleAppointmentsFallback(
	userText: string,
	msg: AssistantMessage,
	callbacks: AssistantEventCallbacks,
): Promise<boolean> {
	const lower = userText.toLowerCase();
	const appState = useAppStore.getState();
	const currentTooth = appState.activeTooth ? Number(appState.activeTooth) : 36;

	if (lower.includes("смета") || lower.includes("план") || lower.includes("расчет") || lower.includes("цена")) {
		const callId = `local_plan_${Date.now()}`;
		const toolName = "calculate_804n_estimate";
		const args = { teeth: [String(currentTooth)] };
		const toolCallObj: AssistantToolCall = {
			callId,
			name: toolName,
			arguments: args,
			status: "done",
			destructive: false,
			titleRu: getActionTitleRu(toolName),
		};
		msg.toolCalls = [toolCallObj];
		await copilotActionRunner.executeAction({ callId, name: toolName, arguments: args, confirmed: true });
		msg.content = `Клиническая смета сформирована для зуба ${currentTooth}. Статус зуба переведён в статус «Запланировано к лечению».`;
		callbacks.onMessageUpdated?.({ ...msg });
		return true;
	}

	if (lower.includes("запиши") || lower.includes("прием") || lower.includes("приём")) {
		const callId = `local_book_${Date.now()}`;
		const toolName = "book_chairside_appointment";
		const startsAt = new Date(Date.now() + 86400000).toISOString();
		const args = { tooth: currentTooth, startsAt, reason: "Продолжение терапевтического лечения" };
		const toolCallObj: AssistantToolCall = {
			callId,
			name: toolName,
			arguments: args,
			status: "done",
			destructive: false,
			titleRu: getActionTitleRu(toolName),
		};
		msg.toolCalls = [toolCallObj];
		await copilotActionRunner.executeAction({ callId, name: toolName, arguments: args, confirmed: true });
		const formattedDate = new Date(startsAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
		msg.content = `Пациент предварительно записан на ${formattedDate}. Карточка записи добавлена в расписание клиники.`;
		callbacks.onMessageUpdated?.({ ...msg });
		return true;
	}

	if (lower.includes("отмени") && (lower.includes("запис") || lower.includes("прием") || lower.includes("приём"))) {
		const callId = `local_cancel_${Date.now()}`;
		const toolName = "cancel_appointment";
		const args = { appointmentId: "app_current", reason: "Отменено врачом через ассистента" };
		const toolCallObj: AssistantToolCall = {
			callId,
			name: toolName,
			arguments: args,
			status: "confirmation_required",
			destructive: true,
			titleRu: getActionTitleRu(toolName),
		};
		msg.toolCalls = [toolCallObj];
		await copilotActionRunner.executeAction({ callId, name: toolName, arguments: args, confirmed: false });
		msg.content = "Отмена приёма требует подтверждения врача (деструктивное действие). Подтвердите отмену в карточке действия.";
		callbacks.onConfirmationRequired?.(toolCallObj);
		callbacks.onMessageUpdated?.({ ...msg });
		return true;
	}

	return false;
}
