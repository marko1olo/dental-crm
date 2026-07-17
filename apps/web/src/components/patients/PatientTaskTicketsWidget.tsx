import { CheckCircle2, Circle, Clock, Plus, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";

export function PatientTaskTicketsWidget({ patientId }: { patientId: string }) {
	const { dashboard, auth } = useAppLogicContext();
	const [tickets, setTickets] = useState<any[]>([]);
	const [isAdding, setIsAdding] = useState(false);
	const [newTitle, setNewTitle] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [assignedToId, setAssignedToId] = useState("");
	
	const fetchTickets = async () => {
		try {
			const res = await fetch(`/api/patients/${patientId}/tickets`, {
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) setTickets(await res.json());
		} catch (e) {
			console.error(e);
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
			}
		} catch (e) {
			console.error(e);
		}
	};

	const staff = dashboard?.clinicSettings?.staff || [];

	return (
		<div className="panel-card" style={{ marginTop: "16px" }}>
			<div className="panel-heading compact-heading">
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Clock size={16} color="var(--slate-500)" />
					<span style={{ fontSize: "14px", fontWeight: 600 }}>Задачи по пациенту</span>
					{tickets.length > 0 && (
						<span style={{ background: "var(--amber)", color: "#fff", padding: "2px 6px", borderRadius: "10px", fontSize: "11px", fontWeight: "bold" }}>
							{tickets.filter((t: any) => t.status === "pending").length}
						</span>
					)}
				</div>
				<button type="button" className="icon-button" onClick={() => setIsAdding(!isAdding)}>
					<Plus size={16} />
				</button>
			</div>

			<div style={{ padding: "0 16px 16px 16px" }}>
				{isAdding && (
					<form onSubmit={handleAdd} style={{ marginBottom: "16px", background: "var(--surface-100)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-300)" }}>
						<div className="smart-field" style={{ marginBottom: "8px" }}>
							<input
								value={newTitle}
								onChange={(e) => setNewTitle(e.target.value)}
								placeholder=" "
								required
							/>
							<label>Задача (напр: Позвонить узнать самочувствие)</label>
						</div>
						<div className="smart-field" style={{ marginBottom: "8px" }}>
							<select
								value={assignedToId}
								onChange={(e) => setAssignedToId(e.target.value)}
								required
							>
								<option value="" disabled>Выберите ответственного</option>
								{staff.map((s: any) => (
									<option key={s.id} value={s.id}>{s.fullName}</option>
								))}
							</select>
							<label>Исполнитель</label>
						</div>
						<div className="smart-field" style={{ marginBottom: "12px" }}>
							<textarea
								value={newDescription}
								onChange={(e) => setNewDescription(e.target.value)}
								placeholder=" "
								style={{ resize: "vertical", minHeight: "60px", padding: "12px 16px" }}
							/>
							<label>Детали (опционально)</label>
						</div>
						<div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
							<button type="button" className="ghost-button" onClick={() => setIsAdding(false)}>Отмена</button>
							<button type="submit" className="primary-button compact-button">Создать задачу</button>
						</div>
					</form>
				)}

				{tickets.length === 0 && !isAdding && (
					<div style={{ color: "var(--muted)", fontSize: "13px", fontStyle: "italic", textAlign: "center", padding: "12px" }}>
						Нет активных задач
					</div>
				)}

				<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
					{tickets.map((ticket) => (
						<div key={ticket.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px", background: ticket.status === "pending" ? "#fff" : "var(--surface-50)", border: "1px solid var(--border-300)", borderRadius: "8px", opacity: ticket.status === "pending" ? 1 : 0.6 }}>
							{ticket.status === "pending" ? <Circle size={18} color="var(--slate-400)" /> : <CheckCircle2 size={18} color="var(--emerald)" />}
							<div style={{ flex: 1 }}>
								<div style={{ fontWeight: 500, fontSize: "14px", textDecoration: ticket.status === "pending" ? "none" : "line-through" }}>{ticket.title}</div>
								{ticket.description && <div style={{ fontSize: "12px", color: "var(--slate-600)", marginTop: "4px" }}>{ticket.description}</div>}
								<div style={{ fontSize: "11px", color: "var(--slate-400)", marginTop: "6px" }}>
									Назначено: {staff.find((s: any) => s.id === ticket.assignedToId)?.fullName || "Неизвестно"}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
