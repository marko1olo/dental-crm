import { useEffect } from "react";
import { useWebsocket } from "./useWebsocket";
import { useAppStore } from "../store/appStore";
import {
	resolveTelephonyWsUrl,
	useTelephonyStore,
} from "../store/telephonyStore";

/**
 * useTelephonyRealtime: Connects the application to `/api/ws/telephony`
 * and hydrates call history from PostgreSQL 18 (`/api/communications/telephony/calls`).
 * Respects Mandate 8e (Doctor Autonomy): stays silent during clinical visits.
 */
export function useTelephonyRealtime() {
	const currentView = useAppStore((s) => s.currentView);
	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
	const isDoctorMode =
		selectedWorkspaceRole === "doctor" || currentView === "visit";

	const triggerIncomingCall = useTelephonyStore((s) => s.triggerIncomingCall);
	const setWsConnected = useTelephonyStore((s) => s.setWsConnected);
	const fetchCallHistory = useTelephonyStore((s) => s.fetchCallHistory);

	// Hydrate call history from PostgreSQL on initial mount / F5 reload
	useEffect(() => {
		void fetchCallHistory();
	}, [fetchCallHistory]);

	const wsUrl = !isDoctorMode ? resolveTelephonyWsUrl() : "";
	const { lastMessage, isConnected } = useWebsocket(wsUrl);

	useEffect(() => {
		setWsConnected(isConnected);
	}, [isConnected, setWsConnected]);

	useEffect(() => {
		if (!lastMessage || isDoctorMode) return;

		if (
			lastMessage.type === "TELEPHONY_INCOMING_CALL" &&
			lastMessage.payload
		) {
			const p = lastMessage.payload;
			triggerIncomingCall({
				phone: p.phone || "",
				patientId: p.patientId || null,
				patientName: p.patientName || "Неизвестный номер",
				callId: p.callId,
				provider: p.provider || "mango",
				timestamp: p.timestamp || new Date().toISOString(),
				status: "ringing",
				recordingUrl: p.recordingUrl,
				callStartedAt: Date.now(),
				virtualNumber: p.virtualNumber,
				calledDid: p.calledDid,
				utmSource: p.utmSource,
				utmCampaign: p.utmCampaign,
				utmMedium: p.utmMedium,
				advertisingChannel: p.advertisingChannel,
				leadId: p.leadId,
			});
		} else if (
			lastMessage.type === "TELEPHONY_MISSED_CALL" ||
			lastMessage.type === "TELEPHONY_CALL_STATUS" ||
			lastMessage.type === "TELEPHONY_CALL_TRANSFERRED"
		) {
			void fetchCallHistory();
		}
	}, [lastMessage, triggerIncomingCall, isDoctorMode, fetchCallHistory]);

	return { isConnected };
}
