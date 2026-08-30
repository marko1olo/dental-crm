import type { Dashboard } from "@dental/shared";
import {
	Building2,
	Calendar,
	CalendarPlus,
	CheckCircle2,
	ClipboardCheck,
	CreditCard,
	FileText,
	Gauge,
	History,
	ImageIcon,
	Info,
	MessageSquare,
	Phone,
	UserCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { patientInsightRiskLabels } from "./AppConstants";
import { formatShortDate, minutesLabel, money } from "./AppHelpers";
import { EmptyState } from "./components/EmptyState";
import { PatientAvatar } from "./components/PatientAvatar";
import { ShiftCallout } from "./components/shift/ShiftCallout";
import { EmkControlBoard } from "./components/visit/EmkControlBoard";
import { countLabel } from "./lib/russianPlural";

/** Calendar date in local clinic time. */
function localCalendarDateString(date: Date = new Date()): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calendarDateOfInstant(value: unknown): string | null {
	if (typeof value !== "string" || !value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime())
		? null
		: localCalendarDateString(parsed);
}

/**
 * Заготовка приёма из гидратации базы: приёмов нет вовсе, но объект
 * возвращается, чтобы карточка приёма открывалась пустой.
 */
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/* Склонение счётного слова живёт в листовом модуле lib/russianPlural: правило
   согласования одно на весь продукт, а через AppHelpers оно тянуло за собой
   таблицы стилей и делало любой логический тест этого файла незагружаемым. */
function appointmentsCountLabel(count: number): string {
	return countLabel(count, "прием", "приема", "приемов");
}

/**
 * Дата рождения человеческим видом. Раньше в карточку попадала строка из базы
 * «1996-02-25». Общий `formatShortDate` тоже не годится: он даёт двузначный год,
 * и «25.02.96» у пожилого пациента читается неоднозначно.
 */
function birthDateLabel(value: unknown): string {
	if (typeof value !== "string" || !value) return "не указана";
	const [year, month, day] = value.slice(0, 10).split("-");
	if (!year || !month || !day || year.length !== 4) return value;
	return `${day}.${month}.${year}`;
}

function formatClockTime(value: unknown): string {
	if (typeof value !== "string" || !value) return "";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "";
	return parsed.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function ShiftView({
	// biome-ignore lint/correctness/noUnusedFunctionParameters: automated suppression
	activePatientHasCallablePhone,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: automated suppression
	activePatientCallablePhone,
	visibleRecommendedActions,
	recommendedActionPriorityLabels,
	staffRoleLabels,
	dashboard,
	activeQueueRole,
	setError,
	mostLoadedResource,
	setSelectedPatientId,
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
}: any) {
	const patientsById = useMemo(() => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const index = new Map<string, any>();
		for (const patient of dashboard?.patients ?? [])
			index.set(patient.id, patient);
		return index;
	}, [dashboard?.patients]);

	const todayIso = dashboard?.todayIso || localCalendarDateString();

	/**
	 * Приёмы всей клиники на сегодня. Раньше список фильтровался по
	 * `activeDoctor`, а тот берётся из первого приёма в выдаче: владелец и
	 * администратор видели расписание одного произвольного врача под
	 * заголовком «Расписание приемов на сегодня».
	 */
	const todayAppointments = useMemo(() => {
		return (
			(dashboard?.appointments ?? [])
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				.filter((app: any) => calendarDateOfInstant(app.startsAt) === todayIso)
				.filter(
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					(app: any) =>
						!["cancelled", "no_show"].includes(
							String(app.status ?? "").toLowerCase(),
						),
				)
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				.sort((a: any, b: any) =>
					String(a.startsAt).localeCompare(String(b.startsAt)),
				)
		);
	}, [dashboard?.appointments, todayIso]);

	/**
	 * Активная запись на прием: статус «in_chair» / «in_treatment» / «in_progress»
	 * или текущий по времени прием.
	 */
	const inChairAppointment = useMemo(() => {
		const inChairStatuses = ["in_chair", "in_treatment", "in_progress"];
		// 1. Поиск записи с явным статусом нахождения в кресле / на приеме
		const foundByStatus = todayAppointments.find((app: any) => {
			const statusKey = String(
				app.status || app.appointmentStatus || app.state || "",
			).toLowerCase();
			return inChairStatuses.includes(statusKey);
		});
		if (foundByStatus) return foundByStatus;

		// 2. Поиск текущего приема по времени (если приём уже начался и ещё не завершён)
		const now = Date.now();
		return (
			todayAppointments.find((app: any) => {
				const statusKey = String(
					app.status || app.appointmentStatus || app.state || "",
				).toLowerCase();
				if (
					["cancelled", "no_show", "completed", "done"].includes(statusKey)
				) {
					return false;
				}
				const starts = new Date(app.startsAt).getTime();
				const ends = new Date(app.endsAt ?? app.startsAt).getTime();
				return (
					Number.isFinite(starts) &&
					Number.isFinite(ends) &&
					starts <= now &&
					now <= ends
				);
			}) ?? null
		);
	}, [todayAppointments]);

	/**
	 * Пациент, который сейчас в кресле (из активного визита или активной записи).
	 */
	const currentPatient = useMemo(() => {
		const visit = dashboard?.activeVisit;
		if (
			visit?.id &&
			visit.id !== NIL_UUID &&
			visit.patientId &&
			visit.patientId !== NIL_UUID &&
			visit.status === "draft"
		) {
			const p = patientsById.get(visit.patientId);
			if (p) return p;
		}

		if (
			inChairAppointment?.patientId &&
			inChairAppointment.patientId !== NIL_UUID
		) {
			const p = patientsById.get(inChairAppointment.patientId);
			if (p) return p;
			if (inChairAppointment.patient) return inChairAppointment.patient;
			if (inChairAppointment.patientFullName) {
				return {
					id: inChairAppointment.patientId,
					fullName: inChairAppointment.patientFullName,
					phone: inChairAppointment.patientPhone ?? "",
				};
			}
		}

		return null;
	}, [dashboard?.activeVisit, inChairAppointment, patientsById]);

	const currentPatientCallablePhone = (currentPatient?.phone ?? "")
		.trim()
		.replace(/[^\d+]/g, "");
	const currentPatientHasCallablePhone =
		currentPatientCallablePhone.length >= 5;

	const currentAppointmentReason = useMemo(() => {
		if (!inChairAppointment) return "";
		return (
			inChairAppointment.reason ||
			inChairAppointment.treatmentDescription ||
			inChairAppointment.serviceTitle ||
			inChairAppointment.complaint ||
			inChairAppointment.complaints ||
			""
		);
	}, [inChairAppointment]);

	const staffById = useMemo(() => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const index = new Map<string, any>();
		for (const member of dashboard?.clinicSettings?.staff ?? [])
			index.set(member.id, member);
		return index;
	}, [dashboard?.clinicSettings?.staff]);

	/** Фамилию врача в строке расписания показываем, только если врачей больше одного. */
	const manyDoctors = useMemo(
		() =>
			(dashboard?.clinicSettings?.staff ?? []).filter(
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				(member: any) => member.active && member.role === "doctor",
			).length > 1,
		[dashboard?.clinicSettings?.staff],
	);

	/** Ближайший приём, который ещё не начался: с него начинается день. */
	const nextAppointment = useMemo(() => {
		const now = Date.now();
		return (
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			todayAppointments.find((app: any) => {
				if (inChairAppointment && app.id === inChairAppointment.id) return false;
				const statusKey = String(
					app.status || app.appointmentStatus || app.state || "",
				).toLowerCase();
				if (
					[
						"in_chair",
						"in_treatment",
						"in_progress",
						"completed",
						"done",
						"cancelled",
						"no_show",
					].includes(statusKey)
				) {
					return false;
				}
				const ends = new Date(app.endsAt ?? app.startsAt).getTime();
				return Number.isFinite(ends) && ends >= now;
			}) ?? null
		);
	}, [todayAppointments, inChairAppointment]);

	const nextAppointmentPatient = nextAppointment
		? (patientsById.get(nextAppointment.patientId) ?? null)
		: null;

	/**
	 * Очереди ролей нужны клинике, где роли разложены по людям. Кабинету, где
	 * один-два человека, эта таблица не говорит ничего: все задачи всё равно
	 * их собственные, а список ролей просто занимает экран.
	 */
	const rolesWorthShowing = useMemo(
		() =>
			new Set(
				(dashboard?.clinicSettings?.staff ?? [])
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					.filter((member: any) => member.active)
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					.map((member: any) => member.role),
			).size > 2,
		[dashboard?.clinicSettings?.staff],
	);

	const [showAnalytics, setShowAnalytics] = useState(false);
	const [showOtherQueues, setShowOtherQueues] = useState(false);

	/** Переход по срочному делу: раздел берём из самого дела, пациента подставляем. */
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	function runRecommendedAction(action: any) {
		if (
			action?.patientId &&
			action.patientId !== NIL_UUID &&
			patientsById.has(action.patientId)
		) {
			setSelectedPatientId(action.patientId);
		}
		const section =
			typeof action?.section === "string" && action.section
				? action.section
				: "shift";
		window.location.hash = section;
	}
	return (
		<div className="shift-view-scroll-container pb-28 min-w-0">
			<section className="shift-hero" id="shift">
				<div className="now-card">
					<div className="row-between">
						<p className="eyebrow" style={{ color: "var(--ink-2)" }}>
							{currentPatient ? "Сейчас в кресле" : "Сейчас в работе"}
						</p>
						{currentPatient ? (
							<span className="status-pill status-in_treatment">
								<span className="pulse-dot" aria-hidden="true" />
								В кресле
							</span>
						) : null}
					</div>
					{currentPatient ? (
						<>
							<div className="patient-hero">
								<PatientAvatar fullName={currentPatient.fullName} size={44} />
								<div className="hero-info min-w-0">
									<h2 className="break-words leading-tight" style={{ color: "var(--ink)" }}>{currentPatient.fullName}</h2>
									<p className="hero-phone break-words" style={{ color: "var(--muted)" }}>
										{currentPatient.phone ?? "телефон не указан"}
										{currentAppointmentReason ? ` · ${currentAppointmentReason}` : ""}
									</p>
								</div>
							</div>
							<div className="hero-actions">
								<button
									className="primary-button min-h-[44px] px-3 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
									type="button"
									onClick={() => {
										setSelectedPatientId(currentPatient.id);
										window.location.hash = "visit";
									}}
								>
									<ClipboardCheck aria-hidden="true" /> Открыть карту / Прием
								</button>
								<button
									className="secondary-button min-h-[44px] px-3 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
									type="button"
									onClick={() => {
										setSelectedPatientId(currentPatient.id);
										window.location.hash = "imaging";
									}}
								>
									<ImageIcon aria-hidden="true" /> Снимки
								</button>
								<button
									className="secondary-button min-h-[44px] px-3 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
									type="button"
									aria-label="Позвонить пациенту"
									aria-describedby={
										!currentPatientHasCallablePhone
											? "shift-call-guidance"
											: undefined
									}
									aria-disabled={!currentPatientHasCallablePhone}
									title={
										currentPatientHasCallablePhone
											? "Позвонить пациенту"
											: "В карточке пациента нет телефона"
									}
									style={{ opacity: !currentPatientHasCallablePhone ? 0.6 : 1 }}
									onClick={() => {
										if (!currentPatientHasCallablePhone) {
											setError(
												"В карточке пациента нет телефона. Добавьте номер в разделе «Пациенты», чтобы позвонить.",
											);
											return;
										}
										window.location.href = `tel:${currentPatientCallablePhone}`;
									}}
								>
									<Phone aria-hidden="true" /> Позвонить
								</button>
							</div>

							{/* Compact Status Tracker */}
							<div className="status-flow min-w-0">
								<span className="status-flow-label shrink-0">Статус:</span>
								<div className="status-flow-steps flex flex-wrap items-center min-w-0">
									<span className="status-flow-step done">1. Запись</span>
									<span className="status-flow-arrow" aria-hidden="true">
										→
									</span>
									<span className="status-flow-step done">2. ЭМК</span>
									<span className="status-flow-arrow" aria-hidden="true">
										→
									</span>
									<span className="status-flow-step">3. Оплата</span>
								</div>
							</div>

							{!currentPatientHasCallablePhone ? (
								<ShiftCallout
									id="shift-call-guidance"
									role="status"
									aria-live="polite"
								>
									В карточке пациента нет телефона. Откройте «Пациенты» и
									добавьте номер, чтобы кнопка звонка стала активной.
								</ShiftCallout>
							) : null}
						</>
					) : nextAppointment ? (
						<>
							<div className="patient-hero">
								<PatientAvatar
									fullName={nextAppointmentPatient?.fullName ?? "?"}
									size={44}
								/>
								<div className="hero-info min-w-0">
									<h2 className="break-words leading-tight" style={{ color: "var(--ink)" }}>
										{nextAppointmentPatient?.fullName ?? "Пациент не найден"}
									</h2>
									<p className="hero-phone break-words leading-tight" style={{ color: "var(--muted)" }}>
										Ближайший прием сегодня в{" "}
										{formatClockTime(nextAppointment.startsAt)}
										{nextAppointment.reason
											? ` · ${nextAppointment.reason}`
											: ""}
									</p>
								</div>
							</div>
							<div className="hero-actions">
								<button
									className="primary-button min-h-[44px] px-3 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
									type="button"
									onClick={() => {
										if (nextAppointmentPatient)
											setSelectedPatientId(nextAppointmentPatient.id);
										window.location.hash = "visit";
									}}
								>
									<ClipboardCheck aria-hidden="true" /> Начать прием
								</button>
								<button
									className="secondary-button min-h-[44px] px-3 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
									type="button"
									onClick={() => {
										window.location.hash = "schedule";
									}}
								>
									<Calendar aria-hidden="true" /> Все записи дня
								</button>
							</div>
							<ShiftCallout role="status">
								Приём ещё не открыт. Нажмите «Начать прием», когда пациент сядет
								в кресло.
							</ShiftCallout>
						</>
					) : (
						<div
							className="compact-shift-empty-card"
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "12px",
								padding: "16px 14px",
								borderRadius: "12px",
								background: "var(--paper-soft, rgba(0,0,0,0.02))",
								border: "1px solid var(--line)",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
								<div
									style={{
										width: "36px",
										height: "36px",
										borderRadius: "10px",
										background: "var(--teal-surface)",
										color: "var(--teal-dark)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										flexShrink: 0,
									}}
								>
									<ClipboardCheck size={18} aria-hidden="true" />
								</div>
								<div style={{ minWidth: 0 }}>
									<h3 style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>
										Сейчас никого нет в кресле
									</h3>
									<p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)", lineHeight: 1.35 }}>
										{todayAppointments.length > 0
											? "Все приемы на сегодня уже прошли. Откройте расписание, чтобы записать пациента на другой день."
											: "На сегодня записей нет. Используйте кнопку «Записать пациента» в шапке или откройте расписание."}
									</p>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* РАСПИСАНИЕ НА СЕГОДНЯ */}
				<div className="today-schedule-box min-w-0">
					<div className="today-schedule-header">
						<h3 style={{ color: "var(--ink)" }}>
							<ClipboardCheck size={16} aria-hidden="true" /> Расписание приемов
							на сегодня
						</h3>
						<span className="today-schedule-count">
							{appointmentsCountLabel(todayAppointments.length)}
						</span>
					</div>
					{todayAppointments.length > 0 ? (
						<div className="today-schedule-list">
							{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
							{todayAppointments.map((app: any) => {
								const patient = patientsById.get(app.patientId);
								const isCurrent = Boolean(
									currentPatient &&
										(currentPatient.id === app.patientId ||
											(inChairAppointment && inChairAppointment.id === app.id)),
								);
								const doctor = staffById.get(app.doctorUserId);

								const timeStart = formatClockTime(app.startsAt);
								const timeEnd = formatClockTime(app.endsAt);

								const statusRaw = app.status || app.appointmentStatus || app.state || "planned";
								const statusKey = String(statusRaw).toLowerCase();
								const statusLabels: Record<string, string> = {
									planned: "Ожидает приема",
									scheduled: "Ожидает приема",
									pending: "Ожидает приема",
									confirmed: "Подтвержден",
									arrived: "Ожидает приема",
									in_chair: "На приеме",
									in_treatment: "На приеме",
									in_progress: "На приеме",
									completed: "Завершен",
									done: "Завершен",
									cancelled: "Отменен",
									no_show: "Не пришел",
								};

								return (
									<button
										type="button"
										key={app.id}
										aria-label={`Прием: ${patient ? patient.fullName : "Неизвестный пациент"}, ${timeStart} – ${timeEnd}`}
										className={`today-schedule-item min-h-[44px] py-2 px-3 focus:ring-2 focus:ring-teal-600 focus:outline-none min-w-0 ${isCurrent ? "current-active" : ""}`}
										style={{ textAlign: "left", width: "100%" }}
										onClick={() => {
											if (patient) {
												setSelectedPatientId(patient.id);
												window.location.hash = "visit";
											}
										}}
										onKeyDown={(e) => {
											if ((e.key === "Enter" || e.key === " ") && patient) {
												e.preventDefault();
												setSelectedPatientId(patient.id);
												window.location.hash = "visit";
											}
										}}
									>
										<div className="today-schedule-item-info min-w-0">
											<span className="today-schedule-time shrink-0">
												{timeStart} – {timeEnd}
											</span>
											<strong className="today-schedule-name break-words leading-tight" style={{ color: "var(--ink)" }}>
												{patient ? patient.fullName : "Неизвестный пациент"}
											</strong>
											<span className="today-schedule-reason break-words leading-tight">
												{app.reason || "плановый осмотр"}
												{manyDoctors && doctor ? ` · ${doctor.fullName}` : ""}
											</span>
										</div>
										<span className={`status-pill status-${statusKey} shrink-0`}>
											{statusLabels[statusKey] ?? "Ожидает приема"}
										</span>
									</button>
								);
							})}
						</div>
					) : (
						<div
							className="compact-schedule-empty-card"
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "10px",
								padding: "14px",
								borderRadius: "12px",
								background: "var(--paper-soft, rgba(0,0,0,0.02))",
								border: "1px solid var(--line)",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
								<div
									style={{
										width: "32px",
										height: "32px",
										borderRadius: "8px",
										background: "var(--teal-surface)",
										color: "var(--teal-dark)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										flexShrink: 0,
									}}
								>
									<Calendar size={16} aria-hidden="true" />
								</div>
								<div style={{ minWidth: 0 }}>
									<strong style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>
										На сегодня записей нет
									</strong>
									<span style={{ display: "block", fontSize: "11.5px", color: "var(--muted)", lineHeight: 1.35 }}>
										Свободный день. Запишите пациента — запись сразу появится здесь.
									</span>
								</div>
							</div>
							<div>
								<button
									className="secondary-button min-h-[36px] px-3 py-1 text-xs"
									type="button"
									onClick={() => {
										window.location.hash = "schedule";
									}}
								>
									<CalendarPlus aria-hidden="true" size={14} /> Открыть расписание
								</button>
							</div>
						</div>
					)}
				</div>
			</section>

			<div
				className="shift-dashboard-grid pb-28"
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "16px",
					marginTop: "16px",
				}}
			>
				<section className="shift-todo" aria-label="Что сделать сейчас">
					<div className="shift-todo-head">
						<h2 style={{ color: "var(--ink)" }}>Что сделать сейчас</h2>
						<span className="shift-todo-count">
							{(visibleRecommendedActions ?? []).length > 0
								? countLabel(
										(visibleRecommendedActions ?? []).length,
										"дело",
										"дела",
										"дел",
									)
								: "всё закрыто"}
						</span>
					</div>
					{(visibleRecommendedActions ?? []).length > 0 ? (
						<ul className="shift-todo-list">
							{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
							{(visibleRecommendedActions ?? []).map((action: any) => {
								const patient = action.patientId
									? patientsById.get(action.patientId)
									: null;
								return (
									<li
										key={action.id}
										className={`shift-todo-item priority-${action.priority} min-w-0`}
									>
										<span
											className={`shift-todo-priority priority-${action.priority} shrink-0`}
										>
											{recommendedActionPriorityLabels?.[action.priority] ??
												"без пометки"}
										</span>
										<div className="shift-todo-text min-w-0">
											<strong className="break-words leading-tight">{action.title}</strong>
											<p className="break-words leading-tight">{action.detail}</p>
											{patient ? (
												<span className="shift-todo-patient break-words">
													{patient.fullName}
												</span>
											) : null}
										</div>
										<button
											className="secondary-button shift-todo-go min-h-[44px] px-3 py-2 shrink-0"
											type="button"
											onClick={() => runRecommendedAction(action)}
										>
											{action.actionLabel || "Открыть"}
										</button>
									</li>
								);
							})}
						</ul>
					) : (
						<div
							className="compact-todo-empty-card"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "12px",
								padding: "12px 14px",
								borderRadius: "12px",
								background: "var(--paper-soft, rgba(0,0,0,0.02))",
								border: "1px solid var(--line)",
							}}
						>
							<div
								style={{
									width: "32px",
									height: "32px",
									borderRadius: "8px",
									background: "var(--ok-bg, rgba(21, 128, 61, 0.1))",
									color: "var(--ok-fg, #15803d)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									flexShrink: 0,
								}}
							>
								<CheckCircle2 size={16} aria-hidden="true" />
							</div>
							<div style={{ minWidth: 0 }}>
								<strong style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>
									Срочных дел нет
								</strong>
								<span style={{ display: "block", fontSize: "11.5px", color: "var(--muted)", lineHeight: 1.35, marginTop: "1px" }}>
									Все приемы подписаны, снимки проверены, документы и оплаты закрыты.
								</span>
							</div>
						</div>
					)}
				</section>

				<section
					className="shift-emk-control"
					style={{
						background: "var(--paper)",
						border: "1px solid var(--line)",
						borderRadius: "14px",
						boxShadow: "var(--shadow-1)",
					}}
				>
					<EmkControlBoard dashboard={dashboard} />
				</section>

				<section
					className="shift-intelligence"
					aria-label="Операционный контроль смены"
					style={{
						background: "var(--paper)",
						border: "1px solid var(--line)",
						borderRadius: "14px",
						padding: "18px 20px",
						boxShadow: "var(--shadow-1)",
						display: "flex",
						flexDirection: "column",
						gap: "16px",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "12px",
							flexWrap: "wrap",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "10px",
								minWidth: 0,
							}}
						>
							<div
								style={{
									width: "32px",
									height: "32px",
									borderRadius: "9px",
									background: "var(--teal-soft)",
									color: "var(--teal-dark)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									flexShrink: 0,
								}}
							>
								<Gauge size={16} aria-hidden="true" />
							</div>
							<div style={{ minWidth: 0 }}>
								<h4
									style={{
										margin: 0,
										fontSize: "14px",
										fontWeight: 700,
										color: "var(--ink)",
										wordBreak: "break-word",
										lineHeight: 1.25,
									}}
								>
									Операционный контроль смены
								</h4>
								<p
									style={{
										margin: "1px 0 0",
										fontSize: "12px",
										color: "var(--ink-2)",
										fontWeight: 500,
										wordBreak: "break-word",
										lineHeight: 1.35,
									}}
								>
									Насколько режим клиники и загрузка кресел совпадают с планом
									на день
								</p>
							</div>
						</div>
						<button
							className="secondary-button min-h-[44px] px-3 py-2"
							type="button"
							aria-expanded={showAnalytics}
							onClick={() => setShowAnalytics((v) => !v)}
							style={{
								minHeight: "44px",
								padding: "8px 12px",
								fontSize: "12px",
								flexShrink: 0,
							}}
						>
							{showAnalytics ? "Скрыть аналитику" : "Показать аналитику"}
						</button>
					</div>

					{showAnalytics && (
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "12px",
							}}
						>
							<article
								className="mode-fit-card"
								style={{
									padding: "16px",
									borderRadius: "12px",
									border: "1px solid var(--line)",
									background: "var(--paper-soft)",
								}}
							>
								<div
									className="mode-fit-head"
									style={{ display: "flex", alignItems: "center", gap: "10px" }}
								>
									<Building2 aria-hidden="true" className="shrink-0" />
									<div style={{ minWidth: 0 }}>
										<p className="eyebrow">Режим клиники</p>
										{/* «По умолчанию» — слово из настроек программы, а не ответ
                            на вопрос «какой у клиники режим». */}
										<h2 style={{ fontSize: "15px", margin: 0, wordBreak: "break-word", lineHeight: 1.25 }}>
											{dashboard?.shiftIntelligence?.modeFit?.title ??
												"Режим ещё не выбран"}
										</h2>
									</div>
									<strong
										style={{
											marginLeft: "auto",
											fontSize: "18px",
											color: "var(--teal-dark)",
											flexShrink: 0,
										}}
									>
										{dashboard?.shiftIntelligence?.modeFit?.fitScore ?? 0}%
									</strong>
								</div>
								<p
									style={{
										fontSize: "12.5px",
										color: "var(--muted)",
										margin: "8px 0",
										wordBreak: "break-word",
										lineHeight: 1.35,
									}}
								>
									{dashboard?.shiftIntelligence?.modeFit?.lowFrictionNextStep ??
										""}
								</p>
							</article>

							<article
								className="mode-fit-card resource-focus-card"
								style={{
									padding: "16px",
									borderRadius: "12px",
									border: "1px solid var(--line)",
									background: "var(--paper-soft)",
								}}
							>
								<div
									className="mode-fit-head"
									style={{ display: "flex", alignItems: "center", gap: "10px" }}
								>
									<Gauge aria-hidden="true" className="shrink-0" />
									<div style={{ minWidth: 0 }}>
										<p className="eyebrow">Загрузка</p>
										{/* «Нет ресурсов» — название сущности из базы. В клинике
                            загружены кресла и врачи, ресурсов там нет. */}
										<h2 style={{ fontSize: "15px", margin: 0, wordBreak: "break-word", lineHeight: 1.25 }}>
											{mostLoadedResource?.title ?? "Кресел и врачей нет"}
										</h2>
									</div>
									<strong
										style={{
											marginLeft: "auto",
											fontSize: "18px",
											color: "var(--teal-dark)",
											flexShrink: 0,
										}}
									>
										{mostLoadedResource
											? `${mostLoadedResource.utilizationPercent}%`
											: "0%"}
									</strong>
								</div>
								{mostLoadedResource ? (
									<>
										<p
											style={{
												fontSize: "12.5px",
												color: "var(--muted)",
												margin: "8px 0",
												wordBreak: "break-word",
												lineHeight: 1.35,
											}}
										>
											{/* Было «1 записей»: число не согласовывалось с существительным. */}
											{minutesLabel(mostLoadedResource.bookedMinutes)} ·{" "}
											{countLabel(
												mostLoadedResource.appointmentCount ?? 0,
												"запись",
												"записи",
												"записей",
											)}
										</p>
										<div
											role="progressbar"
											aria-valuenow={mostLoadedResource.utilizationPercent}
											aria-valuemin={0}
											aria-valuemax={100}
											className="load-meter"
											aria-label={`Загрузка ${mostLoadedResource.utilizationPercent}%`}
											style={{
												height: "4px",
												borderRadius: "4px",
												background: "var(--line)",
												overflow: "hidden",
											}}
										>
											<span
												style={{
													display: "block",
													height: "100%",
													width: `${Math.min(100, mostLoadedResource.utilizationPercent)}%`,
													background: "var(--teal)",
												}}
											/>
										</div>
									</>
								) : (
									<p
										style={{
											fontSize: "12.5px",
											color: "var(--muted)",
											margin: "8px 0",
											wordBreak: "break-word",
											lineHeight: 1.35,
										}}
									>
										Врачей и кресел пока нет в настройках.
									</p>
								)}
							</article>
							{/*
                    Здесь стоял <ConfirmationPerformanceReportsWidget />: отчёт
                    об эффективности подтверждения приёмов из таблицы
                    confirmation_performance_reports, у которой нет ни одного
                    писателя и ноль строк в живой базе. Обе карточки выше
                    считаются по настоящим данным dashboard.shiftIntelligence,
                    и пустая третья строка под ними только сбивала с толку.
                  */}
						</div>
					)}

					{/*
                Разбивка по ролям нужна там, где роли разложены по людям.
                В кабинете, где работают один-два человека, все эти задачи всё
                равно их собственные, а таблица ролей только занимает экран.
              */}
					{rolesWorthShowing ? (
						<>
							<div
								className="role-queue-header-row"
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
								}}
							>
								<h3
									style={{
										margin: 0,
										fontSize: "14px",
										fontWeight: 700,
										letterSpacing: "0.02em",
										color: "var(--ink)",
									}}
								>
									Задачи по ролям
								</h3>
								{(dashboard?.shiftIntelligence?.roleQueues ?? []).length >
									1 && (
									<button
										className="text-button toggle-queues-btn min-h-[44px] px-3 py-2 flex items-center"
										type="button"
										onClick={() => setShowOtherQueues((v) => !v)}
									>
										{showOtherQueues
											? "Скрыть другие роли"
											: "Показать другие роли"}
									</button>
								)}
							</div>

							<div
								className="role-queue-grid"
								style={{
									display: "grid",
									gridTemplateColumns:
										"repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
									gap: "12px",
								}}
							>
								{(dashboard?.shiftIntelligence?.roleQueues ?? [])
									.filter(
										// biome-ignore lint/suspicious/noExplicitAny: automated suppression
										(q: any) => q.role === activeQueueRole || showOtherQueues,
									)
									// biome-ignore lint/suspicious/noExplicitAny: automated suppression
									.map((queue: any) => (
										<article
											className={`role-queue-card ${queue.role === activeQueueRole ? "active" : ""}`}
											key={queue.role}
											style={{
												position: "relative",
												padding: "14px 16px",
												border:
													queue.role === activeQueueRole
														? "1px solid var(--teal-ring)"
														: "1px solid var(--line)",
												borderRadius: "12px",
												background:
													queue.role === activeQueueRole
														? "var(--teal-surface)"
														: "var(--paper)",
												boxShadow: "var(--shadow-1)",
												transition: "all 0.15s ease",
											}}
										>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: "space-between",
													gap: "8px",
												}}
											>
												<span
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: "6px",
														fontSize: "11px",
														fontWeight: 700,
														textTransform: "uppercase",
														letterSpacing: "0.06em",
														color:
															queue.role === activeQueueRole
																? "var(--teal-dark)"
																: "var(--muted)",
													}}
												>
													<UserCheck size={14} aria-hidden="true" />
													{/* Третий такой же случай: без словаря подписей
                                  заголовком карточки становился ключ роли —
                                  doctor, admin — латиницей и заглавными. */}
													{staffRoleLabels?.[queue.role] ?? "роль не подписана"}
												</span>
												{/* Голое число рядом с названием роли: глазами видно, что
                                это счётчик, а вслух читалось «АДМИНИСТРАТОР 3».
                                Единицу измерения даёт скрытая подпись с согласованием:
                                aria-label на <strong> часть читалок игнорирует, потому
                                что у элемента нет своей роли. */}
												<strong
													title={countLabel(
														queue.openItems ?? 0,
														"открытое дело",
														"открытых дела",
														"открытых дел",
													)}
													style={{
														fontSize: "22px",
														fontWeight: 800,
														color:
															queue.role === activeQueueRole
																? "var(--teal-dark)"
																: "var(--ink)",
														fontVariantNumeric: "tabular-nums",
													}}
												>
													<span aria-hidden="true">{queue.openItems}</span>
													<span className="sr-only">
														{countLabel(
															queue.openItems ?? 0,
															"открытое дело",
															"открытых дела",
															"открытых дел",
														)}
													</span>
												</strong>
											</div>
											<h3
												style={{
													margin: "8px 0 0",
													fontSize: "14px",
													fontWeight: 700,
													color: "var(--ink)",
													wordBreak: "break-word",
													lineHeight: 1.25,
												}}
											>
												{queue.title}
											</h3>
											<p
												style={{
													margin: "2px 0 0",
													fontSize: "12.5px",
													color: "var(--ink-2)",
													wordBreak: "break-word",
													lineHeight: 1.35,
												}}
											>
												{queue.nextAction}
											</p>
											<small
												style={{
													display: "block",
													marginTop: "8px",
													fontSize: "11.5px",
													color: "var(--muted)",
													wordBreak: "break-word",
													lineHeight: 1.3,
												}}
											>
												{queue.blockedBy?.[0] ?? queue.automationHint}
											</small>
										</article>
									))}
							</div>
						</>
					) : null}
				</section>
			</div>

			{/* FAB softphone clearance bottom spacer */}
			<div className="h-28 w-full shrink-0 pointer-events-none pb-28" aria-hidden="true" />
		</div>
	);
}

