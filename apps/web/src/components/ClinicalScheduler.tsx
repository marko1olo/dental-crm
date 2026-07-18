import React, { useCallback, useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../AppHelpers.js";
import { showToast } from "./GlobalToast.js";
import "./ClinicalScheduler.css";
import { useWorkspaceProfileStore } from "../hooks/useWorkspaceProfile";

interface CrosshairState {
	rowIdx: number;
	colIdx: number;
}

export const ClinicalScheduler: React.FC<any> = ({
	appointments,
	dashboard,
	onSlotClick,
	onSlotDrop,
	onAppointmentClick,
	viewMode = "day",
	currentDate = new Date().toISOString().split("T")[0],
	onSetDate,
	onSetViewMode,
}) => {
	const [crosshair, setCrosshair] = useState<CrosshairState | null>(null);
	const [isMobile, setIsMobile] = useState(false);
	const [mobileChairId, setMobileChairId] = useState<string | null>(null);
	const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
	const [hoveredApptId, setHoveredApptId] = useState<string | null>(null);

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 768);
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	const handleCellLeave = useCallback(() => {
		setCrosshair(null);
	}, []);

	const handleEmptyClick = useCallback(
		(time: string, chair: string) => {
			if (onSlotClick) {
				const today = new Date();
				const dateStr = today.toISOString().split("T")[0];
				onSlotClick(dateStr, time, chair);
			}
		},
		[onSlotClick],
	);

	const workingHours = dashboard?.clinicSettings?.profile?.workingHours || [];
	let minStart = "09:00";
	let maxEnd = "18:00";
	const enabledDays = workingHours.filter((d: any) => d.enabled);
	if (enabledDays.length > 0) {
		minStart = enabledDays.reduce(
			(min: string, d: any) => (d.start < min ? d.start : min),
			"23:59",
		);
		maxEnd = enabledDays.reduce(
			(max: string, d: any) => (d.end > max ? d.end : max),
			"00:00",
		);
	}

	const TIME_SLOTS = React.useMemo(() => {
		const slots: string[] = [];
		const minParts = minStart.split(":").map(Number);
		const maxParts = maxEnd.split(":").map(Number);
		let h = minParts[0] || 9;
		let m = minParts[1] || 0;
		const eh = maxParts[0] || 18;
		const em = maxParts[1] || 0;
		const endTotal = eh * 60 + em;

		while (h * 60 + m < endTotal) {
			slots.push(
				`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
			);
			m += 30;
			if (m >= 60) {
				h += 1;
				m -= 60;
			}
		}
		return slots.length > 0 ? slots : ["09:00", "09:30", "10:00", "10:30"];
	}, [minStart, maxEnd]);

	const activeChairs =
		dashboard?.clinicSettings?.chairs?.filter((c: any) => c.active) || [];

	useEffect(() => {
		if (isMobile && !mobileChairId && activeChairs.length > 0) {
			setMobileChairId(activeChairs[0].id);
		}
	}, [isMobile, activeChairs, mobileChairId]);

	if (!dashboard || !appointments) {
		return (
			<div className="clinical-scheduler skeleton-container" style={{ minHeight: "400px", opacity: 0.6, pointerEvents: "none" }}>
				<div className="scheduler-header">
					<div style={{ width: "200px", height: "28px", background: "var(--line, #e2e8f0)", borderRadius: "6px" }} />
				</div>
				<div className="scheduler-grid-wrap" style={{ background: "var(--line-light, #eff2f5)", height: "300px", marginTop: "20px", borderRadius: "12px" }} />
			</div>
		);
	}

	const workspaceFlags = useWorkspaceProfileStore();
	
	const clinicMode = dashboard?.clinicSettings?.profile?.mode || "network_clinic";
	const isSmallCabinet = clinicMode === "solo_doctor" || clinicMode === "one_chair";

	const displayedChairs =
		(!workspaceFlags.hasMultipleChairs || isSmallCabinet) && activeChairs.length > 0
			? [activeChairs[0]]
			: isMobile && mobileChairId
				? activeChairs.filter((c: any) => c.id === mobileChairId)
				: activeChairs;

	const isWeekView = viewMode === "week";
	
	const getWeekDays = (dateStr: string) => {
		const curr = new Date(dateStr);
		const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);
		const days: string[] = [];
		for(let i=0; i<7; i++) {
			const d = new Date(curr);
			d.setDate(first + i);
			days.push(d.toISOString().substring(0, 10));
		}
		return days;
	};

	const weekDays = isWeekView ? getWeekDays(currentDate) : [];
	
	const columns = isWeekView 
		? weekDays.map(d => ({ 
			id: d, 
			name: new Date(d).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }) 
		  }))
		: displayedChairs;

	const columnsCount = columns.length;
	const isSingleColumn = columnsCount === 1;

	const freeDoctors =
		dashboard?.shiftIntelligence?.doctorLoads?.filter(
			(dl: any) => dl.utilizationPercent < 50 || dl.state === "under_utilized",
		) || [];

	const getAppointmentGridPosition = (appt: any) => {
		if (!appt.startsAt || !appt.endsAt) return null;

		const startsAt = new Date(appt.startsAt);
		const endsAt = new Date(appt.endsAt);

		const startH = startsAt.getHours();
		const startM = startsAt.getMinutes();
		const endH = endsAt.getHours();
		const endM = endsAt.getMinutes();

		const startMinutes = startH * 60 + startM;
		const endMinutes = endH * 60 + endM;

		const minParts = minStart.split(":").map(Number);
		const gridStartMinutes = (minParts[0] || 9) * 60 + (minParts[1] || 0);

		const offsetSlots = Math.max(
			0,
			Math.floor((startMinutes - gridStartMinutes) / 30),
		);
		const durationSlots = Math.max(
			1,
			Math.ceil((endMinutes - startMinutes) / 30),
		);

		return {
			startRow: offsetSlots + 2, // +1 for CSS Grid 1-index, +1 for Header Row = +2
			span: durationSlots,
		};
	};

	const occupiedCells = React.useMemo(() => {
		const cells = new Set<string>();
		(appointments || []).forEach((appt: any) => {
			const pos = getAppointmentGridPosition(appt);
			if (!pos) return;
			const colId = isWeekView ? appt.startsAt.substring(0, 10) : appt.chairId;
			for (let r = 0; r < pos.span; r++) {
				cells.add(`${pos.startRow + r}-${colId}`);
			}
		});
		return cells;
	}, [appointments, minStart, isWeekView]);

	const CurrentTimeIndicator = () => {
		const [currentTime, setCurrentTime] = useState(new Date());

		useEffect(() => {
			const interval = setInterval(() => setCurrentTime(new Date()), 60000);
			return () => clearInterval(interval);
		}, []);

		const hours = currentTime.getHours();
		const minutes = currentTime.getMinutes();
		const currentMinutes = hours * 60 + minutes;

		const minParts = minStart.split(":").map(Number);
		const gridStartMinutes = (minParts[0] || 9) * 60 + (minParts[1] || 0);
		const maxParts = maxEnd.split(":").map(Number);
		const gridEndMinutes = (maxParts[0] || 18) * 60 + (maxParts[1] || 0);

		if (currentMinutes < gridStartMinutes || currentMinutes >= gridEndMinutes) return null;

		const offsetSlots = (currentMinutes - gridStartMinutes) / 30;
		const rowStart = Math.floor(offsetSlots) + 2;
		const fraction = offsetSlots - Math.floor(offsetSlots);
		const topOffset = fraction * 44; // 44px is gridAutoRows height

		return (
			<div
				className="sg-current-time-line"
				style={{
					gridRow: rowStart,
					gridColumn: "1 / -1",
					top: `${topOffset}px`,
				}}
			>
				<div className="sg-current-time-dot"></div>
			</div>
		);
	};

	return (
		<div className="clinical-scheduler">
			<div className="scheduler-header">
				<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px", flex: 1 }}>
					<h3>Ежедневное расписание</h3>
					
					{/* Status Legend */}
					<div className="sg-status-legend">
						<span className="sg-legend-item"><span className="sg-legend-dot sg-appt-status-planned" /> Запланирован</span>
						<span className="sg-legend-item"><span className="sg-legend-dot sg-appt-status-confirmed" /> Подтвержден</span>
						<span className="sg-legend-item"><span className="sg-legend-dot sg-appt-status-arrived" /> Пришел</span>
						<span className="sg-legend-item"><span className="sg-legend-dot sg-appt-status-in_treatment" /> В кресле</span>
						<span className="sg-legend-item"><span className="sg-legend-dot sg-appt-status-completed" /> Завершен</span>
						<span className="sg-legend-item"><span className="sg-legend-dot sg-appt-status-cancelled" /> Отменен</span>
					</div>

					{freeDoctors.length > 0 && !isSmallCabinet && (
						<div className="free-doctors-locator">
							<span className="free-doctors-label">
								Свободные окна:
							</span>
							{freeDoctors.map((doc: any) => (
								<div
									key={doc.id}
									className="free-doctor-badge"
									onClick={() =>
										onSlotClick &&
										onSlotClick(
											new Date().toISOString().split("T")[0],
											doc.nextFreeAt || "10:00",
											"",
										)
									}
									title="Записать к врачу"
								>
									<span className="free-doctor-dot" />
									{doc.title.split(" ")[0]} ({doc.utilizationPercent}%)
								</div>
							))}
						</div>
					)}
				</div>
				<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
					<button 
						className="secondary-button" 
						style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
						onClick={() => setDensity(d => d === "comfortable" ? "compact" : "comfortable")}
					>
						{density === "comfortable" ? "Компактный вид" : "Комфортный вид"}
					</button>
					<div className="date-picker">Сегодня</div>
				</div>
			</div>

			{isMobile && !isWeekView && activeChairs.length > 1 && (
				<div style={{ padding: "0 16px 16px" }}>
					<select
						className="mobile-chair-selector"
						value={mobileChairId || activeChairs[0].id}
						onChange={(e) => setMobileChairId(e.target.value)}
					>
						{activeChairs.map((c: any) => (
							<option key={c.id} value={c.id}>
								{c.name}
							</option>
						))}
					</select>
				</div>
			)}

			<div className="scheduler-grid-wrap" onMouseLeave={handleCellLeave}>
				<div
					className="sg-grid-body"
					data-density={density}
					style={{
						display: "grid",
						gridTemplateColumns: `60px repeat(${columnsCount}, minmax(180px, 1fr))`,
						gridAutoRows: "44px",
					}}
				>
					{/* Headers */}
					{!isSingleColumn && (
						<div className="sg-corner" style={{ gridRow: 1, gridColumn: 1 }} />
					)}
					{!isSingleColumn &&
						columns.map((col: any, ci: number) => (
							<div
								key={col.id}
								className={`sg-chair-header ${crosshair && crosshair.colIdx === ci ? "sg-col-highlight" : ""}`}
								style={{ gridRow: 1, gridColumn: ci + 2, cursor: isWeekView ? "pointer" : "default" }}
								onClick={() => {
									if (isWeekView && onSetDate && onSetViewMode) {
										onSetDate(col.id);
										onSetViewMode("day");
									}
								}}
							>
								{col.name}
							</div>
						))}

					{/* Background cells (time labels and empty clickable areas) */}
					{TIME_SLOTS.map((time, ri) => (
						<React.Fragment key={time}>
							<div
								className={`sg-time-cell ${crosshair && crosshair.rowIdx === ri ? "sg-row-highlight-label" : ""}`}
								style={{ gridRow: ri + 2, gridColumn: 1 }}
							>
								{time}
							</div>

							{columns.map((col: any, ci: number) => {
								const isOccupied = occupiedCells.has(`${ri + 2}-${col.id}`);
								const isCrosshairHere = crosshair && crosshair.rowIdx === ri && crosshair.colIdx === ci;
								let dragClass = "";
								if (isCrosshairHere) {
									dragClass = isOccupied ? "sg-cell-highlight-invalid" : "sg-cell-highlight-valid";
								}

								return (
								<div
									key={`${time}-${col.id}`}
									className={`sg-cell sg-cell--empty ${isCrosshairHere ? "sg-cell-highlight" : ""} ${crosshair && (crosshair.rowIdx === ri || crosshair.colIdx === ci) ? "sg-row-highlight" : ""} ${dragClass}`}
									style={{ gridRow: ri + 2, gridColumn: ci + 2 }}
									onMouseEnter={() => setCrosshair({ rowIdx: ri, colIdx: ci })}
									onClick={() => {
										if (!isOccupied) {
											const dateVal = isWeekView ? col.id : currentDate;
											const chairVal = isWeekView ? (activeChairs[0]?.id || "") : col.id;
											if (onSlotClick) onSlotClick(dateVal, time, chairVal);
										}
									}}
									onDragOver={(e) => {
										e.preventDefault(); // Allow drop
										e.dataTransfer.dropEffect = isOccupied ? "none" : "copy";
										setCrosshair({ rowIdx: ri, colIdx: ci });
									}}
									onDrop={(e) => {
										e.preventDefault();
										setCrosshair(null);
										if (isOccupied) return;
										if (onSlotDrop) {
											const dateVal = isWeekView ? col.id : currentDate;
											const chairVal = isWeekView ? (activeChairs[0]?.id || "") : col.id;
											try {
												const dataStr =
													e.dataTransfer.getData("application/json");
												if (dataStr) {
													const data = JSON.parse(dataStr);
													onSlotDrop(dateVal, time, chairVal, data);
												}
											} catch (err) {
												console.error("Drop failed", err);
											}
										}
									}}
								>
									{!isOccupied && <div className="sg-cell-plus">+</div>}
								</div>
								);
							})}
						</React.Fragment>
					))}

					<CurrentTimeIndicator />

					{/* Appointments Overlay */}
					{(appointments || []).map((appt: any) => {
						const pos = getAppointmentGridPosition(appt);
						if (!pos) return null;

						const colIdx = isWeekView 
							? columns.findIndex((c: any) => c.id === appt.startsAt.substring(0, 10))
							: columns.findIndex((c: any) => c.id === appt.chairId);
							
						if (colIdx === -1) return null; // Not in view

						// Resolve patient from dashboard
						const patient = dashboard?.patients?.find(
							(p: any) => p.id === appt.patientId,
						);

						// Resolve readiness from dashboard
						const readiness = dashboard?.appointmentReadiness?.find(
							(r: any) => r.appointmentId === appt.id,
						);

						// Resolve doctor from dashboard
						const doctor = dashboard?.clinicSettings?.staff?.find(
							(m: any) => m.id === appt.doctorUserId,
						);

						const tooltipTitle = [
							`Пациент: ${patient?.fullName || "Неизвестно"}`,
							`Врач: ${doctor?.fullName || "Не назначен"}`,
							`Услуга: ${appt.reason || "Не указана"}`,
							`Телефон: ${patient?.phone || "Не указан"}`,
							appt.comment ? `Комментарий: ${appt.comment}` : ""
						].filter(Boolean).join("\n");

						return (
							<div
								key={appt.id}
								className="sg-appt-card-wrapper"
								style={{
									gridRow: `${pos.startRow} / span ${pos.span}`,
									gridColumn: colIdx + 2,
								}}
								onMouseEnter={() => setHoveredApptId(appt.id)}
								onMouseLeave={() => setHoveredApptId(null)}
							>
								<div
									className={`sg-appt-card sg-appt-${appt.type || "therapy"} sg-appt-status-${appt.status || "planned"}`}
									onClick={(e) => {
										e.stopPropagation();
										if (onAppointmentClick) onAppointmentClick(appt);
									}}
									style={{ position: "relative" }}
								>
									<div className="sg-appt-title">
										{patient?.fullName || "Неизвестный пациент"}
									</div>
									<div className="sg-appt-meta">
										{doctor?.fullName?.split(" ")[0] || "Без врача"}
										{appt.reason ? ` · ${appt.reason}` : ""}
									</div>
									<div className="sg-appt-time">
										{new Date(appt.startsAt).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
										{" - "}
										{new Date(appt.endsAt).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</div>

									{/* Custom Popover Tooltip */}
									{hoveredApptId === appt.id && (
										<div className="sg-appt-popover glass-panel">
											<div className="sg-popover-header">
												<strong>{patient?.fullName || "Неизвестный пациент"}</strong>
												<span className="sg-popover-time">
													{new Date(appt.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(appt.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
												</span>
											</div>
											<div className="sg-popover-body">
												{patient?.phone && <div>📞 {patient.phone}</div>}
												<div>👨‍⚕️ {doctor?.fullName || "Врач не назначен"}</div>
												{appt.reason && <div>⚕️ {appt.reason}</div>}
												{appt.comment && <div className="sg-popover-comment">📝 {appt.comment}</div>}
											</div>
										</div>
									)}

									{/* Status Lights (Светофоры) */}
									<div className="sg-appt-status-lights">
										{readiness?.state === "ready" && (
											<span
												className="sg-status-dot green"
												title={readiness.nextAction}
											/>
										)}
										{readiness?.state === "needs_attention" && (
											<span
												className="sg-status-dot yellow"
												title={readiness.nextAction}
											/>
										)}
										{readiness?.state === "blocked" && (
											<span
												className="sg-status-dot red"
												title={readiness.nextAction}
											/>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
