import React, { useRef, useState } from "react";
import { Headphones, PhoneCall, PhoneOff, Volume2, VolumeX, X } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { useTelephonyStore, formatDurationTimer } from "../../../store/telephonyStore";
import { TelephonyPopoverDialer } from "./TelephonyPopoverDialer";
import { TelephonyPopoverHistory } from "./TelephonyPopoverHistory";
import { initiateOutboundCall } from "../initiateOutboundCall";

const AGENT_STATES = [
	{ id: "online" as const, label: "Онлайн", dot: "bg-emerald-500", active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40" },
	{ id: "dnd" as const, label: "Занят", dot: "bg-rose-500", active: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40" },
	{ id: "pause" as const, label: "Пауза", dot: "bg-amber-500", active: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40" },
];

export interface TelephonySoftphonePopoverProps {
	onClose: () => void;
	isMobile?: boolean;
}

export function TelephonySoftphonePopover({ onClose, isMobile }: TelephonySoftphonePopoverProps): React.JSX.Element {
	const tel = useTelephonyStore();
	const [activeTab, setActiveTab] = useState<"dialer" | "history">("dialer");
	const [dialNumber, setDialNumber] = useState("");
	const dialInputRef = useRef<HTMLInputElement | null>(null);

	const handleStartCall = (phone: string) => {
		void initiateOutboundCall({ phone, patientName: "Исходящий звонок" });
		showToast(`Набор номера: ${phone}`, "info");
	};

	const containerClass = isMobile
		? "fixed inset-x-0 bottom-0 rounded-t-[24px] bg-[var(--paper-strong)] border-t border-[var(--line-strong)] shadow-2xl z-[99990] p-4 flex flex-col gap-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] animate-in slide-in-from-bottom duration-200"
		: "absolute right-0 top-full mt-2 w-84 sm:w-92 rounded-2xl bg-[var(--paper-strong)] border border-[var(--line-strong)] shadow-2xl backdrop-blur-xl p-3 z-50 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150";

	return (
		<div
			className={containerClass}
			role="dialog"
			aria-label="Софтфон телефонии"
			data-testid="telephony-softphone-popover"
			data-telephony-softphone-popover="true"
		>
			{isMobile && <div className="w-10 h-1.5 rounded-full bg-[var(--line)] mx-auto -mt-1 mb-1" />}
			<div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--line)]">
				<div className="flex items-center gap-1.5">
					<Headphones size={15} className="text-[var(--teal)]" />
					<span className="text-xs font-bold text-[var(--ink)]">Mango PBX · Л{tel.activeLineId}</span>
				</div>
				<div className="flex items-center gap-1">
					<button type="button" onClick={() => tel.switchLine(tel.activeLineId === 1 ? 2 : 1)} className="min-h-[44px] min-w-[44px] sm:min-h-[30px] sm:min-w-[30px] px-2 py-0.5 rounded-lg border border-[var(--line)] text-[11px] font-mono hover:bg-[var(--paper-soft)] cursor-pointer" title="Переключить линию">
						Л{tel.activeLineId}
					</button>
					<button type="button" onClick={tel.toggleMute} className="min-h-[44px] min-w-[44px] sm:min-h-[30px] sm:min-w-[30px] p-1 rounded-lg border border-[var(--line)] flex items-center justify-center hover:bg-[var(--paper-soft)] cursor-pointer" title={tel.isMuted ? "Включить звук" : "Выключить звук"}>
						{tel.isMuted ? <VolumeX size={14} className="text-rose-500" /> : <Volume2 size={14} />}
					</button>
					<button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] sm:min-h-[30px] sm:min-w-[30px] p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-[var(--muted)] hover:text-rose-600 flex items-center justify-center cursor-pointer" title="Закрыть софтфон" aria-label="Закрыть">
						<X size={16} />
					</button>
				</div>
			</div>

			<div className="grid grid-cols-3 gap-1">
				{AGENT_STATES.map((st) => (
					<button key={st.id} type="button" onClick={() => tel.setAgentState(st.id)} className={`min-h-[44px] sm:min-h-[32px] px-2 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${tel.agentState === st.id ? st.active : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"}`}>
						<span className={`w-2 h-2 rounded-full ${st.dot}`} />
						<span>{st.label}</span>
					</button>
				))}
			</div>

			{tel.activeCall && (
				<div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between gap-2">
					<div className="min-w-0">
						<p className="text-xs font-bold text-[var(--ink)] truncate">{tel.activeCall.patientName || tel.activeCall.phone}</p>
						<p className="text-[11px] font-mono text-[var(--teal)] font-bold">{formatDurationTimer(Math.floor((Date.now() - (tel.activeCall.callStartedAt || Date.now())) / 1000))}</p>
					</div>
					<button type="button" onClick={() => { tel.rejectCall(); showToast("Вызов завершен", "info"); }} className="min-h-[44px] sm:min-h-[32px] px-2.5 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer" title="Завершить вызов">
						<PhoneOff size={13} /><span>Сброс</span>
					</button>
				</div>
			)}

			<div className="flex border-b border-[var(--line)]">
				<button type="button" onClick={() => setActiveTab("dialer")} className={`flex-1 py-1.5 text-xs font-bold text-center border-b-2 cursor-pointer transition-colors ${activeTab === "dialer" ? "border-[var(--teal)] text-[var(--teal)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}>
					Набор
				</button>
				<button type="button" onClick={() => setActiveTab("history")} className={`flex-1 py-1.5 text-xs font-bold text-center border-b-2 cursor-pointer transition-colors ${activeTab === "history" ? "border-[var(--teal)] text-[var(--teal)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}>
					Журнал ({tel.callHistory.length})
				</button>
			</div>

			{activeTab === "dialer" ? (
				<TelephonyPopoverDialer dialNumber={dialNumber} onDialNumberChange={setDialNumber} onStartCall={handleStartCall} dialInputRef={dialInputRef} />
			) : (
				<TelephonyPopoverHistory history={tel.callHistory} onRedial={(p) => { setDialNumber(p); setActiveTab("dialer"); }} onOpenDrawer={() => { tel.openCallDrawer(); onClose(); }} />
			)}
		</div>
	);
}
