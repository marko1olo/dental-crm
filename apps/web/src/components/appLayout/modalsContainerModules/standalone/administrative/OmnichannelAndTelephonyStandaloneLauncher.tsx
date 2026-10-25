/**
 * OmnichannelAndTelephonyStandaloneLauncher.tsx — Автономный лаунчер чата и карточки звонка.
 * Мандат 8b (<= 120 строк), Мандат 8aq (Монтирование в живой UI), Мандат 8e (Автономия персонала).
 */

import React, { useEffect } from "react";
import { OmnichannelChatView } from "../../../../omnichannel_chat/OmnichannelChatView";
import { IncomingCallPopup } from "../../../../telephony/IncomingCallPopup";
import { useTelephonyStore } from "../../../../../store/telephonyStore";
import { useAppStore } from "../../../../../store/appStore";

export function renderOmnichannelAndTelephonyLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	const isOmnichannel = s.includes("omnichannel") || h.includes("omnichannel");
	const isTelephony = s.includes("telephony") || h.includes("telephony");

	if (!isOmnichannel && !isTelephony) return null;

	if (isOmnichannel) {
		return (
			<div className="fixed inset-0 z-[99999] w-full h-screen min-h-screen p-2 sm:p-4 bg-[var(--paper)] text-[var(--ink)] box-border flex flex-col overflow-hidden">
				<OmnichannelChatView className="flex-1 w-full h-full" />
			</div>
		);
	}

	return <TelephonyStandaloneContainer />;
}

function TelephonyStandaloneContainer(): React.ReactElement {
	if (!useTelephonyStore.getState().activeCall) {
		useAppStore.getState().setSelectedWorkspaceRole("administrator");
		useAppStore.getState().setCurrentView("schedule");
		useTelephonyStore.setState({
			activeCall: {
				id: "call-demo-inbound-777",
				callId: "call-demo-inbound-777",
				phone: "+7 (999) 345-67-89",
				patientId: "pat-smirnova-77",
				patientName: "Смирнова Анна Сергеевна",
				provider: "asterisk",
				direction: "inbound",
				status: "ringing",
				callStartedAt: Date.now(),
			},
			isWsConnected: true,
			agentState: "online",
		});
	}

	useEffect(() => {
		const boots = document.querySelectorAll(".boot-state");
		boots.forEach((b) => b.remove());
	}, []);

	return (
		<div className="fixed inset-0 z-[9000] w-full h-screen min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col overflow-hidden font-sans" data-testid="telephony-standalone-root">
			<header className="h-14 px-4 border-b border-[var(--line)] bg-[var(--paper-card)] flex items-center justify-between shrink-0">
				<div className="flex items-center gap-3">
					<span className="font-black text-sm tracking-tight text-[var(--primary,#0d9488)]">DENTE CRM</span>
					<span className="text-xs text-[var(--muted)] border-l border-[var(--line)] pl-3">АРМ Администратора • Расписание приёмов</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">АТС Онлайн</span>
				</div>
			</header>

			<main className="flex-1 p-3 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--paper-subtle,var(--paper))] overflow-y-auto">
				<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-card)] shadow-xs flex flex-col gap-3">
					<div className="flex justify-between items-center border-b border-[var(--line-subtle,var(--line))] pb-2">
						<span className="font-bold text-xs">Кресло 1 • Д-р Соколов А.В. (Терапия)</span>
						<span className="text-[11px] text-[var(--muted)]">3 визита сегодня</span>
					</div>
					<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs flex justify-between items-center">
						<div><p className="font-bold">10:00 – 11:00 • Васильев П.К.</p><p className="text-[11px] text-[var(--muted)]">Лечение кариеса 2.6</p></div>
						<span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">Завершён</span>
					</div>
					<div className="p-2.5 rounded-xl border border-teal-500/30 bg-teal-500/5 text-xs flex justify-between items-center">
						<div><p className="font-bold">11:30 – 12:30 • Михайлова О.С.</p><p className="text-[11px] text-[var(--muted)]">Эндодонтия 1.4</p></div>
						<span className="text-teal-600 dark:text-teal-400 font-bold text-[11px]">На приёме</span>
					</div>
				</div>

				<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-card)] shadow-xs flex flex-col gap-3">
					<div className="flex justify-between items-center border-b border-[var(--line-subtle,var(--line))] pb-2">
						<span className="font-bold text-xs">Кресло 2 • Д-р Воронова Е.Н. (Ортопедия)</span>
						<span className="text-[11px] text-[var(--muted)]">2 визита сегодня</span>
					</div>
					<div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs flex justify-between items-center">
						<div><p className="font-bold">14:00 – 15:00 • Смирнова А.С.</p><p className="text-[11px] text-[var(--muted)]">Консультация ортопеда</p></div>
						<span className="text-amber-600 dark:text-amber-400 font-bold text-[11px]">Ожидается</span>
					</div>
				</div>
			</main>

			<IncomingCallPopup defaultExpanded={true} />
		</div>
	);
}

export const DirectOmnichannelStandaloneLauncher: React.FC = () => {
	return renderOmnichannelAndTelephonyLauncher();
};
