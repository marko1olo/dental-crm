import {
	type CallOutcome,
	type IncomingCallPayload,
	type TelephonyLineSession,
	useTelephonyStore,
} from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";

interface ControlsParams {
	currentCall: IncomingCallPayload | null;
	formattedPhone: string;
	isDndActive: boolean;
	activeLineId: 1 | 2;
	secondaryLine: TelephonyLineSession;
	setIsExpanded: (val: boolean) => void;
	setShowOutcomePanel: (val: boolean) => void;
}

export function useIncomingCallTelephonyControls({
	currentCall, formattedPhone, isDndActive, activeLineId, secondaryLine,
	setIsExpanded, setShowOutcomePanel,
}: ControlsParams) {
	const answerCall = useTelephonyStore((s) => s.answerCall);
	const rejectCall = useTelephonyStore((s) => s.rejectCall);
	const endCall = useTelephonyStore((s) => s.endCall);
	const dismissCall = useTelephonyStore((s) => s.dismissCall);
	const setAgentState = useTelephonyStore((s) => s.setAgentState);
	const openCallDrawer = useTelephonyStore((s) => s.openCallDrawer);
	const recordCallOutcome = useTelephonyStore((s) => s.recordCallOutcome);
	const switchLine = useTelephonyStore((s) => s.switchLine);

	const handleAnswerCall = () => {
		answerCall();
		openCallDrawer();
		showToast(`Вызов принят (${formattedPhone})`, "success");
	};

	const handleReject = () => {
		rejectCall();
		showToast(`Вызов ${formattedPhone} отклонён`, "info");
	};

	const handleEndCall = () => {
		endCall();
		setIsExpanded(true);
		setShowOutcomePanel(true);
		showToast(`Разговор завершён (${formattedPhone})`, "info");
	};

	const handleSwitchAndAnswerSecondaryLine = (mode: "capsule" | "expanded" = "expanded") => {
		if (!secondaryLine?.call) return;
		switchLine(secondaryLine.lineId as 1 | 2);
		answerCall();
		showToast(
			mode === "capsule"
				? `Линия ${secondaryLine.lineId} активна (Линия ${activeLineId} на удержании)`
				: `Переключено на Линию ${secondaryLine.lineId} (Линия ${activeLineId} на удержании)`,
			"info",
		);
	};

	const handleResumeSecondaryLine = () => {
		if (!secondaryLine?.call) return;
		switchLine(secondaryLine.lineId as 1 | 2);
		showToast(`Возврат к Линии ${secondaryLine.lineId}`, "info");
	};

	const handleCopyPhone = () => {
		if (!currentCall?.phone) return;
		navigator.clipboard?.writeText(currentCall.phone);
		showToast("Номер телефона скопирован", "info");
	};

	const handleToggleDnd = () => {
		setAgentState(isDndActive ? "online" : "dnd");
		showToast(
			isDndActive
				? "Режим «Не беспокоить» выключен"
				: "Включен режим «Не беспокоить» (DND)",
			"info",
		);
	};

	const handleRecordOutcome = (outcome: CallOutcome) => {
		recordCallOutcome(outcome);
		dismissCall();
		showToast(
			outcome === "callback_15m" ? "Запланирован перезвон через 15 минут" : "Исход зафиксирован",
			"info",
		);
	};

	return {
		handleAnswerCall, handleReject, handleEndCall, handleSwitchAndAnswerSecondaryLine,
		handleResumeSecondaryLine, handleCopyPhone, handleToggleDnd, handleRecordOutcome,
	};
}
