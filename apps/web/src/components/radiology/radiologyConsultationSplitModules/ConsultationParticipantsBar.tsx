/**
 * DENTE CRM — Consultation Participants Bar Component (Layer 4)
 * Directed Acyclic Graph (DAG): Layer 4 (Presentation Subcomponent)
 * Displays active consilium physicians (surgeon, prosthodontist, radiologist),
 * real-time cursor sync status, and active teleconsultation session indicators.
 */

import React from "react";
import { Users, Wifi, Radio } from "lucide-react";
import type { ConsultationParticipant } from "./types.js";

export interface ConsultationParticipantsBarProps {
	readonly participants: readonly ConsultationParticipant[];
	readonly isSyncNav: boolean;
	readonly onToggleNotesPanel: () => void;
	readonly notesCount: number;
}

export const ConsultationParticipantsBar: React.FC<ConsultationParticipantsBarProps> = ({
	participants,
	isSyncNav,
	onToggleNotesPanel,
	notesCount,
}) => {
	return (
		<div
			data-testid="consultation-participants-bar"
			className="h-8 px-3 border-b border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs select-none"
		>
			{/* Left: Consilium participants chips */}
			<div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
				<div className="flex items-center gap-1.5 text-slate-400 font-medium text-[11px] pr-1.5 border-r border-slate-800">
					<Users className="w-3.5 h-3.5 text-teal-400" />
					<span>Консилиум ({participants.length}):</span>
				</div>

				{participants.map((p) => {
					const isOnline = p.status === "online";
					return (
						<div
							key={p.id}
							className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300"
							title={`${p.name} — ${p.roleLabel} (${isOnline ? "В сети" : "Синхронизация..."})`}
						>
							<span
								className="w-1.5 h-1.5 rounded-full"
								style={{ backgroundColor: p.color }}
							/>
							<span className="font-medium text-slate-200">{p.name}</span>
							<span className="text-[10px] text-slate-400 font-normal">({p.roleLabel})</span>
							{p.status === "syncing" && (
								<Radio className="w-2.5 h-2.5 text-amber-400 animate-pulse ml-0.5" />
							)}
						</div>
					);
				})}
			</div>

			{/* Right: Sync indicator and quick notes open button */}
			<div className="flex items-center gap-2.5 flex-shrink-0">
				<div
					className={`inline-flex items-center gap-1 text-[11px] font-mono ${
						isSyncNav ? "text-emerald-400" : "text-slate-400"
					}`}
					title={isSyncNav ? "Камеры и зум синхронизированы" : "Независимая навигация"}
				>
					<Wifi className="w-3 h-3" />
					<span>{isSyncNav ? "SYNC LIVE" : "INDEPENDENT"}</span>
				</div>

				<button
					type="button"
					onClick={onToggleNotesPanel}
					className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors"
					title="Открыть протокол и заметки консилиума"
				>
					<span>Заметки</span>
					{notesCount > 0 && (
						<span className="px-1 rounded-full text-[9px] bg-teal-600 text-white font-mono">
							{notesCount}
						</span>
					)}
				</button>
			</div>
		</div>
	);
};
