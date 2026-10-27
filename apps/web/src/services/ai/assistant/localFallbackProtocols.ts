/**
 * localFallbackProtocols.ts — Локальный оффлайн-роутер клинических протоколов и одонтограммы
 */

import { useAppStore } from "../../../store/appStore";
import { extractFdiToothFromText } from "../../../components/visit/clinicalCatalog/clinicalProtocolsCatalog";
import { getActionTitleRu } from "../aiActionDispatcher";
import { copilotActionRunner } from "../copilotActionRunner";
import type { AssistantEventCallbacks, AssistantMessage, AssistantToolCall } from "./types";

export async function handleProtocolAndToothFallback(
	userText: string,
	msg: AssistantMessage,
	callbacks: AssistantEventCallbacks,
): Promise<boolean> {
	const lower = userText.toLowerCase();
	const appState = useAppStore.getState();
	const currentTooth = appState.activeTooth ? Number(appState.activeTooth) : 36;

	const isProtocolIntent =
		lower.includes("протокол") || lower.includes("шаблон") || lower.includes("дневник") ||
		lower.includes("043") || lower.includes("соап") || lower.includes("soap") ||
		lower.includes("заполни") || lower.includes("поставь") || lower.includes("кариес") ||
		lower.includes("пульпит") || lower.includes("периодонтит") || lower.includes("эндодонт") ||
		lower.includes("имплант") || lower.includes("удал") || lower.includes("экстракц") ||
		lower.includes("коронк") || lower.includes("винир") || lower.includes("синус") ||
		lower.includes("гигиен") || lower.includes("чистк") || lower.includes("скейлинг") ||
		lower.includes("отбеливан") || lower.includes("кюретаж") || lower.includes("герметизац") ||
		lower.includes("молочн") || lower.includes("детск") || lower.includes("осмотр") || lower.includes("норма");

	if (isProtocolIntent) {
		const detectedTooth = extractFdiToothFromText(userText) ?? currentTooth;
		const isPureExtraction = (lower.includes("удал") || lower.includes("экстракц")) && !lower.includes("протокол") && !lower.includes("заполни");
		const isPureImplant = lower.includes("имплант") && !lower.includes("протокол") && !lower.includes("заполни");
		const isDestructive = isPureExtraction || isPureImplant;

		const callId = `local_protocol_${Date.now()}`;
		const toolName = isPureImplant ? "update_tooth_status" : (isPureExtraction ? "update_tooth_status" : "apply_clinical_protocol");
		const args = isPureImplant
			? { tooth: detectedTooth, status: "имплант", diagnosis: "Дентальный имплантат" }
			: (isPureExtraction
				? { tooth: detectedTooth, status: "удален", diagnosis: "Отсутствует / удален" }
				: { query: userText, toothNumber: detectedTooth });

		const toolCallObj: AssistantToolCall = {
			callId,
			name: toolName,
			arguments: args,
			status: isDestructive ? "confirmation_required" : "done",
			destructive: isDestructive,
			titleRu: getActionTitleRu(toolName),
		};

		msg.toolCalls = [toolCallObj];

		if (isDestructive) {
			await copilotActionRunner.executeAction({ callId, name: toolName, arguments: args, confirmed: false });
			const actionDesc = isPureImplant ? `установка импланта на зуб ${detectedTooth}` : `удаление зуба ${detectedTooth}`;
			msg.content = `Клиническое действие требует подтверждения врача: ${actionDesc}. Нажмите «Подтвердить» в карточке действия.`;
			callbacks.onConfirmationRequired?.(toolCallObj);
		} else {
			const actionResult = await copilotActionRunner.executeAction({ callId, name: toolName, arguments: args, confirmed: true });
			const data = actionResult?.data as Record<string, unknown> | undefined;
			const procName = String(data?.procedureName || "Клинический протокол");
			const icd = data?.matchedIcd10 ? ` (МКБ: ${data.matchedIcd10})` : "";
			const toothSuffix = detectedTooth ? ` для зуба #${detectedTooth}` : "";

			msg.content = actionResult?.message ||
				`Найден и применён клинический протокол из каталога (1 142): «${procName}»${icd}${toothSuffix}. Дневник приёма и зубная формула синхронизированы.`;
		}

		callbacks.onMessageUpdated?.({ ...msg });
		return true;
	}

	const toothMatch = userText.match(/(?:зуб\s*#?\s*)?([1-48][1-8])\s*(?:-|—|:)?\s*(здоров|норм|idle)/i);
	if (toothMatch) {
		const toothNum = Number(toothMatch[1]);
		const rawStatus = (toothMatch[2] ?? "").toLowerCase();
		const callId = `local_tooth_${Date.now()}`;
		const toolName = "update_tooth_status";
		const args = { tooth: toothNum, status: rawStatus, diagnosis: "Здоров / норма" };

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
		msg.content = `В зубной формуле обновлен статус зуба ${toothNum}: Здоров (норма). Одонтограмма синхронизирована.`;
		callbacks.onMessageUpdated?.({ ...msg });
		return true;
	}

	return false;
}
