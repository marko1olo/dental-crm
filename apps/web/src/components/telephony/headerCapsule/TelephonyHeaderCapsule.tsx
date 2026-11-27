import React, { useEffect, useRef, useState } from "react";
import { Headphones, PhoneCall, PhoneIncoming, PhoneOff } from "lucide-react";
import { useAppStore } from "../../../store/appStore";
import { formatDurationTimer, useTelephonyStore, type IncomingCallPayload } from "../../../store/telephonyStore";
import { TelephonySoftphonePopover } from "./TelephonySoftphonePopover";

export interface TelephonyHeaderCapsuleProps {
	className?: string;
	id?: string;
	activeCall?: IncomingCallPayload | null;
	isPopupExpanded?: boolean;
}

export function TelephonyHeaderCapsule({
	className,
	id = "topbar-chairside-telephony-btn",
	activeCall: propActiveCall,
	isPopupExpanded: propIsPopupExpanded,
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
	const endCall = useTelephonyStore((s) => s.endCall);

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
			if (capsuleRef.current && e.target instanceof Node && !capsuleRef.current.contains(e.target)) {
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

	// Streamline Header Capsule & Prevent UI competition:
	// When full-sized IncomingCallPopup banner is expanded on screen, do not duplicate
	// answer/reject buttons inside capsule and give caller name adequate breathing room.
	// Binds directly to reactive Zustand store without fragile DOM MutationObserver cargo cult.
	// Keep all hooks unconditional before any early return (React 19 Rules of Hooks / W15-UI-01).
	const isStorePopupExpanded = useTelephonyStore((s) => s.isIncomingCallPopupExpanded);

	// Mandate 8v & 8e: Doctor sterile zone & chairside chart immunity.
	// Telephony is completely silent and hidden for doctor role or during clinical visit screens.
	const sterileViews = new Set(["visit", "odontogram", "periodontics", "xray", "radiology", "cbct"]);
	const isSterileZone =
		selectedWorkspaceRole === "doctor" ||
		(Boolean(currentView) && sterileViews.has(String(currentView))) ||
		/#(visit|odontogram|periodontics|xray|radiology|cbct)/.test(hash);

	if (isSterileZone) {
		return null;
	}

	const isRinging = activeCall?.status === "ringing";
	const isAnswered = Boolean(activeCall && activeCall.status !== "ringing");
	const durationSeconds = activeCall?.callStartedAt ? Math.floor((Date.now() - activeCall.callStartedAt) / 1000) : 0;
	const isFullBannerActive = propIsPopupExpanded !== undefined ? propIsPopupExpanded : isStorePopupExpanded;
	const shouldShowActionButtons = isRinging && !isFullBannerActive;

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

					<span
						className={`truncate font-medium transition-all ${
							isFullBannerActive
								? "max-w-[200px] sm:max-w-[300px]"
								: "max-w-[140px] sm:max-w-[190px]"
						}`}
					>
						{activeCall
							? isAnswered
								? `${activeCall.patientName ? `${activeCall.patientName} (${formatDurationTimer(durationSeconds)})` : formatDurationTimer(durationSeconds)}`
								: activeCall.patientName || activeCall.phone || "Входящий..."
							: agentState === "online" ? `Л${activeLineId}` : agentState === "dnd" ? "Занят" : "Пауза"}
					</span>
				</button>

				{/* 1-Click Fast Actions for Receptionist within the Top Ambient Event Capsule (hidden when full IncomingCallPopup is expanded on screen) */}
				{shouldShowActionButtons && (
					<div className="inline-flex items-center gap-1 pl-1 ml-0.5 border-l border-[var(--line)]">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								answerCall();
							}}
							data-testid="header-capsule-answer-btn"
							className="px-2 py-0.5 rounded-md bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-[11px] font-semibold cursor-pointer transition-colors shadow-xs"
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
					<div className="inline-flex items-center pl-1 ml-0.5 border-l border-[var(--line)]">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								endCall();
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
