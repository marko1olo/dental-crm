import React, { useEffect, useState } from "react";
import { PhoneCall, Headphones, CalendarCheck, User, Volume2 } from "lucide-react";
import { TelephonyFloatingWidget } from "./TelephonyFloatingWidget";
import { IncomingCallPopup } from "./IncomingCallPopup";
import { TelephonyDialerModal } from "./TelephonyDialerModal";
import { CallAudioPlayer } from "./CallAudioPlayer";
import { useTelephonyStore } from "../../store/telephonyStore";
import "./telephonyFloatingWidget.css";

/**
 * TelephonyStandaloneWorkspace: Dedicated visual workbench & proof harness for Telephony.
 * Mounts full production IncomingCallPopup, TelephonyFloatingWidget, Dialer Modal, and CallAudioPlayer.
 */
export function TelephonyStandaloneWorkspace() {
	const triggerIncomingCall = useTelephonyStore((s) => s.triggerIncomingCall);
	const [isDialerModalOpen, setIsDialerModalOpen] = useState(false);

	useEffect(() => {
		const search = typeof window !== "undefined" ? window.location.search : "";
		const isDialerMode = search.includes("dialer=1") || search.includes("dialer=modal");

		if (isDialerMode) {
			setIsDialerModalOpen(true);
		}

		// Trigger incoming call with authentic clinical caller context
		triggerIncomingCall({
			phone: "+7 (916) 123-45-67",
			patientName: "Смирнова Елена Сергеевна",
			patientId: "pat-smirnova-01",
			provider: "mango",
			status: "ringing",
			callStartedAt: Date.now(),
		});
	}, [triggerIncomingCall]);

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] p-4 sm:p-6 flex flex-col gap-6"
			data-testid="telephony-standalone-workspace"
		>
			{/* Simulated TopBar strip with real IncomingCallPopup */}
			<header className="h-12 px-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between shadow-xs">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)] text-white flex items-center justify-center font-bold text-sm">
						D
					</div>
					<div>
						<div className="font-bold text-xs text-[var(--ink,#0f172a)]">DENTE • Стоматология</div>
						<div className="text-[10px] text-[var(--muted,#64748b)]">Телефония и коммуникации с пациентами</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setIsDialerModalOpen(true)}
						className="secondary-button text-xs"
					>
						<PhoneCall size={14} className="text-[var(--teal,#0d9488)]" />
						<span>Номеронабиратель</span>
					</button>
				</div>
			</header>

			{/* Main Workspace Stage */}
			<div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
				{/* Audio Player Showcase */}
				<div className="p-4 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] shadow-sm space-y-4">
					<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
						<Volume2 size={16} className="text-[var(--teal,#0d9488)]" />
						<span>Плеер записи звонка АТС (DENTE Clinical Audio)</span>
					</div>

					<div className="space-y-3">
						<div className="text-xs font-semibold text-[var(--ink,#0f172a)]">1. Состояние: «Запись обрабатывается АТС» (Zero-Mock empty state)</div>
						<CallAudioPlayer recordingUrl="" />

						<div className="text-xs font-semibold text-[var(--ink,#0f172a)] pt-2">2. Состояние: Готовая аудиодорожка разговора</div>
						<CallAudioPlayer
							recordingUrl="https://actions.google.com/sounds/v1/telephones/ring_tone.ogg"
							durationSeconds={75}
							transcript={[
								{ speaker: "patient", text: "Здравствуйте, можно записаться на приём?", startTimeSeconds: 2, endTimeSeconds: 6, confidence: 0.95, sentiment: "neutral" },
								{ speaker: "operator", text: "Добрый день! Да, конечно. К какому специалисту?", startTimeSeconds: 7, endTimeSeconds: 11, confidence: 0.98, sentiment: "neutral" },
							]}
						/>
					</div>
				</div>

				{/* Telephony Context & Invariants */}
				<div className="p-4 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-3 text-xs">
					<div className="flex items-center gap-2 font-bold text-[var(--ink,#0f172a)]">
						<Headphones size={16} className="text-[var(--teal,#0d9488)]" />
						<span>Клинические инварианты телефонии DENTE (Мандаты 8d, 8e, 8n)</span>
					</div>
					<ul className="space-y-1.5 text-[var(--muted,#64748b)] list-disc pl-4">
						<li><strong>Miller's Law (2 кнопки):</strong> Только «Записать на приём» (.primary-button) и «Открыть карту» (.secondary-button).</li>
						<li><strong>Doctor Sterile Zone:</strong> Приём врача защищен от блокирующих оверлеев.</li>
						<li><strong>Канонические кнопки DENTE:</strong> Высота 36px на десктопе, 44px на тач-экранах, токены var(--teal), var(--paper), var(--ink).</li>
						<li><strong>Zero-Mock АТС:</strong> Чистое состояние «Запись обрабатывается АТС» без фейковых аудио-генераторов.</li>
					</ul>
				</div>
			</div>

			{/* Full Live Production Telephony Overlay Layer */}
			<IncomingCallPopup defaultExpanded={true} />
			<TelephonyFloatingWidget defaultExpanded={true} />

			{/* Softphone Dialer Modal */}
			<TelephonyDialerModal
				isOpen={isDialerModalOpen}
				onClose={() => setIsDialerModalOpen(false)}
				initialPhone="+7 (916) 123-45-67"
			/>
		</div>
	);
}
