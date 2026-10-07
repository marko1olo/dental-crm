import React, { useMemo, useState } from "react";
import {
	Calendar,
	CalendarPlus,
	ClipboardCheck,
	CreditCard,
	Monitor,
	UserCheck,
} from "lucide-react";
import { countLabel } from "../../lib/russianPlural";

export interface DoctorShiftVisitsKpiSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly todayAppointments: readonly any[];
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly inChairAppointments: readonly any[];
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly waitingAppointments: readonly any[];
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly awaitingPaymentAppointments: readonly any[];
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly patientsById: Map<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly staffById: Map<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly currentPatient?: any | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly inChairAppointment?: any | null | undefined;
	readonly manyDoctors?: boolean | undefined;
	readonly onSelectPatient?: ((patientId: string) => void) | undefined;
	readonly onOpenAppointmentEmk?: ((patientId: string) => void) | undefined;
	readonly onOpenCashier?: ((patientId: string) => void) | undefined;
	readonly onOpenQueueBoardModal?: (() => void) | undefined;
	readonly onOpenSchedule?: (() => void) | undefined;
	readonly className?: string | undefined;
}

function appointmentsCountLabel(count: number): string {
	return countLabel(count, "прием", "приема", "приемов");
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

/**
 * DoctorShiftVisitsKpiSection — Сводка визитов врача за смену и KPI (StomX оперативная доска).
 *
 * Инварианты:
 * 1. Сегментированный контроль очередей смены: Все, В кресле, Ожидает приёма, Ожидает оплаты.
 * 2. 1-клик кнопки перехода: «В кресло», «ЭМК», «На кассу» без лишней модальной бюрократии.
 * 3. 0% эмодзи, строгие векторные иконки Lucide.
 * 4. Плотная эргономика рабочего места врача (Mandate 8d, Studio Clinical HIG).
 */
export const DoctorShiftVisitsKpiSection: React.FC<DoctorShiftVisitsKpiSectionProps> = ({
	todayAppointments,
	inChairAppointments,
	waitingAppointments,
	awaitingPaymentAppointments,
	patientsById,
	staffById,
	currentPatient,
	inChairAppointment,
	manyDoctors = false,
	onSelectPatient,
	onOpenAppointmentEmk,
	onOpenCashier,
	onOpenQueueBoardModal,
	onOpenSchedule,
	className = "",
}) => {
	const [queueFilter, setQueueFilter] = useState<
		"all" | "in_chair" | "waiting" | "payment"
	>("all");

	const displayedAppointments = useMemo(() => {
		if (queueFilter === "in_chair") return inChairAppointments;
		if (queueFilter === "waiting") return waitingAppointments;
		if (queueFilter === "payment") return awaitingPaymentAppointments;
		return todayAppointments;
	}, [
		queueFilter,
		todayAppointments,
		inChairAppointments,
		waitingAppointments,
		awaitingPaymentAppointments,
	]);

	return (
		<div
			className={`today-schedule-box min-w-0 ${className}`.trim()}
			data-testid="doctor-shift-visits-kpi-section"
		>
			<div className="today-schedule-header">
				<h3 style={{ color: "var(--ink)" }}>
					<ClipboardCheck size={16} aria-hidden="true" /> Журнал приёмов за смену
				</h3>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<span className="today-schedule-count">
						{appointmentsCountLabel(todayAppointments.length)}
					</span>
					{onOpenQueueBoardModal && (
						<button
							type="button"
							className="secondary-button"
							style={{
								fontSize: "11.5px",
								padding: "3px 8px",
								minHeight: "28px",
								display: "inline-flex",
								alignItems: "center",
								gap: "4px",
							}}
							onClick={onOpenQueueBoardModal}
							title="Открыть интерактивную доску очереди и ТВ-табло"
							data-testid="btn-open-today-queue-board"
						>
							<Monitor size={13} aria-hidden="true" /> Доска очереди
						</button>
					)}
					{onOpenSchedule && (
						<button
							type="button"
							className="secondary-button"
							style={{
								fontSize: "11.5px",
								padding: "3px 8px",
								minHeight: "28px",
								display: "inline-flex",
								alignItems: "center",
								gap: "4px",
							}}
							onClick={onOpenSchedule}
							title="Перейти к полной сетке расписания"
						>
							<Calendar size={13} aria-hidden="true" /> В расписание →
						</button>
					)}
				</div>
			</div>

			{/* Queue Filter Tabs */}
			<div
				className="stomx-queue-strip"
				role="tablist"
				aria-label="Очереди приёмов смены"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					overflowX: "auto",
					paddingBottom: "6px",
					marginBottom: "10px",
				}}
			>
				{(
					[
						{ id: "all", label: `Все (${todayAppointments.length})`, activeBg: "var(--teal-dark, #0d9488)" },
						{ id: "in_chair", label: `В кресле (${inChairAppointments.length})`, activeBg: "var(--teal-dark, #0f766e)" },
						{ id: "waiting", label: `Ожидают (${waitingAppointments.length})`, activeBg: "var(--warn-fg, #b45309)" },
						{ id: "payment", label: `Оплата (${awaitingPaymentAppointments.length})`, activeBg: "var(--teal-dark, #0d9488)" },
					] as const
				).map((pill) => (
					<button
						key={pill.id}
						type="button"
						role="tab"
						aria-selected={queueFilter === pill.id}
						className={`filter-pill ${queueFilter === pill.id ? "active" : ""}`}
						style={{
							fontSize: "12px",
							padding: "4px 10px",
							borderRadius: "8px",
							fontWeight: queueFilter === pill.id ? 700 : 500,
							background: queueFilter === pill.id ? pill.activeBg : "var(--paper-soft, rgba(0,0,0,0.04))",
							color: queueFilter === pill.id ? "#ffffff" : "var(--ink)",
							border: "1px solid var(--line)",
							cursor: "pointer",
							whiteSpace: "nowrap",
						}}
						onClick={() => setQueueFilter(pill.id)}
					>
						{pill.label}
					</button>
				))}
			</div>

			{displayedAppointments.length > 0 ? (
				<div className="today-schedule-list">
					{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
					{displayedAppointments.map((app: any) => {
						const patient = patientsById.get(app.patientId);
						const isCurrent = Boolean(
							currentPatient &&
								(currentPatient.id === app.patientId ||
									(inChairAppointment && inChairAppointment.id === app.id)),
						);
						const doctor = staffById.get(app.doctorUserId);

						const timeStart = formatClockTime(app.startsAt);
						const timeEnd = formatClockTime(app.endsAt);

						const statusRaw =
							app.status || app.appointmentStatus || app.state || "planned";
						const statusKey = String(statusRaw).toLowerCase();
						const statusLabels: Record<string, string> = {
							planned: "Ожидает приема",
							scheduled: "Ожидает приема",
							pending: "Ожидает приема",
							confirmed: "Подтвержден",
							arrived: "Ожидает приема",
							waiting: "Ожидает приема",
							in_chair: "На приеме",
							in_treatment: "На приеме",
							in_progress: "На приеме",
							completed: "Завершен",
							done: "Завершен",
							cancelled: "Отменен",
							no_show: "Не пришел",
						};

						const isInChair = [
							"in_chair",
							"in_treatment",
							"in_progress",
						].includes(statusKey);
						const isDone = ["completed", "done"].includes(statusKey);

						return (
							<div
								key={app.id}
								className={`today-schedule-item min-h-[44px] py-2 px-3 min-w-0 ${isCurrent ? "current-active" : ""}`}
								style={{ width: "100%", borderRadius: "8px" }}
							>
								<div
									className="today-schedule-item-info min-w-0 flex-1 cursor-pointer"
									onClick={() => {
										if (patient && onOpenAppointmentEmk) {
											onOpenAppointmentEmk(patient.id);
										}
									}}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (
											(e.key === "Enter" || e.key === " ") &&
											patient &&
											onOpenAppointmentEmk
										) {
											e.preventDefault();
											onOpenAppointmentEmk(patient.id);
										}
									}}
								>
									<span className="today-schedule-time shrink-0">
										{timeStart} – {timeEnd}
									</span>
									<strong
										className="today-schedule-name break-words leading-tight"
										style={{ color: "var(--ink)" }}
									>
										{patient ? patient.fullName : "Неизвестный пациент"}
									</strong>
									<span className="today-schedule-reason break-words leading-tight">
										{app.reason || "плановый осмотр"}
										{manyDoctors && doctor ? ` · ${doctor.fullName}` : ""}
									</span>
								</div>

								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "6px",
										flexShrink: 0,
									}}
								>
									<span className={`status-pill status-${statusKey} shrink-0`}>
										{statusLabels[statusKey] ?? "Ожидает приема"}
									</span>

									{/* 1-Click Action Buttons */}
									{isDone ? (
										<button
											type="button"
											className="secondary-button"
											style={{
												fontSize: "11px",
												padding: "3px 7px",
												minHeight: "26px",
												display: "inline-flex",
												alignItems: "center",
												gap: "4px",
											}}
											onClick={() => {
												if (patient && onOpenCashier) {
													onOpenCashier(patient.id);
												}
											}}
											title="Перейти к оплате на кассе"
										>
											<CreditCard size={12} aria-hidden="true" /> На кассу
										</button>
									) : isInChair ? (
										<button
											type="button"
											className="primary-button"
											style={{
												fontSize: "11px",
												padding: "3px 7px",
												minHeight: "26px",
												display: "inline-flex",
												alignItems: "center",
												gap: "4px",
											}}
											onClick={() => {
												if (patient && onOpenAppointmentEmk) {
													onOpenAppointmentEmk(patient.id);
												}
											}}
											title="Открыть карту и продолжить прием"
										>
											<ClipboardCheck size={12} aria-hidden="true" /> ЭМК
										</button>
									) : (
										<button
											type="button"
											className="secondary-button"
											style={{
												fontSize: "11px",
												padding: "3px 7px",
												minHeight: "26px",
												display: "inline-flex",
												alignItems: "center",
												gap: "4px",
											}}
											onClick={() => {
												if (patient && onOpenAppointmentEmk) {
													onOpenAppointmentEmk(patient.id);
												}
											}}
											title="Принять в кресло и начать прием"
										>
											<UserCheck size={12} aria-hidden="true" /> В кресло
										</button>
									)}
								</div>
							</div>
						);
					})}
				</div>
			) : todayAppointments.length > 0 ? (
				<div
					className="compact-schedule-empty-card"
					style={{
						padding: "14px",
						borderRadius: "10px",
						background: "var(--paper-soft, rgba(0,0,0,0.02))",
						border: "1px solid var(--line)",
						textAlign: "center",
						fontSize: "12.5px",
						color: "var(--muted)",
					}}
				>
					В этой очереди сейчас нет пациентов.{" "}
					<button
						type="button"
						style={{
							background: "none",
							border: "none",
							color: "var(--teal-dark, #0d9488)",
							textDecoration: "underline",
							cursor: "pointer",
							fontWeight: 600,
						}}
						onClick={() => setQueueFilter("all")}
					>
						Показать все записи ({todayAppointments.length})
					</button>
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
							<strong
								style={{
									display: "block",
									fontSize: "13px",
									fontWeight: 700,
									color: "var(--ink)",
									lineHeight: 1.25,
								}}
							>
								На сегодня записей нет
							</strong>
							<span
								style={{
									display: "block",
									fontSize: "11.5px",
									color: "var(--muted)",
									lineHeight: 1.35,
								}}
							>
								Свободный день. Запишите пациента — запись сразу появится
								здесь.
							</span>
						</div>
					</div>
					<div>
						{onOpenSchedule && (
							<button
								className="secondary-button min-h-[36px] px-3 py-1 text-xs"
								type="button"
								onClick={onOpenSchedule}
							>
								<CalendarPlus aria-hidden="true" size={14} /> Открыть
								расписание
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
