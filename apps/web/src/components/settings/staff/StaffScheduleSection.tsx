import { CalendarClock } from "lucide-react";

export function StaffScheduleSection({
	staff,
	staffRoleLabels,
	staffScheduleDrafts,
	staffScheduleDirtyIds,
	staffScheduleSavingId,
	staffScheduleSaveStates,
	updateStaffScheduleDraft,
	toggleStaffWorkingDay,
	saveStaffSchedule,
	typedWeekdayOptions,
}: {
	staff: any[];
	staffRoleLabels: Record<string, string>;
	staffScheduleDrafts: any;
	staffScheduleDirtyIds: any;
	staffScheduleSavingId: string | null;
	staffScheduleSaveStates: any;
	updateStaffScheduleDraft: (
		memberId: string,
		day: string,
		field: "start" | "end",
		value: string,
	) => void;
	toggleStaffWorkingDay: (memberId: string, day: string) => void;
	saveStaffSchedule: (memberId: string) => void;
	typedWeekdayOptions: any[];
}) {
	return (
		<section className="staff-section-card">
			<div className="staff-section-header">
				<div
					className="staff-section-icon"
					style={{
						background: "rgba(245, 158, 11, 0.1)",
						color: "var(--orange, #f59e0b)",
					}}
				>
					<CalendarClock size={24} />
				</div>
				<div className="staff-section-title">
					<h3>Шаблоны графиков работы</h3>
					<p>Настройте регулярные часы приема для каждого сотрудника</p>
				</div>
			</div>

			<div className="staff-schedules-list">
				{staff
					.filter((m: any) => m.active !== false)
					.map((member: any) => {
						const draft = staffScheduleDrafts?.[member.id];
						if (!draft) return null;
						const scheduleSaveState =
							staffScheduleSaveStates?.[member.id] ?? "saved";
						const isDirty = staffScheduleDirtyIds?.has(member.id);
						const isSaving =
							staffScheduleSavingId === member.id ||
							scheduleSaveState === "saving";

						const scheduleSaveLabel = isSaving
							? "Автосохранение"
							: scheduleSaveState === "error"
								? "Не сохранено"
								: isDirty
									? "Ждет автосохранения"
									: "Сохранено";

						return (
							<div className="schedule-member-row" key={member.id}>
								<div className="schedule-member-info">
									<div
										className="staff-avatar small"
										style={{
											backgroundColor: member.color || "var(--teal)",
										}}
									>
										{member.fullName.charAt(0).toUpperCase()}
									</div>
									<div>
										<strong>{member.fullName}</strong>
										<span>{staffRoleLabels?.[member.role] || member.role}</span>
									</div>
								</div>

								<div className="schedule-days-grid">
									{typedWeekdayOptions.map((wd: any) => {
										const dayDraft = draft[wd.key];
										if (!dayDraft) return null;
										return (
											<div
												className={
													"schedule-day-box" +
													(dayDraft.working ? " working" : " off")
												}
												key={wd.key}
											>
												<div className="day-header">
													<label className="checkbox-label">
														<input
															type="checkbox"
															checked={dayDraft.working}
															onChange={() =>
																toggleStaffWorkingDay(member.id, wd.key)
															}
														/>
														<strong>{wd.shortLabel}</strong>
													</label>
												</div>
												{dayDraft.working && (
													<div className="staff-day-hours">
														<input
															type="time"
															value={dayDraft.start}
															onChange={(e) =>
																updateStaffScheduleDraft(
																	member.id,
																	wd.key,
																	"start",
																	e.target.value,
																)
															}
														/>
														<span>-</span>
														<input
															type="time"
															value={dayDraft.end}
															onChange={(e) =>
																updateStaffScheduleDraft(
																	member.id,
																	wd.key,
																	"end",
																	e.target.value,
																)
															}
														/>
													</div>
												)}
											</div>
										);
									})}
								</div>

								<div className="staff-schedule-actions">
									<span className={`save-state save-state-${scheduleSaveState}`}>
										{scheduleSaveLabel}
									</span>
									<button
										className="primary-button compact"
										disabled={!isDirty || isSaving}
										onClick={() => saveStaffSchedule(member.id)}
									>
										{isSaving ? "Сохранение..." : "Сохранить"}
									</button>
								</div>
							</div>
						);
					})}
				{staff.filter((m: any) => m.active !== false).length === 0 && (
					<div className="empty-staff-state">
						<CalendarClock size={48} color="var(--border)" />
						<p>Нет активных сотрудников для настройки графика</p>
					</div>
				)}
			</div>
		</section>
	);
}
