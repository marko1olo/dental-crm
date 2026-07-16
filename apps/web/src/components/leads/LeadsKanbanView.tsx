import {
	Calendar,
	CalendarClock,
	ChevronRight,
	Globe,
	Handshake,
	Phone,
	Plus,
	Trash2,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useWebsocket } from "../../hooks/useWebsocket";
import { type Lead, useLeadsStore } from "../../store/leadsStore";
import { useThemeStore } from "../../store/themeStore";
import { showToast } from "../GlobalToast";

const COLUMNS: {
	id: Lead["status"];
	label: string;
	color: string;
	icon: React.ReactNode;
}[] = [
	{
		id: "new",
		label: "Новые лиды",
		color: "rgba(59, 130, 246, 0.2)",
		icon: <Plus size={16} />,
	},
	{
		id: "contacted",
		label: "В работе",
		color: "rgba(245, 158, 11, 0.2)",
		icon: <Phone size={16} />,
	},
	{
		id: "consult_booked",
		label: "Записаны",
		color: "rgba(16, 185, 129, 0.2)",
		icon: <CalendarClock size={16} />,
	},
	{
		id: "no_answer",
		label: "Недозвон",
		color: "rgba(107, 114, 128, 0.2)",
		icon: <Handshake size={16} />,
	},
	{
		id: "trash",
		label: "Мусор",
		color: "rgba(239, 68, 68, 0.2)",
		icon: <Trash2 size={16} />,
	},
];

