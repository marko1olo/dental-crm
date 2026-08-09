import type {
	Appointment,
	AppointmentReadiness,
	Dashboard,
	ScheduleSuggestion,
} from "@dental/shared";
import type { ChangeEvent } from "react";
import { WaitlistMatchesBlock } from "./WaitlistMatchesBlock";

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export type AppointmentCardProps = {
	appointment: Appointment;
	dashboard: Dashboard;
	visibleScheduleSuggestions: ScheduleSuggestion[];
	appointmentReadinessById: Map<string, AppointmentReadiness>;
	appointmentLabels: Record<Appointment["status"], string>;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	appointmentDraft: Record<string, any>;
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
	/**
	 * Переносит пациента, врача, ассистента, кресло, длительность и повод этой
	 * записи в форму новой и открывает её. Удобно для «тот же пациент через
	 * неделю». Для переноса на произвольное время — «В буфер» + панель буфера.
	 */
	repeatAppointment: (appointment: Appointment) => void;
	/**
	 * Копирует снимок приёма в серверный буфер расписания (schedule_clipboard_items)
	 * и открывает панель «Буфер». Вставка создаёт новый приём на выбранное время.
	 */
	copyAppointmentToBuffer?: (appointment: Appointment) => void;

	closeAppointmentEditor: (appointmentId: string) => void;
	updateAppointmentScheduleDraft: (
		appointmentId: string,
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		key: any,
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		value: any,
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
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		appointmentActiveVisitStatusLocked,
		appointmentMissingSteps,
		appointmentReadyToSave,
		openScheduleSuggestion,
		formatTime,
		patientName,
		openAppointmentEditor,
		repeatAppointment,
		copyAppointmentToBuffer,
		closeAppointmentEditor,
		updateAppointmentScheduleDraft,
		saveAppointmentSchedule,
		normalizedAppointmentStatus,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
		useManualSelects,
		activeVisitLockedAppointmentStatuses,
	} = props;

	const appointmentSuggestions = (visibleScheduleSuggestions ?? []).filter(
		(s) => s?.appointmentId === appointment?.id,
	);
	const readiness =
		(appointmentReadinessById instanceof Map
			? appointmentReadinessById.get(appointment?.id ?? "")
			: undefined) ?? null;
	const appointmentDoctor = (dashboard?.clinicSettings?.staff ?? []).find(
		(member) => member?.id === appointment?.doctorUserId,
	);
	const appointmentAssistant = appointment?.assistantUserId
		? (dashboard?.clinicSettings?.staff ?? []).find(
				(member) => member?.id === appointment.assistantUserId,
			)
		: null;
	const appointmentChair = (dashboard?.clinicSettings?.chairs ?? []).find(
		(chair) => chair?.id === appointment?.chairId,
	);
	const appointmentSaveMissingId = `appointment-save-missing-${appointment?.id ?? ""}`;
	const appointmentEditorId = `appointment-editor-${appointment?.id ?? ""}`;
	const appointmentHandoffNoteId = `appointment-handoff-note-${appointment?.id ?? ""}`;
	const appointmentPatientName =
		typeof patientName === "function"
			? patientName(dashboard?.patients ?? [], appointment?.patientId ?? null)
			: "";

	return (
		<div className="timeline-node" key={appointment.id}>
			<div className="timeline-line"></div>
			<div className="timeline-time">{formatTime(appointment.startsAt)}</div>

			<div className="timeline-content">
				<p style={{ display: "none" }}>{appointment.reason}</p>
				<article
					data-testid="appointment-card"
					aria-label={`Карточка приема: ${appointmentPatientName}, ${formatTime(appointment.startsAt)} - ${formatTime(appointment.endsAt)}`}
					className={`appointment-card mode-fit-card glass-panel rounded-xl p-4 mb-3 shadow-sm ${readiness ? `readiness-${readiness.state}` : ""}`}
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "8px",
						background: "var(--paper)",
						border: "1px solid var(--line)",
						color: "var(--ink)",
					}}
				>
					<div className="appointment-card-header border-b border-slate-200 dark:border-slate-800 pb-2 mb-1 flex justify-between items-center">
						<div className="appointment-card-time font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
							{appointment?.startsAt ? formatTime(appointment.startsAt) : ""}
							<span className="font-normal text-slate-500 dark:text-slate-400">
								{appointment?.endsAt ? formatTime(appointment.endsAt) : ""}
							</span>
						</div>
						<span
							className={`appointment-card-status status-pill status-${appointment?.status ?? ""}`}
						>
							{appointmentLabels?.[appointment?.status] ??
								String(appointment?.status ?? "")}
						</span>
						{appointmentHasOpenVisit ? (
							<span className="handoff-lock">
								Открыт прием: пациент закреплен
							</span>
						) : null}
					</div>

					<div className="appointment-card-body">
						<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
							{appointmentPatientName}
						</h3>
						<div
							className="chip-group"
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "6px",
								alignItems: "center",
							}}
						>
							{appointmentSuggestions.map((suggestion) => (
								<button
									type="button"
									key={suggestion.id}
									className={`chip chip-suggestion priority-${suggestion.priority} cursor-pointer px-2 py-0.5 rounded border text-xs font-semibold ${
										suggestion.priority === "urgent"
											? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
											: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
									}`}
									onClick={(e) => {
										e.stopPropagation();
										openScheduleSuggestion(suggestion.section);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.stopPropagation();
											e.preventDefault();
											openScheduleSuggestion(suggestion.section);
										}
									}}
									title={suggestion.detail}
								>
									⚠️ {suggestion.title}
								</button>
							))}
							<span className="chip chip-reason">
								{appointment?.reason || "Причина не указана"}
							</span>
							<span className="chip chip-doctor">
								{(appointmentDoctor?.fullName || "").split(" ")[0] ||
									"Врач не назначен"}
							</span>
							<span className="chip chip-assistant">
								{(appointmentAssistant?.fullName || "").split(" ")[0] ||
									"ассистент не назначен"}
							</span>
							{appointmentChair && (
								<span className="chip chip-chair">{appointmentChair.name}</span>
							)}
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
							className="appointment-handoff-note text-xs text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 p-2 rounded-md mt-1"
							id={appointmentHandoffNoteId}
						>
							Пациент и закрывающий статус этой записи меняются только после
							закрытия приема.
						</p>
					) : null}

					{/*
        ОСВОБОДИВШЕЕСЯ ОКНО → ПОЛНЫЙ ПОДБОР ИЗ ЛИСТА ОЖИДАНИЯ.

        API GET /api/appointments/:id/waitlist-matches уже существовал, но веб
        его не вызывал. Сводка FreedSlotsPanel показывает только top-3 из
        freed-slots; здесь, на карточке отменённого / no_show приёма в ленте
        дня, администратор видит полный список «кому звонить» с причиной.
        Только future cancelled/no_show: API сам отвергает занятое и прошлое.
      */}
					{(appointment?.status === "cancelled" ||
						appointment?.status === "no_show") &&
					appointment?.startsAt &&
					new Date(appointment.startsAt).getTime() > Date.now() ? (
						<div
							style={{
								marginTop: 4,
								padding: "8px 10px",
								borderRadius: 10,
								border: "1px solid var(--line)",
								background: "var(--paper-soft)",
							}}
							data-testid="appointment-card-waitlist-matches"
						>
							<WaitlistMatchesBlock appointmentId={appointment.id} compact />
						</div>
					) : null}

					<div className="appointment-card-footer flex justify-end gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
						<button
							className="secondary-button appointment-repeat-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
							type="button"
							onClick={() => repeatAppointment(appointment)}
							aria-label={`Повторить запись: ${appointmentPatientName}. Форма новой записи откроется заполненной, останется выбрать время`}
							title={`Повторить запись: те же пациент, врач и кресло — останется выбрать время`}
							style={{
								padding: "4px 12px",
								minHeight: "28px",
								fontSize: "12px",
							}}
						>
							Повторить
						</button>
						{copyAppointmentToBuffer ? (
							<button
								className="secondary-button appointment-buffer-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
								type="button"
								onClick={() => copyAppointmentToBuffer(appointment)}
								aria-label={`В буфер: ${appointmentPatientName}`}
								title="Скопировать в буфер расписания для вставки на другое время"
								style={{
									padding: "4px 12px",
									minHeight: "28px",
									fontSize: "12px",
								}}
							>
								В буфер
							</button>
						) : null}
						<button
							className="secondary-button appointment-edit-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
							type="button"
							onClick={() => openAppointmentEditor(appointment)}
							aria-expanded={appointmentEditing}
							aria-controls={appointmentEditorId}
							aria-label={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`}
							title={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`}
							style={{
								padding: "4px 12px",
								minHeight: "28px",
								fontSize: "12px",
							}}
						>
							Настроить
						</button>
					</div>

					{appointmentEditing ? (
						<section
							className="appointment-editor form-span-2"
							id={appointmentEditorId}
							aria-label={`Редактирование записи: ${appointmentPatientName}`}
						>
							<label>
								Начало
								<input
									type="datetime-local"
									value={toDateTimeLocalValue(
										appointmentDraft?.startsAt as string,
										dashboard?.clinicSettings?.profile?.timezone,
									)}
									onChange={(event: TextFieldChangeEvent) =>
										updateAppointmentScheduleDraft(
											appointment.id,
											"startsAt",
											fromDateTimeLocalValue(
												event.target.value,
												dashboard?.clinicSettings?.profile?.timezone,
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
										appointmentDraft?.endsAt as string,
										dashboard?.clinicSettings?.profile?.timezone,
									)}
									onChange={(event: TextFieldChangeEvent) =>
										updateAppointmentScheduleDraft(
											appointment.id,
											"endsAt",
											fromDateTimeLocalValue(
												event.target.value,
												dashboard?.clinicSettings?.profile?.timezone,
											),
										)
									}
								/>
							</label>
							{/* min(300px, 100%): иначе колонка держит 300px в более узком
              контейнере и содержимое карточки уезжает за правый край. */}
							<div
								style={{
									display: "grid",
									gridTemplateColumns:
										"repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
									gap: "24px",
									marginBottom: "16px",
									gridColumn: "1 / -1",
								}}
							>
								<div>
									<span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">
										Пациент
									</span>
									{useManualSelects ||
									(dashboard.patients ?? []).length > 20 ? (
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
											className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
											aria-describedby={
												appointmentHasOpenVisit
													? appointmentHandoffNoteId
													: undefined
											}
										>
											<option value="">-- Выберите пациента --</option>
											{(dashboard.patients ?? [])
												.filter((p) => p.status === "active")
												.map((p) => (
													<option key={p.id} value={p.id}>
														{p.fullName}
													</option>
												))}
										</select>
									) : (
										<div className="flex flex-wrap gap-1.5">
											{(dashboard.patients ?? [])
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
									<span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">
										Врач
									</span>
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
											className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
										>
											<option value="">-- Выберите врача --</option>
											{(dashboard.clinicSettings?.staff ?? [])
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
										<div className="flex flex-wrap gap-1.5">
											{(dashboard.clinicSettings?.staff ?? [])
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

								{dashboard?.clinicSettings?.profile?.mode !== "solo_doctor" && (
									<div>
										<span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">
											Ассистент
										</span>
										<div className="flex flex-wrap gap-1.5">
											{(dashboard.clinicSettings?.staff ?? [])
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
									<span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">
										Кресло
									</span>
									<div className="flex flex-wrap gap-1.5">
										{(dashboard.clinicSettings?.chairs ?? [])
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
									<span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">
										Статус
									</span>
									<div className="flex flex-wrap gap-1.5">
										{(
											Object.keys(
												appointmentLabels ?? {},
											) as Appointment["status"][]
										).map((status) => (
											<button
												key={status}
												type="button"
												className={`quick-chip ${appointmentDraft?.status === status ? "active" : ""}`}
												onClick={() =>
													updateAppointmentScheduleDraft(
														appointment.id,
														"status",
														normalizedAppointmentStatus(status),
													)
												}
												disabled={
													appointmentHasOpenVisit &&
													Boolean(
														activeVisitLockedAppointmentStatuses?.has?.(status),
													)
												}
											>
												{appointmentLabels?.[status] ?? status}
											</button>
										))}
									</div>
									{appointmentHasOpenVisit && (
										<div
											id={appointmentHandoffNoteId}
											className="status-blocker-note appointment-handoff-note text-xs text-amber-800 dark:text-amber-300 mt-1 font-medium bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-900/60"
										>
											Статус приема заблокирован: по этому приему открыт
											активный визит. Завершите или отмените визит в рабочем
											месте врача (закройте прием перед закрывающим статусом
											записи).
										</div>
									)}
								</div>
							</div>
							<label className="form-span-2">
								Причина
								<input
									value={String(appointmentDraft.reason || "")}
									onChange={(event: TextFieldChangeEvent) =>
										updateAppointmentScheduleDraft(
											appointment.id,
											"reason",
											event.target.value,
										)
									}
								/>
								<div className="flex flex-wrap gap-1.5 mt-1.5">
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
												const currentVal = String(
													appointmentDraft.reason || "",
												).trim();
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
									value={String(appointmentDraft.comment || "")}
									onChange={(event: TextFieldChangeEvent) =>
										updateAppointmentScheduleDraft(
											appointment.id,
											"comment",
											event.target.value,
										)
									}
									rows={2}
								/>
								<div className="flex flex-wrap gap-1.5 mt-1.5">
									{[
										"Первичный",
										"Боль",
										"Осмотр",
										"Консультация",
										"Снимки",
									].map((chip) => (
										<button
											key={chip}
											type="button"
											onClick={() => {
												const currentVal = String(
													appointmentDraft.comment || "",
												).trim();
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
									{(appointmentMissingSteps ?? []).length ? (
										<div
											className="schedule-create-missing schedule-save-missing"
											id={appointmentSaveMissingId}
											role="status"
											aria-live="polite"
										>
											<strong>Чтобы сохранить запись, исправьте:</strong>
											<ul>
												{(appointmentMissingSteps ?? []).map((step) => (
													<li key={step}>{step}</li>
												))}
											</ul>
										</div>
									) : null}
								</div>
								{/*
              ПРАВКА ВРЕМЕНИ ПРИЁМА МОЛЧА ПРОПАДАЛА ПРИ ЗАКРЫТИИ.

              ЧТО БЫЛО СЛОМАНО. Признак «в черновике есть несохранённые изменения»
              сюда передаётся (appointmentDirty, считается в ScheduleView), но в
              карточке не использовался НИ РАЗУ: подпись у кнопки всегда говорила
              «Ждет сохранения» — и когда правок нет, и когда администратор
              переставил время, но не сохранил.

              ЧТО ВИДЕЛ АДМИНИСТРАТОР. Открыл «Настроить», переставил начало с
              14:00 на 15:00, отвлёкся на звонок, нажал «Закрыть» — правка исчезла
              без единого слова, а в расписании осталось 14:00. Пациенту при этом
              уже сказали «перенесли на три». Приём сорван, а на экране всё ровно.

              ЧТО СТАЛО. Подпись говорит правду: «Изменения не сохранены», когда
              они есть, и «Изменений нет», когда их нет. «Закрыть» с
              несохранёнными правками спрашивает подтверждение — потерять их можно
              только осознанно. Классы подписи не тронуты: оформление живёт в
              чужих таблицах стилей.
            */}
								<span
									className={`save-state save-state-${appointmentSaveState}`}
								>
									{appointmentSaveState === "saving"
										? "Сохраняю"
										: appointmentSaveState === "saved"
											? "Сохранено"
											: appointmentSaveState === "error"
												? "Ошибка сохранения"
												: appointmentDirty
													? "Изменения не сохранены"
													: "Изменений нет"}
								</span>
								<button
									className="secondary-button"
									type="button"
									disabled={appointmentSaveState === "saving"}
									aria-busy={appointmentSaveState === "saving" || undefined}
									onClick={() => {
										if (
											appointmentDirty &&
											!window.confirm(
												"Изменения этой записи не сохранены. Закрыть и потерять их?",
											)
										) {
											return;
										}
										closeAppointmentEditor(appointment.id);
									}}
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
										!appointmentReadyToSave &&
										(appointmentMissingSteps ?? []).length
											? appointmentSaveMissingId
											: undefined
									}
								>
									Сохранить запись
								</button>
							</div>
						</section>
					) : null}
				</article>
			</div>
		</div>
	);
}
