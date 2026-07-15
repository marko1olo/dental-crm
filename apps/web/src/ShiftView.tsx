import {
	AlertTriangle,
	Building2,
	Calendar,
	ChevronDown,
	ChevronUp,
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
import { ActionIcon } from "./workspaceShell";
import { workloadStateLabels } from "./workspaceUiLabels";

export function ShiftView({
	activePatient,
	activePatientHasCallablePhone,
	activePatientCallablePhone,
	visibleRecommendedActions,
	recommendedActionPriorityLabels,
	staffRoleLabels,
	selectedWorkspaceRole,
	activeRoleQueue,
	activeRolePolicy,
	activeRoleWritableSections,
	viewLabels,
	activeRoleRestrictedSections,
	dashboard,
	activeQueueRole,
	shiftWarnings,
	warningSeverityLabels,
	openScheduleWarning,
	setError,
	mostLoadedResource,
	setSelectedPatientId,
	activeDoctor,
}: any) {
	const doctorTodayAppointments = useMemo(() => {
		if (!dashboard || !dashboard.appointments || !activeDoctor) return [];
		return dashboard.appointments
			.filter((app: any) => app.doctorUserId === activeDoctor.id)
			.sort((a: any, b: any) => a.startsAt.localeCompare(b.startsAt));
	}, [dashboard, activeDoctor]);

	const [showDetails, setShowDetails] = useState(false);
	const [showAnalytics, setShowAnalytics] = useState(false);
	const [showOtherQueues, setShowOtherQueues] = useState(false);
	return (
		<>
			<section className="shift-hero" id="shift">
				<div className="now-card">
					<p className="eyebrow">Сейчас в работе</p>
					{activePatient ? (
						<>
							<div className="patient-hero">
								<div className="avatar">
									{activePatient.fullName.slice(0, 1)}
								</div>
								<div>
									<h2>{activePatient.fullName}</h2>
									<p>{activePatient.phone ?? "телефон не указан"}</p>
								</div>
							</div>
							<div
								className="hero-actions"
								style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
							>
								<button
									className="primary-button"
									type="button"
									onClick={() => {
										window.location.hash = "visit";
									}}
								>
									<ClipboardCheck aria-hidden="true" /> Открыть прием
								</button>
								<button
									className="secondary-button"
									type="button"
									onClick={() => {
										window.location.hash = "imaging";
									}}
								>
									<ImageIcon aria-hidden="true" /> Снимки
								</button>
								<button
									className="secondary-button"
									type="button"
									aria-describedby={
										!activePatientHasCallablePhone
											? "shift-call-guidance"
											: undefined
									}
									aria-disabled={!activePatientHasCallablePhone}
									title={
										activePatientHasCallablePhone
											? "Позвонить пациенту"
											: "В карточке пациента нет телефона"
									}
									style={{ opacity: !activePatientHasCallablePhone ? 0.6 : 1 }}
									onClick={() => {
										if (!activePatientHasCallablePhone) {
											setError(
												"В карточке пациента нет телефона. Добавьте номер в разделе «Пациенты», чтобы позвонить.",
											);
											return;
										}
										window.location.href = `tel:${activePatientCallablePhone}`;
									}}
								>
									<Phone aria-hidden="true" /> Позвонить
								</button>
							</div>

							{/* Compact Status Tracker */}
							<div
								style={{
									display: "flex",
									gap: "12px",
									marginTop: "16px",
									padding: "8px 12px",
									alignItems: "center",
								}}
								className="glass-panel"
							>
								<span
									style={{
										fontSize: "12px",
										fontWeight: 600,
										color: "var(--muted)",
									}}
								>
									Статус:
								</span>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "4px",
										fontSize: "12px",
									}}
								>
									<span style={{ color: "var(--teal)", fontWeight: 600 }}>
										1. Запись
									</span>
									<span style={{ color: "var(--muted)" }}>→</span>
									<span
										style={{
											color: dashboard.activeVisit
												? "var(--teal)"
												: "var(--muted)",
											fontWeight: dashboard.activeVisit ? 600 : 400,
										}}
									>
										2. ЭМК
									</span>
									<span style={{ color: "var(--muted)" }}>→</span>
									<span style={{ color: "var(--muted)" }}>3. Оплата</span>
								</div>
							</div>

							{!activePatientHasCallablePhone ? (
								<p
									className="hero-call-guidance"
									id="shift-call-guidance"
									role="status"
									aria-live="polite"
									style={{ marginTop: "12px" }}
								>
									В карточке пациента нет телефона. Откройте «Пациенты» и
									добавьте номер, чтобы кнопка звонка стала активной.
								</p>
							) : null}
						</>
					) : (
						<div
							style={{ padding: "20px 0", color: "#6b7280", fontSize: "15px" }}
						>
							Нет активного приема. Выберите пациента или запланируйте запись в
							расписании.
						</div>
					)}
				</div>

				{/* РАСПИСАНИЕ НА СЕГОДНЯ */}
				<div className="today-schedule-box">
					<h3>
						<ClipboardCheck size={16} color="var(--teal)" /> Расписание приемов
						на сегодня
					</h3>
					{doctorTodayAppointments.length > 0 ? (
						<div
							className="today-schedule-list"
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "8px",
								maxHeight: "280px",
								overflowY: "auto",
								paddingRight: "4px",
							}}
						>
							{doctorTodayAppointments.map((app: any) => {
								const patient = dashboard.patients.find(
									(p: any) => p.id === app.patientId,
								);
								const isCurrent =
									activePatient && activePatient.id === app.patientId;

								const timeStart = new Date(app.startsAt).toLocaleTimeString(
									"ru-RU",
									{ hour: "2-digit", minute: "2-digit" },
								);
								const timeEnd = new Date(app.endsAt).toLocaleTimeString(
									"ru-RU",
									{ hour: "2-digit", minute: "2-digit" },
								);

								const statusLabels: Record<string, string> = {
									planned: "запланирован",
									confirmed: "подтвержден",
									arrived: "ожидает",
									in_treatment: "на приеме",
									completed: "завершен",
									cancelled: "отменен",
									no_show: "не пришел",
								};

								return (
									<div
										key={app.id}
										className={`today-schedule-item ${isCurrent ? "current-active" : ""}`}
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "flex-start",
											padding: "16px",
											cursor: "pointer",
											transition: "all 0.2s ease",
										}}
										onClick={() => {
											if (patient) {
												setSelectedPatientId(patient.id);
												window.location.hash = "visit";
											}
										}}
									>
										<div
											className="today-schedule-item-info"
											style={{
												display: "flex",
												flexDirection: "column",
												gap: "4px",
											}}
										>
											<span
												className="today-schedule-time"
												style={{
													fontSize: "12px",
													fontWeight: 600,
													color: "var(--teal)",
												}}
											>
												{timeStart} – {timeEnd}
											</span>
											<strong
												className="today-schedule-name"
												style={{ fontSize: "14px", color: "var(--ink)" }}
											>
												{patient ? patient.fullName : "Неизвестный пациент"}
											</strong>
											<span
												className="today-schedule-reason"
												style={{ fontSize: "13px", color: "var(--muted)" }}
											>
												{app.reason || "плановый осмотр"}
											</span>
										</div>
										<span
											style={{
												fontSize: "11px",
												fontWeight: 600,
												textTransform: "uppercase",
												padding: "4px 8px",
												borderRadius: "4px",
												background:
													app.status === "in_treatment"
														? "var(--green-soft)"
														: app.status === "planned"
															? "var(--paper-strong)"
															: "var(--amber-soft)",
												color:
													app.status === "in_treatment"
														? "var(--green)"
														: app.status === "planned"
															? "var(--muted)"
															: "var(--amber)",
											}}
										>
											{statusLabels[app.status] || app.status}
										</span>
									</div>
								);
							})}
						</div>
					) : (
						<p className="today-schedule-empty">
							Сегодня у вас нет запланированных приемов.
						</p>
					)}
				</div>
			</section>

			{/* Removed care path tracker */}

			<div
				className="shift-dashboard-grid"
				style={{
					display: "grid",
					gridTemplateColumns: "1fr",
					gap: "16px",
					marginTop: "16px",
				}}
			>
				<>
					<section className="role-focus-strip" aria-label="Фокус текущей роли">
						<div>
							<UserCheck aria-hidden="true" />
							<div>
								<p className="eyebrow">
									Фокус: {staffRoleLabels[selectedWorkspaceRole]}
								</p>
								<h2>
									{activeRoleQueue?.title ??
										activeRolePolicy?.title ??
										"Рабочая очередь"}
								</h2>
								<p>
									{activeRoleQueue?.nextAction ??
										activeRolePolicy?.requiresApprovalFor?.[0] ??
										"Анализ задач завершен"}
								</p>
							</div>
						</div>
						<div
							className="role-focus-meta flex flex-wrap gap-2 justify-start mt-2"
							aria-label="Доступы текущей роли"
						>
							<span className="bg-[var(--paper)] text-[var(--ink)] px-2 py-1 rounded-full text-xs font-bold border border-[var(--line-strong)]">
								{activeRoleQueue?.openItems ?? 0} открыто
							</span>
							{activeRolePolicy ? (
								<span className="bg-[var(--paper)] text-[var(--ink)] px-2 py-1 rounded-full text-xs font-bold border border-[var(--line-strong)]">
									Старт: {viewLabels[activeRolePolicy.defaultSection]}
								</span>
							) : null}
							{activeRoleWritableSections.slice(0, 3).map((section: any) => (
								<span
									key={section}
									className="bg-[var(--paper)] text-[var(--ink)] px-2 py-1 rounded-full text-xs font-bold border border-[var(--line-strong)]"
								>
									пишет: {viewLabels[section]}
								</span>
							))}
							{activeRoleRestrictedSections?.[0] ? (
								<span className="bg-red-500/20 text-red-500 px-2 py-1 rounded-md text-xs">
									{activeRoleRestrictedSections[0]} недоступна
								</span>
							) : (
								<span className="bg-green-500/20 text-green-500 px-2 py-1 rounded-md text-xs">
									Доступ открыт
								</span>
							)}
						</div>
					</section>

					<section
						className="shift-intelligence"
						aria-label="Операционный контроль смены"
					>
						<div
							className="analytics-toggle-container"
							style={{ gridColumn: "1 / -1" }}
						>
							<button
								className="secondary-button"
								type="button"
								aria-expanded={showAnalytics}
								onClick={() => setShowAnalytics((v) => !v)}
								style={{
									minHeight: "30px",
									padding: "0 12px",
									fontSize: "12px",
								}}
							>
								{showAnalytics ? "Скрыть аналитику" : "Показать аналитику"}
							</button>
						</div>

						{showAnalytics && (
							<>
								{dashboard?.shiftIntelligence?.modeFit && (
									<article className="mode-fit-card">
										<div className="mode-fit-head">
											<Building2 aria-hidden="true" />
											<div>
												<p className="eyebrow">Режим клиники</p>
												<h2>
													{dashboard.shiftIntelligence.modeFit.title ?? "—"}
												</h2>
											</div>
											<strong>
												{dashboard.shiftIntelligence.modeFit.fitScore ?? 0}%
											</strong>
										</div>
										<p>
											{dashboard.shiftIntelligence.modeFit
												.lowFrictionNextStep ?? ""}
										</p>
										<div className="mode-fit-list">
											{(
												(dashboard.shiftIntelligence.modeFit.blockers?.length
													? dashboard.shiftIntelligence.modeFit.blockers
													: dashboard.shiftIntelligence.modeFit.upgrades) ?? []
											).map((item: any) => (
												<span key={item}>{item}</span>
											))}
										</div>
									</article>
								)}

								<article className="mode-fit-card resource-focus-card">
									<div className="mode-fit-head">
										<Gauge aria-hidden="true" />
										<div>
											<p className="eyebrow">Загрузка</p>
											<h2>{mostLoadedResource?.title ?? "Нет ресурсов"}</h2>
										</div>
										<strong>
											{mostLoadedResource
												? `${mostLoadedResource.utilizationPercent}%`
												: "0%"}
										</strong>
									</div>
									{mostLoadedResource ? (
										<>
											<p>
												{minutesLabel(mostLoadedResource.bookedMinutes)} ·{" "}
												{mostLoadedResource.appointmentCount} записей ·{" "}
												{
													workloadStateLabels[
														mostLoadedResource.state as keyof typeof workloadStateLabels
													]
												}
											</p>
											<div
												className="load-meter"
												aria-label={`Загрузка ${mostLoadedResource.utilizationPercent}%`}
											>
												<span
													style={{
														width: `${Math.min(100, mostLoadedResource.utilizationPercent)}%`,
													}}
												/>
											</div>
											<div className="mode-fit-list">
												{mostLoadedResource.flags
													.slice(0, 3)
													.map((flag: any) => (
														<span key={flag}>{flag}</span>
													))}
											</div>
										</>
									) : (
										<p>Врачей и кресел пока нет в настройках.</p>
									)}
								</article>
							</>
						)}

						<div className="role-queue-header-row">
							<h3>Задачи по ролям</h3>
							{(dashboard?.shiftIntelligence?.roleQueues?.length || 0) > 1 && (
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

						<div className="role-queue-grid">
							{(dashboard?.shiftIntelligence?.roleQueues || [])
								.filter(
									(q: any) => showOtherQueues || q.role === activeQueueRole,
								)
								.map((queue: any) => (
									<article
										className={`role-queue-card ${queue.role === activeQueueRole ? "active" : ""}`}
										key={queue.role}
									>
										<div>
											<UserCheck aria-hidden="true" />
											<span>{staffRoleLabels[queue.role]}</span>
										</div>
										<h3>{queue.title}</h3>
										<p>{queue.nextAction}</p>
										<strong>{queue.openItems}</strong>
										<small>
											{queue.blockedBy?.[0] ?? queue.automationHint}
										</small>
									</article>
								))}
						</div>

						{/* Removed shift warning list */}
					</section>
				</>
			</div>
		</>
	);
}

