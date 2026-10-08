import type { Appointment, Dashboard } from "@dental/shared";
import { AlertTriangle, Calendar, Clock, FlaskConical } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast";
import { formatDoctorShortName, type ChairDoctorShiftAssignment } from "../ScheduleGrid";
import { resolveChairDutyDoctor } from "../QuickBookingDrawer";
import { DURATION_PRESETS } from "./constants";
import type { TextFieldChangeEvent } from "./types";

export interface DoctorChairTimeStepProps {
	dashboard: Dashboard;
	appointmentLabels: Record<Appointment["status"], string>;
	// biome-ignore lint/suspicious/noExplicitAny: draft payload
	newAppointmentDraft: Record<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: draft updater
	updateNewAppointmentDraft: (key: any, value: any) => void;
	toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	clinicTimezone: string | undefined;
	useManualSelects: boolean;
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: lab orders
	activeLabOrders: any[];
	currentDurationMinutes: number;
	applyDuration: (minutes: number) => void;
}

export function DoctorChairTimeStep(props: DoctorChairTimeStepProps) {
	const {
		dashboard,
		appointmentLabels,
		newAppointmentDraft,
		updateNewAppointmentDraft,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
		clinicTimezone,
		useManualSelects,
		chairDoctorAssignments,
		activeLabOrders,
		currentDurationMinutes,
		applyDuration,
	} = props;

	return (
		<>
			{/* Active Lab Orders notification & Due Date Sync */}
			{activeLabOrders.length > 0 && (
				<div className="mb-4 space-y-2">
					{/* biome-ignore lint/suspicious/noExplicitAny: lab order record */}
					{activeLabOrders.map((lo: any) => {
						const hasDue = Boolean(lo.dueDate);
						const dueDateObj = hasDue ? new Date(lo.dueDate) : null;
						const isBeforeLab =
							dueDateObj &&
							newAppointmentDraft.startsAt &&
							new Date(newAppointmentDraft.startsAt).getTime() < dueDateObj.getTime();

						return (
							<div
								key={lo.id}
								className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm transition-all ${
									isBeforeLab
										? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300"
										: "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal)]/20 text-[var(--ink)]"
								}`}
							>
								<div className="space-y-0.5">
									<div className="font-bold flex items-center gap-1.5 flex-wrap">
										<FlaskConical className="w-4 h-4 text-[var(--teal)] shrink-0" />
										<span>Наряд ЗТЛ: {lo.material || "Ортопедия"} (Зуб {lo.toothFdi || "—"})</span>
										<span className="px-1.5 py-0.5 rounded bg-[var(--paper)] text-[10px] font-bold uppercase border border-[var(--line)]">
											{lo.status}
										</span>
									</div>
									{hasDue && (
										<div className="text-[11px] text-[var(--muted)]">
											Срок готовности:{" "}
											<strong className="text-[var(--ink)]">
												{dueDateObj?.toLocaleDateString("ru-RU")}
											</strong>
											{isBeforeLab && (
												<span className="text-amber-600 dark:text-amber-400 font-bold ml-1 inline-flex items-center gap-1">
													<AlertTriangle size={11} className="shrink-0" />
													<span>(прием раньше готовности ЗТЛ)</span>
												</span>
											)}
										</div>
									)}
								</div>

								{hasDue && (
									<button
										type="button"
										onClick={() => {
											if (dueDateObj) {
												const targetIso = dueDateObj.toISOString();
												const endIso = new Date(
													dueDateObj.getTime() + 60 * 60 * 1000,
												).toISOString();
												updateNewAppointmentDraft("startsAt", targetIso);
												updateNewAppointmentDraft("endsAt", endIso);
												if (!newAppointmentDraft.reason) {
													updateNewAppointmentDraft(
														"reason",
														`Установка конструкции ЗТЛ (зуб ${lo.toothFdi || "ортопедия"})`,
													);
												}
												showToast(
													`Дата приема выставлена на готовность ЗТЛ: ${dueDateObj.toLocaleDateString("ru-RU")}`,
													"success",
												);
											}
										}}
										className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg bg-[var(--teal)] text-white hover:opacity-90 font-bold text-xs inline-flex items-center gap-1 shrink-0 cursor-pointer shadow-sm transition-all"
										title="Синхронизировать время приема со сроком готовности наряда ЗТЛ"
									>
										<Calendar className="w-3.5 h-3.5" />
										На дату ЗТЛ
									</button>
								)}
							</div>
						);
					})}
				</div>
			)}

			<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-3">
				<label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
					Начало
					<input
						type="datetime-local"
						value={toDateTimeLocalValue(
							newAppointmentDraft.startsAt,
							clinicTimezone,
						)}
						onChange={(event: TextFieldChangeEvent) => {
							const nextStartsAt = fromDateTimeLocalValue(
								event.target.value,
								clinicTimezone,
							);
							updateNewAppointmentDraft("startsAt", nextStartsAt);
							if (newAppointmentDraft.chairId && nextStartsAt) {
								const duty = resolveChairDutyDoctor(
									newAppointmentDraft.chairId,
									nextStartsAt,
									chairDoctorAssignments,
									String(nextStartsAt).slice(0, 10),
								);
								if (duty.doctorId) {
									updateNewAppointmentDraft("doctorUserId", duty.doctorId);
								}
							}
						}}
						className="min-h-[44px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none w-full"
					/>
				</label>
				<label className="flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
					Окончание
					<input
						type="datetime-local"
						value={toDateTimeLocalValue(
							newAppointmentDraft.endsAt,
							clinicTimezone,
						)}
						onChange={(event: TextFieldChangeEvent) =>
							updateNewAppointmentDraft(
								"endsAt",
								fromDateTimeLocalValue(
									event.target.value,
									clinicTimezone,
								),
							)
						}
						className="min-h-[44px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none w-full"
					/>
				</label>
			</div>

			{/* Панель быстрой длительности приёма */}
			<div className="mb-4 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)]" data-testid="appointment-quick-durations-panel">
				<div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
					<span className="text-xs font-semibold text-[var(--muted)] flex items-center gap-1.5">
						<Clock size={14} className="text-[var(--teal)] shrink-0" />
						<span>Быстрая длительность приёма:</span>
					</span>
					{currentDurationMinutes > 0 && (
						<span className="text-xs font-mono font-bold text-[var(--teal)]">
							{currentDurationMinutes} мин
							{currentDurationMinutes >= 60
								? ` (${Math.floor(currentDurationMinutes / 60)} ч${currentDurationMinutes % 60 ? ` ${currentDurationMinutes % 60} мин` : ""})`
								: ""}
						</span>
					)}
				</div>
				<div className="flex items-center gap-1.5 flex-wrap" data-testid="appointment-quick-durations">
					{DURATION_PRESETS.map((mins) => (
						<button
							key={mins}
							type="button"
							data-testid={`quick-duration-${mins}`}
							onClick={() => applyDuration(mins)}
							className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-1 transition-all cursor-pointer ${
								currentDurationMinutes === mins
									? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
									: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--paper)]"
							}`}
						>
							<span>+{mins} мин</span>
						</button>
					))}
				</div>
			</div>

			<div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6 mb-4">
				<div>
					<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
						Врач
					</span>
					{useManualSelects ? (
						<select
							data-testid="new-appointment-doctor-select"
							value={newAppointmentDraft.doctorUserId || ""}
							onChange={(e) =>
								updateNewAppointmentDraft("doctorUserId", e.target.value)
							}
							className="w-full min-h-[44px] p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none"
						>
							<option value="">-- Выберите врача --</option>
							{(dashboard.clinicSettings?.staff ?? [])
								.filter(
									(m) =>
										m.active && (m.role === "doctor" || m.role === "owner"),
								)
								.map((m) => (
									<option key={m.id} value={m.id}>
										{m.fullName}
									</option>
								))}
						</select>
					) : (
						<div className="flex flex-wrap gap-1.5">
							{(dashboard.clinicSettings?.staff ?? [])
								.filter(
									(member) =>
										member.active &&
										(member.role === "doctor" || member.role === "owner"),
								)
								.map((member) => (
									<button
										key={member.id}
										type="button"
										className={`quick-chip ${newAppointmentDraft.doctorUserId === member.id ? "active" : ""}`}
										onClick={() =>
											updateNewAppointmentDraft("doctorUserId", member.id)
										}
									>
										{member.fullName}
									</button>
								))}
						</div>
					)}
				</div>

				{dashboard.clinicSettings?.profile?.mode !== "one_chair" &&
					(dashboard.clinicSettings?.staff ?? []).some(
						(m) => m.active && m.role === "assistant",
					) && (
					<div>
						<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
							Ассистент (опционально)
						</span>
						<div className="flex flex-wrap gap-1.5">
							<button
								type="button"
								className={`quick-chip ${!newAppointmentDraft.assistantUserId ? "active" : ""}`}
								onClick={() =>
									updateNewAppointmentDraft("assistantUserId", "")
								}
							>
								Без ассистента (соло-приём)
							</button>
							{(dashboard.clinicSettings?.staff ?? [])
								.filter(
									(member) => member.active && member.role === "assistant",
								)
								.map((member) => (
									<button
										key={member.id}
										type="button"
										className={`quick-chip ${newAppointmentDraft.assistantUserId === member.id ? "active" : ""}`}
										onClick={() =>
											updateNewAppointmentDraft(
												"assistantUserId",
												newAppointmentDraft.assistantUserId === member.id
													? ""
													: member.id,
											)
										}
									>
										{member.fullName}
									</button>
								))}
						</div>
					</div>
				)}

				<div>
					<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
						Кресло
					</span>
					<div className="flex flex-wrap gap-1.5">
						{(dashboard.clinicSettings?.chairs ?? [])
							.filter((chair) => chair.active)
							.map((chair) => (
								<button
									key={chair.id}
									type="button"
									className={`quick-chip ${newAppointmentDraft.chairId === chair.id ? "active" : ""}`}
									onClick={() => {
										updateNewAppointmentDraft("chairId", chair.id);
										const targetTime = newAppointmentDraft.startsAt;
										const staff = dashboard.clinicSettings?.staff ?? [];
										const activeDocs = staff.filter(
											(m) => m.active && (m.role === "doctor" || m.role === "owner"),
										);
										const duty = resolveChairDutyDoctor(
											chair.id,
											targetTime,
											chairDoctorAssignments,
											targetTime ? targetTime.slice(0, 10) : undefined,
											null,
											// biome-ignore lint/suspicious/noExplicitAny: defaultDoctorId fallback
											(chair as any)?.defaultDoctorId || (activeDocs.length === 1 && activeDocs[0] ? activeDocs[0].id : null),
										);
										if (duty.doctorId) {
											updateNewAppointmentDraft("doctorUserId", duty.doctorId);
											const doc = staff.find((s) => s.id === duty.doctorId);
											if (doc) {
												showToast(
													`Дежурный врач: ${formatDoctorShortName(doc.fullName)} (${chair.name}, ${duty.shiftHours})`,
													"info",
													3000,
												);
											}
										}
									}}
								>
									{chair.name}
								</button>
							))}
					</div>
				</div>

				<div>
					<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
						Статус
					</span>
					<div className="flex flex-wrap gap-1.5">
						{(
							Object.keys(appointmentLabels) as Appointment["status"][]
						).map((status) => (
							<button
								key={status}
								type="button"
								className={`quick-chip ${newAppointmentDraft.status === status ? "active" : ""}`}
								onClick={() => updateNewAppointmentDraft("status", status)}
							>
								{appointmentLabels[status]}
							</button>
						))}
					</div>
				</div>
			</div>
		</>
	);
}
