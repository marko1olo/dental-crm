/**
 * apps/web/src/components/visit/intakeCockpitModules/IntakeQueueListColumn.tsx
 *
 * Левая колонка очереди пациентов на приём для VisitIntakeCockpit.
 */

import React from "react";
import {
	ArrowRight,
	Calendar,
	CheckCircle2,
	Clock,
	Heart,
	Phone,
	ShieldAlert,
} from "lucide-react";
import { getSomaticBadgeInfo } from "../../../utils/somaticNorm";
import type { Appointment } from "@dental/shared";
import type { IntakeDoctorInfo, IntakePatientExtended } from "./intakeCockpitTypes";

export const QUEUE_STATUS_META: Record<
	string,
	{ label: string; badgeClass: string; dotColor: string; priority: number }
> = {
	in_progress: {
		label: "В кресле (идёт приём)",
		badgeClass:
			"bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
		dotColor: "#10b981",
		priority: 1,
	},
	checked_in: {
		label: "Ожидает в холле",
		badgeClass:
			"bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
		dotColor: "#f59e0b",
		priority: 2,
	},
	arrived: {
		label: "Ожидает в холле",
		badgeClass:
			"bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
		dotColor: "#f59e0b",
		priority: 2,
	},
	confirmed: {
		label: "Подтверждён",
		badgeClass:
			"bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30",
		dotColor: "#0d9488",
		priority: 3,
	},
	scheduled: {
		label: "Записан по плану",
		badgeClass:
			"bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/25",
		dotColor: "#64748b",
		priority: 4,
	},
	completed: {
		label: "Приём завершён",
		badgeClass:
			"bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20",
		dotColor: "#94a3b8",
		priority: 5,
	},
};