export function PatientCockpit({
	activePatient,
	activePatientInsight,
	dashboard,
	activeCommunicationTasks,
	activeImagingStudies,
	activeUsableDocuments,
}: any) {
	if (!activePatient) {
		return (
			<section className="patient-cockpit" aria-label="Карточка пациента">
				<div className="patient-summary-card">
					<p className="eyebrow">Карточка пациента</p>
					<h2>Пациент не выбран</h2>
					<div className="patient-facts">
						<span>
							Выберите пациента в списке или расписании, чтобы увидеть его
							данные.
						</span>
					</div>
				</div>
			</section>
		);
	}

	return (
		<>
			<section className="patient-cockpit" aria-label="Карточка пациента">
				<div className="patient-summary-card">
					<p className="eyebrow">Карточка пациента</p>
					<h2>{activePatient.fullName}</h2>
					<div
						className="patient-info-list"
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "12px",
							border: "none",
							background: "transparent",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								color: "var(--text-secondary)",
								fontSize: "14px",
							}}
						>
							<Calendar size={16} />
							<span>
								Дата рождения:{" "}
								<strong style={{ color: "var(--text-primary)" }}>
									{activePatient.birthDate ?? "не указана"}
								</strong>
							</span>
						</div>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								color: "var(--text-secondary)",
								fontSize: "14px",
							}}
						>
							<Phone size={16} />
							<span>
								Телефон:{" "}
								<strong style={{ color: "var(--text-primary)" }}>
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
									color: "var(--text-secondary)",
									fontSize: "14px",
								}}
							>
								<Info size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
								<span>
									Заметки:{" "}
									<strong style={{ color: "var(--text-primary)" }}>
										{activePatient.notes}
									</strong>
								</span>
							</div>
						)}
					</div>
					{activePatientInsight ? (
						<div
							className={`patient-insight-panel risk-${activePatientInsight.riskLevel}`}
							style={{
								padding: "16px",
								borderRadius: "8px",
								background:
									activePatientInsight.riskLevel === "high"
										? "var(--red-soft)"
										: activePatientInsight.riskLevel === "medium"
											? "var(--amber-soft)"
											: "var(--paper-strong)",
								border:
									"1px solid " +
									(activePatientInsight.riskLevel === "high"
										? "var(--red)"
										: activePatientInsight.riskLevel === "medium"
											? "var(--amber)"
											: "var(--line)"),
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									marginBottom: "8px",
								}}
							>
								<span
									style={{
										fontSize: "11px",
										fontWeight: 600,
										textTransform: "uppercase",
										color:
											activePatientInsight.riskLevel === "high"
												? "var(--red)"
												: activePatientInsight.riskLevel === "medium"
													? "var(--amber)"
													: "var(--muted)",
									}}
								>
									{
										patientInsightRiskLabels[
											activePatientInsight.riskLevel as keyof typeof patientInsightRiskLabels
										]
									}
								</span>
								<strong style={{ fontSize: "13px", color: "#1e293b" }}>
									{activePatientInsight.nextBestAction}
								</strong>
							</div>
							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									gap: "6px",
									fontSize: "12px",
									fontWeight: 500,
								}}
							>
								{activePatientInsight.balanceDueRub ? (
									<span
										style={{
											background: "var(--paper)",
											padding: "4px 8px",
											borderRadius: "4px",
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
											padding: "4px 8px",
											borderRadius: "4px",
											border: "1px solid var(--line)",
											color: "var(--ink)",
										}}
									>
										📞 {activePatientInsight.openTasks} задач
									</span>
								) : null}
								{activePatientInsight.missingDocumentKinds.length > 0 ? (
									<span
										style={{
											background: "var(--paper)",
											padding: "4px 8px",
											borderRadius: "4px",
											border: "1px solid var(--line)",
											color: "var(--ink)",
										}}
									>
										📄 {activePatientInsight.missingDocumentKinds.length}{" "}
										док-тов нет
									</span>
								) : null}
								{activePatientInsight.recallDueAt ? (
									<span
										style={{
											background: "var(--paper)",
											padding: "4px 8px",
											borderRadius: "4px",
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
						className="clickable-card glass-panel"
						onClick={() => {
							window.location.hash = "visit";
						}}
						style={{ cursor: "pointer", padding: "24px" }}
					>
						<History aria-hidden="true" />
						<div>
							<h3>ЭМК / История</h3>
							<p className="tile-meta">Приёмы · диагнозы · зубная карта</p>
						</div>
					</article>
					<article
						className="clickable-card glass-panel"
						onClick={() => {
							window.location.hash = "documents";
						}}
						style={{ cursor: "pointer", padding: "24px" }}
					>
						<FileText aria-hidden="true" />
						<div>
							<h3>Документы</h3>
							<p className="tile-meta">
								{activeUsableDocuments.length > 0
									? `${activeUsableDocuments.length} шт.`
									: "нет"}{" "}
								по визиту
							</p>
						</div>
					</article>
					<article
						className="clickable-card glass-panel"
						onClick={() => {
							window.location.hash = "finance";
						}}
						style={{ cursor: "pointer", padding: "24px" }}
					>
						<CreditCard aria-hidden="true" />
						<div>
							<h3>Оплаты</h3>
							<p className="tile-meta">
								{money(dashboard.billingSummary.totalPaidRub)} · долг{" "}
								{money(dashboard.billingSummary.totalDueRub)}
							</p>
						</div>
					</article>
					<article
						className="clickable-card glass-panel"
						onClick={() => {
							window.location.hash = "communications";
						}}
						style={{ cursor: "pointer", padding: "24px" }}
					>
						<MessageSquare aria-hidden="true" />
						<div>
							<h3>Связь</h3>
							<p className="tile-meta">
								{activeCommunicationTasks.length > 0
									? `${activeCommunicationTasks.length} задач`
									: "задач нет"}
							</p>
						</div>
					</article>
					<article
						className="clickable-card glass-panel"
						onClick={() => {
							window.location.hash = "imaging";
						}}
						style={{ cursor: "pointer", padding: "24px" }}
					>
						<ImageIcon aria-hidden="true" />
						<div>
							<h3>Снимки</h3>
							<p className="tile-meta">
								{activeImagingStudies.length > 0
									? `${activeImagingStudies.length} снимка`
									: "снимков нет"}
							</p>
						</div>
					</article>
				</div>
			</section>
		</>
	);
}
