import {
	type GeneralCleaningLog,
} from "@dental/shared";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	Clock,
	FileCheck,
	Filter,
	Printer,
	RefreshCw,
	ShieldCheck,
	Sparkles,
	UserCheck,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";

export interface GeneralCleaningScheduleProps {
	readonly logs: readonly GeneralCleaningLog[];
	readonly onScheduleUpdated?: () => void;
}

export const CLINIC_ROOMS_CATALOG = [
	{ id: "room-1", name: "Кабинет № 1 (Терапия)", areaM2: 24.5, defaultDayOfWeek: "Понедельник" },
	{ id: "room-2", name: "Кабинет № 2 (Ортопедия)", areaM2: 22.0, defaultDayOfWeek: "Вторник" },
	{ id: "room-surg", name: "Операционная / Хирургический кабинет", areaM2: 32.5, defaultDayOfWeek: "Среда" },
	{ id: "room-cso", name: "Стерилизационная (ЦСО)", areaM2: 18.0, defaultDayOfWeek: "Четверг" },
];

export function GeneralCleaningSchedule({
	logs,
	onScheduleUpdated,
}: GeneralCleaningScheduleProps) {
	const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
	const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth()); // 0-11
	const [isAutopilotLoading, setIsAutopilotLoading] = useState(false);
	const [roomFilter, setRoomFilter] = useState<string>("all");

	// Расчет дат генеральных уборок на выбранный месяц (каждые 7 дней)
	const monthDaysCount = useMemo(() => {
		return new Date(selectedYear, selectedMonth + 1, 0).getDate();
	}, [selectedYear, selectedMonth]);

	const scheduledWeeks = useMemo(() => {
		const weeks: Array<{ weekNumber: number; startDate: number; endDate: number; targetDay: number }> = [];
		let day = 1;
		let weekIdx = 1;
		while (day <= monthDaysCount) {
			const end = Math.min(day + 6, monthDaysCount);
			weeks.push({
				weekNumber: weekIdx,
				startDate: day,
				endDate: end,
				targetDay: day, // День проведения уборки по 7-дневному циклу
			});
			day += 7;
			weekIdx++;
		}
		return weeks;
	}, [monthDaysCount]);

	// Фильтрация записей уборок за выбранный месяц
	const currentMonthLogs = useMemo(() => {
		const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
		return logs.filter((log) => {
			const sched = log.scheduledDate || "";
			const matchesMonth = sched.startsWith(monthStr);
			const matchesRoom = roomFilter === "all" || log.roomName?.includes(roomFilter);
			return matchesMonth && matchesRoom;
		});
	}, [logs, selectedYear, selectedMonth, roomFilter]);

	// ⚡ 1-Клик генерация графика генеральных уборок на месяц (каждые 7 дней)
	const handleGenerateMonthlySchedule = async () => {
		try {
			setIsAutopilotLoading(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const res = await fetch("/api/registers/cleaning/autopilot-month", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({
					year: selectedYear,
					month: selectedMonth + 1,
				}),
			});

			if (res.ok) {
				const data = await res.json().catch(() => ({}));
				showToast(
					`⚡ График генеральных уборок на месяц успешно заполнен (${data.count || 20} уборок по нормам СанПиН 3.3686-21, шаг 7 дней)`,
					"success",
				);
				onScheduleUpdated?.();
			} else {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Ошибка при генерации графика уборок", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка при генерации графика", "error");
		} finally {
			setIsAutopilotLoading(false);
		}
	};

	const monthNamesRu = [
		"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
		"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
	];

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			{/* Top Bar: Month Selector & Autopilot Button */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "0.75rem",
					padding: "1rem",
					background: "var(--paper-soft, #f8fafc)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "12px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<Calendar size={18} color="var(--teal, #0d9488)" />
						<span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--ink, #0f172a)" }}>
							График генеральных уборок:
						</span>
					</div>

					{/* Month Selector */}
					<select
						value={selectedMonth}
						onChange={(e) => setSelectedMonth(Number(e.target.value))}
						style={{
							padding: "0.4rem 0.75rem",
							borderRadius: "8px",
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper, #ffffff)",
							color: "var(--ink, #0f172a)",
							fontSize: "0.85rem",
							fontWeight: 600,
						}}
					>
						{monthNamesRu.map((name, idx) => (
							<option key={name} value={idx}>
								{name}
							</option>
						))}
					</select>

					{/* Year Selector */}
					<select
						value={selectedYear}
						onChange={(e) => setSelectedYear(Number(e.target.value))}
						style={{
							padding: "0.4rem 0.75rem",
							borderRadius: "8px",
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper, #ffffff)",
							color: "var(--ink, #0f172a)",
							fontSize: "0.85rem",
							fontWeight: 600,
						}}
					>
						{[2025, 2026, 2027].map((yr) => (
							<option key={yr} value={yr}>
								{yr} г.
							</option>
						))}
					</select>

					{/* Room filter */}
					<select
						value={roomFilter}
						onChange={(e) => setRoomFilter(e.target.value)}
						style={{
							padding: "0.4rem 0.75rem",
							borderRadius: "8px",
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper, #ffffff)",
							color: "var(--ink, #0f172a)",
							fontSize: "0.85rem",
						}}
					>
						<option value="all">Все кабинеты клиники</option>
						<option value="Кабинет № 1">Кабинет № 1 (Терапия)</option>
						<option value="Кабинет № 2">Кабинет № 2 (Ортопедия)</option>
						<option value="Хирургический">Операционная / Хирургия</option>
						<option value="Стерилизационная">Стерилизационная (ЦСО)</option>
					</select>
				</div>

				{/* Primary 1-Click Autopilot Action */}
				<button
					type="button"
					onClick={handleGenerateMonthlySchedule}
					disabled={isAutopilotLoading}
					className="touch-manipulation"
					style={{
						minHeight: "44px",
						padding: "0.5rem 1.25rem",
						fontSize: "0.9rem",
						fontWeight: 800,
						borderRadius: "8px",
						background: "var(--teal, #0d9488)",
						color: "#ffffff",
						border: "none",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "0.5rem",
						boxShadow: "0 2px 8px rgba(13, 148, 136, 0.35)",
						whiteSpace: "nowrap",
					}}
					title="Автоматически заполнить график генеральных уборок на текущий месяц с интервалом 7 дней для каждого кабинета клиники по СанПиН 3.3686-21"
					data-testid="generate-monthly-cleanings-btn"
				>
					<Sparkles size={16} />
					<span>
						{isAutopilotLoading
							? "Формирование графика..."
							: "⚡ Заполнить график генеральных уборок на месяц (по СанПиН каждые 7 дней)"}
					</span>
				</button>
			</div>

			{/* Weekly Matrix of Cleaning Milestones */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
					gap: "1rem",
				}}
			>
				{scheduledWeeks.map((week) => {
					const dateTargetStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(week.targetDay).padStart(2, "0")}`;
					const weekLogs = currentMonthLogs.filter(
						(l) => l.scheduledDate === dateTargetStr,
					);

					return (
						<div
							key={week.weekNumber}
							style={{
								border: "1px solid var(--line, #e2e8f0)",
								borderRadius: "10px",
								padding: "0.85rem",
								background: "var(--paper, #ffffff)",
								boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
								display: "flex",
								flexDirection: "column",
								gap: "0.6rem",
							}}
						>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									borderBottom: "1px solid var(--line, #f1f5f9)",
									paddingBottom: "0.4rem",
								}}
							>
								<div>
									<span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--ink, #0f172a)" }}>
										Неделя {week.weekNumber}
									</span>
									<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", marginLeft: "0.4rem" }}>
										(с {week.startDate} по {week.endDate} {monthNamesRu[selectedMonth]?.slice(0, 3)})
									</span>
								</div>
								<span
									style={{
										fontSize: "0.75rem",
										fontWeight: 700,
										color: "var(--teal, #0d9488)",
										background: "var(--teal-soft, #f0fdfa)",
										padding: "0.15rem 0.5rem",
										borderRadius: "6px",
									}}
								>
									{weekLogs.length} уборок
								</span>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
								{CLINIC_ROOMS_CATALOG.map((room) => {
									const existingLog = weekLogs.find((l) => l.roomName?.includes(room.name.split(" ")[0] || ""));
									const isCompleted = existingLog?.status === "completed" || existingLog?.status === "verified_by_inspector";
									const isVerified = existingLog?.status === "verified_by_inspector";

									return (
										<div
											key={room.id}
											style={{
												padding: "0.5rem 0.65rem",
												borderRadius: "6px",
												background: isCompleted ? "rgba(13, 148, 136, 0.08)" : "var(--paper-soft, #f8fafc)",
												border: isCompleted ? "1px solid rgba(13, 148, 136, 0.25)" : "1px dashed var(--line, #cbd5e1)",
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
												gap: "0.5rem",
											}}
										>
											<div style={{ minWidth: 0, flex: 1 }}>
												<div style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--ink, #0f172a)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
													{room.name}
												</div>
												<div style={{ fontSize: "0.7rem", color: "var(--muted, #64748b)" }}>
													{room.areaM2} м² • Аламинол 1.5% • 60 мин + УФ
												</div>
											</div>

											<div>
												{isVerified ? (
													<span
														style={{
															fontSize: "0.7rem",
															fontWeight: 700,
															color: "var(--ok-fg, #16a34a)",
															display: "inline-flex",
															alignItems: "center",
															gap: "2px",
															whiteSpace: "nowrap",
														}}
													>
														<ShieldCheck size={12} /> Заверено
													</span>
												) : isCompleted ? (
													<span
														style={{
															fontSize: "0.7rem",
															fontWeight: 700,
															color: "var(--teal, #0d9488)",
															display: "inline-flex",
															alignItems: "center",
															gap: "2px",
															whiteSpace: "nowrap",
														}}
													>
														<CheckCircle2 size={12} /> Выполнено
													</span>
												) : (
													<span
														style={{
															fontSize: "0.7rem",
															fontWeight: 600,
															color: "var(--muted, #64748b)",
															whiteSpace: "nowrap",
														}}
													>
														План: {week.targetDay} {monthNamesRu[selectedMonth]?.slice(0, 3)}
													</span>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