/**
 * СРЕДНИЙ УРОВЕНЬ РИСКА НЕ ПОКАЗЫВАЛСЯ НИКОГДА, И ЭТОТ `any` — ПРИЧИНА.
 *
 * Пропсы карточки были объявлены как `any`, поэтому компилятор не видел, что
 * `riskLevel` принимает только `low | watch | high` (patientInsightRiskSchema в
 * packages/shared/src/index.ts). Сравнение с несуществующим `"medium"` жило в
 * разметке молча: средний уровень оставался без цвета, а «Смена» выглядела
 * готовой, скрывая ровно тот случай, ради которого её и открывают утром.
 *
 * Типы взяты из формы `Dashboard`, а не переписаны рядом: второе объявление
 * снова рассинхронизировалось бы с контрактом, что и произошло здесь.
 */
type CockpitPatient = Dashboard["patients"][number];
type CockpitPatientInsight = Dashboard["patientInsights"][number];

export type PatientCockpitProps = {
	activePatient: CockpitPatient | null | undefined;
	activePatientInsight: CockpitPatientInsight | null | undefined;
	dashboard: Dashboard | null | undefined;
	/* Из этих трёх наборов карточка берёт только количество, поэтому и требует
     ровно массив: сузить до конкретной сущности значило бы соврать о том, что
     карточка читает её поля. */
	activeCommunicationTasks: readonly unknown[];
	activeImagingStudies: readonly unknown[];
	activeUsableDocuments: readonly unknown[];
};

