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
	const [popoverSlot, setPopoverSlot] = useState<{
		time: string;
		chair: string;
	} | null>(null);
	const [patientSearch, setPatientSearch] = useState("");
	const [isMobile, setIsMobile] = useState(false);
	const [mobileChairId, setMobileChairId] = useState<string | null>(null);
	const searchRef = useRef<HTMLInputElement>(null);

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

	useEffect(() => {
		if (popoverSlot && searchRef.current) {
			requestAnimationFrame(() => searchRef.current?.focus());
		}
	}, [popoverSlot]);

	const handleCellLeave = useCallback(() => {
		setCrosshair(null);
	}, []);

	const handleEmptyClick = useCallback((time: string, chair: string) => {
		setPatientSearch("");
		setPopoverSlot({ time, chair });
	}, []);

	const handleCreateAppointment = async (patientId: string) => {
		if (!popoverSlot) return;

		// Parse time
		const today = new Date();
		const dateStr = today.toISOString().split("T")[0];
		const startsAt = new Date(
			`${dateStr}T${popoverSlot.time}:00`,
		).toISOString();

		// Add 1 hour duration
		const endsAt = new Date(
			new Date(startsAt).getTime() + 3600000,
		).toISOString();

		// Default doctor is the first doctor in staff
		const staff = dashboard?.clinicSettings?.staff || [];
		const firstDoctor = staff.find(
			(s: any) => s.role === "doctor" || s.role === "Врач",
		);

		try {
			const res = await fetch("/api/appointments", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId,
					chairId: popoverSlot.chair,
					doctorUserId: firstDoctor?.id,
					startsAt,
					endsAt,
					status: "planned",
				}),
			});

			if (!res.ok) {
				if (res.status === 409) {
					showToast(
						"Этот слот только что был занят другим администратором. Выберите другое время.",
						"error",
					);
				} else {
					showToast(`Ошибка сервера: ${res.status}`, "error");
				}
				return;
			}

			showToast("Запись успешно создана!", "success");
			setPopoverSlot(null);
			// Let websocket or parent component refresh data
		} catch (e) {
			console.error(e);
			showToast("Ошибка при создании записи", "error");
		}
	};

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

	const searchResults =
		patientSearch.length > 0
			? patientsList.filter(
					(p) =>
						p.fullName?.toLowerCase().includes(patientSearch.toLowerCase()) ||
						p.phone?.includes(patientSearch),
				)
			: [];

	return (
		<div className="clinical-scheduler">
			<div className="scheduler-header">
				<h3>Ежедневное расписание</h3>
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

			{/* Quick-Book Popover */}
			{popoverSlot && (
				<div
					className="sg-popover-backdrop"
					onClick={() => setPopoverSlot(null)}
				>
					<div className="sg-popover" onClick={(e) => e.stopPropagation()}>
						<div className="sg-popover-header">
							<span>
								Новая запись —{" "}
								{
									displayedChairs.find((c: any) => c.id === popoverSlot.chair)
										?.name
								}
								, {popoverSlot.time}
							</span>
							<button
								className="sg-popover-close"
								onClick={() => setPopoverSlot(null)}
							>
								✕
							</button>
						</div>
						<div className="sg-popover-body">
							<label className="sg-popover-label">Поиск пациента</label>
							<input
								ref={searchRef}
								className="sg-popover-search"
								type="text"
								placeholder="ФИО или телефон..."
								value={patientSearch}
								onChange={(e) => setPatientSearch(e.target.value)}
							/>
							{patientSearch.length > 0 && searchResults.length > 0 && (
								<div className="sg-popover-results">
									{searchResults.map((p) => (
										<div
											key={p.id}
											className="sg-popover-result-item"
											onClick={() => handleCreateAppointment(p.id)}
										>
											{p.fullName} ({p.phone})
										</div>
									))}
								</div>
							)}
							{patientSearch.length > 0 && searchResults.length === 0 && (
								<div
									className="sg-popover-results"
									style={{ padding: "10px", color: "#888" }}
								>
									Не найдено.
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
