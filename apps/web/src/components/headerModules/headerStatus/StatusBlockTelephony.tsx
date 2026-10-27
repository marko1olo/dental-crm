/**
 * @file StatusBlockTelephony.tsx
 * @description Telephony status and call management block (Mandate 8b <= 120 lines).
 */

import React from "react";
import { Headphones, PhoneCall, Volume2, VolumeX } from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import type { StatusBlockTelephonyProps } from "./headerStatusTypes.js";

const AGENT_STATES = [
	{ id: "online" as const, label: "Онлайн", color: "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500" },
	{ id: "dnd" as const, label: "Занят", color: "text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800", dot: "bg-rose-500" },
	{ id: "pause" as const, label: "Пауза", color: "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800", dot: "bg-amber-500" },
];

export function StatusBlockTelephony({ status, onClose }: StatusBlockTelephonyProps) {
	const { agentState, setAgentState, activeLineId, switchLine, isMuted, toggleMute } = status;

	return (
		<div className="dnt-cc-section">
			<div className="dnt-cc-section-header">
				<span className="dnt-cc-section-title">
					<Headphones size={13} className="text-[var(--teal)]" />
					<span>SIP Телефония (АТС)</span>
				</span>
				<span className="text-[10px] font-mono text-[var(--muted,#475569)]">
					Mango PBX · Л{activeLineId}
				</span>
			</div>

			{/* Agent state selector */}
			<div className="grid grid-cols-3 gap-1.5 mb-2.5">
				{AGENT_STATES.map((st) => (
					<button
						key={st.id}
						type="button"
						onClick={() => setAgentState(st.id)}
						className={`min-h-[44px] py-1.5 px-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
							agentState === st.id
								? `${st.color} shadow-xs`
								: "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#475569)] border-[var(--line,#e2e8f0)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						<span className={`w-2 h-2 rounded-full ${st.dot}`} />
						<span>{st.label}</span>
					</button>
				))}
			</div>

			{/* Telephony Controls */}
			<div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line,#e2e8f0)]">
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={() => switchLine(activeLineId === 1 ? 2 : 1)}
						className="dnt-cc-btn dnt-cc-btn--secondary !min-h-[44px] !px-2.5 text-xs font-mono"
						title="Переключить телефонную линию"
					>
						Линия: Л{activeLineId}
					</button>

					<button
						type="button"
						onClick={toggleMute}
						className="dnt-cc-btn dnt-cc-btn--secondary !min-h-[44px] !min-w-[44px] !p-2"
						title={isMuted ? "Включить звонок" : "Выключить звонок"}
						aria-label={isMuted ? "Включить звонок" : "Выключить звонок"}
					>
						{isMuted ? <VolumeX size={16} className="text-rose-500" /> : <Volume2 size={16} />}
					</button>
				</div>

				<button
					type="button"
					onClick={() => {
						onClose();
						showToast("Телефония Mango PBX активна и готова к приему вызовов", "info");
					}}
					className="dnt-cc-btn dnt-cc-btn--secondary !min-h-[44px] text-xs"
					title="Телефония: Mango PBX подключена"
				>
					<PhoneCall size={14} className="text-emerald-500 shrink-0" />
					<span>Вызовы</span>
				</button>
			</div>
		</div>
	);
}
