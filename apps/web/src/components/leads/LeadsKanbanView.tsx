import { AnimatePresence, motion } from "framer-motion";
import {
	Calendar,
	CalendarClock,
	ChevronRight,
	DollarSign,
	Edit2,
	Filter,
	Globe,
	Handshake,
	Phone,
	Plus,
	Search,
	Trash2,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
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
		label: "Новые",
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
		label: "Отказ",
		color: "rgba(239, 68, 68, 0.2)",
		icon: <Trash2 size={16} />,
	},
];

export function LeadsKanbanView() {
	const {
		leads,
		fetchLeads,
		updateLeadStatus,
		updateLeadDetails,
		addLead,
		isLoading,
	} = useLeadsStore();
	const { auth } = useAppLogicContext();
	const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

	// Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [sourceFilter, setSourceFilter] = useState("");

	// Convert Modal State
	const [isConvertOpen, setIsConvertOpen] = useState(false);
	const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
	const [staff, setStaff] = useState<any[]>([]);
	const [chairs, setChairs] = useState<any[]>([]);
	const [organizationId, setOrganizationId] = useState("");
	const [selectedDoctorId, setSelectedDoctorId] = useState("");
	const [selectedChairId, setSelectedChairId] = useState("");
	const [appointmentDate, setAppointmentDate] = useState("");
	const [appointmentTime, setAppointmentTime] = useState("10:00");

	// Edit/Add Modal State
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<Partial<Lead>>({
		name: "",
		phone: "",
		source: "",
		expectedRevenue: "",
	});

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

		async function loadMeta() {
			try {
				const userRes = await fetch("/api/auth/user/me", {
					headers: auth.denteClinicalReadHeaders(),
				});
				if (userRes.ok) {
					const userData = await userRes.json();
					setOrganizationId(
						userData.organizationId || "00000000-0000-0000-0000-000000000000",
					);
				}
				const dbRes = await fetch("/api/dashboard", {
					headers: auth.denteClinicalReadHeaders(),
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
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
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
			showToast("Лид успешно записан на прием (Создан Пациент)", "success");
			setIsConvertOpen(false);
			setConvertingLeadId(null);
			updateLeadStatus(convertingLeadId, "consult_booked");
			fetchLeads();
		} catch (e) {
			console.error(e);
			showToast("Ошибка записи лида", "error");
		}
	};

	const openEditModal = (lead?: Lead) => {
		if (lead) {
			setEditingLeadId(lead.id);
			setEditForm({
				name: lead.name,
				phone: lead.phone || "",
				source: lead.source || "",
				expectedRevenue: lead.expectedRevenue || "",
			});
		} else {
			setEditingLeadId("new");
			setEditForm({ name: "", phone: "", source: "", expectedRevenue: "" });
		}
		setIsEditOpen(true);
	};

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const payload = {
				name: editForm.name || "Без имени",
				phone: editForm.phone || "",
				source: editForm.source || "",
				expectedRevenue: editForm.expectedRevenue
					? String(editForm.expectedRevenue)
					: "",
			};

			if (editingLeadId === "new") {
				await addLead(payload);
				showToast("Новый лид добавлен", "success");
			} else if (editingLeadId) {
				await updateLeadDetails(editingLeadId, payload);
				showToast("Лид обновлен", "success");
			}
			setIsEditOpen(false);
		} catch (e) {
			showToast("Ошибка сохранения", "error");
		}
	};

	const filteredLeads = useMemo(() => {
		return leads.filter((l) => {
			const q = searchQuery.toLowerCase();
			const matchesSearch =
				!q || l.name?.toLowerCase().includes(q) || l.phone?.includes(q);
			const matchesSource = !sourceFilter || l.source === sourceFilter;
			return matchesSearch && matchesSource;
		});
	}, [leads, searchQuery, sourceFilter]);

	const uniqueSources = useMemo(() => {
		const s = new Set<string>();
		leads.forEach((l) => {
			if (l.source) s.add(l.source);
		});
		return Array.from(s);
	}, [leads]);

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
			{/* HEADER & FILTERS */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 24,
					flexWrap: "wrap",
					gap: 16,
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
					<button className="primary-button" onClick={() => openEditModal()}>
						<Plus size={16} /> Новый лид
					</button>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
					<div style={{ position: "relative" }}>
						<Search
							size={16}
							color="var(--muted)"
							style={{ position: "absolute", left: 10, top: 10 }}
						/>
						<input
							type="text"
							placeholder="Поиск по имени или телефону..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							style={{
								padding: "8px 12px 8px 32px",
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: colBg,
								color: "var(--ink)",
								minWidth: 240,
							}}
						/>
					</div>
					<div style={{ position: "relative" }}>
						<Filter
							size={16}
							color="var(--muted)"
							style={{ position: "absolute", left: 10, top: 10 }}
						/>
						<select
							value={sourceFilter}
							onChange={(e) => setSourceFilter(e.target.value)}
							style={{
								padding: "8px 12px 8px 32px",
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: colBg,
								color: "var(--ink)",
								appearance: "none",
								minWidth: 140,
							}}
						>
							<option value="">Все источники</option>
							{uniqueSources.map((s) => (
								<option key={s} value={s}>
									{s}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* KANBAN BOARD */}
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
					const columnLeads = filteredLeads.filter((l) => l.status === col.id);
					const columnRevenue = columnLeads.reduce(
						(acc, l) => acc + (Number(l.expectedRevenue) || 0),
						0,
					);

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
									flexDirection: "column",
									gap: 8,
									marginBottom: "16px",
									paddingBottom: "12px",
									borderBottom: `1px solid ${borderColor}`,
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
										}}
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
												fontWeight: 600,
												color: "var(--ink)",
											}}
										>
											{col.label}
										</h3>
									</div>
									<span
										style={{
											fontSize: 13,
											fontWeight: 600,
											color: "var(--muted)",
											background: "var(--line)",
											padding: "2px 8px",
											borderRadius: 12,
										}}
									>
										{columnLeads.length}
									</span>
								</div>
								{columnRevenue > 0 && (
									<div
										style={{
											fontSize: 13,
											color: "var(--teal)",
											fontWeight: 500,
											display: "flex",
											alignItems: "center",
											gap: 4,
										}}
									>
										<DollarSign size={14} />{" "}
										{columnRevenue.toLocaleString("ru-RU")} ₽
									</div>
								)}
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
								<AnimatePresence>
									{columnLeads.map((lead) => (
										<motion.div
											layout
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, scale: 0.95 }}
											key={lead.id}
											draggable
											onDragStart={(e: any) => handleDragStart(e, lead.id)}
											onClick={() => openEditModal(lead)}
											style={{
												background: cardBg,
												padding: "16px",
												borderRadius: "12px",
												cursor: "grab",
												border: `1px solid ${borderColor}`,
												boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
												opacity: draggedLeadId === lead.id ? 0.5 : 1,
												transform:
													draggedLeadId === lead.id
														? "scale(0.98)"
														: "scale(1)",
												transition: "box-shadow 0.2s",
											}}
											whileHover={{
												y: -2,
												boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
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
												<strong
													style={{
														fontSize: 15,
														color: "var(--ink)",
														display: "flex",
														alignItems: "center",
														gap: 6,
													}}
												>
													{lead.name}
												</strong>
												<Edit2
													size={14}
													color="var(--muted)"
													style={{ opacity: 0.5 }}
												/>
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
												{lead.source ? (
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
												) : (
													<div />
												)}
												{lead.expectedRevenue ? (
													<div
														style={{
															fontSize: 12,
															fontWeight: 600,
															color: "var(--ink)",
															background: "var(--paper-soft)",
															padding: "2px 6px",
															borderRadius: 4,
														}}
													>
														{lead.expectedRevenue} ₽
													</div>
												) : null}
											</div>
										</motion.div>
									))}
								</AnimatePresence>

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

			{/* CONVERT MODAL */}
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
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
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
					</motion.div>
				</div>
			)}

			{/* EDIT / ADD MODAL */}
			{isEditOpen && (
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
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
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
								<Edit2 size={20} color="var(--teal)" />
								{editingLeadId === "new"
									? "Добавить лида"
									: "Редактировать лида"}
							</h3>
							<button
								onClick={() => setIsEditOpen(false)}
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
							onSubmit={handleEditSubmit}
							style={{ display: "flex", flexDirection: "column", gap: 16 }}
						>
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label style={{ fontSize: 13, color: "var(--muted)" }}>
									Имя пациента / лида
								</label>
								<input
									type="text"
									value={editForm.name}
									onChange={(e) =>
										setEditForm({ ...editForm, name: e.target.value })
									}
									placeholder="Иван Иванов"
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

							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label style={{ fontSize: 13, color: "var(--muted)" }}>
									Телефон
								</label>
								<input
									type="tel"
									value={editForm.phone}
									onChange={(e) =>
										setEditForm({ ...editForm, phone: e.target.value })
									}
									placeholder="+7 (999) 123-45-67"
									style={{
										padding: 10,
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: colBg,
										color: "var(--ink)",
									}}
								/>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label style={{ fontSize: 13, color: "var(--muted)" }}>
									Источник (Откуда пришел)
								</label>
								<input
									type="text"
									value={editForm.source}
									onChange={(e) =>
										setEditForm({ ...editForm, source: e.target.value })
									}
									placeholder="Instagram, Сайт, Рекомендация..."
									style={{
										padding: 10,
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: colBg,
										color: "var(--ink)",
									}}
								/>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label style={{ fontSize: 13, color: "var(--muted)" }}>
									Ожидаемая выручка (₽)
								</label>
								<input
									type="text"
									value={editForm.expectedRevenue}
									onChange={(e) =>
										setEditForm({
											...editForm,
											expectedRevenue: e.target.value,
										})
									}
									placeholder="15000"
									style={{
										padding: 10,
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: colBg,
										color: "var(--ink)",
									}}
								/>
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
								Сохранить
							</button>
						</form>
					</motion.div>
				</div>
			)}
		</div>
	);
}
