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
	const activeCall = useTelephonyStore((s) => s.activeCall);
	const triggerIncomingCall = useTelephonyStore((s) => s.triggerIncomingCall);
	const answerCall = useTelephonyStore((s) => s.answerCall);
	const acceptCall = useTelephonyStore((s) => s.acceptCall);
	const connectCall = useTelephonyStore((s) => s.connectCall);
	const rejectCall = useTelephonyStore((s) => s.rejectCall);
	const dismissCall = useTelephonyStore((s) => s.dismissCall);
	const startCallTransfer = useTelephonyStore((s) => s.startCallTransfer);
	const callHistory = useTelephonyStore((s) => s.callHistory);
	const isMuted = useTelephonyStore((s) => s.isMuted);
	const toggleMute = useTelephonyStore((s) => s.toggleMute);
	const volumeLevel = useTelephonyStore((s) => s.volumeLevel);
	const playbackSpeed = useTelephonyStore((s) => s.playbackSpeed);
	const setPlaybackSpeed = useTelephonyStore((s) => s.setPlaybackSpeed);
	const agentState = useTelephonyStore((s) => s.agentState);
	const setAgentState = useTelephonyStore((s) => s.setAgentState);
	const activeLineId = useTelephonyStore((s) => s.activeLineId);
	const line1 = useTelephonyStore((s) => s.line1);
	const line2 = useTelephonyStore((s) => s.line2);
	const switchLine = useTelephonyStore((s) => s.switchLine);
	const isHeld = useTelephonyStore((s) => s.isHeld);
	const toggleHold = useTelephonyStore((s) => s.toggleHold);
	const openCallDrawer = useTelephonyStore((s) => s.openCallDrawer);
	const isWsConnected = useTelephonyStore((s) => s.isWsConnected);
	const isCallHistoryModalOpen = useTelephonyStore((s) => s.isCallHistoryModalOpen);

	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const crmCurrentView = useAppStore((s) => s.currentView);
	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
	const isDoctorChairsideMode = selectedWorkspaceRole === "doctor" || crmCurrentView === "visit";
	const isFullScreenStudioActive = useUiSurfaceStore((s) => s.isFullScreenStudioActive);
	const hasPrimaryModal = useUiSurfaceStore((s) => s.hasPrimaryModal);

	const visibility = useFloatingWidgetVisibility({
		defaultExpanded,
		showDialerDefault,
		activeCall,
		isCallHistoryModalOpen,
	});

	const timerAndAudio = useFloatingCallTimerAndAudio(activeCall, isMuted, volumeLevel, playbackSpeed);
	const patientMatch = useFloatingPatientMatch(activeCall, dashboard, visibility.dialNumber);

	const quickActions = useFloatingCallQuickActions({
		activeCall,
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
		triggerIncomingCall,
		acceptCall,
	});

	return {
		activeCall,
		...patientMatch,
		...timerAndAudio,
		...quickActions,
		...visibility,
		agentState,
		setAgentState,
		activeLineId,
		switchLine,
		line1,
		line2,
		isHeld,
		toggleHold,
		isMuted,
		toggleMute,
		playbackSpeed,
		setPlaybackSpeed,
		callHistory,
		isWsConnected,
		isDoctorChairsideMode,
		isFullScreenStudioActive,
		hasPrimaryModal,
		answerCall,
		rejectCall,
		dismissCall,
		connectCall,
		openCallDrawer,
		startCallTransfer,
		setSelectedPatientId,
		setNewPatientPhone,
	};
}
