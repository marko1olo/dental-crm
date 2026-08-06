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
import {
	formatShortDate,
	minutesLabel,
	money,
	patientInsightRiskLabels,
} from "./AppHelpers";
import { EmptyState } from "./components/EmptyState";
import { PatientAvatar } from "./components/PatientAvatar";
import { countLabel } from "./lib/russianPlural";
import { EmkControlBoard } from "./components/visit/EmkControlBoard";

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
	activePatientHasCallablePhone,
	activePatientCallablePhone,
	visibleRecommendedActions,
	recommendedActionPriorityLabels,
	staffRoleLabels,
	dashboard,
	activeQueueRole,
	setError,
	mostLoadedResource,
	setSelectedPatientId,
}: any) {
	const patientsById = useMemo(() => {
		const index = new Map<string, any>();
		for (const patient of dashboard?.patients ?? [])
			index.set(patient.id, patient);
		return index;
	}, [dashboard?.patients]);

	/**
	 * Пациент, который сейчас в кресле. Раньше карточка «Сейчас в работе»
	 * показывала `activePatient`, а он подставляет первого пациента из списка,
	 * когда открытого приёма нет вовсе. Клиника без единой записи видела
	 * «прием идет» с именем случайного человека — рядом с надписью
	 * «Приемов нет». Показываем только настоящий приём.
	 */
	const visitPatient = useMemo(() => {
		const visit = dashboard?.activeVisit;
		if (!visit || !visit.id || visit.id === NIL_UUID) return null;
		if (!visit.patientId || visit.patientId === NIL_UUID) return null;
		if (visit.status !== "draft") return null;
		return patientsById.get(visit.patientId) ?? null;
	}, [dashboard?.activeVisit, patientsById]);

	const visitPatientCallablePhone = (visitPatient?.phone ?? "")
		.trim()
		.replace(/[^\d+]/g, "");
	const visitPatientHasCallablePhone = visitPatientCallablePhone.length >= 5;

	const todayIso = dashboard?.todayIso || localCalendarDateString();

	/**
	 * Приёмы всей клиники на сегодня. Раньше список фильтровался по
	 * `activeDoctor`, а тот берётся из первого приёма в выдаче: владелец и
	 * администратор видели расписание одного произвольного врача под
	 * заголовком «Расписание приемов на сегодня».
	 */
	const todayAppointments = useMemo(() => {
		return (dashboard?.appointments ?? [])
			.filter((app: any) => calendarDateOfInstant(app.startsAt) === todayIso)
			.filter(
				(app: any) =>
					!["cancelled", "no_show"].includes(
						String(app.status ?? "").toLowerCase(),
					),
			)
			.sort((a: any, b: any) =>
				String(a.startsAt).localeCompare(String(b.startsAt)),
			);
	}, [dashboard?.appointments, todayIso]);

	const staffById = useMemo(() => {
		const index = new Map<string, any>();
		for (const member of dashboard?.clinicSettings?.staff ?? [])
			index.set(member.id, member);
		return index;
	}, [dashboard?.clinicSettings?.staff]);

	/** Фамилию врача в строке расписания показываем, только если врачей больше одного. */
	const manyDoctors = useMemo(
		() =>
			(dashboard?.clinicSettings?.staff ?? []).filter(
				(member: any) => member.active && member.role === "doctor",
			).length > 1,
		[dashboard?.clinicSettings?.staff],
	);

	/** Ближайший приём, который ещё не начался: с него начинается день. */
	const nextAppointment = useMemo(() => {
		const now = Date.now();
		return (
			todayAppointments.find((app: any) => {
				const ends = new Date(app.endsAt ?? app.startsAt).getTime();
				return Number.isFinite(ends) && ends >= now;
			}) ?? null
		);
	}, [todayAppointments]);

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
					.filter((member: any) => member.active)
					.map((member: any) => member.role),
			).size > 2,
		[dashboard?.clinicSettings?.staff],
	);

	const [showAnalytics, setShowAnalytics] = useState(false);
	const [showOtherQueues, setShowOtherQueues] = useState(false);

	/** Переход по срочному делу: раздел берём из самого дела, пациента подставляем. */
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
		<>
			<section className="shift-hero" id="shift">
				<div className="now-card">
					<div className="row-between">
						<p className="eyebrow">
							{visitPatient ? "Сейчас в кресле" : "Сейчас в работе"}
						</p>
						{visitPatient ? (
							<span className="status-pill status-in_treatment">
								<span className="pulse-dot" aria-hidden="true" />
								прием идет
							</span>
						) : null}
					</div>
					{visitPatient ? (
						<>
							<div className="patient-hero">
								<PatientAvatar fullName={visitPatient.fullName} size={44} />
								<div className="hero-info">
									<h2>{visitPatient.fullName}</h2>
									<p className="hero-phone">
										{visitPatient.phone ?? "телефон не указан"}
									</p>
								</div>
							</div>
							<div className="hero-actions">
								<button
									className="primary-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
									type="button"
									onClick={() => {
										setSelectedPatientId(visitPatient.id);
										window.location.hash = "visit";
									}}
								>
									<ClipboardCheck aria-hidden="true" /> Открыть прием
								</button>
								<button
									className="secondary-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
									type="button"
									onClick={() => {
										setSelectedPatientId(visitPatient.id);
										window.location.hash = "imaging";
									}}
								>
									<ImageIcon aria-hidden="true" /> Снимки
								</button>
								<button
									className="secondary-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
									type="button"
									aria-label="Позвонить пациенту"
									aria-describedby={
										!visitPatientHasCallablePhone
											? "shift-call-guidance"
											: undefined
									}
									aria-disabled={!visitPatientHasCallablePhone}
									title={
										visitPatientHasCallablePhone
											? "Позвонить пациенту"
											: "В карточке пациента нет телефона"
									}
									style={{ opacity: !visitPatientHasCallablePhone ? 0.6 : 1 }}
									onClick={() => {
										if (!visitPatientHasCallablePhone) {
											setError(
												"В карточке пациента нет телефона. Добавьте номер в разделе «Пациенты», чтобы позвонить.",
											);
											return;
										}
										window.location.href = `tel:${visitPatientCallablePhone}`;
									}}
								>
									<Phone aria-hidden="true" /> Позвонить
								</button>
							</div>

							{/* Compact Status Tracker */}
							<div className="status-flow">
								<span className="status-flow-label">Статус:</span>
								<div className="status-flow-steps">
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

							{!visitPatientHasCallablePhone ? (
								<p
									className="hero-call-guidance"
									id="shift-call-guidance"
									role="status"
									aria-live="polite"
								>
									В карточке пациента нет телефона. Откройте «Пациенты» и
									добавьте номер, чтобы кнопка звонка стала активной.
								</p>
							) : null}
						</>
					) : nextAppointment ? (
						<>
							<div className="patient-hero">
								<PatientAvatar
									fullName={nextAppointmentPatient?.fullName ?? "?"}
									size={44}
								/>
								<div className="hero-info">
									<h2>
										{nextAppointmentPatient?.fullName ?? "Пациент не найден"}
									</h2>
									<p className="hero-phone">
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
									className="primary-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
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
									className="secondary-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
									type="button"
									onClick={() => {
										window.location.hash = "schedule";
									}}
								>
									<Calendar aria-hidden="true" /> Все записи дня
								</button>
							</div>
							<p className="hero-call-guidance" role="status">
								Приём ещё не открыт. Нажмите «Начать прием», когда пациент сядет
								в кресло.
							</p>
						</>
					) : (
						<EmptyState
							icon={<ClipboardCheck size={28} />}
							title="Сейчас никого нет в кресле"
							description={
								todayAppointments.length > 0
									? "Все приемы на сегодня уже прошли. Откройте расписание, чтобы записать пациента на другой день."
									: "На сегодня записей нет. Нажмите «Записать пациента», чтобы поставить первую."
							}
							glass={false}
							style={{ padding: "20px 16px" }}
							action={
								<button
									className="primary-button"
									type="button"
									onClick={() => {
										window.location.hash = "schedule";
									}}
								>
									<CalendarPlus aria-hidden="true" size={16} /> Записать
									пациента
								</button>
							}
						/>
					)}
				</div>

				{/* РАСПИСАНИЕ НА СЕГОДНЯ */}
				<div className="today-schedule-box">
					<div className="today-schedule-header">
						<h3>
							<ClipboardCheck size={16} aria-hidden="true" /> Расписание приемов
							на сегодня
						</h3>
						<span className="today-schedule-count">
							{appointmentsCountLabel(todayAppointments.length)}
						</span>
					</div>
					{todayAppointments.length > 0 ? (
						<div className="today-schedule-list">
							{todayAppointments.map((app: any) => {
								const patient = patientsById.get(app.patientId);
								const isCurrent = Boolean(
									visitPatient && visitPatient.id === app.patientId,
								);
								const doctor = staffById.get(app.doctorUserId);

								const timeStart = formatClockTime(app.startsAt);
								const timeEnd = formatClockTime(app.endsAt);

								const statusKey = String(app.status || "").toLowerCase();
								const statusLabels: Record<string, string> = {
									planned: "запланирован",
									confirmed: "подтвержден",
									arrived: "ожидает",
									in_treatment: "на приеме",
									in_progress: "на приеме",
									completed: "завершен",
									cancelled: "отменен",
									no_show: "не пришел",
								};

								return (
									<div
										key={app.id}
										role="button"
										tabIndex={0}
										aria-label={`Прием: ${patient ? patient.fullName : "Неизвестный пациент"}, ${timeStart} – ${timeEnd}`}
										className={`today-schedule-item focus:ring-2 focus:ring-teal-600 focus:outline-none ${isCurrent ? "current-active" : ""}`}
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
										<div className="today-schedule-item-info">
											<span className="today-schedule-time">
												{timeStart} – {timeEnd}
											</span>
											<strong className="today-schedule-name">
												{patient ? patient.fullName : "Неизвестный пациент"}
											</strong>
											<span className="today-schedule-reason">
												{app.reason || "плановый осмотр"}
												{manyDoctors && doctor ? ` · ${doctor.fullName}` : ""}
											</span>
										</div>
										{/* Резервным значением был сам app.status — ключ базы
                            латиницей. Именно так на экран врача попали «Статус не
                            загружены»: неизвестный ключ печатался как есть. */}
										<span className={`status-pill status-${statusKey}`}>
											{statusLabels[statusKey] ?? "статус неизвестен"}
										</span>
									</div>
								);
							})}
						</div>
					) : (
						<EmptyState
							icon={<Calendar size={24} />}
							title="На сегодня записей нет"
							description="Свободный день. Запишите пациента — запись сразу появится здесь."
							glass={false}
							style={{ padding: "20px 16px" }}
							action={
								<button
									className="secondary-button"
									type="button"
									onClick={() => {
										window.location.hash = "schedule";
									}}
								>
									<CalendarPlus aria-hidden="true" size={16} /> Открыть
									расписание
								</button>
							}
						/>
					)}
				</div>
			</section>

			<div
				className="shift-dashboard-grid"
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "16px",
					marginTop: "16px",
				}}
			>
				<section className="shift-todo" aria-label="Что сделать сейчас">
					<div className="shift-todo-head">
						<h2>Что сделать сейчас</h2>
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
							{(visibleRecommendedActions ?? []).map((action: any) => {
								const patient = action.patientId
									? patientsById.get(action.patientId)
									: null;
								return (
									<li
										key={action.id}
										className={`shift-todo-item priority-${action.priority}`}
									>
										<span
											className={`shift-todo-priority priority-${action.priority}`}
										>
											{recommendedActionPriorityLabels?.[action.priority] ??
												"без пометки"}
										</span>
										<div className="shift-todo-text">
											<strong>{action.title}</strong>
											<p>{action.detail}</p>
											{patient ? (
												<span className="shift-todo-patient">
													{patient.fullName}
												</span>
											) : null}
										</div>
										<button
											className="secondary-button shift-todo-go"
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
						<EmptyState
							icon={<CheckCircle2 size={24} />}
							title="Срочных дел нет"
							description="Все приемы подписаны, снимки проверены, документы и оплаты закрыты. Новое дело появится здесь само."
							glass={false}
							style={{ padding: "18px 16px" }}
						/>
					)}
				</section>

				<section className="shift-emk-control" style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "14px", boxShadow: "var(--shadow-1)" }}>
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
									}}
								>
									Насколько режим клиники и загрузка кресел совпадают с планом
									на день
								</p>
							</div>
						</div>
						<button
							className="secondary-button"
							type="button"
							aria-expanded={showAnalytics}
							onClick={() => setShowAnalytics((v) => !v)}
							style={{
								minHeight: "30px",
								padding: "0 12px",
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
									<Building2 aria-hidden="true" />
									<div>
										<p className="eyebrow">Режим клиники</p>
										{/* «По умолчанию» — слово из настроек программы, а не ответ
                            на вопрос «какой у клиники режим». */}
										<h2 style={{ fontSize: "15px", margin: 0 }}>
											{dashboard?.shiftIntelligence?.modeFit?.title ??
												"Режим ещё не выбран"}
										</h2>
									</div>
									<strong
										style={{
											marginLeft: "auto",
											fontSize: "18px",
											color: "var(--teal-dark)",
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
									<Gauge aria-hidden="true" />
									<div>
										<p className="eyebrow">Загрузка</p>
										{/* «Нет ресурсов» — название сущности из базы. В клинике
                            загружены кресла и врачи, ресурсов там нет. */}
										<h2 style={{ fontSize: "15px", margin: 0 }}>
											{mostLoadedResource?.title ?? "Кресел и врачей нет"}
										</h2>
									</div>
									<strong
										style={{
											marginLeft: "auto",
											fontSize: "18px",
											color: "var(--teal-dark)",
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
									}}
								>
									Задачи по ролям
								</h3>
								{(dashboard?.shiftIntelligence?.roleQueues ?? []).length >
									1 && (
									<button
										className="text-button toggle-queues-btn"
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
									gridTemplateColumns: "repeat(3, 1fr)",
									gap: "12px",
								}}
							>
								{(dashboard?.shiftIntelligence?.roleQueues ?? [])
									.filter(
										(q: any) => q.role === activeQueueRole || showOtherQueues,
									)
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
												}}
											>
												{queue.title}
											</h3>
											<p
												style={{
													margin: "2px 0 0",
													fontSize: "12.5px",
													color: "var(--ink-2)",
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
		</>
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
						<a className="secondary-button" href="#patients">
							Выбрать пациента
						</a>
						<a className="text-button" href="#schedule">
							Открыть записи
						</a>
					</div>
				</div>
			</section>
		);
	}

	return (
		<>
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
					<div className="patient-hero">
						<PatientAvatar fullName={activePatient.fullName} size={44} />
						<div className="hero-info">
							<h2 style={{ fontSize: "16px" }}>{activePatient.fullName}</h2>
							{/* Пациенту без id подставлялся номер карты «1042» — выдуманный
                    номер, которого нет ни в одной картотеке. Придумывать номер
                    нельзя: администратор станет искать по нему бумажную карту. */}
							<p
								style={{
									margin: "1px 0 0",
									fontSize: "12px",
									color: "var(--muted)",
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
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<Calendar
								size={14}
								style={{ color: "var(--muted)", flexShrink: 0 }}
							/>
							<span>
								Дата рождения:{" "}
								<strong style={{ color: "var(--ink)", fontWeight: 600 }}>
									{birthDateLabel(activePatient.birthDate)}
								</strong>
							</span>
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<Phone
								size={14}
								style={{ color: "var(--muted)", flexShrink: 0 }}
							/>
							<span>
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
								<span>
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
									}}
								>
									{/* Приведение `as keyof typeof` тоже убрано: с типизированными
                        пропсами ключ и так из того же перечисления, а приведение
                        как раз и прятало бы новое расхождение. */}
									{patientInsightRiskLabels[activePatientInsight.riskLevel]}
								</span>
								<strong style={{ fontSize: "12.5px", color: "var(--ink)" }}>
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
								{activePatientInsight.missingDocumentKinds.length > 0 ? (
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
											activePatientInsight.missingDocumentKinds.length,
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
					<article
						role="button"
						tabIndex={0}
						aria-label="Открыть ЭМК и историю"
						className="clickable-card"
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
						<History aria-hidden="true" size={24} />
						<div>
							<h3>ЭМК / История</h3>
							<p className="tile-meta">Приёмы · диагнозы · зубная карта</p>
						</div>
					</article>
					<article
						role="button"
						tabIndex={0}
						aria-label="Открыть документы"
						className="clickable-card"
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
						<FileText aria-hidden="true" size={24} />
						<div>
							<h3>Документы</h3>
							{/* Было «3 шт. по визиту», а на пустой карточке — «нет по визиту»:
                    сокращение из накладной и фраза, которая по-русски не строится. */}
							<p className="tile-meta">
								{activeUsableDocuments.length > 0
									? `${countLabel(activeUsableDocuments.length, "документ", "документа", "документов")} по визиту`
									: "по визиту документов нет"}
							</p>
						</div>
					</article>
					<article
						role="button"
						tabIndex={0}
						aria-label="Открыть оплаты"
						className="clickable-card"
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
						<CreditCard aria-hidden="true" size={24} />
						<div>
							<h3>Оплаты</h3>
							{/*
                  Здесь стояло `?? 0`, и подмена случалась ДО money(), поэтому
                  общая правка форматирования этот экран не спасала. Плитка
                  печатала «0 ₽ · долг 0 ₽», пока дашборд не загружен, — а
                  `dashboard` по типу здесь `Dashboard | null | undefined`
                  (строка 618). Врач на своём главном экране читал «долг 0 ₽»
                  как «пациент рассчитался», хотя суммы просто ещё нет.
                  Без `?? 0` money() честно печатает «не определено».
                */}
							<p className="tile-meta">
								{money(dashboard?.billingSummary?.totalPaidRub)} · долг{" "}
								{money(dashboard?.billingSummary?.totalDueRub)}
							</p>
						</div>
					</article>
					<article
						role="button"
						tabIndex={0}
						aria-label="Открыть связь и задачи"
						className="clickable-card"
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
						<MessageSquare aria-hidden="true" size={24} />
						<div>
							<h3>Связь</h3>
							<p className="tile-meta">
								{activeCommunicationTasks.length > 0
									? countLabel(
											activeCommunicationTasks.length,
											"задача",
											"задачи",
											"задач",
										)
									: "задач нет"}
							</p>
						</div>
					</article>
					<article
						role="button"
						tabIndex={0}
						aria-label="Открыть снимки пациента"
						className="clickable-card"
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
						<ImageIcon aria-hidden="true" size={24} />
						<div>
							<h3>Снимки</h3>
							<p className="tile-meta">
								{activeImagingStudies.length > 0
									? countLabel(
											activeImagingStudies.length,
											"снимок",
											"снимка",
											"снимков",
										)
									: "снимков нет"}
							</p>
						</div>
					</article>
				</div>
			</section>
		</>
	);
}
