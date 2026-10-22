import { History, PhoneOutgoing } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import {
	formatPhoneDisplay,
	normalizePhoneDigits,
	resolvePatientFromPhone,
	useTelephonyStore,
} from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";
import { TelephonyDialerModalHeader } from "./telephonyDialerModal/TelephonyDialerModalHeader";
import { TelephonyDialerKeypad } from "./telephonyDialerModal/TelephonyDialerKeypad";
import { TelephonyDialerHistoryTab } from "./telephonyDialerModal/TelephonyDialerHistoryTab";

export interface TelephonyDialerModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialPhone?: string | undefined;
	onStartCall?: ((phone: string) => void) | undefined;
}

export function TelephonyDialerModal({
	isOpen,
	onClose,
	initialPhone = "",
	onStartCall,
}: TelephonyDialerModalProps) {
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

	if (!isOpen) return null;

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

	const modalContent = (
		<div
			className="fixed inset-0 z-[9995] flex items-end sm:items-center justify-center p-0 sm:p-3 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
			role="dialog" aria-modal="true" aria-label="Софтфон клиники и номеронабиратель"
			data-testid="telephony-dialer-modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
		>
			<div
				className="w-full max-w-full sm:max-w-[380px] rounded-t-3xl sm:rounded-2xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-2xl text-[var(--ink)] overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 pb-[env(safe-area-inset-bottom)]"
				style={{ maxHeight: "calc(100dvh - 16px)" }}
			>
				<div className="w-9 h-1.5 rounded-full bg-[var(--line)] mx-auto mt-2.5 mb-1 sm:hidden" aria-hidden="true" />
				<TelephonyDialerModalHeader isWsConnected={isWsConnected} agentState={agentState} onSetAgentState={setAgentState} onClose={onClose} />
				<div className="flex items-center p-1 bg-[var(--paper-soft)] border-b border-[var(--line)] gap-1 text-xs">
					<button type="button" onClick={() => setActiveTab("dialer")} className={`flex-1 min-h-[36px] py-1.5 px-3 rounded-lg font-bold transition-all inline-flex items-center justify-center gap-1.5 ${activeTab === "dialer" ? "bg-[var(--paper-strong)] text-[var(--teal)] shadow-xs border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)] border border-transparent"}`}>
						<PhoneOutgoing size={13} /><span>Набор номера</span>
					</button>
					<button type="button" onClick={() => setActiveTab("history")} className={`flex-1 min-h-[36px] py-1.5 px-3 rounded-lg font-bold transition-all inline-flex items-center justify-center gap-1.5 ${activeTab === "history" ? "bg-[var(--paper-strong)] text-[var(--teal)] shadow-xs border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)] border border-transparent"}`}>
						<History size={13} /><span>Журнал{callHistory.length > 0 ? ` (${callHistory.length})` : ""}</span>
					</button>
				</div>
				<div className="p-3.5 overflow-y-auto">
					{activeTab === "dialer" ? (
						<TelephonyDialerKeypad dialNumber={dialNumber} onDialNumberChange={setDialNumber} onDialDigit={(d) => setDialNumber((prev) => prev.length < 18 ? prev + d : prev)} onDialBackspace={() => setDialNumber((prev) => prev.slice(0, -1))} onStartCall={handleStartCall} dialInputRef={dialInputRef} />
					) : (
						<TelephonyDialerHistoryTab callHistory={callHistory} onSelectCall={(p) => { setDialNumber(p); setActiveTab("dialer"); }} />
					)}
				</div>
			</div>
		</div>
	);

	if (typeof document === "undefined") {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
}
