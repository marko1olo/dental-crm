import type {
	Appointment,
	AppointmentReadiness,
	Dashboard,
	ScheduleSuggestion,
} from "@dental/shared";
import { Beaker, Clock, PackageCheck, RefreshCcw } from "lucide-react";
import type { ChangeEvent } from "react";
import React, { useState } from "react";
import type { AppointmentScheduleDraft } from "../../AppHelpers";
import { useAppStore } from "../../store/appStore";

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export type AppointmentCardProps = {
	appointment: Appointment;
	dashboard: Dashboard;
	visibleScheduleSuggestions: ScheduleSuggestion[];
	appointmentReadinessById: Map<string, AppointmentReadiness>;
	appointmentLabels: Record<Appointment["status"], string>;
	appointmentDraft: AppointmentScheduleDraft;
	appointmentSaveState: string;
	appointmentSaveError: string | null;
	appointmentDirty: boolean;
	appointmentEditing: boolean;
	appointmentHasOpenVisit: boolean;
	appointmentActiveVisitStatusLocked: boolean;
	appointmentMissingSteps: string[];
	appointmentReadyToSave: boolean;
	openScheduleSuggestion: (section: string) => void;
	formatTime: (value: string) => string;
	patientName: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	openAppointmentEditor: (appointment: Appointment) => void;
	closeAppointmentEditor: (appointmentId: string) => void;
	updateAppointmentScheduleDraft: <K extends keyof AppointmentScheduleDraft>(
		appointmentId: string,
		key: K,
		value: AppointmentScheduleDraft[K],
	) => void;
	saveAppointmentSchedule: (appointmentId: string) => Promise<boolean>;
	normalizedAppointmentStatus: (value: unknown) => Appointment["status"];
	toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	useManualSelects: boolean;
	activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
};

