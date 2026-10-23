import { History, PhoneOutgoing } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { TelephonyDialerHistoryTab } from "./telephonyDialerModal/TelephonyDialerHistoryTab";
import { TelephonyDialerKeypad } from "./telephonyDialerModal/TelephonyDialerKeypad";
import { TelephonyDialerModalHeader } from "./telephonyDialerModal/TelephonyDialerModalHeader";
import { useTelephonyDialer } from "./telephonyDialerModal/useTelephonyDialer";

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
}: TelephonyDialerModalProps): React.JSX.Element | null {
	const d = useTelephonyDialer(isOpen, onClose, initialPhone, onStartCall);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[9995] flex items-end sm:items-center justify-center p-0 sm:p-3 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Софтфон клиники и номеронабиратель"
			data-testid="telephony-dialer-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="w-full max-w-full sm:max-w-[380px] rounded-t-3xl sm:rounded-2xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-2xl text-[var(--ink)] overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 pb-[env(safe-area-inset-bottom)]"
				style={{ maxHeight: "calc(100dvh - 16px)" }}
			>
				<div className="w-9 h-1.5 rounded-full bg-[var(--line)] mx-auto mt-2.5 mb-1 sm:hidden" aria-hidden="true" />
				<TelephonyDialerModalHeader
					isWsConnected={d.isWsConnected}
					agentState={d.agentState}
					onSetAgentState={d.setAgentState}
					onClose={onClose}
				/>
				<div className="flex items-center p-1 bg-[var(--paper-soft)] border-b border-[var(--line)] gap-1 text-xs">
					<button
						type="button"
						onClick={() => d.setActiveTab("dialer")}
						className={`flex-1 min-h-[36px] py-1.5 px-3 rounded-lg font-bold transition-all inline-flex items-center justify-center gap-1.5 ${
							d.activeTab === "dialer"
								? "bg-[var(--paper-strong)] text-[var(--teal)] shadow-xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)] border border-transparent"
						}`}
					>
						<PhoneOutgoing size={13} />
						<span>Набор номера</span>
					</button>
					<button
						type="button"
						onClick={() => d.setActiveTab("history")}
						className={`flex-1 min-h-[36px] py-1.5 px-3 rounded-lg font-bold transition-all inline-flex items-center justify-center gap-1.5 ${
							d.activeTab === "history"
								? "bg-[var(--paper-strong)] text-[var(--teal)] shadow-xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)] border border-transparent"
						}`}
					>
						<History size={13} />
						<span>Журнал{d.callHistory.length > 0 ? ` (${d.callHistory.length})` : ""}</span>
					</button>
				</div>
				<div className="p-3.5 overflow-y-auto">
					{d.activeTab === "dialer" ? (
						<TelephonyDialerKeypad
							dialNumber={d.dialNumber}
							onDialNumberChange={d.setDialNumber}
							onDialDigit={(digit) => d.setDialNumber((prev) => (prev.length < 18 ? prev + digit : prev))}
							onDialBackspace={() => d.setDialNumber((prev) => prev.slice(0, -1))}
							onStartCall={d.handleStartCall}
							dialInputRef={d.dialInputRef}
						/>
					) : (
						<TelephonyDialerHistoryTab
							callHistory={d.callHistory}
							onSelectCall={(phone) => {
								d.setDialNumber(phone);
								d.setActiveTab("dialer");
							}}
						/>
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

export default TelephonyDialerModal;
