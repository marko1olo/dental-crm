/**
 * DENTE CRM — React Hook for Clinic LAN P2P Dispatcher & Emergency Mesh Events
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8e: Doctor Autonomy — instant emergency summoning (<50ms), zero-blocking dialogs.
 * - Mandate 8n: Solo Doctor & Small Clinic Resilience — operates entirely over local LAN/Wi-Fi without WAN.
 */

import { useCallback, useEffect, useState } from "react";
import type {
	LanAssistantCitoEvent,
	LanChairStatus,
	LanChairStatusEvent,
	LanCitoCallReason,
	LanCitoUrgency,
	LanInvoiceTransferEvent,
	LanInvoiceTransferItem,
	VectorClock,
} from "@dental/shared";
import {
	lanP2PDispatcher,
	type LanP2PDispatcherStatus,
} from "../services/offline/lanP2PDispatcher";
import { SoundFeedbackService } from "../services/audio/SoundFeedbackService";
import { showToast } from "../components/GlobalToast";

export interface ActiveCitoAlert extends LanAssistantCitoEvent {
	alertId: string;
	receivedAt: string;
}

export function useLanP2P() {
	const [activeCitoAlerts, setActiveCitoAlerts] = useState<ActiveCitoAlert[]>([]);
	const [latestChairEvent, setLatestChairEvent] = useState<LanChairStatusEvent | null>(null);
	const [latestInvoiceEvent, setLatestInvoiceEvent] = useState<LanInvoiceTransferEvent | null>(null);
	const [dispatcherStatus, setDispatcherStatus] = useState<LanP2PDispatcherStatus>(() =>
		lanP2PDispatcher.getStatus(),
	);

	const refreshStatus = useCallback(() => {
		setDispatcherStatus(lanP2PDispatcher.getStatus());
	}, []);

	const dismissCitoAlert = useCallback((alertId: string) => {
		setActiveCitoAlerts((prev) => prev.filter((a) => a.alertId !== alertId));
	}, []);

	const clearAllCitoAlerts = useCallback(() => {
		setActiveCitoAlerts([]);
	}, []);

	const broadcastAssistantCitoCall = useCallback(
		async (params: {
			cabinetNumber: string | number;
			doctorId: string;
			doctorName: string;
			urgency?: LanCitoUrgency;
			reason?: LanCitoCallReason;
			customMessage?: string;
			branchId?: string;
			vectorClock?: VectorClock;
		}) => {
			const res = await lanP2PDispatcher.broadcastAssistantCitoCall(params);
			refreshStatus();
			return res;
		},
		[refreshStatus],
	);

	const broadcastChairStatus = useCallback(
		async (params: {
			cabinetNumber: string | number;
			chairId: string;
			status: LanChairStatus;
			patientId?: string;
			patientName?: string;
			doctorId?: string;
			doctorName?: string;
			note?: string;
			branchId?: string;
			vectorClock?: VectorClock;
		}) => {
			const res = await lanP2PDispatcher.broadcastChairStatus(params);
			refreshStatus();
			return res;
		},
		[refreshStatus],
	);

	const broadcastInvoiceToCashier = useCallback(
		async (params: {
			cabinetNumber: string | number;
			doctorId: string;
			doctorName: string;
			patientId: string;
			patientName: string;
			items: LanInvoiceTransferItem[];
			totalAmountRub?: number;
			totalAmountKopecks?: number;
			comments?: string;
			branchId?: string;
			vectorClock?: VectorClock;
		}) => {
			const res = await lanP2PDispatcher.broadcastInvoiceToCashier(params);
			refreshStatus();
			return res;
		},
		[refreshStatus],
	);

	useEffect(() => {
		const unsubCito = lanP2PDispatcher.onAssistantCitoCall((event) => {
			const alertId = `${event.doctorId}_${event.cabinetNumber}_${event.timestamp || Date.now()}`;
			setActiveCitoAlerts((prev) => {
				if (prev.some((a) => a.alertId === alertId)) return prev;
				return [
					...prev,
					{
						...event,
						alertId,
						receivedAt: new Date().toISOString(),
					},
				];
			});

			// Audio warning alert
			void SoundFeedbackService.getInstance().playWarningAlert();

			// Visual toast
			const reasonText = event.customMessage || event.reason || "Экстренный вызов в кабинет";
			showToast(
				`🚨 CITO ВЫЗОВ: Каб. ${event.cabinetNumber} — ${event.doctorName}: ${reasonText}`,
				"error",
				8000,
			);
		});

		const unsubChair = lanP2PDispatcher.onChairStatusChange((event) => {
			setLatestChairEvent(event);
		});

		const unsubInvoice = lanP2PDispatcher.onInvoiceTransferredToCashier((event) => {
			setLatestInvoiceEvent(event);
			showToast(
				`Счёт из каб. ${event.cabinetNumber} (${event.doctorName}): Пациент ${event.patientName} (${event.totalAmountRub} ₽)`,
				"info",
				5000,
			);
		});

		return () => {
			unsubCito();
			unsubChair();
			unsubInvoice();
		};
	}, []);

	return {
		activeCitoAlerts,
		latestChairEvent,
		latestInvoiceEvent,
		dispatcherStatus,
		dismissCitoAlert,
		clearAllCitoAlerts,
		broadcastAssistantCitoCall,
		broadcastChairStatus,
		broadcastInvoiceToCashier,
		refreshStatus,
	};
}
