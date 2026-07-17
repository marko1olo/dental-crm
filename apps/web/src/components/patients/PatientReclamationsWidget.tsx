import { AlertOctagon, CheckCircle2, ShieldAlert, Plus, Trash2, Calendar, User, UserX, Stethoscope } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";
import { motion, AnimatePresence } from "framer-motion";

export function PatientReclamationsWidget({ patientId }: { patientId: string }) {
	const { dashboard, auth } = useAppLogicContext();
	const [reclamations, setReclamations] = useState<any[]>([]);
	const [isAdding, setIsAdding] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const [newComplicationDetails, setNewComplicationDetails] = useState("");
	const [newProposedAction, setNewProposedAction] = useState("");
	const [doctorId, setDoctorId] = useState("");
	
	const fetchReclamations = async () => {
		setIsLoading(true);
		try {
			const res = await fetch(`/api/patients/${patientId}/reclamations`, {
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) setReclamations(await res.json());
		} catch (e) {
			console.error(e);
		} finally {
			setIsLoading(false);
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
				setDoctorId("");
				fetchReclamations();
				showToast("Рекламация зафиксирована", "success");
			} else {
				showToast("Ошибка при фиксации", "error");
			}
		} catch (e) {
			console.error(e);
			showToast("Ошибка сети", "error");
		}
	};

	const handleToggleStatus = async (recId: string, currentStatus: string) => {
		const newStatus = currentStatus === "under_review" ? "resolved" : "under_review";
		
		setReclamations(reclamations.map(r => r.id === recId ? { ...r, status: newStatus } : r));
		try {
			const res = await fetch(`/api/patients/${patientId}/reclamations/${recId}`, {
				method: "PUT",
				headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ status: newStatus }),
			});
			if (!res.ok) {
				showToast("Ошибка при обновлении статуса", "error");
				fetchReclamations();
			} else {
				showToast(newStatus === "resolved" ? "Инцидент урегулирован" : "Инцидент возвращен в работу", "success");
			}
		} catch (e) {
			console.error(e);
			fetchReclamations();
		}
	};

	const handleDelete = async (recId: string) => {
		if (!confirm("Вы действительно хотите полностью удалить запись об этом инциденте? Это действие нельзя отменить.")) return;
		try {
			const res = await fetch(`/api/patients/${patientId}/reclamations/${recId}`, {
				method: "DELETE",
				headers: auth.denteClinicalMutationHeaders(),
			});
			if (res.ok) {
				showToast("Рекламация удалена", "success");
				setReclamations(reclamations.filter(r => r.id !== recId));
			} else {
				showToast("Ошибка при удалении", "error");
			}
		} catch (e) {
			console.error(e);
		}
	};

	const staff = dashboard?.clinicSettings?.staff || [];
	const doctors = staff.filter((s: any) => s.role === "doctor" || s.role === "Врач");
	const reviewCount = reclamations.filter((t: any) => t.status === "under_review").length;

	if (reclamations.length === 0 && !isAdding && !isLoading) {
		return (
			<div className="panel-card" style={{ marginTop: "16px", padding: 0, overflow: "hidden", border: "1px dashed var(--border-300)" }}>
				<div 
					className="panel-heading" 
					style={{ 
						display: "flex", 
						justifyContent: "space-between", 
						alignItems: "center", 
						padding: "16px 20px", 
						background: "transparent",
						margin: 0
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--slate-500)" }}>
						<div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
							<ShieldAlert size={16} />
						</div>
						<h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Рекламации и осложнения отсутствуют</h3>
					</div>
					<button 
						type="button" 
						onClick={() => setIsAdding(true)}
						style={{ 
							background: "var(--surface-100)", 
							color: "var(--slate-700)", 
							border: "1px solid var(--border-300)", 
							borderRadius: "8px", 
							padding: "6px 12px", 
							fontSize: "13px", 
							fontWeight: 600, 
							cursor: "pointer",
							transition: "all 0.2s"
						}}
					>
						+ Фиксировать
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="panel-card" style={{ marginTop: "16px", padding: 0, overflow: "hidden", border: "1px solid var(--rose-200)", boxShadow: "0 4px 12px rgba(225, 29, 72, 0.05)" }}>
			<div 
				className="panel-heading" 
				style={{ 
					display: "flex", 
					justifyContent: "space-between", 
					alignItems: "center", 
					padding: "16px 20px", 
					background: "var(--rose-50)",
					borderBottom: "1px solid var(--rose-200)",
					margin: 0
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					<div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--rose-100)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--rose-600)" }}>
						<AlertOctagon size={16} />
					</div>
					<div>
						<h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--rose-800)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
							Рекламации и инциденты
							{reviewCount > 0 && (
								<span style={{ background: "var(--rose-600)", color: "#fff", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, boxShadow: "0 0 0 2px var(--rose-50)" }}>
									{reviewCount} открыт.
								</span>
							)}
						</h3>
					</div>
				</div>
				<button 
					type="button" 
					onClick={() => setIsAdding(!isAdding)}
					style={{ 
						background: isAdding ? "var(--rose-200)" : "var(--rose-600)", 
						color: isAdding ? "var(--rose-900)" : "#fff", 
						border: "none", 
						borderRadius: "8px", 
						padding: "6px 12px", 
						fontSize: "13px", 
						fontWeight: 600, 
						cursor: "pointer", 
						display: "flex", 
						alignItems: "center", 
						gap: "6px",
						transition: "all 0.2s",
						boxShadow: isAdding ? "none" : "0 2px 4px rgba(225, 29, 72, 0.2)"
					}}
				>
					<Plus size={16} /> {isAdding ? "Отмена" : "Добавить"}
				</button>
			</div>

			<div style={{ padding: "20px", background: "var(--paper)" }}>
				<AnimatePresence>
					{isAdding && (
						<motion.form 
							initial={{ opacity: 0, height: 0, marginBottom: 0 }}
							animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
							exit={{ opacity: 0, height: 0, marginBottom: 0 }}
							onSubmit={handleAdd} 
							style={{ background: "var(--rose-50)", padding: "20px", borderRadius: "12px", border: "1px dashed var(--rose-300)", overflow: "hidden" }}
						>
							<div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
								<div className="smart-field">
									<select
										value={doctorId}
										onChange={(e) => setDoctorId(e.target.value)}
										required
										style={{ background: "#fff", border: "1px solid var(--rose-200)" }}
									>
										<option value="" disabled>Выберите лечащего врача</option>
										{doctors.map((s: any) => (
											<option key={s.id} value={s.id}>{s.fullName}</option>
										))}
									</select>
									<label style={{ color: "var(--rose-700)" }}>Врач (автор работы)</label>
								</div>

								<div className="smart-field">
									<textarea
										value={newComplicationDetails}
										onChange={(e) => setNewComplicationDetails(e.target.value)}
										placeholder=" "
										required
										style={{ resize: "vertical", minHeight: "80px", padding: "12px 16px", background: "#fff", border: "1px solid var(--rose-200)" }}
									/>
									<label style={{ color: "var(--rose-700)" }}>Суть жалобы или осложнения</label>
								</div>

								<div className="smart-field">
									<textarea
										value={newProposedAction}
										onChange={(e) => setNewProposedAction(e.target.value)}
										placeholder=" "
										style={{ resize: "vertical", minHeight: "60px", padding: "12px 16px", background: "#fff", border: "1px solid var(--rose-200)" }}
									/>
									<label style={{ color: "var(--rose-700)" }}>Предложенное решение (гарантия, возврат, переделка)</label>
								</div>
							</div>
							
							<div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" }}>
								<button type="button" className="ghost-button" onClick={() => setIsAdding(false)} style={{ color: "var(--rose-700)" }}>Отмена</button>
								<button type="submit" className="primary-button" style={{ background: "var(--rose-600)", color: "#fff", border: "none" }}>Зафиксировать в карту</button>
							</div>
						</motion.form>
					)}
				</AnimatePresence>

				<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
					<AnimatePresence>
						{reclamations.map((rec) => {
							const isUnderReview = rec.status === "under_review";
							const doctor = staff.find((s: any) => s.id === rec.doctorId);
							
							return (
								<motion.div 
									key={rec.id} 
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, scale: 0.95 }}
									style={{ 
										display: "flex", 
										alignItems: "flex-start", 
										gap: "16px", 
										padding: "16px", 
										background: isUnderReview ? "#fff" : "var(--surface-50)", 
										border: "1px solid",
										borderColor: isUnderReview ? "var(--rose-200)" : "var(--line)",
										borderRadius: "12px", 
										opacity: isUnderReview ? 1 : 0.6,
										transition: "all 0.2s ease",
										position: "relative",
										boxShadow: isUnderReview ? "0 4px 12px rgba(225, 29, 72, 0.05)" : "none"
									}}
								>
									<div style={{ 
										width: "4px", 
										height: "40px", 
										background: isUnderReview ? "var(--rose-500)" : "var(--emerald)", 
										borderRadius: 4,
										marginTop: 4
									}} />
									
									<div style={{ flex: 1, minWidth: 0 }}>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
											<div style={{ 
												fontWeight: 600, 
												fontSize: "15px", 
												color: isUnderReview ? "var(--rose-900)" : "var(--ink)",
											}}>
												{rec.complicationDetails}
											</div>
											<div style={{ display: "flex", gap: "8px" }}>
												<button 
													onClick={() => handleToggleStatus(rec.id, rec.status)}
													style={{ 
														background: isUnderReview ? "var(--emerald)" : "var(--surface-200)", 
														color: isUnderReview ? "#fff" : "var(--ink)", 
														border: "none", 
														padding: "6px 12px", 
														borderRadius: "6px",
														fontSize: "12px",
														fontWeight: 600,
														cursor: "pointer",
														display: "flex",
														alignItems: "center",
														gap: "6px",
														transition: "all 0.2s"
													}}
													title={isUnderReview ? "Отметить как урегулированную" : "Вернуть на рассмотрение"}
												>
													{isUnderReview ? <><CheckCircle2 size={14} /> Урегулировано</> : "Вернуть в работу"}
												</button>
												<button 
													onClick={() => handleDelete(rec.id)}
													style={{ 
														background: "var(--surface-100)", 
														border: "none", 
														padding: "6px 8px", 
														cursor: "pointer",
														color: "var(--slate-400)",
														borderRadius: "6px",
														transition: "all 0.2s ease"
													}}
													className="hover-red"
													title="Удалить безвозвратно"
												>
													<Trash2 size={16} />
												</button>
											</div>
										</div>
										
										{rec.proposedAction && (
											<div style={{ 
												fontSize: "13px", 
												color: "var(--slate-700)", 
												marginBottom: "12px",
												lineHeight: 1.5,
												background: "var(--surface-50)",
												padding: "10px 14px",
												borderRadius: "8px",
												borderLeft: "2px solid var(--border-300)"
											}}>
												<strong style={{ display: "block", marginBottom: 4, color: "var(--ink)" }}>Предложенное решение:</strong>
												{rec.proposedAction}
											</div>
										)}
										
										<div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginTop: "12px" }}>
											<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>
												<Stethoscope size={14} /> 
												<span style={{ color: "var(--ink)", background: "var(--surface-100)", padding: "4px 8px", borderRadius: "4px" }}>
													{doctor?.fullName || "Неизвестный врач"}
												</span>
											</div>
											<div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--slate-400)" }}>
												<Calendar size={14} /> 
												Зафиксировано: {new Date(rec.createdAt).toLocaleDateString("ru-RU")}
											</div>
											{rec.resolvedAt && (
												<div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--emerald)" }}>
													<CheckCircle2 size={14} /> 
													Урегулировано: {new Date(rec.resolvedAt).toLocaleDateString("ru-RU")}
												</div>
											)}
										</div>
									</div>
								</motion.div>
							);
						})}
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
}
