import React, { useEffect, useRef, useState } from "react";
import { Headphones, PhoneCall, PhoneIncoming, PhoneOff } from "lucide-react";
import { useAppStore } from "../../../store/appStore";
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
}: TelephonyHeaderCapsuleProps): React.JSX.Element | null {
	const [isOpen, setIsOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [hash, setHash] = useState(() => (typeof window !== "undefined" ? window.location.hash : ""));
	const capsuleRef = useRef<HTMLDivElement | null>(null);

	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
	const currentView = useAppStore((s) => s.currentView);

	const storeActiveCall = useTelephonyStore((s) => s.activeCall);
	const activeCall = propActiveCall !== undefined ? propActiveCall : storeActiveCall;
	const agentState = useTelephonyStore((s) => s.agentState);
	const activeLineId = useTelephonyStore((s) => s.activeLineId);
	const answerCall = useTelephonyStore((s) => s.answerCall);
	const rejectCall = useTelephonyStore((s) => s.rejectCall);

	useEffect(() => {
		const handleHashChange = () => setHash(window.location.hash);
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

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

	// Mandate 8v & 8e: Doctor sterile zone & chairside chart immunity.
	// Telephony is completely silent and hidden for doctor role or during clinical visit screens.
	const isSterileZone =
		selectedWorkspaceRole === "doctor" ||
		["visit", "odontogram", "periodontics", "xray", "radiology", "cbct"].includes(currentView as string) ||
		/#(visit|odontogram|periodontics|xray|radiology|cbct)/.test(hash);

	if (isSterileZone) {
		return null;
	}

	const isRinging = activeCall?.status === "ringing";
	const isAnswered = Boolean(activeCall && activeCall.status !== "ringing");
	const durationSeconds = activeCall?.callStartedAt ? Math.floor((Date.now() - activeCall.callStartedAt) / 1000) : 0;

	const dotClass = activeCall
		? isRinging ? "bg-emerald-400 animate-ping" : "bg-teal-400 animate-pulse"
		: agentState === "online" ? "bg-emerald-500" : agentState === "dnd" ? "bg-rose-500" : "bg-amber-500";

	const buttonStyle = activeCall
		? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium shadow-xs"
		: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]";

	return (
		<div className="relative inline-flex items-center" ref={capsuleRef}>
			<div
				id={id}
				data-testid="topbar-chairside-telephony-btn"
				data-telephony-header-capsule="true"
				className={`compact-top-button h-8 min-h-[32px] px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs transition-all border select-none ${buttonStyle} ${className || ""}`}
				title={activeCall ? `Телефония: ${activeCall.patientName || activeCall.phone}` : `Телефония: АТС · Л${activeLineId}`}
			>
				<button
					type="button"
					onClick={() => setIsOpen((prev) => !prev)}
					aria-expanded={isOpen}
					aria-haspopup="dialog"
					className="inline-flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0 text-inherit font-inherit outline-hidden"
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

					<span className="truncate max-w-[130px] font-medium">
						{activeCall
							? isAnswered
								? `${activeCall.patientName ? `${activeCall.patientName} (${formatDurationTimer(durationSeconds)})` : formatDurationTimer(durationSeconds)}`
								: activeCall.patientName || activeCall.phone || "Входящий..."
							: agentState === "online" ? `Л${activeLineId}` : agentState === "dnd" ? "Занят" : "Пауза"}
					</span>
				</button>

				{/* 1-Click Fast Actions for Receptionist within the Top Ambient Event Capsule */}
				{isRinging && (
					<div className="inline-flex items-center gap-1 pl-1 ml-0.5 border-l border-emerald-500/30">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								answerCall();
							}}
							data-testid="header-capsule-answer-btn"
							className="px-2 py-0.5 rounded-md bg-[var(--teal,#0d9488)] text-white hover:bg-[var(--teal-strong,#0f766e)] text-[11px] font-semibold cursor-pointer transition-colors shadow-xs"
							title="Ответить на звонок"
						>
							Ответить
						</button>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								rejectCall();
							}}
							data-testid="header-capsule-reject-btn"
							className="p-1 rounded-md text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
							title="Сбросить вызов"
							aria-label="Сбросить вызов"
						>
							<PhoneOff className="w-3.5 h-3.5" />
						</button>
					</div>
				)}

				{isAnswered && (
					<div className="inline-flex items-center pl-1 ml-0.5 border-l border-teal-500/30">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								rejectCall();
							}}
							data-testid="header-capsule-end-btn"
							className="p-1 rounded-md text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
							title="Завершить вызов"
							aria-label="Завершить вызов"
						>
							<PhoneOff className="w-3.5 h-3.5" />
						</button>
					</div>
				)}
			</div>

			{isOpen && (
				<TelephonySoftphonePopover
					onClose={() => setIsOpen(false)}
					isMobile={isMobile}
				/>
			)}
		</div>
	);
}
