/**
 * @file useTelephonyFloatingState.ts
 * @description Layer 3: Compact state & orchestrator facade hook for Telephony Floating Widget.
 */

import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useTelephonyStore } from "../../../store/telephonyStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import type { TelephonyFloatingWidgetProps } from "./types";
import { useFloatingCallQuickActions } from "./useFloatingCallQuickActions";
import { useFloatingCallTimerAndAudio } from "./useFloatingCallTimerAndAudio";
import { useFloatingPatientMatch } from "./useFloatingPatientMatch";
import { useFloatingWidgetVisibility } from "./useFloatingWidgetVisibility";

export function useTelephonyFloatingState({
	defaultExpanded = false,
	showDialerDefault = false,
}: TelephonyFloatingWidgetProps) {
	const tel = useTelephonyStore();
	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const crmCurrentView = useAppStore((s) => s.currentView);
	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
	const currentHash = typeof window !== "undefined" ? window.location.hash : "";
	const isSterileClinicalScreen =
		["visit", "odontogram", "periodontics", "xray", "radiology", "cbct"].includes(crmCurrentView as string) ||
		/#(visit|odontogram|periodontics|xray|radiology|cbct)/.test(currentHash);
	const isDoctorChairsideMode = selectedWorkspaceRole === "doctor" || isSterileClinicalScreen;
	const isFullScreenStudioActive = useUiSurfaceStore((s) => s.isFullScreenStudioActive);
	const hasPrimaryModal = useUiSurfaceStore((s) => s.hasPrimaryModal);

	const visibility = useFloatingWidgetVisibility({
		defaultExpanded,
		showDialerDefault,
		activeCall: tel.activeCall,
		isCallHistoryModalOpen: tel.isCallHistoryModalOpen,
	});

	const timerAndAudio = useFloatingCallTimerAndAudio(tel.activeCall, tel.isMuted, tel.volumeLevel, tel.playbackSpeed);
	const patientMatch = useFloatingPatientMatch(tel.activeCall, dashboard, visibility.dialNumber);

	const quickActions = useFloatingCallQuickActions({
		activeCall: tel.activeCall,
		resolvedPatient: patientMatch.resolvedPatient,
		upcomingAppointment: patientMatch.upcomingAppointment,
		callerName: patientMatch.callerName,
		formattedPhone: patientMatch.formattedPhone,
		dialNumber: visibility.dialNumber,
		setDialNumber: visibility.setDialNumber,
		dialInputRef: visibility.dialInputRef,
		setActiveTab: visibility.setActiveTab,
		dashboard,
		setDashboard: ctx?.setDashboard,
		setSelectedPatientId,
		setNewPatientPhone,
		triggerIncomingCall: tel.triggerIncomingCall,
		acceptCall: tel.acceptCall,
	});

	return {
		activeCall: tel.activeCall,
		...patientMatch,
		...timerAndAudio,
		...quickActions,
		...visibility,
		agentState: tel.agentState,
		setAgentState: tel.setAgentState,
		activeLineId: tel.activeLineId,
		switchLine: tel.switchLine,
		line1: tel.line1,
		line2: tel.line2,
		isHeld: tel.isHeld,
		toggleHold: tel.toggleHold,
		isMuted: tel.isMuted,
		toggleMute: tel.toggleMute,
		playbackSpeed: tel.playbackSpeed,
		setPlaybackSpeed: tel.setPlaybackSpeed,
		callHistory: tel.callHistory,
		isWsConnected: tel.isWsConnected,
		isDoctorChairsideMode,
		isFullScreenStudioActive,
		hasPrimaryModal,
		answerCall: tel.answerCall,
		rejectCall: tel.rejectCall,
		dismissCall: tel.dismissCall,
		connectCall: tel.connectCall,
		openCallDrawer: tel.openCallDrawer,
		startCallTransfer: tel.startCallTransfer,
		setSelectedPatientId,
		setNewPatientPhone,
	};
}
