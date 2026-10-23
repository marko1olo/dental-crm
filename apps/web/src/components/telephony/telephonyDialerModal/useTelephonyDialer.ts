import { useEffect, useRef, useState } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import {
	formatPhoneDisplay,
	normalizePhoneDigits,
	resolvePatientFromPhone,
	useTelephonyStore,
} from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";

export function useTelephonyDialer(
	isOpen: boolean,
	onClose: () => void,
	initialPhone = "",
	onStartCall?: (phone: string) => void,
) {
	const triggerIncomingCall = useTelephonyStore((s) => s.triggerIncomingCall);
	const callHistory = useTelephonyStore((s) => s.callHistory);
	const agentState = useTelephonyStore((s) => s.agentState);
	const setAgentState = useTelephonyStore((s) => s.setAgentState);
	const isWsConnected = useTelephonyStore((s) => s.isWsConnected);

	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;

	const [dialNumber, setDialNumber] = useState(initialPhone);
	const [activeTab, setActiveTab] = useState<"dialer" | "history">("dialer");
	const dialInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (initialPhone) setDialNumber(initialPhone);
	}, [initialPhone]);

	useEffect(() => {
		if (!isOpen) return;
		const timer = setTimeout(() => { dialInputRef.current?.focus(); }, 100);
		return () => clearTimeout(timer);
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const handleStartCall = () => {
		if (!dialNumber.trim()) {
			dialInputRef.current?.focus();
			showToast("Введите номер телефона для набора", "warning");
			return;
		}
		const clean = normalizePhoneDigits(dialNumber);
		const e164 = clean.startsWith("7") ? `+${clean}` : clean.startsWith("8") ? `+7${clean.slice(1)}` : `+7${clean}`;

		if (onStartCall) {
			onStartCall(e164);
		} else {
			const matchingPatient = resolvePatientFromPhone(dashboard?.patients, e164);
			triggerIncomingCall({
				phone: e164, patientId: matchingPatient?.id || null,
				patientName: matchingPatient?.fullName || "Исходящий вызов",
				provider: "mango", timestamp: new Date().toISOString(),
				status: "answered", callStartedAt: Date.now(),
			});
			showToast(`Исходящий вызов на номер ${formatPhoneDisplay(e164)}`, "success");
		}
		onClose();
	};

	return {
		dialNumber, setDialNumber, activeTab, setActiveTab, dialInputRef,
		callHistory, agentState, setAgentState, isWsConnected, handleStartCall,
	};
}
