import React from "react";
import type {
	IncomingCallPayload,
	PlaybackSpeed,
	PatientSomaticAlert,
	PatientUpcomingAppointmentSummary,
	SpeechTranscriptUtterance,
} from "../../store/telephonyTypes";
import { TelephonyIncomingCallCard } from "./telephonyFloatingWidget/TelephonyIncomingCallCard";
import type { CallAttribution } from "./telephonyAttribution";

export interface TelephonyMiniControlPanelProps {
	activeCall: IncomingCallPayload | null;
	// biome-ignore lint/suspicious/noExplicitAny: patient like compatibility
	resolvedPatient: any | null;
	callerName: string;
	formattedPhone: string;
	initials: string;
	avatarColors: { bg: string; text: string; border?: string | undefined };
	allergyAlerts: PatientSomaticAlert[];
	acutePainAlerts: PatientSomaticAlert[];
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	callAttribution: CallAttribution | null;
	whatsappSent: boolean;
	onSendWhatsApp: () => void;
	audioRef?: React.RefObject<HTMLAudioElement | null>;
	waveformRef?: React.RefObject<HTMLDivElement | null>;
	waveformBars?: number[];
	isPlayingAudio?: boolean;
	audioCurrentTime?: number;
	audioDuration?: number;
	onTogglePlayAudio?: () => void;
	onSkipAudio?: (delta: number) => void;
	onWaveformClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
	playbackSpeed?: PlaybackSpeed;
	onSetPlaybackSpeed?: (speed: PlaybackSpeed) => void;
	showTranscript?: boolean;
	onToggleTranscript?: () => void;
	transcriptUtterances?: SpeechTranscriptUtterance[];
	copiedTranscript?: boolean;
	onCopyTranscript?: () => void;
	onSeekToUtterance?: (sec: number) => void;
	showTransferPanel?: boolean;
	onToggleTransferPanel?: () => void;
	transferType?: "blind" | "attended";
	onSetTransferType?: (t: "blind" | "attended") => void;
	onStartTransfer?: (ext: string, type: "blind" | "attended") => void;
	onQuickBook: (slot: "urgent" | "consultation" | "tomorrow") => void;
	onOpenCard: () => void;
	showWidgetMoreMenu: boolean;
	onToggleWidgetMoreMenu: () => void;
	onCloseWidgetMoreMenu: () => void;
	isCapturingLead: boolean;
	onCaptureLead: () => void;
	isHeld: boolean;
	onToggleHold: () => void;
	onCopyPhone: () => void;
	isCreatingPatient: boolean;
	onQuickCreatePatient: (customName?: string) => void;
	isWsConnected: boolean;
	onSwitchToDialer: () => void;
	onAudioTimeUpdate?: () => void;
	onAudioEnded?: () => void;
}

/**
 * TelephonyMiniControlPanel — SSOT Compatibility Facade
 * Delegates directly to TelephonyIncomingCallCard to eliminate duplicate softphone implementations.
 */
export function TelephonyMiniControlPanel(props: TelephonyMiniControlPanelProps) {
	return (
		<TelephonyIncomingCallCard
			activeCall={props.activeCall}
			resolvedPatient={props.resolvedPatient}
			callerName={props.callerName}
			formattedPhone={props.formattedPhone}
			initials={props.initials}
			avatarColors={props.avatarColors}
			allergyAlerts={props.allergyAlerts}
			acutePainAlerts={props.acutePainAlerts}
			upcomingAppointment={props.upcomingAppointment}
			callAttribution={props.callAttribution}
			whatsappSent={props.whatsappSent}
			onSendWhatsApp={props.onSendWhatsApp}
			onQuickBook={props.onQuickBook}
			onOpenCard={props.onOpenCard}
			showWidgetMoreMenu={props.showWidgetMoreMenu}
			onToggleWidgetMoreMenu={props.onToggleWidgetMoreMenu}
			onCloseWidgetMoreMenu={props.onCloseWidgetMoreMenu}
			isCapturingLead={props.isCapturingLead}
			onCaptureLead={props.onCaptureLead}
			isHeld={props.isHeld}
			onToggleHold={props.onToggleHold}
			onCopyPhone={props.onCopyPhone}
			isCreatingPatient={props.isCreatingPatient}
			onQuickCreatePatient={props.onQuickCreatePatient}
			isWsConnected={props.isWsConnected}
			onSwitchToDialer={props.onSwitchToDialer}
		/>
	);
}