export function LeadsKanbanView() {
	const { leads, fetchLeads, updateLeadStatus, isLoading } = useLeadsStore();
	const themeMode = useThemeStore((s) => s.themeMode);
	const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

	// Modal State
	const [isConvertOpen, setIsConvertOpen] = useState(false);
	const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
	const [staff, setStaff] = useState<any[]>([]);
	const [chairs, setChairs] = useState<any[]>([]);
	const [organizationId, setOrganizationId] = useState("");
	const [selectedDoctorId, setSelectedDoctorId] = useState("");
	const [selectedChairId, setSelectedChairId] = useState("");
	const [appointmentDate, setAppointmentDate] = useState("");
	const [appointmentTime, setAppointmentTime] = useState("10:00");

	const { lastMessage } = useWebsocket(
		import.meta.env.VITE_WS_URL ?? "ws://localhost:4100/api/ws/schedule",
	);

	useEffect(() => {
		if (
			lastMessage?.type === "LEAD_CREATED" ||
			lastMessage?.type === "LEAD_UPDATED" ||
			lastMessage?.type === "LEAD_DELETED"
		) {
			fetchLeads();
		}
	}, [lastMessage, fetchLeads]);

	useEffect(() => {
		fetchLeads();

		// Load metadata for conversion modal
		async function loadMeta() {
			try {
				const userRes = await fetch("/api/auth/user/me", {
					headers: {
						Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
					},
				});
				if (userRes.ok) {
					const userData = await userRes.json();
					setOrganizationId(
						userData.organizationId || "00000000-0000-0000-0000-000000000000",
					);
				}
				const dbRes = await fetch("/api/dashboard", {
					headers: {
						Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
					},
				});
				if (dbRes.ok) {
					const dashboard = await dbRes.json();
					if (dashboard.clinicSettings) {
						const doctors = (dashboard.clinicSettings.staff || []).filter(
							(s: any) =>
								s.role === "doctor" || s.role === "Врач" || s.role === "admin",
						);
						setStaff(doctors);
						setChairs(dashboard.clinicSettings.chairs || []);

						if (doctors.length > 0) setSelectedDoctorId(doctors[0].id);
						if (dashboard.clinicSettings.chairs?.length > 0)
							setSelectedChairId(dashboard.clinicSettings.chairs[0].id);
					}
				}
			} catch (e) {
				console.error("Failed to load metadata", e);
			}
		}
		loadMeta();

		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		setAppointmentDate(tomorrow.toISOString().split("T")[0] ?? "");
	}, []);

	const handleDragStart = (e: React.DragEvent, id: string) => {
		e.dataTransfer.setData("leadId", id);
		setDraggedLeadId(id);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDrop = (e: React.DragEvent, status: Lead["status"]) => {
		e.preventDefault();
		const id = e.dataTransfer.getData("leadId");
		if (id && draggedLeadId === id) {
			if (status === "consult_booked") {
				setConvertingLeadId(id);
				setIsConvertOpen(true);
			} else {
				updateLeadStatus(id, status);
			}
		}
		setDraggedLeadId(null);
	};

	const handleConvertSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!convertingLeadId) return;

		const startDateTime = new Date(`${appointmentDate}T${appointmentTime}:00`);
		const endDateTime = new Date(startDateTime.getTime() + 3600000);

		try {
			const res = await fetch(`/api/leads/${convertingLeadId}/convert`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
				},
				body: JSON.stringify({
					appointmentStart: startDateTime.toISOString(),
					appointmentEnd: endDateTime.toISOString(),
					chairId: selectedChairId,
					doctorId: selectedDoctorId,
					organizationId:
						organizationId || "00000000-0000-0000-0000-000000000000",
				}),
			});

			if (!res.ok) throw new Error("Failed to convert lead");
			showToast("Лид успешно записан на прием", "success");
			setIsConvertOpen(false);
			setConvertingLeadId(null);
			// Manually trigger refresh in store or locally update to consult_booked
			updateLeadStatus(convertingLeadId, "consult_booked");
			fetchLeads();
		} catch (e) {
			console.error(e);
			showToast("Ошибка записи лида", "error");
		}
	};

	if (isLoading && leads.length === 0) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: "100%",
					color: "var(--text-secondary)",
				}}
			>
				Загрузка конвейера...
			</div>
		);
	}

	const boardBg = "var(--paper-strong)";
	const colBg = "var(--paper-soft)";
	const cardBg = "var(--paper)";
	const borderColor = "var(--line)";

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				height: "100%",
				padding: "24px",
				background: boardBg,
				backdropFilter: "blur(20px)",
				borderRadius: "16px",
				border: `1px solid ${borderColor}`,
				boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 24,
				}}
			>
				<h2
					style={{
						margin: 0,
						fontSize: 24,
						fontWeight: 600,
						color: "var(--ink)",
						display: "flex",
						alignItems: "center",
						gap: 12,
					}}
				>
					Воронка Пациентов
					<span
						style={{
							fontSize: 12,
							padding: "4px 8px",
							background: "var(--teal)",
							color: "#fff",
							borderRadius: 12,
						}}
					>
						PRO
					</span>
				</h2>
				<button className="primary-button" onClick={() => fetchLeads()}>
					Обновить
				</button>
			</div>

			<div
				style={{
					display: "flex",
					gap: "16px",
					flex: 1,
					overflowX: "auto",
					paddingBottom: "16px",
				}}
			>
				{COLUMNS.map((col) => {
					const columnLeads = leads.filter((l) => l.status === col.id);

					return (
						<div
							key={col.id}
							onDragOver={handleDragOver}
							onDrop={(e) => handleDrop(e, col.id)}
							style={{
								flex: "0 0 320px",
								background: colBg,
								borderRadius: "12px",
								padding: "16px",
								display: "flex",
								flexDirection: "column",
								border: `1px solid ${borderColor}`,
								transition: "all 0.3s ease",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									marginBottom: "16px",
									paddingBottom: "12px",
									borderBottom: `1px solid ${borderColor}`,
								}}
							>
								<div
									style={{ display: "flex", alignItems: "center", gap: "8px" }}
								>
									<div
										style={{
											width: 32,
											height: 32,
											borderRadius: 8,
											background: col.color,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											color: "var(--ink)",
										}}
									>
										{col.icon}
									</div>
									<h3
										style={{
											margin: 0,
											fontSize: 16,
											fontWeight: 500,
											color: "var(--ink)",
										}}
									>
										{col.label}
									</h3>
								</div>
								<span
									style={{
										fontSize: 13,
										color: "var(--muted)",
										background: "var(--line)",
										padding: "2px 8px",
										borderRadius: 12,
									}}
								>
									{columnLeads.length}
								</span>
							</div>

							<div
								style={{
									flex: 1,
									overflowY: "auto",
									display: "flex",
									flexDirection: "column",
									gap: "12px",
								}}
							>
								{columnLeads.map((lead) => (
									<div
										key={lead.id}
										draggable
										onDragStart={(e) => handleDragStart(e, lead.id)}
										style={{
											background: cardBg,
											padding: "16px",
											borderRadius: "12px",
											cursor: "grab",
											border: `1px solid ${borderColor}`,
											boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
											opacity: draggedLeadId === lead.id ? 0.5 : 1,
											transform:
												draggedLeadId === lead.id ? "scale(0.98)" : "scale(1)",
											transition: "transform 0.2s",
										}}
									>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "flex-start",
												marginBottom: "8px",
											}}
										>
											<strong style={{ fontSize: 15, color: "var(--ink)" }}>
												{lead.name}
											</strong>
											<ChevronRight size={16} color="var(--muted)" />
										</div>

										{lead.phone && (
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 6,
													fontSize: 13,
													color: "var(--muted)",
													marginBottom: 4,
												}}
											>
												<Phone size={12} /> {lead.phone}
											</div>
										)}

										<div
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												marginTop: "12px",
											}}
										>
											{lead.source && (
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: 4,
														fontSize: 11,
														color: "var(--teal)",
														background: "rgba(59, 130, 246, 0.1)",
														padding: "2px 6px",
														borderRadius: 4,
													}}
												>
													<Globe size={10} /> {lead.source}
												</div>
											)}
											{lead.expectedRevenue ? (
												<div
													style={{
														fontSize: 12,
														fontWeight: 600,
														color: "var(--ink)",
													}}
												>
													{lead.expectedRevenue} ₽
												</div>
											) : null}
										</div>
									</div>
								))}

								{columnLeads.length === 0 && (
									<div
										style={{
											padding: "24px",
											textAlign: "center",
											color: "var(--muted)",
											fontSize: 13,
											border: `1px dashed ${borderColor}`,
											borderRadius: 12,
										}}
									>
										Перетащите сюда
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{isConvertOpen && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 100,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						background: "rgba(0,0,0,0.5)",
						backdropFilter: "blur(4px)",
					}}
				>
					<div
						style={{
							background: cardBg,
							borderRadius: 16,
							padding: 24,
							width: 400,
							maxWidth: "90%",
							border: `1px solid ${borderColor}`,
							boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: 20,
							}}
						>
							<h3
								style={{
									margin: 0,
									fontSize: 18,
									fontWeight: 600,
									color: "var(--ink)",
									display: "flex",
									alignItems: "center",
									gap: 8,
								}}
							>
								<Calendar size={20} color="var(--teal)" /> Записать лида
							</h3>
							<button
								onClick={() => setIsConvertOpen(false)}
								style={{
									background: "none",
									border: "none",
									color: "var(--muted)",
									cursor: "pointer",
								}}
							>
								<X size={20} />
							</button>
						</div>

						<form
							onSubmit={handleConvertSubmit}
							style={{ display: "flex", flexDirection: "column", gap: 16 }}
						>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label style={{ fontSize: 13, color: "var(--muted)" }}>
									Врач
								</label>
								<select
									value={selectedDoctorId}
									onChange={(e) => setSelectedDoctorId(e.target.value)}
									style={{
										padding: 10,
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: colBg,
										color: "var(--ink)",
									}}
									required
								>
									{staff.length === 0 && <option value="">Нет врачей</option>}
									{staff.map((s) => (
										<option key={s.id} value={s.id}>
											{s.fullName || s.name}
										</option>
									))}
								</select>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label style={{ fontSize: 13, color: "var(--muted)" }}>
									Кресло
								</label>
								<select
									value={selectedChairId}
									onChange={(e) => setSelectedChairId(e.target.value)}
									style={{
										padding: 10,
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: colBg,
										color: "var(--ink)",
									}}
									required
								>
									{chairs.length === 0 && <option value="">Нет кресел</option>}
									{chairs.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name}
										</option>
									))}
								</select>
							</div>

							<div style={{ display: "flex", gap: 12 }}>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: 6,
										flex: 1,
									}}
								>
									<label style={{ fontSize: 13, color: "var(--muted)" }}>
										Дата
									</label>
									<input
										type="date"
										value={appointmentDate}
										onChange={(e) => setAppointmentDate(e.target.value)}
										style={{
											padding: 10,
											borderRadius: 8,
											border: `1px solid ${borderColor}`,
											background: colBg,
											color: "var(--ink)",
										}}
										required
									/>
								</div>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: 6,
										flex: 1,
									}}
								>
									<label style={{ fontSize: 13, color: "var(--muted)" }}>
										Время
									</label>
									<input
										type="time"
										value={appointmentTime}
										onChange={(e) => setAppointmentTime(e.target.value)}
										style={{
											padding: 10,
											borderRadius: 8,
											border: `1px solid ${borderColor}`,
											background: colBg,
											color: "var(--ink)",
										}}
										required
									/>
								</div>
							</div>

							<button
								type="submit"
								className="primary-button"
								style={{
									marginTop: 8,
									width: "100%",
									justifyContent: "center",
								}}
							>
								Подтвердить запись
							</button>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
