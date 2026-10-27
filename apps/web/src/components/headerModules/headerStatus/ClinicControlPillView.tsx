/**
 * @file ClinicControlPillView.tsx
 * @description Compact 3-sensor status capsule for Header (Mandate 8b <= 120 lines).
 */

import React from "react";
import { ChevronDown, Phone, PhoneCall, ShieldCheck, Zap } from "lucide-react";
import type { ClinicControlPillViewProps } from "./headerStatusTypes.js";

export function ClinicControlPillView({
	isOpen,
	status,
	onToggleOpen,
	className = "",
}: ClinicControlPillViewProps) {
	const {
		isOnline, syncLatencyMs, isSyncing, pendingMutationCount, l2PatientSnapshotsCount,
		isShiftOpen, formattedShiftTime, activeCall, agentState, agentStateLabel,
	} = status;

	return (
		<button
			type="button"
			onClick={onToggleOpen}
			className={`dnt-clinic-control-pill h-8 min-h-[32px] max-h-8 ${isOpen ? "dnt-clinic-control-pill--open" : ""} ${className}`}
			aria-expanded={isOpen}
			aria-label="Пульт управления клиникой (macOS Control Center)"
			title="Открыть центр управления статусом клиники"
			data-testid="clinic-control-center-trigger"
		>
			{/* 1. PBX / Telephony indicator */}
			<span
				className="dnt-pill-segment"
				title={`АТС: Mango PBX — ${activeCall ? "Идет разговор" : `Статус: ${agentStateLabel}`}`}
			>
				{activeCall ? (
					<PhoneCall size={12} className="text-emerald-500 animate-bounce" />
				) : (
					<Phone size={12} className="opacity-80" />
				)}
				<span className="hidden 2xl:inline">АТС</span>
				{activeCall ? (
					<span className="hidden sm:inline-block px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500 text-white animate-pulse">
						Звонок
					</span>
				) : (
					<>
						<span
							className={`dnt-pill-dot ${
								agentState === "online"
									? "dnt-pill-dot--online"
									: agentState === "dnd"
										? "dnt-pill-dot--busy"
										: "dnt-pill-dot--pause"
							}`}
						/>
						<span className="hidden 2xl:inline text-[10px] opacity-90">{agentStateLabel}</span>
					</>
				)}
			</span>

			<span className="dnt-pill-divider hidden sm:block" />

			{/* 2. Cash / Shift Status */}
			<span
				className="dnt-pill-segment"
				title={`Касса: ККТ АТОЛ / Штрих-М Онлайн — ${isShiftOpen ? `Смена открыта (${formattedShiftTime})` : "Смена закрыта"}`}
			>
				<ShieldCheck size={12} className={isShiftOpen ? "text-emerald-500 shrink-0" : "text-amber-500 shrink-0"} />
				<span className="hidden 2xl:inline">Касса</span>
				<span className={`dnt-pill-dot ${isShiftOpen ? "dnt-pill-dot--online" : "dnt-pill-dot--pause"}`} />
				<span className="font-mono text-[10px] opacity-90 hidden 2xl:inline">
					{formattedShiftTime}
				</span>
			</span>

			<span className="dnt-pill-divider hidden sm:block" />

			{/* 3. Database Sync / Offline Queue */}
			<span
				className="dnt-pill-segment hidden sm:flex"
				title={`Синхронизация БД: PostgreSQL 18.4 (${syncLatencyMs !== null ? `${syncLatencyMs} ms` : "Офлайн"}, ${pendingMutationCount} в очереди)`}
			>
				<Zap
					size={12}
					className={`${isSyncing ? "animate-spin text-amber-400" : isOnline ? "text-emerald-500" : "text-rose-500"}`}
				/>
				<span className="hidden 2xl:inline">{isOnline ? "БД" : "Офлайн"}</span>
				<span
					className={`dnt-pill-dot ${isOnline ? (pendingMutationCount > 0 ? "dnt-pill-dot--busy" : "dnt-pill-dot--online") : "dnt-pill-dot--offline"}`}
				/>
				{isOnline && syncLatencyMs !== null && (
					<span className="font-mono text-[10px] opacity-80 hidden 2xl:inline">
						{syncLatencyMs}ms
					</span>
				)}
				{pendingMutationCount > 0 && (
					<span className="font-mono text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded ml-0.5">
						{pendingMutationCount}
					</span>
				)}
				<span
					className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 ml-0.5"
					title={`Офлайн-буфер сохранен локально (L2 IndexedDB, снимков: ${l2PatientSnapshotsCount})`}
					data-testid="header-l2-offline-buffer-badge"
				>
					<span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
					<span>L2</span>
				</span>
			</span>

			<ChevronDown
				size={12}
				className={`opacity-60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
			/>
		</button>
	);
}
