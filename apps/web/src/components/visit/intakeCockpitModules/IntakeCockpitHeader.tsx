import React from "react";
import { Play, HeartPulse, UserCheck, UserPlus } from "lucide-react";
import type { IntakeDoctorInfo } from "./intakeCockpitTypes";

export interface IntakeCockpitHeaderProps {
	readonly activeDoctor?: IntakeDoctorInfo | null | undefined;
	readonly hasAppointments: boolean;
	readonly onStartNextInQueue: () => void;
	readonly isChairsideTriageOpen: boolean;
	readonly onToggleChairsideTriage: () => void;
	readonly onEmergencyIntake?: (() => void) | undefined;
}

export function IntakeCockpitHeader({
	activeDoctor,
	hasAppointments,
	onStartNextInQueue,
	isChairsideTriageOpen,
	onToggleChairsideTriage,
	onEmergencyIntake,
}: IntakeCockpitHeaderProps) {
	return (
		<header className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
			<div className="flex items-center gap-3">
				<div className="w-11 h-11 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
					<UserCheck size={24} />
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h1 className="m-0 text-base sm:text-lg font-bold text-[var(--ink)]">
							Клинический приём пациентов
						</h1>
						<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]">
							Медицинская карта
						</span>
					</div>
					<p className="m-0 text-xs text-[var(--muted)]">
						{activeDoctor?.fullName
							? `Дежурный врач: ${activeDoctor.fullName}`
							: "Выберите пациента из очереди смены или найдите карту в архиве"}
					</p>
				</div>
			</div>

			{/* Быстрые действия дежурного врача */}
			<div className="flex items-center gap-2 flex-wrap">
				{hasAppointments && (
					<button
						type="button"
						onClick={onStartNextInQueue}
						id="btn-intake-start-next"
						className="min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[var(--brand)] hover:opacity-95 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
					>
						<Play size={15} fill="currentColor" />
						<span>Пригласить следующего</span>
					</button>
				)}

				<button
					type="button"
					onClick={onToggleChairsideTriage}
					className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
						isChairsideTriageOpen
							? "bg-[var(--brand)] text-white border-[var(--brand)]"
							: "bg-[var(--paper-soft)] hover:bg-[var(--surface-hover)] text-[var(--ink)] border-[var(--line)]"
					}`}
					data-testid="btn-toggle-chairside-triage"
				>
					<HeartPulse size={15} />
					<span>{isChairsideTriageOpen ? "Скрыть триаж" : "Триаж: АД и аллергии"}</span>
				</button>

				{onEmergencyIntake && (
					<button
						type="button"
						onClick={onEmergencyIntake}
						className="min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer inline-flex items-center gap-1.5"
						data-testid="btn-intake-cito-emergency"
					>
						<UserPlus size={15} />
						<span>+ Острая боль (CITO)</span>
					</button>
				)}
			</div>
		</header>
	);
}
