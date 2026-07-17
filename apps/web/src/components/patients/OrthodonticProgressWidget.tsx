import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Save, Smile, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";

interface OrthoData {
	currentAligner: number;
	totalAligners: number;
	startDate: string;
}

const getTodayString = (): string => {
	const parts = new Date().toISOString().split("T");
	return parts[0] || "";
};

function parseLegacyOrthoNotes(notesText: string | null | undefined): {
	cleanNotes: string;
	legacyOrtho: OrthoData | null;
} {
	const text = notesText || "";
	const separator = "\n\n===ORTHO===\n";
	const parts = text.split(separator);

	if (parts.length < 2) {
		return { cleanNotes: text, legacyOrtho: null };
	}

	try {
		const orthoData = JSON.parse(parts[1] || "{}");
		return {
			cleanNotes: parts[0] || "",
			legacyOrtho: {
				currentAligner: Number(orthoData.current) || 1,
				totalAligners: Number(orthoData.total) || 40,
				startDate: orthoData.start || getTodayString(),
			},
		};
	} catch (e) {
		return { cleanNotes: text, legacyOrtho: null };
	}
}

export function OrthodonticProgressWidget({
	patientId,
}: {
	patientId: string;
}) {
	const { dashboard, auth, loadDashboard } = useAppLogicContext();
	const [isEditing, setIsEditing] = useState(false);
	const [saving, setSaving] = useState(false);

	const patient = dashboard?.patients?.find((p: any) => p.id === patientId);
	if (!patient) return null;

	// Backwards compatibility migration logic:
	// If the new structured DB field is missing, fallback to parsing legacy notes.
	const orthoFromProfile = patient.administrativeProfile?.orthodonticProgress;
	const { cleanNotes, legacyOrtho } = parseLegacyOrthoNotes(patient.notes);

	const ortho: OrthoData | null = orthoFromProfile || legacyOrtho || null;

	// Form states
	const [formCurrent, setFormCurrent] = useState(ortho?.currentAligner ?? 1);
	const [formTotal, setFormTotal] = useState(ortho?.totalAligners ?? 40);
	const [formStart, setFormStart] = useState(
		ortho?.startDate ?? getTodayString(),
	);

	// Reset form states if patient changes or edits are cancelled
	const handleStartEdit = () => {
		setFormCurrent(ortho?.currentAligner ?? 1);
		setFormTotal(ortho?.totalAligners ?? 40);
		setFormStart(ortho?.startDate ?? getTodayString());
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
				currentAligner: formCurrent,
				totalAligners: formTotal,
				startDate: formStart,
			};

			const adminProfile = patient.administrativeProfile || {};

			// Migrate: First, update administrative profile with proper structured data
			const resAdmin = await fetch(
				`/api/patients/${patientId}/administrative-profile`,
				{
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						...adminProfile,
						orthodonticProgress: updatedOrtho,
					}),
				},
			);

			if (!resAdmin.ok)
				throw new Error("Failed to save patient administrative profile");

			// Migrate: Clean up the legacy stringified JSON from notes if it exists
			if (legacyOrtho) {
				await fetch(`/api/patients/${patientId}`, {
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						notes: cleanNotes,
					}),
				});
			}

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
		if (
			!confirm(
				"Вы действительно хотите удалить ортодонтический трекер для этого пациента?",
			)
		) {
			return;
		}
		setSaving(true);
		try {
			const adminProfile = patient.administrativeProfile || {};

			const resAdmin = await fetch(
				`/api/patients/${patientId}/administrative-profile`,
				{
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						...adminProfile,
						orthodonticProgress: null,
					}),
				},
			);

			if (!resAdmin.ok)
				throw new Error("Failed to clear patient administrative profile");

			if (legacyOrtho) {
				await fetch(`/api/patients/${patientId}`, {
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						notes: cleanNotes,
					}),
				});
			}

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
	const currentAligner = ortho?.currentAligner ?? 1;
	const totalAligners = ortho?.totalAligners ?? 40;
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
				background: "var(--paper)",
				borderRadius: "16px",
				padding: "20px",
				border: "1px solid var(--line)",
				marginTop: "16px",
				boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
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
						style={{ display: "flex", flexDirection: "column", gap: "12px" }}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "8px",
							}}
						>
							<span
								style={{
									fontSize: "14px",
									fontWeight: 600,
									color: "var(--ink)",
								}}
							>
								Настройка трекера (глубокий JSONB)
							</span>
							<button
								type="button"
								onClick={() => setIsEditing(false)}
								style={{
									background: "none",
									border: "none",
									color: "var(--muted)",
									cursor: "pointer",
									padding: 0,
								}}
							>
								<X size={18} />
							</button>
						</div>

						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "12px",
							}}
						>
							<label
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "6px",
									fontSize: "12px",
									color: "var(--muted)",
								}}
							>
								Текущая каппа
								<input
									type="number"
									min={1}
									max={formTotal}
									value={formCurrent}
									onChange={(e) =>
										setFormCurrent(Math.max(1, Number(e.target.value)))
									}
									style={{
										padding: "8px 12px",
										borderRadius: "8px",
										background: "var(--paper-soft)",
										border: "1px solid var(--line)",
										color: "var(--ink)",
										fontSize: "14px",
									}}
								/>
							</label>
							<label
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "6px",
									fontSize: "12px",
									color: "var(--muted)",
								}}
							>
								Всего капп
								<input
									type="number"
									min={1}
									value={formTotal}
									onChange={(e) =>
										setFormTotal(Math.max(1, Number(e.target.value)))
									}
									style={{
										padding: "8px 12px",
										borderRadius: "8px",
										background: "var(--paper-soft)",
										border: "1px solid var(--line)",
										color: "var(--ink)",
										fontSize: "14px",
									}}
								/>
							</label>
						</div>

						<label
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "6px",
								fontSize: "12px",
								color: "var(--muted)",
							}}
						>
							Дата начала
							<input
								type="date"
								value={formStart}
								onChange={(e) => setFormStart(e.target.value)}
								style={{
									padding: "8px 12px",
									borderRadius: "8px",
									background: "var(--paper-soft)",
									border: "1px solid var(--line)",
									color: "var(--ink)",
									fontSize: "14px",
									width: "100%",
								}}
							/>
						</label>

						<div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
							<button
								type="submit"
								disabled={saving}
								className="primary-button"
								style={{
									flex: 1,
									background: "var(--teal)",
									color: "white",
									borderRadius: "8px",
									padding: "10px",
									border: "none",
									fontWeight: 600,
									display: "flex",
									justifyContent: "center",
									alignItems: "center",
									gap: "8px",
									cursor: "pointer",
								}}
							>
								{saving ? (
									"Сохранение..."
								) : (
									<>
										<Save size={16} /> Сохранить
									</>
								)}
							</button>
							{hasActiveTracker && (
								<button
									type="button"
									disabled={saving}
									onClick={handleResetWidget}
									style={{
										background: "rgba(239, 68, 68, 0.1)",
										color: "var(--red)",
										borderRadius: "8px",
										padding: "10px 16px",
										border: "1px solid rgba(239, 68, 68, 0.2)",
										fontWeight: 600,
										cursor: "pointer",
										transition: "all 0.2s",
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
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "12px",
									padding: "16px 0",
								}}
							>
								<div
									style={{
										width: 48,
										height: 48,
										borderRadius: "50%",
										background: "var(--paper-soft)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: "var(--muted)",
										border: "1px solid var(--line)",
									}}
								>
									<Smile size={24} />
								</div>
								<p
									style={{
										margin: 0,
										fontSize: "14px",
										color: "var(--muted)",
										textAlign: "center",
									}}
								>
									Ортодонтическое лечение не запущено.
								</p>
								<button
									onClick={handleStartEdit}
									style={{
										marginTop: "8px",
										background: "transparent",
										border: "1px solid var(--teal)",
										color: "var(--teal)",
										padding: "8px 16px",
										borderRadius: "8px",
										fontSize: "13px",
										fontWeight: 600,
										cursor: "pointer",
										transition: "all 0.2s ease",
									}}
								>
									Добавить орто-трекер (JSONB)
								</button>
							</div>
						) : (
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "16px",
								}}
							>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "flex-start",
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "10px",
										}}
									>
										<div
											style={{
												width: 40,
												height: 40,
												borderRadius: "10px",
												background: "var(--teal-light)",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												color: "var(--teal-dark)",
											}}
										>
											<Smile size={20} />
										</div>
										<div>
											<h4
												style={{
													margin: 0,
													fontSize: "15px",
													fontWeight: 600,
													color: "var(--ink)",
												}}
											>
												Элайнеры
											</h4>
											<span
												style={{
													fontSize: "12px",
													color: "var(--muted)",
													display: "flex",
													alignItems: "center",
													gap: "4px",
												}}
											>
												<Calendar size={12} /> с {formatDate(ortho.startDate)}
											</span>
										</div>
									</div>
									<button
										onClick={handleStartEdit}
										style={{
											background: "var(--paper-soft)",
											border: "1px solid var(--line)",
											color: "var(--ink)",
											padding: "6px 12px",
											borderRadius: "6px",
											fontSize: "12px",
											fontWeight: 600,
											cursor: "pointer",
										}}
									>
										Изменить
									</button>
								</div>

								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "8px",
									}}
								>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "flex-end",
										}}
									>
										<span
											style={{
												fontSize: "28px",
												fontWeight: 700,
												color: "var(--ink)",
												lineHeight: 1,
											}}
										>
											{currentAligner}{" "}
											<span
												style={{
													fontSize: "16px",
													fontWeight: 500,
													color: "var(--muted)",
												}}
											>
												/ {totalAligners}
											</span>
										</span>
										<span
											style={{
												fontSize: "13px",
												fontWeight: 600,
												color: "var(--teal)",
											}}
										>
											{progressPercent}%
										</span>
									</div>

									<div
										style={{
											height: "8px",
											background: "var(--paper-soft)",
											borderRadius: "4px",
											overflow: "hidden",
										}}
									>
										<motion.div
											initial={{ width: 0 }}
											animate={{ width: `${progressPercent}%` }}
											transition={{ duration: 1, ease: "easeOut" }}
											style={{
												height: "100%",
												background: "var(--teal)",
												borderRadius: "4px",
											}}
										/>
									</div>
								</div>

								{weeksRemaining > 0 ? (
									<p
										style={{
											margin: 0,
											fontSize: "13px",
											color: "var(--muted)",
										}}
									>
										Осталось примерно{" "}
										<strong style={{ color: "var(--ink)" }}>
											{weeksRemaining}
										</strong>{" "}
										капп до завершения этапа.
									</p>
								) : (
									<p
										style={{
											margin: 0,
											fontSize: "13px",
											color: "var(--green)",
										}}
									>
										🎉 Все каппы пройдены! Запланируйте контрольный осмотр.
									</p>
								)}
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}