export function formatQueueTime(isoStr?: string | null): string {
	if (!isoStr) return "—:—";
	try {
		const d = new Date(isoStr);
		if (Number.isNaN(d.getTime())) return "—:—";
		return d.toLocaleTimeString("ru-RU", {
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return "—:—";
	}
}

export function calculatePatientAge(birthDate?: string | null): string | null {
	if (!birthDate) return null;
	try {
		const dob = new Date(birthDate);
		if (Number.isNaN(dob.getTime())) return null;
		const years = Math.floor(
			(Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000),
		);
		if (years < 0 || years > 120) return null;
		const mod10 = years % 10;
		const mod100 = years % 100;
		let suffix = "лет";
		if (mod100 < 11 || mod100 > 14) {
			if (mod10 === 1) suffix = "год";
			else if (mod10 >= 2 && mod10 <= 4) suffix = "года";
		}
		return `${years} ${suffix}`;
	} catch {
		return null;
	}
}

export function formatQueueCabinet(
	room?: string | null,
	chairId?: string | null,
): string {
	if (room && !room.includes("-")) return room;
	if (chairId) {
		const match = chairId.match(/(\d+)$/);
		if (match && match[1]) {
			const num = parseInt(match[1], 10);
			if (!Number.isNaN(num) && num > 0) return String(num);
		}
	}
	return "1";
}

export interface EnrichedQueueItem {
	readonly apt: Appointment;
	readonly patient?: IntakePatientExtended | undefined;
	readonly statusMeta: {
		label: string;
		badgeClass: string;
		dotColor: string;
		priority: number;
	};
}

export interface IntakeQueueListColumnProps {
	readonly todayQueue: readonly EnrichedQueueItem[];
	readonly queueFilter: "all" | "waiting" | "my_doctor";
	readonly setQueueFilter: (val: "all" | "waiting" | "my_doctor") => void;
	readonly activeDoctor?: IntakeDoctorInfo | null | undefined;
	readonly onSelectPatient: (patientId: string, appointmentId?: string) => void;
}

export function IntakeQueueListColumn({
	todayQueue,
	queueFilter,
	setQueueFilter,
	activeDoctor,
	onSelectPatient,
}: IntakeQueueListColumnProps) {
	return (
		<div className="xl:col-span-7 flex flex-col gap-3">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[var(--line)]">
				<div className="flex items-center gap-2">
					<Calendar size={16} className="text-[var(--teal)] shrink-0" />
					<h3 className="m-0 text-sm font-extrabold text-[var(--ink)]">
						Очередь пациентов на приём ({todayQueue.length})
					</h3>
				</div>

				<div
					className="inline-flex items-center gap-1 p-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] self-start sm:self-auto"
					role="tablist"
				>
					{[
						{ id: "all", label: "Все визиты" },
						{ id: "waiting", label: "В очереди / В кресле" },
						...(activeDoctor
							? [{ id: "my_doctor", label: "Мои пациенты" }]
							: []),
					].map((tab) => {
						const isActive = queueFilter === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								role="tab"
								aria-selected={isActive}
								onClick={() =>
									setQueueFilter(tab.id as "all" | "waiting" | "my_doctor")
								}
								className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
									isActive
										? "bg-[var(--paper)] text-[var(--teal)] border-[var(--line)] shadow-xs font-bold"
										: "text-[var(--muted)] hover:text-[var(--ink)] border-transparent hover:bg-[var(--surface-hover)]"
								}`}
							>
								{tab.label}
							</button>
						);
					})}
				</div>
			</div>

			{todayQueue.length === 0 ? (
				<div className="p-6 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--paper-soft)]/40 text-center space-y-2">
					<Clock size={24} className="mx-auto text-[var(--muted)]" />
					<div className="text-sm font-bold text-[var(--ink)]">
						По выбранному фильтру записей в очереди нет
					</div>
					<p className="text-xs text-[var(--muted)] max-w-md mx-auto m-0">
						Выберите пациента из картотеки справа для открытия приёма, либо
						переключите фильтр очереди на «Все визиты».
					</p>
				</div>
			) : (
				<div className="space-y-2.5" data-testid="visit-intake-queue-list">
					{todayQueue.slice(0, 8).map(({ apt, patient, statusMeta }) => {
						const fullName = patient?.fullName || "Пациент клиники";
						const ageText = calculatePatientAge(patient?.birthDate);
						const somaticInfo = getSomaticBadgeInfo(
							patient?.allergies,
							patient?.medicalFlags || patient?.chronicDiseases,
						);

						return (
							<div
								key={apt.id}
								className="group p-3.5 rounded-xl bg-[var(--paper-soft)]/60 hover:bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--teal)]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
								data-testid={`visit-queue-card-${apt.id}`}
							>
								<div className="flex items-start gap-3 min-w-0">
									<div className="w-16 px-2 py-1.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-center shrink-0">
										<div className="text-xs font-black text-[var(--ink)] font-mono">
											{formatQueueTime(apt.startsAt)}
										</div>
										<div className="text-[10px] text-[var(--muted)] font-medium truncate">
											Каб. {formatQueueCabinet((apt as any).room, apt.chairId)}
										</div>
									</div>

									<div className="min-w-0 space-y-1">
										<div className="flex flex-wrap items-center gap-1.5">
											<span className="text-sm font-extrabold text-[var(--ink)] truncate">
												{fullName}
											</span>
											{ageText && (
												<span className="text-xs text-[var(--muted)] font-medium">
													• {ageText}
												</span>
											)}
											<span
												className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.badgeClass}`}
											>
												<span
													className="w-1.5 h-1.5 rounded-full"
													style={{
														backgroundColor: statusMeta.dotColor,
													}}
												/>
												{statusMeta.label}
											</span>
										</div>

										<div className="text-xs text-[var(--muted)] flex flex-wrap items-center gap-x-3 gap-y-1">
											<span className="font-semibold text-[var(--ink)]/80">
												{apt.reason || "Плановый осмотр и консультация"}
											</span>
											{patient?.phone && (
												<span className="inline-flex items-center gap-1 font-mono text-[11px]">
													<Phone size={11} />
													{patient.phone}
												</span>
											)}
										</div>

										<div className="flex flex-wrap items-center gap-1.5 pt-0.5">
											{somaticInfo.hasAllergy ? (
												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/12 text-rose-700 dark:text-rose-300 border border-rose-500/30">
													<ShieldAlert size={11} />
													Аллергия: {somaticInfo.allergyLabel}
												</span>
											) : (
												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
													<CheckCircle2 size={11} />
													Соматически здоров
												</span>
											)}
											{somaticInfo.hasSomaticWarning && (
												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
													<Heart size={11} />
													{somaticInfo.somaticLabel}
												</span>
											)}
										</div>
									</div>
								</div>

								<div className="flex items-center justify-end gap-2 shrink-0">
									<button
										type="button"
										onClick={() => onSelectPatient(apt.patientId || "", apt.id)}
										className="primary-button min-h-[36px] h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
										data-testid={`btn-start-visit-apt-${apt.id}`}
									>
										<span>
											{apt.status === "in_treatment"
												? "Вернуться в приём"
												: "Начать приём"}
										</span>
										<ArrowRight size={14} className="shrink-0" />
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
