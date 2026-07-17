import type { StaffRole, DentalSpecialty } from "@dental/shared";
import { Plus, CalendarDays } from "lucide-react";
import React from "react";
import { useAppLogicContext } from "../../../../contexts/AppLogicContext";

export function InlineStepTeam() {
	const {
		newStaffName,
		setNewStaffName,
		newStaffRole,
		setNewStaffRole,
		staffRoleLabels,
		newStaffSpecialty,
		setNewStaffSpecialty,
		specialtyLabels,
		addStaffMember,
		newStaffReadyToCreate,
		onboardingStaffCreateGuidanceId,
		newChairName,
		setNewChairName,
		addChair,
		newChairReadyToCreate,
		onboardingChairCreateGuidanceId,
		dashboard,
		staffScheduleDrafts,
		staffScheduleDraftFromWorkingHours,
		staffScheduleSaveStates,
		staffScheduleDirtyIds,
		staffScheduleSavingId,
		updateStaffScheduleDraft,
		weekdayOptions,
		toggleStaffWorkingDay,
		saveStaffSchedule,
		chairScheduleDrafts,
		chairScheduleSaveStates,
		chairScheduleDirtyIds,
		chairScheduleSavingId,
		updateChairScheduleDraft,
		toggleChairWorkingDay,
		saveChairSchedule,
	} = useAppLogicContext();

	return (
		<div className="onboarding-panel">
			<div>
				<h3>Команда и кабинет</h3>
				<p>
					Сотрудники и кресла сразу попадают в серверное состояние, аудит
					и расписание.
				</p>
			</div>
			<div className="onboarding-form-grid">
				<label>
					Новый сотрудник
					<input
						value={newStaffName}
						onChange={(event) => setNewStaffName(event.target.value)}
					/>
				</label>
				<div
					className="role-picker form-span-2"
					aria-label="Роль нового сотрудника"
				>
					{(
						[
							"doctor",
							"administrator",
							"assistant",
							"manager",
						] as StaffRole[]
					).map((role) => (
						<button
							className={newStaffRole === role ? "active" : ""}
							key={role}
							type="button"
							aria-pressed={newStaffRole === role}
							onClick={() => setNewStaffRole(role)}
						>
							{staffRoleLabels[role]}
						</button>
					))}
				</div>
				{newStaffRole === "doctor" || newStaffRole === "assistant" ? (
					<div
						className="specialty-strip staff-specialty-picker form-span-2"
						aria-label="Специальность нового сотрудника"
					>
						{(Object.keys(specialtyLabels) as DentalSpecialty[]).map(
							(specialty) => (
								<button
									className={
										newStaffSpecialty === specialty ? "active" : ""
									}
									key={specialty}
									type="button"
									aria-pressed={newStaffSpecialty === specialty}
									onClick={() => setNewStaffSpecialty(specialty)}
								>
									{specialtyLabels[specialty]}
								</button>
							),
						)}
					</div>
				) : null}
				<button
					className="secondary-button"
					type="button"
					onClick={() => addStaffMember(newStaffRole)}
					aria-describedby={
						!newStaffReadyToCreate
							? onboardingStaffCreateGuidanceId
							: undefined
					}
					disabled={!newStaffReadyToCreate}
				>
					<Plus aria-hidden="true" /> Добавить сотрудника
				</button>
				{!newStaffReadyToCreate ? (
					<p
						className="quick-create-guidance form-span-2"
						id={onboardingStaffCreateGuidanceId}
						role="status"
						aria-live="polite"
					>
						Введите ФИО сотрудника, затем выберите роль.
					</p>
				) : null}
				<label>
					Кресло / кабинет
					<input
						value={newChairName}
						onChange={(event) => setNewChairName(event.target.value)}
					/>
				</label>
				<button
					className="secondary-button"
					type="button"
					onClick={addChair}
					aria-describedby={
						!newChairReadyToCreate
							? onboardingChairCreateGuidanceId
							: undefined
					}
					disabled={!newChairReadyToCreate}
				>
					<Plus aria-hidden="true" /> Добавить кресло
				</button>
				{!newChairReadyToCreate ? (
					<p
						className="quick-create-guidance form-span-2"
						id={onboardingChairCreateGuidanceId}
						role="status"
						aria-live="polite"
					>
						Введите понятное название кресла или кабинета.
					</p>
				) : null}
			</div>
			<div
				className="onboarding-schedule-grid form-span-2"
				aria-label="Расписание команды при первом запуске"
			>
				<div className="onboarding-schedule-section">
					<div>
						<h4>Расписание команды</h4>
						<p>
							Сразу задайте рабочие дни и часы. Изменения автосохраняются
							и остаются выбранными, пока вы их не поменяете.
						</p>
					</div>
					<div className="staff-list">
						{(dashboard.clinicSettings?.staff ?? [])
							.filter(
								(member) =>
									member.role === "doctor" || member.role === "assistant",
							)
							.map((member) => {
								const scheduleDraft =
									staffScheduleDrafts[member.id] ??
									staffScheduleDraftFromWorkingHours(
										member.workingHours ?? null,
									);
								const scheduleSaveState =
									staffScheduleSaveStates[member.id] ?? "saved";
								const scheduleDirty = staffScheduleDirtyIds.has(
									member.id,
								);
								const scheduleSaving =
									staffScheduleSavingId === member.id ||
									scheduleSaveState === "saving";
								const scheduleSaveLabel = scheduleSaving
									? "Автосохранение"
									: scheduleSaveState === "error"
										? "Не сохранено"
										: scheduleDirty
											? "Ждет автосохранения"
											: "Сохранено";
								return (
									<div
										className="staff-row onboarding-schedule-row"
										key={`onboarding-staff-schedule-${member.id}`}
									>
										<span style={{ background: member.color }} />
										<div>
											<strong>{member.fullName}</strong>
											<p>
												{staffRoleLabels[member.role]} ·{" "}
												{member.specialties
													.map((item) => specialtyLabels[item])
													.join(", ")}
											</p>
										</div>
										<div className="staff-schedule-editor onboarding-compact-schedule-editor">
											<label>
												С
												<input
													aria-label={`Начало смены: ${member.fullName}`}
													type="time"
													value={scheduleDraft.start}
													onChange={(event) =>
														updateStaffScheduleDraft(member.id, {
															start: event.target.value,
														})
													}
												/>
											</label>
											<label>
												До
												<input
													aria-label={`Конец смены: ${member.fullName}`}
													type="time"
													value={scheduleDraft.end}
													onChange={(event) =>
														updateStaffScheduleDraft(member.id, {
															end: event.target.value,
														})
													}
												/>
											</label>
											<div
												className="weekday-toggle-row staff-weekday-row"
												role="group"
												aria-label={`Рабочие дни сотрудника: ${member.fullName}`}
											>
												{weekdayOptions.map((day: any) => (
													<button
														className={
															scheduleDraft.workingDays.includes(
																day.value,
															)
																? "active"
																: ""
														}
														key={day.value}
														type="button"
														aria-pressed={scheduleDraft.workingDays.includes(
															day.value,
														)}
														onClick={() =>
															toggleStaffWorkingDay(member.id, day.value)
														}
													>
														{day.label}
													</button>
												))}
											</div>
											<div className="staff-schedule-actions">
												<span
													className={`save-state save-state-${scheduleSaveState}`}
												>
													{scheduleSaveLabel}
												</span>
												<button
													className="secondary-button compact-button"
													type="button"
													onClick={() =>
														void saveStaffSchedule(member.id)
													}
													disabled={scheduleSaving}
												>
													{scheduleSaving
														? "Сохраняю"
														: "Сохранить сейчас"}
												</button>
											</div>
										</div>
									</div>
								);
							})}
					</div>
				</div>
				<div className="onboarding-schedule-section">
					<div>
						<h4>Расписание кресел</h4>
						<p>
							Кабинет может работать иначе, чем врач. Это сразу
							учитывается в записи и конфликтных слотах.
						</p>
					</div>
					<div className="staff-list">
						{(dashboard.clinicSettings?.chairs ?? [])
							.filter((chair) => chair.active)
							.map((chair) => {
								const scheduleDraft =
									chairScheduleDrafts[chair.id] ??
									staffScheduleDraftFromWorkingHours(
										chair.workingHours ?? null,
									);
								const scheduleSaveState =
									chairScheduleSaveStates[chair.id] ?? "saved";
								const scheduleDirty = chairScheduleDirtyIds.has(chair.id);
								const scheduleSaving =
									chairScheduleSavingId === chair.id ||
									scheduleSaveState === "saving";
								const scheduleSaveLabel = scheduleSaving
									? "Автосохранение"
									: scheduleSaveState === "error"
										? "Не сохранено"
										: scheduleDirty
											? "Ждет автосохранения"
											: "Сохранено";
								return (
									<div
										className="staff-row onboarding-schedule-row"
										key={`onboarding-chair-schedule-${chair.id}`}
									>
										<CalendarDays aria-hidden="true" />
										<div>
											<strong>{chair.name}</strong>
											<p>
												{chair.specialization
													? specialtyLabels[chair.specialization]
													: "универсально"}
											</p>
										</div>
										<div className="staff-schedule-editor onboarding-compact-schedule-editor">
											<label>
												С
												<input
													aria-label={`Начало работы кресла: ${chair.name}`}
													type="time"
													value={scheduleDraft.start}
													onChange={(event) =>
														updateChairScheduleDraft(chair.id, {
															start: event.target.value,
														})
													}
												/>
											</label>
											<label>
												До
												<input
													aria-label={`Конец работы кресла: ${chair.name}`}
													type="time"
													value={scheduleDraft.end}
													onChange={(event) =>
														updateChairScheduleDraft(chair.id, {
															end: event.target.value,
														})
													}
												/>
											</label>
											<div
												className="weekday-toggle-row staff-weekday-row"
												role="group"
												aria-label={`Рабочие дни кресла: ${chair.name}`}
											>
												{weekdayOptions.map((day: any) => (
													<button
														className={
															scheduleDraft.workingDays.includes(
																day.value,
															)
																? "active"
																: ""
														}
														key={day.value}
														type="button"
														aria-pressed={scheduleDraft.workingDays.includes(
															day.value,
														)}
														onClick={() =>
															toggleChairWorkingDay(chair.id, day.value)
														}
													>
														{day.label}
													</button>
												))}
											</div>
											<div className="staff-schedule-actions">
												<span
													className={`save-state save-state-${scheduleSaveState}`}
												>
													{scheduleSaveLabel}
												</span>
												<button
													className="secondary-button compact-button"
													type="button"
													onClick={() => void saveChairSchedule(chair.id)}
													disabled={scheduleSaving}
												>
													{scheduleSaving
														? "Сохраняю"
														: "Сохранить сейчас"}
												</button>
											</div>
										</div>
									</div>
								);
							})}
					</div>
				</div>
			</div>
		</div>
	);
}
