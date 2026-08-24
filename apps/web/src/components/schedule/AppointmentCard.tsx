import type {
	Appointment,
	AppointmentReadiness,
	Dashboard,
	DentalSpecialty,
	ScheduleSuggestion,
} from "@dental/shared";
import type { ChangeEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { showToast } from "../GlobalToast";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import { AppointmentQuickActions } from "./AppointmentQuickActions";
import { WaitlistMatchesBlock } from "./WaitlistMatchesBlock";
import { specialtyLabels } from "../../workspaceUiLabels";

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export type AppointmentCardProps = {
	appointment: Appointment;
	dashboard: Dashboard;
	visibleScheduleSuggestions: ScheduleSuggestion[];
	appointmentReadinessById: Map<string, AppointmentReadiness>;
	appointmentLabels: Record<Appointment["status"], string>;
	appointmentDraft: Record<
		string,
		string | number | boolean | null | undefined
	>;
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
	copyAppointmentToBuffer?: ((appointment: Appointment) => void) | undefined;

	closeAppointmentEditor: (appointmentId: string) => void;
	updateAppointmentScheduleDraft: (
		appointmentId: string,
		key: string,
		value: string | number | boolean | null | undefined,
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
	const appointmentPatient = (dashboard?.patients ?? []).find(
		(p) => p?.id === appointment?.patientId,
	);
	const patientBalance = useMemo(() => {
		const raw = (appointmentPatient as { balance?: number | string | null } | undefined)?.balance;
		if (raw === undefined || raw === null || raw === "") return null;
		const num = Number(raw);
		return Number.isFinite(num) ? num : null;
	}, [appointmentPatient]);
	const appointmentPatientName =
		typeof patientName === "function"
			? patientName(dashboard?.patients ?? [], appointment?.patientId ?? null)
			: "";

	const collision = useMemo(() => {
		if (!appointmentEditing || !appointmentDraft) {
			return {
				hasCollision: false,
				conflictType: null,
				conflictingAppointment: null,
				message: null,
			};
		}
		return checkAppointmentResourceCollision(
			appointmentDraft,
			dashboard?.appointments,
			{
				excludeAppointmentId: appointment.id,
				staff: dashboard?.clinicSettings?.staff,
				chairs: dashboard?.clinicSettings?.chairs,
				patients: dashboard?.patients,
				formatTimeFn: (iso) =>
					toDateTimeLocalValue(
						iso,
						dashboard?.clinicSettings?.profile?.timezone,
					).slice(11, 16),
			},
		);
	}, [
		appointmentEditing,
		appointmentDraft,
		appointment.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.clinicSettings?.chairs,
		dashboard?.clinicSettings?.profile?.timezone,
		dashboard?.patients,
		toDateTimeLocalValue,
	]);

	const canSave = appointmentReadyToSave && !collision.hasCollision;

	const [isQuickStatusUpdating, setIsQuickStatusUpdating] = useState(false);
	const [optimisticStatus, setOptimisticStatus] = useState<Appointment["status"] | null>(null);

	const handleQuickStatusChange = useCallback(
		async (newStatus: Appointment["status"], noteAppend?: string) => {
			if (
				appointmentHasOpenVisit &&
				activeVisitLockedAppointmentStatuses?.has(newStatus)
			) {
				showToast(
					"Статус приема заблокирован: по этому приему открыт активный визит",
					"error",
				);
				return;
			}
			const prevStatus = appointment.status;
			const normalized = normalizedAppointmentStatus(newStatus);
			setOptimisticStatus(normalized);
			updateAppointmentScheduleDraft(appointment.id, "status", normalized);
			if (noteAppend) {
				const currentComment = String(
					appointmentDraft?.comment || appointment.comment || "",
				).trim();
				const updatedComment = currentComment
					? `${currentComment}; ${noteAppend}`
					: noteAppend;
				updateAppointmentScheduleDraft(appointment.id, "comment", updatedComment);
			}
			setIsQuickStatusUpdating(true);
			try {
				const success = await saveAppointmentSchedule(appointment.id);
				if (success) {
					const label = appointmentLabels?.[normalized] ?? normalized;
					showToast(
						`«${appointmentPatientName}» — статус «${label}»`,
						"success",
						3000,
					);
				} else {
					setOptimisticStatus(null);
					updateAppointmentScheduleDraft(appointment.id, "status", prevStatus);
					showToast("Не удалось сохранить статус приёма", "error");
				}
			} catch {
				setOptimisticStatus(null);
				updateAppointmentScheduleDraft(appointment.id, "status", prevStatus);
				showToast("Ошибка при сохранении статуса приёма", "error");
			} finally {
				setIsQuickStatusUpdating(false);
			}
		},
		[
			appointment.id,
			appointment.status,
			appointment.comment,
			appointmentDraft?.comment,
			appointmentHasOpenVisit,
			activeVisitLockedAppointmentStatuses,
			normalizedAppointmentStatus,
			updateAppointmentScheduleDraft,
			saveAppointmentSchedule,
			appointmentPatientName,
			appointmentLabels,
		],
	);

	const handleShiftAppointmentTime = useCallback(
		async (minutes: number) => {
			if (appointmentHasOpenVisit) {
				showToast("Нельзя сдвинуть время: открыт активный визит", "error");
				return;
			}
			const curStart = new Date(appointment.startsAt).getTime();
			const curEnd = new Date(appointment.endsAt).getTime();
			const durationMs = curEnd - curStart;
			const newStartMs = curStart + minutes * 60000;
			const newEndMs = newStartMs + durationMs;
			const newStartIso = new Date(newStartMs).toISOString();
			const newEndIso = new Date(newEndMs).toISOString();

			updateAppointmentScheduleDraft(appointment.id, "startsAt", newStartIso);
			updateAppointmentScheduleDraft(appointment.id, "endsAt", newEndIso);
			setIsQuickStatusUpdating(true);
			try {
				const success = await saveAppointmentSchedule(appointment.id);
				if (success) {
					showToast(
						`Запись «${appointmentPatientName}» сдвинута на +${minutes} мин (${formatTime(newStartIso)} - ${formatTime(newEndIso)})`,
						"success",
						3500,
					);
				} else {
					updateAppointmentScheduleDraft(appointment.id, "startsAt", appointment.startsAt);
					updateAppointmentScheduleDraft(appointment.id, "endsAt", appointment.endsAt);
					showToast("Не удалось сдвинуть время записи", "error");
				}
			} catch {
				updateAppointmentScheduleDraft(appointment.id, "startsAt", appointment.startsAt);
				updateAppointmentScheduleDraft(appointment.id, "endsAt", appointment.endsAt);
				showToast("Ошибка при сдвиге времени записи", "error");
			} finally {
				setIsQuickStatusUpdating(false);
			}
		},
		[
			appointment.id,
			appointment.startsAt,
			appointment.endsAt,
			appointmentHasOpenVisit,
			appointmentPatientName,
			formatTime,
			saveAppointmentSchedule,
			updateAppointmentScheduleDraft,
		],
	);

	const handleCardKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
		const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
		if (targetTag === "input" || targetTag === "textarea" || targetTag === "select") {
			return;
		}

		if (e.key === "Enter" && !appointmentEditing) {
			e.preventDefault();
			openAppointmentEditor(appointment);
		} else if (e.key === " " && !appointmentEditing) {
			// Space key: 1-click progression of status
			e.preventDefault();
			const cur = optimisticStatus ?? appointment.status;
			let nextStatus: Appointment["status"] = "arrived";
			if (cur === "planned" || cur === "confirmed") {
				nextStatus = "arrived";
			} else if (cur === "arrived") {
				nextStatus = "in_treatment";
			} else if (cur === "in_treatment") {
				nextStatus = "completed";
			} else {
				nextStatus = "confirmed";
			}
			void handleQuickStatusChange(nextStatus);
		} else if (e.key === "1") {
			e.preventDefault();
			void handleQuickStatusChange("arrived");
		} else if (e.key === "2") {
			e.preventDefault();
			void handleQuickStatusChange("in_treatment");
		} else if (e.key === "3") {
			e.preventDefault();
			void handleQuickStatusChange("completed");
		} else if (e.key === "4") {
			e.preventDefault();
			void handleQuickStatusChange("no_show", "Опоздание");
		} else if (e.key === "5") {
			e.preventDefault();
			void handleQuickStatusChange("no_show");
		} else if ((e.key === "r" || e.key === "R" || e.key === "к" || e.key === "К") && !e.ctrlKey && !e.metaKey) {
			e.preventDefault();
			repeatAppointment(appointment);
		} else if (
			(e.key === "b" || e.key === "B" || e.key === "и" || e.key === "И") &&
			!e.ctrlKey &&
			!e.metaKey &&
			copyAppointmentToBuffer
		) {
			e.preventDefault();
			copyAppointmentToBuffer(appointment);
		}
	};

	const displayStatus = optimisticStatus ?? appointment?.status;

	return (
		<div className="timeline-node min-w-0 max-w-full" key={appointment.id}>
			<div className="timeline-line"></div>
			<div className="timeline-time shrink-0 font-medium">{formatTime(appointment.startsAt)}</div>

			<div className="timeline-content min-w-0 max-w-full">
				<p style={{ display: "none" }}>{appointment.reason}</p>
				<article
					data-testid="appointment-card"
					data-appointment-id={appointment.id}
					tabIndex={0}
					onKeyDown={handleCardKeyDown}
					aria-label={`Карточка приема: ${appointmentPatientName}, ${formatTime(appointment.startsAt)} - ${formatTime(appointment.endsAt)}`}
					className={`appointment-card mode-fit-card glass-panel rounded-xl p-4 mb-3 shadow-sm transition-all focus:ring-2 focus:ring-teal-500 focus:outline-none min-w-0 max-w-full overflow-hidden ${readiness ? `readiness-${readiness.state}` : ""}`}
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "8px",
						background: "var(--paper)",
						border: "1px solid var(--line)",
						color: "var(--ink)",
						minWidth: 0,
						maxWidth: "100%",
						boxSizing: "border-box",
					}}
				>
					<div className="appointment-card-header border-b border-[var(--line)] pb-2 mb-1 flex justify-between items-center gap-2 min-w-0 flex-wrap">
						<div className="appointment-card-time font-semibold text-sm text-[var(--ink)] flex items-center gap-2 shrink-0">
							{appointment?.startsAt ? formatTime(appointment.startsAt) : ""}
							<span className="font-normal text-[var(--muted)]">
								{appointment?.endsAt ? ` - ${formatTime(appointment.endsAt)}` : ""}
							</span>
						</div>
						<div className="flex items-center gap-1.5 flex-wrap min-w-0">
							{patientBalance !== null ? (
								patientBalance < 0 ? (
									<span
										className="px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
										title={`Задолженность пациента: ${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`}
									>
										Долг: {Math.abs(patientBalance).toLocaleString("ru-RU")} ₽
									</span>
								) : patientBalance > 0 ? (
									<span
										className="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
										title={`Аванс/депозит пациента: ${patientBalance.toLocaleString("ru-RU")} ₽`}
									>
										Аванс: {patientBalance.toLocaleString("ru-RU")} ₽
									</span>
								) : (
									<span
										className="px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
										title="Баланс пациента: 0 ₽"
									>
										Баланс: 0 ₽
									</span>
								)
							) : null}
							<span
								className={`appointment-card-status status-pill status-${displayStatus ?? ""} max-w-full truncate`}
								title={appointmentLabels?.[displayStatus] ?? String(displayStatus ?? "")}
							>
								{appointmentLabels?.[displayStatus] ??
									String(displayStatus ?? "")}
							</span>
							{appointmentHasOpenVisit ? (
								<span className="handoff-lock text-xs break-words" title="Открыт прием: пациент закреплен">
									Открыт прием: пациент закреплен
								</span>
							) : null}
						</div>
					</div>

					<div className="appointment-card-body min-w-0 max-w-full">
						<h3
							className="text-base font-semibold truncate break-words"
							style={{ color: "var(--ink)", minWidth: 0, maxWidth: "100%" }}
							title={appointmentPatientName}
						>
							{appointmentPatientName}
						</h3>
						<div
							className="chip-group min-w-0 max-w-full"
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "6px",
								alignItems: "center",
								minWidth: 0,
								maxWidth: "100%",
							}}
						>
							{appointmentSuggestions.map((suggestion) => (
								<button
									type="button"
									key={suggestion.id}
									className={`chip chip-suggestion priority-${suggestion.priority} max-w-full text-left`}
									style={{ whiteSpace: "normal", wordBreak: "break-word", maxWidth: "100%" }}
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
									title={suggestion.detail || suggestion.title}
								>
									⚠️ <span className="break-words">{suggestion.title}</span>
								</button>
							))}
							<span
								className="chip chip-reason max-w-full"
								title={appointment?.reason || "Причина не указана"}
								style={{
									whiteSpace: "normal",
									wordBreak: "break-word",
									maxWidth: "100%",
									textAlign: "left",
								}}
							>
								{appointment?.reason || "Причина не указана"}
							</span>
							<span
								className="chip chip-doctor max-w-full truncate inline-flex items-center gap-1"
								title={
									appointmentDoctor?.fullName
										? `Врач: ${appointmentDoctor.fullName}${
												appointmentDoctor.specialties?.length
													? ` (${appointmentDoctor.specialties.map((s) => specialtyLabels[s as DentalSpecialty] || s).join(", ")})`
													: ""
											}`
										: "Врач не назначен"
								}
								style={{ maxWidth: "100%" }}
							>
								<span>{appointmentDoctor?.fullName || "Врач не назначен"}</span>
								{appointmentDoctor?.specialties &&
									appointmentDoctor.specialties.length > 0 && (
										<span className="text-xs font-semibold opacity-75">
											•{" "}
											{appointmentDoctor.specialties
												.map((s) => specialtyLabels[s as DentalSpecialty] || s)
												.join(", ")}
										</span>
									)}
							</span>
							<span
								className="chip chip-assistant max-w-full truncate"
								title={appointmentAssistant?.fullName ? `Ассистент: ${appointmentAssistant.fullName}` : "ассистент не назначен"}
								style={{ maxWidth: "100%" }}
							>
								{appointmentAssistant?.fullName || "ассистент не назначен"}
							</span>
							{appointmentChair && (
								<span
									className="chip chip-chair max-w-full truncate"
									title={`Кресло: ${appointmentChair.name}`}
									style={{ maxWidth: "100%" }}
								>
									{appointmentChair.name}
								</span>
							)}
						</div>
						{readiness && (
							<div className="appt-readiness-row flex items-center gap-2 min-w-0 flex-wrap mt-1">
								<span
									className={`readiness-dot readiness-dot-${readiness.state} shrink-0`}
								/>
								<span className="appt-next-action truncate max-w-full" title={readiness.nextAction}>{readiness.nextAction}</span>
								<span className="appt-readiness-score shrink-0">{readiness.score}%</span>
							</div>
						)}
					</div>

					{appointmentHasOpenVisit ? (
						<p
							className="appointment-handoff-note text-xs"
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

					{/* Кнопки быстрого сдвига времени при опозданиях (+15 мин, +30 мин, +45 мин) */}
					<div className="appointment-delay-shift-bar flex items-center justify-between gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs flex-wrap">
						<span className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5 shrink-0">
							<Clock size={14} className="text-amber-600 shrink-0" />
							Пациент опаздывает:
						</span>
						<div className="flex items-center gap-1.5 flex-wrap">
							{[15, 30, 45].map((m) => (
								<button
									key={m}
									type="button"
									disabled={isQuickStatusUpdating || appointmentHasOpenVisit}
									onClick={(e) => {
										e.stopPropagation();
										void handleShiftAppointmentTime(m);
									}}
									className="min-h-[36px] px-3 py-1.5 rounded-lg border border-amber-500/40 bg-[var(--paper,#ffffff)] hover:bg-amber-500/20 text-amber-900 dark:text-amber-100 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 shadow-xs select-none active:scale-95"
									title={`Сдвинуть время визита на +${m} минут позже`}
								>
									+{m} мин
								</button>
							))}
						</div>
					</div>

					{/* Быстрые действия по статусу приёма */}
					<AppointmentQuickActions
						appointmentId={appointment.id}
						currentStatus={appointment.status}
						patientName={appointmentPatientName}
						patientPhone={appointmentPatient?.phone}
						doctorName={appointmentDoctor?.fullName}
						doctorSpecialty={appointmentDoctor?.role}
						startsAt={appointment.startsAt}
						clinicName={dashboard?.clinicSettings?.profile?.clinicName}
						clinicAddress={dashboard?.clinicSettings?.profile?.address}
						clinicPhone={dashboard?.clinicSettings?.profile?.phone}
						treatmentReason={appointment.reason}
						appointmentHasOpenVisit={appointmentHasOpenVisit}
						activeVisitLockedAppointmentStatuses={
							activeVisitLockedAppointmentStatuses
						}
						onStatusChange={handleQuickStatusChange}
						disabled={isQuickStatusUpdating}
					/>

					<div className="appointment-card-footer flex flex-wrap justify-end gap-2 mt-2 pt-2 border-t border-[var(--line)]">
						<button
							className="secondary-button appointment-repeat-button min-h-[44px] px-3.5 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors text-xs font-semibold flex items-center justify-center cursor-pointer"
							type="button"
							onClick={() => repeatAppointment(appointment)}
							aria-label={`Повторить запись: ${appointmentPatientName}. Форма новой записи откроется заполненной, останется выбрать время`}
							title={`Повторить запись: те же пациент, врач и кресло — останется выбрать время (Клавиша R)`}
						>
							Повторить
						</button>
						{copyAppointmentToBuffer ? (
							<button
								className="secondary-button appointment-buffer-button min-h-[44px] px-3.5 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors text-xs font-semibold flex items-center justify-center cursor-pointer"
								type="button"
								onClick={() => copyAppointmentToBuffer(appointment)}
								aria-label={`В буфер: ${appointmentPatientName}`}
								title="Скопировать в буфер расписания для вставки на другое время (Клавиша B)"
							>
								В буфер
							</button>
						) : null}
						<button
							className="secondary-button appointment-edit-button min-h-[44px] px-3.5 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors text-xs font-semibold flex items-center justify-center cursor-pointer"
							type="button"
							onClick={() => openAppointmentEditor(appointment)}
							aria-expanded={appointmentEditing}
							aria-controls={appointmentEditorId}
							aria-label={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`}
							title={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)} (Клавиша Enter)`}
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
								<div className="min-w-0">
									<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
										Пациент
									</span>
									{useManualSelects ||
									(dashboard.patients ?? []).length > 20 ? (
										<select
											value={String(appointmentDraft.patientId ?? "")}
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
											className="w-full p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none truncate"
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
										<div className="flex flex-wrap gap-1.5 min-w-0">
											{(dashboard.patients ?? [])
												.filter((patient) => patient.status === "active")
												.map((patient) => (
													<button
														key={patient.id}
														type="button"
														className={`quick-chip max-w-full truncate ${appointmentDraft.patientId === patient.id ? "active" : ""}`}
														title={patient.fullName}
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
														<span className="truncate">{patient.fullName}</span>
													</button>
												))}
										</div>
									)}
								</div>

								<div className="min-w-0">
									<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
										Врач
									</span>
									{useManualSelects ? (
										<select
											value={String(appointmentDraft.doctorUserId ?? "")}
											onChange={(e) =>
												updateAppointmentScheduleDraft(
													appointment.id,
													"doctorUserId",
													e.target.value,
												)
											}
											className="w-full p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none truncate"
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
										<div className="flex flex-wrap gap-1.5 min-w-0">
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
														className={`quick-chip max-w-full truncate ${appointmentDraft.doctorUserId === member.id ? "active" : ""}`}
														title={member.fullName}
														onClick={() =>
															updateAppointmentScheduleDraft(
																appointment.id,
																"doctorUserId",
																member.id,
															)
														}
													>
														<span className="truncate">{member.fullName}</span>
													</button>
												))}
										</div>
									)}
								</div>

								{dashboard?.clinicSettings?.profile?.mode !== "solo_doctor" && (
									<div className="min-w-0">
										<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
											Ассистент
										</span>
										<div className="flex flex-wrap gap-1.5 min-w-0">
											{(dashboard.clinicSettings?.staff ?? [])
												.filter(
													(member) =>
														member.active && member.role === "assistant",
												)
												.map((member) => (
													<button
														key={member.id}
														type="button"
														className={`quick-chip max-w-full truncate ${appointmentDraft.assistantUserId === member.id ? "active" : ""}`}
														title={member.fullName}
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
														<span className="truncate">{member.fullName}</span>
													</button>
												))}
										</div>
									</div>
								)}

								<div className="min-w-0">
									<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
										Кресло
									</span>
									<div className="flex flex-wrap gap-1.5 min-w-0">
										{(dashboard.clinicSettings?.chairs ?? [])
											.filter((chair) => chair.active)
											.map((chair) => (
												<button
													key={chair.id}
													type="button"
													className={`quick-chip max-w-full truncate ${appointmentDraft.chairId === chair.id ? "active" : ""}`}
													title={chair.name}
													onClick={() =>
														updateAppointmentScheduleDraft(
															appointment.id,
															"chairId",
															chair.id,
														)
													}
												>
													<span className="truncate">{chair.name}</span>
												</button>
											))}
									</div>
								</div>

								<div className="min-w-0">
									<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
										Статус
									</span>
									<div className="flex flex-wrap gap-1.5 min-w-0">
										{(
											Object.keys(
												appointmentLabels ?? {},
											) as Appointment["status"][]
										).map((status) => (
											<button
												key={status}
												type="button"
												className={`quick-chip max-w-full truncate ${appointmentDraft?.status === status ? "active" : ""}`}
												title={appointmentLabels?.[status] ?? status}
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
												<span className="truncate">{appointmentLabels?.[status] ?? status}</span>
											</button>
										))}
									</div>
									{appointmentHasOpenVisit && (
										<div
											id={appointmentHandoffNoteId}
											className="status-blocker-note appointment-handoff-note text-xs mt-1 font-medium p-2 rounded break-words"
										>
											Статус приема заблокирован: по этому приему открыт
											активный визит. Завершите или отмените визит в рабочем
											месте врача (закройте прием перед закрывающим статусом
											записи).
										</div>
									)}
								</div>
							</div>
							<label className="form-span-2 min-w-0">
								Причина
								<input
									className="w-full"
									value={String(appointmentDraft.reason || "")}
									onChange={(event: TextFieldChangeEvent) =>
										updateAppointmentScheduleDraft(
											appointment.id,
											"reason",
											event.target.value,
										)
									}
								/>
								<div className="flex flex-wrap gap-1.5 mt-1.5 min-w-0">
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
											className="quick-chip quick-chip--sm max-w-full truncate"
										>
											+ {chip}
										</button>
									))}
								</div>
							</label>
							<label className="form-span-2 min-w-0">
								Комментарий
								<textarea
									className="w-full"
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
								<div className="flex flex-wrap gap-1.5 mt-1.5 min-w-0">
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
											className="quick-chip quick-chip--sm max-w-full truncate"
										>
											+ {chip}
										</button>
									))}
								</div>
							</label>
							<div className="appointment-editor-actions flex flex-wrap items-center justify-between gap-3 min-w-0">
								<div
									className="min-h-reserved-error min-w-0"
									style={{ flex: 1, flexDirection: "column" }}
								>
									{appointmentSaveError ? (
										<span className="save-error break-words">{appointmentSaveError}</span>
									) : null}
									{collision.hasCollision ? (
										<div
											className="schedule-create-missing schedule-save-missing min-w-0 break-words"
											id={`appointment-collision-${appointment?.id ?? ""}`}
											role="alert"
										>
											<strong style={{ color: "var(--bad-fg)" }}>
												⛔ {collision.message}
											</strong>
										</div>
									) : null}
									{(appointmentMissingSteps ?? []).length ? (
										<div
											className="schedule-create-missing schedule-save-missing min-w-0 break-words"
											id={appointmentSaveMissingId}
											role="status"
											aria-live="polite"
										>
											<strong>Чтобы сохранить запись, исправьте:</strong>
											<ul>
												{(appointmentMissingSteps ?? []).map((step) => (
													<li key={step} className="break-words">{step}</li>
												))}
											</ul>
										</div>
									) : null}
								</div>
								<div className="flex items-center gap-2 flex-wrap shrink-0">
									<span
										className={`save-state save-state-${appointmentSaveState} break-words`}
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
										className="secondary-button min-h-[44px] px-4 py-2 text-xs font-semibold cursor-pointer shrink-0"
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
										className="primary-button min-h-[44px] px-5 py-2 text-xs font-bold cursor-pointer shrink-0"
										type="button"
										onClick={() => void saveAppointmentSchedule(appointment.id)}
										disabled={
											appointmentSaveState === "saving" || !canSave
										}
										aria-busy={appointmentSaveState === "saving" || undefined}
										aria-describedby={
											collision.hasCollision
												? `appointment-collision-${appointment?.id ?? ""}`
												: !appointmentReadyToSave &&
														(appointmentMissingSteps ?? []).length
													? appointmentSaveMissingId
													: undefined
										}
									>
										Сохранить запись
									</button>
								</div>
							</div>
						</section>
					) : null}
				</article>
			</div>
		</div>
	);
}
