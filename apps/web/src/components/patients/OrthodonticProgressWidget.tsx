import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile, Calendar, Save, X } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";

interface OrthoData {
	current: number;
	total: number;
	start: string;
}

const getTodayString = (): string => {
	const parts = new Date().toISOString().split("T");
	return parts[0] || "";
};

function parseOrthoNotes(notesText: string | null | undefined): { cleanNotes: string; ortho: OrthoData | null } {
	const text = notesText || "";
	const separator = "\n\n===ORTHO===\n";
	const parts = text.split(separator);
	
	if (parts.length < 2) {
		return { cleanNotes: text, ortho: null };
	}
	
	try {
		const orthoData = JSON.parse(parts[1] || "{}");
		return {
			cleanNotes: parts[0] || "",
			ortho: {
				current: Number(orthoData.current) || 1,
				total: Number(orthoData.total) || 40,
				start: orthoData.start || getTodayString()
			}
		};
	} catch (e) {
		return { cleanNotes: text, ortho: null };
	}
}

function serializeOrthoNotes(cleanNotes: string, ortho: OrthoData | null): string {
	if (!ortho) return cleanNotes;
	return `${cleanNotes.trim()}\n\n===ORTHO===\n${JSON.stringify(ortho)}`;
}

export function OrthodonticProgressWidget({ patientId }: { patientId: string }) {
	const { dashboard, auth, loadDashboard } = useAppLogicContext();
	const [isEditing, setIsEditing] = useState(false);
	const [saving, setSaving] = useState(false);

	const patient = dashboard?.patients?.find((p: any) => p.id === patientId);
	if (!patient) return null;

	const { cleanNotes, ortho } = parseOrthoNotes(patient.notes);

	// Form states
	const [formCurrent, setFormCurrent] = useState(ortho?.current ?? 1);
	const [formTotal, setFormTotal] = useState(ortho?.total ?? 40);
	const [formStart, setFormStart] = useState(ortho?.start ?? getTodayString());

	// Reset form states if patient changes or edits are cancelled
	const handleStartEdit = () => {
		setFormCurrent(ortho?.current ?? 1);
		setFormTotal(ortho?.total ?? 40);
		setFormStart(ortho?.start ?? getTodayString());
		setIsEditing(true);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (formCurrent < 1 || formTotal < 1 || formCurrent > formTotal) {
			showToast("Некорректные значения капп", "error");
			return;
		}
		
		setSaving(true);
		try {
			const updatedOrtho: OrthoData = {
				current: formCurrent,
				total: formTotal,
				start: formStart
			};
			const updatedNotes = serializeOrthoNotes(cleanNotes, updatedOrtho);

			const res = await fetch(`/api/patients/${patientId}`, {
				method: "PUT",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					notes: updatedNotes,
				}),
			});

			if (!res.ok) throw new Error("Failed to save patient notes");

			showToast("Ортодонтический этап обновлен", "success");
			setIsEditing(false);
			await loadDashboard();
		} catch (err) {
			showToast("Не удалось сохранить изменения", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleResetWidget = async () => {
		if (!confirm("Вы действительно хотите удалить ортодонтический трекер для этого пациента?")) {
			return;
		}
		setSaving(true);
		try {
			const updatedNotes = serializeOrthoNotes(cleanNotes, null);
			const res = await fetch(`/api/patients/${patientId}`, {
				method: "PUT",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					notes: updatedNotes,
				}),
			});

			if (!res.ok) throw new Error("Failed to clear patient notes");

			showToast("Трекер ортодонтии удален", "success");
			setIsEditing(false);
			await loadDashboard();
		} catch (err) {
			showToast("Не удалось сбросить трекер", "error");
		} finally {
			setSaving(false);
		}
	};

	// Derived metrics
	const hasActiveTracker = ortho !== null;
	const currentAligner = ortho?.current ?? 1;
	const totalAligners = ortho?.total ?? 40;
	const weeksRemaining = Math.max(0, totalAligners - currentAligner);
	const progressPercent = Math.round((currentAligner / totalAligners) * 100);

	const formatDate = (dateStr: string) => {
		try {
			const [y, m, d] = dateStr.split("-");
			if (!y || !m || !d) return dateStr;
			return `${d}.${m}.${y}`;
		} catch {
			return dateStr;
		}
	};

	return (
		<motion.div
			className="ortho-progress-widget"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			style={{
				background: "var(--slate-800)",
				borderRadius: "12px",
				padding: "16px",
				border: "1px solid var(--slate-700)",
				marginTop: "16px",
			}}
		>
			<AnimatePresence mode="wait">
				{isEditing ? (
					<motion.form
						key="edit"
						onSubmit={handleSave}
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: 10 }}
						style={{ display: "flex", flexDirection: "column", gap: "10px" }}
					>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<span style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>Настройка трекера</span>
							<button 
								type="button" 
								onClick={() => setIsEditing(false)} 
								style={{ background: "none", border: "none", color: "var(--slate-400)", cursor: "pointer", padding: 0 }}
							>
								<X size={16} />
							</button>
						</div>

						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
							<label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "var(--slate-400)" }}>
								Текущая каппа
								<input
									type="number"
									min={1}
									max={formTotal}
									value={formCurrent}
									onChange={(e) => setFormCurrent(Math.max(1, Number(e.target.value)))}
									style={{
										padding: "6px 10px",
										borderRadius: "6px",
										background: "var(--slate-900)",
										border: "1px solid var(--slate-700)",
										color: "white",
										fontSize: "13px"
									}}
								/>
							</label>
							<label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "var(--slate-400)" }}>
								Всего капп
								<input
									type="number"
									min={1}
									value={formTotal}
									onChange={(e) => setFormTotal(Math.max(1, Number(e.target.value)))}
									style={{
										padding: "6px 10px",
										borderRadius: "6px",
										background: "var(--slate-900)",
										border: "1px solid var(--slate-700)",
										color: "white",
										fontSize: "13px"
									}}
								/>
							</label>
						</div>

						<label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "var(--slate-400)" }}>
							Дата начала
							<input
								type="date"
								value={formStart}
								onChange={(e) => setFormStart(e.target.value)}
								style={{
									padding: "6px 10px",
									borderRadius: "6px",
									background: "var(--slate-900)",
									border: "1px solid var(--slate-700)",
									color: "white",
									fontSize: "13px",
									width: "100%"
								}}
							/>
						</label>

						<div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
							<button
								type="submit"
								disabled={saving}
								className="primary-button"
								style={{
									flex: 1,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "6px",
									padding: "6px 12px",
									fontSize: "12px"
								}}
							>
								<Save size={14} /> {saving ? "Сохранение..." : "Сохранить"}
							</button>
							{hasActiveTracker && (
								<button
									type="button"
									disabled={saving}
									onClick={handleResetWidget}
									className="secondary-button"
									style={{
										padding: "6px 12px",
										fontSize: "12px",
										borderColor: "var(--red-500)",
										color: "#f87171"
									}}
								>
									Удалить
								</button>
							)}
						</div>
					</motion.form>
				) : (
					<motion.div
						key="view"
						initial={{ opacity: 0, x: 10 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -10 }}
					>
						{!hasActiveTracker ? (
							<div style={{ textAlign: "center", padding: "10px 0" }}>
								<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--slate-100)", marginBottom: "8px" }}>
									<Smile size={18} style={{ color: "#a78bfa" }} />
									<span style={{ fontSize: "13px", fontWeight: 600 }}>Ортодонтический трекер</span>
								</div>
								<p style={{ fontSize: "11px", color: "var(--slate-400)", marginBottom: "12px" }}>
									Трекер позволяет следить за этапами смены элайнеров/капп пациента.
								</p>
								<button
									type="button"
									onClick={handleStartEdit}
									style={{
										background: "#8b5cf6",
										border: "none",
										color: "white",
										borderRadius: "6px",
										padding: "6px 12px",
										fontSize: "12px",
										fontWeight: 600,
										cursor: "pointer",
										transition: "background 0.2s"
									}}
									onMouseEnter={(e) => e.currentTarget.style.background = "#7c3aed"}
									onMouseLeave={(e) => e.currentTarget.style.background = "#8b5cf6"}
								>
									+ Подключить трекер
								</button>
							</div>
						) : (
							<>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--slate-100)" }}>
										<Smile size={18} style={{ color: "#a78bfa" }} />
										<h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Ортодонтия: Элайнеры</h3>
									</div>
									<span style={{ fontSize: "12px", color: "var(--slate-400)", fontWeight: 500 }}>
										Осталось {weeksRemaining} нед.
									</span>
								</div>
								
								<div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
									<span style={{ fontSize: "24px", fontWeight: 700, color: "white", lineHeight: 1 }}>
										Каппа {currentAligner} <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--slate-400)" }}>из {totalAligners}</span>
									</span>
									<span style={{ fontSize: "13px", fontWeight: 600, color: "#a78bfa" }}>
										{progressPercent}%
									</span>
								</div>

								<div style={{ height: "6px", background: "var(--slate-900)", borderRadius: "4px", overflow: "hidden" }}>
									<div 
										style={{ 
											height: "100%", 
											width: `${progressPercent}%`, 
											background: "linear-gradient(90deg, #8b5cf6, #c084fc)",
											borderRadius: "4px",
											transition: "width 0.5s ease-out"
										}} 
									/>
								</div>

								<div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "12px" }}>
									<span style={{ color: "var(--slate-400)" }}>Начало: {formatDate(ortho.start)}</span>
									<button 
										type="button" 
										onClick={handleStartEdit}
										style={{ background: "none", border: "none", color: "#a78bfa", fontSize: "12px", fontWeight: 600, cursor: "pointer", padding: 0 }}
									>
										Обновить этап →
									</button>
								</div>
							</>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}
