import React, { useCallback, useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../AppHelpers.js";
import { showToast } from "./GlobalToast.js";
import "./ClinicalScheduler.css";

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
}) => {
	const [crosshair, setCrosshair] = useState<CrosshairState | null>(null);
	const [isMobile, setIsMobile] = useState(false);
	const [mobileChairId, setMobileChairId] = useState<string | null>(null);

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

	const displayedChairs =
		isMobile && mobileChairId
			? activeChairs.filter((c: any) => c.id === mobileChairId)
			: activeChairs;

	const chairsCount = displayedChairs.length;
	const isSingleChair = chairsCount === 1;

	const freeDoctors =
		dashboard?.shiftIntelligence?.doctorLoads?.filter(
			(dl: any) => dl.utilizationPercent < 50 || dl.state === "under_utilized",
		) || [];

	// Helper to calculate grid row start and span
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

	return (
		<div className="clinical-scheduler">
			<div className="scheduler-header">
				<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
					<h3>Ежедневное расписание</h3>
					{freeDoctors.length > 0 && (
						<div
							className="free-doctors-locator"
							style={{
								display: "flex",
								gap: "8px",
								alignItems: "center",
								marginLeft: "8px",
							}}
						>
							<span
								style={{
									fontSize: "12px",
									color: "var(--text-secondary)",
									fontWeight: 500,
								}}
							>
								Свободные окна:
							</span>
							{freeDoctors.map((doc: any) => (
								<div
									key={doc.id}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "4px",
										background: "rgba(16, 185, 129, 0.1)",
										border: "1px solid rgba(16, 185, 129, 0.2)",
										color: "var(--ink)",
										padding: "4px 8px",
										borderRadius: "16px",
										fontSize: "12px",
										fontWeight: 500,
										cursor: "pointer",
									}}
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
									<span
										style={{
											width: "6px",
											height: "6px",
											borderRadius: "50%",
											background: "#10b981",
											boxShadow: "0 0 6px rgba(16, 185, 129, 0.6)",
										}}
									/>
									{doc.title.split(" ")[0]} ({doc.utilizationPercent}%)
								</div>
							))}
						</div>
					)}
				</div>
				<div className="date-picker">Сегодня</div>
			</div>

			{isMobile && activeChairs.length > 1 && (
				<div style={{ padding: "0 16px 16px" }}>
					<select
						value={mobileChairId || activeChairs[0].id}
						onChange={(e) => setMobileChairId(e.target.value)}
						style={{
							width: "100%",
							padding: "12px",
							borderRadius: "8px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							fontSize: "16px",
							color: "var(--ink)",
						}}
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
					style={{
						display: "grid",
						gridTemplateColumns: `60px repeat(${chairsCount}, minmax(180px, 1fr))`,
						gridAutoRows: "44px",
					}}
				>
					{/* Headers */}
					{!isSingleChair && (
						<div className="sg-corner" style={{ gridRow: 1, gridColumn: 1 }} />
					)}
					{!isSingleChair &&
						displayedChairs.map((chair: any, ci: number) => (
							<div
								key={chair.id}
								className={`sg-chair-header ${crosshair && crosshair.colIdx === ci ? "sg-col-highlight" : ""}`}
								style={{ gridRow: 1, gridColumn: ci + 2 }}
							>
								{chair.name}
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

							{displayedChairs.map((chair: any, ci: number) => (
								<div
									key={`${time}-${chair.id}`}
									className={`sg-cell sg-cell--empty ${crosshair && crosshair.rowIdx === ri && crosshair.colIdx === ci ? "sg-cell-highlight" : ""} ${crosshair && (crosshair.rowIdx === ri || crosshair.colIdx === ci) ? "sg-row-highlight" : ""}`}
									style={{ gridRow: ri + 2, gridColumn: ci + 2 }}
									onMouseEnter={() => setCrosshair({ rowIdx: ri, colIdx: ci })}
									onClick={() => handleEmptyClick(time, chair.id)}
									onDragOver={(e) => {
										e.preventDefault(); // Allow drop
										e.dataTransfer.dropEffect = "copy";
										setCrosshair({ rowIdx: ri, colIdx: ci });
									}}
									onDrop={(e) => {
										e.preventDefault();
										setCrosshair(null);
										if (onSlotDrop) {
											const today = new Date().toISOString().split("T")[0];
											try {
												const dataStr =
													e.dataTransfer.getData("application/json");
												if (dataStr) {
													const data = JSON.parse(dataStr);
													onSlotDrop(today, time, chair.id, data);
												}
											} catch (err) {
												console.error("Drop failed", err);
											}
										}
									}}
								>
									<div className="sg-cell-plus">+</div>
								</div>
							))}
						</React.Fragment>
					))}

					{/* Appointments Overlay */}
					{(appointments || []).map((appt: any) => {
						const pos = getAppointmentGridPosition(appt);
						if (!pos) return null;

						const colIdx = displayedChairs.findIndex(
							(c: any) => c.id === appt.chairId,
						);
						if (colIdx === -1) return null; // Not in view

						// Resolve patient from dashboard
						const patient = dashboard?.patients?.find(
							(p: any) => p.id === appt.patientId,
						);

						// Resolve readiness from dashboard
						const readiness = dashboard?.appointmentReadiness?.find(
							(r: any) => r.appointmentId === appt.id,
						);

						return (
							<div
								key={appt.id}
								className="sg-appt-card-wrapper"
								style={{
									gridRow: `${pos.startRow} / span ${pos.span}`,
									gridColumn: colIdx + 2,
								}}
							>
								<div
									className={`sg-appt-card sg-appt-${appt.type || "therapy"}`}
									onClick={(e) => {
										e.stopPropagation();
										if (onAppointmentClick) onAppointmentClick(appt);
									}}
									style={{ position: "relative" }}
								>
									<div className="sg-appt-title">
										{patient?.fullName || "Неизвестный пациент"}
									</div>
									<div className="sg-appt-meta">{appt.status}</div>
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
