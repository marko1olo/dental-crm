/**
 * localFallbackRouter.ts — Маршрутизатор локальных оффлайн-действий ассистента при отказе сети
 */

import { useAppStore } from "../../../store/appStore";
import type { AssistantEventCallbacks, AssistantMessage, AssistantPhase } from "./types";
import { handleProtocolAndToothFallback } from "./localFallbackProtocols";
import { handleAppointmentsFallback } from "./localFallbackAppointments";
import { handleIntelligenceFallback } from "./localFallbackIntelligence";

export async function executeLocalFallback(
	userText: string,
	msg: AssistantMessage,
	setPhase: (phase: AssistantPhase) => void,
	callbacks: AssistantEventCallbacks,
): Promise<void> {
	setPhase("working");

	if (await handleProtocolAndToothFallback(userText, msg, callbacks)) return;
	if (await handleAppointmentsFallback(userText, msg, callbacks)) return;
	if (handleIntelligenceFallback(userText, msg, callbacks)) return;

	const appState = useAppStore.getState();
	const currentTooth = appState.activeTooth ? Number(appState.activeTooth) : 36;
	msg.content = `Принято. Я готов помочь с пациентами на сегодня, расписанием смен, историей зуба #${currentTooth}, расчетом сметы или нарядом в зуботехническую лабораторию. Укажите команду или выберите действие.`;
	callbacks.onMessageUpdated?.({ ...msg });
}
