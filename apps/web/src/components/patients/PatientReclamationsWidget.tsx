import { AlertOctagon, CheckCircle2, ShieldAlert, Plus } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

export function PatientReclamationsWidget({ patientId }: { patientId: string }) {
	const { dashboard, auth } = useAppLogicContext();
	const [reclamations, setReclamations] = useState<any[]>([]);
	const [isAdding, setIsAdding] = useState(false);
	const [newComplicationDetails, setNewComplicationDetails] = useState("");
	const [newProposedAction, setNewProposedAction] = useState("");
	const [doctorId, setDoctorId] = useState("");
	
	const fetchReclamations = async () => {
		try {
			const res = await fetch(`/api/patients/${patientId}/reclamations`, {
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) setReclamations(await res.json());
		} catch (e) {
			console.error(e);
		}
	};

	useEffect(() => {
		fetchReclamations();
	}, [patientId]);

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newComplicationDetails || !doctorId) return;
		try {
			const res = await fetch(`/api/patients/${patientId}/reclamations`, {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					complicationDetails: newComplicationDetails,
					proposedAction: newProposedAction,
					doctorId,
				}),
			});
			if (res.ok) {
				setIsAdding(false);
				setNewComplicationDetails("");
				setNewProposedAction("");
				fetchReclamations();
			}
		} catch (e) {
			console.error(e);
		}
	};

	const staff = dashboard?.clinicSettings?.staff || [];
	const doctors = staff.filter((s: any) => s.role === "doctor" || s.role === "Врач");

	if (reclamations.length === 0 && !isAdding) {
		return (
			<div className="panel-card" style={{ marginTop: "16px", border: "1px dashed var(--border-300)" }}>
				<div className="panel-heading compact-heading" style={{ borderBottom: "none", paddingBottom: "12px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--slate-500)" }}>
						<ShieldAlert size={16} />
						<span style={{ fontSize: "14px", fontWeight: 600 }}>Рекламации</span>
					</div>
					<button type="button" className="ghost-button compact-button" onClick={() => setIsAdding(true)}>
						+ Фиксировать
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="panel-card" style={{ marginTop: "16px", borderColor: "var(--rose-200)" }}>
			<div className="panel-heading compact-heading" style={{ background: "var(--rose-50)", borderBottom: "1px solid var(--rose-200)" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--rose-700)" }}>
					<AlertOctagon size={16} />
					<span style={{ fontSize: "14px", fontWeight: 600 }}>Рекламации и осложнения</span>
					{reclamations.length > 0 && (
						<span style={{ background: "var(--rose)", color: "#fff", padding: "2px 6px", borderRadius: "10px", fontSize: "11px", fontWeight: "bold" }}>
							{reclamations.filter((t: any) => t.status === "under_review").length}
						</span>
					)}
				</div>
				<button type="button" className="icon-button" style={{ color: "var(--rose-700)" }} onClick={() => setIsAdding(!isAdding)}>
					<Plus size={16} />
				</button>
			</div>

			<div style={{ padding: "0 16px 16px 16px" }}>
				{isAdding && (
					<form onSubmit={handleAdd} style={{ marginTop: "16px", marginBottom: "16px", background: "var(--surface-100)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-300)" }}>
						<div className="smart-field" style={{ marginBottom: "8px" }}>
							<select
								value={doctorId}
								onChange={(e) => setDoctorId(e.target.value)}
								required
							>
								<option value="" disabled>Выберите лечащего врача</option>
								{doctors.map((s: any) => (
									<option key={s.id} value={s.id}>{s.fullName}</option>
								))}
							</select>
							<label>Врач (автор работы)</label>
						</div>
						<div className="smart-field" style={{ marginBottom: "12px" }}>
							<textarea
								value={newComplicationDetails}
								onChange={(e) => setNewComplicationDetails(e.target.value)}
								placeholder=" "
								required
								style={{ resize: "vertical", minHeight: "80px", padding: "12px 16px" }}
							/>
							<label>Суть жалобы или осложнения</label>
						</div>
						<div className="smart-field" style={{ marginBottom: "12px" }}>
							<textarea
								value={newProposedAction}
								onChange={(e) => setNewProposedAction(e.target.value)}
								placeholder=" "
								style={{ resize: "vertical", minHeight: "60px", padding: "12px 16px" }}
							/>
							<label>Предложенное решение (гарантия, переделка)</label>
						</div>
						<div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
							<button type="button" className="ghost-button" onClick={() => setIsAdding(false)}>Отмена</button>
							<button type="submit" className="primary-button compact-button" style={{ background: "var(--rose)", borderColor: "var(--rose)" }}>Фиксировать</button>
						</div>
					</form>
				)}

				<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
					{reclamations.map((rec) => (
						<div key={rec.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px", background: rec.status === "under_review" ? "var(--rose-50)" : "var(--surface-50)", border: `1px solid ${rec.status === "under_review" ? "var(--rose-200)" : "var(--border-300)"}`, borderRadius: "8px", opacity: rec.status === "under_review" ? 1 : 0.6 }}>
							{rec.status === "under_review" ? <AlertOctagon size={18} color="var(--rose)" /> : <CheckCircle2 size={18} color="var(--emerald)" />}
							<div style={{ flex: 1 }}>
								<div style={{ fontWeight: 500, fontSize: "14px", color: rec.status === "under_review" ? "var(--rose-900)" : "var(--ink)" }}>{rec.complicationDetails}</div>
								{rec.proposedAction && <div style={{ fontSize: "12px", color: "var(--slate-700)", marginTop: "4px" }}><strong>Решение:</strong> {rec.proposedAction}</div>}
								<div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "6px", display: "flex", justifyContent: "space-between" }}>
									<span>Врач: {staff.find((s: any) => s.id === rec.doctorId)?.fullName || "Неизвестно"}</span>
									<span>{new Date(rec.createdAt).toLocaleDateString("ru-RU")}</span>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