export function PatientCockpit({
	activePatient,
	activePatientInsight,
	dashboard,
	activeCommunicationTasks,
	activeImagingStudies,
	activeUsableDocuments,
}: PatientCockpitProps) {
	if (!activePatient) {
		return (
			<section
				className="patient-cockpit dnt-cockpit"
				aria-label="Карточка пациента"
			>
				<div className="patient-summary-card">
					<p className="eyebrow" style={{ margin: "0 0 8px" }}>
						Карточка пациента
					</p>
					<h2>Пациент не выбран</h2>
					<div
						className="patient-facts"
						style={{
							marginTop: "8px",
							fontSize: "13px",
							color: "var(--muted)",
						}}
					>
						<span>
							Выберите пациента в списке или расписании, чтобы увидеть его
							данные.
						</span>
					</div>
					{/*
            Та же правка, что на экране приёма: подсказка называла раздел, но
            попасть в него из неё было нельзя. Якоря — тот же механизм, что у
            бокового меню (workspaceShell.tsx:388), второго способа навигации не
            заводим.
          */}
					<div
						style={{
							display: "flex",
							gap: "8px",
							flexWrap: "wrap",
							marginTop: "10px",
						}}
					>
						<a className="secondary-button min-h-[44px] px-3 py-2 flex items-center justify-center" href="#patients">
							Выбрать пациента
						</a>
						<a className="text-button min-h-[44px] px-3 py-2 flex items-center justify-center" href="#schedule">
							Открыть записи
						</a>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section
			className="patient-cockpit dnt-cockpit"
			aria-label="Карточка пациента"
		>
			<div className="patient-summary-card col-gap-16">
				<p
					className="eyebrow"
					style={{
						margin: 0,
						fontSize: "11px",
						fontWeight: 700,
						letterSpacing: "0.09em",
						textTransform: "uppercase",
						color: "var(--muted)",
					}}
				>
					Карточка пациента
				</p>
				<div className="patient-hero min-w-0">
					<PatientAvatar fullName={activePatient.fullName} size={44} />
					<div className="hero-info min-w-0">
						<h2 style={{ fontSize: "16px", wordBreak: "break-word", lineHeight: 1.25 }}>{activePatient.fullName}</h2>
						{/* Пациенту без id подставлялся номер карты «1042» — выдуманный
                    номер, которого нет ни в одной картотеке. Придумывать номер
                    нельзя: администратор станет искать по нему бумажную карту. */}
						<p
							style={{
								margin: "1px 0 0",
								fontSize: "12px",
								color: "var(--muted)",
								wordBreak: "break-word",
							}}
						>
							{activePatient.id
								? `карта № ${activePatient.id.slice(0, 6)}`
								: "номер карты не присвоен"}
						</p>
					</div>
				</div>

				<div
					className="patient-info-list"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "9px",
						fontSize: "13px",
						color: "var(--ink-2)",
						minWidth: 0,
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
						<Calendar
							size={14}
							style={{ color: "var(--muted)", flexShrink: 0 }}
						/>
						<span className="min-w-0 break-words">
							Дата рождения:{" "}
							<strong style={{ color: "var(--ink)", fontWeight: 600 }}>
								{birthDateLabel(activePatient.birthDate)}
							</strong>
						</span>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
						<Phone size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
						<span className="min-w-0 break-words">
							Телефон:{" "}
							<strong
								style={{
									color: "var(--ink)",
									fontWeight: 600,
									fontVariantNumeric: "tabular-nums",
								}}
							>
								{activePatient.phone ?? "не указан"}
							</strong>
						</span>
					</div>
					{activePatient.notes && (
						<div
							style={{
								display: "flex",
								alignItems: "flex-start",
								gap: "8px",
								minWidth: 0,
							}}
						>
							<Info
								size={14}
								style={{
									color: "var(--muted)",
									flexShrink: 0,
									marginTop: "2px",
								}}
							/>
							<span className="min-w-0 break-words leading-tight">
								Заметки:{" "}
								<strong style={{ color: "var(--ink)", fontWeight: 600 }}>
									{activePatient.notes}
								</strong>
							</span>
						</div>
					)}
				</div>

				{/* Сравнивалось с `"medium"`, которого в контракте нет: сервер
                отдаёт `watch` (apps/api/src/sampleData.ts, ветка расчёта
                riskLevel), а схема допускает только low | watch | high. Ветка
                среднего риска не выполнялась ни разу, и пациент «контроль»
                рисовался как «спокойно» — цветом бумаги. Подпись при этом
                стояла верная, поэтому дефект и не бросался в глаза. */}
				{activePatientInsight ? (
					<div
						className={`patient-insight-panel risk-${activePatientInsight.riskLevel}`}
						style={{
							padding: "12px 14px",
							borderRadius: "11px",
							background:
								activePatientInsight.riskLevel === "high"
									? "var(--bad-bg)"
									: activePatientInsight.riskLevel === "watch"
										? "var(--warn-bg)"
										: "var(--paper-soft)",
							border:
								"1px solid " +
								(activePatientInsight.riskLevel === "high"
									? "var(--bad-fg)"
									: activePatientInsight.riskLevel === "watch"
										? "var(--warn-fg)"
										: "var(--line)"),
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								marginBottom: "7px",
							}}
						>
							<span
								style={{
									fontSize: "10.5px",
									fontWeight: 800,
									textTransform: "uppercase",
									letterSpacing: "0.06em",
									color:
										activePatientInsight.riskLevel === "high"
											? "var(--bad-fg)"
											: activePatientInsight.riskLevel === "watch"
												? "var(--warn-fg)"
												: "var(--muted)",
									flexShrink: 0,
								}}
							>
								{/* Приведение `as keyof typeof` тоже убрано: с типизированными
                        пропсами ключ и так из того же перечисления, а приведение
                        как раз и прятало бы новое расхождение. */}
								{patientInsightRiskLabels[activePatientInsight.riskLevel]}
							</span>
							<strong style={{ fontSize: "12.5px", color: "var(--ink)", wordBreak: "break-word", lineHeight: 1.3 }}>
								{activePatientInsight.nextBestAction}
							</strong>
						</div>
						<div
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "6px",
								fontSize: "11.5px",
								fontWeight: 600,
							}}
						>
							{activePatientInsight.balanceDueRub ? (
								<span
									style={{
										background: "var(--paper)",
										padding: "3px 8px",
										borderRadius: "6px",
										border: "1px solid var(--line)",
										color: "var(--ink)",
									}}
								>
									💰 Долг {money(activePatientInsight.balanceDueRub)}
								</span>
							) : null}
							{activePatientInsight.openTasks > 0 ? (
								<span
									style={{
										background: "var(--paper)",
										padding: "3px 8px",
										borderRadius: "6px",
										border: "1px solid var(--line)",
										color: "var(--ink)",
									}}
								>
									📞{" "}
									{countLabel(
										activePatientInsight.openTasks,
										"задача",
										"задачи",
										"задач",
									)}{" "}
									на связь
								</span>
							) : null}
							{/* Было «📄 3 док-тов»: и сокращение, и неясно, есть они или их нет. */}
							{(activePatientInsight.missingDocumentKinds?.length ?? 0) > 0 ? (
								<span
									style={{
										background: "var(--paper)",
										padding: "3px 8px",
										borderRadius: "6px",
										border: "1px solid var(--line)",
										color: "var(--ink)",
									}}
								>
									📄 не хватает{" "}
									{countLabel(
										activePatientInsight.missingDocumentKinds?.length ?? 0,
										"документа",
										"документов",
										"документов",
									)}
								</span>
							) : null}
							{activePatientInsight.recallDueAt ? (
								<span
									style={{
										background: "var(--paper)",
										padding: "3px 8px",
										borderRadius: "6px",
										border: "1px solid var(--line)",
										color: "var(--ink)",
									}}
								>
									повторный визит{" "}
									{formatShortDate(activePatientInsight.recallDueAt)}
								</span>
							) : null}
						</div>
					</div>
				) : null}
			</div>

			<div className="patient-feature-grid">
				<button
					type="button"
					aria-label="Открыть ЭМК и историю"
					className="clickable-card min-h-[44px] p-3 min-w-0"
					style={{ textAlign: "left" }}
					onClick={() => {
						window.location.hash = "visit";
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							window.location.hash = "visit";
						}
					}}
				>
					<History aria-hidden="true" size={24} className="shrink-0" />
					<div className="min-w-0">
						<h3 className="break-words leading-tight">ЭМК / История</h3>
						<p className="tile-meta break-words leading-tight">Приёмы · диагнозы · зубная карта</p>
					</div>
				</button>
				<button
					type="button"
					aria-label="Открыть документы"
					className="clickable-card min-h-[44px] p-3 min-w-0"
					style={{ textAlign: "left" }}
					onClick={() => {
						window.location.hash = "documents";
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							window.location.hash = "documents";
						}
					}}
				>
					<FileText aria-hidden="true" size={24} className="shrink-0" />
					<div className="min-w-0">
						<h3 className="break-words leading-tight">Документы</h3>
						{/* Было «3 шт. по визиту», а на пустой карточке — «нет по визиту»:
                    сокращение из накладной и фраза, которая по-русски не строится. */}
						<p className="tile-meta break-words leading-tight">
							{(activeUsableDocuments?.length ?? 0) > 0
								? `${countLabel(activeUsableDocuments?.length ?? 0, "документ", "документа", "документов")} по визиту`
								: "по визиту документов нет"}
						</p>
					</div>
				</button>
				<button
					type="button"
					aria-label="Открыть оплаты"
					className="clickable-card min-h-[44px] p-3 min-w-0"
					style={{ textAlign: "left" }}
					onClick={() => {
						window.location.hash = "finance";
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							window.location.hash = "finance";
						}
					}}
				>
					<CreditCard aria-hidden="true" size={24} className="shrink-0" />
					<div className="min-w-0">
						<h3 className="break-words leading-tight">Оплаты</h3>
						{/*
                  Здесь стояло `?? 0`, и подмена случалась ДО money(), поэтому
                  общая правка форматирования этот экран не спасала. Плитка
                  печатала «0 ₽ · долг 0 ₽», пока дашборд не загружен, — а
                  `dashboard` по типу здесь `Dashboard | null | undefined`
                  (строка 618). Врач на своём главном экране читал «долг 0 ₽»
                  как «пациент рассчитался», хотя суммы просто ещё нет.
                  Без `?? 0` money() честно печатает «не определено».
                */}
						<p className="tile-meta break-words leading-tight">
							{money(dashboard?.billingSummary?.totalPaidRub)} · долг{" "}
							{money(dashboard?.billingSummary?.totalDueRub)}
						</p>
					</div>
				</button>
				<button
					type="button"
					aria-label="Открыть связь и задачи"
					className="clickable-card min-h-[44px] p-3 min-w-0"
					style={{ textAlign: "left" }}
					onClick={() => {
						window.location.hash = "communications";
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							window.location.hash = "communications";
						}
					}}
				>
					<MessageSquare aria-hidden="true" size={24} className="shrink-0" />
					<div className="min-w-0">
						<h3 className="break-words leading-tight">Связь</h3>
						<p className="tile-meta break-words leading-tight">
							{(activeCommunicationTasks?.length ?? 0) > 0
								? countLabel(
										activeCommunicationTasks?.length ?? 0,
										"задача",
										"задачи",
										"задач",
									)
								: "задач нет"}
						</p>
					</div>
				</button>
				<button
					type="button"
					aria-label="Открыть снимки пациента"
					className="clickable-card min-h-[44px] p-3 min-w-0"
					style={{ textAlign: "left" }}
					onClick={() => {
						window.location.hash = "imaging";
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							window.location.hash = "imaging";
						}
					}}
				>
					<ImageIcon aria-hidden="true" size={24} className="shrink-0" />
					<div className="min-w-0">
						<h3 className="break-words leading-tight">Снимки</h3>
						<p className="tile-meta break-words leading-tight">
							{(activeImagingStudies?.length ?? 0) > 0
								? countLabel(
										activeImagingStudies?.length ?? 0,
										"снимок",
										"снимка",
										"снимков",
									)
								: "снимков нет"}
						</p>
					</div>
				</button>
			</div>

			{/* FAB softphone clearance bottom spacer */}
			<div className="h-28 w-full shrink-0 pointer-events-none pb-28" aria-hidden="true" />
		</section>
	);
}
