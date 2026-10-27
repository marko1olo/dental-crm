import React, { useEffect, useRef, useState } from "react";
import { Headphones, PhoneCall, PhoneIncoming } from "lucide-react";
import { formatDurationTimer, useTelephonyStore, type IncomingCallPayload } from "../../../store/telephonyStore";
import { TelephonySoftphonePopover } from "./TelephonySoftphonePopover";

export interface TelephonyHeaderCapsuleProps {
	className?: string;
	id?: string;
	activeCall?: IncomingCallPayload | null;
}

export function TelephonyHeaderCapsule({
	className,
	id = "topbar-chairside-telephony-btn",
	activeCall: propActiveCall,
}: TelephonyHeaderCapsuleProps): React.JSX.Element {
	const [isOpen, setIsOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const capsuleRef = useRef<HTMLDivElement | null>(null);

	const storeActiveCall = useTelephonyStore((s) => s.activeCall);
	const activeCall = propActiveCall !== undefined ? propActiveCall : storeActiveCall;
	const agentState = useTelephonyStore((s) => s.agentState);
	const activeLineId = useTelephonyStore((s) => s.activeLineId);

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth <= 768);
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (capsuleRef.current && !capsuleRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false);
		};
		window.addEventListener("mousedown", handleClickOutside);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("mousedown", handleClickOutside);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	const isRinging = activeCall?.status === "ringing";
	const isAnswered = Boolean(activeCall && activeCall.status !== "ringing");
	const durationSeconds = activeCall?.callStartedAt ? Math.floor((Date.now() - activeCall.callStartedAt) / 1000) : 0;

	const dotClass = activeCall
		? isRinging ? "bg-emerald-400 animate-ping" : "bg-teal-400 animate-pulse"
		: agentState === "online" ? "bg-emerald-500" : agentState === "dnd" ? "bg-rose-500" : "bg-amber-500";

	const buttonStyle = activeCall
		? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
		: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]";

	return (
		<div className="relative inline-flex items-center" ref={capsuleRef}>
			<button
				type="button"
				id={id}
				data-testid="topbar-chairside-telephony-btn"
				data-telephony-header-capsule="true"
				className={`secondary-button compact-top-button h-8 min-h-[32px] px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs transition-all cursor-pointer select-none ${buttonStyle} ${className || ""}`}
				title={activeCall ? `Телефония: ${activeCall.patientName || activeCall.phone}` : `Телефония Mango PBX (Л${activeLineId})`}
				onClick={() => setIsOpen((prev) => !prev)}
				aria-expanded={isOpen}
				aria-haspopup="dialog"
			>
				<span className="relative flex h-2 w-2 shrink-0">
					{isRinging && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
					<span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`} />
				</span>

				{activeCall ? (
					isRinging ? (
						<PhoneIncoming className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse shrink-0" aria-hidden="true" />
					) : (
						<PhoneCall className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
					)
				) : (
					<Headphones className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" aria-hidden="true" />
				)}

				<span className="hidden sm:inline truncate max-w-[120px]">
					{activeCall
						? isAnswered ? `${formatDurationTimer(durationSeconds)}` : "Входящий..."
						: agentState === "online" ? `Л${activeLineId}` : agentState === "dnd" ? "Занят" : "Пауза"}
				</span>
			</button>

			{isOpen && (
				<TelephonySoftphonePopover
					onClose={() => setIsOpen(false)}
					isMobile={isMobile}
				/>
			)}
		</div>
	);
}