export function AppointmentCard(props: AppointmentCardProps) {
	const {
		appointment,
		dashboard,
		visibleScheduleSuggestions,
		appointmentReadinessById,
		appointmentLabels,
		appointmentDraft,
		appointmentSaveState,
		appointmentSaveError,
		appointmentDirty,
		appointmentEditing,
		appointmentHasOpenVisit,
		appointmentActiveVisitStatusLocked,
		appointmentMissingSteps,
		appointmentReadyToSave,
		openScheduleSuggestion,
		formatTime,
		patientName,
		openAppointmentEditor,
		closeAppointmentEditor,
		updateAppointmentScheduleDraft,
		saveAppointmentSchedule,
		normalizedAppointmentStatus,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
		useManualSelects,
		activeVisitLockedAppointmentStatuses,
	} = props;

	const [chipsExpanded, setChipsExpanded] = useState(false);
	const labOrderStatus = useAppStore((state) =>
		appointment.patientId
			? state.labOrderStatuses[appointment.patientId]
			: undefined,
	);

	const appointmentSuggestions = visibleScheduleSuggestions.filter(
		(s) => s.appointmentId === appointment.id,
	);
	const readiness = appointmentReadinessById.get(appointment.id);
	const appointmentDoctor = dashboard.clinicSettings.staff.find(
		(member) => member.id === appointment.doctorUserId,
	);
	const appointmentAssistant = appointment.assistantUserId
		? dashboard.clinicSettings.staff.find(
				(member) => member.id === appointment.assistantUserId,
			)
		: null;
	const appointmentChair = dashboard.clinicSettings.chairs.find(
		(chair) => chair.id === appointment.chairId,
	);
	const appointmentSaveMissingId = `appointment-save-missing-${appointment.id}`;
	const appointmentEditorId = `appointment-editor-${appointment.id}`;
	const appointmentHandoffNoteId = `appointment-handoff-note-${appointment.id}`;
	const appointmentPatientName = patientName(
		dashboard.patients,
		appointment.patientId,
	);

	const renderTrafficLights = () => {
		if (!appointment.patientId) return null;
		const insight = dashboard.patientInsights.find(
			(p) => p.patientId === appointment.patientId,
		);
		if (!insight && !labOrderStatus) return null;

		return (
			<div
				className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10"
				aria-label="Светофоры статуса"
			>
				{labOrderStatus &&
					(labOrderStatus === "in_progress" ||
						labOrderStatus === "refitting") && (
						<div
							className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse"
							title="Лаборатория: В работе"
						/>
					)}
				{labOrderStatus === "delivered" && (
					<div
						className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"
						title="Лаборатория: Работа доставлена"
					/>
				)}
				{insight?.balanceDueRub ? (
					<div
						className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
						title={`Долг: ${insight.balanceDueRub.toLocaleString()} ₽`}
					/>
				) : null}
				{insight?.missingDocumentKinds &&
					insight.missingDocumentKinds.length > 0 && (
						<div
							className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]"
							title="Отсутствуют подписанные документы"
						/>
					)}
				{insight &&
					!insight.balanceDueRub &&
					(!insight.missingDocumentKinds ||
						insight.missingDocumentKinds.length === 0) && (
						<div
							className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
							title="Документы подписаны, долгов нет"
						/>
					)}
			</div>
		);
	};

	return (
		<div className="timeline-node" key={appointment.id}>
			<div className="timeline-line"></div>
			<div className="timeline-time">{formatTime(appointment.startsAt)}</div>

			<div className="timeline-content">
				<p style={{ display: "none" }}>{appointment.reason}</p>
				<article
					className={`appointment-card appointment-card-node status-${appointment.status} ${readiness ? "readiness-" + readiness.state : ""}`}
				>
					<div className="mobile-time-badge">
						{formatTime(appointment.startsAt)} -{" "}
						{formatTime(appointment.endsAt)}
					</div>
					<div
						className="appointment-card-header"
						style={{
							position: "relative",
							display: "flex",
							flexWrap: "wrap",
							gap: "8px",
							alignItems: "center",
						}}
					>
						<div className="appointment-card-time">
							{formatTime(appointment.startsAt)}
							<span className="appointment-card-time-end">
								{formatTime(appointment.endsAt)}
							</span>
						</div>
						<span
							className={`appointment-card-status status-pill status-${appointment.status}`}
						>
							{appointmentLabels[appointment.status]}
						</span>
						{renderTrafficLights()}
						{readiness?.state === "ready" && (
							<div
								className="lab-ready-indicator animate-pulse"
								title="Подготовка завершена"
								style={{
									position: "absolute",
									top: "-10px",
									right: "-10px",
									background: "#10b981",
									borderRadius: "50%",
									padding: "4px",
									boxShadow: "0 0 10px rgba(16, 185, 129, 0.6)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "14px",
									zIndex: 10,
								}}
							>
								👑
							</div>
						)}
						{appointmentHasOpenVisit ? (
							<span className="handoff-lock">
								Открыт прием: пациент закреплен
							</span>
						) : null}
					</div>

					<div className="appointment-card-body">
						<h3>{appointmentPatientName}</h3>
						<div
							className={`chip-group appointment-chip-group ${chipsExpanded ? "expanded" : ""}`}
						>
							{(() => {
								const allChips = [
									...appointmentSuggestions.map((suggestion) => (
										<span
											key={suggestion.id}
											className={`chip chip-suggestion priority-${suggestion.priority}`}
											onClick={(e) => {
												e.stopPropagation();
												openScheduleSuggestion(suggestion.section);
											}}
											title={suggestion.detail}
										>
											⚠️ {suggestion.title}
										</span>
									)),
									<span key="reason" className="chip chip-reason">
										{appointment.reason || "Причина не указана"}
									</span>,
									<span key="doctor" className="chip chip-doctor">
										{appointmentDoctor?.fullName.split(" ")[0] ??
											"Врач не назначен"}
									</span>,
									<span key="assistant" className="chip chip-assistant">
										{appointmentAssistant?.fullName.split(" ")[0] ??
											"ассистент не назначен"}
									</span>,
									appointmentChair ? (
										<span key="chair" className="chip chip-chair">
											{appointmentChair.name}
										</span>
									) : null,
								].filter(Boolean);

								const isMobile =
									typeof window !== "undefined" && window.innerWidth <= 768;

								// If expanded or on desktop, show all
								if (chipsExpanded || !isMobile || allChips.length <= 2) {
									return (
										<>
											{allChips}
											{isMobile && allChips.length > 2 && (
												<button
													type="button"
													className="chip-expand-btn"
													onClick={() => setChipsExpanded(false)}
												>
													Скрыть
												</button>
											)}
										</>
									);
								}

								// Otherwise show first 2 and a +N button
								return (
									<>
										{allChips.slice(0, 2)}
										<button
											type="button"
											className="chip-expand-btn"
											onClick={() => setChipsExpanded(true)}
										>
											+{allChips.length - 2}
										</button>
									</>
								);
							})()}
						</div>
						{readiness && (
							<div className="appt-readiness-row">
								<span
									className={`readiness-dot readiness-dot-${readiness.state}`}
								/>
								<span className="appt-next-action">{readiness.nextAction}</span>
								<span className="appt-readiness-score">{readiness.score}%</span>
							</div>
						)}
					</div>

					{appointmentHasOpenVisit ? (
						<p
							className="appointment-handoff-note"
							id={appointmentHandoffNoteId}
						>
							Пациент и закрывающий статус этой записи меняются только после
							закрытия приема.
						</p>
					) : null}

					<div className="appointment-card-footer">
						<button
							className="secondary-button appointment-edit-button"
							type="button"
							onClick={() => openAppointmentEditor(appointment)}
							aria-expanded={appointmentEditing}
							aria-controls={appointmentEditorId}
							aria-label={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`}
							title={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`}
						>
							Настроить
						</button>
					</div>

					{appointmentEditing ? (
						<div
							className="appointment-editor form-span-2"
							id={appointmentEditorId}
							aria-label={`Редактирование записи: ${appointmentPatientName}`}
						>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
									gap: "16px",
									marginBottom: "16px",
								}}
							>
								<label>
									Начало
									<input
										type="datetime-local"
										value={toDateTimeLocalValue(
											appointmentDraft.startsAt,
											dashboard.clinicSettings.profile.timezone,
										)}
										onChange={(event: TextFieldChangeEvent) =>
											updateAppointmentScheduleDraft(
												appointment.id,
												"startsAt",
												fromDateTimeLocalValue(
													event.target.value,
													dashboard.clinicSettings.profile.timezone,
												),
											)
										}
									/>
								</label>
								<label>
									Окончание
									<input
										type="datetime-local"
										value={toDateTimeLocalValue(
											appointmentDraft.endsAt,
											dashboard.clinicSettings.profile.timezone,
										)}
										onChange={(event: TextFieldChangeEvent) =>
											updateAppointmentScheduleDraft(
												appointment.id,
												"endsAt",
												fromDateTimeLocalValue(
													event.target.value,
													dashboard.clinicSettings.profile.timezone,
												),
											)
										}
									/>
								</label>
							</div>

							<div className="appointment-editor-grid">
								<div>
									<span className="appointment-editor-label">Пациент</span>
									{useManualSelects || dashboard.patients.length > 20 ? (
										<select
											value={appointmentDraft.patientId || ""}
											onChange={(e) =>
												updateAppointmentScheduleDraft(
													appointment.id,
													"patientId",
													e.target.value,
												)
											}
											disabled={
												appointment.id === dashboard.activeVisit?.appointmentId
											}
											className="appointment-editor-select"
											aria-describedby={
												appointmentHasOpenVisit
													? appointmentHandoffNoteId
													: undefined
											}
										>
											<option value="">-- Выберите пациента --</option>
											{dashboard.patients
												.filter((p) => p.status === "active")
												.map((p) => (
													<option key={p.id} value={p.id}>
														{p.fullName}
													</option>
												))}
										</select>
									) : (
										<div className="appointment-editor-chips">
											{dashboard.patients
												.filter((patient) => patient.status === "active")
												.map((patient) => (
													<button
														key={patient.id}
														type="button"
														className={`quick-chip ${appointmentDraft.patientId === patient.id ? "active" : ""}`}
														onClick={() =>
															updateAppointmentScheduleDraft(
																appointment.id,
																"patientId",
																patient.id,
															)
														}
														disabled={
															appointment.id ===
															dashboard.activeVisit?.appointmentId
														}
													>
														{patient.fullName}
													</button>
												))}
										</div>
									)}
								</div>

								<div>
									<span className="appointment-editor-label">Врач</span>
									{useManualSelects ? (
										<select
											value={appointmentDraft.doctorUserId || ""}
											onChange={(e) =>
												updateAppointmentScheduleDraft(
													appointment.id,
													"doctorUserId",
													e.target.value,
												)
											}
											className="appointment-editor-select"
										>
											<option value="">-- Выберите врача --</option>
											{dashboard.clinicSettings.staff
												.filter(
													(m) =>
														m.active &&
														(m.role === "doctor" || m.role === "owner"),
												)
												.map((m) => (
													<option key={m.id} value={m.id}>
														{m.fullName}
													</option>
												))}
										</select>
									) : (
										<div className="appointment-editor-chips">
											{dashboard.clinicSettings.staff
												.filter(
													(member) =>
														member.active &&
														(member.role === "doctor" ||
															member.role === "owner"),
												)
												.map((member) => (
													<button
														key={member.id}
														type="button"
														className={`quick-chip ${appointmentDraft.doctorUserId === member.id ? "active" : ""}`}
														onClick={() =>
															updateAppointmentScheduleDraft(
																appointment.id,
																"doctorUserId",
																member.id,
															)
														}
													>
														{member.fullName}
													</button>
												))}
										</div>
									)}
								</div>

								{dashboard.clinicSettings.profile.mode !== "solo_doctor" && (
									<div>
										<span className="appointment-editor-label">Ассистент</span>
										<div className="appointment-editor-chips">
											{dashboard.clinicSettings.staff
												.filter(
													(member) =>
														member.active && member.role === "assistant",
												)
												.map((member) => (
													<button
														key={member.id}
														type="button"
														className={`quick-chip ${appointmentDraft.assistantUserId === member.id ? "active" : ""}`}
														onClick={() =>
															updateAppointmentScheduleDraft(
																appointment.id,
																"assistantUserId",
																appointmentDraft.assistantUserId === member.id
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
									<span className="appointment-editor-label">Кресло</span>
									<div className="appointment-editor-chips">
										{dashboard.clinicSettings.chairs
											.filter((chair) => chair.active)
											.map((chair) => (
												<button
													key={chair.id}
													type="button"
													className={`quick-chip ${appointmentDraft.chairId === chair.id ? "active" : ""}`}
													onClick={() =>
														updateAppointmentScheduleDraft(
															appointment.id,
															"chairId",
															chair.id,
														)
													}
												>
													{chair.name}
												</button>
											))}
									</div>
								</div>

								<div>
									<span className="appointment-editor-label">Статус</span>
									<div className="appointment-editor-chips">
										{(
											Object.keys(appointmentLabels) as Appointment["status"][]
										).map((status) => (
											<button
												key={status}
												type="button"
												className={`quick-chip ${appointmentDraft.status === status ? "active" : ""}`}
												onClick={() =>
													updateAppointmentScheduleDraft(
														appointment.id,
														"status",
														normalizedAppointmentStatus(status),
													)
												}
												disabled={
													appointmentHasOpenVisit &&
													activeVisitLockedAppointmentStatuses.has(status)
												}
											>
												{appointmentLabels[status]}
											</button>
										))}
									</div>
								</div>
							</div>

							<label className="form-span-2">
								Причина
								<input
									value={appointmentDraft.reason}
									onChange={(event: TextFieldChangeEvent) =>
										updateAppointmentScheduleDraft(
											appointment.id,
											"reason",
											event.target.value,
										)
									}
								/>
								<div
									className="appointment-editor-chips"
									style={{ marginTop: "8px" }}
								>
									{[
										"Кариес",
										"Пульпит",
										"Удаление",
										"Осмотр",
										"Профгигиена",
										"Консультация",
										"Брекеты",
										"Коронка",
										"КЛКТ",
										"Имплантация",
									].map((chip) => (
										<button
											key={chip}
											type="button"
											onClick={() => {
												const currentVal = appointmentDraft.reason.trim();
												const newVal = currentVal
													? `${currentVal}, ${chip.toLowerCase()}`
													: chip;
												updateAppointmentScheduleDraft(
													appointment.id,
													"reason",
													newVal,
												);
											}}
											className="quick-chip quick-chip--sm"
										>
											+ {chip}
										</button>
									))}
								</div>
							</label>

							<label className="form-span-2">
								Комментарий
								<textarea
									value={appointmentDraft.comment}
									onChange={(event: TextFieldChangeEvent) =>
										updateAppointmentScheduleDraft(
											appointment.id,
											"comment",
											event.target.value,
										)
									}
									rows={2}
								/>
								<div
									className="appointment-editor-chips"
									style={{ marginTop: "8px" }}
								>
									{[
										"Первичный",
										"Острая боль",
										"По ДМС",
										"Повторный",
										"Снимок с собой",
										"Требуется КТ",
									].map((chip) => (
										<button
											key={chip}
											type="button"
											onClick={() => {
												const currentVal = appointmentDraft.comment.trim();
												const newVal = currentVal
													? `${currentVal}, ${chip.toLowerCase()}`
													: chip;
												updateAppointmentScheduleDraft(
													appointment.id,
													"comment",
													newVal,
												);
											}}
											className="quick-chip quick-chip--sm"
										>
											+ {chip}
										</button>
									))}
								</div>
							</label>

							<div className="appointment-editor-actions">
								<div
									className="min-h-reserved-error"
									style={{ flex: 1, flexDirection: "column" }}
								>
									{appointmentSaveError ? (
										<span className="save-error">{appointmentSaveError}</span>
									) : null}
									{appointmentMissingSteps.length ? (
										<div
											className="schedule-create-missing schedule-save-missing"
											id={appointmentSaveMissingId}
											role="status"
											aria-live="polite"
										>
											<strong>Чтобы сохранить запись, исправьте:</strong>
											<ul>
												{appointmentMissingSteps.map((step) => (
													<li key={step}>{step}</li>
												))}
											</ul>
										</div>
									) : null}
								</div>
								<span
									className={`save-state save-state-${appointmentSaveState}`}
								>
									{appointmentSaveState === "saving"
										? "Сохраняю"
										: appointmentSaveState === "saved"
											? "Сохранено"
											: appointmentSaveState === "error"
												? "Ошибка сохранения"
												: "Ждет сохранения"}
								</span>
								<button
									className="secondary-button"
									type="button"
									disabled={appointmentSaveState === "saving"}
									aria-busy={appointmentSaveState === "saving" || undefined}
									onClick={() => closeAppointmentEditor(appointment.id)}
								>
									Закрыть
								</button>
								<button
									className="primary-button"
									type="button"
									onClick={() => void saveAppointmentSchedule(appointment.id)}
									disabled={
										appointmentSaveState === "saving" || !appointmentReadyToSave
									}
									aria-busy={appointmentSaveState === "saving" || undefined}
									aria-describedby={
										!appointmentReadyToSave && appointmentMissingSteps.length
											? appointmentSaveMissingId
											: undefined
									}
								>
									Сохранить запись
								</button>
							</div>
						</div>
					) : null}
				</article>
			</div>
		</div>
	);
}
