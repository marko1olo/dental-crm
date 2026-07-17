import { CheckCircle2, Circle, Clock, Plus, Trash2, Calendar, User, MoreVertical } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";
import { motion, AnimatePresence } from "framer-motion";

export function PatientTaskTicketsWidget({ patientId }: { patientId: string }) {
	const { dashboard, auth } = useAppLogicContext();
	const [tickets, setTickets] = useState<any[]>([]);
	const [isAdding, setIsAdding] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const [newTitle, setNewTitle] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [assignedToId, setAssignedToId] = useState("");
	
	const fetchTickets = async () => {
		setIsLoading(true);
		try {
			const res = await fetch(`/api/patients/${patientId}/tickets`, {
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) setTickets(await res.json());
		} catch (e) {
			console.error(e);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchTickets();
	}, [patientId]);

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newTitle || !assignedToId) return;
		try {
			const res = await fetch(`/api/patients/${patientId}/tickets`, {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					title: newTitle,
					description: newDescription,
					assignedToId,
					priority: "normal",
				}),
			});
			if (res.ok) {
				setIsAdding(false);
				setNewTitle("");
				setNewDescription("");
				fetchTickets();
				showToast("Задача успешно создана", "success");
			} else {
				showToast("Ошибка при создании задачи", "error");
			}
		} catch (e) {
			console.error(e);
			showToast("Ошибка сети", "error");
		}
	};

	const handleToggleStatus = async (ticketId: string, currentStatus: string) => {
		const newStatus = currentStatus === "pending" ? "completed" : "pending";
		// Optimistic update
		setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
		try {
			const res = await fetch(`/api/patients/${patientId}/tickets/${ticketId}`, {
				method: "PUT",
				headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ status: newStatus }),
			});
			if (!res.ok) {
				showToast("Ошибка при обновлении статуса", "error");
				fetchTickets(); // Revert on failure
			}
		} catch (e) {
			console.error(e);
			fetchTickets();
		}
	};

	const handleDelete = async (ticketId: string) => {
		if (!confirm("Вы действительно хотите удалить эту задачу?")) return;
		try {
			const res = await fetch(`/api/patients/${patientId}/tickets/${ticketId}`, {
				method: "DELETE",
				headers: auth.denteClinicalMutationHeaders(),
			});
			if (res.ok) {
				showToast("Задача удалена", "success");
				setTickets(tickets.filter(t => t.id !== ticketId));
			} else {
				showToast("Ошибка при удалении", "error");
			}
		} catch (e) {
			console.error(e);
		}
	};

	const staff = dashboard?.clinicSettings?.staff || [];
	const pendingCount = tickets.filter((t: any) => t.status === "pending").length;

	return (
		<div className="panel-card" style={{ marginTop: "16px", padding: 0, overflow: "hidden", border: "1px solid var(--line)" }}>
			<div 
				className="panel-heading" 
				style={{ 
					display: "flex", 
					justifyContent: "space-between", 
					alignItems: "center", 
					padding: "16px 20px", 
					background: "var(--surface-50)",
					borderBottom: "1px solid var(--line)",
					margin: 0
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					<div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--brand-100)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-600)" }}>
						<Clock size={16} />
					</div>
					<div>
						<h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
							Задачи по пациенту
							{pendingCount > 0 && (
								<span style={{ background: "var(--brand-500)", color: "#fff", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>
									{pendingCount} активн.
								</span>
							)}
						</h3>
					</div>
				</div>
				<button 
					type="button" 
					onClick={() => setIsAdding(!isAdding)}
					style={{ 
						background: isAdding ? "var(--surface-200)" : "var(--brand-50)", 
						color: isAdding ? "var(--ink)" : "var(--brand-600)", 
						border: "none", 
						borderRadius: "8px", 
						padding: "6px 12px", 
						fontSize: "13px", 
						fontWeight: 600, 
						cursor: "pointer", 
						display: "flex", 
						alignItems: "center", 
						gap: "6px",
						transition: "all 0.2s"
					}}
				>
					<Plus size={16} /> {isAdding ? "Отмена" : "Создать"}
				</button>
			</div>

			<div style={{ padding: "20px" }}>
				<AnimatePresence>
					{isAdding && (
						<motion.form 
							initial={{ opacity: 0, height: 0, marginBottom: 0 }}
							animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
							exit={{ opacity: 0, height: 0, marginBottom: 0 }}
							onSubmit={handleAdd} 
							style={{ background: "var(--surface-100)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-300)", overflow: "hidden" }}
						>
							<div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
								<div className="smart-field">
									<input
										value={newTitle}
										onChange={(e) => setNewTitle(e.target.value)}
										placeholder=" "
										required
										autoFocus
										style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
									/>
									<label>Название задачи</label>
								</div>
								
								<div className="smart-field">
									<select
										value={assignedToId}
										onChange={(e) => setAssignedToId(e.target.value)}
										required
										style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
									>
										<option value="" disabled>Выберите ответственного сотрудника</option>
										{staff.map((s: any) => (
											<option key={s.id} value={s.id}>{s.fullName}</option>
										))}
									</select>
									<label>Кому назначена</label>
								</div>

								<div className="smart-field">
									<textarea
										value={newDescription}
										onChange={(e) => setNewDescription(e.target.value)}
										placeholder=" "
										style={{ resize: "vertical", minHeight: "80px", padding: "12px 16px", background: "var(--paper)", border: "1px solid var(--line)" }}
									/>
									<label>Описание и комментарии (опционально)</label>
								</div>
							</div>
							
							<div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
								<button type="button" className="ghost-button" onClick={() => setIsAdding(false)}>Отмена</button>
								<button type="submit" className="primary-button">Создать задачу</button>
							</div>
						</motion.form>
					)}
				</AnimatePresence>

				{!isLoading && tickets.length === 0 && !isAdding && (
					<div style={{ padding: "32px", textAlign: "center", color: "var(--muted)", background: "var(--surface-50)", borderRadius: "12px", border: "1px dashed var(--line)" }}>
						<Clock size={32} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
						<p style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>Нет активных задач по пациенту</p>
						<p style={{ margin: "4px 0 0", fontSize: "13px" }}>Задачи помогают администраторам и врачам не забыть о важных делах.</p>
					</div>
				)}

				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					<AnimatePresence>
						{tickets.map((ticket) => {
							const isPending = ticket.status === "pending";
							const assignee = staff.find((s: any) => s.id === ticket.assignedToId);
							
							return (
								<motion.div 
									key={ticket.id} 
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, scale: 0.95 }}
									style={{ 
										display: "flex", 
										alignItems: "flex-start", 
										gap: "16px", 
										padding: "16px", 
										background: isPending ? "var(--paper)" : "var(--surface-50)", 
										border: "1px solid",
										borderColor: isPending ? "var(--line)" : "transparent",
										borderRadius: "12px", 
										opacity: isPending ? 1 : 0.6,
										transition: "all 0.2s ease",
										position: "relative",
										boxShadow: isPending ? "0 2px 8px rgba(0,0,0,0.02)" : "none"
									}}
								>
									<button 
										onClick={() => handleToggleStatus(ticket.id, ticket.status)}
										style={{ 
											background: "none", 
											border: "none", 
											padding: 0, 
											cursor: "pointer",
											color: isPending ? "var(--slate-400)" : "var(--emerald)",
											transition: "color 0.2s ease, transform 0.1s ease",
											display: "flex",
											marginTop: "2px"
										}}
										title={isPending ? "Отметить как выполненную" : "Вернуть в работу"}
									>
										{isPending ? <Circle size={22} /> : <CheckCircle2 size={22} />}
									</button>
									
									<div style={{ flex: 1, minWidth: 0 }}>
										<div style={{ 
											fontWeight: 600, 
											fontSize: "15px", 
											color: "var(--ink)",
											textDecoration: isPending ? "none" : "line-through",
											marginBottom: ticket.description ? "6px" : "8px"
										}}>
											{ticket.title}
										</div>
										
										{ticket.description && (
											<div style={{ 
												fontSize: "13px", 
												color: "var(--slate-600)", 
												marginBottom: "10px",
												lineHeight: 1.5,
												background: "var(--surface-50)",
												padding: "8px 12px",
												borderRadius: "6px",
												borderLeft: "2px solid var(--border-300)"
											}}>
												{ticket.description}
											</div>
										)}
										
										<div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
											<div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>
												<User size={14} /> 
												<span style={{ color: "var(--brand-700)", background: "var(--brand-50)", padding: "2px 8px", borderRadius: "4px" }}>
													{assignee?.fullName || "Неизвестный сотрудник"}
												</span>
											</div>
											<div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--slate-400)" }}>
												<Calendar size={14} /> 
												{new Date(ticket.createdAt).toLocaleDateString("ru-RU")}
											</div>
										</div>
									</div>

									<button 
										onClick={() => handleDelete(ticket.id)}
										style={{ 
											background: "var(--surface-100)", 
											border: "none", 
											padding: "8px", 
											cursor: "pointer",
											color: "var(--slate-400)",
											borderRadius: "8px",
											transition: "all 0.2s ease"
										}}
										className="hover-red"
										title="Удалить задачу"
									>
										<Trash2 size={16} />
									</button>
								</motion.div>
							);
						})}
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
}
