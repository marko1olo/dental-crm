import { useState } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { useAppStore } from "../../../store/appStore";
import { useTelephonyStore } from "../../../store/telephonyStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { useIncomingCallData } from "../useIncomingCallData";
import { isCallAnsweredStatus, isCallEndedStatus } from "./incomingCallUtils";
import type { IncomingCallPopupController } from "./types";
import { useIncomingCallQuickActions } from "./useIncomingCallQuickActions";
import { usePopupKeyboardAndClickOutside } from "./usePopupKeyboardAndClickOutside";

export function useIncomingCallPopupController(
	initialExpanded = false,
	suppressCallModal = false,
): IncomingCallPopupController {
	const activeCall = useTelephonyStore((s) => s.activeCall);
	const dismissCall = useTelephonyStore((s) => s.dismissCall);
	const isMuted = useTelephonyStore((s) => s.isMuted);
	const toggleMute = useTelephonyStore((s) => s.toggleMute);
	const agentState = useTelephonyStore((s) => s.agentState);
	const isCallDrawerOpen = useTelephonyStore((s) => s.isCallDrawerOpen);
	const closeCallDrawer = useTelephonyStore((s) => s.closeCallDrawer);
	const activeLineId = useTelephonyStore((s) => s.activeLineId);
	const line1 = useTelephonyStore((s) => s.line1);
	const line2 = useTelephonyStore((s) => s.line2);
	const secondaryLine = activeLineId === 1 ? line2 : line1;

	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;
	const currentView = useAppStore((s) => s.currentView);
	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
	const hash = typeof window !== "undefined" ? window.location.hash : "";
	const isSterileClinicalScreen =
		["visit", "odontogram", "periodontics", "xray", "radiology", "cbct"].includes(currentView as string) ||
		/#(visit|odontogram|periodontics|xray|radiology|cbct)/.test(hash);
	const isDoctorMode = selectedWorkspaceRole === "doctor" || currentView === "visit" || isSterileClinicalScreen || Boolean(suppressCallModal);
	const isFullScreenStudioActive = useUiSurfaceStore((s) => s.isFullScreenStudioActive);
	const isDndActive = agentState === "dnd";
	const isConnected = useTelephonyStore((s) => s.isWsConnected);

	const [isExpanded, setIsExpanded] = useState(() => {
		if (initialExpanded) return true;
		if (typeof window !== "undefined") {
			return (window.location.search || "").includes("callExpanded=true");
		}
		return false;
	});
	const isPopupExpanded = isExpanded && !isCallDrawerOpen;
	const [newPatientNameInput, setNewPatientNameInput] = useState("");
	const [showTransferPanel, setShowTransferPanel] = useState(false);
	const [transferType, setTransferType] = useState<"blind" | "attended">("blind");
	const [showBadgeMoreMenu, setShowBadgeMoreMenu] = useState(false);
	const [showQuickBooking, setShowQuickBooking] = useState(false);
	const [showOutcomePanel, setShowOutcomePanel] = useState(false);

	const incomingData = useIncomingCallData(activeCall, dashboard, dismissCall);
	const { currentCall, resolvedPatient, upcomingAppointment, callerName, formattedPhone } = incomingData;

	usePopupKeyboardAndClickOutside(isCallDrawerOpen, closeCallDrawer, showBadgeMoreMenu, setShowBadgeMoreMenu);

	const quickActions = useIncomingCallQuickActions({
		activeCall, currentCall, resolvedPatient, upcomingAppointment,
		callerName, formattedPhone, dashboard, setDashboard: ctx?.setDashboard,
		isCallDrawerOpen, isDndActive, activeLineId, secondaryLine,
		newPatientNameInput, setNewPatientNameInput, setIsExpanded, setShowOutcomePanel,
	});

	const isCallAnswered = isCallAnsweredStatus(activeCall);
	const isCallEnded = isCallEndedStatus(activeCall);

	return {
		...incomingData, ...quickActions,
		activeCall, activeLineId, secondaryLine, isMuted, isDndActive,
		isConnected, isDoctorMode, suppressCallModal: Boolean(suppressCallModal),
		isFullScreenStudioActive, isCallDrawerOpen,
		isPopupExpanded, isCallAnswered, isCallEnded, newPatientNameInput,
		showTransferPanel, transferType, showBadgeMoreMenu, showQuickBooking,
		showOutcomePanel, currentView, selectedWorkspaceRole, setIsExpanded,
		setNewPatientNameInput, setShowTransferPanel, setTransferType,
		setShowBadgeMoreMenu, setShowQuickBooking, setShowOutcomePanel,
		closeCallDrawer, dismissCall, toggleMute,
	};
}
