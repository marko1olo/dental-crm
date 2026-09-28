/**
 * Appointments Tab (Domain: Portal Patient Cabinet)
 *
 * Clinical & Ergonomic appointments management complying with Mandates 8b, 8c, 8d, 8e:
 * - 18-20px bold visit times & clean dates with day-of-week context.
 * - Non-blocking inline cancellation drawer with clinical reason selector (Doctor & Patient Autonomy).
 * - 1-tap calendar export: Apple iCal (.ics), Google Calendar, Yandex Calendar.
 * - Yandex Maps direct navigation, QR reception check-in, and preparation instructions.
 * - Zero blocking alerts/confirmations (no window.alert / window.confirm).
 * - Zero cartoon emojis, strictly Lucide icons.
 * - Strict <= 800 lines ceiling (Target: ~400 lines).
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	Calendar,
	Clock,
	MapPin,
	Phone,
	QrCode,
	CalendarPlus,
	ExternalLink,
	AlertCircle,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	ChevronDown,
	ChevronUp,
	Ban,
	Plus,
	RefreshCw,
} from "lucide-react";
import type {
	PatientAppointment,
	PatientPersonalCabinetData,
} from "../patientCabinetEngine";
import { formatRubles } from "../patientCabinetEngine";
import { getAppointmentCalendarDates } from "./OverviewTab";

export type AppointmentFilterType = "upcoming" | "past" | "all";

export interface AppointmentsTabProps {
	readonly data: PatientPersonalCabinetData;
	readonly onOpenReceptionQr?: ((appointment?: PatientAppointment) => void) | undefined;
	readonly onOpenReschedule?: ((appointment: PatientAppointment) => void) | undefined;
	readonly onOpenBooking?: (() => void) | undefined;
	readonly onCancelAppointment?: ((appointmentId: string, reason: string) => void) | undefined;
	readonly onShowToast?: ((message: string) => void) | undefined;
}

const CANCELLATION_REASONS: readonly string[] = [
	"Изменились личные планы / командировка",
	"Плохое самочувствие / симптомы ОРВИ",
	"Финансовые затруднения / перенос бюджета",
	"Требуется консультация другого специалиста",
	"Другая причина",
];

const STATUS_BADGE_CONFIG: Record<
	PatientAppointment["status"],
	{ label: string; bg: string; color: string; icon: React.FC<{ size: number }> }
> = {
	confirmed: { label: "Подтверждён", bg: "rgba(16, 185, 129, 0.12)", color: "#059669", icon: CheckCircle2 },
	scheduled: { label: "Запланирован", bg: "rgba(2, 132, 199, 0.12)", color: "#0284c7", icon: Clock },
	completed: { label: "Завершён", bg: "rgba(100, 116, 139, 0.12)", color: "#64748b", icon: CheckCircle2 },
	cancelled: { label: "Отменён", bg: "rgba(239, 68, 68, 0.12)", color: "#dc2626", icon: XCircle },
	reschedule_requested: { label: "Запрос переноса", bg: "rgba(245, 158, 11, 0.12)", color: "#d97706", icon: RefreshCw },
};

export const AppointmentsTab: React.FC<AppointmentsTabProps> = ({
	data,
	onOpenReceptionQr,
	onOpenReschedule,
	onOpenBooking,
	onCancelAppointment,
	onShowToast,
}) => {
	const [filter, setFilter] = useState<AppointmentFilterType>("upcoming");
	const [cancellingAptId, setCancellingAptId] = useState<string | null>(null);
	const [selectedReason, setSelectedReason] = useState<string>(CANCELLATION_REASONS[0] || "Изменились личные планы");
	const [cancellationNote, setCancellationNote] = useState<string>("");
	const [localCancelledIds, setLocalCancelledIds] = useState<ReadonlySet<string>>(new Set());
	const [expandedPrepAptId, setExpandedPrepAptId] = useState<string | null>(null);

	const allAppointments = useMemo(() => {
		return (data.appointments || []).map((apt) => {
			if (localCancelledIds.has(apt.id)) {
				return { ...apt, status: "cancelled" as const };
			}
			return apt;
		});
	}, [data.appointments, localCancelledIds]);

	const { upcomingAppointments, pastAppointments } = useMemo(() => {
		const today = new Date().toISOString().slice(0, 10);
		const upcoming: PatientAppointment[] = [];
		const past: PatientAppointment[] = [];

		for (const apt of allAppointments) {
			const isPastDate = apt.dateIso < today;
			const isPastStatus = apt.status === "completed" || apt.status === "cancelled";
			if (isPastDate || isPastStatus) {
				past.push(apt);
			} else {
				upcoming.push(apt);
			}
		}

		upcoming.sort((a, b) => a.dateIso.localeCompare(b.dateIso));
		past.sort((a, b) => b.dateIso.localeCompare(a.dateIso));
		return { upcomingAppointments: upcoming, pastAppointments: past };
	}, [allAppointments]);

	const displayedAppointments = useMemo(() => {
		if (filter === "upcoming") return upcomingAppointments;
		if (filter === "past") return pastAppointments;
		return [...upcomingAppointments, ...pastAppointments];
	}, [filter, upcomingAppointments, pastAppointments]);

	const handleExportIcs = useCallback((apt: PatientAppointment) => {
		const calDates = getAppointmentCalendarDates(apt.dateIso, apt.timeRu);
		const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//DENTE Dental CRM//Patient Cabinet//RU\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nBEGIN:VEVENT\r\nUID:dente-appt-${apt.id}-${Date.now()}@dente.ru\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z\r\nDTSTART:${calDates.startCompact}\r\nDTEND:${calDates.endCompact}\r\nSUMMARY:Прием в DENTE: ${apt.doctorName}\r\nDESCRIPTION:Процедура: ${apt.titleRu}\\nКлиника: ${apt.clinicName}, ${apt.roomNumber}\\nАдрес: ${apt.clinicAddressRu}\r\nLOCATION:${apt.clinicName}, ${apt.roomNumber}\r\nSTATUS:CONFIRMED\r\nBEGIN:VALARM\r\nTRIGGER:-PT2H\r\nACTION:DISPLAY\r\nDESCRIPTION:Напоминание о приеме в клинике DENTE через 2 часа\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;

		const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Dente_Appointment_${apt.dateIso.slice(0, 10)}.ics`;
		a.click();
		URL.revokeObjectURL(url);
		onShowToast?.("Файл iCal (.ics) успешно сформирован");
	}, [onShowToast]);

	const handleExportGoogle = useCallback((apt: PatientAppointment) => {
		const calDates = getAppointmentCalendarDates(apt.dateIso, apt.timeRu);
		const title = encodeURIComponent(`Прием в DENTE: ${apt.doctorName}`);
		const details = encodeURIComponent(`Процедура: ${apt.titleRu}\nКлиника: ${apt.clinicName}, ${apt.roomNumber}\nАдрес: ${apt.clinicAddressRu}`);
		const location = encodeURIComponent(`${apt.clinicName}, ${apt.roomNumber}`);
		window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${calDates.startCompact}/${calDates.endCompact}&details=${details}&location=${location}`, "_blank");
	}, []);

	const handleExportYandex = useCallback((apt: PatientAppointment) => {
		const calDates = getAppointmentCalendarDates(apt.dateIso, apt.timeRu);
		const name = encodeURIComponent(`Прием в DENTE: ${apt.doctorName}`);
		const desc = encodeURIComponent(`Процедура: ${apt.titleRu}\nКлиника: ${apt.clinicName}, ${apt.roomNumber}\nАдрес: ${apt.clinicAddressRu}`);
		const location = encodeURIComponent(`${apt.clinicName}, ${apt.roomNumber}`);
		window.open(`https://calendar.yandex.ru/event/new?name=${name}&start_ts=${calDates.startYandex}&end_ts=${calDates.endYandex}&description=${desc}&location=${location}`, "_blank");
	}, []);

	const handleConfirmCancellation = useCallback((aptId: string) => {
		const fullReason = cancellationNote.trim() ? `${selectedReason}: ${cancellationNote.trim()}` : selectedReason;
		setLocalCancelledIds((prev) => new Set([...prev, aptId]));
		setCancellingAptId(null);
		setCancellationNote("");
		onCancelAppointment?.(aptId, fullReason);
		onShowToast?.("Запись на приём успешно отменена");
	}, [selectedReason, cancellationNote, onCancelAppointment, onShowToast]);

	const formatFullDateRu = (dateIso: string) => {
		try {
			return new Date(dateIso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", weekday: "short" });
		} catch {
			return dateIso;
		}
	};

	const filterTabs = [
		{ id: "upcoming" as const, label: "Предстоящие", count: upcomingAppointments.length },
		{ id: "past" as const, label: "Прошедшие", count: pastAppointments.length },
		{ id: "all" as const, label: "Все", count: allAppointments.length },
	];

	return (
		<div className="pc-appointments-tab" data-testid="pc-appointments-tab" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", paddingBottom: "12px", borderBottom: "1px solid var(--pc-border, #e2e8f0)" }}>
				<div className="pc-seg-controls" role="tablist" aria-label="Фильтр записей" style={{ display: "inline-flex", background: "var(--pc-bg-subtle, #f1f5f9)", padding: "3px", borderRadius: "8px", gap: "2px" }}>
					{filterTabs.map((t) => {
						const isActive = filter === t.id;
						return (
							<button
								key={t.id}
								type="button"
								role="tab"
								aria-selected={isActive}
								className={`pc-seg-btn ${isActive ? "active" : ""}`}
								onClick={() => setFilter(t.id)}
								style={{
									padding: "6px 14px",
									fontSize: "0.875rem",
									fontWeight: isActive ? 600 : 500,
									border: "none",
									borderRadius: "6px",
									cursor: "pointer",
									background: isActive ? "var(--pc-surface, #ffffff)" : "transparent",
									color: isActive ? "var(--pc-primary, #0284c7)" : "var(--pc-text-muted, #64748b)",
									boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
								}}
							>
								{t.label} ({t.count})
							</button>
						);
					})}
				</div>

				{onOpenBooking && (
					<button
						type="button"
						className="pc-btn-primary"
						onClick={onOpenBooking}
						data-testid="btn-book-new-appointment"
						style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
					>
						<Plus size={16} />
						<span>Записаться на приём</span>
					</button>
				)}
			</div>

			{displayedAppointments.length === 0 ? (
				<div className="pc-empty-state" style={{ padding: "48px 24px", textAlign: "center", background: "var(--pc-surface, #ffffff)", borderRadius: "12px", border: "1px dashed var(--pc-border, #cbd5e1)" }}>
					<Calendar size={40} style={{ color: "var(--pc-text-muted, #94a3b8)", marginBottom: "12px" }} />
					<h3 style={{ margin: "0 0 6px 0", fontSize: "1.125rem", color: "var(--pc-text-main, #0f172a)" }}>
						{filter === "upcoming" ? "Нет запланированных приёмов" : "История приёмов пуста"}
					</h3>
					<p style={{ margin: "0 0 18px 0", fontSize: "0.875rem", color: "var(--pc-text-muted, #64748b)" }}>
						{filter === "upcoming" ? "Запишитесь на плановый профилактический осмотр или консультацию" : "Здесь будут отображаться ваши завершенные визиты и протоколы приемов"}
					</p>
					{onOpenBooking && (
						<button type="button" className="pc-btn-primary" onClick={onOpenBooking} style={{ padding: "8px 20px", borderRadius: "8px", fontWeight: 600 }}>
							Выбрать удобное время
						</button>
					)}
				</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
					{displayedAppointments.map((apt) => {
						const isCancelling = cancellingAptId === apt.id;
						const isPast = apt.status === "completed" || apt.status === "cancelled";
						const isPrepExpanded = expandedPrepAptId === apt.id;
						const badge = STATUS_BADGE_CONFIG[apt.status] || STATUS_BADGE_CONFIG.scheduled;
						const BadgeIcon = badge.icon;
						const yandexMapsUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(apt.clinicAddressRu || apt.clinicName || "DENTE")}`;

						return (
							<article
								key={apt.id}
								className={`pc-appointment-card ${isPast ? "pc-appt-past" : ""}`}
								data-testid={`appointment-card-${apt.id}`}
								style={{
									background: "var(--pc-surface, #ffffff)",
									border: "1px solid var(--pc-border, #e2e8f0)",
									borderRadius: "12px",
									padding: "16px 20px",
									display: "flex",
									flexDirection: "column",
									gap: "12px",
									boxShadow: isPast ? "none" : "0 2px 8px rgba(0,0,0,0.04)",
									opacity: apt.status === "cancelled" ? 0.65 : 1,
								}}
							>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
									<div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
										<span style={{ fontSize: "1.25rem", fontWeight: 700, color: isPast ? "var(--pc-text-muted, #64748b)" : "var(--pc-primary, #0284c7)" }}>
											{apt.timeRu || "12:00"}
										</span>
										<span style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--pc-text-main, #1e293b)" }}>
											{formatFullDateRu(apt.dateIso)}
										</span>
									</div>

									<span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, background: badge.bg, color: badge.color }}>
										<BadgeIcon size={13} />
										{badge.label}
									</span>
								</div>

								<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
									<strong style={{ fontSize: "1rem", color: "var(--pc-text-main, #0f172a)" }}>{apt.titleRu}</strong>
									<div style={{ fontSize: "0.875rem", color: "var(--pc-text-muted, #475569)" }}>
										Врач: <strong style={{ color: "var(--pc-text-main, #1e293b)" }}>{apt.doctorName}</strong>
										{apt.doctorSpecialtyRu ? ` (${apt.doctorSpecialtyRu})` : ""}
									</div>
									<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", color: "var(--pc-text-muted, #64748b)" }}>
										<MapPin size={14} style={{ color: "var(--pc-primary, #0284c7)", flexShrink: 0 }} />
										<span>{apt.clinicName} &bull; {apt.roomNumber}{apt.clinicAddressRu ? ` (${apt.clinicAddressRu})` : ""}</span>
									</div>
									{typeof apt.priceRub === "number" && (
										<div style={{ fontSize: "0.875rem", fontWeight: 600, marginTop: "2px" }}>
											Стоимость приема: <span style={{ color: apt.priceRub > 0 ? "var(--pc-text-main, #0f172a)" : "#059669" }}>
												{apt.priceRub > 0 ? formatRubles(apt.priceRub) : "Бесплатно (входит в план / гарантия)"}
											</span>
										</div>
									)}
								</div>

								{apt.preparationInstructionsRu && apt.preparationInstructionsRu.length > 0 && (
									<div style={{ background: "var(--pc-bg-subtle, #f8fafc)", border: "1px solid var(--pc-border, #e2e8f0)", borderRadius: "8px", overflow: "hidden" }}>
										<button
											type="button"
											onClick={() => setExpandedPrepAptId(isPrepExpanded ? null : apt.id)}
											style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 600, color: "var(--pc-primary, #0284c7)", textAlign: "left" }}
										>
											<span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
												<AlertCircle size={14} />
												Рекомендации по подготовке к приёму ({apt.preparationInstructionsRu.length})
											</span>
											{isPrepExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
										</button>
										{isPrepExpanded && (
											<ul style={{ margin: 0, padding: "0 16px 10px 32px", fontSize: "0.8125rem", color: "var(--pc-text-main, #334155)", lineHeight: 1.5 }}>
												{apt.preparationInstructionsRu.map((item, idx) => (
													<li key={idx} style={{ marginBottom: "4px" }}>{item}</li>
												))}
											</ul>
										)}
									</div>
								)}

								{!isPast && (
									<div style={{ display: "flex", flexWrap: "wrap", gap: "8px", paddingTop: "6px", borderTop: "1px solid var(--pc-border, #f1f5f9)" }}>
										{onOpenReceptionQr && (
											<button
												type="button"
												className="pc-btn-primary"
												onClick={() => onOpenReceptionQr(apt)}
												data-testid={`btn-reception-qr-${apt.id}`}
												style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}
											>
												<QrCode size={14} />
												<span>QR для входа</span>
											</button>
										)}
										{onOpenReschedule && (
											<button
												type="button"
												className="pc-btn-secondary"
												onClick={() => onOpenReschedule(apt)}
												data-testid={`btn-reschedule-${apt.id}`}
												style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer" }}
											>
												<Clock size={14} />
												<span>Перенести приём</span>
											</button>
										)}
										<a
											href={yandexMapsUrl}
											target="_blank"
											rel="noreferrer"
											className="pc-btn-secondary"
											style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8125rem", fontWeight: 500, textDecoration: "none" }}
										>
											<MapPin size={14} />
											<span>Карта</span>
										</a>
										<button
											type="button"
											className="pc-btn-secondary"
											onClick={() => handleExportIcs(apt)}
											title="Скачать событие Apple iCal (.ics)"
											style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 10px", borderRadius: "6px", fontSize: "0.8125rem", cursor: "pointer" }}
										>
											<CalendarPlus size={14} />
											<span>iCal</span>
										</button>
										<button
											type="button"
											className="pc-btn-secondary"
											onClick={() => handleExportGoogle(apt)}
											title="Добавить в Google Календарь"
											style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 10px", borderRadius: "6px", fontSize: "0.8125rem", cursor: "pointer" }}
										>
											<ExternalLink size={14} />
											<span>Google</span>
										</button>
										<button
											type="button"
											className="pc-btn-secondary"
											onClick={() => handleExportYandex(apt)}
											title="Добавить в Яндекс Календарь"
											style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 10px", borderRadius: "6px", fontSize: "0.8125rem", cursor: "pointer" }}
										>
											<ExternalLink size={14} />
											<span>Яндекс</span>
										</button>
										<button
											type="button"
											className="pc-btn-secondary"
											onClick={() => setCancellingAptId(isCancelling ? null : apt.id)}
											data-testid={`btn-cancel-trigger-${apt.id}`}
											style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 10px", borderRadius: "6px", fontSize: "0.8125rem", cursor: "pointer", marginLeft: "auto", color: "var(--pc-danger, #ef4444)", borderColor: "rgba(239, 68, 68, 0.3)" }}
										>
											<Ban size={14} />
											<span>Отменить</span>
										</button>
									</div>
								)}

								{isCancelling && (
									<div
										className="pc-cancellation-drawer"
										data-testid={`cancellation-drawer-${apt.id}`}
										style={{ marginTop: "8px", padding: "14px 16px", background: "rgba(239, 68, 68, 0.04)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "10px" }}
									>
										<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
											<AlertTriangle size={18} style={{ color: "#dc2626", flexShrink: 0 }} />
											<strong style={{ fontSize: "0.875rem", color: "#b91c1c" }}>Отмена записи на приём</strong>
										</div>
										<p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--pc-text-muted, #64748b)", lineHeight: 1.4 }}>
											Отмена освободит время в расписании врача. Если вам требуется другое время, рекомендуем нажать «Перенести приём».
										</p>
										<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
											<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pc-text-main, #334155)" }}>Укажите причину отмены:</label>
											<select
												value={selectedReason}
												onChange={(e) => setSelectedReason(e.target.value)}
												style={{ padding: "7px 10px", fontSize: "0.8125rem", borderRadius: "6px", border: "1px solid var(--pc-border, #cbd5e1)", background: "var(--pc-surface, #ffffff)", color: "var(--pc-text-main, #0f172a)" }}
											>
												{CANCELLATION_REASONS.map((r) => (<option key={r} value={r}>{r}</option>))}
											</select>
										</div>
										<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
											<label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pc-text-muted, #64748b)" }}>Комментарий (необязательно):</label>
											<input
												type="text"
												value={cancellationNote}
												onChange={(e) => setCancellationNote(e.target.value)}
												placeholder="Дополнительные детали..."
												maxLength={150}
												style={{ padding: "6px 10px", fontSize: "0.8125rem", borderRadius: "6px", border: "1px solid var(--pc-border, #cbd5e1)", background: "var(--pc-surface, #ffffff)", color: "var(--pc-text-main, #0f172a)" }}
											/>
										</div>
										<div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
											<button type="button" className="pc-btn-secondary" onClick={() => setCancellingAptId(null)} style={{ padding: "6px 14px", fontSize: "0.8125rem" }}>
												Сохранить запись (назад)
											</button>
											{onOpenReschedule && (
												<button
													type="button"
													className="pc-btn-secondary"
													onClick={() => { setCancellingAptId(null); onOpenReschedule(apt); }}
													style={{ padding: "6px 14px", fontSize: "0.8125rem", color: "var(--pc-primary, #0284c7)" }}
												>
													Перенести вместо отмены
												</button>
											)}
											<button
												type="button"
												onClick={() => handleConfirmCancellation(apt.id)}
												data-testid={`btn-confirm-cancel-${apt.id}`}
												style={{ padding: "6px 14px", fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px", border: "none", background: "#dc2626", color: "#ffffff", cursor: "pointer" }}
											>
												Подтвердить отмену
											</button>
										</div>
									</div>
								)}
							</article>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default AppointmentsTab;
