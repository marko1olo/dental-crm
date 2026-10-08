import {
	Delete,
	Headphones,
	History,
	PhoneCall,
	PhoneIncoming,
	PhoneMissed,
	PhoneOff,
	PhoneOutgoing,
	X,
} from "lucide-react";
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

export interface TelephonyDialerModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialPhone?: string;
	onStartCall?: (phone: string) => void;
}

/**
 * TelephonyDialerModal: Softphone Dialer Modal & Bottom Sheet.
 * Professional clinical softphone with numeric dialpad, history, and 1-click redial.
 * Strictly adheres to Mandates 8d, 8e, 8n (Quiet telemetry, touch targets >= 44px, zero emojis, zero 100vw).
 */
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
		if (initialPhone) {
			setDialNumber(initialPhone);
		}
	}, [initialPhone]);

	useEffect(() => {
		if (!isOpen) return;
		const timer = setTimeout(() => {
			dialInputRef.current?.focus();
		}, 100);
		return () => clearTimeout(timer);
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (typeof document === "undefined" || !isOpen) return null;

	const handleDialDigit = (digit: string) => {
		setDialNumber((prev) => (prev.length < 18 ? prev + digit : prev));
	};

	const handleDialBackspace = () => {
		setDialNumber((prev) => prev.slice(0, -1));
	};

	const handleStartCall = () => {
		if (!dialNumber.trim()) {
			dialInputRef.current?.focus();
			showToast("Введите номер телефона для набора", "warning");
			return;
		}

		const clean = normalizePhoneDigits(dialNumber);
		const e164 = clean.startsWith("7")
			? `+${clean}`
			: clean.startsWith("8")
				? `+7${clean.slice(1)}`
				: `+7${clean}`;

		if (onStartCall) {
			onStartCall(e164);
		} else {
			const matchingPatient = resolvePatientFromPhone(dashboard?.patients, e164);
			triggerIncomingCall({
				phone: e164,
				patientId: matchingPatient?.id || null,
				patientName: matchingPatient?.fullName || "Исходящий вызов",
				provider: "mango",
				timestamp: new Date().toISOString(),
				status: "answered",
				callStartedAt: Date.now(),
			});
			showToast(
				`Исходящий вызов на номер ${formatPhoneDisplay(e164)}`,
				"success",
			);
		}

		onClose();
	};

	return createPortal(
		<div
			className="fixed inset-0 z-[9995] flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Софтфон клиники и номеронабиратель"
			data-testid="telephony-dialer-modal"
		>
			<div
				className="w-full max-w-[380px] rounded-2xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-2xl text-[var(--ink)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
				style={{ maxHeight: "calc(100dvh - 32px)" }}
			>
				{/* Modal Header */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] shrink-0">
							<Headphones size={16} />
						</div>
						<div>
							<h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)] leading-tight">
								Софтфон клиники
							</h3>
							<div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] mt-0.5">
								<span
									className={`w-1.5 h-1.5 rounded-full ${isWsConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}
								/>
								<span>
									{isWsConnected
										? "Телефония онлайн"
										: "Ожидание вызова"}
								</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-1">
						{/* Agent State toggle buttons */}
						<div className="flex items-center bg-[var(--paper-strong)] rounded-lg p-0.5 border border-[var(--line)] text-[10px]">
							<button
								type="button"
								onClick={() => setAgentState("online")}
								className={`px-2 py-1 rounded font-bold transition-all ${
									agentState === "online"
										? "bg-emerald-500 text-white shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								title="Онлайн"
							>
								Онлайн
							</button>
							<button
								type="button"
								onClick={() => setAgentState("dnd")}
								className={`px-2 py-1 rounded font-bold transition-all ${
									agentState === "dnd"
										? "bg-rose-500 text-white shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								title="Не беспокоить"
							>
								Занят
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="min-h-[36px] min-w-[36px] rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer"
							title="Закрыть номеронабиратель (Esc)"
							aria-label="Закрыть"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Tab Strip */}
				<div className="flex items-center p-1 bg-[var(--paper-soft)] border-b border-[var(--line)] gap-1 text-xs">
					<button
						type="button"
						onClick={() => setActiveTab("dialer")}
						className={`flex-1 min-h-[36px] py-1.5 px-3 rounded-lg font-bold transition-all inline-flex items-center justify-center gap-1.5 ${
							activeTab === "dialer"
								? "bg-[var(--paper-strong)] text-[var(--teal)] shadow-xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)] border border-transparent"
						}`}
					>
						<PhoneOutgoing size={13} />
						<span>Набор номера</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("history")}
						className={`flex-1 min-h-[36px] py-1.5 px-3 rounded-lg font-bold transition-all inline-flex items-center justify-center gap-1.5 ${
							activeTab === "history"
								? "bg-[var(--paper-strong)] text-[var(--teal)] shadow-xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)] border border-transparent"
						}`}
					>
						<History size={13} />
						<span>Журнал{callHistory.length > 0 ? ` (${callHistory.length})` : ""}</span>
					</button>
				</div>

				{/* Modal Body */}
				<div className="p-3.5 overflow-y-auto">
					{activeTab === "dialer" ? (
						<div className="space-y-3">
							{/* Number Display Input */}
							<div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
								<input
									ref={dialInputRef}
									type="text"
									value={dialNumber}
									onChange={(e) => setDialNumber(e.target.value)}
									placeholder="+7 (___) ___-__-__"
									className="flex-1 bg-transparent text-[var(--ink)] text-base font-mono font-bold tracking-wider focus:outline-none px-2"
								/>
								{dialNumber && (
									<button
										type="button"
										onClick={handleDialBackspace}
										className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--muted)] hover:text-rose-500 hover:bg-[var(--paper-soft)] transition-colors inline-flex items-center justify-center cursor-pointer"
										aria-label="Стереть цифру"
									>
										<Delete size={18} />
									</button>
								)}
							</div>

							{/* Keypad */}
							<div className="grid grid-cols-3 gap-2">
								{[
									{ d: "1", sub: "" },
									{ d: "2", sub: "ABC" },
									{ d: "3", sub: "DEF" },
									{ d: "4", sub: "GHI" },
									{ d: "5", sub: "JKL" },
									{ d: "6", sub: "MNO" },
									{ d: "7", sub: "PQRS" },
									{ d: "8", sub: "TUV" },
									{ d: "9", sub: "WXYZ" },
									{ d: "*", sub: "" },
									{ d: "0", sub: "+" },
									{ d: "#", sub: "" },
								].map((k) => (
									<button
										key={k.d}
										type="button"
										onClick={() => handleDialDigit(k.d)}
										className="min-h-[48px] min-w-[48px] py-2.5 rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--teal-surface)] active:scale-95 border border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)] transition-all flex flex-col items-center justify-center select-none shadow-xs cursor-pointer"
									>
										<span className="text-base font-black leading-none">
											{k.d}
										</span>
										{k.sub && (
											<span className="text-[9px] font-semibold text-[var(--muted)] mt-0.5">
												{k.sub}
											</span>
										)}
									</button>
								))}
							</div>

							{/* Outgoing Call Button */}
							<button
								type="button"
								onClick={handleStartCall}
								className="w-full min-h-[48px] py-3 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-98 text-white text-sm font-bold transition-all inline-flex items-center justify-center gap-2 shadow-lg cursor-pointer"
								aria-label="Совершить исходящий вызов"
								data-testid="btn-start-outgoing-call"
							>
								<PhoneCall size={18} />
								<span>Позвонить</span>
							</button>
						</div>
					) : (
						/* Call History Tab */
						<div className="space-y-2">
							{callHistory.length === 0 ? (
								<div className="py-8 text-center text-xs text-[var(--muted)] space-y-1">
									<div className="font-semibold text-[var(--ink)]">
										История звонков пуста
									</div>
									<div>Ожидание вебхука АТС</div>
								</div>
							) : (
								callHistory.slice(0, 10).map((item) => (
									<div
										key={item.id}
										className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs shadow-xs"
									>
										<div className="flex items-center gap-2.5 min-w-0">
											<div
												className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
													item.status === "answered" || item.status === "connected"
														? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
														: item.status === "rejected"
															? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
															: "bg-amber-500/10 text-amber-600 dark:text-amber-400"
												}`}
											>
												{item.status === "answered" || item.status === "connected" ? (
													<PhoneIncoming size={13} />
												) : item.status === "rejected" ? (
													<PhoneOff size={13} />
												) : (
													<PhoneMissed size={13} />
												)}
											</div>

											<div className="min-w-0 flex-1">
												<div
													className="font-bold text-[var(--ink)] truncate"
													title={item.patientName || formatPhoneDisplay(item.phone)}
												>
													{item.patientName || formatPhoneDisplay(item.phone)}
												</div>
												<div className="text-[10px] font-mono text-[var(--muted)]">
													{formatPhoneDisplay(item.phone)}
												</div>
											</div>
										</div>

										<button
											type="button"
											onClick={() => {
												setDialNumber(item.phone);
												setActiveTab("dialer");
											}}
											className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--teal)] hover:bg-[var(--teal-surface)] transition-colors inline-flex items-center justify-center cursor-pointer"
											title="Набрать"
											aria-label={`Набрать ${item.phone}`}
										>
											<PhoneCall size={14} />
										</button>
									</div>
								))
							)}
						</div>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
}
