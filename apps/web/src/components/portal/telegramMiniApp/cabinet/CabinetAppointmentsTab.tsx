import React, { memo, useMemo } from "react";
import {
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	MapPin,
	Phone,
	ShieldCheck,
} from "lucide-react";
import type { PatientAppointment } from "./types";

export interface CabinetAppointmentsTabProps {
	readonly appointments: readonly PatientAppointment[];
	readonly appointmentFilter: "upcoming" | "past";
	readonly onChangeAppointmentFilter: (filter: "upcoming" | "past") => void;
	readonly onConfirmAppointment: (id: string) => void;
	readonly onBookNew: () => void;
	readonly onTriggerHaptic?: (style?: "light" | "medium" | "heavy") => void;
}

export const CabinetAppointmentsTab: React.FC<CabinetAppointmentsTabProps> = memo(({
	appointments,
	appointmentFilter,
	onChangeAppointmentFilter,
	onConfirmAppointment,
	onBookNew,
	onTriggerHaptic,
}) => {
	// Фильтрованные записи
	const filteredAppointments = useMemo(
		() => appointments.filter((app) => (appointmentFilter === "upcoming" ? !app.isPast : app.isPast)),
		[appointments, appointmentFilter],
	);

	return (
		<main className="tg-tab-content">
			{/* Переключатель «Предстоящие» / «Прошедшие» в стиле Apple Segmented Bar */}
			<div className="tg-segmented-control">
				<button
					type="button"
					className={`tg-segment-btn ${appointmentFilter === "upcoming" ? "active" : ""}`}
					onClick={() => {
						onChangeAppointmentFilter("upcoming");
						onTriggerHaptic?.("light");
					}}
				>
					<Clock size={14} />
					<span>Предстоящие ({appointments.filter((a) => !a.isPast).length})</span>
				</button>
				<button
					type="button"
					className={`tg-segment-btn ${appointmentFilter === "past" ? "active" : ""}`}
					onClick={() => {
						onChangeAppointmentFilter("past");
						onTriggerHaptic?.("light");
					}}
				>
					<CheckCircle2 size={14} />
					<span>Прошедшие ({appointments.filter((a) => a.isPast).length})</span>
				</button>
			</div>

			{/* Список визитов (Grouped Card List) */}
			<div className="tg-card-list">
				{filteredAppointments.length === 0 ? (
					<div className="tg-empty-card">
						<Calendar size={32} className="text-slate-400 mb-2" />
						<div className="text-sm font-bold">Нет запланированных визитов</div>
						<div className="text-xs text-slate-400 mt-1">
							Выберите удобное время для консультации или чистки
						</div>
					</div>
				) : (
					filteredAppointments.map((app) => (
						<div key={app.id} className="tg-grouped-card tg-appointment-card">
							{/* Шапка карточки визита */}
							<div className="tg-appointment-header">
								<div>
									<div className="tg-appointment-datetime">
										<Calendar size={14} className="text-teal-400" />
										<span>{app.dateStr} в {app.timeStr}</span>
									</div>
									<div className="tg-appointment-cabinet">
										{app.cabinet} • {app.durationMinutes} мин
									</div>
								</div>

								{/* Бейдж статуса */}
								{app.isPast ? (
									<span className="tg-status-badge tg-badge-completed">
										Завершён
									</span>
								) : app.isConfirmed ? (
									<span className="tg-status-badge tg-badge-confirmed">
										<Check size={11} />
										<span>Подтверждён</span>
									</span>
								) : (
									<span className="tg-status-badge tg-badge-pending">
										Требует подтверждения
									</span>
								)}
							</div>

							{/* Тело карточки: Врач и Процедура */}
							<div className="tg-appointment-body">
								<div className="tg-appointment-procedure">
									{app.toothNumber && (
										<span className="tg-tooth-chip">Зуб #{app.toothNumber}</span>
									)}
									<span>{app.procedureTitle}</span>
								</div>
								<div className="tg-appointment-doctor">
									<div className="tg-doctor-circle">
										{app.doctorName.replace("Д-р ", "").charAt(0)}
									</div>
									<div>
										<div className="tg-doctor-name">{app.doctorName}</div>
										<div className="tg-doctor-role">{app.doctorRole}</div>
									</div>
								</div>
							</div>

							{/* Футер карточки визита с кнопками в 1 тап */}
							{!app.isPast ? (
								<div className="tg-appointment-actions">
									{!app.isConfirmed ? (
										<button
											type="button"
											className="tg-cta-button tg-confirm-btn"
											onClick={() => onConfirmAppointment(app.id)}
										>
											<CheckCircle2 size={16} />
											<span>Подтвердить визит в 1 клик</span>
										</button>
									) : (
										<div className="tg-confirmed-note">
											<ShieldCheck size={14} className="text-teal-400" />
											<span>Вы подтвердили визит. Доктор ожидает вас в клинике!</span>
										</div>
									)}

									<div className="tg-appointment-sub-actions">
										<a
											href="tel:+74951234567"
											className="tg-sub-action-btn"
											onClick={() => onTriggerHaptic?.("light")}
										>
											<Phone size={14} />
											<span>Позвонить</span>
										</a>
										<a
											href="https://yandex.ru/maps/?text=Москва,+Столярный+пер.,+14"
											target="_blank"
											rel="noopener noreferrer"
											className="tg-sub-action-btn"
											onClick={() => onTriggerHaptic?.("light")}
										>
											<MapPin size={14} />
											<span>Маршрут</span>
										</a>
									</div>
								</div>
							) : (
								/* Для архивного визита — финансовая строка и кэшбэк */
								<div className="tg-past-summary">
									<div className="flex justify-between items-center text-xs">
										<span className="text-slate-400">Стоимость лечения:</span>
										<span className="font-bold text-slate-100">
											{app.costRub?.toLocaleString("ru-RU")} ₽
										</span>
									</div>
									{app.cashbackEarned && (
										<div className="flex justify-between items-center text-xs text-amber-400 mt-1">
											<span>Начислено кэшбэка 5%:</span>
											<span className="font-bold">+{app.cashbackEarned} бонусов</span>
										</div>
									)}
								</div>
							)}
						</div>
					))
				)}
			</div>

			{/* Быстрая плашка записи на новый приём */}
			<div className="tg-quick-book-banner">
				<div>
					<div className="text-sm font-bold text-slate-100">Нужен осмотр или чистка?</div>
					<div className="text-xs text-slate-400 mt-0.5">Выберите свободное время к вашему доктору</div>
				</div>
				<button
					type="button"
					className="tg-book-accent-btn"
					onClick={onBookNew}
				>
					<span>+ Записаться</span>
				</button>
			</div>
		</main>
	);
});

CabinetAppointmentsTab.displayName = "CabinetAppointmentsTab";
