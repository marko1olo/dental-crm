import { useEffect, useState } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import {
	type IncomingCallPayload,
	useTelephonyStore,
} from "../../../store/telephonyStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { useIncomingCallData } from "../useIncomingCallData";
import type { TelephonyCallLogFilter } from "./telephonyDrawerTypes";
import { useDrawerBookingAndPatientActions } from "./useDrawerBookingAndPatientActions";
import { useDrawerLogActions } from "./useDrawerLogActions";

export function useTelephonyDrawerController(
	propIsOpen?: boolean,
	propOnClose?: () => void,
	propCall?: IncomingCallPayload | null,
) {
	const storeIsOpen = useTelephonyStore((s) => s.isCallDrawerOpen);
	const closeCallDrawer = useTelephonyStore((s) => s.closeCallDrawer);
	const activeCall = useTelephonyStore((s) => s.activeCall);
	const isConnected = useTelephonyStore((s) => s.isWsConnected);
	const callHistory = useTelephonyStore((s) => s.callHistory);
	const startCallTransfer = useTelephonyStore((s) => s.startCallTransfer);
	const recordCallOutcome = useTelephonyStore((s) => s.recordCallOutcome);

	const isDrawerOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;
	const handleClose = propOnClose || closeCallDrawer;
	const currentCall = propCall !== undefined ? propCall : activeCall;
	const hasPrimaryModal = useUiSurfaceStore((s) => s.hasPrimaryModal);
	const isFullScreenStudioActive = useUiSurfaceStore((s) => s.isFullScreenStudioActive);

	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;

	const [activeTab, setActiveTab] = useState<"call" | "journal">(() => (currentCall ? "call" : "journal"));
	const [activeFilter, setActiveFilter] = useState<TelephonyCallLogFilter>("all");
	const [showQuickBooking, setShowQuickBooking] = useState(false);
	const [showTransferPanel, setShowTransferPanel] = useState(false);
	const [transferType, setTransferType] = useState<"blind" | "attended">("blind");
	const [showOutcomePanel, setShowOutcomePanel] = useState(false);
	const [isDialerOpen, setIsDialerOpen] = useState(false);

	useEffect(() => {
		if (currentCall) setActiveTab("call");
	}, [currentCall]);

	useEffect(() => {
		if (!isDrawerOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isDrawerOpen, handleClose]);

	useEffect(() => {
		if (isDrawerOpen && !hasPrimaryModal && !isFullScreenStudioActive) {
			useUiSurfaceStore.getState().openDrawer("telephony");
		} else if (useUiSurfaceStore.getState().activeDrawer === "telephony") {
			useUiSurfaceStore.getState().closeDrawer("telephony");
		}
	}, [isDrawerOpen, hasPrimaryModal, isFullScreenStudioActive]);

	const callData = useIncomingCallData(currentCall, dashboard, () => {});

	const isCallAnswered =
		currentCall?.status === "answered" ||
		currentCall?.status === "connected" ||
		currentCall?.status === "ended";

	const bookingActions = useDrawerBookingAndPatientActions({
		currentCall, callData, dashboard, ctx, handleClose, isCallAnswered,
	});

	const logActions = useDrawerLogActions({ dashboard, handleClose });

	return {
		isDrawerOpen, handleClose, currentCall, hasPrimaryModal, isFullScreenStudioActive,
		dashboard, isConnected, callHistory, activeTab, setActiveTab, activeFilter, setActiveFilter,
		showQuickBooking, setShowQuickBooking, showTransferPanel, setShowTransferPanel,
		transferType, setTransferType, showOutcomePanel, setShowOutcomePanel,
		newPatientNameInput: bookingActions.newPatientNameInput,
		setNewPatientNameInput: bookingActions.setNewPatientNameInput,
		isCreatingPatient: bookingActions.isCreatingPatient,
		isCapturingLead: bookingActions.isCapturingLead,
		smsCopied: bookingActions.smsCopied,
		isDialerOpen, setIsDialerOpen, isCallAnswered, callData,
		handleSendWhatsAppConfirmation: bookingActions.handleSendWhatsAppConfirmation,
		handleCopySmsConfirmation: bookingActions.handleCopySmsConfirmation,
		handleOpenFullPatientView: bookingActions.handleOpenFullPatientView,
		handleQuickBook: bookingActions.handleQuickBook,
		handleQuickCreatePatient: bookingActions.handleQuickCreatePatient,
		handleCaptureLead: bookingActions.handleCaptureLead,
		handleQuickBookFromLog: logActions.handleQuickBookFromLog,
		handleCallbackFromLog: logActions.handleCallbackFromLog,
		handleOpenPatientFromLog: logActions.handleOpenPatientFromLog,
		startCallTransfer, recordCallOutcome,
	};
}
