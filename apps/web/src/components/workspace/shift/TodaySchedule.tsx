import { ClipboardCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";

export function TodaySchedule() {
	const { dashboard, activePatient, setSelectedPatientId } =
		useAppLogicContext();

	const todayAppointments = useMemo(() => {
		if (!dashboard || !dashboard.appointments) return [];
		return dashboard.appointments.sort((a: any, b: any) =>
			a.startsAt.localeCompare(b.startsAt),
		);
	}, [dashboard]);

	return (
		<motion.div
			className="today-schedule-box glass-panel"
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
		>
			<h3>
				<ClipboardCheck size={16} color="var(--teal)" /> Расписание приемов на
				сегодня
			</h3>
			{todayAppointments.length > 0 ? (
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
					{todayAppointments.map((app: any) => {
						const patient = dashboard.patients?.find(
							(p: any) => p.id === app.patientId,
						);
						const isCurrent =
							activePatient && activePatient.id === app.patientId;

						const timeStart = new Date(app.startsAt).toLocaleTimeString(
							"ru-RU",
							{ hour: "2-digit", minute: "2-digit" },
						);
						const timeEnd = new Date(app.endsAt).toLocaleTimeString("ru-RU", {
							hour: "2-digit",
							minute: "2-digit",
						});

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
		</motion.div>
	);
}
