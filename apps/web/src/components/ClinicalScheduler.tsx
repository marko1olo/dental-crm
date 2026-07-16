import React, { useCallback, useEffect, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../AppHelpers.js";
import { showToast } from "./GlobalToast.js";
import "./ClinicalScheduler.css";

interface AppointmentSlot {
	id: string;
	time: string;
	patientName: string;
	type: "therapy" | "orthopedics" | "consultation";
	hasCriticalAlert: boolean;
	labStatus?: "delivered" | "in_progress" | "none" | "ready";
	duration?: number;
	alert?: string;
}

interface CrosshairState {
	rowIdx: number;
	colIdx: number;
}

export const ClinicalScheduler: React.FC<any> = ({
	appointments,
	dashboard,
	onSlotClick,
}) => {
	const [crosshair, setCrosshair] = useState<CrosshairState | null>(null);
	const [isMobile, setIsMobile] = useState(false);
	const [mobileChairId, setMobileChairId] = useState<string | null>(null);

	// Patients for dropdown search
	const [patientsList, setPatientsList] = useState<any[]>([]);

	useEffect(() => {
		fetch("/api/patients", { headers: denteAdminSecretRequestHeaders() })
			.then((res) => res.json())
			.then((data) => {
				if (Array.isArray(data)) setPatientsList(data);
			})
			.catch(console.error);

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
	const rowStyle = { gridTemplateColumns: `60px repeat(${chairsCount}, 1fr)` };

	const freeDoctors =
		dashboard?.shiftIntelligence?.doctorLoads?.filter(
			(dl: any) => dl.utilizationPercent < 50 || dl.state === "under_utilized",
		) || [];

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
									onClick={() => onSlotClick && onSlotClick(new Date().toISOString().split("T")[0], doc.nextFreeAt || "10:00", "")}
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

			{/* Crosshair grid */}
			<div className="scheduler-grid-wrap" onMouseLeave={handleCellLeave}>
				{/* Chair headers */}
				{!isSingleChair && (
					<div className="sg-row sg-header-row" style={rowStyle}>
						<div className="sg-time-cell" />
						{displayedChairs.map((chair: any, ci: number) => (
							<div
								key={chair.id}
								className={`sg-chair-header ${crosshair && crosshair.colIdx === ci ? "sg-col-highlight" : ""}`}
							>
								{chair.name}
							</div>
						))}
					</div>
				)}

				{TIME_SLOTS.map((time, ri) => (
					<div key={time} className="sg-row" style={rowStyle}>
						{/* Time label */}
						<div
							className={`sg-time-cell ${crosshair && crosshair.rowIdx === ri ? "sg-row-highlight-label" : ""}`}
						>
							{time}
						</div>

						{displayedChairs.map((chair: any, ci: number) => {
							const appt = (appointments || []).find((a: any) => {
								if (a.chairId !== chair.id) return false;
								if (!a.startsAt) return false;
								const apptTime = new Date(a.startsAt);
								const h = apptTime.getHours().toString().padStart(2, "0");
								const m = apptTime.getMinutes().toString().padStart(2, "0");
								return `${h}:${m}` === time;
							});

							return (
								<div
									key={chair.id}
									className={`sg-cell ${!appt ? "sg-cell--empty" : "sg-cell--filled"} 
                    ${crosshair && crosshair.rowIdx === ri && crosshair.colIdx === ci ? "sg-cell-highlight" : ""}
                    ${crosshair && (crosshair.rowIdx === ri || crosshair.colIdx === ci) ? "sg-row-highlight" : ""}
                  `}
									onMouseEnter={() => setCrosshair({ rowIdx: ri, colIdx: ci })}
									onClick={() => {
										if (!appt) handleEmptyClick(time, chair.id);
									}}
								>
									{appt && (
										<div className="sg-appt-card sg-appt-therapy">
											<div className="sg-appt-title">
												{appt.patient?.fullName || "Пациент DB"}
											</div>
											<div className="sg-appt-meta">{appt.status}</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
};
