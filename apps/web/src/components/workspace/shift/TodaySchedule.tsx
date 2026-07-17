import { ClipboardCheck, CalendarPlus, Clock, ArrowRight } from "lucide-react";
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

	const { completedCount, totalCount, progressPercent } = useMemo(() => {
		const total = todayAppointments.length;
		if (total === 0) return { completedCount: 0, totalCount: 0, progressPercent: 0 };
		
		const completed = todayAppointments.filter((a: any) => a.status === 'completed' || a.status === 'cancelled').length;
		return {
			completedCount: completed,
			totalCount: total,
			progressPercent: Math.round((completed / total) * 100)
		};
	}, [todayAppointments]);

	return (
		<motion.div
			className="today-schedule-box glass-panel"
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
			style={{ display: "flex", flexDirection: "column" }}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
				<h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
					<ClipboardCheck size={18} color="var(--teal)" /> Расписание на сегодня
				</h3>
				<button 
					className="text-button" 
					style={{ padding: "4px 8px", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}
					onClick={() => { window.location.hash = "schedule"; }}
				>
					Сетка <ArrowRight size={14} />
				</button>
			</div>

			{todayAppointments.length > 0 ? (
				<>
					{/* Progress bar */}
					<div style={{ marginBottom: "16px", padding: "12px", background: "var(--paper-strong)", borderRadius: "8px" }}>
						<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
							<span>Прогресс дня</span>
							<span>{completedCount} из {totalCount}</span>
						</div>
						<div style={{ height: "6px", background: "var(--line)", borderRadius: "3px", overflow: "hidden" }}>
							<div style={{ height: "100%", width: `${progressPercent}%`, background: "var(--teal)", transition: "width 0.5s ease" }} />
						</div>
					</div>

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

							const statusLabels: Record<string, {label: string, bg: string, color: string}> = {
								planned: { label: "запланирован", bg: "var(--paper-strong)", color: "var(--muted)" },
								confirmed: { label: "подтвержден", bg: "var(--blue-soft)", color: "var(--blue)" },
								arrived: { label: "ожидает", bg: "var(--amber-soft)", color: "var(--amber)" },
								in_treatment: { label: "на приеме", bg: "var(--teal-soft)", color: "var(--teal)" },
								completed: { label: "завершен", bg: "var(--green-soft)", color: "var(--green)" },
								cancelled: { label: "отменен", bg: "var(--red-soft)", color: "var(--red)" },
								no_show: { label: "не пришел", bg: "var(--red-soft)", color: "var(--red)" },
							};

							const s = statusLabels[app.status] || { label: app.status, bg: "var(--paper-strong)", color: "var(--muted)" };
							const isCompletedApp = app.status === 'completed' || app.status === 'cancelled';

							return (
								<div
									key={app.id}
									className={`today-schedule-item ${isCurrent ? "current-active" : ""}`}
									style={{
										display: "flex",
										alignItems: "center",
										padding: "12px 16px",
										cursor: "pointer",
										transition: "all 0.2s ease",
										borderRadius: "8px",
										background: isCurrent ? "var(--teal-soft)" : "var(--paper)",
										border: isCurrent ? "1px solid var(--teal)" : "1px solid var(--line)",
										opacity: isCompletedApp && !isCurrent ? 0.6 : 1,
										gap: "12px"
									}}
									onClick={() => {
										if (patient) {
											setSelectedPatientId(patient.id);
											window.location.hash = "visit";
										}
									}}
								>
									<div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "45px" }}>
										<span style={{ fontSize: "13px", fontWeight: 700, color: isCompletedApp ? "var(--muted)" : "var(--ink)" }}>{timeStart}</span>
									</div>
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "4px",
											flex: 1
										}}
									>
										<strong style={{ fontSize: "14px", color: isCurrent ? "var(--teal-strong)" : "var(--ink)", textDecoration: isCompletedApp ? "line-through" : "none" }}>
											{patient ? patient.fullName : "Неизвестный пациент"}
										</strong>
										<span style={{ fontSize: "12px", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
											{app.reason || "плановый осмотр"}
										</span>
									</div>
									<span
										style={{
											fontSize: "11px",
											fontWeight: 600,
											padding: "4px 8px",
											borderRadius: "6px",
											background: s.bg,
											color: s.color,
											whiteSpace: "nowrap"
										}}
									>
										{s.label}
									</span>
								</div>
							);
						})}
					</div>
				</>
			) : (
				<div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "16px", padding: "32px 0", color: "var(--muted)" }}>
					<Clock size={48} strokeWidth={1} color="var(--line-strong)" />
					<p style={{ margin: 0, fontSize: "14px", textAlign: "center" }}>
						Сегодня у вас нет<br/>запланированных приемов.
					</p>
					<button className="secondary-button" onClick={() => window.location.hash = "schedule"}>
						<CalendarPlus size={16} /> Перейти в сетку
					</button>
				</div>
			)}
		</motion.div>
	);
}
